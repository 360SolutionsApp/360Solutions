/* eslint-disable prettier/prettier */
import { Expose, Type } from "class-transformer";
import {
    IsDate,
    IsEmail,
    IsOptional,
    IsString,
    MaxLength,
    ValidateNested,
    IsNumber,
} from "class-validator";
import { CreateAssignmentDto } from 'src/assignments/dto/create-assignment.dto';
import { CreateDocumentTypeDto } from "src/document-types/dto/create-document-type.dto";
import { CreateRoleDto } from "src/roles/dto/create-role.dto";

export class ResponseUserDto {
    @Expose()
    @IsNumber()
    @IsOptional()
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
    @IsDate()
    @Type(() => Date)
    @IsOptional()
    birthDate?: Date;

    // 🔹 DocumentTypeId + DocumentType
    @Expose()
    @IsNumber()
    @IsOptional()
    documentTypeId?: number;

    @Expose()
    @ValidateNested({ each: true })
    @Type(() => CreateAssignmentDto)
    @IsOptional()
    Assignment?: CreateAssignmentDto[];

    @Expose()
    @ValidateNested()
    @Type(() => CreateDocumentTypeDto)
    @IsOptional()
    documentType?: CreateDocumentTypeDto;

    @Expose()
    @IsString()
    @IsOptional()
    documentNumber?: string;

    @Expose()
    @IsString()
    @IsOptional()
    currentCityId?: string;

    @Expose()
    @IsString()
    @IsOptional()
    address?: string;

    @Expose()
    @IsString()
    @IsOptional()
    phone?: string;

    // 🔹 RoleId + Role
    @Expose()
    @IsNumber()
    @IsOptional()
    roleId: number;

    @Expose()
    @ValidateNested({ each: true })
    @Type(() => CreateRoleDto)
    @IsOptional()
    role?: CreateRoleDto[];
}
