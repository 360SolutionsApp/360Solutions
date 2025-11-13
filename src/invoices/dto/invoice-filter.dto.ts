/* eslint-disable prettier/prettier */
import { PaginationDto } from 'src/helpers/pagination.dto';

export class InvoiceFilterDto extends PaginationDto {
    collaboratorName?: string;
    clientName?: string;
    invoiceNumber?: string;
    workOrderCodePo?: string;
    sortBy?: string; // ejemplo: 'createdAt', 'totalWithSurchargesCompany'
    sortOrder?: 'asc' | 'desc';
}