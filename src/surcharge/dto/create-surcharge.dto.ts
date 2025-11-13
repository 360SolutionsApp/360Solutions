/* eslint-disable prettier/prettier */
import { IsString, IsNotEmpty, IsNumber, IsInt, IsOptional, Min, Max } from 'class-validator';

export class CreateSurchargeDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsNumber()
    @Min(0)
    @Max(100)
    percentage: number;

    @IsInt()
    @Min(0)
    minHour: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    maxHour?: number;
}
