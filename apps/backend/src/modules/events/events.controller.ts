import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard';
import { AgentEventDto } from './dto/agent-event.dto';
import { WeightGateway } from './weight.gateway';

@Controller('events')
@UseGuards(ApiKeyGuard)
export class EventsController {
  constructor(private readonly ws: WeightGateway) {}

  @Post()
  async receive(@Body() body: AgentEventDto) {
    const now = new Date().toISOString();

    try {
      if (body.type === 'reading' && typeof body.weight === 'number') {
        this.ws.broadcastWeight(body.machineId, body.weight, body.unit || 'kg', body.timestamp);
      } else if (body.type === 'status' && body.status) {
        this.ws.broadcastStatus(body.machineId, body.status);
      } else if (body.type === 'print' && body.result) {
        this.ws.broadcastPrint(body.machineId, body.result);
      }
    } catch {}

    return { ok: true, receivedAt: now };
  }
}

