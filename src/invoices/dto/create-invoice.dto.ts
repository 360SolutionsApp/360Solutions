/* eslint-disable prettier/prettier */
// src/invoices/dto/create-invoice.dto.ts
import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateInvoiceDto {
    @IsInt()
    userId: number; // colaborador

    @IsInt()
    @IsOptional()
    orderAssignedId?: number; // workOrder.id (orden asignada)

    @IsOptional()
    @IsArray()
    workOrderId?: number[];

    @IsOptional()
    @IsString()
    invoiceNumber?: string; // opcional (si quieres controlarlo externamente)
}
