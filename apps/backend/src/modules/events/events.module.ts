import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { ApiKeyGuard } from './api-key.guard';
import { WeightGateway } from './weight.gateway';

@Module({
  controllers: [EventsController],
  providers: [ApiKeyGuard, WeightGateway],
  exports: [WeightGateway],
})
export class EventsModule {}

