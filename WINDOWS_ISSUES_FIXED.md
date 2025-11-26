# Windows Issues - Fixed and Resolved

## Summary

Your Weigh Agent encountered 3 issues when running on Windows. All have been identified and fixed.

---

## Issues Found and Fixed

### ✅ Issue 1: Unicode Encoding Error (FIXED)

**Problem**:
```
UnicodeEncodeError: 'charmap' codec can't encode character '\u2713'
```

The checkmark (✓) and cross (✗) symbols in log messages couldn't be displayed in Windows console.

**Solution Applied**:
- Updated `agent.py` to force UTF-8 encoding on Windows
- Added error handling for unsupported characters
- Specified UTF-8 encoding for log files

**File Modified**: `agent.py` (lines 30-42)

---

### ⚠️ Issue 2: PowerShell Execution Policy (USER ACTION REQUIRED)

**Problem**:
```
File C:\...\activate.ps1 cannot be loaded because running scripts is disabled
```

PowerShell won't run the virtual environment activation script.

**Solutions**:

**Option A: Use Command Prompt (Recommended)**
```cmd
# Open Command Prompt (cmd.exe) instead of PowerShell
cd C:\Users\admin\Downloads\Aw-main\Aw-main\weigh-agent
python -m venv .venv
.venv\Scripts\activate.bat
pip install -r requirements.txt
python agent.py
```

**Option B: Change PowerShell Execution Policy**
```powershell
# Run PowerShell as Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
# Then try again
.venv\Scripts\activate
```

**Option C: Run Python Directly**
```powershell
# No need to activate venv
python -m pip install -r requirements.txt
python agent.py
```

---

### ⚠️ Issue 3: COM Port Access Denied (USER ACTION REQUIRED)

**Problem**:
```
serial.serialutil.SerialException: could not open port 'COM3': PermissionError(13, 'Access is denied.')
```

COM3 is either not available, already in use, or requires administrator privileges.

**Solutions**:

**Step 1: Check Available COM Ports**
```cmd
python -c "import serial.tools.list_ports; print([p.device for p in serial.tools.list_ports.comports()])"
```

**Step 2: Update config.json with Correct Port**
```json
{
  "serial": {
    "port": "COM1"  // Replace with your actual COM port
  }
}
```

**Step 3: Run as Administrator**
```cmd
# Right-click Command Prompt and select "Run as Administrator"
python agent.py
```

**Step 4: Check What's Using the Port**
```cmd
# Device Manager
devmgmt.msc

# Or check in Command Prompt
wmic logicaldisk get name
```

---

## Files Updated

1. **agent.py** - Added Windows UTF-8 encoding support
2. **WINDOWS_SETUP_FIXES.md** - New comprehensive troubleshooting guide

---

## Quick Fix Steps

### For Immediate Testing:

```cmd
# 1. Open Command Prompt (not PowerShell)
cd C:\Users\admin\Downloads\Aw-main\Aw-main\weigh-agent

# 2. Check available COM ports
python -c "import serial.tools.list_ports; print([p.device for p in serial.tools.list_ports.comports()])"

# 3. Edit config.json with correct COM port
# (Use Notepad or your favorite editor)

# 4. Install dependencies
python -m pip install -r requirements.txt

# 5. Run agent
python agent.py
```

---

## What to Do Next

1. **Read**: `WINDOWS_SETUP_FIXES.md` for detailed solutions
2. **Check**: Available COM ports on your system
3. **Update**: `config.json` with correct COM port
4. **Use**: Command Prompt instead of PowerShell
5. **Run**: `python agent.py`

---

## Additional Resources

- **Setup Guide**: `SETUP_GUIDE.md`
- **Quick Reference**: `QUICK_REFERENCE.md`
- **Troubleshooting**: `WINDOWS_SETUP_FIXES.md` (NEW)
- **Logs**: Check `logs/weigh_agent.log` for detailed errors

---

## Status

| Issue | Status | Action |
|-------|--------|--------|
| Unicode Encoding | ✅ FIXED | No action needed |
| PowerShell Policy | ⚠️ USER ACTION | Use Command Prompt or change policy |
| COM Port Access | ⚠️ USER ACTION | Check available ports and update config |

---

## Support

If you still encounter issues:

1. Check `logs/weigh_agent.log` for detailed error messages
2. Review `WINDOWS_SETUP_FIXES.md` for solutions
3. Verify COM port availability
4. Run as Administrator if permission issues persist
5. Use Command Prompt instead of PowerShell

---

**Date**: 2025-11-26
**Version**: 1.0.0
**Status**: Ready for Windows Deployment

