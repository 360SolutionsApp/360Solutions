/* eslint-disable prettier/prettier */
import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateOrdersAssignToCollabDto } from './dto/create-orders-assign-to-collab.dto';
import { UpdateOrdersAssignToCollabDto } from './dto/update-orders-assign-to-collab.dto';
import { PrismaService } from 'src/prisma.service';
import { PaginationDto } from 'src/helpers/pagination.dto';

@Injectable()
export class OrdersAssignToCollabsService {
  constructor(private prisma: PrismaService) { }

  async create(createOrdersAssignToCollabDto: CreateOrdersAssignToCollabDto) {
    const {
      workOrderId,
      orderWorkDateStart,
      orderWorkDateEnd,
      orderWorkHourStart,
      orderLocationWork,
      orderObservations,
      collaboratorIds,
    } = createOrdersAssignToCollabDto;

    // Validar que la orden de trabajo exista
    const order = await this.prisma.workOrder.findUnique({
      where: { id: workOrderId },
    });
    if (!order) {
      throw new BadRequestException('La orden de trabajo no existe');
    }

    // Validar que los colaboradores existan y tengan el rol correcto
    const users = await this.prisma.user.findMany({
      where: {
        id: { in: collaboratorIds },
        roleId: 5, // 👈 tu rol de "colaborador"
        isVerified: true,
      },
    });

    if (users.length !== collaboratorIds.length) {
      throw new BadRequestException(
        'Algunos collaboratorIds no existen o no tienen el rol de colaborador',
      );
    }

    try {
      return this.prisma.orderAssignToCollabs.create({
        data: {
          workOrderId,
          orderWorkDateStart,
          orderWorkDateEnd,
          orderWorkHourStart,
          orderLocationWork,
          orderObservations,
          worksAssigned: {
            create: collaboratorIds.map((collabId) => ({
              collaboratorId: collabId,
            })),
          },
        },
        include: {
          worksAssigned: {
            include: {
              collaborator: {
                select: {
                  id: true,
                  email: true,
                  roleId: true,
                },
              },
            },
          },
        },
      });
    } catch (error) {
      throw new BadRequestException(error.message || 'Error al crear la asignació del usuario a la orden de trabajo');
    }

  }

  async findAll(params: PaginationDto) {

    const page = params.page ? Number(params.page) : 1;
    const limit = params.limit ? Number(params.limit) : 10;
    const skip = (page - 1) * limit;

    const total = await this.prisma.orderAssignToCollabs.count();
    const data = await this.prisma.orderAssignToCollabs.findMany({
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        worksAssigned: {
          include: {
            collaborator: {
              select: {
                id: true,
                email: true,
                roleId: true,
              },
            },
          },
        },
      },
    });

    return { data, total, page, lastPage: Math.ceil(total / limit) };
 
  }

  async findOne(id: number) {
    return this.prisma.orderAssignToCollabs.findUnique({
      where: { id },
      include: {
        worksAssigned: {
          include: {
            collaborator: {
              select: {
                id: true,
                email: true,
                roleId: true,
              },
            },
          },
        },
      },
    });
  }

  async update(id: number, updateOrdersAssignToCollabDto: UpdateOrdersAssignToCollabDto) {
    const { collaboratorIds, ...rest } = updateOrdersAssignToCollabDto;

    return this.prisma.orderAssignToCollabs.update({
      where: { id },
      data: {
        ...rest,
        ...(collaboratorIds && {
          worksAssigned: {
            deleteMany: {}, // elimina asignaciones anteriores
            create: collaboratorIds.map((collabId) => ({
              collaboratorId: collabId,
            })),
          },
        }),
      },
      include: {
        worksAssigned: {
          include: {
            collaborator: {
              select: {
                id: true,
                email: true,
                roleId: true,
              },
            },
          },
        },
      },
    });
  }

  async remove(id: number) {
    return this.prisma.orderAssignToCollabs.delete({
      where: { id },
    });
  }
}
