/* eslint-disable prettier/prettier */
// check-in-check-out.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateCheckInCheckOutDto, CheckType } from './dto/create-check-in-check-out.dto';
import { PrismaService } from 'src/prisma.service';
import { WorkOrderStatus } from '@prisma/client';

@Injectable()
export class CheckInCheckOutService {
  constructor(private readonly prisma: PrismaService) { }

  async create(dto: CreateCheckInCheckOutDto) {
    const { checkType, orderId, userCollabId, time, status } = dto;

    // Obtener colaboradores asignados a la orden
    const assignedCollabs = await this.prisma.orderAssignToCollabs.findMany({
      where: { workOrderId: orderId },
    });

    if (assignedCollabs.length === 0) {
      throw new BadRequestException('La orden de trabajo no tiene colaboradores asignados.');
    }

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

      // Contar cuántos colaboradores han hecho check-in
      const checkInsCount = await this.prisma.checkIn.count({ where: { orderId } });

      // Actualizar estado de la orden
      let newStatus: WorkOrderStatus;

      if (checkInsCount === assignedCollabs.length) {
        newStatus = WorkOrderStatus.RUNNING; // Todos hicieron check-in
      } else {
        newStatus = WorkOrderStatus.PARTIALLY_RUNNING; // Al menos uno, pero no todos
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

      // Contar cuántos colaboradores han hecho check-out
      const checkOutsCount = await this.prisma.checkOut.count({ where: { orderId } });

      // Actualizar estado de la orden
      let newStatus: WorkOrderStatus;

      if (checkOutsCount === assignedCollabs.length) {
        newStatus = WorkOrderStatus.CLOSED; // Todos hicieron check-out
      } else {
        newStatus = WorkOrderStatus.PARTIALLY_CLOSED; // Algunos han hecho check-out, pero no todos
      }

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
  async findByOrderId(orderId: number) {
    const checkIn = await this.prisma.checkIn.findFirst({ where: { orderId } });
    const checkOut = await this.prisma.checkOut.findFirst({ where: { orderId } });
    return { checkIn, checkOut };
  }

  async remove(id: number) {
    await this.prisma.checkIn.deleteMany({ where: { id } });
    await this.prisma.checkOut.deleteMany({ where: { id } });
    return { message: `Registro ${id} eliminado` };
  }
}
