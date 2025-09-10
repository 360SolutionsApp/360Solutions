/* eslint-disable prettier/prettier */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateWorkOrderDto, WorkOrderStatus } from './dto/create-work-order.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';
import { PrismaService } from 'src/prisma.service';

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
        companyClientId: dto.companyClientId,
        userEmailRegistry: userEmail,
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
        companyClient: true,
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
  async findAll() {
    return this.prisma.workOrder.findMany({
      include: {
        companyClient: true,
        assigmentsClientReq: true,
        assignmentQuantities: true,
      },
    });
  }

  // Obtener una WorkOrder por ID
  async findOne(id: number) {
    const workOrder = await this.prisma.workOrder.findUnique({
      where: { id },
      include: {
        companyClient: true,
        assigmentsClientReq: true,
        assignmentQuantities: true,
      },
    });

    if (!workOrder) throw new NotFoundException(`WorkOrder con ID ${id} no encontrada`);
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
          companyClient: true,
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
