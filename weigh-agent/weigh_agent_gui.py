import json
import os
import threading
import time
import base64
import tempfile
import queue
from datetime import datetime, timezone
import re
import tkinter as tk
from tkinter import ttk, messagebox
import platform
import subprocess
import shutil

import serial
import serial.tools.list_ports
import paho.mqtt.client as mqtt
import requests


# ==========================
# CẤU HÌNH & HẰNG SỐ
# ==========================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(BASE_DIR, "config.json")

DEFAULT_CONFIG = {
    "machineId": "weigh1",
    "serialPort": "COM5",          # nên trỏ tới COM ảo (COM5, COM6...)
    "baudrate": 9600,

    # MQTT (Agent dùng TCP)
    "mqttHost": "127.0.0.1",
    "mqttPort": 1883,
    "mqttUsername": "",
    "mqttPassword": "",

    # In ấn
    "printSecret": "CHANGE_ME",

    # Bộ lọc publish
    "zeroThreshold": 10,           # |kg| <= threshold -> 0
    "minPublishIntervalMs": 100,   # chống spam MQTT
    "minWeightChange": 0,          # chỉ publish khi chênh >= giá trị này (0 = tắt)

    # Fake mode
    "fakeMode": False,
    "fakeStartKg": 0.0,
    "fakeEndKg": 60.0,
    "fakeStepKg": 2.0,
    "fakeIntervalMs": 300,

    # Scale divisors
    "parseDivisor": 100000,        # scale for real device parsing
    "fakeScaleDivisor": 1000,      # scale for fake frames (supports up to ~99,999,999 / divisor kg)

    # Backend optional (để agent trực tiếp đẩy dữ liệu lên backend nếu cần)
    "backendUrl": "",                   # ví dụ: http://localhost:4000
    "backendEventsEndpoint": "/api/weigh-events",  # endpoint nhận reading
    "backendApiKey": "",               # tuỳ chọn: nếu backend yêu cầu API key
    "backendApiHeaderName": "X-API-Key" # tên header để gửi API key
}


def load_config():
    if not os.path.exists(CONFIG_PATH):
        with open(CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(DEFAULT_CONFIG, f, indent=2, ensure_ascii=False)
        return DEFAULT_CONFIG.copy()
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        cfg = json.load(f)
    # merge default
    merged = DEFAULT_CONFIG.copy()
    merged.update(cfg)
    return merged


def save_config(cfg):
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2, ensure_ascii=False)


# ==========================
# CORE AGENT (KHÔNG GUI)
# ==========================

