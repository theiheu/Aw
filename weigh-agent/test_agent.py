#!/usr/bin/env python3
"""
Unit tests for Weigh Agent
"""

import unittest
import json
import tempfile
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
from agent import WeighAgent, ConnectionState


class TestWeighAgentConfiguration(unittest.TestCase):
    """Test configuration loading and validation"""

    def setUp(self):
        """Set up test fixtures"""
        self.test_config = {
            "machineId": "test-weigh1",
            "serial": {
                "port": "COM3",
                "baudrate": 9600,
                "bytesize": 7,
                "parity": "E",
                "stopbits": 1,
                "timeout": 1
            },
            "mqtt": {
                "host": "localhost",
                "port": 1883,
                "username": "testuser",
                "password": "testpass",
                "base_topic": "weigh/test",
                "keepalive": 60
            },
            "print": {
                "enabled": True,
                "printer_name": "TEST_PRINTER"
            },
            "logging": {
                "level": "INFO"
            }
        }

    def test_config_loading(self):
        """Test loading configuration from file"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(self.test_config, f)
            config_path = f.name

        try:
            agent = WeighAgent(config_path)
            self.assertEqual(agent.config['machineId'], 'test-weigh1')
            self.assertEqual(agent.config['serial']['port'], 'COM3')
            self.assertEqual(agent.config['mqtt']['host'], 'localhost')
        finally:
            Path(config_path).unlink()

    def test_config_validation(self):
        """Test configuration validation"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(self.test_config, f)
            config_path = f.name

        try:
            agent = WeighAgent(config_path)
            # Should not raise exception
            self.assertTrue(agent.validate_config())
        finally:
            Path(config_path).unlink()

    def test_invalid_config(self):
        """Test validation of invalid configuration"""
        invalid_config = {"machineId": "test"}

        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(invalid_config, f)
            config_path = f.name

        try:
            with self.assertRaises(ValueError):
                WeighAgent(config_path)
        finally:
            Path(config_path).unlink()


class TestWeighAgentWeightProcessing(unittest.TestCase):
    """Test weight reading processing"""

    def setUp(self):
        """Set up test fixtures"""
        self.test_config = {
            "machineId": "test-weigh1",
            "serial": {
                "port": "COM3",
                "baudrate": 9600,
                "bytesize": 7,
                "parity": "E",
                "stopbits": 1,
                "timeout": 1
            },
            "mqtt": {
                "host": "localhost",
                "port": 1883,
                "username": "testuser",
                "password": "testpass",
                "base_topic": "weigh/test",
                "keepalive": 60
            },
            "print": {
                "enabled": False,
                "printer_name": "TEST_PRINTER"
            },
            "logging": {
                "level": "INFO"
            }
        }

    @patch('agent.serial.Serial')
    @patch('agent.mqtt.Client')
    def test_weight_parsing(self, mock_mqtt, mock_serial):
        """Test weight value parsing"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(self.test_config, f)
            config_path = f.name

        try:
            agent = WeighAgent(config_path)
            agent.mqtt_client = MagicMock()

            # Test parsing "+00015240kg"
            agent.process_weight_reading("+00015240kg")
            self.assertEqual(agent.current_reading['value'], 15240)
            self.assertEqual(agent.current_reading['unit'], 'kg')

            # Test parsing "15240"
            agent.process_weight_reading("15240")
            self.assertEqual(agent.current_reading['value'], 15240)

            # Test parsing "-5000"
            agent.process_weight_reading("-5000")
            self.assertEqual(agent.current_reading['value'], -5000)
        finally:
            Path(config_path).unlink()

    @patch('agent.serial.Serial')
    @patch('agent.mqtt.Client')
    def test_stability_detection(self, mock_mqtt, mock_serial):
        """Test weight stability detection"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(self.test_config, f)
            config_path = f.name

        try:
            agent = WeighAgent(config_path)
            agent.mqtt_client = MagicMock()

            # First reading
            agent.process_weight_reading("15240")
            self.assertTrue(agent.current_reading['stable'])

            # Similar reading (within 100kg)
            agent.process_weight_reading("15250")
            self.assertTrue(agent.current_reading['stable'])

            # Different reading (>100kg difference)
            agent.process_weight_reading("15400")
            self.assertFalse(agent.current_reading['stable'])
        finally:
            Path(config_path).unlink()


class TestWeighAgentTicketFormatting(unittest.TestCase):
    """Test ticket formatting"""

    def setUp(self):
        """Set up test fixtures"""
        self.test_config = {
            "machineId": "test-weigh1",
            "serial": {
                "port": "COM3",
                "baudrate": 9600,
                "bytesize": 7,
                "parity": "E",
                "stopbits": 1,
                "timeout": 1
            },
            "mqtt": {
                "host": "localhost",
                "port": 1883,
                "username": "testuser",
                "password": "testpass",
                "base_topic": "weigh/test",
                "keepalive": 60
            },
            "print": {
                "enabled": False,
                "printer_name": "TEST_PRINTER"
            },
            "logging": {
                "level": "INFO"
            }
        }

    @patch('agent.serial.Serial')
    @patch('agent.mqtt.Client')
    def test_ticket_formatting(self, mock_mqtt, mock_serial):
        """Test ticket text formatting"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(self.test_config, f)
            config_path = f.name

        try:
            agent = WeighAgent(config_path)

            ticket_data = {
                "ticketId": "T001",
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

            formatted = agent._format_ticket(ticket_data)

            # Check that all required fields are in the formatted text
            self.assertIn("T001", formatted)
            self.assertIn("ABC123", formatted)
            self.assertIn("John Doe", formatted)
            self.assertIn("Customer Inc", formatted)
            self.assertIn("Sand", formatted)
            self.assertIn("20000", formatted)
            self.assertIn("5000", formatted)
            self.assertIn("15000", formatted)
        finally:
            Path(config_path).unlink()


class TestWeighAgentStatus(unittest.TestCase):
    """Test agent status reporting"""

    def setUp(self):
        """Set up test fixtures"""
        self.test_config = {
            "machineId": "test-weigh1",
            "serial": {
                "port": "COM3",
                "baudrate": 9600,
                "bytesize": 7,
                "parity": "E",
                "stopbits": 1,
                "timeout": 1
            },
            "mqtt": {
                "host": "localhost",
                "port": 1883,
                "username": "testuser",
                "password": "testpass",
                "base_topic": "weigh/test",
                "keepalive": 60
            },
            "print": {
                "enabled": False,
                "printer_name": "TEST_PRINTER"
            },
            "logging": {
                "level": "INFO"
            }
        }

    @patch('agent.serial.Serial')
    @patch('agent.mqtt.Client')
    def test_get_status(self, mock_mqtt, mock_serial):
        """Test getting agent status"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(self.test_config, f)
            config_path = f.name

        try:
            agent = WeighAgent(config_path)
            status = agent.get_status()

            self.assertEqual(status['machineId'], 'test-weigh1')
            self.assertEqual(status['serial_state'], ConnectionState.DISCONNECTED.value)
            self.assertEqual(status['mqtt_state'], ConnectionState.DISCONNECTED.value)
            self.assertFalse(status['running'])
        finally:
            Path(config_path).unlink()


def run_tests():
    """Run all tests"""
    unittest.main(argv=[''], exit=False, verbosity=2)


if __name__ == '__main__':
    run_tests()

