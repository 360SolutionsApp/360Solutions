/* eslint-disable prettier/prettier */
import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  MinLength,
  IsArray,
  IsDate,
  ValidateNested,
} from 'class-validator';

export class AssignmentCostDto {
  @IsInt()
  assignmentId: number;

  @IsInt()
  @IsOptional()
  costPerHour?: number;
}

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  names: string;

  @IsString()
  @MinLength(3)
  lastNames: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  birthDate?: Date;

  @IsInt()
  @IsOptional()
  @Transform(({ value }) => (value === null ? undefined : value))
  documentTypeId?: number;

  @IsString()
  @MinLength(5)
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  documentNumber?: string;

  @IsString()
  @MinLength(7)
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  phone?: string;

  @IsOptional()
  @IsInt()
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  currentCityId?: number;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  address?: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @IsInt()
  roleId: number;

  // 👉 Asignaciones con costo
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssignmentCostDto)
  userCostPerAssignment?: AssignmentCostDto[];  
}