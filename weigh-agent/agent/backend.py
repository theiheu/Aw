import threading
import time
import logging
from dataclasses import dataclass
from typing import Any, Optional
from queue import Queue, Empty
from datetime import datetime, timezone

import requests

log = logging.getLogger(__name__)


@dataclass
class BackendConfig:
    base_url: str
    events_endpoint: str
    enabled: bool
    min_interval_ms: int
    delta_threshold: float
    api_key: str = ""


class BackendPusher:
    def __init__(self, cfg: BackendConfig, machine_id: str) -> None:
        self.cfg = cfg
        self.machine_id = machine_id
        self._q: "Queue[dict[str, Any]]" = Queue(maxsize=1000)
        self._stop = threading.Event()
        self._thread: Optional[threading.Thread] = None
        self._session = requests.Session()
        # Throttle state for readings
        self._last_reading_sent_at: float = 0.0
        self._last_reading_value: Optional[float] = None

    def start(self) -> None:
        if not self.cfg.enabled:
            return
        if self._thread and self._thread.is_alive():
            return
        self._stop.clear()
        self._thread = threading.Thread(target=self._run, name="BackendPusher", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        if not self.cfg.enabled:
            return
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=3)
        try:
            self._session.close()
        except Exception:
            pass

    # Public API
    def push_reading(self, value: float) -> None:
        if not self.cfg.enabled:
            return
        # Throttle
        now = time.time()
        dt_ms = (now - self._last_reading_sent_at) * 1000.0
        if self._last_reading_value is not None:
            if abs(value - self._last_reading_value) < self.cfg.delta_threshold:
                if dt_ms < self.cfg.min_interval_ms:
                    return
        if dt_ms < (self.cfg.min_interval_ms * 0.5):
            # prevent spamming even when value jumps a bit
            return
        self._last_reading_sent_at = now
        self._last_reading_value = value
        self._enqueue({
            "type": "reading",
            "weight": value,
        })

    def push_status(self, status: str) -> None:
        if not self.cfg.enabled:
            return
        self._enqueue({
            "type": "status",
            "status": status,
        })

    def push_print(self, result: str) -> None:
        if not self.cfg.enabled:
            return
        self._enqueue({
            "type": "print",
            "result": result,
        })

    # Internal
    def _enqueue(self, payload: dict[str, Any]) -> None:
        evt = {
            **payload,
            "machineId": self.machine_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "attempt": 0,
        }
        try:
            self._q.put_nowait(evt)
        except Exception:
            # drop if queue full
            log.warning("Backend queue full; dropping event: %s", payload.get("type"))

    def _run(self) -> None:
        url = self._events_url()
        backoff_schedule = [1, 2, 5, 10]
        while not self._stop.is_set():
            try:
                evt = self._q.get(timeout=0.5)
            except Empty:
                continue
            evt_type = evt.get("type")
            try:
                self._post_event(url, evt)
            except Exception as e:
                attempt = int(evt.get("attempt", 0)) + 1
                if attempt <= len(backoff_schedule):
                    evt["attempt"] = attempt
                    delay = backoff_schedule[attempt - 1]
                    log.warning("Backend push failed (type=%s): %s; retry in %ss", evt_type, e, delay)
                    # Re-enqueue after delay
                    self._delayed_requeue(evt, delay)
                else:
                    log.error("Backend push dropped after retries (type=%s)", evt_type)
            finally:
                self._q.task_done()

    def _delayed_requeue(self, evt: dict[str, Any], delay: float) -> None:
        def put_later():
            if self._stop.wait(timeout=delay):
                return
            try:
                self._q.put_nowait(evt)
            except Exception:
                pass
        t = threading.Thread(target=put_later, name="BackendRequeue", daemon=True)
        t.start()

    def _events_url(self) -> str:
        base = self.cfg.base_url.rstrip("/")
        ep = self.cfg.events_endpoint
        if not ep.startswith("/"):
            ep = "/" + ep
        return base + ep

    def _post_event(self, url: str, evt: dict[str, Any]) -> None:
        headers = {"Content-Type": "application/json"}
        # Optional API key (prefer config, fallback to env)
        import os
        api_key = self.cfg.api_key or os.environ.get("AGENT_API_KEY", "")
        if api_key:
            headers["X-API-Key"] = api_key
        resp = self._session.post(url, json=evt, headers=headers, timeout=10)
        resp.raise_for_status()

