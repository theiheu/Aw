import argparse
import json
import signal
import sys
import threading
import time
import logging
from pathlib import Path
from typing import Optional

from .config import AgentConfig, DEFAULT_CONFIG_PATH
from .logger import setup_logging
from .serial_reader import ScaleReader
from .mqtt_client import MqttClient
from .printing import ensure_bytes_from_payload, print_pdf_bytes, PrintError
from .backend import BackendPusher, BackendConfig

log = logging.getLogger(__name__)


class WeighAgent:
    def __init__(self, config: AgentConfig) -> None:
        self.cfg = config
        self.latest_weight: Optional[float] = None
        self._lock = threading.Lock()

        self.scale = ScaleReader(
            port=self.cfg.serialPort,
            baudrate=self.cfg.baudRate,
            encoding=self.cfg.serialEncoding,
            regex=self.cfg.serialRegex,
            decimals=self.cfg.decimals,
            simulate=self.cfg.simulateScale,
            interval_ms=self.cfg.publishIntervalMs,
            on_weight=self._on_weight,
            fake_mode=self.cfg.fakeMode,
            fake_min=self.cfg.fakeMin,
            fake_max=self.cfg.fakeMax,
            fake_hz=self.cfg.fakeHz,
            fake_noise=self.cfg.fakeNoise,
            fake_step=self.cfg.fakeStep,
            fake_manual_weight=self.cfg.fakeManualWeight,
        )
        self.mqtt = MqttClient(
            host=self.cfg.mqttHost,
            port=self.cfg.mqttPort,
            machine_id=self.cfg.machineId,
            username=self.cfg.mqttUsername,
            password=self.cfg.mqttPassword,
            on_print=self._on_print,
        )
        # Backend pusher
        self.backend = BackendPusher(
            BackendConfig(
                base_url=self.cfg.backendUrl or "",
                events_endpoint=self.cfg.backendEventsEndpoint or "/api/events",
                enabled=bool(getattr(self.cfg, "backendEnabled", False) and (self.cfg.backendUrl or "")),
                min_interval_ms=int(getattr(self.cfg, "backendMinIntervalMs", 500)),
                delta_threshold=float(getattr(self.cfg, "backendDeltaThreshold", 5.0)),
                api_key=str(getattr(self.cfg, "backendApiKey", "")),
            ),
            machine_id=self.cfg.machineId,
        )
        self._running = False

    # Callbacks
    def _on_weight(self, w: float) -> None:
        with self._lock:
            self.latest_weight = w
        try:
            self.mqtt.publish_reading(w)
        except Exception:
            pass
        try:
            self.backend.push_reading(w)
        except Exception:
            pass

    def _on_print(self, payload: dict) -> None:
        # Expect: { pdfBase64 | pdfUrl , secret, printer? }
        secret = payload.get("secret") if isinstance(payload, dict) else None
        if not secret or secret != self.cfg.printSecret:
            log.warning("Print rejected: invalid secret")
            try:
                self.mqtt.publish_status("PRINT_ERROR")
            except Exception:
                pass
            return
        try:
            pdf_bytes = ensure_bytes_from_payload(payload)
            printer_name = None
            if isinstance(payload, dict):
                printer_name = payload.get("printer") or (self.cfg.printerName or None)
            print_pdf_bytes(pdf_bytes, printer=printer_name)
            log.info("Printed PDF successfully")
            self.mqtt.publish_status("PRINT_OK")
            try:
                self.backend.push_print("OK")
            except Exception:
                pass
        except PrintError as e:
            log.error("Print error: %s", e)
            self.mqtt.publish_status("PRINT_ERROR")
        except Exception as e:
            log.exception("Unexpected print error: %s", e)
            self.mqtt.publish_status("PRINT_ERROR")

    # Lifecycle
    def start(self) -> None:
        if self._running:
            return
        self._running = True
        self.mqtt.start()
        time.sleep(0.1)
        self.scale.start()
        self.backend.start()
        try:
            self.backend.push_status("ONLINE")
        except Exception:
            pass
        log.info("WeighAgent started for machineId=%s", self.cfg.machineId)

    def stop(self) -> None:
        if not self._running:
            return
        self.scale.stop()
        try:
            self.mqtt.publish_status("OFFLINE")
        except Exception:
            pass
        try:
            self.backend.push_status("OFFLINE")
        except Exception:
            pass
        self.backend.stop()
        self.mqtt.stop()
        self._running = False
        log.info("WeighAgent stopped")


# CLI

def parse_args(argv: list[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Weigh Agent (scale + printer)")
    p.add_argument("--config", type=str, default=str(DEFAULT_CONFIG_PATH), help="Path to config.json")
    p.add_argument("--log", type=str, default=None, help="Log level (DEBUG, INFO, WARNING)")
    return p.parse_args(argv)


def run_cli(argv: list[str]) -> int:
    args = parse_args(argv)
    cfg_path = Path(args.config)
    cfg = AgentConfig.load(cfg_path)
    setup_logging(args.log or cfg.logLevel)
    log.info("Loaded config from %s", cfg_path)

    agent = WeighAgent(cfg)

    # Graceful shutdown
    stop_event = threading.Event()

    def handle_sig(signum, frame):  # type: ignore
        log.info("Signal %s received, shutting down...", signum)
        stop_event.set()

    signal.signal(signal.SIGINT, handle_sig)
    signal.signal(signal.SIGTERM, handle_sig)

    agent.start()
    try:
        while not stop_event.is_set():
            time.sleep(0.5)
    finally:
        agent.stop()
    return 0


if __name__ == "__main__":
    raise SystemExit(run_cli(sys.argv[1:]))

