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

    // 🔹 Convertir fechas explícitamente a Date
    const startDate = new Date(orderWorkDateStart);
    const endDate = new Date(orderWorkDateEnd);

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

    // Validar que los colaboradores no tengan asignaciones en el mismo rango de fecha/hora
    const conflictingAssignments = await this.prisma.orderAssignToCollabs.findMany({
      where: {
        worksAssigned: {
          some: {
            collaboratorId: { in: collaboratorIds },
          },
        },
        // Validación por traslape de rango de fechas
        AND: [
          {
            // ⚡ Solo considerar órdenes que caen en el mismo día o rango
            orderWorkDateStart: { lte: endDate },
            orderWorkDateEnd: { gte: startDate },
          },
        ],
        // ⚡ Validar hora solo si es el mismo día
        ...(startDate.toISOString().split("T")[0] === endDate.toISOString().split("T")[0]
          ? { orderWorkHourStart: orderWorkHourStart }
          : {}),
      },
      include: {
        worksAssigned: true,
      },
    });

    if (conflictingAssignments.length > 0) {
      // Obtener los colaboradores que tienen conflicto
      const conflictingCollaborators = conflictingAssignments.flatMap(
        (assignment) =>
          assignment.worksAssigned
            .filter((work) => collaboratorIds.includes(work.collaboratorId))
            .map((work) => work.collaboratorId),
      );

      // traer el detalle de los colaboradores que tienen conflicto
      const conflictingCollaboratorsDetails = await this.prisma.userDetail.findMany({
        where: {
          userId: { in: conflictingCollaborators },
        },
      });

      // listar los colaboradores que tienen conflicto
      const conflictingCollaboratorsNames = conflictingCollaboratorsDetails
        .map((detail) => `${detail.names} ${detail.lastNames}`)
        .join(', ');

      throw new BadRequestException(
        `Los colaboradores ${conflictingCollaboratorsNames} tienen una asignación en el mismo rango de fecha/hora ${startDate.toISOString().split('T')[0]} ${orderWorkHourStart} - ${endDate.toISOString().split('T')[0]}`,
      );
    }

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
                  userDetail: {
                    select: {
                      names: true,
                      lastNames: true,
                      assignments: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      // Extraemos los correos de los colaboradores
      const emails = newAssignment.worksAssigned.map(
        (work) => work.collaborator.email,
      );

      // Extraemos el contractCode de la orden de trabajo
      const contract = await this.prisma.contractClient.findUnique({
        where: { id: order.contractClientId },
      });

      // Extraemos el nombre de la compañía por el id del contratante
      const company = await this.prisma.clientCompany.findUnique({
        where: { id: contract.clientId },
      });

      // Extraemos el detalle del supervisor
      const supervisor = await this.prisma.user.findUnique({
        where: { id: order.supervisorUserId },
        include: {
          userDetail: true,
        },
      });

      // Enviar correo de reporte
      await this.reportEmailService.sendAssignmentsToCollabs(
        emails,
        contract.contractCodePo,
        company.companyName,
        supervisor.userDetail.names + ' ' + supervisor.userDetail.lastNames,
        startDate.toISOString().split('T')[0],
        orderWorkHourStart,
        orderLocationWork,
        orderObservations,
        true, // usar Zoho API
      );

      // Extraemos la lista de colaboradores
      const collaborators = newAssignment.worksAssigned.map((work) => ({
        name:
          work.collaborator.userDetail.names +
          ' ' +
          work.collaborator.userDetail.lastNames,
        email: work.collaborator.email,
        assignments: work.collaborator.userDetail.assignments.map(
          (assignment) => assignment.title,
        ),
      }));

      // Enviar correo al supervisor con la lista de colaboradores asignados
      await this.reportOrderAssignToSupervisorMailerService.sendAssignmentsToSupervisor(
        supervisor.email,
        contract.contractCodePo,
        company.companyName,
        startDate.toISOString().split('T')[0],
        orderWorkHourStart,
        orderLocationWork,
        orderObservations,
        collaborators,

      );

      return newAssignment;
    } catch (error) {
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
                    assignments: {
                      select: {
                        id: true,
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
