import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateStationDto {
  @IsString()
  @IsNotEmpty()
  machineId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  defaultPrinterName?: string;

  @IsOptional()
  config?: Record<string, any>;
}

