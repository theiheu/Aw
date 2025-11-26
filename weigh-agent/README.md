# Weigh Agent - Truck Weighing Station

A robust Windows-based agent that reads weight data from a COM port connected to a truck weighing scale and publishes the data to an MQTT broker. It also handles printing of weighing tickets.

## Features

✅ **Serial Port Reading** - Reads weight data from COM port with configurable parameters
✅ **MQTT Publishing** - Publishes weight readings to MQTT broker in real-time
✅ **Ticket Printing** - Prints weighing tickets to Windows printers
✅ **Windows Service** - Can run as a Windows service for automatic startup
✅ **Error Handling** - Robust error handling with automatic reconnection
✅ **Configuration Management** - Flexible configuration via JSON file or environment variables
✅ **Logging** - Comprehensive logging to file and console
✅ **Health Monitoring** - Status tracking and health checks
✅ **Docker Support** - Windows container support for deployment

## Quick Start

### 1. Install Python

Download and install Python 3.8+ from [python.org](https://www.python.org/downloads/)

### 2. Clone Repository

```bash
cd C:\path\to\weigh-agent
```

### 3. Create Virtual Environment

```bash
python -m venv .venv
.venv\Scripts\activate
```

### 4. Install Dependencies

```bash
pip install -r requirements.txt
```

### 5. Configure

Edit `config.json` with your settings:

```json
{
  "machineId": "weigh1",
  "serial": {
    "port": "COM3",
    "baudrate": 9600
  },
  "mqtt": {
    "host": "192.168.1.10",
    "port": 1883,
    "username": "weighuser",
    "password": "weighpass123"
  }
}
```

### 6. Run

```bash
python agent.py
```

## Installation as Windows Service

### Install

```bash
.venv\Scripts\activate
python service_wrapper.py install
```

### Start

```bash
python service_wrapper.py start
```

### Stop

```bash
python service_wrapper.py stop
```

### Remove

```bash
python service_wrapper.py remove
```

## Configuration

### config.json

```json
{
  "machineId": "weigh1",
  "serial": {
    "port": "COM3",
    "baudrate": 9600,
    "bytesize": 7,
    "parity": "E",
    "stopbits": 1,
    "timeout": 1
  },
  "mqtt": {
    "host": "192.168.1.10",
    "port": 1883,
    "username": "weighuser",
    "password": "weighpass123",
    "base_topic": "weigh/1",
    "keepalive": 60
  },
  "print": {
    "enabled": true,
    "printer_name": "MAY_IN_CAN"
  },
  "logging": {
    "level": "INFO",
    "file": "weigh_agent.log"
  }
}
```

### Environment Variables

Override config.json with environment variables:

```bash
set MACHINE_ID=weigh1
set SERIAL_PORT=COM3
set MQTT_HOST=192.168.1.10
set MQTT_USER=weighuser
set MQTT_PASSWORD=weighpass123
```

## MQTT Topics

### Published

- **`weigh/{machineId}/reading`** - Current weight reading
- **`weigh/{machineId}/response`** - Response to weigh request

### Subscribed

- **`weigh/{machineId}/request`** - Request for current weight
- **`weigh/{machineId}/print`** - Print ticket request

## Troubleshooting

### Serial Port Connection

```bash
# List available COM ports
python -c "import serial.tools.list_ports; print([p.device for p in serial.tools.list_ports.comports()])"
```

### MQTT Connection

```bash
# Test MQTT broker
python -c "import paho.mqtt.client as mqtt; client = mqtt.Client(); client.connect('192.168.1.10', 1883); print('Connected')"
```

### View Logs

```bash
type logs\weigh_agent.log
```

## Testing

Run unit tests:

```bash
python test_agent.py
```

## Docker

### Build Windows Image

```bash
docker build -f Dockerfile.windows -t weigh-agent:windows .
```

### Run with Docker Compose

```bash
docker-compose -f docker-compose.windows.yml up -d
```

## Documentation

- [SETUP_GUIDE.md](SETUP_GUIDE.md) - Detailed setup and configuration guide
- [config.json](config.json) - Configuration file example

## File Structure

```
weigh-agent/
├── agent.py                    # Main agent application
├── service_wrapper.py          # Windows service wrapper
├── config.json                 # Configuration file
├── requirements.txt            # Python dependencies
├── test_agent.py              # Unit tests
├── Dockerfile.windows         # Windows container image
├── docker-compose.windows.yml # Docker Compose configuration
├── SETUP_GUIDE.md            # Detailed setup guide
└── README.md                 # This file
```

## Requirements

- Python 3.8+
- Windows 10/11 or Windows Server 2016+
- COM port connected to weighing scale
- Network connection to MQTT broker
- Printer (optional)

## Dependencies

- `pyserial==3.5` - Serial port communication
- `paho-mqtt==1.6.1` - MQTT client
- `pywin32==306` - Windows API access
- `python-dotenv==1.0.0` - Environment variable management

## Architecture

```
┌─────────────────────────────────────────────────┐
│         Truck Weighing Station Agent            │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────────┐      ┌──────────────┐        │
│  │ Serial Port  │      │ MQTT Client  │        │
│  │  (Scale)     │      │  (Broker)    │        │
│  └──────────────┘      └──────────────┘        │
│         ▲                      ▲                │
│         │                      │                │
│  ┌──────┴──────────────────────┴─────┐         │
│  │   Weight Reading Processor        │         │
│  │   - Parse weight data             │         │
│  │   - Detect stability              │         │
│  │   - Publish to MQTT               │         │
│  └──────┬──────────────────────────┬─┘         │
│         │                          │            │
│  ┌──────▼──────┐          ┌───────▼────┐      │
│  │   Printer   │          │   Logger   │      │
│  │  (Tickets)  │          │   (Logs)   │      │
│  └─────────────┘          └────────────┘      │
│                                                 │
└─────────────────────────────────────────────────┘
```

## Performance

- **Serial Port**: Up to 115200 baud
- **MQTT**: QoS 0-2 support
- **Memory**: ~50-100 MB
- **CPU**: <5% idle, <20% active reading

## Security

- MQTT authentication with username/password
- Configurable logging levels
- No sensitive data in logs
- Windows service runs with minimal permissions

## Version

**v1.0.0** - Initial release (2025-11-26)

## License

Proprietary - Truck Weighing Station System

## Support

For issues or questions:
1. Check [SETUP_GUIDE.md](SETUP_GUIDE.md)
2. Review logs in `logs/` directory
3. Enable DEBUG logging for more details
4. Contact development team

## Contributing

To contribute improvements:
1. Test thoroughly
2. Update documentation
3. Add unit tests
4. Follow code style
5. Submit for review

## Changelog

### v1.0.0 (2025-11-26)
- Initial release
- Serial port reading
- MQTT publishing
- Ticket printing
- Windows service support
- Configuration management
- Error handling and reconnection
- Comprehensive logging
- Unit tests
- Docker support

---

**Last Updated**: 2025-11-26
**Status**: Production Ready ✅

