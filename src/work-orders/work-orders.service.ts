/* eslint-disable prettier/prettier */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateWorkOrderDto, WorkOrderStatus } from './dto/create-work-order.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';
import { PrismaService } from 'src/prisma.service';
import { PaginationDto } from 'src/helpers/pagination.dto';
import { ReportWorkOrderMailerService } from './report-mail.service';

@Injectable()
export class WorkOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reportEmailService: ReportWorkOrderMailerService
  ) { }

  // Crear una nueva WorkOrder
  async create(dto: CreateWorkOrderDto, userEmail: string) {
    // Buscar usuario que crea la orden
    const existingUser = await this.prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true, email: true },
    });
    if (!existingUser) throw new NotFoundException('El usuario no existe');

    // Listar todos los usuarios de RH
    const rhUsers = await this.prisma.user.findMany({
      where: { roleId: 2 },
      select: { id: true, email: true },
    });

    // Preparar datos de creación
    const dataToCreate: any = {
      clientId: dto.clientId ?? null,
      userEmailRegistry: userEmail,
      workOrderStatus: dto.workOrderStatus ?? WorkOrderStatus.PENDING,
      workOrderStartDate: dto.workOrderStartDate ?? null,
      workOrderEndDate: dto.workOrderEndDate ?? null,
      orderWorkHourStart: dto.orderWorkHourStart ?? null,
      workOrderCodePo: dto.workOrderCodePo ?? null,
      assigmentsClientReq: dto.assignmentIds
        ? { connect: dto.assignmentIds.map((id) => ({ id })) }
        : undefined,
      assignmentQuantities: dto.assignmentQuantities
        ? {
          create: dto.assignmentQuantities.map((q) => ({
            assignmentId: q.assignmentId,
            quantityWorkers: q.quantityWorkers,
          })),
        }
        : undefined,
    };

    // Agregar supervisor solo si se pasó en dto
    if (dto.supervisorUserId) {
      dataToCreate.supervisorUserId = dto.supervisorUserId;
    }

    // Crear orden de trabajo
    const workOrder = await this.prisma.workOrder.create({
      data: dataToCreate,
      include: {
        clientCompany: true,
        assigmentsClientReq: true,
        supervisorUser: { select: { id: true, email: true, userDetail: true } },
        assignmentQuantities: {
          include: {
            assignment: { select: { id: true, title: true, costPerHour: true } },
          },
        },
      },
    });

    // 5️⃣ Preparar lista de correos
    const emailsToNotify = new Set<string>();

    // 📩 Siempre incluir el usuario que creó la orden
    emailsToNotify.add(existingUser.email);

    // 📩 Agregar RH solo si existen
    if (rhUsers.length > 0) {
      rhUsers.forEach((u) => emailsToNotify.add(u.email));
    }

    // 📩 Agregar supervisor si existe
    if (workOrder.supervisorUser?.email) {
      emailsToNotify.add(workOrder.supervisorUser.email);
    }

    // 🧩 Preparar datos para el correo
    /*const assignments = workOrder.assignmentQuantities.map((q) => ({
      name: q.assignment.title,
      quantity: q.quantityWorkers,
    }));

    const companyName = workOrder.clientCompany?.companyName ?? 'N/A';
    const workOrderCode = workOrder.workOrderCodePo ?? 'N/A';

    // 🚀 Enviar correo de forma no bloqueante (try/catch interno)
    const recipients = Array.from(emailsToNotify);

    if (recipients.length > 0) {
      this.reportEmailService
        .sendWorkOrder(recipients, workOrderCode, companyName, assignments)
        .catch((err) =>
          console.error('⚠️ Error al enviar correo (no bloqueante):', err),
        );
    } else {
      console.log('ℹ️ No hay destinatarios para enviar correo de WorkOrder.');
    }*/

    return workOrder;
  }

  // Obtener todas las WorkOrders
  async findAll(params: PaginationDto, user: any) {
    const getUser = await this.prisma.user.findUnique({
      where: { email: user.email },
      select: { id: true, roleId: true }, // 🔒
    });
    if (!getUser) throw new NotFoundException('Usuario no encontrado');

    const { id: userId, roleId } = getUser;

    const page = params.page ? Number(params.page) : null;
    const limit = params.limit ? Number(params.limit) : null;
    const skip = page && limit ? (page - 1) * limit : undefined;

    let whereCondition: any = {};

    if (roleId === 5) {
      whereCondition = {
        orderAssignToCollab: {
          some: { worksAssigned: { some: { collaboratorId: userId } } },
        },
        workOrderStatus: { not: 'DELETE' },
        orderAcceptByCollab: {
          some: {
            collaboratorId: userId,
            OR: [
              { acceptWorkOrder: { equals: true } }, // ✅ aceptadas
              { acceptWorkOrder: { equals: null } }, // ✅ sin valor (antiguas)
            ],
          },
        },
      };
    } else {
      whereCondition = { workOrderStatus: { not: 'DELETE' } };
    }

    const commonInclude = {
      clientCompany: true,

      // 🔒 SupervisorUser sin password
      supervisorUser: {
        select: {
          id: true,
          email: true,
          roleId: true,
          userDetail: true, // ⬅️ Incluye el detalle del supervisor
        },
      },

      assignmentQuantities: {
        include: {
          assignment: true,
        },
      },

      orderAssignToCollab: {
        include: {
          worksAssigned: {
            include: {
              collaborator: {
                select: { id: true, email: true }, // 🔒
              },
              assignment: {
                select: {
                  id: true,
                  title: true,
                  costPerHour: true,
                  assignmentType: true,
                },
              },
            },
          },
        },
      },
    };

    if (page && limit) {
      const [orders, total] = await this.prisma.$transaction([
        this.prisma.workOrder.findMany({
          where: whereCondition,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: commonInclude,
        }),
        this.prisma.workOrder.count({ where: whereCondition }),
      ]);

      return {
        data: orders,
        meta: { total, page, lastPage: Math.ceil(total / limit) },
      };
    }

    return this.prisma.workOrder.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'desc' },
      include: commonInclude,
    });
  }


  // Obtener una WorkOrder por ID
  async findOne(id: number) {
    const workOrderAssignments = await this.prisma.orderAssignToCollabs.findMany({
      where: { workOrderId: id },
      include: {
        worksAssigned: {
          include: {
            collaborator: {
              select: {
                id: true,
                email: true,
                userDetail: true, // opcional si quieres ver más datos
              },
            },
            assignment: {
              select: {
                id: true,
                title: true,
                costPerHour: true,
              },
            },
          },
        },
      },
    });

    const workOrder = await this.prisma.workOrder.findUnique({
      where: { id },
      include: {
        clientCompany: true,
        supervisorUser: {
          select: {
            id: true,
            email: true,
            roleId: true,
            userDetail: true, // 🔒
          },
        },
        assigmentsClientReq: true,
        assignmentQuantities: {
          include: {
            assignment: { select: { id: true, title: true, costPerHour: true } },
          },
        },
      },
    });

    if (!workOrder) throw new NotFoundException(`WorkOrder con ID ${id} no encontrada`);

    return { ...workOrder, orderDetail: workOrderAssignments[0] };
  }

  // Actualizar WorkOrder
  async update(id: number, dto: UpdateWorkOrderDto, userEmail: string) {
    // 🔎 Verificar usuario
    const user = await this.prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('El usuario no existe');

    const {
      workOrderStatus,
      assignmentQuantities,
      assigmentsClientReq,
      workOrderStartDate,
      workOrderEndDate,
      orderWorkHourStart,
      workOrderCodePo,
      clientId,
    } = dto;

    try {
      // 1️⃣ Buscar si existen asignaciones relacionadas
      const existingAssignments = await this.prisma.orderAssignToCollabs.findMany({
        where: { workOrderId: id },
        select: { id: true },
      });

      // 2️⃣ Ejecutar la actualización de la orden
      const updatedWorkOrder = await this.prisma.workOrder.update({
        where: { id },
        data: {
          ...(clientId !== undefined && { clientId }),
          ...(workOrderStatus !== undefined && { workOrderStatus }),
          ...(workOrderStartDate !== undefined && { workOrderStartDate }),
          ...(workOrderEndDate !== undefined && { workOrderEndDate }),
          ...(orderWorkHourStart !== undefined && { orderWorkHourStart }),
          ...(workOrderCodePo !== undefined && { workOrderCodePo }),

          // Reemplaza completamente las asignaciones de cliente
          ...(assigmentsClientReq && {
            assigmentsClientReq: {
              set: assigmentsClientReq.map(id => ({ id })),
            },
          }),

          // Reemplaza completamente las cantidades de asignaciones
          ...(assignmentQuantities && {
            assignmentQuantities: {
              deleteMany: {}, // borra todas las existentes
              create: assignmentQuantities.map(a => ({
                assignmentId: a.assignmentId,
                quantityWorkers: a.quantityWorkers,
              })),
            },
          }),
        },
        include: {
          clientCompany: true,
          assigmentsClientReq: true,
          assignmentQuantities: {
            include: {
              assignment: {
                select: { id: true, title: true, costPerHour: true },
              },
            },
          },
        },
      });

      // 3️⃣ Si existen asignaciones, actualízalas en paralelo
      if (existingAssignments.length > 0) {
        await this.prisma.orderAssignToCollabs.updateMany({
          where: { workOrderId: id },
          data: {
            ...(workOrderStatus !== undefined && { workOrderStatus }),
            ...(orderWorkHourStart !== undefined && { orderWorkHourStart }),
            ...(workOrderStartDate !== undefined && { orderWorkDateStart: workOrderStartDate }),
            ...(workOrderEndDate !== undefined && { orderWorkDateEnd: workOrderEndDate }),
          },
        });
      }

      return updatedWorkOrder;
    } catch (error) {
      throw new BadRequestException(
        `Error actualizando la orden de trabajo: ${error.message}`,
      );
    }
  }

  // Actualizar solo el estado de la WorkOrder a "DELETE"
  async remove(id: number, userEmail: string) {
    // Validar usuario
    const existingUser = await this.prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true, email: true },
    });
    if (!existingUser) {
      throw new NotFoundException('El usuario no existe');
    }

    // Buscar la orden
    const workOrder = await this.prisma.workOrder.findUnique({ where: { id } });
    if (!workOrder) {
      throw new NotFoundException(`WorkOrder con ID ${id} no encontrada`);
    }

    // Si está pendiente → eliminar definitivamente
    if (workOrder.workOrderStatus === 'PENDING') {
      const deleted = await this.removeDefinitive(id, userEmail);
      return {
        message: `WorkOrder con ID ${id} eliminada definitivamente.`,
        deletedOrder: deleted,
      };
    }

    // Si no está pendiente → marcar como eliminada
    const updated = await this.prisma.workOrder.update({
      where: { id },
      data: { workOrderStatus: 'DELETE' },
    });

    return {
      message: `WorkOrder con ID ${id} marcada como eliminada.`,
      updatedOrder: updated,
    };
  }

  // Eliminar definitivamente una WorkOrder
  async removeDefinitive(id: number, userEmail: string) {
    // Validar usuario
    const existingUser = await this.prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true, email: true },
    });
    if (!existingUser) {
      throw new NotFoundException('El usuario no existe');
    }

    // Verificar que la orden exista
    const existing = await this.prisma.workOrder.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`WorkOrder con ID ${id} no encontrada`);
    }

    // Eliminar definitivamente y retornar la orden eliminada
    const deletedOrder = await this.prisma.workOrder.delete({ where: { id } });

    return deletedOrder;
  }

}
