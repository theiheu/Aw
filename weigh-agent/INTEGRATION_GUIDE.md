# Weigh Agent - Integration Guide

## Overview

This guide explains how to integrate the Weigh Agent with the Truck Weighing Station backend system.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│         Truck Weighing Station System                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────┐         ┌──────────────────┐    │
│  │   Frontend       │         │   Backend API    │    │
│  │   (React/Next)   │◄────────│   (Node.js)      │    │
│  └──────────────────┘         └────────┬─────────┘    │
│                                        │               │
│  ┌──────────────────┐         ┌────────▼─────────┐    │
│  │   MQTT Broker    │◄────────│   PostgreSQL     │    │
│  │   (Mosquitto)    │         │   Database       │    │
│  └────────┬─────────┘         └──────────────────┘    │
│           │                                            │
│  ┌────────▼─────────┐                                 │
│  │  Weigh Agent     │                                 │
│  │  (Windows)       │                                 │
│  └──────────────────┘                                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## MQTT Message Flow

### 1. Weight Reading Publication

**Topic**: `weigh/{machineId}/reading`

**Message Format**:
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

**Backend Handling**:
```javascript
// Subscribe to weight readings
mqtt.subscribe('weigh/+/reading', (topic, message) => {
  const reading = JSON.parse(message);

  // Store in database
  await WeightReading.create({
    machineId: reading.machineId,
    value: reading.value,
    stable: reading.stable,
    timestamp: reading.timestamp
  });

  // Broadcast to connected clients
  io.emit('weight_reading', reading);
});
```

### 2. Weigh Request

**Topic**: `weigh/{machineId}/request`

**Message Format**:
```json
{
  "requestId": "req-123",
  "ticketId": "T001"
}
```

**Backend Sending**:
```javascript
// Request weight from agent
mqtt.publish('weigh/weigh1/request', JSON.stringify({
  requestId: 'req-123',
  ticketId: 'T001'
}));
```

**Agent Response Topic**: `weigh/{machineId}/response`

**Response Format**:
```json
{
  "machineId": "weigh1",
  "value": 15240,
  "unit": "kg",
  "stable": true,
  "timestamp": "2025-11-26T10:30:45.123Z"
}
```

### 3. Print Request

**Topic**: `weigh/{machineId}/print`

**Message Format**:
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

**Backend Sending**:
```javascript
// Send print request
mqtt.publish('weigh/weigh1/print', JSON.stringify({
  ticketId: 'ticket-123',
  copies: 1,
  payload: ticketData
}));
```

## Backend Integration Steps

### 1. Install MQTT Client

```bash
npm install paho-mqtt
# or
npm install mqtt
```

### 2. Create MQTT Service

```javascript
// services/mqtt.service.js
const mqtt = require('mqtt');

class MQTTService {
  constructor(brokerUrl, username, password) {
    this.client = mqtt.connect(brokerUrl, {
      username,
      password,
      reconnectPeriod: 1000,
      connectTimeout: 30 * 1000
    });

    this.setupHandlers();
  }

  setupHandlers() {
    this.client.on('connect', () => {
      console.log('Connected to MQTT broker');
      this.subscribeToTopics();
    });

    this.client.on('error', (error) => {
      console.error('MQTT error:', error);
    });
  }

  subscribeToTopics() {
    // Subscribe to all weight readings
    this.client.subscribe('weigh/+/reading', (err) => {
      if (err) console.error('Subscribe error:', err);
    });
  }

  publishMessage(topic, message) {
    this.client.publish(topic, JSON.stringify(message), {
      qos: 1,
      retain: false
    });
  }

  onMessage(callback) {
    this.client.on('message', callback);
  }
}

module.exports = MQTTService;
```

### 3. Handle Weight Readings

```javascript
// controllers/weight.controller.js
const MQTTService = require('../services/mqtt.service');

class WeightController {
  constructor() {
    this.mqtt = new MQTTService(
      process.env.MQTT_URL,
      process.env.MQTT_USER,
      process.env.MQTT_PASSWORD
    );

    this.mqtt.onMessage((topic, message) => {
      this.handleWeightReading(topic, message);
    });
  }

  async handleWeightReading(topic, message) {
    try {
      const reading = JSON.parse(message);

      // Extract machine ID from topic
      const machineId = topic.split('/')[1];

      // Store in database
      await WeightReading.create({
        machineId,
        value: reading.value,
        unit: reading.unit,
        stable: reading.stable,
        raw: reading.raw,
        timestamp: new Date(reading.timestamp)
      });

      // Broadcast to WebSocket clients
      this.broadcastToClients(reading);

    } catch (error) {
      console.error('Error handling weight reading:', error);
    }
  }

  broadcastToClients(reading) {
    // Broadcast via WebSocket or Server-Sent Events
    io.emit('weight_reading', reading);
  }
}

module.exports = WeightController;
```

