import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Printer } from './entities/printer.entity';
import { PrintJob } from './entities/print-job.entity';
import { PrintService } from './print.service';
import { PrintController } from './print.controller';
import { PrintJobsController } from './print-jobs.controller';
import { MqttModule } from '../mqtt/mqtt.module';
import { TicketModule } from '../ticket/ticket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Printer, PrintJob]),
    MqttModule,
    TicketModule,
  ],
  controllers: [PrintController, PrintJobsController],
  providers: [PrintService],
  exports: [PrintService],
})
export class PrintModule {}

