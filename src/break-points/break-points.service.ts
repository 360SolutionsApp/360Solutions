/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateBreakPointDto } from './dto/create-break-point.dto';
import { UpdateBreakPointDto } from './dto/update-break-point.dto';
import { PrismaService } from 'src/prisma.service';
import { InvoiceUpdateService } from 'src/invoices/invoice-update';

@Injectable()
export class BreakPointsService {
  constructor(
    private prisma: PrismaService,
    private InvoiceUpdateService: InvoiceUpdateService
  ) { }

  async create(createBreakPointDto: CreateBreakPointDto) {
    console.log('nuevo break', createBreakPointDto);
    /*return await this.prisma.breakPeriod.create({
      data: createBreakPointDto,
    });*/
    const breakPeriod = await this.prisma.breakPeriod.create({
      data: createBreakPointDto,
    });

    console.log('breakPeriod', breakPeriod);

    try {
      await this.InvoiceUpdateService.updateInvoicesByCheckRecord(breakPeriod.checkInId, 'IN');
    } catch (error) {
      console.error('Error actualizando facturas después de modificar check-in:', error);
      // No lanzamos error para no afectar la respuesta principal
    }

    return breakPeriod;
  }

  async findAll() {
    return await this.prisma.breakPeriod.findMany({
      include: {
        userCollab: true,
        checkIn: true,
      },
    });
  }

  async findOne(id: number) {
    const breakPeriod = await this.prisma.breakPeriod.findUnique({
      where: { id },
      include: {
        userCollab: true,
        checkIn: true,
      },
    });
    if (!breakPeriod) {
      throw new NotFoundException(`Break period with ID ${id} not found`);
    }
    return breakPeriod;
  }

  async findByUserAndCheckIn(filters: {
    userCollabId?: number;
    checkInId?: number;
  }) {
    const { userCollabId, checkInId } = filters;

    return await this.prisma.breakPeriod.findMany({
      where: {
        ...(userCollabId !== undefined && { userCollabId }),
        ...(checkInId !== undefined && { checkInId }),
      },
      include: {
        userCollab: true,
        checkIn: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async update(id: number, updateBreakPointDto: UpdateBreakPointDto) {
    await this.findOne(id); // Verificamos existencia
    const breakPeriod = await this.prisma.breakPeriod.update({
      where: { id },
      data: updateBreakPointDto,
    });

    console.log('breakPeriod', breakPeriod);

    try {
      await this.InvoiceUpdateService.updateInvoicesByCheckRecord(breakPeriod.checkInId, 'IN');
    } catch (error) {
      console.error('Error actualizando facturas después de modificar check-in:', error);
      // No lanzamos error para no afectar la respuesta principal
    }

    return breakPeriod;
  }

  async remove(id: number) {
    await this.findOne(id); // Verificamos existencia
    return await this.prisma.breakPeriod.delete({
      where: { id },
    });
  }
}
