#!/usr/bin/env python3
"""
Weigh Agent - Windows Service for Truck Weighing Station
Reads weight data from COM port and publishes to MQTT broker
"""

import json
import logging
import time
import threading
import serial
import paho.mqtt.client as mqtt
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any
import os
import sys
import re
from enum import Enum

# Optional .env support
try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

try:
    import win32print
    import win32api
    HAS_WIN32 = True
except ImportError:
    HAS_WIN32 = False
    print("Warning: pywin32 not available, printing will be disabled")

# Configure logging
log_dir = Path('logs')
log_dir.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_dir / 'weigh_agent.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class ConnectionState(Enum):
    """Connection state enumeration"""
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    ERROR = "error"


class WeighAgent:
    def __init__(self, config_path: str = 'config.json'):
        """Initialize the Weigh Agent"""
        self.config = self.load_config(config_path)
        self.validate_config()

        self.serial_port: Optional[serial.Serial] = None
        self.mqtt_client: Optional[mqtt.Client] = None
        self.running = False
        self.current_reading: Dict[str, Any] = {}
        self.last_stable_reading: Dict[str, Any] = {}

        # Connection state tracking
        self.serial_state = ConnectionState.DISCONNECTED
        self.mqtt_state = ConnectionState.DISCONNECTED
        self.reconnect_attempts = 0
        self.max_reconnect_attempts = 10
        self.reconnect_delay = 5  # seconds

        # Thread management
        self.serial_thread: Optional[threading.Thread] = None
        self.mqtt_reconnect_thread: Optional[threading.Thread] = None
        self.lock = threading.Lock()

        logger.info(f"✓ Weigh Agent initialized for machine: {self.config['machineId']}")

    def load_config(self, config_path: str) -> Dict[str, Any]:
        """Load configuration from JSON file or environment variables"""
        config = {}

        # Try to load from JSON file first
        if Path(config_path).exists():
            try:
                with open(config_path, 'r') as f:
                    config = json.load(f)
                logger.info(f"✓ Configuration loaded from {config_path}")
            except json.JSONDecodeError:
                logger.error(f"✗ Invalid JSON in config file: {config_path}")
                raise
        else:
            logger.warning(f"Config file not found: {config_path}, using environment variables")

        # Override with environment variables if present
        config['machineId'] = os.getenv('MACHINE_ID', config.get('machineId', 'weigh1'))

        # Serial configuration
        if 'serial' not in config:
            config['serial'] = {}
        config['serial']['port'] = os.getenv('SERIAL_PORT', config['serial'].get('port', 'COM3'))
        config['serial']['baudrate'] = int(os.getenv('SERIAL_BAUDRATE', config['serial'].get('baudrate', 9600)))
        config['serial']['bytesize'] = int(os.getenv('SERIAL_BYTESIZE', config['serial'].get('bytesize', 7)))
        config['serial']['parity'] = os.getenv('SERIAL_PARITY', config['serial'].get('parity', 'E'))
        config['serial']['stopbits'] = int(os.getenv('SERIAL_STOPBITS', config['serial'].get('stopbits', 1)))
        config['serial']['timeout'] = int(os.getenv('SERIAL_TIMEOUT', config['serial'].get('timeout', 1)))

        # MQTT configuration
        if 'mqtt' not in config:
            config['mqtt'] = {}
        config['mqtt']['host'] = os.getenv('MQTT_HOST', config['mqtt'].get('host', 'localhost'))
        config['mqtt']['port'] = int(os.getenv('MQTT_PORT', config['mqtt'].get('port', 1883)))
        config['mqtt']['username'] = os.getenv('MQTT_USER', config['mqtt'].get('username', 'weighuser'))
        config['mqtt']['password'] = os.getenv('MQTT_PASSWORD', config['mqtt'].get('password', 'weighpass123'))
        config['mqtt']['base_topic'] = os.getenv('MQTT_TOPIC', config['mqtt'].get('base_topic', 'weigh/1'))
        config['mqtt']['keepalive'] = int(os.getenv('MQTT_KEEPALIVE', config['mqtt'].get('keepalive', 60)))

        # Print configuration
        if 'print' not in config:
            config['print'] = {}
        config['print']['enabled'] = os.getenv('PRINT_ENABLED', str(config['print'].get('enabled', True))).lower() == 'true'
        config['print']['printer_name'] = os.getenv('PRINTER_NAME', config['print'].get('printer_name', 'MAY_IN_CAN'))

        # Logging configuration
        if 'logging' not in config:
            config['logging'] = {}
        config['logging']['level'] = os.getenv('LOG_LEVEL', config['logging'].get('level', 'INFO'))

        return config

    def validate_config(self) -> bool:
        """Validate configuration"""
        required_fields = {
            'machineId': str,
            'serial': dict,
            'mqtt': dict,
            'print': dict
        }

        for field, field_type in required_fields.items():
            if field not in self.config:
                logger.error(f"✗ Missing required config field: {field}")
                raise ValueError(f"Missing required config field: {field}")
            if not isinstance(self.config[field], field_type):
                logger.error(f"✗ Invalid type for config field {field}: expected {field_type.__name__}")
                raise TypeError(f"Invalid type for config field {field}")

        # Validate serial config
        serial_required = ['port', 'baudrate', 'bytesize', 'parity', 'stopbits']
        for field in serial_required:
            if field not in self.config['serial']:
                logger.error(f"✗ Missing serial config field: {field}")
                raise ValueError(f"Missing serial config field: {field}")

        # Validate MQTT config
        mqtt_required = ['host', 'port', 'username', 'password', 'base_topic']
        for field in mqtt_required:
            if field not in self.config['mqtt']:
                logger.error(f"✗ Missing MQTT config field: {field}")
                raise ValueError(f"Missing MQTT config field: {field}")

        logger.info("✓ Configuration validated successfully")
        return True

    def connect_serial(self) -> bool:
        """Connect to serial port with retry logic"""
        try:
            with self.lock:
                if self.serial_port and self.serial_port.is_open:
                    logger.debug("Serial port already connected")
                    return True

                self.serial_state = ConnectionState.CONNECTING
                serial_config = self.config['serial']

                self.serial_port = serial.Serial(
                    port=serial_config['port'],
                    baudrate=serial_config['baudrate'],
                    bytesize=serial_config['bytesize'],
                    parity=serial_config['parity'],
                    stopbits=serial_config['stopbits'],
                    timeout=serial_config.get('timeout', 1)
                )

                self.serial_state = ConnectionState.CONNECTED
                self.reconnect_attempts = 0
                logger.info(f"✓ Opened {serial_config['port']} @ {serial_config['baudrate']} baud")
                return True
        except serial.SerialException as e:
            self.serial_state = ConnectionState.ERROR
            logger.error(f"✗ Failed to open serial port: {e}")
            return False
        except Exception as e:
            self.serial_state = ConnectionState.ERROR
            logger.error(f"✗ Unexpected error connecting to serial port: {e}")
            return False

    def disconnect_serial(self):
        """Disconnect from serial port"""
        try:
            with self.lock:
                if self.serial_port and self.serial_port.is_open:
                    self.serial_port.close()
                    self.serial_state = ConnectionState.DISCONNECTED
                    logger.info("✓ Serial port closed")
        except Exception as e:
            logger.error(f"Error closing serial port: {e}")

    def connect_mqtt(self) -> bool:
        """Connect to MQTT broker with retry logic"""
        try:
            with self.lock:
                if self.mqtt_client and self.mqtt_state == ConnectionState.CONNECTED:
                    logger.debug("MQTT client already connected")
                    return True

                self.mqtt_state = ConnectionState.CONNECTING
                mqtt_config = self.config['mqtt']

                self.mqtt_client = mqtt.Client(
                    client_id=f"{self.config['machineId']}-{int(time.time())}"
                )

                self.mqtt_client.on_connect = self.on_mqtt_connect
                self.mqtt_client.on_disconnect = self.on_mqtt_disconnect
                self.mqtt_client.on_message = self.on_mqtt_message

                self.mqtt_client.username_pw_set(
                    mqtt_config['username'],
                    mqtt_config['password']
                )

                self.mqtt_client.connect(
                    mqtt_config['host'],
                    mqtt_config['port'],
                    mqtt_config.get('keepalive', 60)
                )

                self.mqtt_client.loop_start()
                logger.info(f"✓ Connecting to MQTT broker at {mqtt_config['host']}:{mqtt_config['port']}")
                return True
        except Exception as e:
            self.mqtt_state = ConnectionState.ERROR
            logger.error(f"✗ Failed to connect to MQTT: {e}")
            return False

    def on_mqtt_connect(self, client, userdata, flags, rc):
        """MQTT connection callback"""
        if rc == 0:
            with self.lock:
                self.mqtt_state = ConnectionState.CONNECTED
                self.reconnect_attempts = 0

            logger.info("✓ Connected to MQTT broker")
            # Subscribe to request and print topics
            base_topic = self.config['mqtt']['base_topic']
            client.subscribe(f"{base_topic}/request")
            client.subscribe(f"{base_topic}/print")
            logger.info(f"✓ Subscribed to {base_topic}/request and {base_topic}/print")
        else:
            with self.lock:
                self.mqtt_state = ConnectionState.ERROR
            logger.error(f"✗ MQTT connection failed with code {rc}")

    def on_mqtt_disconnect(self, client, userdata, rc):
        """MQTT disconnection callback"""
        with self.lock:
            self.mqtt_state = ConnectionState.DISCONNECTED

        if rc != 0:
            logger.warning(f"⚠ Unexpected MQTT disconnection with code {rc}")
            # Trigger reconnection
            self.schedule_mqtt_reconnect()

    def on_mqtt_message(self, client, userdata, msg):
        """MQTT message callback"""
        try:
            payload = json.loads(msg.payload.decode())
            logger.debug(f"Received MQTT message on {msg.topic}: {payload}")

            if 'request' in msg.topic:
                self.handle_weigh_request(payload)
            elif 'print' in msg.topic:
                self.handle_print_request(payload)
        except Exception as e:
            logger.error(f"Error processing MQTT message: {e}")

    def handle_weigh_request(self, payload: Dict[str, Any]):
        """Handle weigh request from backend"""
        logger.info("Received weigh request")
        # Wait for stable reading
        for _ in range(50):  # Wait up to 5 seconds
            if self.current_reading.get('stable'):
                self.send_weigh_response()
                return
            time.sleep(0.1)
        logger.warning("Timeout waiting for stable reading")

    def handle_print_request(self, payload: Dict[str, Any]):
        """Handle print request from backend"""
        try:
            logger.info(f"Received print request: {payload}")
            ticket_id = payload.get('ticketId')
            copies = payload.get('copies', 1)

            if self.config['print']['enabled']:
                self.print_ticket(payload, copies)
            else:
                logger.info("Printing is disabled in config")
        except Exception as e:
            logger.error(f"Error handling print request: {e}")

    def read_serial_data(self):
        """Read data from serial port in a separate thread"""
        if not self.serial_port or not self.serial_port.is_open:
            return

        buffer = b''
        while self.running:
            try:
                if self.serial_port.in_waiting:
                    byte = self.serial_port.read(1)
                    buffer += byte

                    # Check for line ending (CR+LF or just LF)
                    if buffer.endswith(b'\n'):
                        line = buffer.decode('utf-8', errors='ignore').strip()
                        buffer = b''

                        if line:
                            self.process_weight_reading(line)
                else:
                    time.sleep(0.01)
            except Exception as e:
                logger.error(f"Error reading from serial port: {e}")
                time.sleep(1)

    def schedule_mqtt_reconnect(self):
        """Schedule MQTT reconnection"""
        if self.reconnect_attempts >= self.max_reconnect_attempts:
            logger.error(f"✗ Max reconnection attempts ({self.max_reconnect_attempts}) reached")
            return

        self.reconnect_attempts += 1
        delay = self.reconnect_delay * (2 ** min(self.reconnect_attempts - 1, 3))  # Exponential backoff, max 8x
        logger.info(f"Scheduling MQTT reconnection in {delay}s (attempt {self.reconnect_attempts}/{self.max_reconnect_attempts})")

        if self.mqtt_reconnect_thread and self.mqtt_reconnect_thread.is_alive():
            return

        self.mqtt_reconnect_thread = threading.Thread(
            target=self._reconnect_mqtt_delayed,
            args=(delay,),
            daemon=True
        )
        self.mqtt_reconnect_thread.start()

    def _reconnect_mqtt_delayed(self, delay: float):
        """Reconnect to MQTT after delay"""
        time.sleep(delay)
        if self.running:
            logger.info("Attempting MQTT reconnection...")
            self.connect_mqtt()

    def get_status(self) -> Dict[str, Any]:
        """Get agent status"""
        return {
            'machineId': self.config['machineId'],
            'serial_state': self.serial_state.value,
            'mqtt_state': self.mqtt_state.value,
            'current_reading': self.current_reading,
            'last_stable_reading': self.last_stable_reading,
            'reconnect_attempts': self.reconnect_attempts,
            'running': self.running
        }

    def process_weight_reading(self, raw_data: str):
        """Process weight reading from scale"""
        try:
            # Parse weight value (adjust regex based on your scale format)
            # Example format: "+00015240kg" or "15240"
            match = re.search(r'([+-]?\d+)', raw_data)
            if match:
                value = int(match.group(1))

                # Determine if reading is stable (simple heuristic)
                is_stable = True
                if self.last_stable_reading:
                    diff = abs(value - self.last_stable_reading.get('value', 0))
                    is_stable = diff < 100  # Stable if change < 100kg

                with self.lock:
                    self.current_reading = {
                        'machineId': self.config['machineId'],
                        'value': value,
                        'unit': 'kg',
                        'stable': is_stable,
                        'raw': raw_data,
                        'timestamp': datetime.now().isoformat() + 'Z'
                    }

                    if is_stable:
                        self.last_stable_reading = self.current_reading.copy()

                # Publish to MQTT
                self.publish_reading()

                logger.debug(f"Weight: {value}kg (stable: {is_stable})")
        except Exception as e:
            logger.error(f"Error processing weight reading: {e}")

    def publish_reading(self):
        """Publish current reading to MQTT"""
        if not self.mqtt_client:
            return

        try:
            topic = f"{self.config['mqtt']['base_topic']}/reading"
            payload = json.dumps(self.current_reading)
            self.mqtt_client.publish(topic, payload, qos=1)
        except Exception as e:
            logger.error(f"Error publishing reading: {e}")

    def send_weigh_response(self):
        """Send weigh response to backend"""
        if not self.mqtt_client:
            return

        try:
            topic = f"{self.config['mqtt']['base_topic']}/response"
            payload = json.dumps(self.current_reading)
            self.mqtt_client.publish(topic, payload, qos=1)
            logger.info(f"Sent weigh response: {self.current_reading['value']}kg")
        except Exception as e:
            logger.error(f"Error sending weigh response: {e}")

    def print_ticket(self, ticket_data: Dict[str, Any], copies: int = 1):
        """Print ticket using Windows printer"""
        if not HAS_WIN32:
            logger.warning("pywin32 not available, skipping print")
            return

        if not self.config['print']['enabled']:
            logger.info("Printing is disabled in config")
            return

        try:
            printer_name = self.config['print']['printer_name']
            ticket_text = self._format_ticket(ticket_data)

            # Print using Windows API
            for i in range(copies):
                try:
                    self._print_to_windows_printer(printer_name, ticket_text)
                    logger.debug(f"Printed copy {i+1}/{copies}")
                except Exception as e:
                    logger.error(f"Error printing copy {i+1}: {e}")

            logger.info(f"✓ Printed {copies} copy(ies) to {printer_name}")
        except Exception as e:
            logger.error(f"Error printing ticket: {e}")

    def _format_ticket(self, ticket_data: Dict[str, Any]) -> str:
        """Format ticket data for printing"""
        payload = ticket_data.get('payload', {})

        # Extract and format data
        code = payload.get('code', 'N/A')
        plate = payload.get('plateNumber', 'N/A')
        weigh_in = payload.get('weighInWeight', 'N/A')
        weigh_out = payload.get('weighOutWeight', 'N/A')
        net_weight = payload.get('netWeight', 'N/A')
        direction = payload.get('direction', 'N/A')
        created_at = payload.get('createdAt', 'N/A')
        driver = payload.get('driverName', 'N/A')
        customer = payload.get('customerName', 'N/A')
        product = payload.get('productName', 'N/A')

        ticket_text = f"""
╔══════════════════════════════════════╗
║     PHIẾU CÂN HÀNG                   ║
║  TRUCK WEIGHING STATION              ║
╚══════════════════════════════════════╝

Mã phiếu: {code}
Biển số xe: {plate}
Tài xế: {driver}
Khách hàng: {customer}
Sản phẩm: {product}

Cân vào: {weigh_in} kg
Cân ra: {weigh_out} kg
Trọng lượng hàng: {net_weight} kg

Hướng: {direction}
Ngày giờ: {created_at}

══════════════════════════════════════
"""
        return ticket_text

    def _print_to_windows_printer(self, printer_name: str, text: str):
        """Print text to Windows printer"""
        if not HAS_WIN32:
            logger.error("pywin32 not available")
            return

        try:
            hprinter = win32print.OpenPrinter(printer_name)
            try:
                win32print.StartDocPrinter(hprinter, 1, ("Weigh Ticket", None, "RAW"))
                win32print.StartPagePrinter(hprinter)

                # Encode text to bytes with proper encoding
                text_bytes = text.encode('utf-8')
                win32print.WritePrinter(hprinter, text_bytes)

                win32print.EndPagePrinter(hprinter)
                win32print.EndDocPrinter(hprinter)
                logger.debug(f"Successfully sent {len(text_bytes)} bytes to printer")
            finally:
                win32print.ClosePrinter(hprinter)
        except Exception as e:
            logger.error(f"Error in Windows printer operation: {e}")
            raise

    def start(self):
        """Start the Weigh Agent"""
        logger.info("Starting Weigh Agent...")

        # Connect to serial port with retries
        for attempt in range(3):
            if self.connect_serial():
                break
            if attempt < 2:
                logger.warning(f"Retrying serial connection (attempt {attempt + 2}/3)...")
                time.sleep(5)
        else:
            logger.error("Fatal: Could not connect to serial port after 3 attempts")
            return False

        # Connect to MQTT with retries
        for attempt in range(3):
            if self.connect_mqtt():
                break
            if attempt < 2:
                logger.warning(f"Retrying MQTT connection (attempt {attempt + 2}/3)...")
                time.sleep(5)
        else:
            logger.error("Fatal: Could not connect to MQTT after 3 attempts")
            self.disconnect_serial()
            return False

        self.running = True

        # Start serial reading thread
        self.serial_thread = threading.Thread(target=self.read_serial_data, daemon=True)
        self.serial_thread.start()
        logger.info("✓ Serial reading thread started")

        logger.info("✓ Weigh Agent is running. Press Ctrl+C to stop.")

        # Keep the agent running
        try:
            while self.running:
                time.sleep(1)
                # Periodic status check
                if self.running and self.serial_state != ConnectionState.CONNECTED:
                    logger.warning(f"Serial connection lost, current state: {self.serial_state.value}")
                    if not self.connect_serial():
                        logger.warning("Failed to reconnect to serial port")
        except KeyboardInterrupt:
            logger.info("Received interrupt signal")
            self.stop()

        return True

    def stop(self):
        """Stop the Weigh Agent"""
        logger.info("Stopping Weigh Agent...")
        self.running = False

        try:
            if self.mqtt_client:
                self.mqtt_client.loop_stop()
                self.mqtt_client.disconnect()
                logger.info("✓ MQTT client disconnected")
        except Exception as e:
            logger.error(f"Error disconnecting MQTT: {e}")

        self.disconnect_serial()

        # Wait for threads to finish
        if self.serial_thread and self.serial_thread.is_alive():
            self.serial_thread.join(timeout=2)
        if self.mqtt_reconnect_thread and self.mqtt_reconnect_thread.is_alive():
            self.mqtt_reconnect_thread.join(timeout=2)

        logger.info("✓ Weigh Agent stopped")


def main():
    """Main entry point"""
    try:
        agent = WeighAgent('config.json')
        agent.start()
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        return 1

    return 0


if __name__ == '__main__':
    exit(main())

