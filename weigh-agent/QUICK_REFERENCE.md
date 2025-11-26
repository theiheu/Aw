# Weigh Agent - Quick Reference

## Installation

```bash
# 1. Create virtual environment
python -m venv .venv
.venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure (edit config.json)
# 4. Run
python agent.py
```

## Configuration

### Minimal config.json

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
    "level": "INFO"
  }
}
```

## Running

### Console Mode

```bash
.venv\Scripts\activate
python agent.py
```

### As Windows Service

```bash
# Install
python service_wrapper.py install

# Start
python service_wrapper.py start

# Stop
python service_wrapper.py stop

# Remove
python service_wrapper.py remove
```

## Common Commands

### List COM Ports

```bash
python -c "import serial.tools.list_ports; print([p.device for p in serial.tools.list_ports.comports()])"
```

### Test MQTT Connection

```bash
python -c "import paho.mqtt.client as mqtt; c = mqtt.Client(); c.connect('192.168.1.10', 1883); print('OK')"
```

### View Logs

```bash
# Real-time
Get-Content logs\weigh_agent.log -Wait

# Last 50 lines
Get-Content logs\weigh_agent.log -Tail 50
```

### List Printers

```bash
python -c "import win32print; print(win32print.EnumPrinters(2))"
```

### Run Tests

```bash
python test_agent.py
```

## Environment Variables

```bash
set MACHINE_ID=weigh1
set SERIAL_PORT=COM3
set SERIAL_BAUDRATE=9600
set MQTT_HOST=192.168.1.10
set MQTT_PORT=1883
set MQTT_USER=weighuser
set MQTT_PASSWORD=weighpass123
set MQTT_TOPIC=weigh/1
set PRINTER_NAME=MAY_IN_CAN
set PRINT_ENABLED=true
set LOG_LEVEL=INFO
```

## MQTT Topics

### Publish

```
weigh/1/reading     - Weight reading
weigh/1/response    - Response to request
```

### Subscribe

```
weigh/1/request     - Request weight
weigh/1/print       - Print ticket
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Serial port not found | Check COM port number, verify device connected |
| MQTT connection fails | Verify host, port, username, password |
| Printer not printing | Check printer name, ensure printer online |
| Service won't start | Check logs, verify config.json valid |
| High CPU usage | Increase serial timeout, reduce polling |

## File Locations

| File | Purpose |
|------|---------|
| `agent.py` | Main application |
| `service_wrapper.py` | Windows service wrapper |
| `config.json` | Configuration |
| `test_agent.py` | Unit tests |
| `logs/weigh_agent.log` | Application logs |

## Key Classes

### WeighAgent

Main class that handles:
- Serial port communication
- MQTT publishing/subscribing
- Weight reading processing
- Ticket printing

### ConnectionState

Enum for connection states:
- `DISCONNECTED`
- `CONNECTING`
- `CONNECTED`
- `ERROR`

## Key Methods

| Method | Purpose |
|--------|---------|
| `start()` | Start the agent |
| `stop()` | Stop the agent |
| `connect_serial()` | Connect to serial port |
| `connect_mqtt()` | Connect to MQTT broker |
| `process_weight_reading()` | Parse weight data |
| `publish_reading()` | Publish to MQTT |
| `print_ticket()` | Print ticket |
| `get_status()` | Get agent status |

## Performance Tips

1. **Increase baud rate** if scale supports it
2. **Adjust timeout** based on scale response time
3. **Use QoS 0** for non-critical readings
4. **Batch messages** for high-frequency data
5. **Monitor logs** for errors and reconnections

## Security

1. Use strong MQTT passwords
2. Restrict network access
3. Don't log sensitive data
4. Run service with minimal permissions
5. Use VPN for remote connections

## Support

- Check `SETUP_GUIDE.md` for detailed guide
- Enable DEBUG logging for troubleshooting
- Review logs in `logs/` directory
- Contact development team for issues

## Version

**v1.0.0** - 2025-11-26

---

For more information, see [SETUP_GUIDE.md](SETUP_GUIDE.md) or [README.md](README.md)

