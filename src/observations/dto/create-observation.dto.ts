/* eslint-disable prettier/prettier */
import { IsString, IsNumber, IsOptional, Min, Max, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateObservationDto {
    @IsOptional()
    @IsInt({ message: 'userCollabId debe ser un número entero' })
    @Type(() => Number)
    userCollabId?: number;

    @IsOptional()
    @IsInt({ message: 'orderId debe ser un número entero' })
    @Type(() => Number)
    orderId?: number;

    @IsOptional()
    @IsInt({ message: 'clientId debe ser un número entero' })
    @Type(() => Number)
    clientId?: number;

    @IsOptional()
    @IsString({ message: 'observation debe ser una cadena de texto' })
    observation?: string;

    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 1 }, { message: 'rating debe ser un número con máximo 1 decimal' })
    @Min(0, { message: 'rating no puede ser menor a 0' })
    @Max(5, { message: 'rating no puede ser mayor a 5' })
    @Type(() => Number)
    rating?: number;
}