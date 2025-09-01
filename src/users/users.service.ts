/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/prisma.service';
import * as bcrypt from 'bcryptjs';
import { UsersCodeVerifyService } from './usersCodeVerify.service';
import { paginate } from 'src/helpers/pagination.helper';
import { ResponseUserDto } from './dto/response-user.dto';
import { PaginationDto } from 'src/helpers/pagination.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly usersCodeVerifyService: UsersCodeVerifyService,
  ) { }

  async create(createUserDto: CreateUserDto) {
    const verifyEmail = await this.prismaService.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (verifyEmail) {
      return 'El correo ya se encuentra registrado';
    }

    try {
      // 1. Crear usuario solo con email + rol
      const user = await this.prismaService.user.create({
        data: {
          email: createUserDto.email,
          role: {
            connect: { id: createUserDto.roleId },
          },
        },
      });

      // 2. Crear detalles del usuario vinculados al `userId`
      await this.prismaService.userDetail.create({
        data: {
          userId: user.id,
          names: createUserDto.names,
          lastNames: createUserDto.lastNames,
          phone: createUserDto.phone,
          originCountry: createUserDto.originCountry,
          address: createUserDto.address,
          documentTypeId: createUserDto.documentTypeId,
          documentNumber: createUserDto.documentNumber,
        },
      });

      // 3. Generar código de verificación
      await this.usersCodeVerifyService.createCode(user.id);

      // 4. Traer usuario con sus relaciones (rol + detalle + tipo de documento)
      const userWithRelations = await this.prismaService.user.findUnique({
        where: { id: user.id },
        include: {
          role: true,
          userDetail: {
            include: {
              documentType: true,
            },
          },
        },
      });

      return {
        id: userWithRelations.id,
        email: userWithRelations.email,
        role: userWithRelations.role.name, // nombre del rol
        names: userWithRelations.userDetail?.names,
        lastNames: userWithRelations.userDetail?.lastNames,
        phone: userWithRelations.userDetail?.phone,
        documentType: userWithRelations.userDetail?.documentType?.name, // nombre del documento
        documentNumber: userWithRelations.userDetail?.documentNumber,
      };
    } catch (error) {
      console.error('Error al crear el usuario:', error);
      throw new NotFoundException('No se pudo crear el usuario');
    }
  }

  async validatePassword(password: string) {
    const passwordLength = password.length;
    if (passwordLength < 8) {
      throw new NotFoundException(
        'La contraseña debe tener al menos 8 caracteres.',
      );
    }

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[-!@#$%^&*()_+[\]{};':"\\|,.<>/?`~])[A-Za-z\d\-!@#$%^&*()_+\[\]{};':"\\|,.<>\/?`~]{8,}$/;
    if (!passwordRegex.test(password)) {
      throw new NotFoundException(
        'La contraseña debe contener al menos una letra mayúscula, una letra minúscula, un número y un carácter especial.',
      );
    }
  }

  async assignedPassword(email: string, password: string) {
    this.validatePassword(password);

    try {
      // Usamos el método `genSalt` y `hash` de forma asíncrona.
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Actualizar la contraseña del usuario en la base de datos.
      const updatedUser = await this.prismaService.user.update({
        where: { email: email },
        data: { password: hashedPassword },
      });

      // Retornamos el objeto del usuario actualizado.
      // Excluimos el password de la respuesta
      const { password: _, ...userWithoutPassword } = updatedUser;
      return userWithoutPassword;
    } catch (error) {
      // Si Prisma no encuentra el registro para actualizar, lanza un error.
      // Aquí lo capturamos y lanzamos una excepción más específica.
      if (error.code === 'P2025') {
        throw new NotFoundException('User not found.');
      }

      // Para cualquier otro tipo de error, puedes lanzarlo de nuevo
      // o manejarlo de forma adecuada.
      throw error;
    }
  }

  async recoveryPassword(email: string) {
    const user = await this.prismaService.user.findUnique({
      where: { email: email },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    // Generar codigo de verificación
    return this.usersCodeVerifyService.createCode(user.id);
  }

  async resetPassword(email: string, password: string) {
    const user = await this.prismaService.user.findUnique({
      where: { email: email },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    this.validatePassword(password);

    try {
      // Usamos el método `genSalt` y `hash` de forma asíncrona.
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Actualizar la contraseña del usuario en la base de datos.
      const updatedUser = await this.prismaService.user.update({
        where: { email: email },
        data: { password: hashedPassword },
      });

      // Retornamos el objeto del usuario actualizado.
      return `Usuario ${updatedUser.email} su contraseña ha sido restablecida con éxito`;
    } catch (error) {
      // Si Prisma no encuentra el registro para actualizar, lanza un error.
      // Aquí lo capturamos y lanzamos una excepción más específica.
      if (error.code === 'P2025') {
        throw new NotFoundException('User not found.');
      }

      // Para cualquier otro tipo de error, puedes lanzarlo de nuevo
      // o manejarlo de forma adecuada.
      throw error;
    }
  }

  async findAll(params: PaginationDto) {
    const result = await paginate(this.prismaService.user, params, {
      searchFields: ['email'],
      relationSearch: {
        userDetail: ['names', 'lastNames', 'documentNumber'],
      },
      include: {
        role: true,
        userDetail: {
          include: {
            documentType: true,
          },
        },
      },
    });

    // 🔒 Excluir password manualmente
    result.data = result.data.map(({ password, ...user }: any) => user);

    return result;
  }

  async findOne(id: number) {
    return await this.prismaService.user.findUnique({
      where: { id: id },
    });
  }

  async update(email: string, updateUserDto: UpdateUserDto) {
    const user = await this.prismaService.user.findUnique({
      where: { email: email },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    return await this.prismaService.user.update({
      where: { email: email },
      data: updateUserDto,
    });
  }

  remove(id: number) {
    const user = this.prismaService.user.findUnique({
      where: { id: id },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    return this.prismaService.user.delete({
      where: { id: id },
    });
  }
}
