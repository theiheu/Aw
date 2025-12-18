import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { ApiKeyGuard } from './api-key.guard';

@Module({
  controllers: [EventsController],
  providers: [ApiKeyGuard],
})
export class EventsModule {}

