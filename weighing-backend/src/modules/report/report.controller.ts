import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportService } from './report.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportController {
  constructor(private reportService: ReportService) {}

  @Get('daily')
  getDailyReport(@Query('date') date: string) {
    return this.reportService.getDailyReport(new Date(date));
  }

  @Get('monthly')
  getMonthlyReport(@Query('year') year: string, @Query('month') month: string) {
    return this.reportService.getMonthlyReport(+year, +month);
  }

  @Get('customer')
  getCustomerReport(
    @Query('customerId') customerId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.reportService.getCustomerReport(
      +customerId,
      new Date(from),
      new Date(to),
    );
  }
}

