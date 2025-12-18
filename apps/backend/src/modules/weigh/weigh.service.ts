import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WeighReading } from './entities/weigh-reading.entity';
import { MqttService } from '../mqtt/mqtt.service';
import { StationService } from '../station/station.service';

@Injectable()
export class WeighService implements OnModuleInit {
  private readonly logger = new Logger(WeighService.name);
  private currentReadings: Map<string, WeighReading> = new Map();

  constructor(
    @InjectRepository(WeighReading)
    private weighReadingsRepository: Repository<WeighReading>,
    private mqttService: MqttService,
    private stationService: StationService,
  ) {}

  async onModuleInit() {
    // Subscribe to all weigh readings
    this.mqttService.subscribe('weigh/+/reading', (payload) => {
      this.handleWeighReading(payload);
    });
  }

  private async handleWeighReading(payload: any) {
    try {
      const { machineId, value, unit, stable, raw, timestamp } = payload;

      // Store current reading
      this.currentReadings.set(machineId, {
        id: 0,
        ticketId: 0,
        machineId,
        value,
        unit,
        stable,
        raw,
        timestamp: new Date(timestamp),
        ticket: null,
      });

      this.logger.debug(
        `Received reading from ${machineId}: ${value}${unit} (stable: ${stable})`,
      );
    } catch (error) {
      this.logger.error('Error handling weigh reading:', error);
    }
  }

  async getCurrentReading(machineId: string) {
    return this.currentReadings.get(machineId) || null;
  }

  async requestWeigh(machineId: string) {
    const topic = `weigh/${machineId}/request`;
    this.mqttService.publish(topic, {
      timestamp: new Date().toISOString(),
    });

    // Wait for response (with timeout)
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(null);
      }, 5000);

      const checkReading = setInterval(() => {
        const reading = this.currentReadings.get(machineId);
        if (reading && reading.stable) {
          clearInterval(checkReading);
          clearTimeout(timeout);
          resolve(reading);
        }
      }, 100);
    });
  }

  async saveReading(ticketId: number, machineId: string, value: number) {
    const reading = this.weighReadingsRepository.create({
      ticketId,
      machineId,
      value,
      unit: 'kg',
      stable: true,
    });

    return this.weighReadingsRepository.save(reading);
  }

  async getReadingsByTicket(ticketId: number) {
    return this.weighReadingsRepository.find({
      where: { ticketId },
      order: { timestamp: 'ASC' },
    });
  }
}

