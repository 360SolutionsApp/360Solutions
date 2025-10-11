/* eslint-disable prettier/prettier */
// check-in-check-out.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateCheckInCheckOutDto, CheckType } from './dto/create-check-in-check-out.dto';
import { PrismaService } from 'src/prisma.service';
import { WorkOrderStatus } from '@prisma/client';

@Injectable()
export class CheckInCheckOutService {
  constructor(private readonly prisma: PrismaService) { }

  async create(dto: CreateCheckInCheckOutDto) {
    const { checkType, orderId, userCollabId, time, status } = dto;

    // Obtenemos la orden asignada
    const assignedCollabs = await this.prisma.orderAssignToCollabs.findMany({
      where: { workOrderId: orderId },
    });

    // Obtenemos los IDs de los colaboradores asignados
    const assignedCollabsOrder = await this.prisma.workersAssignToOrder.findMany({
      where: { orderAssignToCollabId: { in: assignedCollabs.map(c => c.id) } },
      select: { collaboratorId: true },
    });

    console.log('Colaboradores asignados:', orderId, assignedCollabsOrder);

    if (checkType === CheckType.IN) {
      // Verificar si el colaborador ya hizo check-in en esta orden
      const existingCheckInForUser = await this.prisma.checkIn.findFirst({
        where: { orderId, userCollabId },
      });

      if (existingCheckInForUser) {
        throw new BadRequestException('Este colaborador ya hizo check-in en esta orden.');
      }

      // Crear registro de check-in
      const checkIn = await this.prisma.checkIn.create({
        data: {
          orderId,
          userCollabId,
          startTime: time,
          initialStatus: status,
        },
      });

      // Contar cuántos colaboradores han hecho check-in (ahora incluye al nuevo check-in)
      const checkInsCount = await this.prisma.checkIn.count({
        where: { orderId, userCollabId: { in: assignedCollabsOrder.map(c => c.collaboratorId) } },
      });

      console.log('Check-ins encontrados:', checkInsCount);

      // Comparamos si la cantidad de check-ins es igual a la cantidad de colaboradores asignados
      console.log('colaboradores que ya han hecho check-in en esta orden.', checkInsCount, assignedCollabsOrder.length);

      // Actualizar estado de la orden
      let newStatus: WorkOrderStatus;

      if (checkInsCount === assignedCollabsOrder.length) {
        newStatus = WorkOrderStatus.RUNNING; // Todos hicieron check-in
      } else {
        newStatus = WorkOrderStatus.PARTIALLY_RUNNING; // Al menos uno, pero no todos
      }

      await this.prisma.workOrder.update({
        where: { id: orderId },
        data: { workOrderStatus: newStatus },
      });

      return checkIn;
    }

    else if (checkType === CheckType.OUT) {
      // Verificar si el colaborador ya hizo check-out en esta orden
      const existingCheckOutForUser = await this.prisma.checkOut.findFirst({
        where: { orderId, userCollabId },
      });

      if (existingCheckOutForUser) {
        throw new BadRequestException('Este colaborador ya hizo check-out en esta orden.');
      }

      // Crear registro de check-out
      const checkOut = await this.prisma.checkOut.create({
        data: {
          orderId,
          userCollabId,
          finalTime: time,
          initialStatus: status,
        },
      });

      // Contar cuántos colaboradores han hecho check-out (ahora incluye al nuevo check-out)
      const checkOutsCount = await this.prisma.checkOut.count({
        where: { orderId, userCollabId: { in: assignedCollabsOrder.map(c => c.collaboratorId) } },
      });

      console.log('Check-outs encontrados:', checkOutsCount);

      // Comparamos si la cantidad de check-outs es igual a la cantidad de colaboradores asignados
      console.log('colaboradores que ya han hecho check-out en esta orden.', checkOutsCount, assignedCollabsOrder.length);

      // Actualizar estado de la orden
      let newStatus: WorkOrderStatus;

      if (checkOutsCount === assignedCollabsOrder.length) {
        newStatus = WorkOrderStatus.CLOSED; // Todos hicieron check-out
      } else {
        newStatus = WorkOrderStatus.PARTIALLY_CLOSED; // Algunos han hecho check-out, pero no todos
      }

      await this.prisma.workOrder.update({
        where: { id: orderId },
        data: { workOrderStatus: newStatus },
      });

      return checkOut;
    }


    else {
      throw new BadRequestException('Tipo de registro inválido. Use IN o OUT.');
    }
  }


