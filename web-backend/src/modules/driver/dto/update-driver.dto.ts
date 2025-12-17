import { PartialType } from '@nestjs/mapped-types';
import { CreateDriverDto } from './create-driver.dto';
import { IsOptional, IsBoolean } from 'class-validator';

export class UpdateDriverDto extends PartialType(CreateDriverDto) {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}


