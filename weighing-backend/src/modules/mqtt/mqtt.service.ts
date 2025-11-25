import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import * as mqtt from 'mqtt';

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private client: mqtt.MqttClient;
  private readonly logger = new Logger(MqttService.name);
  private messageHandlers: Map<string, (payload: any) => void> = new Map();

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect() {
    return new Promise<void>((resolve, reject) => {
      const options = {
        host: process.env.MQTT_HOST || 'localhost',
        port: parseInt(process.env.MQTT_PORT || '1883'),
        username: process.env.MQTT_USERNAME || 'weighuser',
        password: process.env.MQTT_PASSWORD || 'weighpass123',
        clientId: `backend-${Date.now()}`,
        reconnectPeriod: 1000,
      };

      this.client = mqtt.connect(options);

      this.client.on('connect', () => {
        this.logger.log('✓ Connected to MQTT broker');
        resolve();
      });

      this.client.on('error', (error) => {
        this.logger.error('✗ MQTT connection error:', error);
        reject(error);
      });

      this.client.on('message', (topic, message) => {
        try {
          const payload = JSON.parse(message.toString());
          const handler = this.messageHandlers.get(topic);
          if (handler) {
            handler(payload);
          }
        } catch (error) {
          this.logger.error(`Error processing message on ${topic}:`, error);
        }
      });
    });
  }

  private async disconnect() {
    return new Promise<void>((resolve) => {
      if (this.client) {
        this.client.end(() => {
          this.logger.log('Disconnected from MQTT broker');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  publish(topic: string, payload: any) {
    if (!this.client || !this.client.connected) {
      this.logger.warn(`MQTT not connected, cannot publish to ${topic}`);
      return;
    }

    const message = JSON.stringify(payload);
    this.client.publish(topic, message, { qos: 1 }, (error) => {
      if (error) {
        this.logger.error(`Failed to publish to ${topic}:`, error);
      } else {
        this.logger.debug(`Published to ${topic}`);
      }
    });
  }

  subscribe(topic: string, handler: (payload: any) => void) {
    if (!this.client) {
      this.logger.warn(`MQTT not ready, cannot subscribe to ${topic}`);
      return;
    }

    this.messageHandlers.set(topic, handler);
    this.client.subscribe(topic, { qos: 1 }, (error) => {
      if (error) {
        this.logger.error(`Failed to subscribe to ${topic}:`, error);
      } else {
        this.logger.debug(`Subscribed to ${topic}`);
      }
    });
  }

  unsubscribe(topic: string) {
    if (!this.client) {
      return;
    }

    this.messageHandlers.delete(topic);
    this.client.unsubscribe(topic, (error) => {
      if (error) {
        this.logger.error(`Failed to unsubscribe from ${topic}:`, error);
      } else {
        this.logger.debug(`Unsubscribed from ${topic}`);
      }
    });
  }

  isConnected(): boolean {
    return this.client && this.client.connected;
  }
}