  async findAll() {
    const checkIns = await this.prisma.checkIn.findMany({
      include: {
        userCollab: { select: { id: true, email: true, userDetail: true } },
        order: true,
      },
    });

    const checkOuts = await this.prisma.checkOut.findMany({
      include: {
        userCollab: { select: { id: true, email: true, userDetail: true } },
        order: true,
      },
    });

    return [
      ...checkIns.map((ci) => ({
        id: ci.id,
        type: 'IN',
        orderId: ci.orderId,
        userCollab: ci.userCollab,
        time: ci.startTime,
        status: ci.initialStatus,
        attachEvidenceOneUrl: ci.attachEvidenceOneUrl, // <- se siguen mostrando porque el otro servicio los guarda
        attachEvidenceTwoUrl: ci.attachEvidenceTwoUrl,
        createdAt: ci.createdAt,
      })),
      ...checkOuts.map((co) => ({
        id: co.id,
        type: 'OUT',
        orderId: co.orderId,
        userCollab: co.userCollab,
        time: co.finalTime,
        status: co.initialStatus,
        attachEvidenceOneUrl: co.attachEvidenceOneUrl,
        attachEvidenceTwoUrl: co.attachEvidenceTwoUrl,
        createdAt: co.createdAt,
      })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findOne(id: number) {
    const checkIn = await this.prisma.checkIn.findUnique({
      where: { id },
      include: {
        userCollab: { select: { id: true, email: true, userDetail: true } },
        order: true,
      },
    });

    if (checkIn) {
      return {
        id: checkIn.id,
        type: 'IN',
        orderId: checkIn.orderId,
        userCollab: checkIn.userCollab,
        time: checkIn.startTime,
        status: checkIn.initialStatus,
        attachEvidenceOneUrl: checkIn.attachEvidenceOneUrl,
        attachEvidenceTwoUrl: checkIn.attachEvidenceTwoUrl,
        createdAt: checkIn.createdAt,
      };
    }

    const checkOut = await this.prisma.checkOut.findUnique({
      where: { id },
      include: {
        userCollab: { select: { id: true, email: true, userDetail: true } },
        order: true,
      },
    });

    if (checkOut) {
      return {
        id: checkOut.id,
        type: 'OUT',
        orderId: checkOut.orderId,
        userCollab: checkOut.userCollab,
        time: checkOut.finalTime,
        status: checkOut.initialStatus,
        attachEvidenceOneUrl: checkOut.attachEvidenceOneUrl,
        attachEvidenceTwoUrl: checkOut.attachEvidenceTwoUrl,
        createdAt: checkOut.createdAt,
      };
    }

    throw new BadRequestException(`No se encontró registro con id ${id}`);
  }

  // Obtener el CheckIn/Checkout según el id de la orden de trabajo
  async findByOrderId(orderId: number, userId: number) {

    // Obtenemos el check-in de este usuario en esta orden
    const checkIn = await this.prisma.checkIn.findFirst({
      where: { orderId, userCollabId: userId },
      include: {
        userCollab: { select: { id: true, email: true, userDetail: true } },
        order: true,
      },
    });

    // Obtenemos el check-out de este usuario en esta orden
    const checkOut = await this.prisma.checkOut.findFirst({
      where: { orderId, userCollabId: userId },
      include: {
        userCollab: { select: { id: true, email: true, userDetail: true } },
        order: true,
      },
    });

    // Retornamos ambos registros (puede que uno sea null si no se ha hecho)
    return {
      checkIn: checkIn,
      checkOut: checkOut,
    };

  }

  // Listar todas las ordenes con sus respectivos colaboradores que han hecho checkin y los que no
  // y ordenar las ordenes por fecha de inicio descendente con páginación 
  async listOrdersWithCheckInStatus(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const workOrders = await this.prisma.workOrder.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        orderAssignToCollab: {
          include: {
            worksAssigned: {
              include: {
                collaborator: {
                  select: {
                    id: true,
                    email: true,
                    userDetail: true,
                  },
                },
              },
            },
          },
        },
        checkIn: {
          select: {
            userCollabId: true,
          },
        },
      },
    });

    // Map workOrders to include check-in status for each collaborator
    for (const wo of workOrders) {
      (wo as any).collaborators = [];
      const checkedInIds = wo.checkIn.map((ci) => ci.userCollabId);
      for (const assign of wo.orderAssignToCollab) {
        for (const wa of assign.worksAssigned) {
          (wo as any).collaborators.push({
            ...wa.collaborator,
            hasCheckedIn: checkedInIds.includes(wa.collaborator.id),
          });
        }
      }
      // Optionally, remove raw relations to clean up response
      delete wo.orderAssignToCollab;
      delete wo.checkIn;
    }
    return {
      workOrders,
      pagination: {
        page,
        limit,
        total: await this.prisma.workOrder.count(),
      },
    };
  }


