/* eslint-disable prettier/prettier */
import { Type } from "class-transformer";


export class CreateOrdersAssignToCollabDto {
    workOrderId: number;

    @Type(() => Date)
    orderWorkDateStart: Date;
    @Type(() => Date)
    orderWorkDateEnd: Date;

    orderWorkHourStart: string;
    orderLocationWork: string;
    orderObservations: string;

    // 👇 Array de IDs de colaboradores
    collaboratorIds: number[];
}
