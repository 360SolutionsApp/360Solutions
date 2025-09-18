/* eslint-disable prettier/prettier */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateWorkOrderDto, WorkOrderStatus } from './dto/create-work-order.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';
import { PrismaService } from 'src/prisma.service';
import { PaginationDto } from 'src/helpers/pagination.dto';

@Injectable()
export class WorkOrdersService {
  constructor(private readonly prisma: PrismaService) { }

  // Crear una nueva WorkOrder
  async create(dto: CreateWorkOrderDto, userEmail: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: userEmail },
    });
    if (!existingUser) throw new NotFoundException('El usuario no existe');

    return this.prisma.workOrder.create({
      data: {
        contractClientId: dto.ContractClientId,
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
  }

  // Obtener todas las WorkOrders
  async findAll(params: PaginationDto, userEmail: string) {
    const isUserClient = await this.prisma.clientCompany.findUnique({
      where: {
        employerEmail: userEmail,
      },
      include: {
        ContractClient: true,        
      },
    });

    const page = params.page ? Number(params.page) : 1;
    const limit = params.limit ? Number(params.limit) : 10;
    const skip = (page - 1) * limit;

    const contractIds = isUserClient?.ContractClient.map(c => c.id) ?? [];

    const where = isUserClient
      ? { contractClientId: { in: contractIds } }
      : {};

    const [data, total] = await this.prisma.$transaction([
      this.prisma.workOrder.findMany({
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        where,
        include: {
          ContractClient: true,
          supervisorUser: true,
          assigmentsClientReq: true,
          assignmentQuantities: true,
        },
      }),
      this.prisma.workOrder.count({ where }),
    ]);

    return { data, total, page, lastPage: Math.ceil(total / limit) };
  }


  // Obtener una WorkOrder por ID
  async findOne(id: number) {
    const workOrder = await this.prisma.workOrder.findUnique({
      where: { id },
      include: {
        ContractClient: true,
        supervisorUser: true,
        assigmentsClientReq: true,
        assignmentQuantities: true,
      },
    }); 

    if (!workOrder) throw new NotFoundException(`WorkOrder con ID ${id} no encontrada`);

    // Incluimos a la respuesta el detalle del usuario supervisor
    workOrder.supervisorUser = await this.prisma.user.findUnique({
      where: { id: workOrder.supervisorUserId },
      include: {
        userDetail: true,
      },
    });

    return workOrder;
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

          // 🔹 Reemplazar todas las asignaciones del cliente
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