  // Listar los colaboradores asignados a una orden con su estado de check-in y check-out
  // Listar los colaboradores asignados así no hayan hecho check-in o check-out pero mostrar el estado de la orden
  async listCollaboratorsWithCheckInStatus(workOrderId: number) {
    // Obtener la orden de trabajo con sus colaboradores asignados
    const workOrder = await this.prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: {
        orderAssignToCollab: {
          include: {
            worksAssigned: {
              include: {
                collaborator: {
                  select: {
                    id: true,
                    email: true,
                    userDetail: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!workOrder) {
      throw new BadRequestException(`No se encontró la orden de trabajo con id ${workOrderId}`);
    }

    // Map workOrder to include check-in and check-out status for each collaborator
    for (const assign of workOrder.orderAssignToCollab) {
      for (const wa of assign.worksAssigned) {
        // Buscar si este colaborador tiene check-in
        const checkIn = await this.prisma.checkIn.findFirst({
          where: { orderId: workOrderId, userCollabId: wa.collaborator.id },
        });
        // Buscar si este colaborador tiene check-out
        const checkOut = await this.prisma.checkOut.findFirst({
          where: { orderId: workOrderId, userCollabId: wa.collaborator.id },
        });
        (wa.collaborator as any).hasCheckedIn = !!checkIn;
        (wa.collaborator as any).hasCheckedOut = !!checkOut;
      }
    }
    return workOrder;
  }

  async update(
    id: number,
    dto: {
      checkType: CheckType; // 'IN' o 'OUT'
      time?: string;
      status?: string;
      attachEvidenceOneUrl?: string;
      attachEvidenceTwoUrl?: string;
    },
  ) {
    const { checkType, time, status, attachEvidenceOneUrl, attachEvidenceTwoUrl } = dto;

    if (!checkType) {
      throw new BadRequestException('Debe especificar el tipo de registro: IN o OUT.');
    }

    if (checkType === CheckType.IN) {
      const existingCheckIn = await this.prisma.checkIn.findUnique({
        where: { id },
      });

      if (!existingCheckIn) {
        throw new BadRequestException(`No se encontró un check-in con id ${id}.`);
      }

      const updatedCheckIn = await this.prisma.checkIn.update({
        where: { id },
        data: {
          ...(time && { startTime: time }),
          ...(status && { initialStatus: status }),
          ...(attachEvidenceOneUrl && { attachEvidenceOneUrl }),
          ...(attachEvidenceTwoUrl && { attachEvidenceTwoUrl }),
        },
        include: {
          userCollab: { select: { id: true, email: true, userDetail: true } },
          order: true,
        },
      });

      return {
        message: 'Check-in actualizado correctamente.',
        updatedCheckIn,
      };
    }

    if (checkType === CheckType.OUT) {
      const existingCheckOut = await this.prisma.checkOut.findUnique({
        where: { id },
      });

      if (!existingCheckOut) {
        throw new BadRequestException(`No se encontró un check-out con id ${id}.`);
      }

      const updatedCheckOut = await this.prisma.checkOut.update({
        where: { id },
        data: {
          ...(time && { finalTime: time }),
          ...(status && { initialStatus: status }),
          ...(attachEvidenceOneUrl && { attachEvidenceOneUrl }),
          ...(attachEvidenceTwoUrl && { attachEvidenceTwoUrl }),
        },
        include: {
          userCollab: { select: { id: true, email: true, userDetail: true } },
          order: true,
        },
      });

      return {
        message: 'Check-out actualizado correctamente.',
        updatedCheckOut,
      };
    }

    throw new BadRequestException('Tipo de registro inválido. Use IN o OUT.');
  }


  async remove(id: number) {
    await this.prisma.checkIn.deleteMany({ where: { id } });
    await this.prisma.checkOut.deleteMany({ where: { id } });
    return { message: `Registro ${id} eliminado` };
  }
}
