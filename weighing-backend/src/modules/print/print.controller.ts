import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { PrintService } from './print.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrinterType } from './entities/printer.entity';

@Controller('print')
@UseGuards(JwtAuthGuard)
export class PrintController {
  constructor(private printService: PrintService) {}

  @Post('printers')
  createPrinter(
    @Body()
    data: {
      name: string;
      type: PrinterType;
      ipAddress?: string;
      port?: number;
    },
  ) {
    return this.printService.createPrinter(data);
  }

  @Get('printers')
  getPrinters() {
    return this.printService.getPrinters();
  }

  @Post('tickets/:ticketId')
  printTicket(
    @Param('ticketId') ticketId: string,
    @Body() body: { stationId: number; copies?: number },
  ) {
    return this.printService.printTicket(
      +ticketId,
      body.stationId,
      body.copies || 1,
    );
  }

  @Get('jobs')
  getPrintJobs(@Query('ticketId') ticketId?: string) {
    return this.printService.getPrintJobs(ticketId ? +ticketId : undefined);
  }
}

