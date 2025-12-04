# Weigh Agent (Optimized)

Headless agent to read weight from a serial-connected scale and publish stable readings to MQTT reliably.

Features:
- Auto-detect serial port (Windows COMx / Linux /dev/ttyUSB*, /dev/ttyACM*)
- Robust serial reconnection with backoff
- Moving Average + optional Kalman filter + outlier rejection
- Stability detection window before publish
- MQTT with QoS=1, LWT, offline buffer (persisted), reconnect backoff
- Heartbeat and HTTP health endpoint (/health)
- JSON logging with rotation

## Directory
- weigh_agent_optimized.py: main agent
- config.json: runtime configuration (can be overridden by env)
- config_template.json: template to start from
- requirements.txt: dependencies
- Dockerfile: container image
- logs/, buffer/: runtime directories (auto-created)

## Configuration
Edit `config.json` or set environment variables. Key options:

- Serial
  - serialPort: "auto" | "COM3" | "/dev/ttyUSB0"
  - baudrate, bytesize, parity (N/E/O/M/S), stopbits
- MQTT
  - mqttHost, mqttPort, mqttUsername, mqttPassword
  - mqttQos (1 recommended), mqttRetain (false recommended)
- Filters
  - maWindow, enableKalman, kalmanR, kalmanQ
  - deltaOutlierKg (reject spikes), zeroThreshold
- Stability
  - stabilityWindow, stabilityThreshold, stabilityMinDurationMs
- Parsing
  - frameRegex (default matches +ddddddddB), parseDivisor
- Health & logging
  - heartbeatIntervalSec, staleDataSec, healthPort
  - logLevel (INFO/DEBUG), logJson, logFile

Environment variable overrides (examples):
```
WA_MACHINE_ID=weigh1
WA_SERIAL_PORT=auto
WA_MQTT_HOST=localhost
WA_MQTT_PORT=1883
WA_MQTT_USERNAME=weighuser
WA_MQTT_PASSWORD=weighpass123
WA_MQTT_QOS=1
WA_FAKE_MODE=false
```

## Run natively (Python)
Requirements: Python 3.10+, pip

```
pip install -r requirements.txt
python weigh_agent_optimized.py
```

On Linux, if you cannot access the serial device:
```
sudo usermod -a -G dialout $USER
# then log out & log back in
```

## Run with Docker (standalone)
```
docker build -t weigh-agent:latest .
docker run --rm -it \
  --name weigh-agent \
  --device /dev/ttyUSB0:/dev/ttyUSB0 \
  --env WA_MQTT_HOST=127.0.0.1 \
  --env WA_MQTT_PORT=1883 \
  --env WA_MQTT_USERNAME=weighuser \
  --env WA_MQTT_PASSWORD=weighpass123 \
  --env WA_SERIAL_PORT=auto \
  -v $(pwd)/config.json:/app/config.json \
  -v $(pwd)/logs:/app/logs \
  -v $(pwd)/buffer:/app/buffer \
  weigh-agent:latest
```
Note: Map the correct device. If your scale appears as /dev/ttyACM0, map that instead. On Windows, Docker Desktop does not forward serial ports by default; prefer running natively or via WSL2 with serial exposed.

## Integrate with existing docker-compose (weighing-frontend)
This repository already includes a service `weigh-agent` in `weighing-frontend/docker-compose.yml`:
- Builds from `../weigh-agent/Dockerfile`
- Depends on `mqtt`
- Healthcheck on http://localhost:8787/health
- Volumes for `config.json`, `logs`, `buffer`
- Devices mapped for `/dev/ttyUSB0` and `/dev/ttyACM0`

Usage from the frontend compose root:
```
cd weighing-frontend
docker compose up -d --build weigh-agent mqtt backend web
```

If your device path differs, edit the compose service devices accordingly.

## Topics
- Publish: `weigh/{machineId}/reading`
  - { machineId, weight, unit:"kg", raw, timestamp }
- Status: `weigh/{machineId}/status`
  - ONLINE heartbeat (retain), OFFLINE on stop/LWT

## Tuning for accuracy
- Keep mqttQos=1, mqttRetain=false for readings
- Raise stabilityWindow and stabilityMinDurationMs for more stability (slower)
- Adjust zeroThreshold depending on your scale idle noise
- Use Kalman only if readings fluctuate too much after MA filter

## Troubleshooting
- No device detected: set WA_SERIAL_PORT to the exact path/COM
- Permission denied (Linux): add user to dialout group
- No readings: check parse frame with WA_FRAME_REGEX and WA_PARSE_DIVISOR
- MQTT offline: agent buffers readings and will resend when broker is back

