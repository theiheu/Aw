# Weigh Agent - Deployment Guide

## Deployment Scenarios

### Scenario 1: Single Machine Deployment

Deploy agent on a single Windows machine with direct connection to scale and printer.

#### Prerequisites

- Windows 10/11 or Server 2016+
- Python 3.8+
- COM port connected to scale
- Printer connected and configured
- Network access to MQTT broker

#### Steps

1. **Install Python**
   ```bash
   # Download from python.org and install
   # Ensure "Add Python to PATH" is checked
   ```

2. **Clone/Download Agent**
   ```bash
   cd C:\Program Files\WeighAgent
   ```

3. **Setup Virtual Environment**
   ```bash
   python -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt
   ```

4. **Configure**
   ```bash
   # Edit config.json with your settings
   ```

5. **Install as Service**
   ```bash
   python service_wrapper.py install
   python service_wrapper.py start
   ```

6. **Verify**
   ```bash
   # Check service status
   Get-Service WeighAgent

   # View logs
   Get-Content logs\weigh_agent.log -Tail 20
   ```

### Scenario 2: Multiple Machines Deployment

Deploy multiple agents on different machines, each reading from their own scale.

#### Configuration

Each machine needs unique settings:

```json
{
  "machineId": "weigh1",  // or "weigh2", "weigh3", etc.
  "serial": {
    "port": "COM3"  // Different for each machine
  },
  "mqtt": {
    "base_topic": "weigh/1"  // Different for each machine
  }
}
```

#### MQTT Topic Structure

```
weigh/1/reading     - Machine 1 readings
weigh/1/response    - Machine 1 responses
weigh/2/reading     - Machine 2 readings
weigh/2/response    - Machine 2 responses
```

#### Deployment Steps

1. Install agent on each machine (repeat Scenario 1 steps)
2. Configure unique `machineId` and `base_topic` for each
3. Ensure all machines can reach MQTT broker
4. Monitor all machines from central dashboard

### Scenario 3: Docker Deployment

Deploy agent in Windows containers for easier management.

#### Prerequisites

- Windows Server 2016+ with Docker
- Docker configured for Windows containers
- MQTT broker accessible from container

#### Steps

1. **Build Image**
   ```bash
   docker build -f Dockerfile.windows -t weigh-agent:latest .
   ```

2. **Run Container**
   ```bash
   docker run -d `
     --name weigh-agent-1 `
     -e MACHINE_ID=weigh1 `
     -e SERIAL_PORT=COM3 `
     -e MQTT_HOST=192.168.1.10 `
     -v C:\config\config.json:C:\app\config.json `
     -v C:\logs:C:\app\logs `
     weigh-agent:latest
   ```

3. **Using Docker Compose**
   ```bash
   docker-compose -f docker-compose.windows.yml up -d
   ```

4. **Monitor**
   ```bash
   docker logs -f weigh-agent-1
   ```

### Scenario 4: High Availability Deployment

Deploy multiple agents with failover capability.

#### Architecture

```
┌─────────────────────────────────────────┐
│         MQTT Broker (Primary)           │
│         MQTT Broker (Backup)            │
└──────────────┬──────────────────────────┘
               │
    ┌──────────┼──────────┐
    │          │          │
┌───▼──┐  ┌───▼──┐  ┌───▼──┐
│Agent1│  │Agent2│  │Agent3│
└──────┘  └──────┘  └──────┘
```

#### Configuration

Each agent connects to both MQTT brokers:

```json
{
  "mqtt": {
    "host": "192.168.1.10",      // Primary
    "backup_host": "192.168.1.11" // Backup
  }
}
```

#### Implementation

1. Deploy agents on separate machines
2. Configure primary and backup MQTT brokers
3. Implement health checks
4. Setup monitoring and alerting

## Network Configuration

### Firewall Rules

Allow outbound connections on port 1883 (MQTT):

```powershell
# PowerShell (Admin)
New-NetFirewallRule -DisplayName "MQTT" `
  -Direction Outbound `
  -Action Allow `
  -Protocol TCP `
  -RemotePort 1883
```

### VPN Access

For remote MQTT broker:

1. Setup VPN connection on Windows
2. Configure MQTT host as VPN IP
3. Test connectivity before deployment

### Network Segmentation

Recommended network setup:

```
┌─────────────────────────────────────┐
│     Management Network              │
│  (MQTT Broker, Monitoring)          │
└─────────────────────────────────────┘
           │
    ┌──────┴──────┐
    │             │
┌───▼───┐    ┌───▼───┐
│ Agent1│    │ Agent2│
└───────┘    └───────┘
    │             │
┌───▼───┐    ┌───▼───┐
│Scale 1│    │Scale 2│
└───────┘    └───────┘
```

## Monitoring and Maintenance

### Health Checks

Implement periodic health checks:

```python
import paho.mqtt.client as mqtt

def check_agent_health(machine_id):
    client = mqtt.Client()
    client.connect("192.168.1.10", 1883)

    # Subscribe to status topic
    client.subscribe(f"weigh/{machine_id}/status")

    # Wait for response
    # If no response within timeout, alert