class WeighAgentCore:
    def __init__(self, cfg, log_callback=None, status_callback=None, weight_callback=None):
        self.cfg = cfg
        self.log = log_callback or (lambda msg: None)
        self.update_status = status_callback or (lambda key, val: None)
        self.update_weight = weight_callback or (lambda w: None)

        self.mqtt_client = None
        self.serial_port = None
        self.running = False
        self.thread = None

        self.last_published_weight = None
        self.last_publish_ts = 0.0

        self.fake_current_kg = self.cfg.get("fakeStartKg", 0.0)

    # ---------- MQTT ----------

    def _mqtt_publish(self, topic: str, data: dict, qos: int = 1, retain: bool = False):
        if not self.mqtt_client:
            return
        try:
            payload = json.dumps(data, ensure_ascii=False)
            self.mqtt_client.publish(topic, payload, qos=qos, retain=retain)
        except Exception as e:
            self.log(f"[MQTT] Publish error: {e}")

    def _on_mqtt_connect(self, client, userdata, flags, rc):
        if rc == 0:
            self.log(f"[MQTT] Connected to {self.cfg['mqttHost']}:{self.cfg['mqttPort']}")
            topic_print = f"weigh/{self.cfg['machineId']}/print"
            client.subscribe(topic_print, qos=1)
            self.update_status("mqtt", "CONNECTED")

            # Birth (ONLINE)
            self._mqtt_publish(
                f"weigh/{self.cfg['machineId']}/status",
                {
                    "machineId": self.cfg["machineId"],
                    "status": "ONLINE",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                },
                retain=True
            )
        else:
            self.log(f"[MQTT] Connect failed rc={rc}")
            self.update_status("mqtt", f"ERROR {rc}")

    def _on_mqtt_disconnect(self, client, userdata, rc):
        # rc != 0 means unexpected
        self.update_status("mqtt", "DISCONNECTED")
        if rc != 0:
            self.log(f"[MQTT] Unexpected disconnect rc={rc}")

    def _on_mqtt_message(self, client, userdata, msg):
        try:
            payload = json.loads(msg.payload.decode("utf-8"))
        except Exception as e:
            self.log(f"[MQTT] Invalid JSON on {msg.topic}: {e}")
            return

        self.log(f"[MQTT] {msg.topic}: {payload}")

        topic_print = f"weigh/{self.cfg['machineId']}/print"
        if msg.topic == topic_print:
            self._handle_print(payload)

    def _setup_mqtt(self):
        host = self.cfg["mqttHost"]
        port = int(self.cfg["mqttPort"])
        client = mqtt.Client()
        if self.cfg.get("mqttUsername"):
            client.username_pw_set(self.cfg.get("mqttUsername"), self.cfg.get("mqttPassword") or None)

        # Last Will: OFFLINE
        will_payload = json.dumps({
            "machineId": self.cfg["machineId"],
            "status": "OFFLINE",
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        client.will_set(f"weigh/{self.cfg['machineId']}/status", will_payload, qos=1, retain=True)

        client.on_connect = self._on_mqtt_connect
        client.on_message = self._on_mqtt_message
        client.on_disconnect = self._on_mqtt_disconnect

        self.log(f"[MQTT] Connecting to {host}:{port} ...")
        try:
            client.connect(host, port, keepalive=60)
        except Exception as e:
            self.log(f"[MQTT] Connect error: {e}")
            self.update_status("mqtt", "ERROR")
            return None

        client.loop_start()
        self.mqtt_client = client
        self.update_status("mqtt", "CONNECTING")
        return client

    # ---------- SERIAL & PARSE ----------

    def _open_serial(self):
        port = self.cfg["serialPort"]
        baud = int(self.cfg["baudrate"])
        try:
            ser = serial.Serial(port=port, baudrate=baud, timeout=0.2)
            self.serial_port = ser
            self.log(f"[SERIAL] Opened {port} @ {baud}")
            self.update_status("serial", f"OPEN {port}")
        except serial.SerialException as e:
            self.log(f"[SERIAL] Failed to open {port}: {e}")
            self.serial_port = None
            self.update_status("serial", f"ERROR {e}")
        except Exception as e:
            self.log(f"[SERIAL] Failed to open {port}: {e}")
            self.serial_port = None
            self.update_status("serial", f"ERROR {e}")

    def _parse_weight(self, raw_line: str):
        """
        Parse dữ liệu cân dạng: \x02+04433001B\x03
        - Lấy frame cuối: +ddddddddB
        - Scale: value / 100000 -> kg
        """
        matches = re.findall(r'([+-]\d{8})B', raw_line)
        if not matches:
            return None

        last_frame = matches[-1]
        sign = 1 if last_frame[0] == "+" else -1
        digits = last_frame[1:]

        try:
            value = int(digits) * sign
        except ValueError:
            return None

        # scale dddddddd -> kg (tuỳ divisor). Nếu fakeMode bật, dùng fakeScaleDivisor để hỗ trợ tải lớn.
        divisor = float(self.cfg.get("parseDivisor", 100000))
        if bool(self.cfg.get("fakeMode", False)):
            divisor = float(self.cfg.get("fakeScaleDivisor", divisor))
        if divisor <= 0:
            divisor = 100000.0
        value = value / divisor

        zero_th = float(self.cfg.get("zeroThreshold", 10))
        if abs(value) <= zero_th:
            value = 0.0

        return round(value, 3)

    # ---------- FAKE MODE ----------

    def _generate_fake_line(self):
        start_kg = float(self.cfg.get("fakeStartKg", 0.0))
        end_kg = float(self.cfg.get("fakeEndKg", 60.0))
        step_kg = float(self.cfg.get("fakeStepKg", 2.0))

        self.fake_current_kg += step_kg
        if self.fake_current_kg > end_kg:
            self.fake_current_kg = start_kg

        # Scale fake to fit 8-digit frame using fakeScaleDivisor
        divisor = int(float(self.cfg.get("fakeScaleDivisor", 1000)))
        if divisor <= 0:
            divisor = 1000
        raw_value = int(self.fake_current_kg * divisor)
        if raw_value > 99999999:
            raw_value = 99999999

        frame = f"\x02+{raw_value:08d}B\x03"
        return frame

    # ---------- PRINT TICKET ----------

    def _save_pdf_base64(self, pdf_b64: str, ticket_id: str) -> str:
        try:
            data = base64.b64decode(pdf_b64)
        except Exception as e:
            raise RuntimeError(f"Decode base64 error: {e}")

        fd, path = tempfile.mkstemp(prefix=f"{ticket_id}_", suffix=".pdf")
        with os.fdopen(fd, "wb") as f:
            f.write(data)
        self.log(f"[PRINT] Saved temp PDF: {path}")
        return path

    def _download_pdf(self, url: str, ticket_id: str) -> str:
        self.log(f"[PRINT] Downloading PDF from: {url}")
        try:
            r = requests.get(url, timeout=10)
            r.raise_for_status()
        except Exception as e:
            raise RuntimeError(f"Download PDF failed: {e}")

        fd, path = tempfile.mkstemp(prefix=f"{ticket_id}_", suffix=".pdf")
        with os.fdopen(fd, "wb") as f:
            f.write(r.content)
        self.log(f"[PRINT] Saved downloaded PDF: {path}")
        return path

    def _print_pdf(self, path: str):
        try:
            system = platform.system().lower()
            if os.name == 'nt' or system.startswith('win'):
                # Windows
                self.log(f"[PRINT] Sending to printer (Windows): {path}")
                os.startfile(path, "print")
            else:
                # Linux / macOS: try lp, then lpr
                cmd = None
                if shutil.which('lp'):
                    cmd = ['lp', path]
                elif shutil.which('lpr'):
                    cmd = ['lpr', path]
                if cmd is None:
                    raise RuntimeError("No 'lp' or 'lpr' command found for printing on this system")
                self.log(f"[PRINT] Sending to printer: {' '.join(cmd)}")
                result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=20)
                if result.returncode != 0:
                    raise RuntimeError(result.stderr.decode('utf-8', errors='ignore') or 'Unknown print error')
        except Exception as e:
            raise RuntimeError(f"Print error: {e}")

    def _handle_print(self, payload: dict):
        secret_cfg = self.cfg.get("printSecret") or ""
        if secret_cfg and payload.get("secret") != secret_cfg:
            self.log("[PRINT] Invalid secret, ignore command.")
            return

        ticket_id = payload.get("ticketId", "ticket")
        pdf_b64 = payload.get("pdfBase64")
        pdf_url = payload.get("pdfUrl")

        if not pdf_b64 and not pdf_url:
            self.log("[PRINT] No pdfBase64 or pdfUrl in payload.")
            return

        topic_status = f"weigh/{self.cfg['machineId']}/status"

        try:
            if pdf_b64:
                pdf_path = self._save_pdf_base64(pdf_b64, ticket_id)
            else:
                pdf_path = self._download_pdf(pdf_url, ticket_id)

            self._print_pdf(pdf_path)

            self._mqtt_publish(
                topic_status,
                {
                    "machineId": self.cfg["machineId"],
                    "ticketId": ticket_id,
                    "status": "PRINT_OK",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            )
        except Exception as e:
            self.log(f"[PRINT] ERROR: {e}")
            self._mqtt_publish(
                topic_status,
                {
                    "machineId": self.cfg["machineId"],
                    "ticketId": ticket_id,
                    "status": "PRINT_ERROR",
                    "error": str(e),
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            )

    # ---------- BACKEND PUSH (optional) ----------

    def _send_to_backend(self, payload: dict):
        base = (self.cfg.get("backendUrl") or "").strip()
        if not base:
            return  # disabled
        ep = (self.cfg.get("backendEventsEndpoint") or "/api/weigh-events").strip()
        url = base.rstrip("/") + ep
        headers = {"Content-Type": "application/json"}
        api_key = (self.cfg.get("backendApiKey") or "").strip()
        header_name = (self.cfg.get("backendApiHeaderName") or "X-API-Key").strip()
        if api_key:
            headers[header_name] = api_key
        try:
            r = requests.post(url, json=payload, headers=headers, timeout=5)
            if r.status_code >= 300:
                self.log(f"[BACKEND] POST {url} failed {r.status_code}: {r.text[:200]}")
        except Exception as e:
            self.log(f"[BACKEND] POST error: {e}")

    # ---------- PUBLISH CONTROL ----------

    def _should_publish(self, weight: float) -> bool:
        now = time.time()

        if self.last_published_weight is None:
            self.last_published_weight = weight
            self.last_publish_ts = now
            return True

        min_change = float(self.cfg.get("minWeightChange", 0))
        if min_change > 0:
            if abs(weight - self.last_published_weight) < min_change:
                return False

        min_interval_ms = int(self.cfg.get("minPublishIntervalMs", 100))
        if min_interval_ms > 0:
            elapsed_ms = (now - self.last_publish_ts) * 1000.0
            if elapsed_ms < min_interval_ms:
                return False

        self.last_published_weight = weight
        self.last_publish_ts = now
        return True

    # ---------- MAIN LOOP ----------

    def _loop(self):
        self.log("[AGENT] Loop started.")
        fake_mode = bool(self.cfg.get("fakeMode", False))
        machine_id = self.cfg["machineId"]

        topic_reading = f"weigh/{machine_id}/reading"

        if not fake_mode:
            self._open_serial()
        else:
            self.update_status("serial", "FAKE_MODE")

        fake_interval = int(self.cfg.get("fakeIntervalMs", 300)) / 1000.0

        while self.running:
            try:
                if fake_mode:
                    # tạo raw giả
                    line = self._generate_fake_line()
                    time.sleep(fake_interval)
                else:
                    if self.serial_port is None or not self.serial_port.is_open:
                        self._open_serial()
                        if self.serial_port is None:
                            time.sleep(3)
                            continue

                    line_bytes = self.serial_port.readline()
                    if not line_bytes:
                        continue
                    try:
                        line = line_bytes.decode(errors="ignore")
                    except Exception:
                        continue

                weight = self._parse_weight(line)
                if weight is None:
                    # self.log(f"[DEBUG] RAW (no parse): {repr(line)}")
                    continue

                if not self._should_publish(weight):
                    continue

                payload = {
                    "machineId": machine_id,
                    "weight": weight,
                    "unit": "kg",
                    "raw": line.strip(),
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }

                self.update_weight(weight)
                self.log(f"[WEIGH] {payload}")
                self._mqtt_publish(topic_reading, payload, qos=0, retain=False)
                # Optional push to backend
                self._send_to_backend(payload)

            except serial.SerialException as e:
                self.log(f"[SERIAL] Error: {e}")
                self.update_status("serial", f"ERROR {e}")
                try:
                    if self.serial_port and self.serial_port.is_open:
                        self.serial_port.close()
                except Exception:
                    pass
                self.serial_port = None
                time.sleep(2)
            except Exception as e:
                self.log(f"[LOOP] Error: {e}")
                time.sleep(1)

        # cleanup
        try:
            if self.serial_port and self.serial_port.is_open:
                self.serial_port.close()
        except Exception:
            pass
        self.update_status("serial", "STOPPED")
        self.log("[AGENT] Loop stopped.")

    # ---------- PUBLIC API ----------

    def start(self):
        if self.running:
            return
        self.running = True
        # reset publish state
        self.last_published_weight = None
        self.last_publish_ts = 0.0

        # MQTT
        self._setup_mqtt()

        self.thread = threading.Thread(target=self._loop, daemon=True)
        self.thread.start()

    def stop(self):
        self.running = False
        # Publish OFFLINE before disconnect (graceful)
        try:
            if self.mqtt_client:
                self._mqtt_publish(
                    f"weigh/{self.cfg['machineId']}/status",
                    {
                        "machineId": self.cfg["machineId"],
                        "status": "OFFLINE",
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    },
                    retain=True
                )
        except Exception:
            pass

        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=3)
        if self.mqtt_client:
            try:
                self.mqtt_client.loop_stop()
                self.mqtt_client.disconnect()
            except Exception:
                pass
        self.mqtt_client = None
        self.log("[AGENT] Stopped.")


# ==========================
# GUI TKINTER
# ==========================

class WeighAgentGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("Weigh Agent GUI")
        self.root.geometry("760x560")

        self.cfg = load_config()
        self.agent = None

        self.log_queue = queue.Queue()

        self._build_ui()
        self._refresh_com_ports()
        self._apply_cfg_to_ui()

        # periodic log update
        self.root.after(200, self._process_log_queue)

    # ---------- UI BUILD ----------

    def _build_ui(self):
        frm_top = ttk.Frame(self.root, padding=8)
        frm_top.pack(fill="x")

        # MachineId
        ttk.Label(frm_top, text="Machine ID:").grid(row=0, column=0, sticky="w")
        self.var_machine = tk.StringVar()
        ttk.Entry(frm_top, textvariable=self.var_machine, width=15).grid(row=0, column=1, sticky="w", padx=4)

        # MQTT host/port
        ttk.Label(frm_top, text="MQTT Host:").grid(row=0, column=2, sticky="e")
        self.var_mqtt_host = tk.StringVar()
        ttk.Entry(frm_top, textvariable=self.var_mqtt_host, width=15).grid(row=0, column=3, sticky="w", padx=4)

        ttk.Label(frm_top, text="Port:").grid(row=0, column=4, sticky="e")
        self.var_mqtt_port = tk.StringVar()
        ttk.Entry(frm_top, textvariable=self.var_mqtt_port, width=6).grid(row=0, column=5, sticky="w", padx=4)

        # COM & baud
        ttk.Label(frm_top, text="Serial port:").grid(row=1, column=0, sticky="w", pady=4)
        self.var_serial_port = tk.StringVar()
        self.cbo_serial = ttk.Combobox(frm_top, textvariable=self.var_serial_port, width=10, state="readonly")
        self.cbo_serial.grid(row=1, column=1, sticky="w", padx=4)

        ttk.Button(frm_top, text="Refresh COM", command=self._refresh_com_ports).grid(row=1, column=2, sticky="w")

        ttk.Label(frm_top, text="Baud:").grid(row=1, column=3, sticky="e")
        self.var_baud = tk.StringVar()
        ttk.Entry(frm_top, textvariable=self.var_baud, width=8).grid(row=1, column=4, sticky="w", padx=4)

        # Fake mode
        self.var_fake = tk.BooleanVar()
        chk_fake = ttk.Checkbutton(frm_top, text="Fake mode", variable=self.var_fake)
        chk_fake.grid(row=1, column=5, sticky="w", padx=4)

        # MQTT username/password
        ttk.Label(frm_top, text="User:").grid(row=2, column=0, sticky="e")
        self.var_mqtt_user = tk.StringVar()
        ttk.Entry(frm_top, textvariable=self.var_mqtt_user, width=15).grid(row=2, column=1, sticky="w", padx=4)

        ttk.Label(frm_top, text="Password:").grid(row=2, column=2, sticky="e")
        self.var_mqtt_pass = tk.StringVar()
        ttk.Entry(frm_top, textvariable=self.var_mqtt_pass, width=15, show="*").grid(row=2, column=3, sticky="w", padx=4)

        # Backend (optional)
        frm_backend = ttk.LabelFrame(self.root, text="Backend (optional)", padding=8)
        frm_backend.pack(fill="x", padx=8)
        ttk.Label(frm_backend, text="Base URL:").grid(row=0, column=0, sticky="e")
        self.var_backend_url = tk.StringVar()
        ttk.Entry(frm_backend, textvariable=self.var_backend_url, width=28).grid(row=0, column=1, sticky="w", padx=4)

        ttk.Label(frm_backend, text="Events EP:").grid(row=0, column=2, sticky="e")
        self.var_backend_ep = tk.StringVar()
        ttk.Entry(frm_backend, textvariable=self.var_backend_ep, width=22).grid(row=0, column=3, sticky="w", padx=4)

        ttk.Label(frm_backend, text="API Key:").grid(row=1, column=0, sticky="e")
        self.var_backend_key = tk.StringVar()
        ttk.Entry(frm_backend, textvariable=self.var_backend_key, width=28).grid(row=1, column=1, sticky="w", padx=4)

        ttk.Label(frm_backend, text="Header:").grid(row=1, column=2, sticky="e")
        self.var_backend_header = tk.StringVar()
        ttk.Entry(frm_backend, textvariable=self.var_backend_header, width=22).grid(row=1, column=3, sticky="w", padx=4)

        # Buttons
        frm_btn = ttk.Frame(self.root, padding=8)
        frm_btn.pack(fill="x")

        self.btn_start = ttk.Button(frm_btn, text="Start agent", command=self.start_agent)
        self.btn_start.pack(side="left")

        self.btn_stop = ttk.Button(frm_btn, text="Stop", command=self.stop_agent, state="disabled")
        self.btn_stop.pack(side="left", padx=(8, 0))

        ttk.Button(frm_btn, text="Save config", command=self.save_from_ui).pack(side="right")

        # Status + weight
        frm_status = ttk.Frame(self.root, padding=8)
        frm_status.pack(fill="x")

        ttk.Label(frm_status, text="Serial:").grid(row=0, column=0, sticky="e")
        self.lbl_serial_status = ttk.Label(frm_status, text="N/A")
        self.lbl_serial_status.grid(row=0, column=1, sticky="w", padx=4)

        ttk.Label(frm_status, text="MQTT:").grid(row=0, column=2, sticky="e")
        self.lbl_mqtt_status = ttk.Label(frm_status, text="N/A")
        self.lbl_mqtt_status.grid(row=0, column=3, sticky="w", padx=4)

        ttk.Label(frm_status, text="Weight:").grid(row=1, column=0, sticky="e", pady=4)
        self.var_weight = tk.StringVar(value="0.000 kg")
        lbl_weight = ttk.Label(frm_status, textvariable=self.var_weight, font=("Segoe UI", 16, "bold"))
        lbl_weight.grid(row=1, column=1, sticky="w", padx=4)

        # Log
        frm_log = ttk.Frame(self.root, padding=8)
        frm_log.pack(fill="both", expand=True)

        ttk.Label(frm_log, text="Log:").pack(anchor="w")
        self.txt_log = tk.Text(frm_log, height=15, state="disabled", font=("Consolas", 9))
        self.txt_log.pack(fill="both", expand=True)

    # ---------- UI HELPERS ----------

    def _refresh_com_ports(self):
        ports = serial.tools.list_ports.comports()
        names = [p.device for p in ports]
        self.cbo_serial["values"] = names
        if names and self.var_serial_port.get() == "":
            self.var_serial_port.set(names[0])

    def _apply_cfg_to_ui(self):
        self.var_mqtt_user.set(self.cfg.get("mqttUsername", ""))
        self.var_mqtt_pass.set(self.cfg.get("mqttPassword", ""))

        self.var_machine.set(self.cfg.get("machineId"))
        self.var_mqtt_host.set(self.cfg.get("mqttHost"))
        self.var_mqtt_port.set(str(self.cfg.get("mqttPort")))
        self.var_serial_port.set(self.cfg.get("serialPort"))
        self.var_baud.set(str(self.cfg.get("baudrate")))
        self.var_fake.set(bool(self.cfg.get("fakeMode", False)))

        # backend
        self.var_backend_url.set(self.cfg.get("backendUrl", ""))
        self.var_backend_ep.set(self.cfg.get("backendEventsEndpoint", "/api/weigh-events"))
        self.var_backend_key.set(self.cfg.get("backendApiKey", ""))
        self.var_backend_header.set(self.cfg.get("backendApiHeaderName", "X-API-Key"))

    def save_from_ui(self):
        try:
            self.cfg["mqttUsername"] = self.var_mqtt_user.get().strip()
            self.cfg["mqttPassword"] = self.var_mqtt_pass.get().strip()
            self.cfg["machineId"] = self.var_machine.get().strip() or "weigh1"
            self.cfg["mqttHost"] = self.var_mqtt_host.get().strip() or "127.0.0.1"
            self.cfg["mqttPort"] = int(self.var_mqtt_port.get() or "1883")
            self.cfg["serialPort"] = self.var_serial_port.get().strip() or "COM5"
            self.cfg["baudrate"] = int(self.var_baud.get() or "9600")
            self.cfg["fakeMode"] = bool(self.var_fake.get())

            # backend
            self.cfg["backendUrl"] = self.var_backend_url.get().strip()
            self.cfg["backendEventsEndpoint"] = self.var_backend_ep.get().strip() or "/api/weigh-events"
            self.cfg["backendApiKey"] = self.var_backend_key.get().strip()
            self.cfg["backendApiHeaderName"] = self.var_backend_header.get().strip() or "X-API-Key"
        except Exception as e:
            messagebox.showerror("Config error", str(e))
            return

        save_config(self.cfg)
        messagebox.showinfo("Config", "Đã lưu config.json")

    # ---------- LOG & STATUS ----------

    def _log(self, msg):
        self.log_queue.put(msg)

    def _process_log_queue(self):
        try:
            while True:
                msg = self.log_queue.get_nowait()
                self.txt_log.configure(state="normal")
                self.txt_log.insert("end", msg + "\n")
                self.txt_log.see("end")
                self.txt_log.configure(state="disabled")
        except queue.Empty:
            pass
        self.root.after(200, self._process_log_queue)

    def _update_status(self, key, val):
        if key == "serial":
            self.lbl_serial_status.config(text=str(val))
        elif key == "mqtt":
            self.lbl_mqtt_status.config(text=str(val))

    def _update_weight(self, w):
        self.var_weight.set(f"{w:.3f} kg")

    # ---------- START / STOP ----------

    def start_agent(self):
        if self.agent is not None:
            return
        # sync UI -> cfg
        self.save_from_ui()

        self.agent = WeighAgentCore(
            self.cfg,
            log_callback=self._log,
            status_callback=self._update_status,
            weight_callback=self._update_weight
        )
        self.agent.start()
        self.btn_start.config(state="disabled")
        self.btn_stop.config(state="normal")
        self._log("[GUI] Agent started.")

    def stop_agent(self):
        if self.agent:
            self.agent.stop()
            self.agent = None
        self.btn_start.config(state="normal")
        self.btn_stop.config(state="disabled")
        self._update_status("serial", "STOPPED")
        self._update_status("mqtt", "DISCONNECTED")
        self._log("[GUI] Agent stopped.")


def main():
    root = tk.Tk()
    app = WeighAgentGUI(root)
    root.protocol("WM_DELETE_WINDOW", lambda: (app.stop_agent(), root.destroy()))
    root.mainloop()


if __name__ == "__main__":
    main()
