#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Weigh Agent (Optimized, headless)
- Robust serial handling + auto-detect
- Filtering (moving average, optional Kalman), outlier reject
- Stability detection before publish
- MQTT with QoS=1, LWT, reconnect backoff, offline buffer
- Heartbeat + watchdog + lightweight HTTP health endpoint
- JSON logging with rotation
- Config from config.json + env overrides
"""

import os
import sys
import re
import json
import time
import glob
import queue
import signal
import threading
import logging
from logging.handlers import RotatingFileHandler
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer

import serial
import serial.tools.list_ports
import paho.mqtt.client as mqtt

# -------------------------
# Paths & Config
# -------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(BASE_DIR, "config.json")
LOG_DIR = os.path.join(BASE_DIR, "logs")
BUFFER_DIR = os.path.join(BASE_DIR, "buffer")

DEFAULT_CONFIG = {
    "machineId": "weigh1",
    "serialPort": "auto",     # auto | COMx | /dev/ttyUSB0
    "baudrate": 9600,
    "bytesize": 8,             # 5,6,7,8
    "parity": "N",            # N,E,O,M,S
    "stopbits": 1,             # 1, 1.5, 2

    # MQTT
    "mqttHost": "127.0.0.1",
    "mqttPort": 1883,
    "mqttUsername": "",
    "mqttPassword": "",
    "mqttQos": 1,
    "mqttRetain": False,
    "mqttKeepalive": 60,

    # Filter & publish controls
    "zeroThreshold": 10.0,
    "minPublishIntervalMs": 100,
    "minWeightChange": 0.0,

    # Stability detection
    "stabilityWindow": 8,           # number of samples
    "stabilityThreshold": 0.5,      # kg within window
    "stabilityMinDurationMs": 400,  # min duration for stable state

    # Moving average
    "maWindow": 5,

    # Kalman (optional)
    "enableKalman": False,
    "kalmanR": 1e-2,
    "kalmanQ": 1e-3,

    # Outlier detection
    "deltaOutlierKg": 2000.0,  # reject if single-step delta > this

    # Fake mode
    "fakeMode": False,
    "fakeStartKg": 0.0,
    "fakeEndKg": 60000.0,
    "fakeStepKg": 50.0,
    "fakeIntervalMs": 300,
    "fakeScaleDivisor": 1000,

    # Parse real device frames
    "parseDivisor": 100000,
    "frameRegex": r"([+-]\d{8})B",

    # Offline buffer
    "bufferMaxItems": 2000,

    # Heartbeat & watchdog
    "heartbeatIntervalSec": 30,
    "staleDataSec": 60,

    # HTTP health
    "healthPort": 8787,

    # Logging
    "logLevel": "INFO",
    "logJson": True,
    "logFile": os.path.join(LOG_DIR, "agent.log"),
    "logMaxBytes": 2_000_000,
    "logBackupCount": 3,
}


def load_config():
    cfg = DEFAULT_CONFIG.copy()
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                file_cfg = json.load(f)
                cfg.update(file_cfg)
        except Exception as e:
            print(f"WARN: cannot read config.json: {e}")

    # Env overrides
    def env(name, cast=str, default=None):
        v = os.getenv(name)
        if v is None:
            return default
        try:
            return cast(v)
        except Exception:
            return default

    overrides = {
        "machineId": env("WA_MACHINE_ID", str, cfg["machineId"]),
        "serialPort": env("WA_SERIAL_PORT", str, cfg["serialPort"]),
        "baudrate": env("WA_BAUDRATE", int, cfg["baudrate"]),
        "bytesize": env("WA_BYTESIZE", int, cfg.get("bytesize", 8)),
        "parity": env("WA_PARITY", str, cfg.get("parity", "N")),
        "stopbits": env("WA_STOPBITS", float, cfg.get("stopbits", 1)),
        "mqttHost": env("WA_MQTT_HOST", str, cfg["mqttHost"]),
        "mqttPort": env("WA_MQTT_PORT", int, cfg["mqttPort"]),
        "mqttUsername": env("WA_MQTT_USERNAME", str, cfg.get("mqttUsername", "")),
        "mqttPassword": env("WA_MQTT_PASSWORD", str, cfg.get("mqttPassword", "")),
        "mqttQos": env("WA_MQTT_QOS", int, cfg.get("mqttQos", 1)),
        "mqttRetain": env("WA_MQTT_RETAIN", lambda x: x.lower()=="true", cfg.get("mqttRetain", False)),
        "zeroThreshold": env("WA_ZERO_THRESHOLD", float, cfg["zeroThreshold"]),
        "minPublishIntervalMs": env("WA_MIN_PUB_MS", int, cfg["minPublishIntervalMs"]),
        "minWeightChange": env("WA_MIN_WEIGHT_CHANGE", float, cfg["minWeightChange"]),
        "stabilityWindow": env("WA_STABILITY_WINDOW", int, cfg["stabilityWindow"]),
        "stabilityThreshold": env("WA_STABILITY_THRESHOLD", float, cfg["stabilityThreshold"]),
        "stabilityMinDurationMs": env("WA_STABILITY_MIN_MS", int, cfg["stabilityMinDurationMs"]),
        "maWindow": env("WA_MA_WINDOW", int, cfg["maWindow"]),
        "enableKalman": env("WA_ENABLE_KALMAN", lambda x: x.lower()=="true", cfg["enableKalman"]),
        "kalmanR": env("WA_KALMAN_R", float, cfg["kalmanR"]),
        "kalmanQ": env("WA_KALMAN_Q", float, cfg["kalmanQ"]),
        "deltaOutlierKg": env("WA_DELTA_OUTLIER_KG", float, cfg["deltaOutlierKg"]),
        "fakeMode": env("WA_FAKE_MODE", lambda x: x.lower()=="true", cfg["fakeMode"]),
        "fakeStartKg": env("WA_FAKE_START", float, cfg["fakeStartKg"]),
        "fakeEndKg": env("WA_FAKE_END", float, cfg["fakeEndKg"]),
        "fakeStepKg": env("WA_FAKE_STEP", float, cfg["fakeStepKg"]),
        "fakeIntervalMs": env("WA_FAKE_INTERVAL_MS", int, cfg["fakeIntervalMs"]),
        "parseDivisor": env("WA_PARSE_DIVISOR", float, cfg["parseDivisor"]),
        "frameRegex": env("WA_FRAME_REGEX", str, cfg["frameRegex"]),
        "bufferMaxItems": env("WA_BUFFER_MAX", int, cfg["bufferMaxItems"]),
        "heartbeatIntervalSec": env("WA_HEARTBEAT_SEC", int, cfg["heartbeatIntervalSec"]),
        "staleDataSec": env("WA_STALE_SEC", int, cfg["staleDataSec"]),
        "healthPort": env("WA_HEALTH_PORT", int, cfg["healthPort"]),
        "logLevel": env("WA_LOG_LEVEL", str, cfg["logLevel"]),
        "logJson": env("WA_LOG_JSON", lambda x: x.lower()=="true", cfg["logJson"]),
        "logFile": env("WA_LOG_FILE", str, cfg["logFile"]),
        "logMaxBytes": env("WA_LOG_MAX_BYTES", int, cfg["logMaxBytes"]),
        "logBackupCount": env("WA_LOG_BACKUP", int, cfg["logBackupCount"]),
    }
    cfg.update(overrides)
    return cfg


# -------------------------
# Logging
# -------------------------

def setup_logging(cfg):
    os.makedirs(os.path.dirname(cfg["logFile"]), exist_ok=True)
    logger = logging.getLogger("weigh-agent")
    logger.setLevel(getattr(logging, cfg.get("logLevel", "INFO").upper(), logging.INFO))
    handler = RotatingFileHandler(cfg["logFile"], maxBytes=cfg["logMaxBytes"], backupCount=cfg["logBackupCount"])

    class JsonFormatter(logging.Formatter):
        def format(self, record):
            base = {
                "ts": datetime.now(timezone.utc).isoformat(),
                "level": record.levelname,
                "msg": record.getMessage(),
                "name": record.name,
            }
            if record.exc_info:
                base["exc"] = self.formatException(record.exc_info)
            return json.dumps(base, ensure_ascii=False)

    if cfg.get("logJson", True):
        handler.setFormatter(JsonFormatter())
    else:
        handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s"))
    logger.addHandler(handler)
    # also stdout
    sh = logging.StreamHandler(sys.stdout)
    if cfg.get("logJson", True):
        sh.setFormatter(JsonFormatter())
    else:
        sh.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s"))
    logger.addHandler(sh)
    return logger


# -------------------------
# Filters
# -------------------------
class MovingAverage:
    def __init__(self, window=5):
        self.window = max(1, int(window))
        self.buf = []

    def add(self, v):
        self.buf.append(v)
        if len(self.buf) > self.window:
            self.buf.pop(0)
        return sum(self.buf) / len(self.buf)


class Kalman:
    def __init__(self, R=1e-2, Q=1e-3):
        self.R = R
        self.Q = Q
        self.P = 1.0
        self.X = 0.0
        self.inited = False

    def add(self, z):
        if not self.inited:
            self.X = z
            self.inited = True
            return z
        # prediction
        self.P = self.P + self.Q
        # update
        K = self.P / (self.P + self.R)
        self.X = self.X + K * (z - self.X)
        self.P = (1 - K) * self.P
        return self.X


# -------------------------
# Health HTTP server
# -------------------------
class HealthHandler(BaseHTTPRequestHandler):
    agent_ref = None  # set by main

    def log_message(self, format, *args):
        return  # silence

    def do_GET(self):
        if self.path not in ("/", "/health"):
            self.send_response(404)
            self.end_headers()
            return
        ag = HealthHandler.agent_ref
        now = time.time()
        last = ag.last_weight_ts if ag else 0
        body = json.dumps({
            "status": "ok",
            "machineId": ag.cfg.get("machineId") if ag else None,
            "lastWeightTs": last,
            "ageSec": (now - last) if last else None
        }).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


# -------------------------
# Agent
# -------------------------
class WeighAgent:
    def __init__(self, cfg, logger):
        self.cfg = cfg
        self.log = logger
        self.mqtt = None
        self.serial = None
        self.running = False
        self.thread = None
        self.hb_thread = None

        self.last_published_weight = None
        self.last_publish_ts = 0.0
        self.last_weight_ts = 0.0

        self.fake_current_kg = cfg.get("fakeStartKg", 0.0)

        self.ma = MovingAverage(cfg.get("maWindow", 5))
        self.kalman = Kalman(cfg.get("kalmanR", 1e-2), cfg.get("kalmanQ", 1e-3)) if cfg.get("enableKalman") else None

        self.stability_buf = []  # (ts, value)
        self.buffer_q = queue.Queue()

        os.makedirs(LOG_DIR, exist_ok=True)
        os.makedirs(BUFFER_DIR, exist_ok=True)

    # ------------- MQTT -------------
    def _mqtt_publish(self, topic, payload, qos=None, retain=None):
        if qos is None:
            qos = int(self.cfg.get("mqttQos", 1))
        if retain is None:
            retain = bool(self.cfg.get("mqttRetain", False))
        data = json.dumps(payload, ensure_ascii=False)
        if self.mqtt is None:
            self._buffer_store(topic, data, qos, retain)
            return
        try:
            res = self.mqtt.publish(topic, data, qos=qos, retain=retain)
            if res.rc != mqtt.MQTT_ERR_SUCCESS:
                # buffer on failure
                self._buffer_store(topic, data, qos, retain)
        except Exception as e:
            self.log.error(f"MQTT publish error: {e}")
            self._buffer_store(topic, data, qos, retain)

    def _on_mqtt_connect(self, client, userdata, flags, rc):
        if rc == 0:
            self.log.info(f"[MQTT] connected to {self.cfg['mqttHost']}:{self.cfg['mqttPort']}")
            self._publish_status("ONLINE", retain=True)
            self._drain_buffer()
        else:
            self.log.error(f"[MQTT] connect failed rc={rc}")

    def _on_mqtt_disconnect(self, client, userdata, rc):
        if rc != 0:
            self.log.warning(f"[MQTT] unexpected disconnect rc={rc}")

    def _setup_mqtt(self):
        host = self.cfg["mqttHost"]
        port = int(self.cfg["mqttPort"])
        c = mqtt.Client()
        if self.cfg.get("mqttUsername"):
            c.username_pw_set(self.cfg.get("mqttUsername"), self.cfg.get("mqttPassword") or None)
        # LWT
        will_payload = json.dumps({
            "machineId": self.cfg["machineId"],
            "status": "OFFLINE",
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        c.will_set(f"weigh/{self.cfg['machineId']}/status", will_payload, qos=1, retain=True)
        c.on_connect = self._on_mqtt_connect
        c.on_disconnect = self._on_mqtt_disconnect
        # reconnect backoff
        c.reconnect_delay_set(min_delay=1, max_delay=30)
        try:
            c.connect(host, port, keepalive=int(self.cfg.get("mqttKeepalive",60)))
        except Exception as e:
            self.log.error(f"[MQTT] connect error: {e}")
        c.loop_start()
        self.mqtt = c

    def _publish_status(self, status, retain=False, extra=None):
        payload = {
            "machineId": self.cfg["machineId"],
            "status": status,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        if extra:
            payload.update(extra)
        self._mqtt_publish(f"weigh/{self.cfg['machineId']}/status", payload, qos=1, retain=retain)

    def _publish_reading(self, weight, raw):
        payload = {
            "machineId": self.cfg["machineId"],
            "weight": weight,
            "unit": "kg",
            "raw": raw.strip() if isinstance(raw, str) else raw,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        self._mqtt_publish(f"weigh/{self.cfg['machineId']}/reading", payload)

    # ------------- Offline buffer -------------
    def _buffer_store(self, topic, data, qos, retain):
        # in-memory queue + spill to file JSONL when large
        try:
            self.buffer_q.put_nowait((topic, data, qos, retain))
        except queue.Full:
            pass
        # Best-effort persist
        try:
            path = os.path.join(BUFFER_DIR, f"buf_{int(time.time()*1000)}.jsonl")
            with open(path, "a", encoding="utf-8") as f:
                f.write(json.dumps({"t":topic, "d":data, "q":qos, "r":retain})+"\n")
        except Exception:
            pass

    def _drain_buffer(self):
        max_items = int(self.cfg.get("bufferMaxItems", 2000))
        # drain files first
        files = sorted(glob.glob(os.path.join(BUFFER_DIR, "buf_*.jsonl")))
        for fp in files:
            try:
                with open(fp, "r", encoding="utf-8") as f:
                    for line in f:
                        if not line.strip():
                            continue
                        obj = json.loads(line)
                        res = self.mqtt.publish(obj["t"], obj["d"], qos=obj.get("q",1), retain=obj.get("r", False))
                        if res.rc != mqtt.MQTT_ERR_SUCCESS:
                            break
                os.remove(fp)
            except Exception:
                break
        # drain in-memory
        drained = 0
        while not self.buffer_q.empty() and drained < max_items:
            try:
                topic, data, qos, retain = self.buffer_q.get_nowait()
                res = self.mqtt.publish(topic, data, qos=qos, retain=retain)
                if res.rc != mqtt.MQTT_ERR_SUCCESS:
                    # push back to file
                    self._buffer_store(topic, data, qos, retain)
                    break
                drained += 1
            except queue.Empty:
                break

    # ------------- Serial -------------
    def _detect_port(self):
        # if configured and exists, use it
        port = (self.cfg.get("serialPort") or "auto").strip()
        if port.lower() != "auto":
            return port
        # auto detect
        ports = [p.device for p in serial.tools.list_ports.comports()]
        if os.name == 'nt':
            for p in ports:
                if p.upper().startswith("COM"):
                    return p
        else:
            for pattern in ("/dev/ttyUSB*", "/dev/ttyACM*"):
                matches = sorted(glob.glob(pattern))
                if matches:
                    return matches[0]
        return None

    def _open_serial(self):
        target = self._detect_port()
        if not target:
            raise RuntimeError("No serial port detected. Set serialPort or plug in device.")
        baud = int(self.cfg.get("baudrate", 9600))
        bytesize_map = {5: serial.FIVEBITS, 6: serial.SIXBITS, 7: serial.SEVENBITS, 8: serial.EIGHTBITS}
        parity_map = {"N": serial.PARITY_NONE, "E": serial.PARITY_EVEN, "O": serial.PARITY_ODD, "M": serial.PARITY_MARK, "S": serial.PARITY_SPACE}
        stopbits_map = {1: serial.STOPBITS_ONE, 1.5: serial.STOPBITS_ONE_POINT_FIVE, 2: serial.STOPBITS_TWO}
        ser = serial.Serial(
            port=target,
            baudrate=baud,
            timeout=0.2,
            bytesize=bytesize_map.get(int(self.cfg.get("bytesize", 8)), serial.EIGHTBITS),
            parity=parity_map.get(str(self.cfg.get("parity","N")).upper(), serial.PARITY_NONE),
            stopbits=stopbits_map.get(float(self.cfg.get("stopbits",1)), serial.STOPBITS_ONE),
        )
        self.serial = ser
        self.log.info(f"[SERIAL] opened {target} @ {baud}")

    # ------------- Parse & generate -------------
    def _parse_weight(self, raw_line: str):
        regex = self.cfg.get("frameRegex", r"([+-]\d{8})B")
        matches = re.findall(regex, raw_line)
        if not matches:
            return None
        last = matches[-1]
        sign = 1 if last[0] == "+" else -1
        digits = last[1:]
        try:
            value = int(digits) * sign
        except Exception:
            return None
        divisor = float(self.cfg.get("parseDivisor", 100000))
        if divisor <= 0:
            divisor = 100000
        kg = value / divisor
        zero_th = float(self.cfg.get("zeroThreshold", 10))
        if abs(kg) <= zero_th:
            kg = 0.0
        return float(round(kg, 3))

    def _generate_fake_line(self):
        start = float(self.cfg.get("fakeStartKg", 0.0))
        end = float(self.cfg.get("fakeEndKg", 60000.0))
        step = float(self.cfg.get("fakeStepKg", 50.0))
        self.fake_current_kg += step
        if self.fake_current_kg > end:
            self.fake_current_kg = start
        divisor = int(float(self.cfg.get("fakeScaleDivisor", 1000))) or 1000
        raw_value = int(self.fake_current_kg * divisor)
        if raw_value > 99999999:
            raw_value = 99999999
        return f"\x02+{raw_value:08d}B\x03"

    # ------------- Filtering & publish control -------------
    def _filter_value(self, kg):
        # outlier reject by delta
        if self.last_published_weight is not None:
            if abs(kg - self.last_published_weight) > float(self.cfg.get("deltaOutlierKg", 2000.0)):
                return None
        v = self.ma.add(kg)
        if self.kalman:
            v = self.kalman.add(v)
        return v

    def _is_stable(self, ts, value):
        win = int(self.cfg.get("stabilityWindow", 8))
        th = float(self.cfg.get("stabilityThreshold", 0.5))
        min_ms = int(self.cfg.get("stabilityMinDurationMs", 400))
        self.stability_buf.append((ts, value))
        if len(self.stability_buf) > win:
            self.stability_buf.pop(0)
        if len(self.stability_buf) < win:
            return False
        vals = [v for (_t, v) in self.stability_buf]
        if max(vals) - min(vals) > th:
            return False
        # duration check
        dur_ms = (self.stability_buf[-1][0] - self.stability_buf[0][0]) * 1000.0
        return dur_ms >= min_ms

    def _should_publish(self, weight):
        now = time.time()
        if self.last_published_weight is None:
            self.last_published_weight = weight
            self.last_publish_ts = now
            return True
        min_change = float(self.cfg.get("minWeightChange", 0))
        if min_change > 0 and abs(weight - self.last_published_weight) < min_change:
            return False
        min_interval_ms = int(self.cfg.get("minPublishIntervalMs", 100))
        if min_interval_ms > 0:
            elapsed_ms = (now - self.last_publish_ts) * 1000.0
            if elapsed_ms < min_interval_ms:
                return False
        self.last_published_weight = weight
        self.last_publish_ts = now
        return True

    # ------------- Heartbeat -------------
    def _heartbeat_loop(self):
        interval = int(self.cfg.get("heartbeatIntervalSec", 30))
        while self.running:
            try:
                self._publish_status("ONLINE", retain=True, extra={"heartbeat": True})
            except Exception:
                pass
            time.sleep(interval)

    # ------------- Main loop -------------
    def _loop(self):
        self.log.info("[AGENT] loop started")
        fake = bool(self.cfg.get("fakeMode", False))
        if not fake:
            # open serial with retries
            backoff = 1
            while self.running and self.serial is None:
                try:
                    self._open_serial()
                except Exception as e:
                    self.log.error(f"[SERIAL] open error: {e}")
                    time.sleep(backoff)
                    backoff = min(backoff * 2, 30)
        else:
            self.log.info("[SERIAL] FAKE MODE")

        fake_interval = int(self.cfg.get("fakeIntervalMs", 300)) / 1000.0
        frame_regex = self.cfg.get("frameRegex", r"([+-]\d{8})B")

        while self.running:
            try:
                if fake:
                    line = self._generate_fake_line()
                    time.sleep(fake_interval)
                else:
                    if self.serial is None or not self.serial.is_open:
                        # try reopen
                        self.serial = None
                        self._open_serial()
                        if self.serial is None:
                            time.sleep(2)
                            continue
                    line_bytes = self.serial.readline()
                    if not line_bytes:
                        # also mark stale if no data for a while
                        if self.last_weight_ts and time.time() - self.last_weight_ts > int(self.cfg.get("staleDataSec", 60)):
                            self.log.warning("[WATCHDOG] stale data - no readings")
                        continue
                    try:
                        line = line_bytes.decode(errors="ignore")
                    except Exception:
                        continue

                kg = self._parse_weight(line)
                if kg is None:
                    continue
                self.last_weight_ts = time.time()

                kg_f = self._filter_value(kg)
                if kg_f is None:
                    continue

                stable = self._is_stable(self.last_weight_ts, kg_f)
                if not stable:
                    continue

                if not self._should_publish(kg_f):
                    continue

                self._publish_reading(round(kg_f, 3), line)

            except serial.SerialException as e:
                self.log.error(f"[SERIAL] error: {e}")
                try:
                    if self.serial and self.serial.is_open:
                        self.serial.close()
                except Exception:
                    pass
                self.serial = None
                time.sleep(2)
            except Exception as e:
                self.log.error(f"[LOOP] error: {e}")
                time.sleep(0.5)

        try:
            if self.serial and self.serial.is_open:
                self.serial.close()
        except Exception:
            pass
        self.log.info("[AGENT] loop stopped")

    # ------------- Public -------------
    def start(self):
        if self.running:
            return
        self.running = True
        self.last_published_weight = None
        self.last_publish_ts = 0.0
        self._setup_mqtt()
        self.thread = threading.Thread(target=self._loop, daemon=True)
        self.thread.start()
        self.hb_thread = threading.Thread(target=self._heartbeat_loop, daemon=True)
        self.hb_thread.start()

    def stop(self):
        self.running = False
        try:
            self._publish_status("OFFLINE", retain=True)
        except Exception:
            pass
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=3)
        if self.hb_thread and self.hb_thread.is_alive():
            self.hb_thread.join(timeout=2)
        if self.mqtt:
            try:
                self.mqtt.loop_stop()
                self.mqtt.disconnect()
            except Exception:
                pass
        self.mqtt = None


# -------------------------
# Main entry
# -------------------------

def main():
    cfg = load_config()
    logger = setup_logging(cfg)
    agent = WeighAgent(cfg, logger)

    # Start health server
    HealthHandler.agent_ref = agent
    srv = HTTPServer(("0.0.0.0", int(cfg.get("healthPort", 8787))), HealthHandler)
    t_http = threading.Thread(target=srv.serve_forever, daemon=True)
    t_http.start()

    def handle_sig(sig, frame):
        agent.stop()
        try:
            srv.shutdown()
        except Exception:
            pass
        sys.exit(0)

    signal.signal(signal.SIGINT, handle_sig)
    signal.signal(signal.SIGTERM, handle_sig)

    agent.start()
    # keep main thread alive
    while True:
        time.sleep(1)


if __name__ == "__main__":
    main()

