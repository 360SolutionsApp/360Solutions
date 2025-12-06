/* eslint-disable prettier/prettier */
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';
import { WorkOrderStatus } from 'src/work-orders/dto/create-work-order.dto';

export class CollaboratorAssignmentDto {
    @IsInt()
    collaboratorId: number;

    @IsArray()
    @IsInt({ each: true })
    assigmentsId: number[];
}

export class CreateOrdersAssignToCollabDto {
    @IsInt()
    workOrderId: number;

    @Type(() => Date)
    orderWorkDateStart: Date;

    @Type(() => Date)
    orderWorkDateEnd: Date;

    @IsString()
    orderWorkHourStart: string;

    @IsString()
    orderLocationWork: string;

    @IsString()
    orderObservations: string;

    @IsOptional()
    workOrderStatus?: WorkOrderStatus;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CollaboratorAssignmentDto)
    collaboratorIds: CollaboratorAssignmentDto[];
}
