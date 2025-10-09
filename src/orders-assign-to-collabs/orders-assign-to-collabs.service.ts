/* eslint-disable prettier/prettier */
import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateOrdersAssignToCollabDto } from './dto/create-orders-assign-to-collab.dto';
import { UpdateOrdersAssignToCollabDto } from './dto/update-orders-assign-to-collab.dto';
import { PrismaService } from 'src/prisma.service';
import { PaginationDto } from 'src/helpers/pagination.dto';
import { ReportOrderAssignToCollabsMailerService } from './report-email-collabs.service';
import { ReportOrderAssignToSupervisorMailerService } from './report-email-supervisor.service';

@Injectable()
export class OrdersAssignToCollabsService {
  constructor(
    private prisma: PrismaService,
    private reportEmailService: ReportOrderAssignToCollabsMailerService,
    private reportOrderAssignToSupervisorMailerService: ReportOrderAssignToSupervisorMailerService
  ) { }

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

    const startDate = new Date(orderWorkDateStart);
    const endDate = new Date(orderWorkDateEnd);

    // ✅ Validar existencia de la orden
    const order = await this.prisma.workOrder.findUnique({
      where: { id: workOrderId },
    });
    if (!order) throw new BadRequestException('La orden de trabajo no existe');

    // ✅ Validar colaboradores válidos
    const users = await this.prisma.user.findMany({
      where: {
        id: { in: collaboratorIds },
        roleId: 5,
        isVerified: true,
      },
      include: { userDetail: true },
    });

    if (users.length !== collaboratorIds.length) {
      throw new BadRequestException(
        'Algunos collaboratorIds no existen o no tienen el rol de colaborador',
      );
    }

    // ✅ Verificar si los colaboradores tienen órdenes activas (no cerradas)
    const activeAssignments = await this.prisma.workersAssignToOrder.findMany({
      where: {
        collaboratorId: { in: collaboratorIds },
        orderAssignToCollab: {
          workOrder: {
            workOrderStatus: {
              notIn: ['CLOSED', 'CANCELED', 'INACTIVE'], // 👈 Solo órdenes aún abiertas
            },
          },
        },
      },
      include: {
        collaborator: {
          include: { userDetail: true },
        },
        orderAssignToCollab: {
          include: {
            workOrder: {
              select: {
                id: true,
                workOrderCodePo: true,
                workOrderStatus: true,
              },
            },
          },
        },
      },
    });

    if (activeAssignments.length > 0) {
      const pendingList = activeAssignments.map((a) => {
        const name = a.collaborator.userDetail
          ? `${a.collaborator.userDetail.names} ${a.collaborator.userDetail.lastNames}`
          : a.collaborator.email;
        const code = a.orderAssignToCollab.workOrder.workOrderCodePo ?? `#${a.orderAssignToCollab.workOrder.id}`;
        const status = a.orderAssignToCollab.workOrder.workOrderStatus;
        return `${name} (Orden ${code}, Estado: ${status})`;
      });

      throw new BadRequestException(
        `Los siguientes colaboradores tienen órdenes pendientes por cerrar: ${pendingList.join(', ')}`,
      );
    }

