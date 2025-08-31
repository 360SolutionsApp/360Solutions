/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class AssignmentsService {
  constructor(private readonly prisma: PrismaService) { }
  async create(createAssignmentDto: CreateAssignmentDto[]) {
    for (let i = 0; i < createAssignmentDto.length; i++) {
      const element = createAssignmentDto[i];
      await this.prisma.assignment.create({
        data: {
          title: element.title,
          costPerHour: element.costPerHour,
          discount: element.discount,
        },
      });
    }
  }

  async findAll() {
    return await this.prisma.assignment.findMany();
  }

  async findOne(id: number) {
    return await this.prisma.assignment.findUnique({
      where: { id },
    });
  }

  async update(id: number, updateAssignmentDto: UpdateAssignmentDto) {
    return await this.prisma.assignment.update({
      where: { id },
      data: {
        title: updateAssignmentDto.title,
        costPerHour: updateAssignmentDto.costPerHour,
        discount: updateAssignmentDto.discount,
      },
    });
  }

  async remove(id: number) {
    return await this.prisma.assignment.delete({
      where: { id },
    });
  }
}
