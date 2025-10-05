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
    const existingUser = await this.prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true, email: true }, // 🔒 no trae password
    });
    if (!existingUser) throw new NotFoundException('El usuario no existe');

    // Listar todos los usuarios de RH
    const rhUsers = await this.prisma.user.findMany({
      where: { roleId: 2 },
      select: { id: true, email: true, userDetail: true }, // 🔒 no trae password
    });

    const workOrder = await this.prisma.workOrder.create({
      data: {
        clientId: dto.clientId,
        userEmailRegistry: userEmail,
        supervisorUserId: dto.supervisorUserId,
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
      },
      include: {
        clientCompany: true,
        assigmentsClientReq: true,
        supervisorUser: { select: { id: true, email: true, userDetail: true } }, //
        assignmentQuantities: {
          include: {
            assignment: { select: { id: true, title: true, costPerHour: true } },
          },
        },
      },
    });

    // Enviar email a RH y al supervisor
    const emailsRH = rhUsers.map((u) => u.email);
    emailsRH.push(workOrder.supervisorUser.email);

    const assignaments = workOrder.assignmentQuantities.map((q) => ({
      name: q.assignment.title,
      quantity: q.quantityWorkers,
    }));

    const companyName = workOrder.clientCompany?.companyName ?? 'N/A';

    await this.reportEmailService.sendWorkOrder(
      emailsRH,
      workOrder.workOrderCodePo ?? 'N/A',
      companyName,
      assignaments,
    );

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
      };
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
      return await this.prisma.workOrder.update({
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
    } catch (error) {
      throw new BadRequestException(
        `Error actualizando la orden de trabajo: ${error.message}`,
      );
    }
  }

  // Eliminar WorkOrder
  async remove(id: number, userEmail: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true, email: true }, // 🔒
    });
    if (!existingUser) throw new NotFoundException('El usuario no existe');

    const existing = await this.prisma.workOrder.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`WorkOrder con ID ${id} no encontrada`);

    return this.prisma.workOrder.delete({ where: { id } });
  }
}
