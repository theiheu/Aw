import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from './entities/ticket.entity';
import { TicketService } from './ticket.service';
import { TicketController } from './ticket.controller';
import { StationModule } from '../station/station.module';
import { WeighModule } from '../weigh/weigh.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket]),
    StationModule,
    WeighModule,
  ],
  controllers: [TicketController],
  providers: [TicketService],
  exports: [TicketService],
})
export class TicketModule {}

