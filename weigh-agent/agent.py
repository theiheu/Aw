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
import win32print
import win32api

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('weigh_agent.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class WeighAgent:
    def __init__(self, config_path: str = 'config.json'):
        """Initialize the Weigh Agent"""
        self.config = self.load_config(config_path)
        self.serial_port: Optional[serial.Serial] = None
        self.mqtt_client: Optional[mqtt.Client] = None
        self.running = False
        self.current_reading: Dict[str, Any] = {}
        self.last_stable_reading: Dict[str, Any] = {}

        logger.info(f"✓ Weigh Agent initialized for machine: {self.config['machineId']}")

    def load_config(self, config_path: str) -> Dict[str, Any]:
        """Load configuration from JSON file"""
        try:
            with open(config_path, 'r') as f:
                config = json.load(f)
            logger.info(f"✓ Configuration loaded from {config_path}")
            return config
        except FileNotFoundError:
            logger.error(f"✗ Config file not found: {config_path}")
            raise
        except json.JSONDecodeError:
            logger.error(f"✗ Invalid JSON in config file: {config_path}")
            raise

    def connect_serial(self) -> bool:
        """Connect to serial port"""
        try:
            serial_config = self.config['serial']
            self.serial_port = serial.Serial(
                port=serial_config['port'],
                baudrate=serial_config['baudrate'],
                bytesize=serial_config['bytesize'],
                parity=serial_config['parity'],
                stopbits=serial_config['stopbits'],
                timeout=serial_config.get('timeout', 1)
            )
            logger.info(f"✓ Opened {serial_config['port']} @ {serial_config['baudrate']} baud")
            return True
        except serial.SerialException as e:
            logger.error(f"✗ Failed to open serial port: {e}")
            return False

    def disconnect_serial(self):
        """Disconnect from serial port"""
        if self.serial_port and self.serial_port.is_open:
            self.serial_port.close()
            logger.info("✓ Serial port closed")

    def connect_mqtt(self) -> bool:
        """Connect to MQTT broker"""
        try:
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
            logger.error(f"✗ Failed to connect to MQTT: {e}")
            return False

    def on_mqtt_connect(self, client, userdata, flags, rc):
        """MQTT connection callback"""
        if rc == 0:
            logger.info("✓ Connected to MQTT broker")
            # Subscribe to request and print topics
            base_topic = self.config['mqtt']['base_topic']
            client.subscribe(f"{base_topic}/request")
            client.subscribe(f"{base_topic}/print")
            logger.info(f"✓ Subscribed to {base_topic}/request and {base_topic}/print")
        else:
            logger.error(f"✗ MQTT connection failed with code {rc}")

    def on_mqtt_disconnect(self, client, userdata, rc):
        """MQTT disconnection callback"""
        if rc != 0:
            logger.warning(f"⚠ Unexpected MQTT disconnection with code {rc}")

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

    def process_weight_reading(self, raw_data: str):
        """Process weight reading from scale"""
        try:
            # Parse weight value (adjust regex based on your scale format)
            # Example format: "+00015240kg" or "15240"
            import re

            match = re.search(r'([+-]?\d+)', raw_data)
            if match:
                value = int(match.group(1))

                # Determine if reading is stable (simple heuristic)
                is_stable = True
                if self.last_stable_reading:
                    diff = abs(value - self.last_stable_reading.get('value', 0))
                    is_stable = diff < 100  # Stable if change < 100kg

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
        try:
            printer_name = self.config['print']['printer_name']

            # Simple text-based ticket format
            ticket_text = self._format_ticket(ticket_data)

            # Print using Windows API
            for _ in range(copies):
                self._print_to_windows_printer(printer_name, ticket_text)

            logger.info(f"✓ Printed {copies} copy(ies) to {printer_name}")
        except Exception as e:
            logger.error(f"Error printing ticket: {e}")

    def _format_ticket(self, ticket_data: Dict[str, Any]) -> str:
        """Format ticket data for printing"""
        payload = ticket_data.get('payload', {})

        ticket_text = f"""
╔══════════════════════════════════════╗
║     PHIẾU CÂN HÀNG                   ║
╚══════════════════════════════════════╝

Mã phiếu: {payload.get('code', 'N/A')}
Biển số xe: {payload.get('plateNumber', 'N/A')}

Cân vào: {payload.get('weighInWeight', 'N/A')} kg
Cân ra: {payload.get('weighOutWeight', 'N/A')} kg
Trọng lượng hàng: {payload.get('netWeight', 'N/A')} kg

Hướng: {payload.get('direction', 'N/A')}
Ngày giờ: {payload.get('createdAt', 'N/A')}

══════════════════════════════════════
"""
        return ticket_text

    def _print_to_windows_printer(self, printer_name: str, text: str):
        """Print text to Windows printer"""
        try:
            # Get printer handle
            hprinter = win32print.OpenPrinter(printer_name)

            # Create print job
            try:
                hprinter = win32print.OpenPrinter(printer_name)
                win32print.StartDocPrinter(hprinter, 1, ("Weigh Ticket", None, "RAW"))
                win32print.StartPagePrinter(hprinter)

                # Write text
                win32print.WritePrinter(hprinter, text.encode('utf-8'))

                win32print.EndPagePrinter(hprinter)
                win32print.EndDocPrinter(hprinter)
            finally:
                win32print.ClosePrinter(hprinter)
        except Exception as e:
            logger.error(f"Error in Windows printer operation: {e}")

    def start(self):
        """Start the Weigh Agent"""
        logger.info("Starting Weigh Agent...")

        # Connect to serial port
        if not self.connect_serial():
            logger.error("Failed to connect to serial port, retrying...")
            time.sleep(5)
            if not self.connect_serial():
                logger.error("Fatal: Could not connect to serial port")
                return False

        # Connect to MQTT
        if not self.connect_mqtt():
            logger.error("Failed to connect to MQTT, retrying...")
            time.sleep(5)
            if not self.connect_mqtt():
                logger.error("Fatal: Could not connect to MQTT")
                self.disconnect_serial()
                return False

        self.running = True

        # Start serial reading thread
        serial_thread = threading.Thread(target=self.read_serial_data, daemon=True)
        serial_thread.start()
        logger.info("✓ Serial reading thread started")

        logger.info("✓ Weigh Agent is running. Press Ctrl+C to stop.")

        # Keep the agent running
        try:
            while self.running:
                time.sleep(1)
        except KeyboardInterrupt:
            logger.info("Received interrupt signal")
            self.stop()

        return True

    def stop(self):
        """Stop the Weigh Agent"""
        logger.info("Stopping Weigh Agent...")
        self.running = False

        if self.mqtt_client:
            self.mqtt_client.loop_stop()
            self.mqtt_client.disconnect()

        self.disconnect_serial()
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

