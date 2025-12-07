@echo off
SETLOCAL
cd /d %~dp0
where node >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
  echo Node.js not found. Please install Node 18+ from https://nodejs.org/
  pause
  exit /b 1
)
call npm install --no-audit --quiet
node src\service.js install
ENDLOCAL

