/* eslint-disable prettier/prettier */
import { PartialType } from '@nestjs/mapped-types';
import { CreateClientDto } from './create-client.dto';
import { IsArray, IsInt, IsOptional, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class UpdateClientPricePerAssignmentDto {
    @IsInt()
    assignmentId: number;

    @IsInt()
    @Min(0)
    value: number;
}

export class UpdateClientDto extends PartialType(CreateClientDto) {
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => UpdateClientPricePerAssignmentDto)
    valueAssignment?: UpdateClientPricePerAssignmentDto[];
}
