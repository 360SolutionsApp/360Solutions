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
    });
    if (!existingUser) throw new NotFoundException('El usuario no existe');

    // listar todos los usuarios con role id 2 y detalle del usuario
    const rhUsers = await this.prisma.user.findMany({
      where: { roleId: 2 },
      include: {
        userDetail: true,
      },
    });

    const workOrder = await this.prisma.workOrder.create({
      data: {
        contractClientId: dto.contractClientId,
        userEmailRegistry: userEmail,
        supervisorUserId: dto.supervisorUserId,
        workOrderStatus: dto.workOrderStatus ?? WorkOrderStatus.PENDING,

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
        ContractClient: true,
        assigmentsClientReq: true,
        supervisorUser: { include: { userDetail: true } },
        assignmentQuantities: {
          include: {
            assignment: {   // incluir info de la tabla Assignment
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

    console.log('orden de trabajo', workOrder);

    // Enviar email a todo el personal de RH con el detalle de la WorkOrder
    const emailsRH = rhUsers.map((u) => u.email);

    // Concatenamos el email del supervisor con el de RH
    emailsRH.push(workOrder.supervisorUser.email);

    const assignaments = workOrder.assignmentQuantities.map((q) => ({
      name: q.assignment.title,
      quantity: q.quantityWorkers,
    }));

    // Traemos la orden (incluyendo el contractClientId)
    const order = await this.prisma.workOrder.findUnique({
      where: { id: workOrder.id },
      include: { ContractClient: true },
    });

    if (!order || !order.ContractClient) {
      throw new BadRequestException(`No se encontró contrato asociado al workOrder con id=${workOrder.id}`);
    }

    // Ahora sí, buscamos la empresa del cliente usando el clientId de ContractClient
    const company = await this.prisma.clientCompany.findUnique({
      where: { id: order.ContractClient.clientId },
      include: { ContractClient: true },
    });

    await this.reportEmailService.sendWorkOrder(
      emailsRH,
      company.ContractClient.filter(c => c.id === workOrder.ContractClient.id)[0].contractCodePo,
      company.companyName,
      assignaments,
    );

    return workOrder;

  }

  // Obtener todas las WorkOrders
  async findAll(params: PaginationDto, userEmail: string) {
    const isUserClient = await this.prisma.clientCompany.findUnique({
      where: { employerEmail: userEmail },
      include: { ContractClient: true },
    });

    const contractIds = isUserClient?.ContractClient.map(c => c.id) ?? [];
    const where = isUserClient ? { contractClientId: { in: contractIds } } : {};

    // 🔹 Si no hay paginación → devolver array completo
    if (!params.page && !params.limit) {
      return this.prisma.workOrder.findMany({
        orderBy: { createdAt: 'desc' },
        where,
        include: {
          ContractClient: { include: { client: true } },
          supervisorUser: {
            select: { id: true, email: true, roleId: true, userDetail: true },
          },
          assigmentsClientReq: true,
          assignmentQuantities: {
            include: {
              assignment: { select: { id: true, title: true, costPerHour: true } },
            },
          },
        },
      });
    }

    // 🔹 Con paginación
    const page = Number(params.page);
    const limit = Number(params.limit);
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.workOrder.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        where,
        include: {
          ContractClient: { include: { client: true } },
          supervisorUser: {
            select: { id: true, email: true, roleId: true, userDetail: true },
          },
          assigmentsClientReq: true,
          assignmentQuantities: {
            include: {
              assignment: { select: { id: true, title: true, costPerHour: true } },
            },
          },
        },
      }),
      this.prisma.workOrder.count({ where }),
    ]);

    return { data, total, page, lastPage: Math.ceil(total / limit) };
  }

  // Obtener una WorkOrder por ID
  async findOne(id: number) {

    // extraemos la observación de la asignación de la orden de trabajo con el id
    const workOrderAssignments = await this.prisma.orderAssignToCollabs.findMany({
      where: { workOrderId: id },
    });  

    const workOrder = await this.prisma.workOrder.findUnique({
      where: { id },
      include: {
        ContractClient: {
          include: {
            client: true, // 👈 ClientCompany
          },
        },
        supervisorUser: {
          select: {
            id: true,
            email: true,
            roleId: true,
            userDetail: true,
            // password no se incluye
          },
        },
        assigmentsClientReq: true,
        assignmentQuantities: {
          include: {
            assignment: {   // incluir info de la tabla Assignment
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

    if (!workOrder) {
      throw new NotFoundException(`WorkOrder con ID ${id} no encontrada`);
    }
 
    const makeOrder = {
      ...workOrder,
      orderDetail: workOrderAssignments[0],
    }; 

    return makeOrder;
  }

  // Actualizar WorkOrder
  async update(id: number, dto: UpdateWorkOrderDto, userEmail: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: userEmail },
    });
    if (!existingUser) throw new NotFoundException('El usuario no existe');

    const { workOrderStatus, assignmentQuantities, assigmentsClientReq } = dto;

    try {
      return await this.prisma.workOrder.update({
        where: { id },
        data: {
          workOrderStatus,

          // Reemplazar todas las asignaciones del cliente
          assigmentsClientReq: assigmentsClientReq
            ? {
              set: assigmentsClientReq.map((assignmentId) => ({ id: assignmentId })),
            }
            : undefined,

          // 🔹 Manejo completo de assignmentQuantities
          assignmentQuantities: assignmentQuantities
            ? {
              update: assignmentQuantities
                .filter((a) => a.id)
                .map((a) => ({
                  where: { id: a.id },
                  data: { quantityWorkers: a.quantityWorkers },
                })),
              create: assignmentQuantities
                .filter((a) => !a.id)
                .map((a) => ({
                  assignmentId: a.assignmentId,
                  quantityWorkers: a.quantityWorkers,
                })),
              deleteMany: {
                id: {
                  notIn: assignmentQuantities.filter((a) => a.id).map((a) => a.id),
                },
              },
            }
            : undefined,
        },
        include: {
          ContractClient: true,
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
    });
    if (!existingUser) throw new NotFoundException('El usuario no existe');

    const existing = await this.prisma.workOrder.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`WorkOrder con ID ${id} no encontrada`);

    return this.prisma.workOrder.delete({ where: { id } });
  }
}
