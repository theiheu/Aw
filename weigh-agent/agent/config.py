import json
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Optional


DEFAULT_CONFIG_PATH = Path(__file__).resolve().parent.parent / "config.json"


@dataclass
class AgentConfig:
    machineId: str = "weigh1"
    mqttHost: str = "127.0.0.1"
    mqttPort: int = 1883
    mqttUsername: str = ""
    mqttPassword: str = ""
    printSecret: str = "change-me-strong-secret"
    serialPort: str = "COM3"
    baudRate: int = 9600
    serialEncoding: str = "ascii"
    serialRegex: str = r"(?P<weight>[+-]?\d+(?:\.\d+)?)"
    decimals: int = 0
    simulateScale: bool = False
    # Fake scale parameters
    fakeMode: str = "sine"  # sine | random | saw | step | manual
    fakeMin: float = 1000.0
    fakeMax: float = 30000.0
    fakeHz: float = 0.2
    fakeNoise: float = 5.0
    fakeStep: float = 250.0
    fakeManualWeight: float = 1234.0

    # Printing
    printerName: str = ""
    sumatraPath: str = ""  # Windows optional SumatraPDF.exe path for reliable CLI printing

    # Backend
    backendUrl: str = ""
    backendEventsEndpoint: str = "/api/events"
    backendEnabled: bool = False
    backendMinIntervalMs: int = 500
    backendDeltaThreshold: float = 5.0
    backendApiKey: str = ""

    # Publish/base
    publishIntervalMs: int = 300
    logLevel: str = "INFO"

    # Filtering / transform
    filterMinDelta: float = 5.0
    filterThrottleMs: int = 300
    filterMedianWindow: int = 5
    scaleFactor: float = 1.0
    scaleOffset: float = 0.0

    # Stability detection
    stableWindow: int = 5
    stableDeltaMax: float = 2.0
    stableStdMax: float = 0.5
    onlyPrintWhenStable: bool = False

    # Reading JSON / heartbeat / retain
    readingJsonEnabled: bool = True
    retainLastReading: bool = False
    statusHeartbeatSec: int = 30

    # MQTT QoS/retain
    readingQos: int = 0
    statusQos: int = 1
    retainStatus: bool = False

    # Serial advanced
    bytesize: int = 8  # 5,6,7,8
    parity: str = "N"  # N,E,O,M,S
    stopbits: int = 1  # 1 or 2
    xonxoff: bool = False
    rtscts: bool = False
    dsrdtr: bool = False
    dtrOnOpen: bool = False
    rtsOnOpen: bool = False

    # Poll command
    pollCommand: str = ""   # e.g. "SI\r\n" ; supports \r \n escapes
    pollIntervalMs: int = 0  # 0 = disabled

    @staticmethod
    def load(path: Optional[Path] = None) -> "AgentConfig":
        p = path or DEFAULT_CONFIG_PATH
        if not p.exists():
            return AgentConfig()
        data = json.loads(p.read_text(encoding="utf-8"))
        # Merge with defaults
        cfg = AgentConfig()
        for k, v in data.items():
            if hasattr(cfg, k):
                setattr(cfg, k, v)
        return cfg

    def save(self, path: Optional[Path] = None) -> None:
        p = path or DEFAULT_CONFIG_PATH
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(json.dumps(asdict(self), indent=2, ensure_ascii=False), encoding="utf-8")