### 4. Request Weight from Agent

```javascript
// services/weigh.service.js
class WeighService {
  constructor(mqtt) {
    this.mqtt = mqtt;
  }

  async requestWeight(machineId, ticketId) {
    return new Promise((resolve, reject) => {
      const requestId = `req-${Date.now()}`;
      const timeout = setTimeout(() => {
        reject(new Error('Weight request timeout'));
      }, 10000); // 10 second timeout

      // Subscribe to response
      this.mqtt.client.subscribe(`weigh/${machineId}/response`, (err) => {
        if (err) reject(err);
      });

      // Listen for response
      const handler = (topic, message) => {
        const response = JSON.parse(message);
        if (response.machineId === machineId) {
          clearTimeout(timeout);
          this.mqtt.client.removeListener('message', handler);
          resolve(response);
        }
      };

      this.mqtt.client.on('message', handler);

      // Send request
      this.mqtt.publishMessage(`weigh/${machineId}/request`, {
        requestId,
        ticketId
      });
    });
  }

  async printTicket(machineId, ticketData, copies = 1) {
    this.mqtt.publishMessage(`weigh/${machineId}/print`, {
      ticketId: ticketData.id,
      copies,
      payload: ticketData
    });
  }
}

module.exports = WeighService;
```

### 5. Create API Endpoints

```javascript
// routes/weight.routes.js
const express = require('express');
const router = express.Router();
const WeighService = require('../services/weigh.service');

const weighService = new WeighService(mqtt);

// Request weight from specific machine
router.post('/request-weight/:machineId', async (req, res) => {
  try {
    const { machineId } = req.params;
    const { ticketId } = req.body;

    const reading = await weighService.requestWeight(machineId, ticketId);
    res.json(reading);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Print ticket
router.post('/print-ticket/:machineId', async (req, res) => {
  try {
    const { machineId } = req.params;
    const { ticketData, copies } = req.body;

    await weighService.printTicket(machineId, ticketData, copies);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get latest reading for machine
router.get('/latest/:machineId', async (req, res) => {
  try {
    const { machineId } = req.params;

    const reading = await WeightReading.findOne({
      where: { machineId },
      order: [['createdAt', 'DESC']]
    });

    res.json(reading);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

### 6. Database Schema

```sql
-- Weight readings table
CREATE TABLE weight_readings (
  id SERIAL PRIMARY KEY,
  machine_id VARCHAR(50) NOT NULL,
  value INTEGER NOT NULL,
  unit VARCHAR(10) DEFAULT 'kg',
  stable BOOLEAN DEFAULT false,
  raw TEXT,
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (machine_id) REFERENCES machines(id)
);

-- Machines table
CREATE TABLE machines (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100),
  location VARCHAR(100),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_machine_id ON weight_readings(machine_id);
CREATE INDEX idx_timestamp ON weight_readings(timestamp);
```

## Frontend Integration

### 1. Real-time Weight Display

```javascript
// components/WeightDisplay.jsx
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

export function WeightDisplay({ machineId }) {
  const [weight, setWeight] = useState(null);
  const [stable, setStable] = useState(false);

  useEffect(() => {
    const socket = io(process.env.REACT_APP_API_URL);

    socket.on('weight_reading', (reading) => {
      if (reading.machineId === machineId) {
        setWeight(reading.value);
        setStable(reading.stable);
      }
    });

    return () => socket.disconnect();
  }, [machineId]);

  return (
    <div className="weight-display">
      <h2>Current Weight</h2>
      <div className={`weight-value ${stable ? 'stable' : 'unstable'}`}>
        {weight} kg
      </div>
      <p className="status">{stable ? 'Stable' : 'Unstable'}</p>
    </div>
  );
}
```

### 2. Request Weight Button

```javascript
// components/RequestWeightButton.jsx
import { useState } from 'react';
import api from '../utils/api';

