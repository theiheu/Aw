import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreateVehicleDto {
  @IsString()
  @IsNotEmpty()
  plateNumber: string;

  @IsString()
  @IsOptional()
  vehicleType?: string;

  @IsString()
  @IsOptional()
  ownerName?: string;

  @IsString()
  @IsOptional()
  ownerPhone?: string;

  @IsString()
  @IsOptional()
  ownerAddress?: string;

  @IsNumber()
  @IsOptional()
  maxWeightLimit?: number;

  @IsString()
  @IsOptional()
  lastCustomerName?: string;

  @IsString()
  @IsOptional()
  lastProductName?: string;

  @IsString()
  @IsOptional()
  lastDriverName?: string;
}

