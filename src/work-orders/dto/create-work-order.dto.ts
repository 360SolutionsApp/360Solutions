/* eslint-disable prettier/prettier */
import { IsInt, IsNotEmpty, IsArray, IsOptional, ValidateNested, IsEnum, IsString } from 'class-validator';
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
    @IsOptional()
    contractClientId: number;

    @IsInt()
    @IsNotEmpty()
    clientId: number;

    @IsEnum(WorkOrderStatus)
    @IsOptional()
    workOrderStatus?: WorkOrderStatus;

    @IsInt()
    @IsNotEmpty()
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
