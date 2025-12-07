# Windows Printing Agent

Node.js service for Windows that reads scale data via serial port and manages print jobs from the central MQTT broker.

## Architecture

```
┌──────────────────────────────────────────────────┐
│ Windows PC (Weighing Station)                    │
├──────────────────────────────────────────────────┤
│ • Serial Port (COM3) ← Scale sensor              │
│ • MQTT Client ← Print jobs from server           │
│ • Printer Driver ← Print receipts                │
│ • Node.js Service (runs as Windows Service)      │
└──────────────────────────────────────────────────┘
```

## Prerequisites

- **Node.js 18+** (LTS recommended)
- **Windows 7+** (for service installation)
- **Serial port device** (scale sensor)
- **Network printer** or local printer
- **Network connectivity** to server (LAN)

## Installation

### 1. Clone & Install Dependencies

```bash
cd agent-windows-main
npm install
```

### 2. Configure Environment

Copy `.env` and update with your settings:

```bash
# .env
MQTT_HOST=192.168.1.100        # Server IP
MQTT_PORT=1883
MQTT_USERNAME=weighuser
MQTT_PASSWORD=weighpass123

MACHINE_ID=weigh1              # Unique machine identifier
MACHINE_NAME=Weighing Station 1

COM_PORT=COM3                  # Serial port for scale
COM_BAUDRATE=9600

PRINTER_NAME=Generic Printer   # Windows printer name
LOG_LEVEL=info
```

### 3. Test Connection

```bash
# Test MQTT connection
npm run test:mqtt

# Test serial port
npm run test:serial

# Test printer
npm run test:printer
```

### 4. Install as Windows Service

```bash
# Run as Administrator
npm run service:install

# Verify installation
npm run service:status

# Start service
npm run service:start
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MQTT_HOST` | localhost | Server IP address |
| `MQTT_PORT` | 1883 | MQTT TCP port |
| `MQTT_USERNAME` | weighuser | MQTT username |
| `MQTT_PASSWORD` | weighpass123 | MQTT password |
| `MQTT_BASE_TOPIC` | weigh | MQTT topic prefix |
| `MACHINE_ID` | weigh1 | Unique machine ID |
| `MACHINE_NAME` | Station 1 | Display name |
| `COM_PORT` | COM3 | Serial port |
| `COM_BAUDRATE` | 9600 | Serial baud rate |
| `PRINTER_NAME` | Generic | Printer name |
| `LOG_LEVEL` | info | Log verbosity |
| `LOG_DIR` | %PROGRAMDATA%\WeighingAgent\logs | Log directory |

### Finding Your Serial Port

```bash
# List available COM ports
npm run list:ports

# Output example:
# COM1 - Arduino Uno
# COM3 - USB Serial Device
# COM4 - Printer
```

### Finding Your Printer Name

```bash
# List available printers
npm run list:printers

# Output example:
# Generic Printer
# HP LaserJet Pro
# Microsoft Print to PDF
```

## Usage

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

### Service Management (Windows)

```bash
# Install service
npm run service:install

# Start service
npm run service:start

# Stop service
npm run service:stop

# Uninstall service
npm run service:uninstall

# View service status
npm run service:status

# View service logs
npm run service:logs
```

## MQTT Topics

### Subscribed Topics (Agent reads)
```
weigh/weigh1/print/jobs       # Print job requests
weigh/weigh1/scale/#          # Scale readings (for status)
```

### Published Topics (Agent writes)
```
weigh/weigh1/print/acks       # Print job acknowledgments
weigh/weigh1/status           # Machine status (online/offline)
weigh/weigh1/scale/sensor1    # Scale readings (optional)
```

## Print Job Flow

1. **Backend** publishes print job to `weigh/weigh1/print/jobs`
   ```json
   {
     "jobId": "job-12345",
     "pdfUrl": "http://server/api/print/job-12345.pdf",
     "copies": 1,
     "timestamp": "2025-12-06T16:00:00Z"
   }
   ```

