/* eslint-disable prettier/prettier */
import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateWorkOrderDto } from './create-work-order.dto';
import { IsInt, IsOptional } from 'class-validator';

// DTO específico para actualizar assignmentQuantities
export class UpdateAssignmentQuantityDto {
    @IsInt()
    @IsOptional()
    id?: number; // si existe → update

    @IsInt()
    @IsOptional()
    assignmentId?: number; // si no existe → create

    @IsInt()
    quantityWorkers: number;
}

// Quitamos assignmentQuantities del CreateWorkOrderDto
export class UpdateWorkOrderDto extends PartialType(
    OmitType(CreateWorkOrderDto, ['assignmentQuantities'] as const),
) {
    @IsOptional()
    assignmentQuantities?: UpdateAssignmentQuantityDto[];

    @IsOptional()
    assigmentsClientReq?: number[];
}
