/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateWorkOrderAcceptDto } from './dto/create-work-order-accept.dto';
import { UpdateWorkOrderAcceptDto } from './dto/update-work-order-accept.dto';
import { PrismaService } from 'src/prisma.service';
import { OrderRejectionMailerService } from './report-update-accept-collab.service';
import { WorkOrderAcceptGateway } from './orders.gateway';
import { PaginationDto } from 'src/helpers/pagination.dto';

@Injectable()
export class WorkOrderAcceptService {

  constructor(
    private readonly prisma: PrismaService,
    private readonly orderRejectionMailer: OrderRejectionMailerService,
    private readonly gateway: WorkOrderAcceptGateway
  ) { }

  async create(createWorkOrderAcceptDto: CreateWorkOrderAcceptDto) {
    const assignmentAccept = await this.prisma.orderAcceptByCollab.create({ data: createWorkOrderAcceptDto });

    // Emitir actualización
    const pendingOrders = await this.findAllPendingByCollaborator(createWorkOrderAcceptDto.collaboratorId);
    this.gateway.notifyPendingOrders(createWorkOrderAcceptDto.collaboratorId, pendingOrders);

    return assignmentAccept;
  }

  // retornar todas las ordenes aceptadas y no aceptadas
  async findAll(params?: PaginationDto) {
    // Verificar si hay parámetros de paginación válidos
    const page = params?.page ? Number(params.page) : undefined;
    const limit = params?.limit ? Number(params.limit) : undefined;

    // Si no hay paginación → devolver todos los registros
    if (!page || !limit) {
      const all = await this.prisma.orderAcceptByCollab.findMany({
        include: {
          collaborator: {
            select: {
              id: true,
              email: true,
              userDetail: {
                select: {
                  names: true,
                  lastNames: true,
                  phone: true,
                },
              },
            },
          },
          workOrder: {
            select: {
              id: true,
              workOrderCodePo: true,
              workOrderStatus: true,
              workOrderStartDate: true,
              workOrderEndDate: true,
              clientCompany: {
                select: {
                  id: true,
                  companyName: true,
                },
              },
              orderAssignToCollab: {
                select: {
                  id: true,
                  orderWorkDateStart: true,
                  orderWorkDateEnd: true,
                  orderWorkHourStart: true,
                  orderLocationWork: true,
                  orderObservations: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return all;
    }

    // Con paginación
    const skip = (page - 1) * limit;

    const total = await this.prisma.orderAcceptByCollab.count();

    const data = await this.prisma.orderAcceptByCollab.findMany({
      skip,
      take: limit,
      include: {
        collaborator: {
          select: {
            id: true,
            email: true,
            userDetail: {
              select: {
                names: true,
                lastNames: true,
                phone: true,
              },
            },
          },
        },
        workOrder: {
          select: {
            id: true,
            workOrderCodePo: true,
            workOrderStatus: true,
            workOrderStartDate: true,
            workOrderEndDate: true,
            clientCompany: {
              select: {
                id: true,
                companyName: true,
              },
            },
            orderAssignToCollab: {
              select: {
                id: true,
                orderWorkDateStart: true,
                orderWorkDateEnd: true,
                orderWorkHourStart: true,
                orderLocationWork: true,
                orderObservations: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }


  async findAllNotAccepted(params?: PaginationDto) {
    const page = params?.page ? Number(params.page) : undefined;
    const limit = params?.limit ? Number(params.limit) : undefined;

    // 🔹 Filtro base
    const whereCondition = { acceptWorkOrder: false };

    // 🔹 Si no hay paginación → devolver todo el listado
    if (!page || !limit) {
      const notAccepted = await this.prisma.orderAcceptByCollab.findMany({
        where: whereCondition,
        include: {
          collaborator: {
            select: {
              id: true,
              email: true,
              userDetail: {
                select: {
                  names: true,
                  lastNames: true,
                  phone: true,
                },
              },
            },
          },
          workOrder: {
            select: {
              id: true,
              workOrderCodePo: true,
              workOrderStatus: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return notAccepted;
    }

    // 🔹 Con paginación → calcular skip y total
    const skip = (page - 1) * limit;

    const total = await this.prisma.orderAcceptByCollab.count({
      where: whereCondition,
    });

    const data = await this.prisma.orderAcceptByCollab.findMany({
      where: whereCondition,
      skip,
      take: limit,
      include: {
        collaborator: {
          select: {
            id: true,
            email: true,
            userDetail: {
              select: {
                names: true,
                lastNames: true,
                phone: true,
              },
            },
          },
        },
        workOrder: {
          select: {
            id: true,
            workOrderCodePo: true,
            workOrderStatus: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }


  async findAllPendingByCollaborator(collaboratorId: number) {
    // 1️⃣ Buscar todas las órdenes asignadas al colaborador
    const assignedOrders = await this.prisma.workersAssignToOrder.findMany({
      where: { collaboratorId },
      select: {
        orderAssignToCollab: {
          select: {
            orderWorkDateStart: true,
            orderWorkHourStart: true,
            orderLocationWork: true,
            worksAssigned: {
              where: { collaboratorId },
              select: {
                assignment: { select: { id: true, title: true } },
              },
            },
            workOrder: {
              select: {
                id: true,
                workOrderCodePo: true,
                workOrderStatus: true,
                clientCompany: {
                  select: { id: true, companyName: true },
                },
              },
            },
          },
        },
      },
    });

    if (assignedOrders.length === 0) return [];

    // 2️⃣ Obtener las órdenes registradas en orderAcceptByCollab (solo pendientes)
    const pendingInDb = await this.prisma.orderAcceptByCollab.findMany({
      where: {
        collaboratorId,
        acceptWorkOrder: false,
      },
      select: {
        id: true,          // 👈 agregamos el id
        workOrderId: true, // para vincular con el resto
      },
      distinct: ['workOrderId'], // evita duplicados
    });

    if (pendingInDb.length === 0) return [];

    // Creamos un mapa rápido para buscar el id por workOrderId
    const pendingMap = new Map(
      pendingInDb.map((o) => [o.workOrderId, o.id])
    );

    const pendingIds = Array.from(pendingMap.keys());

    // 3️⃣ Filtrar solo las órdenes que existen en orderAcceptByCollab y aún no han sido aceptadas
    const pendingOrders = assignedOrders
      .filter(
        (o) =>
          o.orderAssignToCollab?.workOrder &&
          pendingIds.includes(o.orderAssignToCollab.workOrder.id),
      )
      .map((o) => {
        const assign = o.orderAssignToCollab;
        const workOrderId = assign.workOrder.id;

        return {
          id: pendingMap.get(workOrderId), // 👈 id del registro en orderAcceptByCollab
          workOrderId,
          workOrderCodePo: assign.workOrder.workOrderCodePo,
          workOrderStatus: assign.workOrder.workOrderStatus,
          companyName: assign.workOrder.clientCompany?.companyName ?? null,
          workLocation: assign.orderLocationWork,
          workStartDate: assign.orderWorkDateStart,
          workStartHour: assign.orderWorkHourStart,
          assignments: assign.worksAssigned
            .map((a) => a.assignment?.title)
            .filter(Boolean),
        };
      });

    // 4️⃣ Eliminar duplicados agrupando por workOrderId
    const uniqueOrders = Array.from(
      new Map(pendingOrders.map((o) => [o.workOrderId, o])).values(),
    );

    return uniqueOrders;
  }


  async update(id: number, updateWorkOrderAcceptDto: UpdateWorkOrderAcceptDto) {
    const existing = await this.prisma.orderAcceptByCollab.findUnique({ where: { id } });
    if (!existing) throw new BadRequestException('Registro no encontrado');

    const collaboratorId = existing.collaboratorId;

    // 1️⃣ Si el colaborador rechaza la orden
    if (updateWorkOrderAcceptDto.acceptWorkOrder === false) {
      await this.prisma.workersAssignToOrder.deleteMany({
        where: {
          collaboratorId: existing.collaboratorId,
          orderAssignToCollab: { workOrderId: existing.workOrderId },
        },
      });

      // Enviar correo de notificación
      if (existing.workOrderId && existing.collaboratorId) {
        await this.orderRejectionMailer.sendOrderRejectionNotice(
          existing.workOrderId,
          existing.collaboratorId,
        );
      }

      const updated = await this.prisma.orderAcceptByCollab.update({
        where: { id },
        data: updateWorkOrderAcceptDto,
      });

      // Consultar las órdenes pendientes actualizadas
      const pendingOrders = await this.findAllPendingByCollaborator(collaboratorId);

      // Notificar al colaborador
      this.gateway.notifyPendingOrders(collaboratorId, pendingOrders);
      // 🔥 Emitir notificaciones de actualización
      this.gateway.notifyOrderAccepted(pendingOrders);
      this.gateway.notifyOrdersUpdate(); // notifica a quienes escuchan listas

      return {
        message: `El colaborador ${existing.collaboratorId} fue removido de la orden ${existing.workOrderId} por rechazarla.`,
        updated,
      };
    }

    // 2️⃣ Si la orden fue aceptada o no cambió
    return this.prisma.orderAcceptByCollab.update({
      where: { id },
      data: updateWorkOrderAcceptDto,
    });
  }

  // Actualizamos la orden como leída
  async markAsRead(id: number) {
    const existing = await this.prisma.orderAcceptByCollab.findUnique({ where: { id } });
    if (!existing) throw new BadRequestException('Registro no encontrado');

    return this.prisma.orderAcceptByCollab.update({
      where: { id },
      data: { markedAtAsRead: true },
    });
  }

  // Obtener todas las órdenes NO confirmadas (confirmWorkOrder = false)
  // con detalle del colaborador y de la orden, con paginación opcional
  async findAllNotConfirmed(params?: PaginationDto) {
    const page = params?.page ? Number(params.page) : undefined;
    const limit = params?.limit ? Number(params.limit) : undefined;

    // 🔹 Filtro base
    const whereCondition = { confirmWorkOrder: false, markedAtAsRead: false };

    // 🔹 Sin paginación
    if (!page || !limit) {
      const notConfirmed = await this.prisma.orderAcceptByCollab.findMany({
        where: whereCondition,
        include: {
          collaborator: {
            select: {
              id: true,
              email: true,
              userDetail: {
                select: {
                  names: true,
                  lastNames: true,
                  phone: true,
                },
              },
            },
          },
          workOrder: {
            select: {
              id: true,
              workOrderCodePo: true,
              workOrderStatus: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return notConfirmed;
    }

    // 🔹 Con paginación
    const skip = (page - 1) * limit;

    const total = await this.prisma.orderAcceptByCollab.count({
      where: whereCondition,
    });

    const data = await this.prisma.orderAcceptByCollab.findMany({
      where: whereCondition,
      skip,
      take: limit,
      include: {
        collaborator: {
          select: {
            id: true,
            email: true,
            userDetail: {
              select: {
                names: true,
                lastNames: true,
                phone: true,
              },
            },
          },
        },
        workOrder: {
          select: {
            id: true,
            workOrderCodePo: true,
            workOrderStatus: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async remove(collaboratorId: number, workOrderId: number) {
    // 1️⃣ Buscar el registro de aceptación
    const record = await this.prisma.orderAcceptByCollab.findFirst({
      where: { collaboratorId, workOrderId },
    });

    if (!record) {
      throw new BadRequestException(
        'No existe una relación de aceptación para este colaborador y orden.',
      );
    }

    // 2️⃣ Si NO aceptó, eliminamos su asignación
    if (!record.acceptWorkOrder) {
      await this.prisma.workersAssignToOrder.deleteMany({
        where: {
          collaboratorId,
          orderAssignToCollab: {
            workOrder: {
              id: workOrderId,
            },
          },
        },
      });

      return {
        message: `El colaborador ${collaboratorId} fue removido de la orden ${workOrderId} por no aceptarla.`,
      };
    }

    // Emitir actualización
    const pendingOrders = await this.findAllPendingByCollaborator(collaboratorId);
    this.gateway.notifyPendingOrders(collaboratorId, pendingOrders);

    // 4️⃣ Si ya aceptó, no se elimina
    return {
      message: `El colaborador ${collaboratorId} ya aceptó la orden ${workOrderId}, no se puede eliminar.`,
    };
  }
}
