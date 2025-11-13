/* eslint-disable prettier/prettier */
// create-break-point.dto.ts
import { IsInt, IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class CreateBreakPointDto {
  @IsOptional()
  @IsInt()
  userCollabId?: number;

  @IsOptional()
  @IsInt()
  checkInId?: number;

  @IsNotEmpty()
  @IsString()
  breakStartTime: string;

  @IsNotEmpty()
  @IsString()
  breakEndTime: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
