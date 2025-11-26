#!/usr/bin/env python3
"""
Windows Service Wrapper for Weigh Agent
Allows running the agent as a Windows service
"""

import sys
import os
import logging
from pathlib import Path

try:
    import servicemanager
    import win32serviceutil
    import win32service
    import win32event
    import win32api
    import win32con
    HAS_WIN32_SERVICE = True
except ImportError:
    HAS_WIN32_SERVICE = False
    print("Warning: pywin32 service utilities not available")

from agent import WeighAgent

# Configure logging
log_dir = Path('logs')
log_dir.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_dir / 'weigh_service.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class WeighAgentService(win32serviceutil.ServiceFramework):
    """Windows Service wrapper for Weigh Agent"""

    _svc_name_ = "WeighAgent"
    _svc_display_name_ = "Truck Weighing Station Agent"
    _svc_description_ = "Reads weight data from COM port and publishes to MQTT broker"

    def __init__(self, args):
        """Initialize the service"""
        win32serviceutil.ServiceFramework.__init__(self, args)
        self.is_alive = True
        self.agent = None

    def SvcStop(self):
        """Stop the service"""
        logger.info("Stopping service...")
        self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
        self.is_alive = False

        if self.agent:
            self.agent.stop()

        self.ReportServiceStatus(win32service.SERVICE_STOPPED)

    def SvcDoRun(self):
        """Run the service"""
        logger.info("Starting service...")
        servicemanager.LogMsg(
            servicemanager.EVENTLOG_INFORMATION_TYPE,
            servicemanager.PYS_SERVICE_STARTED,
            (self._svc_name_, '')
        )

        try:
            # Get config path from service directory
            service_dir = Path(__file__).parent
            config_path = service_dir / 'config.json'

            # Create and start agent
            self.agent = WeighAgent(str(config_path))
            self.agent.start()

        except Exception as e:
            logger.error(f"Error running service: {e}")
            servicemanager.LogErrorMsg(f"Error: {e}")
            self.SvcStop()


def install_service():
    """Install the Windows service"""
    if not HAS_WIN32_SERVICE:
        print("Error: pywin32 service utilities not available")
        return False

    try:
        service_path = Path(__file__).parent / 'service_wrapper.py'
        win32serviceutil.InstallService(
            WeighAgentService,
            WeighAgentService._svc_name_,
            displayName=WeighAgentService._svc_display_name_,
            description=WeighAgentService._svc_description_,
            exePath=sys.executable,
            exeArgs=f'"{service_path}"'
        )
        logger.info(f"✓ Service '{WeighAgentService._svc_name_}' installed successfully")
        return True
    except Exception as e:
        logger.error(f"✗ Failed to install service: {e}")
        return False


def remove_service():
    """Remove the Windows service"""
    if not HAS_WIN32_SERVICE:
        print("Error: pywin32 service utilities not available")
        return False

    try:
        win32serviceutil.RemoveService(WeighAgentService._svc_name_)
        logger.info(f"✓ Service '{WeighAgentService._svc_name_}' removed successfully")
        return True
    except Exception as e:
        logger.error(f"✗ Failed to remove service: {e}")
        return False


def start_service():
    """Start the Windows service"""
    if not HAS_WIN32_SERVICE:
        print("Error: pywin32 service utilities not available")
        return False

    try:
        win32serviceutil.StartService(WeighAgentService._svc_name_)
        logger.info(f"✓ Service '{WeighAgentService._svc_name_}' started successfully")
        return True
    except Exception as e:
        logger.error(f"✗ Failed to start service: {e}")
        return False


def stop_service():
    """Stop the Windows service"""
    if not HAS_WIN32_SERVICE:
        print("Error: pywin32 service utilities not available")
        return False

    try:
        win32serviceutil.StopService(WeighAgentService._svc_name_)
        logger.info(f"✓ Service '{WeighAgentService._svc_name_}' stopped successfully")
        return True
    except Exception as e:
        logger.error(f"✗ Failed to stop service: {e}")
        return False


def main():
    """Main entry point"""
    if len(sys.argv) > 1:
        if sys.argv[1] == 'install':
            return 0 if install_service() else 1
        elif sys.argv[1] == 'remove':
            return 0 if remove_service() else 1
        elif sys.argv[1] == 'start':
            return 0 if start_service() else 1
        elif sys.argv[1] == 'stop':
            return 0 if stop_service() else 1
        else:
            print(f"Unknown command: {sys.argv[1]}")
            print("Usage: python service_wrapper.py [install|remove|start|stop]")
            return 1

    # Run as service
    if not HAS_WIN32_SERVICE:
        print("Error: pywin32 service utilities not available")
        print("Please install: pip install pywin32")
        return 1

    win32serviceutil.HandleCommandLine(WeighAgentService)
    return 0


if __name__ == '__main__':
    sys.exit(main())

