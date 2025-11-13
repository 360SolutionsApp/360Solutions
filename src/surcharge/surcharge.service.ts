/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateSurchargeDto } from './dto/create-surcharge.dto';
import { UpdateSurchargeDto } from './dto/update-surcharge.dto';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class SurchargeService {
  constructor(private prisma: PrismaService) { }

  // CREATE
  async create(dto: CreateSurchargeDto) {
    return this.prisma.salarySurcharge.create({
      data: dto,
    });
  }

  // FIND ALL
  async findAll() {
    return this.prisma.salarySurcharge.findMany({
      orderBy: { minHour: 'asc' },
    });
  }

  // FIND ONE
  async findOne(id: number) {
    const surcharge = await this.prisma.salarySurcharge.findUnique({
      where: { id },
    });

    if (!surcharge) {
      throw new NotFoundException(`Surcharge ID ${id} not found.`);
    }

    return surcharge;
  }

  // UPDATE
  async update(id: number, dto: UpdateSurchargeDto) {
    const exists = await this.prisma.salarySurcharge.findUnique({
      where: { id },
    });

    if (!exists) {
      throw new NotFoundException(`Surcharge ID ${id} not found.`);
    }

    return this.prisma.salarySurcharge.update({
      where: { id },
      data: dto,
    });
  }

  // DELETE
  async remove(id: number) {
    const exists = await this.prisma.salarySurcharge.findUnique({
      where: { id },
    });

    if (!exists) {
      throw new NotFoundException(`Surcharge ID ${id} not found.`);
    }

    return this.prisma.salarySurcharge.delete({
      where: { id },
    });
  }
}
