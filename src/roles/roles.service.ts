import { Injectable } from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createRoleDto: CreateRoleDto[]) {
    const existingRoles = await this.prisma.role.findMany({
      where: {
        name: {
          in: createRoleDto.map((role) => role.name),
        },
      },
    });

    if (existingRoles.length > 0) {
      throw new Error(
        `Los roles ${existingRoles.map((role) => role.name)} ya existen`,
      );
    }

    try {
      for (const roleDto of createRoleDto) {
        await this.prisma.role.create({
          data: roleDto,
        });
      }
      // Si deseas devolver algo, puedes devolver un mensaje o los roles creados
      return { message: 'Roles creados exitosamente', roles: createRoleDto };
    } catch (error) {
      throw new Error(`Error al crear roles: ${error.message}`);
    }
  }

  findAll() {
    return this.prisma.role.findMany();
  }

  findOne(id: number) {
    return this.prisma.role.findUnique({
      where: { id: id },
    });
  }

  update(id: number, updateRoleDto: UpdateRoleDto) {
    return this.prisma.role.update({
      where: { id: id },
      data: updateRoleDto,
    });
  }

  remove(id: number) {
    return this.prisma.role.delete({
      where: { id: id },
    });
  }
}