    // ✅ Crear asignación
    try {
      const newAssignment = await this.prisma.orderAssignToCollabs.create({
        data: {
          workOrderId,
          orderWorkDateStart: startDate,
          orderWorkDateEnd: endDate,
          orderWorkHourStart,
          orderLocationWork,
          orderObservations,
          worksAssigned: {
            create: collaboratorIds.map((id) => ({ collaboratorId: id })),
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
                  userDetail: {
                    select: {
                      names: true,
                      lastNames: true,
                      userCostPerAssignment: {
                        include: {
                          assignment: { select: { id: true, title: true } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      // ✅ Obtener datos del cliente y supervisor
      const company =
        order.clientId &&
        (await this.prisma.clientCompany.findUnique({
          where: { id: order.clientId },
        }));

      const companyName = company?.companyName ?? 'N/A';
      const orderCodePo = order.workOrderCodePo ?? 'N/A';

      const supervisor = await this.prisma.user.findUnique({
        where: { id: order.supervisorUserId },
        include: { userDetail: true },
      });

      const supervisorName =
        supervisor?.userDetail
          ? `${supervisor.userDetail.names} ${supervisor.userDetail.lastNames}`
          : supervisor?.email ?? 'N/A';

      // ✅ Enviar correo a colaboradores
      const emails = newAssignment.worksAssigned.map((w) => w.collaborator.email);

      await this.reportEmailService.sendAssignmentsToCollabs(
        emails,
        orderCodePo,
        companyName,
        supervisorName,
        startDate.toISOString().split('T')[0],
        orderWorkHourStart,
        orderLocationWork,
        orderObservations,
        true,
      );

      // ✅ Enviar correo al supervisor con detalle
      const collaborators = newAssignment.worksAssigned.map((w) => ({
        name: w.collaborator.userDetail
          ? `${w.collaborator.userDetail.names} ${w.collaborator.userDetail.lastNames}`
          : w.collaborator.email,
        email: w.collaborator.email,
        assignments: (w.collaborator.userDetail?.userCostPerAssignment || []).map(
          (cost) => cost.assignment.title,
        ),
      }));

      if (supervisor?.email) {
        await this.reportOrderAssignToSupervisorMailerService.sendAssignmentsToSupervisor(
          supervisor.email,
          orderCodePo,
          companyName,
          startDate.toISOString().split('T')[0],
          orderWorkHourStart,
          orderLocationWork,
          orderObservations,
          collaborators,
        );
      }

      return newAssignment;
    } catch (error) {
      console.error('Error creando assignment to collabs:', error);
      throw new BadRequestException(
        error.message ||
        'Error al crear la asignación del usuario a la orden de trabajo',
      );
    }
  }

  // Listemos todos los usuarios no asignados a una orden
  async findAllUnassignedUsers(workOrderId: number) {

    // Validar que la orden de trabajo exista
    const order = await this.prisma.workOrder.findUnique({
      where: { id: Number(workOrderId) },
    });
    if (!order) {
      throw new BadRequestException('La orden de trabajo no existe');
    }

    // Listar todos los usuarios de role 5 que no tienen asignaciones en la orden

    const users = await this.prisma.user.findMany({
      where: {
        roleId: 5, // rol de "colaborador"
        isVerified: true,
        NOT: {
          workersAssignToOrder: {
            some: {
              orderAssignToCollabId: Number(workOrderId),
            },
          },
        },
      },
    });

    // traer el detalle de los colaboradores
    const usersDetails = await this.prisma.userDetail.findMany({
      where: {
        userId: { in: users.map((user) => user.id) },
      },
    });

    return usersDetails;
  }

  async findAll(params: PaginationDto, user) {
    const { page, limit } = params;

    const getUser = await this.prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!getUser) {
      throw new Error('User not found');
    }

    // 👇 Si no vienen parámetros de paginación => no paginar
    const shouldPaginate = !!(page && limit);
    const pageNumber = page ? Number(page) : 1;
    const limitNumber = limit ? Number(limit) : 10;
    const skip = (pageNumber - 1) * limitNumber;

    // 👇 Condición base de búsqueda
    let whereCondition: any = {};
    console.log('Role ID del usuario autenticado:', getUser);
    if (getUser.roleId === 5) {
      // Si es colaborador (roleId = 5), filtrar por su email

      whereCondition = {
        worksAssigned: {
          some: {
            collaborator: {
              email: getUser.email,
            },
          },
        },
      };
    }

    // 👇 Contar registros filtrados
    const total = await this.prisma.orderAssignToCollabs.count({
      where: whereCondition,
    });

    // 👇 Consultar datos con o sin paginación
    const data = await this.prisma.orderAssignToCollabs.findMany({
      where: whereCondition,
      skip: shouldPaginate ? skip : undefined,
      take: shouldPaginate ? limitNumber : undefined,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        workOrder: {
          include: {
            ContractClient: {
              include: {
                client: true,
              },
            },
            clientCompany: {
              select: {
                id: true,
                companyName: true,
                employerPhone: true,
                clientAddress: true,
                employerEmail: true,
              },
            },
            supervisorUser: {
              select: {
                id: true,
                email: true,
                userDetail: {
                  select: {
                    names: true,
                    lastNames: true,
                  },
                },
              },
            },
          },
        },
        worksAssigned: {
          include: {
            collaborator: {
              select: {
                id: true,
                email: true,
                roleId: true,
                userDetail: {
                  select: {
                    names: true,
                    lastNames: true,
                    userCostPerAssignment: {
                      include: {
                        assignment: {
                          select: {
                            title: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    // 👇 Si no hay paginación, devolver solo data
    if (!shouldPaginate) {
      return data;
    }

    return {
      data,
      total,
      page: pageNumber,
      lastPage: Math.ceil(total / limitNumber),
    };
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
