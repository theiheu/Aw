import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard';
import { AgentEventDto } from './dto/agent-event.dto';

@Controller('events')
@UseGuards(ApiKeyGuard)
export class EventsController {
  @Post()
  async receive(@Body() body: AgentEventDto) {
    // For now just acknowledge and optionally log
    // In the future, persist to DB or emit websocket events
    const now = new Date().toISOString();
    return { ok: true, receivedAt: now };
  }
}

