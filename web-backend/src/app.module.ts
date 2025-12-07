import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthModule } from './modules/auth/auth.module';
import { StationModule } from './modules/station/station.module';
import { WeighModule } from './modules/weigh/weigh.module';
import { TicketModule } from './modules/ticket/ticket.module';
import { PrintModule } from './modules/print/print.module';
import { ReportModule } from './modules/report/report.module';
import { MqttModule } from './modules/mqtt/mqtt.module';
import { CustomerModule } from './modules/customer/customer.module';
import { ProductModule } from './modules/product/product.module';
import { VehicleModule } from './modules/vehicle/vehicle.module';

import { User } from './modules/auth/entities/user.entity';
import { Station } from './modules/station/entities/station.entity';
import { Ticket } from './modules/ticket/entities/ticket.entity';
import { WeighReading } from './modules/weigh/entities/weigh-reading.entity';
import { Customer } from './modules/customer/entities/customer.entity';
import { Product } from './modules/product/entities/product.entity';
import { Vehicle } from './modules/vehicle/entities/vehicle.entity';
import { Printer } from './modules/print/entities/printer.entity';
import { PrintJob } from './modules/print/entities/print-job.entity';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USER || 'weighuser',
      password: process.env.DB_PASSWORD || 'weighpass',
      database: process.env.DB_NAME || 'weighing',
      entities: [
        User,
        Station,
        Ticket,
        WeighReading,
        Customer,
        Product,
        Vehicle,
        Printer,
        PrintJob,
      ],
      synchronize: process.env.DB_SYNCHRONIZE === 'true' ? true : (process.env.NODE_ENV !== 'production'),
      logging: process.env.NODE_ENV !== 'production',
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
    AuthModule,
    StationModule,
    WeighModule,
    TicketModule,
    PrintModule,
    ReportModule,
    MqttModule,
    CustomerModule,
    ProductModule,
    VehicleModule,
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}

