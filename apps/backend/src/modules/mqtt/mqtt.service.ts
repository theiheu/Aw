import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import * as mqtt from 'mqtt';

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private client: mqtt.MqttClient | null = null;
  private readonly logger = new Logger(MqttService.name);

  // Map of subscription pattern -> handler
  private messageHandlers: Map<string, (payload: any, topic: string) => void> = new Map();
  private pendingSubscriptions: Array<{ topic: string; handler: (payload: any, topic: string) => void }> = [];

  private readonly mqttHost = process.env.MQTT_HOST || 'localhost';
  private readonly mqttPort = parseInt(process.env.MQTT_PORT || '1883', 10);
  private readonly mqttUsername = process.env.MQTT_USERNAME || undefined;
  private readonly mqttPassword = process.env.MQTT_PASSWORD || undefined;
  private readonly machineId = process.env.MACHINE_ID || 'weigh1';
  private readonly baseTopic = process.env.MQTT_BASE_TOPIC || 'weigh';

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private mqttTopicMatch(subscription: string, topic: string): boolean {
    // Basic matcher for + and # wildcards
    const subLevels = subscription.split('/');
    const topicLevels = topic.split('/');

    for (let i = 0; i < subLevels.length; i++) {
      const sub = subLevels[i];
      const top = topicLevels[i];

      if (sub === '#') return true; // matches remainder
      if (sub === '+') {
        if (top === undefined) return false; // must exist
        continue;
      }
      if (sub !== top) return false;
    }
    return subLevels.length === topicLevels.length;
  }

  private async connect() {
    return new Promise<void>((resolve, reject) => {
      const options: mqtt.IClientOptions = {
        host: this.mqttHost,
        port: this.mqttPort,
        username: this.mqttUsername,
        password: this.mqttPassword,
        clientId: `backend-${Date.now()}`,
        reconnectPeriod: 1000,
      };

      this.logger.log(`Connecting MQTT tcp://${this.mqttHost}:${this.mqttPort} ... (machineId=${this.machineId})`);
      this.client = mqtt.connect(options);

      this.client.on('connect', () => {
        this.logger.log('✓ Connected to MQTT broker');

        // Default scope subscribe: weigh/{machineId}/#
        const scope = `${this.baseTopic}/${this.machineId}/#`;
        this.client!.subscribe(scope, { qos: 1 }, (err) => {
          if (err) this.logger.error(`Failed to subscribe default scope ${scope}`, err);
          else this.logger.log(`Subscribed default scope: ${scope}`);
        });

        // Flush pending subscriptions
        if (this.pendingSubscriptions.length > 0) {
          for (const { topic } of this.pendingSubscriptions) {
            this.client!.subscribe(topic, { qos: 1 }, (error) => {
              if (error) this.logger.error(`Failed to subscribe to ${topic}:`, error);
              else this.logger.debug(`Subscribed to ${topic}`);
            });
          }
          this.pendingSubscriptions = [];
        }

        resolve();
      });

      this.client.on('reconnect', () => {
        this.logger.warn('MQTT reconnecting ...');
      });

      this.client.on('error', (error) => {
        this.logger.error('✗ MQTT connection error:', error);
        reject(error);
      });

      this.client.on('message', (topic, message) => {
        try {
          const payload = JSON.parse(message.toString());
          // Exact match first
          const direct = this.messageHandlers.get(topic);
          if (direct) {
            direct(payload, topic);
            return;
          }
          // Wildcard matches
          for (const [sub, handler] of this.messageHandlers.entries()) {
            if (this.mqttTopicMatch(sub, topic)) {
              try {
                handler(payload, topic);
              } catch (e) {
                this.logger.error(`Handler error for ${sub} on ${topic}:`, e);
              }
            }
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

  subscribe(topic: string, handler: (payload: any, topic: string) => void) {
    // Always store handler so wildcard can be matched on message
    this.messageHandlers.set(topic, handler);

    if (this.client && this.client.connected) {
      this.client.subscribe(topic, { qos: 1 }, (error) => {
        if (error) {
          this.logger.error(`Failed to subscribe to ${topic}:`, error);
        } else {
          this.logger.debug(`Subscribed to ${topic}`);
        }
      });
    } else {
      this.logger.warn(`MQTT not ready, queueing subscription to ${topic}`);
      this.pendingSubscriptions.push({ topic, handler });
    }
  }

  unsubscribe(topic: string) {
    this.messageHandlers.delete(topic);
    if (!this.client) return;

    this.client.unsubscribe(topic, (error) => {
      if (error) {
        this.logger.error(`Failed to unsubscribe from ${topic}:`, error);
      } else {
        this.logger.debug(`Unsubscribed from ${topic}`);
      }
    });
  }

  isConnected(): boolean {
    return !!this.client && this.client.connected === true;
  }
}
