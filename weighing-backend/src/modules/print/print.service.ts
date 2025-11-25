import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Printer, PrinterType } from './entities/printer.entity';
import { PrintJob, PrintJobStatus } from './entities/print-job.entity';
import { MqttService } from '../mqtt/mqtt.service';
import { TicketService } from '../ticket/ticket.service';

@Injectable()
export class PrintService {
  constructor(
    @InjectRepository(Printer)
    private printersRepository: Repository<Printer>,
    @InjectRepository(PrintJob)
    private printJobsRepository: Repository<PrintJob>,
    private mqttService: MqttService,
    private ticketService: TicketService,
  ) {}

  async createPrinter(data: {
    name: string;
    type: PrinterType;
    ipAddress?: string;
    port?: number;
  }) {
    const printer = this.printersRepository.create(data);
    return this.printersRepository.save(printer);
  }

  async getPrinters() {
    return this.printersRepository.find({
      where: { isActive: true },
    });
  }

  async printTicket(ticketId: number, stationId: number, copies: number = 1) {
    const ticket = await this.ticketService.findOne(ticketId);

    // Create print job
    const printJob = this.printJobsRepository.create({
      ticketId,
      printerId: 1, // Default printer, can be made configurable
      status: PrintJobStatus.PENDING,
      copies,
      payload: {
        ticketId: ticket.id,
        code: ticket.code,
        plateNumber: ticket.plateNumber,
        weighInWeight: ticket.weighInWeight,
        weighOutWeight: ticket.weighOutWeight,
        netWeight: ticket.netWeight,
        direction: ticket.direction,
        createdAt: ticket.createdAt,
      },
    });

    await this.printJobsRepository.save(printJob);

    // Publish to MQTT
    const machineId = `weigh${stationId}`;
    this.mqttService.publish(`${machineId}/print`, {
      ticketId: ticket.id,
      template: 'A5',
      copies,
      payload: printJob.payload,
    });

    // Update job status
    printJob.status = PrintJobStatus.SENT;
    return this.printJobsRepository.save(printJob);
  }

  async getPrintJobs(ticketId?: number) {
    const query = this.printJobsRepository.createQueryBuilder('job');

    if (ticketId) {
      query.andWhere('job.ticketId = :ticketId', { ticketId });
    }

    return query.orderBy('job.createdAt', 'DESC').getMany();
  }
}

