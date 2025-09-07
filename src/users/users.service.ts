/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/prisma.service';
import * as bcrypt from 'bcryptjs';
import { UsersCodeVerifyService } from './usersCodeVerify.service';
import { PaginationDto } from 'src/helpers/pagination.dto';
import { UsersAttachmentService } from './users-attachment.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly usersCodeVerifyService: UsersCodeVerifyService,
    private readonly usersAttachmentService: UsersAttachmentService
  ) { }

  async create(createUserDto: CreateUserDto) {
    // 1. Verificar si el correo ya existe
    const verifyEmail = await this.prismaService.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (verifyEmail) {
      throw new ConflictException('El correo ya se encuentra registrado');
    }

    try {
      // 2. Crear usuario con detalle en una sola transacción (anidado)
      const user = await this.prismaService.user.create({
        data: {
          email: createUserDto.email,
          role: {
            connect: { id: createUserDto.roleId },
          },
          userDetail: {
            create: {
              names: createUserDto.names,
              lastNames: createUserDto.lastNames,
              phone: createUserDto.phone,
              currentCityId: createUserDto.currentCityId,
              address: createUserDto.address,
              documentTypeId: createUserDto.documentTypeId,
              documentNumber: createUserDto.documentNumber,
              assignments: createUserDto.assignmentIds?.length
                ? {
                  connect: createUserDto.assignmentIds.map((id) => ({ id })),
                }
                : undefined, // si no vienen asignaciones, no conecta nada
              coustPerHour: createUserDto.coustPerHour,
            },
          },
        },
        include: {
          role: true,
          userDetail: {
            include: {
              documentType: true,
              assignments: true, // incluye todas las asignaciones
            },
          },
        },
      });

      // 3. Generar código de verificación
      await this.usersCodeVerifyService.createCode(user.id);

      // 4. Retornar solo la información necesaria
      return {
        id: user.id,
        email: user.email,
        role: user.role.name,
        names: user.userDetail?.names,
        lastNames: user.userDetail?.lastNames,
        phone: user.userDetail?.phone,
        documentType: user.userDetail?.documentType?.name,
        documentNumber: user.userDetail?.documentNumber,
        assignments: user.userDetail?.assignments.map((a) => a.title) || [],
        coustPerHour: user.userDetail?.coustPerHour,
      };
    } catch (error) {
      console.error('Error al crear el usuario:', error);
      throw new InternalServerErrorException('No se pudo crear el usuario');
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

  async findAll(params: PaginationDto, getUserId: number, roleId: number) {
    console.log('Role ID del usuario autenticado:', roleId);

    // 🔹 Definir condición de rol
    const whereCondition =
      roleId === 1 || roleId === 2
        ? {} // Super Admin y Admin → ven todos
        : { roleId: 5 }; // Otros → solo colaboradores

    // 🔹 Calcular paginación
    const page = params.page ? Number(params.page) : 1;
    const limit = params.limit ? Number(params.limit) : 10;
    const skip = (page - 1) * limit;

    // 🔹 Total de registros
    const total = await this.prismaService.user.count({
      where: whereCondition,
    });

    // 🔹 Obtener registros
    const data = await this.prismaService.user.findMany({
      where: whereCondition,
      skip,
      take: limit, // ✅ ahora es un número
      include: {
        role: true,
        userDetail: {
          include: {
            documentType: true,
            assignments: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 🔒 Excluir password
    const safeData = data.map(({ password, ...user }: any) => user);

    // excluir el usuario autenticado
    const userId = getUserId;
    const filteredData = safeData.filter((user: any) => user.id !== userId);

    return {
      data: filteredData,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async findAllInternalUsers(params: PaginationDto, userId: number, roleId: number) {
    console.log('Role ID del usuario autenticado:', roleId);

    // 🔹 Definir condición de rol
    const whereCondition =
      roleId === 1
        ? { roleId: { notIn: [1, 5] } } // Super Admin → ve todos excepto roles 1 y 5
        : { roleId: 5 }; // Otros → solo colaboradores

    // 🔹 Calcular paginación
    const page = params.page ? Number(params.page) : 1;
    const limit = params.limit ? Number(params.limit) : 10;
    const skip = (page - 1) * limit;

    // 🔹 Total de registros
    const total = await this.prismaService.user.count({
      where: whereCondition,
    });

    // 🔹 Obtener registros
    const data = await this.prismaService.user.findMany({
      where: whereCondition,
      skip,
      take: limit,
      include: {
        role: true,
        userDetail: {
          include: {
            documentType: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 🔒 Excluir password
    const safeData = data.map(({ password, ...user }: any) => user);

    // excluir el usuario autenticado
    const filteredData = safeData.filter((user: any) => user.id !== userId);

    return {
      data: filteredData,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const user = await this.prismaService.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    const userDetail = await this.prismaService.userDetail.findUnique({
      where: { userId: id },
      include: {
        documentType: true,
        assignments: true,
      },
    });

    if (!userDetail) {
      throw new NotFoundException('Detalles del usuario no encontrados.');
    }

    // Combinar datos de user y userDetail
    const combinedUser = {
      ...user,
      ...userDetail,
    };

    // Excluir password
    const { password, ...safeUser } = combinedUser;

    return safeUser;
  }

  async update(email: string, updateUserDto: UpdateUserDto) {
    const user = await this.prismaService.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    return await this.prismaService.userDetail.update({
      where: { userId: user.id },
      data: {
        names: updateUserDto.names,
        lastNames: updateUserDto.lastNames,
        phone: updateUserDto.phone,
        currentCityId: updateUserDto.currentCityId,
        address: updateUserDto.address,
        documentNumber: updateUserDto.documentNumber,
        coustPerHour: updateUserDto.coustPerHour,
        birthDate: updateUserDto.birthDate,
        // 🔑 manejar las asignaciones
        assignments: updateUserDto.assignmentIds
          ? {
            set: updateUserDto.assignmentIds.map(id => ({ id })),
          }
          : undefined,
      },
      include: {
        assignments: true,
      },
    });
  }

  async remove(id: number) {
    const user = await this.prismaService.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    const getDetailUser = await this.prismaService.userDetail.findUnique({
      where: { userId: id },
    });

    if (!getDetailUser) {
      throw new NotFoundException('Detalle de usuario no encontrado.');
    }

    try {
      // Eliminar archivos de S3 si existen
      const urlsAttachments = [
        getDetailUser.profilePictureUrl,
        getDetailUser.attachedDocumentUrl,
        getDetailUser.socialSecurityUrl,
        getDetailUser.applicationCvUrl,
      ].filter((url) => url != null);

      if (urlsAttachments.length > 0) {
        await this.usersAttachmentService.deleteFilesFromS3(urlsAttachments);
      }

      // Desconectar las asignaciones antes de borrar el detalle
      await this.prismaService.userDetail.update({
        where: { userId: id },
        data: {
          assignments: {
            set: [], // elimina todas las relaciones en _UserDetailAssignments
          },
        },
      });

      // Eliminar el detalle del usuario
      await this.prismaService.userDetail.delete({
        where: { userId: id },
      });

      // Finalmente eliminar el usuario
      await this.prismaService.user.delete({
        where: { id },
      });

      return { message: 'Usuario eliminado correctamente.' };
    } catch (error) {
      console.error('Error al eliminar el usuario:', error);
      throw new InternalServerErrorException('Error al eliminar el usuario.');
    }

  }
}
