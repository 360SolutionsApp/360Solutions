/* eslint-disable prettier/prettier */
import { IsDateString, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';
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

    @IsOptional()
    @IsString()
    sortBy?: string;

    // 🔹 Filtros adicionales
    @IsString()
    @IsOptional()
    status?: string; // Estado de la orden

    // 🔹 Rango de fechas (ISO o YYYY-MM-DD)
    @IsDateString()
    @IsOptional()
    startDate?: string;

    @IsDateString()
    @IsOptional()
    endDate?: string;

    // 🔹 Rango de horas (HH:mm)
    @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
        message: 'startHour must be in HH:mm format',
    })
    @IsOptional()
    startHour?: string;

    @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
        message: 'endHour must be in HH:mm format',
    })
    
    @IsOptional()
    endHour?: string;

}
