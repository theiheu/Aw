import re
import threading
import time
import random
import logging
from typing import Callable, Optional

try:
    import serial  # type: ignore
    from serial.tools import list_ports  # type: ignore
except Exception:  # pragma: no cover
    serial = None
    list_ports = None

log = logging.getLogger(__name__)


# Helpers to map config values to pyserial constants
_DEF_PARITY = {
    "N": getattr(serial, "PARITY_NONE", "N") if serial else "N",
    "E": getattr(serial, "PARITY_EVEN", "E") if serial else "E",
    "O": getattr(serial, "PARITY_ODD", "O") if serial else "O",
    "M": getattr(serial, "PARITY_MARK", "M") if serial else "M",
    "S": getattr(serial, "PARITY_SPACE", "S") if serial else "S",
}
_DEF_BYTESIZE = {
    5: getattr(serial, "FIVEBITS", 5) if serial else 5,
    6: getattr(serial, "SIXBITS", 6) if serial else 6,
    7: getattr(serial, "SEVENBITS", 7) if serial else 7,
    8: getattr(serial, "EIGHTBITS", 8) if serial else 8,
}
_DEF_STOPBITS = {
    1: getattr(serial, "STOPBITS_ONE", 1) if serial else 1,
    2: getattr(serial, "STOPBITS_TWO", 2) if serial else 2,
}


def _decode_escapes(s: str) -> bytes:
    try:
        return s.encode('utf-8').decode('unicode_escape').encode('latin1', errors='ignore')
    except Exception:
        return s.encode('utf-8', errors='ignore')