```

### Log Rotation

Setup log rotation to prevent disk space issues:

```powershell
# PowerShell script to rotate logs
$logFile = "logs\weigh_agent.log"
if ((Get-Item $logFile).Length -gt 10MB) {
    Rename-Item $logFile "$logFile.$(Get-Date -Format 'yyyyMMdd')"
    Remove-Item logs\weigh_agent.log.* -Filter "*" -OlderThan (Get-Date).AddDays(-30)
}
```

### Performance Monitoring

Monitor key metrics:

- **CPU Usage**: Should be <5% idle, <20% active
- **Memory**: Should be <100 MB
- **Network**: Monitor MQTT message rate
- **Disk**: Monitor log file growth

### Backup Strategy

1. **Configuration Backup**
   ```bash
   copy config.json config.json.backup
   ```

2. **Log Backup**
   ```bash
   # Archive logs weekly
   ```

3. **Database Backup**
   ```bash
   # If using local database
   ```

## Troubleshooting Deployment

### Agent Won't Start

1. Check Python installation
   ```bash
   python --version
   ```

2. Verify virtual environment
   ```bash
   .venv\Scripts\activate
   ```

3. Check config.json syntax
   ```bash
   python -m json.tool config.json
   ```

4. Review logs
   ```bash
   Get-Content logs\weigh_agent.log
   ```

### Serial Port Issues

1. Verify COM port
   ```bash
   Get-WmiObject Win32_SerialPort
   ```

2. Check device manager
   ```bash
   devmgmt.msc
   ```

3. Test with terminal emulator
   ```bash
   # Use PuTTY or similar
   ```

### MQTT Connection Issues

1. Test connectivity
   ```bash
   Test-NetConnection -ComputerName 192.168.1.10 -Port 1883
   ```

2. Verify credentials
   ```bash
   mosquitto_pub -h 192.168.1.10 -u weighuser -P weighpass123 -t test -m "hello"
   ```

3. Check firewall
   ```bash
   Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*MQTT*"}
   ```

## Upgrade Procedure

### Minor Version Upgrade

1. Stop service
   ```bash
   python service_wrapper.py stop
   ```

2. Backup configuration
   ```bash
   copy config.json config.json.backup
   ```

3. Update files
   ```bash
   # Copy new agent.py, etc.
   ```

4. Start service
   ```bash
   python service_wrapper.py start
   ```

### Major Version Upgrade

1. Test on staging environment first
2. Backup all configuration and logs
3. Stop all agents
4. Update all files
5. Verify configuration compatibility
6. Start agents one at a time
7. Monitor for errors

## Rollback Procedure

If upgrade fails:

1. Stop service
   ```bash
   python service_wrapper.py stop
   ```

2. Restore backup
   ```bash
   copy config.json.backup config.json
   ```

3. Restore previous version
   ```bash
   # Restore from version control or backup
   ```

4. Start service
   ```bash
   python service_wrapper.py start
   ```

## Security Hardening

### Windows Security

1. **User Account**
   ```powershell
   # Create service account with minimal permissions
   New-LocalUser -Name "WeighAgent" -NoPassword
   ```

2. **File Permissions**
   ```powershell
   # Restrict access to config.json
   icacls "C:\Program Files\WeighAgent\config.json" /grant "WeighAgent:F"
   ```

3. **Firewall**
   ```powershell
   # Allow only necessary outbound connections
   ```

### Network Security

1. Use VPN for remote connections
2. Implement network segmentation
3. Monitor network traffic
4. Use strong MQTT passwords
5. Enable MQTT authentication

### Data Security

1. Encrypt sensitive configuration
2. Secure log files
3. Implement access controls
4. Regular security audits

## Performance Tuning

### Serial Port Optimization

- Increase baud rate if supported
- Adjust timeout based on scale response
- Use appropriate buffer sizes

### MQTT Optimization

- Batch messages for high frequency
- Use QoS 0 for non-critical data
- Implement message compression
- Monitor broker performance

### System Optimization

- Allocate sufficient resources
- Monitor CPU and memory
- Optimize disk I/O
- Use SSD for log storage

## Disaster Recovery

### Backup Strategy

1. Daily configuration backups
2. Weekly log archives
3. Monthly full system backups
4. Offsite backup storage

### Recovery Procedure

1. Restore from latest backup
2. Verify configuration
3. Test connections
4. Restart services
5. Monitor for errors

## Documentation

Maintain documentation for:

- Network topology
- Configuration details
- Deployment procedures
- Troubleshooting guides
- Contact information

## Support and Escalation

### Support Levels

1. **Level 1**: Basic troubleshooting
2. **Level 2**: Configuration issues
3. **Level 3**: Development/code changes

### Escalation Path

1. Check documentation
2. Review logs
3. Contact support team
4. Escalate to development

## Compliance

### Audit Trail

- Log all configuration changes
- Track deployment history
- Monitor access logs
- Archive logs for compliance

### Regulatory Requirements

- GDPR compliance
- Data retention policies
- Security standards
- Industry regulations

---

**Last Updated**: 2025-11-26
**Version**: 1.0.0

