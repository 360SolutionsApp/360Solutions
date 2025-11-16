/* eslint-disable prettier/prettier */
import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from 'src/helpers/pagination.dto';

export class InvoiceFilterDto extends PaginationDto {
    collaboratorName?: string;
    clientName?: string;
    invoiceNumber?: string;
    workOrderCodePo?: string;
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    @Type(() => String) // 👈 Esto es importante para la transformación
    assignmentTitles?: string[];
    sortBy?: string; // ejemplo: 'createdAt', 'totalWithSurchargesCompany'
    sortOrder?: 'asc' | 'desc';
}