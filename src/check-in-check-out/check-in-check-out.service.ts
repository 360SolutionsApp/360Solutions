/* eslint-disable prettier/prettier */
// check-in-check-out.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateCheckInCheckOutDto, CheckType } from './dto/create-check-in-check-out.dto';
import { PrismaService } from 'src/prisma.service';
import { WorkOrderStatus as workOrderStatus } from '@prisma/client';
import { InvoicesService } from 'src/invoices/invoices.service';
import { InvoiceUpdateService } from 'src/invoices/invoice-update';
@Injectable()
export class CheckInCheckOutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invoiceService: InvoicesService,
    private readonly invoiceUpdateService: InvoiceUpdateService
  ) { }

  async create(dto: CreateCheckInCheckOutDto) {
    const { checkType, orderId, userCollabId, time, status } = dto;

    // Obtenemos la orden asignada
    const assignedCollabs = await this.prisma.orderAssignToCollabs.findMany({
      where: { workOrderId: orderId },
    });

    // Obtenemos los IDs de los colaboradores asignados
    const assignedCollabsOrder = await this.prisma.workersAssignToOrder.findMany({
      where: { orderAssignToCollabId: { in: assignedCollabs.map(c => c.id) } },
      select: { collaboratorId: true },
    });

    console.log('Colaboradores asignados:', orderId, assignedCollabsOrder);

    if (checkType === CheckType.IN) {
      // Verificar si el colaborador ya hizo check-in en esta orden
      const existingCheckInForUser = await this.prisma.checkIn.findFirst({
        where: { orderId, userCollabId },
      });

      if (existingCheckInForUser) {
        throw new BadRequestException('Este colaborador ya hizo check-in en esta orden.');
      }

      // Crear registro de check-in
      const checkIn = await this.prisma.checkIn.create({
        data: {
          orderId,
          userCollabId,
          startTime: time,
          initialStatus: status,
        },
      });

      // Obtener colaboradores únicos asignados a la orden
      const assignedCollabIds = [
        ...new Set(assignedCollabsOrder.map(c => c.collaboratorId)),
      ];

      const totalCollabs = assignedCollabIds.length;

      // Contar cuántos colaboradores han hecho check-in
      const checkInsCount = await this.prisma.checkIn.count({
        where: { orderId, userCollabId: { in: assignedCollabIds } },
      });

      console.log(`Total colaboradores: ${totalCollabs}, con check-in: ${checkInsCount}`);

      // Determinar nuevo estado según la cantidad de colaboradores
      let newStatus: workOrderStatus;

      if (totalCollabs === 1 && checkInsCount === 1) {
        // Solo 1 colaborador y ya hizo check-in
        newStatus = workOrderStatus.RUNNING;
      } else if (totalCollabs > 1 && checkInsCount < totalCollabs) {
        // Más de un colaborador y solo algunos hicieron check-in
        newStatus = workOrderStatus.PARTIALLY_RUNNING;
      } else if (totalCollabs > 1 && checkInsCount === totalCollabs) {
        // Todos los colaboradores hicieron check-in
        newStatus = workOrderStatus.RUNNING;
      }

      await this.prisma.workOrder.update({
        where: { id: orderId },
        data: { workOrderStatus: newStatus },
      });

      return checkIn;
    }

    else if (checkType === CheckType.OUT) {
      // Verificar si el colaborador ya hizo check-out en esta orden
      const existingCheckOutForUser = await this.prisma.checkOut.findFirst({
        where: { orderId, userCollabId },
      });

      if (existingCheckOutForUser) {
        throw new BadRequestException('Este colaborador ya hizo check-out en esta orden.');
      }

      // Crear registro de check-out
      const checkOut = await this.prisma.checkOut.create({
        data: {
          orderId,
          userCollabId,
          finalTime: time,
          initialStatus: status,
        },
      });

      // 3. 🔥 INTEGRACIÓN DEL SERVICIO DE FACTURACIÓN
      try {
        console.log(`🔄 Generando factura automática para usuario ${userCollabId} en orden ${orderId}`);

        const invoiceResult = await this.invoiceService.createInvoicesForUser(userCollabId, [orderId]);

        console.log(`✅ Factura generada exitosamente:`, {
          userId: userCollabId,
          orderId,
          invoicesCreadas: invoiceResult.invoices.length,
          mensaje: invoiceResult.message
        });

      } catch (error) {
        console.error(`❌ Error generando factura automática:`, {
          userId: userCollabId,
          orderId,
          error: error.message
        });

      }

      // Obtener colaboradores únicos asignados a la orden
      const assignedCollabIds = [
        ...new Set(assignedCollabsOrder.map(c => c.collaboratorId)),
      ];

      const totalCollabs = assignedCollabIds.length;

      // Contar cuántos colaboradores han hecho check-out
      const checkOutsCount = await this.prisma.checkOut.count({
        where: { orderId, userCollabId: { in: assignedCollabIds } },
      });

      console.log(`Total colaboradores: ${totalCollabs}, con check-out: ${checkOutsCount}`);

      // === 🔍 DEBUG CRÍTICO - AGREGAR AQUÍ ===
      console.log('🔍 DEBUG CHECKOUT - Order:', orderId);
      console.log('📊 totalCollabs:', totalCollabs);
      console.log('📊 checkOutsCount:', checkOutsCount);
      console.log('❓ checkOutsCount === totalCollabs:', checkOutsCount === totalCollabs);
      console.log('❓ checkOutsCount < totalCollabs:', checkOutsCount < totalCollabs);
      console.log('📝 assignedCollabIds:', assignedCollabIds);

      // Verificar individualmente cada colaborador
      for (const collabId of assignedCollabIds) {
        const hasCheckout = await this.prisma.checkOut.findFirst({
          where: { orderId, userCollabId: collabId }
        });
        console.log(`👤 Collab ${collabId} has checkout:`, !!hasCheckout);
      }
      // === FIN DEBUG ===

      // Determinar nuevo estado según la cantidad de colaboradores
      let newStatus: workOrderStatus;

      if (totalCollabs === 1 && checkOutsCount === 1) {
        newStatus = workOrderStatus.CLOSED;
        console.log('✅ Setting CLOSED (single worker)');
      } else if (totalCollabs > 1 && checkOutsCount < totalCollabs) {
        newStatus = workOrderStatus.PARTIALLY_CLOSED;
        console.log('🟡 Setting PARTIALLY_CLOSED');
      } else if (totalCollabs > 1 && checkOutsCount === totalCollabs) {
        newStatus = workOrderStatus.CLOSED;
        console.log('✅ Setting CLOSED (all workers completed)');
      } else {
        console.log('❌ No condition matched!');
        // Por defecto, mantener estado actual
        newStatus = workOrderStatus.PARTIALLY_CLOSED;
      }

      console.log('🎯 Final status to set:', newStatus);

      await this.prisma.workOrder.update({
        where: { id: orderId },
        data: { workOrderStatus: newStatus },
      });

      return checkOut;
    }

    else {
      throw new BadRequestException('Tipo de registro inválido. Use IN o OUT.');
    }
  }

  // Agrega este método en la clase CheckInCheckOutService
  async debugOrderStatus(orderId: number) {
    // Contar asignados únicos
    const assignedCollabs = await this.prisma.workersAssignToOrder.findMany({
      where: {
        orderAssignToCollab: { workOrderId: orderId }
      },
      select: { collaboratorId: true }
    });

    const uniqueAssigned = new Set(assignedCollabs.map(a => a.collaboratorId)).size;

    // Contar checkins únicos
    const checkins = await this.prisma.checkIn.findMany({
      where: { orderId },
      select: { userCollabId: true }
    });
    const uniqueCheckins = new Set(checkins.map(c => c.userCollabId)).size;

    // Contar checkouts únicos
    const checkouts = await this.prisma.checkOut.findMany({
      where: { orderId },
      select: { userCollabId: true }
    });
    const uniqueCheckouts = new Set(checkouts.map(c => c.userCollabId)).size;

    console.log('=== DEBUG ORDER STATUS ===');
    console.log('Unique assigned:', uniqueAssigned);
    console.log('Unique checkins:', uniqueCheckins);
    console.log('Unique checkouts:', uniqueCheckouts);
    console.log('All have checkin/checkout:', uniqueCheckins === uniqueCheckouts && uniqueCheckins === uniqueAssigned);

    return {
      uniqueAssigned,
      uniqueCheckins,
      uniqueCheckouts,
      shouldBeClosed: uniqueCheckins === uniqueCheckouts && uniqueCheckins === uniqueAssigned
    };
  }

  async findAll() {
    const checkIns = await this.prisma.checkIn.findMany({
      include: {
        userCollab: { select: { id: true, email: true, userDetail: true } },
        order: true,
      },
    });

    const checkOuts = await this.prisma.checkOut.findMany({
      include: {
        userCollab: { select: { id: true, email: true, userDetail: true } },
        order: true,
      },
    });

    return [
      ...checkIns.map((ci) => ({
        id: ci.id,
        type: 'IN',
        orderId: ci.orderId,
        userCollab: ci.userCollab,
        time: ci.startTime,
        status: ci.initialStatus,
        attachEvidenceOneUrl: ci.attachEvidenceOneUrl, // <- se siguen mostrando porque el otro servicio los guarda
        attachEvidenceTwoUrl: ci.attachEvidenceTwoUrl,
        createdAt: ci.createdAt,
      })),
      ...checkOuts.map((co) => ({
        id: co.id,
        type: 'OUT',
        orderId: co.orderId,
        userCollab: co.userCollab,
        time: co.finalTime,
        status: co.initialStatus,
        attachEvidenceOneUrl: co.attachEvidenceOneUrl,
        attachEvidenceTwoUrl: co.attachEvidenceTwoUrl,
        createdAt: co.createdAt,
      })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findOne(id: number) {
    const checkIn = await this.prisma.checkIn.findUnique({
      where: { id },
      include: {
        userCollab: { select: { id: true, email: true, userDetail: true } },
        order: true,
      },
    });

    if (checkIn) {
      return {
        id: checkIn.id,
        type: 'IN',
        orderId: checkIn.orderId,
        userCollab: checkIn.userCollab,
        time: checkIn.startTime,
        status: checkIn.initialStatus,
        attachEvidenceOneUrl: checkIn.attachEvidenceOneUrl,
        attachEvidenceTwoUrl: checkIn.attachEvidenceTwoUrl,
        createdAt: checkIn.createdAt,
      };
    }

    const checkOut = await this.prisma.checkOut.findUnique({
      where: { id },
      include: {
        userCollab: { select: { id: true, email: true, userDetail: true } },
        order: true,
      },
    });

    if (checkOut) {
      return {
        id: checkOut.id,
        type: 'OUT',
        orderId: checkOut.orderId,
        userCollab: checkOut.userCollab,
        time: checkOut.finalTime,
        status: checkOut.initialStatus,
        attachEvidenceOneUrl: checkOut.attachEvidenceOneUrl,
        attachEvidenceTwoUrl: checkOut.attachEvidenceTwoUrl,
        createdAt: checkOut.createdAt,
      };
    }

    throw new BadRequestException(`No se encontró registro con id ${id}`);
  }

  // Obtener el CheckIn/Checkout según el id de la orden de trabajo
  async findByOrderId(orderId: number, userId: number) {

    // Obtenemos el check-in de este usuario en esta orden
    const checkIn = await this.prisma.checkIn.findFirst({
      where: { orderId, userCollabId: userId },
      include: {
        userCollab: { select: { id: true, email: true, userDetail: true } },
        order: true,
      },
    });

    // Obtenemos el check-out de este usuario en esta orden
    const checkOut = await this.prisma.checkOut.findFirst({
      where: { orderId, userCollabId: userId },
      include: {
        userCollab: { select: { id: true, email: true, userDetail: true } },
        order: true,
      },
    });

    // Retornamos ambos registros (puede que uno sea null si no se ha hecho)
    return {
      checkIn: checkIn,
      checkOut: checkOut,
    };

  }

  // Listar todas las ordenes con sus respectivos colaboradores que han hecho checkin y los que no
  // y ordenar las ordenes por fecha de inicio descendente con páginación 
  async listOrdersWithCheckInStatus(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const workOrders = await this.prisma.workOrder.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        orderAssignToCollab: {
          include: {
            worksAssigned: {
              include: {
                collaborator: {
                  select: {
                    id: true,
                    email: true,
                    userDetail: true,
                  },
                },
              },
            },
          },
        },
        checkIn: {
          select: {
            userCollabId: true,
          },
        },
      },
    });

    // Map workOrders to include check-in status for each collaborator
    for (const wo of workOrders) {
      (wo as any).collaborators = [];
      const checkedInIds = wo.checkIn.map((ci) => ci.userCollabId);
      for (const assign of wo.orderAssignToCollab) {
        for (const wa of assign.worksAssigned) {
          (wo as any).collaborators.push({
            ...wa.collaborator,
            hasCheckedIn: checkedInIds.includes(wa.collaborator.id),
          });
        }
      }
      // Optionally, remove raw relations to clean up response
      delete wo.orderAssignToCollab;
      delete wo.checkIn;
    }
    return {
      workOrders,
      pagination: {
        page,
        limit,
        total: await this.prisma.workOrder.count(),
      },
    };
  }


  // Listar los colaboradores asignados a una orden con su estado de check-in y check-out
  // Listar los colaboradores asignados así no hayan hecho check-in o check-out pero mostrar el estado de la orden
  // Listar los colaboradores asignados a una orden con su estado de check-in y check-out
  // ✅ Mantiene la estructura original de orderAssignToCollab
  // ✅ Añade un array workOrder.uniqueCollaborators con los colaboradores únicos enriquecidos
  // Listar los colaboradores asignados a una orden con su estado de check-in y check-out
  async listCollaboratorsWithCheckInStatus(workOrderId: number) {
    // 1️⃣ Obtener la orden con sus asignaciones
    const workOrder = await this.prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: {
        orderAssignToCollab: {
          include: {
            worksAssigned: {
              include: {
                collaborator: {
                  select: {
                    id: true,
                    email: true,
                    userDetail: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!workOrder) {
      throw new BadRequestException(`No se encontró la orden de trabajo con id ${workOrderId}`);
    }

    // 2️⃣ Recolectar todos los IDs únicos de colaboradores
    const collaboratorIds: number[] = [];
    for (const assign of workOrder.orderAssignToCollab) {
      for (const wa of assign.worksAssigned) {
        if (wa.collaborator?.id) {
          collaboratorIds.push(wa.collaborator.id);
        }
      }
    }

    const uniqueCollaboratorIds = Array.from(new Set(collaboratorIds));

    // 3️⃣ Consultar todos los checkIns y checkOuts en una sola pasada
    const [checkIns, checkOuts] = await Promise.all([
      this.prisma.checkIn.findMany({
        where: { orderId: workOrderId, userCollabId: { in: uniqueCollaboratorIds } },
        select: { userCollabId: true, startTime: true },
      }),
      this.prisma.checkOut.findMany({
        where: { orderId: workOrderId, userCollabId: { in: uniqueCollaboratorIds } },
        select: { userCollabId: true, finalTime: true },
      }),
    ]);

    // 4️⃣ Crear mapas para acceso rápido
    const checkInMap = new Map<number, string>();
    const checkOutMap = new Map<number, string>();

    for (const ci of checkIns) checkInMap.set(ci.userCollabId, ci.startTime);
    for (const co of checkOuts) checkOutMap.set(co.userCollabId, co.finalTime);

    // 5️⃣ Limpiar duplicados dentro de worksAssigned
    for (const assign of workOrder.orderAssignToCollab) {
      const uniqueWorksAssigned: any[] = [];

      const seenCollaborators = new Set<number>();

      for (const wa of assign.worksAssigned) {
        const collabId = wa.collaborator?.id;

        if (collabId && !seenCollaborators.has(collabId)) {
          seenCollaborators.add(collabId);

          // Agregar info de check-in / check-out directamente al colaborador
          (wa.collaborator as any).hasCheckedIn = checkInMap.has(collabId);
          (wa.collaborator as any).hasCheckedOut = checkOutMap.has(collabId);
          (wa.collaborator as any).checkInTime = checkInMap.get(collabId) ?? null;
          (wa.collaborator as any).checkOutTime = checkOutMap.get(collabId) ?? null;

          uniqueWorksAssigned.push(wa);
        }
      }

      assign.worksAssigned = uniqueWorksAssigned;
    }

    // 6️⃣ Retornar la estructura original pero sin duplicados
    return workOrder;
  }


  async update(
    id: number,
    dto: {
      checkType: CheckType; // 'IN' o 'OUT'
      time?: string;
      status?: string;
      attachEvidenceOneUrl?: string;
      attachEvidenceTwoUrl?: string;
    },
  ) {
    const { checkType, time, status, attachEvidenceOneUrl, attachEvidenceTwoUrl } = dto;

    if (!checkType) {
      throw new BadRequestException('Debe especificar el tipo de registro: IN o OUT.');
    }

    if (checkType === CheckType.IN) {
      const existingCheckIn = await this.prisma.checkIn.findUnique({
        where: { id },
      });

      if (!existingCheckIn) {
        throw new BadRequestException(`No se encontró un check-in con id ${id}.`);
      }

      const updatedCheckIn = await this.prisma.checkIn.update({
        where: { id },
        data: {
          ...(time && { startTime: time }),
          ...(status && { initialStatus: status }),
          ...(attachEvidenceOneUrl && { attachEvidenceOneUrl }),
          ...(attachEvidenceTwoUrl && { attachEvidenceTwoUrl }),
        },
        include: {
          userCollab: { select: { id: true, email: true, userDetail: true } },
          order: true,
        },
      });

      // 🔥 ACTUALIZAR FACTURAS RELACIONADAS
      try {
        await this.invoiceUpdateService.updateInvoicesByCheckRecord(id, 'IN');
      } catch (error) {
        console.error('Error actualizando facturas después de modificar check-in:', error);
        // No lanzamos error para no afectar la respuesta principal
      }

      return {
        message: 'Check-in actualizado correctamente.',
        updatedCheckIn,
      };
    }

    if (checkType === CheckType.OUT) {
      const existingCheckOut = await this.prisma.checkOut.findUnique({
        where: { id },
      });

      if (!existingCheckOut) {
        throw new BadRequestException(`No se encontró un check-out con id ${id}.`);
      }

      const updatedCheckOut = await this.prisma.checkOut.update({
        where: { id },
        data: {
          ...(time && { finalTime: time }),
          ...(status && { initialStatus: status }),
          ...(attachEvidenceOneUrl && { attachEvidenceOneUrl }),
          ...(attachEvidenceTwoUrl && { attachEvidenceTwoUrl }),
        },
        include: {
          userCollab: { select: { id: true, email: true, userDetail: true } },
          order: true,
        },
      });

      // Actualizamos la factura al cambiar la hora del checkout
      // 🔥 ACTUALIZAR FACTURAS RELACIONADAS
      try {
        await this.invoiceUpdateService.updateInvoicesByCheckRecord(id, 'OUT');
      } catch (error) {
        console.error('Error actualizando facturas después de modificar check-out:', error);
        // No lanzamos error para no afectar la respuesta principal
      }

      return {
        message: 'Check-out actualizado correctamente.',
        updatedCheckOut,
      };
    }

    throw new BadRequestException('Tipo de registro inválido. Use IN o OUT.');
  }


  async remove(id: number) {
    await this.prisma.checkIn.deleteMany({ where: { id } });
    await this.prisma.checkOut.deleteMany({ where: { id } });
    return { message: `Registro ${id} eliminado` };
  }
}
