/* eslint-disable prettier/prettier */
import { IsInt, IsString, IsEmail, IsOptional, IsDate } from 'class-validator';

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
}
