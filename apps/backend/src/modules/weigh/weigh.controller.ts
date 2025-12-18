import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { WeighService } from './weigh.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('weigh')
@UseGuards(JwtAuthGuard)
export class WeighController {
  constructor(private weighService: WeighService) {}

  @Get('current/:machineId')
  async getCurrentReading(@Param('machineId') machineId: string) {
    return this.weighService.getCurrentReading(machineId);
  }

  @Post('request/:machineId')
  async requestWeigh(@Param('machineId') machineId: string) {
    return this.weighService.requestWeigh(machineId);
  }

  @Get('readings/:ticketId')
  async getReadingsByTicket(@Param('ticketId') ticketId: string) {
    return this.weighService.getReadingsByTicket(+ticketId);
  }
}

