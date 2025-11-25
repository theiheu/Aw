import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { TicketService } from './ticket.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketController {
  constructor(private ticketService: TicketService) {}

  @Post()
  create(@Body() createTicketDto: CreateTicketDto) {
    return this.ticketService.create(createTicketDto);
  }

  @Get()
  findAll(
    @Query('stationId') stationId?: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const filters: any = {};

    if (stationId) filters.stationId = +stationId;
    if (status) filters.status = status;
    if (from && to) {
      filters.from = new Date(from);
      filters.to = new Date(to);
    }

    return this.ticketService.findAll(filters);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ticketService.findOne(+id);
  }

  @Post(':id/weigh-in')
  weighIn(
    @Param('id') id: string,
    @Body() body: { weighInWeight: number },
    @Request() req,
  ) {
    return this.ticketService.weighIn(+id, body.weighInWeight, req.user.id);
  }

  @Post(':id/weigh-out')
  weighOut(
    @Param('id') id: string,
    @Body() body: { weighOutWeight: number },
    @Request() req,
  ) {
    return this.ticketService.weighOut(+id, body.weighOutWeight, req.user.id);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.ticketService.cancel(+id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateTicketDto: UpdateTicketDto) {
    return this.ticketService.update(+id, updateTicketDto);
  }
}

