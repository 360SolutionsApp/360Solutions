import { Type } from 'class-transformer';
import {
  IsEmail,
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  MinLength,
  IsArray,
  IsDate,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  names: string;

  @IsString()
  @MinLength(3)
  lastNames: string;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  birthDate?: Date;

  @IsInt()
  documentTypeId: number;

  @IsString()
  @MinLength(5)
  documentNumber: string;

  @IsString()
  @MinLength(7)
  phone: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsInt()
  currentCityId?: number;

  @IsOptional()
  @IsString()
  @MinLength(10)
  address: string;

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

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  assignmentIds: number[];

  @IsOptional()
  @IsInt()
  coustPerHour?: number;
}
