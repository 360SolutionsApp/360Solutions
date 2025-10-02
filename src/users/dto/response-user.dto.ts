/* eslint-disable prettier/prettier */
import { Expose, Type } from 'class-transformer';
import {
    IsDate,
    IsEmail,
    IsOptional,
    IsString,
    MaxLength,
    ValidateNested,
    IsNumber,
} from 'class-validator';
import { CreateDocumentTypeDto } from 'src/document-types/dto/create-document-type.dto';
import { CreateRoleDto } from 'src/roles/dto/create-role.dto'; 
import { AssignmentCostDto } from './create-user.dto';

export class ResponseUserDto {
    @Expose()
    @IsOptional()
    @IsNumber()
    id?: number;

    @Expose()
    @IsEmail()
    email: string;

    @Expose()
    @IsString()
    @MaxLength(100)
    names: string;

    @Expose()
    @IsString()
    @MaxLength(100)
    lastNames: string;

    @Expose()
    @IsOptional()
    @IsDate()
    @Type(() => Date)
    birthDate?: Date;

    @Expose()
    @IsOptional()
    @IsNumber()
    documentTypeId?: number;

    @Expose()
    @IsOptional()
    @ValidateNested()
    @Type(() => CreateDocumentTypeDto)
    documentType?: CreateDocumentTypeDto;

    @Expose()
    @IsOptional()
    @IsString()
    documentNumber?: string;

    @Expose()
    @IsOptional()
    @IsString()
    currentCityId?: string;

    @Expose()
    @IsOptional()
    @IsString()
    address?: string;

    @Expose()
    @IsOptional()
    @IsString()
    phone?: string;

    @Expose()
    @IsNumber()
    roleId: number;

    @Expose()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => CreateRoleDto)
    role?: CreateRoleDto[];

    // 👉 Asignaciones con su costo
    @Expose()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => AssignmentCostDto)
    userCostPerAssignment?: AssignmentCostDto[];
}
