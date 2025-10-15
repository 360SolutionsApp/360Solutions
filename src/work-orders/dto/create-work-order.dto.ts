/* eslint-disable prettier/prettier */
import { IsInt, IsNotEmpty, IsArray, IsOptional, ValidateNested, IsEnum, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export enum WorkOrderStatus {
    PENDING = 'PENDING',
    PARTIALLY_RUNNING = 'PARTIALLY_RUNNING',
    RUNNING = 'RUNNING',
    PARTIALLY_CLOSED = 'PARTIALLY_CLOSED',
    CLOSED = 'CLOSED',
    CANCELED = 'CANCELED',
    INACTIVE = 'INACTIVE',
    DELETE = 'DELETE',
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
    @IsOptional()
    contractClientId: number;

    @IsInt()
    @IsNotEmpty()
    clientId: number;

    @IsEnum(WorkOrderStatus)
    @IsOptional()
    workOrderStatus?: WorkOrderStatus;

    @IsInt()
    @IsOptional()
    supervisorUserId: number;

    @IsOptional()
    @Type(() => Date)
    workOrderStartDate: Date;

    @IsOptional()
    @IsString()
    workOrderCodePo

    @IsOptional()
    @Type(() => Date)
    workOrderEndDate: Date;

    @IsOptional()
    @IsString()
    orderWorkHourStart: string;

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
