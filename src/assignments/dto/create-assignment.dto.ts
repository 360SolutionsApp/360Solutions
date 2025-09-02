/* eslint-disable prettier/prettier */
import { IsOptional, IsString } from 'class-validator';

export class CreateAssignmentDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  costPerHour?: number;

  @IsString()
  assignmentType: number;
}
