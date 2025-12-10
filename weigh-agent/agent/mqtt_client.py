import json
import socket
import threading
import time
import logging
from dataclasses import dataclass
from typing import Callable, Optional

import random

try:
    import paho.mqtt.client as mqtt  # type: ignore
except Exception:  # pragma: no cover
    mqtt = None


log = logging.getLogger(__name__)


@dataclass
class MqttTopics:
    base: str
    reading: str
    reading_json: str
    status: str
    print: str

    @staticmethod
    def for_machine(machine_id: str) -> "MqttTopics":
        base = f"weigh/{machine_id}"
        return MqttTopics(
            base=base,
            reading=f"{base}/reading",
            reading_json=f"{base}/reading_json",
            status=f"{base}/status",
            print=f"{base}/print",
        )


class MqttClient:
    def __init__(
        self,
        host: str,
        port: int,
        machine_id: str,
        username: str = "",
        password: str = "",
        on_print: Optional[Callable[[dict], None]] = None,
    ) -> None:
        self.host = host
        self.port = port
        self.machine_id = machine_id
        self.username = username
        self.password = password
        self.on_print = on_print
        self.topics = MqttTopics.for_machine(machine_id)

        self._client: Optional["mqtt.Client"] = None if mqtt else None
        self._connected = False
        self._thread: Optional[threading.Thread] = None
        self._stop = threading.Event()

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop.clear()
        self._thread = threading.Thread(target=self._run, name="MqttClient", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        try:
            if self._client:
                self._client.loop_stop()
                self._client.disconnect()
        except Exception:
            pass
        if self._thread:
            self._thread.join(timeout=2)

    def publish_status(self, status: str, qos: int = 1, retain: bool = False) -> None:
        self._publish(self.topics.status, status, retain=retain, qos=qos)

    def publish_reading(self, value: float, retain: bool = False, qos: int = 0) -> None:
        payload = ("%f" % value).rstrip("0").rstrip(".")
        self._publish(self.topics.reading, payload, retain=retain, qos=qos)

    def publish_reading_json(self, obj: dict, retain: bool = False, qos: int = 0) -> None:
        try:
            payload = json.dumps(obj, separators=(",", ":"))
        except Exception:
            payload = "{}"
        self._publish(self.topics.reading_json, payload, retain=retain, qos=qos)

    def _publish(self, topic: str, payload: str, retain: bool = False, qos: int = 0) -> None:
        try:
            if self._client and self._connected:
                self._client.publish(topic, payload=payload, qos=qos, retain=retain)
        except Exception as e:
            log.debug("Publish failed: %s", e)

    # Internal
    def _run(self) -> None:
        if mqtt is None:
            log.warning("paho-mqtt not available; MQTT disabled")
            return
        client_id = f"weigh-agent-{self.machine_id}-{socket.gethostname()}-{random.randint(1000,9999)}"

        # Create a client compatible with paho-mqtt v2 and v1
        c = None
        try:
            cbv = getattr(mqtt, "CallbackAPIVersion", None)
            if cbv is not None:
                # Try multiple enum member names across versions
                v1 = getattr(cbv, "V1", None) or getattr(cbv, "V311", None) or getattr(cbv, "VERSION1", None)
                if v1 is not None:
                    c = mqtt.Client(client_id=client_id, protocol=mqtt.MQTTv311, transport="tcp", callback_api_version=v1)
            if c is None:
                # Fallback: no callback_api_version param
                c = mqtt.Client(client_id=client_id, protocol=mqtt.MQTTv311, transport="tcp")
        except TypeError:
            # Older API signature
            c = mqtt.Client(client_id=client_id, clean_session=True)

        # Last Will
        try:
            c.will_set(self.topics.status, payload="OFFLINE", qos=1, retain=False)
        except Exception:
            pass

        if self.username:
            try:
                c.username_pw_set(self.username, self.password)
            except Exception:
                pass

        def on_connect(client, userdata, flags, rc):  # type: ignore
            ok = rc == 0
            self._connected = ok
            if ok:
                log.info("MQTT connected (%s:%s)", self.host, self.port)
                try:
                    client.subscribe(self.topics.print, qos=1)
                    # do not publish here; agent will publish status from app
                except Exception as e:
                    log.error("Subscribe failed: %s", e)
            else:
                log.error("MQTT connect failed rc=%s", rc)

        def on_disconnect(client, userdata, rc):  # type: ignore
            self._connected = False
            log.warning("MQTT disconnected rc=%s", rc)

        def on_message(client, userdata, msg):  # type: ignore
            if msg.topic == self.topics.print:
                try:
                    payload = msg.payload.decode("utf-8", errors="ignore")
                    data = json.loads(payload)
                except Exception:
                    data = {"raw": msg.payload}
                if self.on_print:
                    try:
                        self.on_print(data)
                    except Exception as e:
                        log.exception("on_print handler error: %s", e)

        c.on_connect = on_connect
        c.on_disconnect = on_disconnect
        c.on_message = on_message

        while not self._stop.is_set():
            try:
                log.info("Connecting to MQTT %s:%s ...", self.host, self.port)
                c.connect(self.host, self.port, keepalive=30)
                c.loop_start()
                self._client = c
                # Wait until stopped
                while not self._stop.is_set():
                    time.sleep(0.5)
                break
            except Exception as e:
                log.error("MQTT connection error: %s", e)
                time.sleep(2)
