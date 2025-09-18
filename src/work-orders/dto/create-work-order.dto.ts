/* eslint-disable prettier/prettier */
import { IsInt, IsNotEmpty, IsArray, IsOptional, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum WorkOrderStatus {
    PENDING = 'PENDING',
    RUNNING = 'RUNNING',
    CLOSED = 'CLOSED',
    CANCELED = 'CANCELED',
}

class AssignmentQuantityDto {
    @IsInt()
    @IsNotEmpty()
    assignmentId: number;

    @IsInt()
    @IsNotEmpty()
    quantityWorkers: number;
}

export class CreateWorkOrderDto {
    @IsInt()
    @IsNotEmpty()
    ContractClientId: number;

    @IsEnum(WorkOrderStatus)
    @IsOptional()
    workOrderStatus?: WorkOrderStatus;

    @IsInt()
    @IsNotEmpty()
    supervisorUserId: number;

    // 🚨 este ya no será necesario si unificamos la entrada en assignmentQuantities
    // pero puedes dejarlo si quieres soportar ambas formas
    @IsArray()
    @IsOptional()
    assignmentIds?: number[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AssignmentQuantityDto)
    @IsOptional()
    assignmentQuantities?: AssignmentQuantityDto[];
}