2. **Agent** receives job, downloads PDF, prints it

3. **Agent** publishes acknowledgment to `weigh/weigh1/print/acks`
   ```json
   {
     "jobId": "job-12345",
     "status": "success",
     "timestamp": "2025-12-06T16:00:05Z"
   }
   ```

## Logging

Logs are stored in: `%PROGRAMDATA%\WeighingAgent\logs\`

### Log Files
- `agent.log` - Main application log
- `mqtt.log` - MQTT connection events
- `print.log` - Print job history
- `serial.log` - Serial port debug

### View Logs

```bash
# Real-time logs (development)
npm run dev

# View service logs (production)
npm run service:logs

# Tail logs file
Get-Content "C:\ProgramData\WeighingAgent\logs\agent.log" -Tail 50 -Wait
```

## Troubleshooting

### MQTT Connection Failed

```bash
# Check network connectivity
ping 192.168.1.100

# Test MQTT connection
npm run test:mqtt

# Check .env file
cat .env | findstr MQTT
```

**Solution:**
- Verify `MQTT_HOST` is correct
- Check firewall allows port 1883
- Verify username/password in `.env`

### Serial Port Not Found

```bash
# List available ports
npm run list:ports

# Check Device Manager (Windows)
# Devices and Printers → Ports (COM & LPT)
```

**Solution:**
- Verify scale is connected
- Check USB driver is installed
- Update `COM_PORT` in `.env`

### Print Job Fails

```bash
# Check printer name
npm run list:printers

# Test printer
npm run test:printer

# View print logs
Get-Content "C:\ProgramData\WeighingAgent\logs\print.log" -Tail 20
```

**Solution:**
- Verify printer is online
- Check printer name matches `PRINTER_NAME`
- Ensure printer driver is installed

### Service Won't Start

```bash
# Check service status
npm run service:status

# View service logs
npm run service:logs

# Reinstall service
npm run service:uninstall
npm run service:install
npm run service:start
```

**Solution:**
- Run as Administrator
- Check .env file exists and is valid
- Verify Node.js is installed: `node --version`

## Development

### Project Structure

```
agent-windows-main/
├── src/
│   ├── index.js              # Main entry point
│   ├── mqtt.js               # MQTT client
│   ├── serial.js             # Serial port handler
│   ├── printer.js            # Print job handler
│   └── logger.js             # Logging utility
├── .env                       # Configuration (git-ignored)
├── package.json
└── README.md
```

### Scripts

```bash
npm run dev              # Development mode with auto-reload
npm start               # Production mode
npm run test:mqtt       # Test MQTT connection
npm run test:serial     # Test serial port
npm run test:printer    # Test printer
npm run list:ports      # List COM ports
npm run list:printers   # List printers
npm run service:install # Install Windows service
npm run service:start   # Start service
npm run service:stop    # Stop service
npm run service:logs    # View service logs
```

## Performance & Reliability

### Idempotency
- Agent maintains in-memory cache of last 6 hours of print jobs
- Prevents duplicate printing after restart
- Optional SQLite persistence for long-term tracking

### Retry Logic
- Automatic retry on MQTT connection loss
- Exponential backoff (5s, 10s, 20s, ...)
- Max 5 retry attempts before alert

### Logging
- Rotating log files (max 10MB per file)
- Automatic cleanup of logs older than 30 days
- Structured logging for easy parsing

## Security

- **No hardcoded credentials** - Use `.env` file
- **MQTT authentication** - Username/password required
- **Local printer access** - No network exposure
- **Logs sanitized** - No sensitive data in logs

## Support

For issues:
1. Check logs: `npm run service:logs`
2. Verify `.env` configuration
3. Test connectivity: `npm run test:mqtt`
4. Review error messages in logs

---

**Last Updated:** 2025-12-06
**Version:** 1.0
**Node.js:** 18+ required
