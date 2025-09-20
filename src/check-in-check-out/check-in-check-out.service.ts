/* eslint-disable prettier/prettier */
// check-in-check-out.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateCheckInCheckOutDto, CheckType } from './dto/create-check-in-check-out.dto';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class CheckInCheckOutService {
  constructor(private readonly prisma: PrismaService) { }

  async create(dto: CreateCheckInCheckOutDto) {
    const { checkType, orderId, userCollabId, time, status } = dto;

    if (checkType === CheckType.IN) {
      const checkIn = await this.prisma.checkIn.create({
        data: {
          orderId,
          userCollabId,
          startTime: time,
          initialStatus: status,
        },
      });

      // Actualizar el estado de la orden de trabajo a "RUNNING"
      await this.prisma.workOrder.update({
        where: { id: orderId },
        data: { workOrderStatus: 'RUNNING' },
      });

      return checkIn;

    } else if (checkType === CheckType.OUT) {
      const checkOut = await this.prisma.checkOut.create({
        data: {
          orderId,
          userCollabId,
          finalTime: time,
          initialStatus: status,
        },
      });

      // Actualizar el estado de la orden de trabajo a "CLOSED"
      await this.prisma.workOrder.update({
        where: { id: orderId },
        data: { workOrderStatus: 'CLOSED' },
      });

      return checkOut;
    } else {
      throw new BadRequestException('Tipo de registro inválido');
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

  async remove(id: number) {
    await this.prisma.checkIn.deleteMany({ where: { id } });
    await this.prisma.checkOut.deleteMany({ where: { id } });
    return { message: `Registro ${id} eliminado` };
  }
}
