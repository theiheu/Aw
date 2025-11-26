# Weigh Agent Setup Guide

## Overview

The Weigh Agent is a Windows-based service that reads weight data from a COM port connected to a truck weighing scale and publishes the data to an MQTT broker. It also handles printing of weighing tickets.

## System Requirements

- **Operating System**: Windows 10/11 or Windows Server 2016+
- **Python**: 3.8 or higher
- **Hardware**:
  - COM port connected to weighing scale
  - Network connection to MQTT broker
  - Printer (optional, for ticket printing)

## Installation

### 1. Prerequisites

Install Python 3.8+ from [python.org](https://www.python.org/downloads/)

### 2. Clone/Download the Project

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

For Windows service support, also install:
```bash
pip install pywin32
python -m pip install --upgrade pywin32
pywin32_postinstall.py -install  # Run this to register pywin32
```

## Configuration

### 1. Edit config.json

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

**Configuration Parameters:**

| Parameter | Description | Example |
|-----------|-------------|---------|
| `machineId` | Unique identifier for this weighing station | `weigh1` |
| `serial.port` | COM port connected to scale | `COM3` |
| `serial.baudrate` | Serial port baud rate | `9600` |
| `serial.bytesize` | Data bits (5-8) | `7` |
| `serial.parity` | Parity (N/E/O) | `E` |
| `serial.stopbits` | Stop bits (1-2) | `1` |
| `mqtt.host` | MQTT broker IP/hostname | `192.168.1.10` |
| `mqtt.port` | MQTT broker port | `1883` |
| `mqtt.username` | MQTT username | `weighuser` |
| `mqtt.password` | MQTT password | `weighpass123` |
| `mqtt.base_topic` | MQTT topic prefix | `weigh/1` |
| `print.enabled` | Enable/disable printing | `true` |
| `print.printer_name` | Windows printer name | `MAY_IN_CAN` |

### 2. Environment Variables (Optional)

You can override config.json settings with environment variables:

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

## Running the Agent

### Option 1: Run as Console Application

```bash
.venv\Scripts\activate
python agent.py
```

### Option 2: Run as Windows Service

#### Install Service

```bash
.venv\Scripts\activate
python service_wrapper.py install
```

#### Start Service

```bash
python service_wrapper.py start
```

Or use Windows Services Manager:
```bash
services.msc
```

Find "Truck Weighing Station Agent" and click Start.

#### Stop Service

```bash
python service_wrapper.py stop
```

#### Remove Service

```bash
python service_wrapper.py remove
```

## Troubleshooting

### Serial Port Connection Issues

1. **Check COM Port**:
   ```bash
   # List available COM ports
   python -c "import serial.tools.list_ports; print([p.device for p in serial.tools.list_ports.comports()])"
   ```

2. **Verify Baud Rate**: Check scale documentation for correct baud rate

3. **Check Parity Settings**: Common values: N (None), E (Even), O (Odd)

### MQTT Connection Issues

1. **Test MQTT Broker**:
   ```bash
   pip install paho-mqtt
   python -c "import paho.mqtt.client as mqtt; client = mqtt.Client(); client.connect('192.168.1.10', 1883); print('Connected')"
   ```

2. **Check Credentials**: Verify username and password

3. **Check Firewall**: Ensure port 1883 is not blocked

### Printer Issues

1. **List Available Printers**:
   ```bash
   python -c "import win32print; print(win32print.EnumPrinters(2))"
   ```

2. **Verify Printer Name**: Ensure printer name matches exactly

3. **Check Printer Status**: Ensure printer is online and has paper

### Logs

Check logs in the `logs/` directory:

```bash
# View latest logs
type logs\weigh_agent.log

# Follow logs in real-time
Get-Content logs\weigh_agent.log -Wait
```

## MQTT Topics

### Published Topics

- **`weigh/{machineId}/reading`**: Current weight reading
  ```json
  {
    "machineId": "weigh1",
    "value": 15240,
    "unit": "kg",
    "stable": true,
    "raw": "+00015240kg",
    "timestamp": "2025-11-26T10:30:45.123Z"
  }
  ```

- **`weigh/{machineId}/response`**: Response to weigh request
  ```json
  {
    "machineId": "weigh1",
    "value": 15240,
    "unit": "kg",
    "stable": true,
    "raw": "+00015240kg",
    "timestamp": "2025-11-26T10:30:45.123Z"
  }
  ```

### Subscribed Topics

- **`weigh/{machineId}/request`**: Request for current weight
  ```json
  {
    "requestId": "req-123"
  }
  ```

- **`weigh/{machineId}/print`**: Print ticket request
  ```json
  {
    "ticketId": "ticket-123",
    "copies": 1,
    "payload": {
      "code": "T001",
      "plateNumber": "ABC123",
      "driverName": "John Doe",
      "customerName": "Customer Inc",
      "productName": "Sand",
      "weighInWeight": 20000,
      "weighOutWeight": 5000,
      "netWeight": 15000,
      "direction": "IN",
      "createdAt": "2025-11-26 10:30:45"
    }
  }
  ```

## Performance Tuning

### Serial Port Optimization

- Increase `baudrate` if scale supports higher speeds
- Adjust `timeout` based on scale response time
- Reduce `bytesize` if scale uses 5-bit transmission

### MQTT Optimization

- Increase `keepalive` for slower networks
- Use QoS 0 for non-critical readings
- Implement message batching for high-frequency data

## Security Considerations

1. **MQTT Authentication**: Always use strong passwords
2. **Network Security**: Use VPN or firewall rules to restrict access
3. **Logging**: Be careful not to log sensitive data
4. **Service Account**: Run service with minimal required permissions

## Monitoring

### Health Check

The agent publishes a status message every 60 seconds:

```bash
mosquitto_sub -h 192.168.1.10 -u weighuser -P weighpass123 -t "weigh/1/#"
```

### Service Status

Check service status:

```bash
# PowerShell
Get-Service WeighAgent

# Command Prompt
sc query WeighAgent
```

## Advanced Configuration

### Custom Weight Parsing

Edit `process_weight_reading()` in `agent.py` to handle different scale formats:

```python
# Example: Parse "Weight: 15240 kg"
match = re.search(r'Weight:\s*(\d+)', raw_data)
```

### Custom Ticket Format

Edit `_format_ticket()` in `agent.py` to customize ticket layout:

```python
ticket_text = f"""
Your custom format here
Value: {payload.get('value')}
"""
```

## Support and Debugging

### Enable Debug Logging

Set in config.json:
```json
{
  "logging": {
    "level": "DEBUG"
  }
}
```

Or via environment variable:
```bash
set LOG_LEVEL=DEBUG
```

### Get Agent Status

The agent provides status information via MQTT:

```python
from agent import WeighAgent
agent = WeighAgent()
print(agent.get_status())
```

## Backup and Recovery

### Backup Configuration

```bash
copy config.json config.json.backup
```

### Restore Configuration

```bash
copy config.json.backup config.json
```

## Uninstallation

1. Stop the service:
   ```bash
   python service_wrapper.py stop
   ```

2. Remove the service:
   ```bash
   python service_wrapper.py remove
   ```

3. Delete the directory:
   ```bash
   rmdir /s C:\path\to\weigh-agent
   ```

## FAQ

**Q: Agent won't connect to serial port**
A: Check COM port number, ensure device is connected, verify baud rate matches scale

**Q: MQTT connection fails**
A: Verify broker IP, port, username, password. Check firewall rules.

**Q: Printer not printing**
A: Check printer name, ensure printer is online, verify print is enabled in config

**Q: Service won't start**
A: Check logs in `logs/` directory, verify config.json is valid JSON

**Q: High CPU usage**
A: Reduce serial port polling frequency, increase timeout values

## Version History

- **v1.0.0** (2025-11-26): Initial release
  - Serial port reading
  - MQTT publishing
  - Ticket printing
  - Windows service support
  - Configuration management
  - Error handling and reconnection logic

## License

Proprietary - Truck Weighing Station System

## Support

For support, contact the development team or check the project documentation.

