import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WeighReading } from './entities/weigh-reading.entity';
import { WeighService } from './weigh.service';
import { WeighController } from './weigh.controller';
import { MqttModule } from '../mqtt/mqtt.module';
import { StationModule } from '../station/station.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WeighReading]),
    MqttModule,
    StationModule,
  ],
  controllers: [WeighController],
  providers: [WeighService],
  exports: [WeighService],
})
export class WeighModule {}