class ScaleReader:
    def __init__(
        self,
        port: str,
        baudrate: int = 9600,
        encoding: str = "ascii",
        regex: str = r"(?P<weight>[+-]?\d+(?:\.\d+)?)",
        decimals: int = 0,
        simulate: bool = False,
        interval_ms: int = 300,
        on_weight: Optional[Callable[[float], None]] = None,
        # Fake parameters
        fake_mode: str = "sine",
        fake_min: float = 1000.0,
        fake_max: float = 30000.0,
        fake_hz: float = 0.2,
        fake_noise: float = 5.0,
        fake_step: float = 250.0,
        fake_manual_weight: float = 1234.0,
        # Serial advanced
        bytesize: int = 8,
        parity: str = "N",
        stopbits: int = 1,
        xonxoff: bool = False,
        rtscts: bool = False,
        dsrdtr: bool = False,
        dtr_on_open: bool = False,
        rts_on_open: bool = False,
        # Polling
        poll_command: str = "",
        poll_interval_ms: int = 0,
    ) -> None:
        self.port = port
        self.baudrate = baudrate
        self.encoding = encoding
        self.pattern = re.compile(regex)
        self.decimals = decimals
        self.simulate = simulate
        self.interval_ms = interval_ms
        self.on_weight = on_weight

        # Fake config
        self.fake_mode = fake_mode
        self.fake_min = fake_min
        self.fake_max = fake_max
        self.fake_hz = fake_hz
        self.fake_noise = fake_noise
        self.fake_step = fake_step
        self._fake_manual_weight = fake_manual_weight

        # Serial advanced
        self.bytesize = bytesize
        self.parity = parity.upper() if isinstance(parity, str) else parity
        self.stopbits = stopbits
        self.xonxoff = xonxoff
        self.rtscts = rtscts
        self.dsrdtr = dsrdtr
        self.dtr_on_open = dtr_on_open
        self.rts_on_open = rts_on_open

        # Polling
        self.poll_interval_ms = max(0, int(poll_interval_ms))
        self._poll_bytes = _decode_escapes(poll_command) if poll_command else b""
        self._last_poll = 0.0

        self._stop = threading.Event()
        self._thread: Optional[threading.Thread] = None
        self._ser = None
        self._lock = threading.Lock()

    @staticmethod
    def list_serial_ports() -> list[str]:
        ports: list[str] = []
        if list_ports:
            ports = [p.device for p in list_ports.comports()]
        else:
            ports = [
                "COM1","COM2","COM3","COM4","/dev/ttyUSB0","/dev/ttyUSB1","/dev/ttyS0","/dev/ttyS1",
            ]
        return ports

    def set_manual_weight(self, value: float) -> None:
        with self._lock:
            self._fake_manual_weight = float(value)

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop.clear()
        self._thread = threading.Thread(target=self._run, name="ScaleReader", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=2)
        if self._ser:
            try:
                self._ser.close()
            except Exception:
                pass

    def _emit(self, w: float) -> None:
        if self.on_weight:
            try:
                self.on_weight(round(w, self.decimals))
            except Exception:
                pass

    def _run(self) -> None:
        if self.simulate:
            log.info("ScaleReader running in SIMULATE mode (%s)", self.fake_mode)
            self._run_sim()
            return
        log.info("ScaleReader running in SERIAL mode on port %s @ %d", self.port, self.baudrate)
        self._run_serial()

    def _run_sim(self) -> None:
        t0 = time.time()
        value = self.fake_min
        period = 1.0 / self.fake_hz if self.fake_hz > 0 else 5.0
        while not self._stop.is_set():
            now = time.time()
            t = now - t0
            w = self._fake_value(t, period, value)
            self._emit(w)
            if self.fake_mode == "step":
                value += self.fake_step
                if value >= self.fake_max:
                    value = self.fake_min
            time.sleep(self.interval_ms / 1000.0)

    def _fake_value(self, t: float, period: float, step_state: float) -> float:
        fmin, fmax = self.fake_min, self.fake_max
        noise = random.uniform(-self.fake_noise, self.fake_noise) if self.fake_noise > 0 else 0.0
        if self.fake_mode == "random":
            base = random.uniform(fmin, fmax)
        elif self.fake_mode == "sine":
            mid = (fmin + fmax) / 2.0
            amp = (fmax - fmin) / 2.0
            base = mid + amp * math_sin(tau() * (1.0 / period) * t)
        elif self.fake_mode == "saw":
            if period <= 0:
                period = 5.0
            phase = (t % period) / period
            base = fmin + phase * (fmax - fmin)
        elif self.fake_mode == "step":
            base = max(fmin, min(step_state, fmax))
        elif self.fake_mode == "manual":
            with self._lock:
                base = self._fake_manual_weight
        else:
            mid = (fmin + fmax) / 2.0
            amp = (fmax - fmin) / 2.0
            base = mid + amp * math_sin(tau() * (1.0 / period) * t)
        return base + noise

    def _open_serial(self):
        if serial is None:
            raise RuntimeError("pyserial not available")
        ser = serial.Serial(
            self.port,
            self.baudrate,
            timeout=1,
            bytesize=_DEF_BYTESIZE.get(self.bytesize, _DEF_BYTESIZE[8]),
            parity=_DEF_PARITY.get(self.parity, _DEF_PARITY["N"]),
            stopbits=_DEF_STOPBITS.get(self.stopbits, _DEF_STOPBITS[1]),
            xonxoff=self.xonxoff,
            rtscts=self.rtscts,
            dsrdtr=self.dsrdtr,
        )
        # Set DTR/RTS lines if requested
        try:
            if self.dtr_on_open and hasattr(ser, "setDTR"):
                ser.setDTR(True)
            if self.rts_on_open and hasattr(ser, "setRTS"):
                ser.setRTS(True)
        except Exception:
            pass
        return ser

    def _run_serial(self) -> None:
        if serial is None:
            log.error("pyserial is not available. Install pyserial to read real scale.")
            while not self._stop.is_set():
                time.sleep(1.0)
            return

        while not self._stop.is_set():
            try:
                self._ser = self._open_serial()
                log.info("Opened serial port %s @ %d", self.port, self.baudrate)
                break
            except Exception as e:
                log.error("Failed to open serial port %s: %s", self.port, e)
                time.sleep(2.0)

        if self._ser is None:
            return

        buff = bytearray()
        while not self._stop.is_set():
            try:
                # Optional poll
                if self._poll_bytes and self.poll_interval_ms > 0:
                    now = time.time()
                    if (now - self._last_poll) * 1000.0 >= self.poll_interval_ms:
                        try:
                            self._ser.write(self._poll_bytes)
                        except Exception:
                            pass
                        self._last_poll = now

                chunk = self._ser.read(self._ser.in_waiting or 1)
                if not chunk:
                    continue
                buff += chunk

                if len(buff) > 4096:
                    buff = buff[-2048:]

                # STX/ETX framing
                processed = False
                while True:
                    stx = buff.find(b"\x02")
                    if stx == -1:
                        break
                    etx = buff.find(b"\x03", stx + 1)
                    if etx == -1:
                        if stx > 0:
                            del buff[:stx]
                        break
                    frame = bytes(buff[stx + 1 : etx])
                    del buff[: etx + 1]
                    text = frame.decode(self.encoding, errors="ignore")
                    m = self.pattern.search(text)
                    if m:
                        try:
                            w = float(m.group("weight"))
                            self._emit(w)
                        except Exception:
                            pass
                    processed = True
                if processed:
                    continue

                # Newline-delimited fallback
                nl = max(buff.find(b"\n"), buff.find(b"\r"))
                if nl != -1:
                    line = bytes(buff[:nl])
                    del buff[: nl + 1]
                    try:
                        text = line.decode(self.encoding, errors="ignore")
                    except Exception:
                        text = ""
                    m = self.pattern.search(text)
                    if m:
                        try:
                            w = float(m.group("weight"))
                            self._emit(w)
                        except Exception:
                            pass
            except Exception as e:
                log.debug("Serial read error: %s", e)
                time.sleep(0.2)


def math_sin(x: float) -> float:
    import math
    return math.sin(x)


def tau() -> float:
    return 6.283185307179586
