/* eslint-disable prettier/prettier */
import { IsInt, IsString, IsEmail, IsDateString, IsOptional, IsDate } from 'class-validator';

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
    cityCompany: number;

    @IsString()
    companyAddress: string;

    @IsString()
    attachedContractUrl: string;

    @IsString()
    contractCodePo: string;

    @IsInt()
    totalContractValue: number;

    @IsInt()
    administrativeDiscounts: number;

    @IsDateString()
    DateStartWork: string;

    @IsInt()
    IdUserRegistering: number;

    @IsOptional()
    @IsDate()
    createdAt?: Date;

    @IsOptional()
    @IsDate()
    updatedAt?: Date;
}
