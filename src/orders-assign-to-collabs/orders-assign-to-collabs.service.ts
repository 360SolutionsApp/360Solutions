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

    // 1️⃣ Validar existencia de la orden
    const order = await this.prisma.workOrder.findUnique({
      where: { id: workOrderId },
    });
    if (!order) throw new BadRequestException('La orden de trabajo no existe');

    // 2️⃣ Extraer IDs de los colaboradores
    const collaboratorIdsList = collaboratorIds.map((c) => c.collaboratorId);

    // 3️⃣ Validar que existan y tengan el rol correcto
    const users = await this.prisma.user.findMany({
      where: {
        id: { in: collaboratorIdsList },
        roleId: 5,
        isVerified: true,
      },
      include: { userDetail: true },
    });

    if (users.length !== collaboratorIdsList.length) {
      throw new BadRequestException(
        'Algunos colaboradores no existen o no tienen el rol correcto',
      );
    }

    // 4️⃣ Verificar órdenes activas
    const activeAssignments = await this.prisma.workersAssignToOrder.findMany({
      where: {
        collaboratorId: { in: collaboratorIdsList },
        orderAssignToCollab: {
          workOrder: {
            workOrderStatus: {
              notIn: ['CLOSED', 'CANCELED', 'INACTIVE'],
            },
          },
        },
      },
      include: {
        collaborator: { include: { userDetail: true } },
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
        const code =
          a.orderAssignToCollab.workOrder.workOrderCodePo ??
          `#${a.orderAssignToCollab.workOrder.id}`;
        const status = a.orderAssignToCollab.workOrder.workOrderStatus;
        return `${name} (Orden ${code}, Estado: ${status})`;
      });

      throw new BadRequestException(
        `Los siguientes colaboradores tienen órdenes pendientes: ${pendingList.join(', ')}`,
      );
    }

    // 5️⃣ Crear la asignación principal
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
            create: collaboratorIds.flatMap((c) => {
              if (!Array.isArray(c.assigmentsId) || c.assigmentsId.length === 0) {
                console.warn(`⚠️ Colaborador ${c.collaboratorId} no tiene asignaciones válidas.`);
                return [];
              }

              return c.assigmentsId.map((assignmentId) => ({
                collaboratorId: c.collaboratorId,
                assignmentId,
              }));
            }),
          },
        },
        include: {
          worksAssigned: {
            include: {
              collaborator: {
                select: {
                  id: true,
                  email: true,
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
              assignment: {
                select: { id: true, title: true },
              },
            },
          },
        },
      });

      // 6️⃣ Datos del cliente y supervisor
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

      // 7️⃣ Agrupar asignaciones por colaborador
      type CollaboratorGroup = {
        id: number;
        email: string;
        name: string;
        assignments: { id: number; title: string }[];
      };

      const collaboratorsGrouped = Object.values(
        newAssignment.worksAssigned.reduce((acc, w) => {
          const collabId = w.collaborator.id;
          if (!acc[collabId]) {
            acc[collabId] = {
              id: collabId,
              email: w.collaborator.email,
              name: w.collaborator.userDetail
                ? `${w.collaborator.userDetail.names} ${w.collaborator.userDetail.lastNames}`
                : w.collaborator.email,
              assignments: [],
            };
          }

          // Evita títulos duplicados
          if (!acc[collabId].assignments.some(a => a.id === w.assignment.id)) {
            acc[collabId].assignments.push({
              id: w.assignment.id,
              title: w.assignment.title,
            });
          }

          return acc;
        }, {} as Record<number, CollaboratorGroup>),
      );

      // 8️⃣ Enviar correo a cada colaborador
      for (const collab of Object.values(collaboratorsGrouped)) {
        if (!collab.email) continue;
        await this.reportEmailService.sendAssignmentsToCollabs(
          [collab.email],
          orderCodePo,
          companyName,
          supervisorName,
          startDate.toISOString().split('T')[0],
          orderWorkHourStart,
          orderLocationWork,
          orderObservations,
          collab.assignments.map((a) => a.title),
          true,
        );
      }

      // 9️⃣ Enviar correo al supervisor
      const collaboratorsForEmail = Object.values(collaboratorsGrouped).map(
        (collab) => ({
          name: collab.name,
          email: collab.email,
          assignments: collab.assignments.map((a) => a.title),
        }),
      );

      if (supervisor?.email) {
        await this.reportOrderAssignToSupervisorMailerService.sendAssignmentsToSupervisor(
          supervisor.email,
          orderCodePo,
          companyName,
          startDate.toISOString().split('T')[0],
          orderWorkHourStart,
          orderLocationWork,
          orderObservations,
          collaboratorsForEmail,
        );
      }

      // 🔁 10️⃣ Retornar respuesta agrupada (sin duplicados)
      return {
        id: newAssignment.id,
        workOrderId: newAssignment.workOrderId,
        orderWorkDateStart: newAssignment.orderWorkDateStart,
        orderWorkDateEnd: newAssignment.orderWorkDateEnd,
        orderWorkHourStart: newAssignment.orderWorkHourStart,
        orderLocationWork: newAssignment.orderLocationWork,
        orderObservations: newAssignment.orderObservations,
        collaborators: collaboratorsGrouped, // ✅ Agrupado y limpio
      };
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

    // Buscar los colaboradores (roleId = 5) que estén verificados
    // y que NO estén asignados a esta orden
    const unassignedUsers = await this.prisma.user.findMany({
      where: {
        roleId: 5,
        isVerified: true,
        workersAssignToOrder: {
          none: {
            orderAssignToCollab: {
              workOrderId: Number(workOrderId),
            },
          },
        },
      },
      select: {
        id: true,
        email: true,
        userDetail: {
          select: {
            names: true,
            lastNames: true,
            phone: true,
            userCostPerAssignment: {
              include: {
                assignment: {
                  select: { id: true, title: true },
                },
              },
            },
          },
        },
      },
    });

    // Si no hay usuarios sin asignar
    if (unassignedUsers.length === 0) {
      throw new BadRequestException('No hay colaboradores disponibles para esta orden');
    }

    return unassignedUsers;
  }

  async findAll(params: PaginationDto, user) {
    const { page, limit } = params;

    // Verificar usuario autenticado
    const getUser = await this.prisma.user.findUnique({
      where: { id: user.id },
    });
    if (!getUser) throw new BadRequestException('User not found');

    // Configuración de paginación
    const shouldPaginate = !!(page && limit);
    const pageNumber = Number(page) || 1;
    const limitNumber = Number(limit) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    // Filtro base
    let whereCondition: any = {};

    if (getUser.roleId === 5) {
      // Si es colaborador (roleId = 5), solo mostrar órdenes donde esté asignado
      whereCondition = {
        worksAssigned: {
          some: {
            collaboratorId: getUser.id,
          },
        },
      };
    }

    // Contar registros
    const total = await this.prisma.orderAssignToCollabs.count({
      where: whereCondition,
    });

    // Consultar datos
    const data = await this.prisma.orderAssignToCollabs.findMany({
      where: whereCondition,
      skip: shouldPaginate ? skip : undefined,
      take: shouldPaginate ? limitNumber : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        workOrder: {
          include: {
            ContractClient: {
              include: { client: true },
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
                  select: { names: true, lastNames: true },
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
                          select: { title: true },
                        },
                      },
                    },
                  },
                },
              },
            },
            assignment: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });

    // Si no se requiere paginación
    if (!shouldPaginate) return data;

    // Si se requiere paginación
    return {
      data,
      total,
      page: pageNumber,
      lastPage: Math.ceil(total / limitNumber),
    };
  }

  /* eslint-disable prettier/prettier */
  async findOne(id: number) {
    const orderAssignment = await this.prisma.orderAssignToCollabs.findUnique({
      where: { id },
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
                          select: { title: true },
                        },
                      },
                    },
                  },
                },
              },
            },
            assignment: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });

    if (!orderAssignment) {
      throw new BadRequestException(`Order assignment with ID ${id} not found`);
    }

    return orderAssignment;
  }

  async update(
    id: number,
    updateOrdersAssignToCollabDto: UpdateOrdersAssignToCollabDto,
  ) {
    const { collaboratorIds, ...rest } = updateOrdersAssignToCollabDto;
    const collaboratorsList = collaboratorIds ?? [];

    // 1️⃣ Buscar la orden existente
    const existingAssignment = await this.prisma.orderAssignToCollabs.findUnique({
      where: { id },
      include: {
        workOrder: true,
      },
    });

    if (!existingAssignment) {
      throw new BadRequestException('No se encontró la asignación especificada.');
    }

    // 2️⃣ Eliminar todas las asignaciones actuales
    await this.prisma.workersAssignToOrder.deleteMany({
      where: { orderAssignToCollabId: id },
    });

    // 3️⃣ Actualizar información general y crear nuevas asignaciones
    const updatedAssignment = await this.prisma.orderAssignToCollabs.update({
      where: { id },
      data: {
        ...rest,
        worksAssigned: {
          create: collaboratorsList.flatMap((c) =>
            (c.assigmentsId ?? []).map((assignmentId) => ({
              collaboratorId: c.collaboratorId,
              assignmentId,
            })),
          ),
        },
      },
      include: {
        worksAssigned: {
          include: {
            collaborator: {
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
            assignment: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        workOrder: {
          select: {
            id: true,
            workOrderCodePo: true,
            clientId: true,
            supervisorUserId: true,
          },
        },
      },
    });

    // 4️⃣ Datos del cliente y supervisor
    const order = updatedAssignment.workOrder;
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

    // 5️⃣ Agrupar asignaciones por colaborador (sin duplicados)
    type CollaboratorGroup = {
      id: number;
      email: string;
      name: string;
      assignments: { id: number; title: string }[];
    };

    const collaboratorsGrouped = Object.values(
      updatedAssignment.worksAssigned.reduce((acc, w) => {
        const collabId = w.collaborator.id;
        if (!acc[collabId]) {
          acc[collabId] = {
            id: collabId,
            email: w.collaborator.email,
            name: w.collaborator.userDetail
              ? `${w.collaborator.userDetail.names} ${w.collaborator.userDetail.lastNames}`
              : w.collaborator.email,
            assignments: [],
          };
        }

        // Evita títulos duplicados
        if (!acc[collabId].assignments.some((a) => a.id === w.assignment.id)) {
          acc[collabId].assignments.push({
            id: w.assignment.id,
            title: w.assignment.title,
          });
        }

        return acc;
      }, {} as Record<number, CollaboratorGroup>),
    );

    const startDate =
      rest.orderWorkDateStart instanceof Date
        ? rest.orderWorkDateStart
        : new Date(rest.orderWorkDateStart);

    // 6️⃣ Enviar correo a cada colaborador
    for (const collab of collaboratorsGrouped) {
      if (!collab.email) continue;

      await this.reportEmailService.sendAssignmentsToCollabs(
        [collab.email],
        orderCodePo,
        companyName,
        supervisorName,
        startDate.toISOString().split('T')[0],
        rest.orderWorkHourStart ?? '',
        rest.orderLocationWork ?? '',
        rest.orderObservations ?? '',
        collab.assignments.map((a) => a.title),
        true,
      );
    }

    // 7️⃣ Enviar correo al supervisor con todos los colaboradores
    const collaboratorsForEmail = collaboratorsGrouped.map((collab) => ({
      name: collab.name,
      email: collab.email,
      assignments: collab.assignments.map((a) => a.title),
    }));

    if (supervisor?.email) {
      await this.reportOrderAssignToSupervisorMailerService.sendAssignmentsToSupervisor(
        supervisor.email,
        orderCodePo,
        companyName,
        startDate.toISOString().split('T')[0],
        rest.orderWorkHourStart ?? '',
        rest.orderLocationWork ?? '',
        rest.orderObservations ?? '',
        collaboratorsForEmail,
      );
    }

    // 8️⃣ Retornar respuesta alineada con create
    return {
      id: updatedAssignment.id,
      workOrderId: updatedAssignment.workOrder.id,
      orderWorkDateStart:
        typeof updatedAssignment.orderWorkDateStart === 'string'
          ? updatedAssignment.orderWorkDateStart
          : updatedAssignment.orderWorkDateStart?.toISOString(),
      orderWorkDateEnd:
        typeof updatedAssignment.orderWorkDateEnd === 'string'
          ? updatedAssignment.orderWorkDateEnd
          : updatedAssignment.orderWorkDateEnd?.toISOString(),
      orderWorkHourStart: updatedAssignment.orderWorkHourStart,
      orderLocationWork: updatedAssignment.orderLocationWork,
      orderObservations: updatedAssignment.orderObservations,
      collaborators: collaboratorsGrouped,
    };
  }

  async remove(id: number) {
    return this.prisma.orderAssignToCollabs.delete({
      where: { id },
    });
  }
}
