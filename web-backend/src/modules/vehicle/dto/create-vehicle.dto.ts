import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateVehicleDto {
  @IsString()
  @IsNotEmpty()
  plateNumber: string;

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

