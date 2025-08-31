/* eslint-disable prettier/prettier */
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationDto {
    @IsInt()
    @Type(() => Number) // fuerza la conversión a number
    @Min(1)
    @IsOptional()
    page?: number = 1;

    @IsInt()
    @Type(() => Number) // fuerza la conversión a number
    @Min(1)
    @IsOptional()
    limit?: number = 10;

    @IsString()
    @IsOptional()
    search?: string;

    @IsString()
    @IsOptional()
    orderBy?: 'asc' | 'desc' = 'desc';

    @IsString()
    @IsOptional()
    sortField?: string = 'createdAt';

    @IsOptional()
    filters?: Record<string, any>;
}
