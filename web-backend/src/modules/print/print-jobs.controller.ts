import { Controller, Post, Body, Get, Param, Res, UseGuards, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrintService } from './print.service';

class CreatePrintJobDto {
  machineId: string;              // e.g., weigh1
  copies?: number;                // default 1
  printerName?: string;           // optional preferred printer
  idempotencyKey?: string;        // optional
  // Minimal ticket payload to render
  ticketId?: number;
  code?: string;
  plateNumber?: string;
  weighInWeight?: number;
  weighOutWeight?: number;
  netWeight?: number;
  direction?: string;
}

@UseGuards(JwtAuthGuard)
@Controller('print-jobs')
export class PrintJobsController {
  constructor(private readonly printService: PrintService) {}

  @Post()
  async create(@Body() body: CreatePrintJobDto) {
    if (!body || !body.machineId) throw new BadRequestException('machineId is required');
    const res = await this.printService.createPrintJobAndDispatch({
      machineId: body.machineId,
      copies: body.copies ?? 1,
      printerName: body.printerName,
      idempotencyKey: body.idempotencyKey,
      payload: {
        ticketId: body.ticketId,
        code: body.code,
        plateNumber: body.plateNumber,
        weighInWeight: body.weighInWeight,
        weighOutWeight: body.weighOutWeight,
        netWeight: body.netWeight,
        direction: body.direction,
      },
    });
    return res;
  }

  @Get(':id/pdf')
  async downloadPdf(@Param('id') id: string, @Res() res: Response) {
    const getter = this.printService.getPdfStreamByJobKey(id);
    if (!getter) {
      return res.status(404).send('Not found');
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${id}.pdf"`);
    getter(res);
  }

  @Get(':id')
  async getStatus(@Param('id') id: string) {
    return this.printService.getJobStatus(id);
  }
}