export function RequestWeightButton({ machineId, ticketId }) {
  const [loading, setLoading] = useState(false);
  const [weight, setWeight] = useState(null);

  const handleRequestWeight = async () => {
    setLoading(true);
    try {
      const response = await api.post(`/weight/request-weight/${machineId}`, {
        ticketId
      });
      setWeight(response.data.value);
    } catch (error) {
      console.error('Error requesting weight:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleRequestWeight} disabled={loading}>
        {loading ? 'Requesting...' : 'Request Weight'}
      </button>
      {weight && <p>Weight: {weight} kg</p>}
    </div>
  );
}
```

### 3. Print Ticket Button

```javascript
// components/PrintTicketButton.jsx
import { useState } from 'react';
import api from '../utils/api';

export function PrintTicketButton({ machineId, ticketData }) {
  const [loading, setLoading] = useState(false);

  const handlePrintTicket = async () => {
    setLoading(true);
    try {
      await api.post(`/weight/print-ticket/${machineId}`, {
        ticketData,
        copies: 1
      });
      alert('Print request sent');
    } catch (error) {
      console.error('Error printing ticket:', error);
      alert('Failed to print ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handlePrintTicket} disabled={loading}>
      {loading ? 'Printing...' : 'Print Ticket'}
    </button>
  );
}
```

## Environment Configuration

### Backend .env

```env
# MQTT Configuration
MQTT_URL=mqtt://192.168.1.10:1883
MQTT_USER=weighuser
MQTT_PASSWORD=weighpass123

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=weighuser
DB_PASSWORD=weighpass123
DB_NAME=weighing

# API
API_PORT=4000
API_URL=http://localhost:4000
```

## Testing Integration

### 1. Test MQTT Connection

```bash
# Subscribe to weight readings
mosquitto_sub -h 192.168.1.10 -u weighuser -P weighpass123 -t "weigh/#"

# Publish test message
mosquitto_pub -h 192.168.1.10 -u weighuser -P weighpass123 \
  -t "weigh/weigh1/reading" \
  -m '{"machineId":"weigh1","value":15240,"unit":"kg","stable":true}'
```

### 2. Test API Endpoints

```bash
# Request weight
curl -X POST http://localhost:4000/weight/request-weight/weigh1 \
  -H "Content-Type: application/json" \
  -d '{"ticketId":"T001"}'

# Print ticket
curl -X POST http://localhost:4000/weight/print-ticket/weigh1 \
  -H "Content-Type: application/json" \
  -d '{
    "ticketData": {
      "id": "ticket-123",
      "code": "T001",
      "plateNumber": "ABC123"
    },
    "copies": 1
  }'
```

## Troubleshooting

### MQTT Connection Issues

1. **Check broker connectivity**:
   ```bash
   telnet 192.168.1.10 1883
   ```

2. **Verify credentials**:
   ```bash
   mosquitto_pub -h 192.168.1.10 -u weighuser -P weighpass123 -t test -m "hello"
   ```

3. **Check firewall**:
   ```bash
   netstat -an | grep 1883
   ```

### Message Format Issues

1. **Validate JSON**:
   ```bash
   echo '{"machineId":"weigh1","value":15240}' | jq .
   ```

2. **Check encoding**:
   - Ensure UTF-8 encoding
   - Verify no BOM characters

### Performance Issues

1. **Monitor MQTT broker**:
   ```bash
   mosquitto_sub -h 192.168.1.10 -u weighuser -P weighpass123 -t '$SYS/#'
   ```

2. **Check database performance**:
   ```sql
   SELECT COUNT(*) FROM weight_readings;
   SELECT AVG(value) FROM weight_readings WHERE timestamp > NOW() - INTERVAL '1 hour';
   ```

## Best Practices

1. **Message Validation**: Always validate MQTT messages
2. **Error Handling**: Implement proper error handling and logging
3. **Timeout Management**: Set appropriate timeouts for requests
4. **Database Indexing**: Index frequently queried columns
5. **Connection Pooling**: Use connection pooling for database
6. **Rate Limiting**: Implement rate limiting for API endpoints
7. **Monitoring**: Monitor MQTT broker and database performance
8. **Backup**: Regular backups of weight reading data

## Support

For integration issues:
1. Check MQTT broker logs
2. Review backend logs
3. Verify network connectivity
4. Check database connectivity
5. Review MQTT message format

---

**Last Updated**: 2025-11-26
**Version**: 1.0.0

