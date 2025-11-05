/* eslint-disable prettier/prettier */
import { Type } from 'class-transformer';
import { IsInt, IsString, IsEmail, IsOptional, IsDate, IsArray, ValidateNested, Min } from 'class-validator';

class PriceDto {
    @IsInt()
    assignmentId: number;

    @IsInt()
    @Min(0)
    value: number;
}

export class CreateClientDto {
    @IsOptional()
    @IsInt()
    id?: number;

    @IsString()
    companyName: string;

    @IsString()
    employerIdentificationNumber: string;

    @IsEmail()
    employerEmail: string;

    @IsString()
    employerPhone: string;

    @IsString()
    representativeName: string;

    @IsInt()
    clientCityId: number;

    @IsString()
    clientAddress: string;

    @IsOptional()
    @IsDate()
    createdAt?: Date;

    @IsOptional()
    @IsDate()
    updatedAt?: Date;

    // precios por asignación al crear el cliente
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PriceDto)
    valueAssignment?: PriceDto[];
}
