import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class AgentEventDto {
  @IsString()
  machineId: string;

  @IsIn(['reading', 'status', 'print'])
  type: 'reading' | 'status' | 'print';

  @IsOptional()
  @IsNumber()
  weight?: number;

  @IsOptional()
  @IsString()
  unit?: string; // default 'kg'

  @IsOptional()
  @IsString()
  status?: string; // ONLINE | OFFLINE | PRINT_OK | PRINT_ERROR

  @IsOptional()
  @IsString()
  result?: string; // OK | ERROR

  @IsOptional()
  @IsString()
  timestamp?: string;

  @IsOptional()
  @IsString()
  raw?: string;
}

