import { IsString, IsNotEmpty, IsOptional, IsPhoneNumber, IsDateString } from 'class-validator';

export class CreateDriverDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  idNumber: string; // CMND/CCCD

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  licenseNumber?: string;

  @IsDateString()
  @IsOptional()
  licenseExpireDate?: Date;

  @IsString()
  @IsOptional()
  licenseType?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}


