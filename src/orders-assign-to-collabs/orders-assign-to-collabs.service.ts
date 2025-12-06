/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateOrdersAssignToCollabDto } from './dto/create-orders-assign-to-collab.dto';
import { UpdateOrdersAssignToCollabDto } from './dto/update-orders-assign-to-collab.dto';
import { PrismaService } from 'src/prisma.service';
import { PaginationDto } from 'src/helpers/pagination.dto';
import { ReportOrderAssignToCollabsMailerService } from './report-email-collabs.service';
import { ReportOrderAssignToSupervisorMailerService } from './report-email-supervisor.service';
import { WorkOrderStatus as workOrderStatus } from '@prisma/client';
import { WorkOrderAcceptService } from 'src/work-order-accept/work-order-accept.service';
import { WorkOrderAcceptGateway } from 'src/work-order-accept/orders.gateway';
import { SimpleEmailQueueService } from 'src/mailer/simple-email-queue.service';

@Injectable()
export class OrdersAssignToCollabsService {
  constructor(
    private prisma: PrismaService,
    private reportEmailService: ReportOrderAssignToCollabsMailerService,
    private reportOrderAssignToSupervisorMailerService: ReportOrderAssignToSupervisorMailerService,
    private workOrderAcceptService: WorkOrderAcceptService,
    private workOrderGateway: WorkOrderAcceptGateway,
    private readonly emailQueueService: SimpleEmailQueueService
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
      },
      include: { userDetail: true },
    });

    if (users.length !== collaboratorIdsList.length) {
      throw new BadRequestException(
        'Algunos colaboradores no existen o no tienen el rol correcto',
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

      // ✅ Crear registros de aceptación para cada colaborador
      const uniqueCollaborators = [
        ...new Set(newAssignment.worksAssigned.map((w) => w.collaborator.id)),
      ];

      for (const collaboratorId of uniqueCollaborators) {
        await this.workOrderAcceptService.create({
          collaboratorId,
          workOrderId,
          acceptWorkOrder: false,
        });
      }

      // 6️⃣ Datos del cliente
      const company =
        order.clientId &&
        (await this.prisma.clientCompany.findUnique({
          where: { id: order.clientId },
        }));
      const companyName = company?.companyName ?? 'N/A';
      const orderCodePo = order.workOrderCodePo ?? 'N/A';

      // 7️⃣ Supervisor opcional: solo si llega supervisorUserId y tiene email válido
      let supervisorName = 'N/A';
      let supervisorEmail: string | null = null;

      if (order.supervisorUserId && order.supervisorUserId !== 0) {
        const supervisor = await this.prisma.user.findUnique({
          where: { id: order.supervisorUserId },
          include: { userDetail: true },
        });

        supervisorName = supervisor?.userDetail
          ? `${supervisor.userDetail.names} ${supervisor.userDetail.lastNames}`
          : supervisor?.email ?? 'N/A';

        if (supervisor?.email && supervisor.email.trim() !== '') {
          supervisorEmail = supervisor.email;
        }
      }

      // 8️⃣ Agrupar asignaciones por colaborador
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

          if (!acc[collabId].assignments.some(a => a.id === w.assignment.id)) {
            acc[collabId].assignments.push({
              id: w.assignment.id,
              title: w.assignment.title,
            });
          }

          return acc;
        }, {} as Record<number, CollaboratorGroup>),
      );

      // 9️⃣ Enviar correo a cada colaborador
      await this.enqueueEmailsForCollaborators(
        collaboratorsGrouped,
        orderCodePo,
        companyName,
        supervisorName,
        startDate,
        orderWorkHourStart,
        orderLocationWork,
        orderObservations
      );

      console.log('correo a enviar supervisorEmail:', supervisorEmail);

      // 🔟 Enviar correo al supervisor solo si supervisorEmail existe
      if (supervisorEmail) {
        await this.enqueueSupervisorEmail(
          supervisorEmail,
          orderCodePo,
          companyName,
          startDate,
          orderWorkHourStart,
          orderLocationWork,
          orderObservations,
          collaboratorsGrouped
        );
      }

      // 🔔 Notificar a los administradores que hay cambios globales
      try {
        this.workOrderGateway.notifyOrdersUpdate();
      } catch (error) {
        console.warn('⚠️ No se pudo emitir actualización global:', error.message);
      }

      // 1️⃣1️⃣ Retornar respuesta agrupada
      return {
        id: newAssignment.id,
        workOrderId: newAssignment.workOrderId,
        orderWorkDateStart: newAssignment.orderWorkDateStart,
        orderWorkDateEnd: newAssignment.orderWorkDateEnd,
        orderWorkHourStart: newAssignment.orderWorkHourStart,
        orderLocationWork: newAssignment.orderLocationWork,
        orderObservations: newAssignment.orderObservations,
        collaborators: collaboratorsGrouped,
        emailStatus: 'enqueued', // <-- Nuevo campo
        message: '✅ Asignación creada exitosamente. Los correos se enviarán en segundo plano.'
      };
    } catch (error) {
      console.error('Error creando assignment to collabs:', error);
      throw new BadRequestException(
        error.message ||
        'Error al crear la asignación del usuario a la orden de trabajo',
      );
    }
  }

  /**
  * Método para encolar correos de colaboradores
  */
  private async enqueueEmailsForCollaborators(
    collaboratorsGrouped: any[],
    orderCodePo: string,
    companyName: string,
    supervisorName: string,
    startDate: Date,
    orderWorkHourStart: string,
    orderLocationWork: string,
    orderObservations: string
  ): Promise<void> {
    for (const collab of Object.values(collaboratorsGrouped)) {
      if (!collab.email) continue;

      try {
        // Generar el HTML usando el servicio existente
        const emailData = this.reportEmailService.generateEmailHtml(
          [collab.email],
          orderCodePo,
          companyName,
          supervisorName,
          startDate.toISOString().split('T')[0],
          orderWorkHourStart,
          orderLocationWork,
          orderObservations,
          collab.assignments.map((a: any) => a.title)
        );

        // Agregar a la cola (no espera a que se envíe)
        await this.emailQueueService.addToQueue({
          to: collab.email,
          subject: emailData.subject,
          html: emailData.html,
        });

        console.log(`📨 Correo encolado para: ${collab.email}`);

      } catch (queueError) {
        console.error(`❌ Error al encolar correo para ${collab.email}:`, queueError.message);
      }
    }
  }

  /**
   * Método para encolar correo del supervisor
   */
  private async enqueueSupervisorEmail(
    supervisorEmail: string,
    orderCodePo: string,
    companyName: string,
    startDate: Date,
    orderWorkHourStart: string,
    orderLocationWork: string,
    orderObservations: string,
    collaboratorsGrouped: any[]
  ): Promise<void> {
    try {
      // Preparar datos de colaboradores para el supervisor
      const collaboratorsForEmail = Object.values(collaboratorsGrouped).map(
        (collab) => ({
          name: collab.name,
          email: collab.email,
          assignments: collab.assignments.map((a: any) => a.title),
        }),
      );

      // Generar el HTML usando el servicio existente del supervisor
      const emailData = this.reportOrderAssignToSupervisorMailerService.generateSupervisorEmailHtml(
        supervisorEmail,
        orderCodePo,
        companyName,
        startDate.toISOString().split('T')[0],
        orderWorkHourStart,
        orderLocationWork,
        orderObservations,
        collaboratorsForEmail
      );

      // Agregar a la cola
      await this.emailQueueService.addToQueue({
        to: supervisorEmail,
        subject: emailData.subject,
        html: emailData.html,
      });

      console.log(`📨 Correo encolado para supervisor: ${supervisorEmail}`);

    } catch (error) {
      console.error(`❌ Error al encolar correo para supervisor ${supervisorEmail}:`, error.message);
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
              workOrderStatus: { not: 'DELETE' },
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

  async findAll(params: PaginationDto, user: any) {
    const { page, limit, search, filters, sortField = 'createdAt', orderBy = 'desc' } = params;

    // ✅ Verificar usuario autenticado
    const getUser = await this.prisma.user.findUnique({ where: { id: user.id } });
    if (!getUser) throw new BadRequestException('User not found');

    // ✅ Configuración de paginación
    const shouldPaginate = !!(page && limit);
    const pageNumber = Number(page) || 1;
    const limitNumber = Number(limit) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    // 🔹 Filtro base según rol
    let whereCondition: any = {};
    if (getUser.roleId === 5) {
      whereCondition = {
        worksAssigned: {
          some: {
            collaboratorId: getUser.id,
            workOrderStatus: { not: workOrderStatus.DELETE },
          },
        },
      };
    }

    // 🔹 Filtro por search (PO, colaborador, cliente)
    if (search && search.trim() !== '') {
      whereCondition.AND = whereCondition.AND || [];
      whereCondition.AND.push({
        OR: [
          // PO
          { workOrder: { workOrderCodePo: { contains: search, mode: 'insensitive' } } },
          // Colaborador
          {
            worksAssigned: {
              some: {
                collaborator: {
                  userDetail: {
                    OR: [
                      { names: { contains: search, mode: 'insensitive' } },
                      { lastNames: { contains: search, mode: 'insensitive' } },
                    ],
                  },
                },
              },
            },
          },
          // Cliente
          {
            workOrder: {
              clientCompany: {
                is: {
                  companyName: { contains: search, mode: 'insensitive' },
                },
              },
            },
          },
        ],
      });
    }

    // 🔹 Filtro por estado
    if (filters?.status && Object.values(workOrderStatus).includes(filters.status as any)) {
      whereCondition.AND = whereCondition.AND || [];
      whereCondition.AND.push({ workOrderStatus: filters.status as typeof workOrderStatus });
    }

    // 🔹 Filtro por hora de inicio
    if (filters?.hourStart) {
      whereCondition.AND = whereCondition.AND || [];
      whereCondition.AND.push({ orderWorkHourStart: filters.hourStart });
    }

    // 🔹 Filtro por rango de fechas (orderWorkDateStart)
    if (filters?.startDate || filters?.endDate) {
      whereCondition.AND = whereCondition.AND || [];
      whereCondition.AND.push({
        orderWorkDateStart: {
          gte: filters.startDate ? new Date(filters.startDate) : undefined,
          lte: filters.endDate ? new Date(filters.endDate) : undefined,
        },
      });
    }

    // 🔹 Total de registros
    const total = await this.prisma.orderAssignToCollabs.count({ where: whereCondition });

    // 🔹 Ordenamiento dinámico
    const orderByCondition: any = {};
    orderByCondition[sortField] = orderBy;

    // 🔹 Consulta principal
    const data = await this.prisma.orderAssignToCollabs.findMany({
      where: whereCondition,
      skip: shouldPaginate ? skip : undefined,
      take: shouldPaginate ? limitNumber : undefined,
      orderBy: orderByCondition,
      include: {
        workOrder: {
          include: {
            ContractClient: { include: { client: true } },
            clientCompany: {
              select: { id: true, companyName: true, employerPhone: true, clientAddress: true, employerEmail: true },
            },
            supervisorUser: {
              select: { id: true, email: true, userDetail: { select: { names: true, lastNames: true } } },
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
                    userCostPerAssignment: { include: { assignment: { select: { title: true } } } },
                  },
                },
              },
            },
            assignment: { select: { id: true, title: true } },
          },
        },
      },
    });

    // 🔹 Agrupar colaboradores duplicados por orden
    const groupedData = data.map(order => {
      const collaboratorMap = new Map();
      order.worksAssigned.forEach(work => {
        const collabId = work.collaborator.id;
        if (!collaboratorMap.has(collabId)) {
          collaboratorMap.set(collabId, { collaborator: work.collaborator, assignments: [] });
        }
        collaboratorMap.get(collabId).assignments.push(work.assignment);
      });
      return { ...order, worksAssigned: Array.from(collaboratorMap.values()) };
    });

    // 🔹 Retornar paginado o completo
    if (!shouldPaginate) return groupedData;

    return {
      data: groupedData,
      total,
      page: pageNumber,
      lastPage: Math.ceil(total / limitNumber),
    };
  }

  /* eslint-disable prettier/prettier */
  async findOne(id: number) {
    const orderAssignment = await this.prisma.orderAssignToCollabs.findUnique({
      where: { id, workOrderStatus: { not: 'DELETE' } },
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
        worksAssigned: {
          include: {
            collaborator: true,
          },
        },
      },
    });

    if (!existingAssignment) {
      throw new BadRequestException('No se encontró la asignación especificada.');
    }

    // 2️⃣ Obtener colaboradores existentes y nuevos
    const existingCollaboratorIds = existingAssignment.worksAssigned.map(
      (assignment) => assignment.collaboratorId,
    );

    const incomingCollaboratorIds = collaboratorsList.map(
      (c) => c.collaboratorId,
    );

    // 3️⃣ Identificar cambios
    const collaboratorsToAdd = collaboratorsList.filter(
      (c) => !existingCollaboratorIds.includes(c.collaboratorId),
    );

    const collaboratorsToRemove = existingCollaboratorIds.filter(
      (collabId) => !incomingCollaboratorIds.includes(collabId),
    );

    // 4️⃣ Eliminar solo los colaboradores removidos
    if (collaboratorsToRemove.length > 0) {
      await this.prisma.workersAssignToOrder.deleteMany({
        where: {
          orderAssignToCollabId: id,
          collaboratorId: { in: collaboratorsToRemove },
        },
      });
    }

    // 5️⃣ Actualizar información general
    const updatedAssignment = await this.prisma.orderAssignToCollabs.update({
      where: { id },
      data: {
        ...rest,
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

    // 6️⃣ Agregar nuevas asignaciones solo para colaboradores nuevos
    if (collaboratorsToAdd.length > 0) {
      for (const newCollaborator of collaboratorsToAdd) {
        await this.prisma.workersAssignToOrder.createMany({
          data: (newCollaborator.assigmentsId ?? []).map((assignmentId) => ({
            orderAssignToCollabId: id,
            collaboratorId: newCollaborator.collaboratorId,
            assignmentId,
          })),
          skipDuplicates: true,
        });
      }

      // 7️⃣ Actualizar/Crear orderAcceptByCollab solo para nuevos colaboradores
      for (const newCollaborator of collaboratorsToAdd) {
        const existingAccept = await this.prisma.orderAcceptByCollab.findFirst({
          where: {
            collaboratorId: newCollaborator.collaboratorId,
            workOrderId: existingAssignment.workOrderId,
          },
        });

        let result;

        if (existingAccept) {
          result = await this.prisma.orderAcceptByCollab.update({
            where: { id: existingAccept.id },
            data: { acceptWorkOrder: false },
          });
        } else {
          result = await this.prisma.orderAcceptByCollab.create({
            data: {
              collaboratorId: newCollaborator.collaboratorId,
              workOrderId: existingAssignment.workOrderId,
              acceptWorkOrder: false,
            },
          });
        }

        // ✅ Obtener datos enriquecidos para notificación
        const enriched = await this.prisma.orderAssignToCollabs.findFirst({
          where: {
            id: id,
            worksAssigned: {
              some: { collaboratorId: newCollaborator.collaboratorId },
            },
          },
          select: {
            id: true,
            orderWorkDateStart: true,
            orderWorkHourStart: true,
            orderLocationWork: true,
            workOrderStatus: true,
            worksAssigned: {
              where: { collaboratorId: newCollaborator.collaboratorId },
              select: {
                assignment: { select: { title: true } },
              },
            },
            workOrder: {
              select: {
                workOrderCodePo: true,
                clientCompany: { select: { companyName: true } },
              },
            },
          },
        });

        if (enriched) {
          const payload = {
            id: result.id,
            orderAssignId: enriched.id,
            workOrderCodePo: enriched.workOrder?.workOrderCodePo ?? 'N/A',
            workOrderStatus: enriched.workOrderStatus,
            companyName: enriched.workOrder?.clientCompany?.companyName ?? 'N/A',
            workLocation: enriched.orderLocationWork,
            workStartDate: enriched.orderWorkDateStart,
            workStartHour: enriched.orderWorkHourStart,
            assignments: enriched.worksAssigned.map((w) => w.assignment?.title ?? ''),
          };

          try {
            this.workOrderGateway?.notifyPendingOrders(
              newCollaborator.collaboratorId,
              payload,
            );
          } catch (error) {
            console.warn('⚠️ No se pudo emitir evento WebSocket:', error.message);
          }
        }
      }

      // 8️⃣ Notificaciones globales
      try {
        this.workOrderGateway?.notifyOrdersUpdate();
        this.workOrderGateway?.notifyNotConfirmedOrders('');
      } catch (error) {
        console.warn('⚠️ No se pudo emitir actualización global:', error.message);
      }
    }

    // 9️⃣ Cargar datos actualizados completos
    const finalAssignment = await this.prisma.orderAssignToCollabs.findUnique({
      where: { id },
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
            clientCompany: {
              select: {
                companyName: true,
              },
            },
          },
        },
      },
    });

    if (!finalAssignment) {
      throw new BadRequestException('Error al cargar la asignación actualizada.');
    }

    // 🔟 Datos para correos
    const order = finalAssignment.workOrder;
    const companyName = order.clientCompany?.companyName ?? 'N/A';
    const orderCodePo = order.workOrderCodePo ?? 'N/A';

    // Supervisor opcional
    let supervisor: any = null;
    let supervisorName = 'N/A';
    if (order.supervisorUserId) {
      supervisor = await this.prisma.user.findUnique({
        where: { id: order.supervisorUserId },
        include: { userDetail: true },
      });

      if (supervisor) {
        supervisorName = supervisor.userDetail
          ? `${supervisor.userDetail.names} ${supervisor.userDetail.lastNames}`
          : supervisor.email ?? 'N/A';
      }
    }

    // 1️⃣1️⃣ Agrupar asignaciones por colaborador
    type CollaboratorGroup = {
      id: number;
      email: string;
      name: string;
      assignments: { id: number; title: string }[];
      isNew: boolean;
    };

    const collaboratorsGrouped = Object.values(
      finalAssignment.worksAssigned.reduce((acc, w) => {
        const collabId = w.collaborator.id;
        const isNewCollaborator = collaboratorsToAdd.some(
          (c) => c.collaboratorId === collabId,
        );

        if (!acc[collabId]) {
          acc[collabId] = {
            id: collabId,
            email: w.collaborator.email,
            name: w.collaborator.userDetail
              ? `${w.collaborator.userDetail.names} ${w.collaborator.userDetail.lastNames}`
              : w.collaborator.email,
            assignments: [],
            isNew: isNewCollaborator,
          };
        }

        // Evita títulos duplicados
        if (!acc[collabId].assignments.some((a) => a.id === w.assignment?.id)) {
          acc[collabId].assignments.push({
            id: w.assignment?.id || 0,
            title: w.assignment?.title || 'Sin asignación',
          });
        }

        return acc;
      }, {} as Record<number, CollaboratorGroup>),
    );

    const startDate =
      rest.orderWorkDateStart instanceof Date
        ? rest.orderWorkDateStart
        : rest.orderWorkDateStart
          ? new Date(rest.orderWorkDateStart)
          : finalAssignment.orderWorkDateStart || new Date();

    // 1️⃣2️⃣ Enviar correo SOLO a colaboradores nuevos
    for (const collab of collaboratorsGrouped.filter((c) => c.isNew)) {
      if (!collab.email) continue;
      try {
        await this.reportEmailService.sendAssignmentsToCollabs(
          [collab.email],
          orderCodePo,
          companyName,
          supervisorName,
          startDate.toISOString().split('T')[0],
          rest.orderWorkHourStart ?? finalAssignment.orderWorkHourStart ?? '',
          rest.orderLocationWork ?? finalAssignment.orderLocationWork ?? '',
          rest.orderObservations ?? finalAssignment.orderObservations ?? '',
          collab.assignments.map((a) => a.title),
          true,
        );
      } catch (error) {
        console.error(
          `❌ Error enviando correo a nuevo colaborador ${collab.email} (ID: ${collab.id}):`,
          error,
        );
      }
    }

    // 1️⃣3️⃣ Enviar correo al supervisor si hubo cambios (opcional)
    if (supervisor?.email && collaboratorsToAdd.length > 0) {
      const newCollaboratorsForEmail = collaboratorsGrouped
        .filter((collab) => collab.isNew)
        .map((collab) => ({
          name: collab.name,
          email: collab.email,
          assignments: collab.assignments.map((a) => a.title),
        }));

      try {
        await this.reportOrderAssignToSupervisorMailerService.sendAssignmentsToSupervisor(
          supervisor.email,
          orderCodePo,
          companyName,
          startDate.toISOString().split('T')[0],
          rest.orderWorkHourStart ?? finalAssignment.orderWorkHourStart ?? '',
          rest.orderLocationWork ?? finalAssignment.orderLocationWork ?? '',
          rest.orderObservations ?? finalAssignment.orderObservations ?? '',
          newCollaboratorsForEmail,
        );
      } catch (error) {
        console.error(
          `❌ Error enviando correo al supervisor ${supervisor.email}:`,
          error,
        );
      }
    }

    // 1️⃣4️⃣ Retornar respuesta
    return {
      id: finalAssignment.id,
      workOrderId: finalAssignment.workOrder.id,
      orderWorkDateStart:
        typeof finalAssignment.orderWorkDateStart === 'string'
          ? finalAssignment.orderWorkDateStart
          : finalAssignment.orderWorkDateStart?.toISOString(),
      orderWorkDateEnd:
        typeof finalAssignment.orderWorkDateEnd === 'string'
          ? finalAssignment.orderWorkDateEnd
          : finalAssignment.orderWorkDateEnd?.toISOString(),
      orderWorkHourStart: finalAssignment.orderWorkHourStart,
      orderLocationWork: finalAssignment.orderLocationWork,
      orderObservations: finalAssignment.orderObservations,
      collaborators: collaboratorsGrouped.map(({ isNew, ...collab }) => collab),
      changes: {
        added: collaboratorsToAdd.length,
        removed: collaboratorsToRemove.length,
      },
    };
  }

  async remove(id: number) {

    // Obtenemos el id del wordOrder para validar su status
    const workOrderId = await this.prisma.orderAssignToCollabs.findUnique({
      where: { id },
    })

    console.log('order to delete:', workOrderId);

    const workOrder = await this.prisma.workOrder.findUnique({
      where: { id: workOrderId.workOrderId },
    });

    console.log('workOrder:', workOrder);

    // Si la workOrder está con status 'PENDING', borrar definitivamente el registro invoncando removeDefinitive
    if (workOrder.workOrderStatus === 'PENDING') {
      return this.removeDefinitive(id);
    } else {

      // Si la workOrder no existe o workOrderStatus = 'DELETE', eliminamos definitivamente el registro
      if (!workOrder || workOrder.workOrderStatus === 'DELETE') {
        return this.removeDefinitive(id);
      }


      // Actualizamos el estado a 'DELETE' (sin eliminar el registro)
      return this.prisma.orderAssignToCollabs.update({
        where: { id },
        data: { workOrderStatus: 'DELETE' },
      });
    }
  }

  async removeDefinitive(id: number) {
    return this.prisma.orderAssignToCollabs.delete({
      where: { id },
    });
  }
}
