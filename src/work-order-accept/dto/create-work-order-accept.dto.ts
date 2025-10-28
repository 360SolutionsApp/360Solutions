/* eslint-disable prettier/prettier */
import { Type } from "class-transformer";
import { IsBoolean, IsInt, IsOptional } from "class-validator";

export class CreateWorkOrderAcceptDto {
    @IsOptional()
    @IsInt({ message: 'El ID del colaborador debe ser un número entero' })
    @Type(() => Number)
    collaboratorId?: number;

    @IsOptional()
    @IsInt({ message: 'El ID de la orden de trabajo debe ser un número entero' })
    @Type(() => Number)
    workOrderId?: number;

    @IsOptional()
    @IsBoolean({ message: 'El valor de aceptación debe ser booleano (true o false)' })
    acceptWorkOrder?: boolean = false;

    @IsOptional()
    @IsBoolean({ message: 'El valor de confirmación debe ser booleano (true o false)' })
    confirmWorkOrder?: boolean = false;

    @IsOptional()
    @IsBoolean({ message: 'El valor de marcado como leído debe ser booleano (true o false)' })
    markedAtAsRead?: boolean = false;
}
