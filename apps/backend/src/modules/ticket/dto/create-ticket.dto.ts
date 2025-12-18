import { IsNumber, IsNotEmpty, IsOptional, IsString, IsEnum } from 'class-validator';
import { TicketDirection } from '../entities/ticket.entity';

export class CreateTicketDto {
  @IsNumber()
  @IsNotEmpty()
  stationId: number;

  @IsString()
  @IsOptional()
  plateNumber?: string;

  @IsNumber()
  @IsOptional()
  customerId?: number;

  @IsNumber()
  @IsOptional()
  productId?: number;

  @IsNumber()
  @IsOptional()
  vehicleId?: number;

  @IsEnum(TicketDirection)
  @IsOptional()
  direction?: TicketDirection;

  @IsString()
  @IsOptional()
  notes?: string;
}

