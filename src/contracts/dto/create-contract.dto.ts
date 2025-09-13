/* eslint-disable prettier/prettier */
import { IsDate, IsDateString, IsInt, IsOptional, IsString } from "class-validator";

export class CreateContractDto {
    @IsOptional()
    @IsInt()    
    id?: number;

    @IsInt()
    clientId: number;

    @IsInt()
    contractCityId: number;

    @IsString()
    contractAddress: string;

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
