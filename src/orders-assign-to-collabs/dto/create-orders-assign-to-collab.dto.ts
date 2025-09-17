/* eslint-disable prettier/prettier */
export class CreateOrdersAssignToCollabDto {
    workOrderId: number;

    orderWorkDateStart: Date;
    orderWorkDateEnd: Date;

    orderWorkHourStart: string;
    orderLocationWork: string;
    orderObservations: string;

    // 👇 Array de IDs de colaboradores
    collaboratorIds: number[];
}
