/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) { }

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

  async findAll() {
    // 1. Obtener la lista de roles
    const roles = await this.prisma.role.findMany();

    // 2. Usar .map() para transformar cada objeto
    return roles.map((role) => ({
      // Copiamos el 'id'
      id: role.id,
      // Renombramos 'name' a 'title'
      title: role.name,
      // Copiamos las demás propiedades si son necesarias (opcional)
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    }));
  }

  async findOne(id: number) {
    // 1. Obtener el rol único (puede ser null si no se encuentra)
    const role = await this.prisma.role.findUnique({
      where: { id: id },
    });

    // 2. Verificar si se encontró un rol antes de transformarlo
    if (role) {
      // Si se encuentra, renombramos la propiedad 'name' a 'title'
      return {
        id: role.id,
        title: role.name, // El cambio se hace aquí
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
        // Se pueden omitir createdAt y updatedAt si no se necesitan
      };
    }

    // 3. Si no se encuentra, retornamos el valor original (null o undefined)
    return role;
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
