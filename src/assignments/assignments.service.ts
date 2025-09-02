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

      // Verificar si ya existe un assignment con el mismo title
      const exists = await this.prisma.assignment.findFirst({
        where: { title: element.title },
      });

      try {
        if (!exists) {
          await this.prisma.assignment.create({
            data: {
              title: element.title,
              costPerHour: element.costPerHour,
              assignmentType: element.assignmentType,
            },
          });
        }
        // Si existe, simplemente continúa con el siguiente
      } catch (error) {
        console.error(`Error creating assignment with title ${element.title}:`, error);
      }



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
        assignmentType: updateAssignmentDto.assignmentType,
      },
    });
  }

  async remove(id: number) {
    return await this.prisma.assignment.delete({
      where: { id },
    });
  }
}
