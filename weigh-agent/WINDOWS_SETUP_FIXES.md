# Windows Setup Fixes - Weigh Agent

## Issues Encountered and Solutions

### Issue 1: PowerShell Execution Policy

**Error**:
```
File C:\...\activate.ps1 cannot be loaded because running scripts is disabled on this system
```

**Solution 1: Use Command Prompt Instead (Recommended)**
```cmd
# Use cmd.exe instead of PowerShell
cd C:\Users\admin\Downloads\Aw-main\Aw-main\weigh-agent
python -m venv .venv
.venv\Scripts\activate.bat
pip install -r requirements.txt
python agent.py
```

**Solution 2: Change PowerShell Execution Policy**
```powershell
# Run PowerShell as Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.venv\Scripts\activate
```

**Solution 3: Use Python Directly**
```powershell
# No need to activate venv, just use python directly
python -m pip install -r requirements.txt
python agent.py
```

---

### Issue 2: Unicode Encoding Error (✓ and ✗ symbols)

**Error**:
```
UnicodeEncodeError: 'charmap' codec can't encode character '\u2713' in position 44
```

**Solution: Already Fixed in agent.py**

The agent.py has been updated to handle Windows console encoding properly. The fix:
- Forces UTF-8 encoding for console output
- Uses error='replace' to handle unsupported characters gracefully
- Specifies UTF-8 encoding for log files

**If you still see encoding errors**, set environment variable:
```cmd
# Command Prompt
set PYTHONIOENCODING=utf-8
python agent.py

# PowerShell
$env:PYTHONIOENCODING='utf-8'
python agent.py
```

---

### Issue 3: COM Port Access Denied

**Error**:
```
serial.serialutil.SerialException: could not open port 'COM3': PermissionError(13, 'Access is denied.', None, 5)
```

**Causes**:
1. COM3 doesn't exist on your system
2. COM3 is already in use by another application
3. Permissions issue with the port

**Solution 1: Check Available COM Ports**
```cmd
# Command Prompt
python -c "import serial.tools.list_ports; print([p.device for p in serial.tools.list_ports.comports()])"
```

**Solution 2: Update config.json with Correct Port**
```json
{
  "serial": {
    "port": "COM1"  // Change to your actual COM port
  }
}
```

**Solution 3: Check What's Using the Port**
```cmd
# Command Prompt - Find what's using COM3
netstat -ano | findstr :COM3

# Or use Device Manager
devmgmt.msc
```

**Solution 4: Run as Administrator**
```cmd
# Right-click Command Prompt and select "Run as Administrator"
python agent.py
```

**Solution 5: Test Without Scale (Development Mode)**
```json
{
  "serial": {
    "port": "COM99"  // Non-existent port for testing
  }
}
```

The agent will retry and eventually fail gracefully, allowing you to test other components.

---

## Complete Windows Setup Steps

### Step 1: Use Command Prompt (Recommended)
```cmd
# Open Command Prompt (not PowerShell)
cd C:\Users\admin\Downloads\Aw-main\Aw-main\weigh-agent
```

### Step 2: Create Virtual Environment
```cmd
python -m venv .venv
.venv\Scripts\activate.bat
```

### Step 3: Install Dependencies
```cmd
pip install -r requirements.txt
```

### Step 4: Check Available COM Ports
```cmd
python -c "import serial.tools.list_ports; print([p.device for p in serial.tools.list_ports.comports()])"
```

### Step 5: Update config.json
```json
{
  "machineId": "weigh1",
  "serial": {
    "port": "COM1",  // Use your actual COM port
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
    "base_topic": "weigh/1"
  }
}
```

### Step 6: Run Agent
```cmd
python agent.py
```

---

## Alternative: Run Without Virtual Environment

If you have issues with virtual environment, you can run directly:

```cmd
# Install globally
pip install pyserial paho-mqtt pywin32 python-dotenv

# Run agent
python agent.py
```

---

## Alternative: Use Python Directly Without Activation

```cmd
# No need to activate venv
python -m pip install -r requirements.txt
python agent.py
```

---

## Environment Variable Configuration

Instead of editing config.json, you can use environment variables:

```cmd
# Set environment variables
set MACHINE_ID=weigh1
set SERIAL_PORT=COM1
set SERIAL_BAUDRATE=9600
set MQTT_HOST=192.168.1.10
set MQTT_USER=weighuser
set MQTT_PASSWORD=weighpass123

# Run agent
python agent.py
```

---

## Windows Service Installation

If you want to run as a Windows service:

```cmd
# Run as Administrator
python service_wrapper.py install
python service_wrapper.py start
```

---

## Troubleshooting Checklist

- [ ] Using Command Prompt (not PowerShell)
- [ ] Correct COM port in config.json
- [ ] COM port not in use by other applications
- [ ] Running as Administrator (if permission issues)
- [ ] MQTT broker is accessible
- [ ] All dependencies installed: `pip list`
- [ ] Python version 3.8+: `python --version`

---

## Quick Test Commands

```cmd
# Test Python installation
python --version

# Test serial port availability
python -c "import serial; print('Serial OK')"

# Test MQTT connection
python -c "import paho.mqtt.client as mqtt; print('MQTT OK')"

# Test pywin32
python -c "import win32print; print('Win32 OK')"

# List COM ports
python -c "import serial.tools.list_ports; print([p.device for p in serial.tools.list_ports.comports()])"

# Run tests
python test_agent.py
```

---

## If All Else Fails

### Option 1: Use Docker
```cmd
docker build -f Dockerfile.windows -t weigh-agent:windows .
docker-compose -f docker-compose.windows.yml up -d
```

### Option 2: Run on Linux/WSL
If you have WSL (Windows Subsystem for Linux) installed:
```bash
wsl
cd /mnt/c/Users/admin/Downloads/Aw-main/Aw-main/weigh-agent
python agent.py
```

### Option 3: Contact Support
Check the logs and documentation for more details.

---

## Logs Location

All logs are saved in:
```
C:\Users\admin\Downloads\Aw-main\Aw-main\weigh-agent\logs\weigh_agent.log
```

Check this file for detailed error messages.

---

## Summary

The main issues were:
1. ✅ **Fixed**: Unicode encoding for Windows console
2. **Action Required**: Use correct COM port (check with `python -c "import serial.tools.list_ports; print([p.device for p in serial.tools.list_ports.comports()])"`)
3. **Action Required**: Use Command Prompt instead of PowerShell, or change execution policy

After these fixes, the agent should run successfully!

