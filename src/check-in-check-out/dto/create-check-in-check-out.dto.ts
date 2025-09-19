/* eslint-disable prettier/prettier */
// dto/create-check-in-check-out.dto.ts
import { IsInt, IsNotEmpty, IsOptional, IsString, IsEnum } from 'class-validator';

export enum CheckType {
  IN = 'IN',
  OUT = 'OUT',
}

export class CreateCheckInCheckOutDto {
  @IsInt()
  @IsNotEmpty()
  orderId: number;

  @IsInt()
  @IsNotEmpty()
  userCollabId: number;

  @IsEnum(CheckType)
  checkType: CheckType; // IN = checkIn, OUT = checkOut

  @IsString()
  @IsNotEmpty()
  time: string; // startTime o finalTime según checkType

  @IsString()
  @IsOptional()
  status?: string;

  // 👇 Ahora opcionales
  @IsString()
  @IsOptional()
  attachEvidenceOneUrl?: string;

  @IsString()
  @IsOptional()
  attachEvidenceTwoUrl?: string;
}