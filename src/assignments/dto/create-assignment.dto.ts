/* eslint-disable prettier/prettier */
import { IsString } from 'class-validator';

export class CreateAssignmentDto {
  @IsString()
  title: string;

  @IsString()
  costPerHour: number;

  @IsString()
  discount: number;
}
