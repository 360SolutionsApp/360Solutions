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
    // ✅ 1. Verificar que el email no exista
    const verifyEmail = await this.prismaService.user.findUnique({
      where: { email: createUserDto.email },
    });
    if (verifyEmail) throw new ConflictException('El correo ya está registrado');

    // ✅ 2. Verificar que el documento no exista
    if (createUserDto.documentNumber) {
      const verifyDoc = await this.prismaService.userDetail.findUnique({
        where: { documentNumber: createUserDto.documentNumber },
      });
      if (verifyDoc) throw new ConflictException('El documento ya está registrado');
    }

    try {
      // ✅ 3. Crear usuario con su detalle
      const user = await this.prismaService.user.create({
        data: {
          email: createUserDto.email,
          password: createUserDto.password, // si aplica
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
              birthDate: createUserDto.birthDate,
            },
          },
        },
        include: {
          role: true,
          userDetail: {
            include: {
              documentType: true,
              userCostPerAssignment: true, // 👈 ya no es assignments
            },
          },
        },
      });

      // ✅ 4. Insertar costos por asignación si vienen en el DTO
      if (createUserDto.userCostPerAssignment?.length) {
        await this.prismaService.$transaction(
          createUserDto.userCostPerAssignment.map(({ assignmentId, costPerHour }) =>
            this.prismaService.userCostPerAssignment.create({
              data: {
                userDetailId: user.userDetail.id,
                assignmentId,
                costPerHour: typeof costPerHour === 'string' ? parseInt(costPerHour, 10) : costPerHour,
              },
            })
          )
        );
      }

      // ✅ 5. Crear el código de verificación
      await this.usersCodeVerifyService.createCode(user.id);

      return user;
    } catch (error) {
      console.error('❌ Error al crear el usuario:', error);
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
            userCostPerAssignment: {
              include: {
                assignment: true,  // para obtener el título/nombre de la asignación
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 🔒 Excluir password
    const safeData = data.map(({ password, ...user }: any) => {
      return {
        ...user,
        // Mapear asignaciones con su costo por hora
        assignments: user.userDetail.userCostPerAssignment.map((ucpa) => ({
          assignmentId: ucpa.assignment.id,
          assignmentTitle: ucpa.assignment.title,
          costPerHour: ucpa.costPerHour,
        })),
      };
    });

    // excluir el usuario autenticado
    const filteredData = safeData.filter((user: any) => user.id !== getUserId);

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

    // 🔹 Condición de rol
    const whereCondition =
      roleId === 1
        ? { roleId: { notIn: [1, 3, 5] } } // Super Admin → ve todos excepto roles 1, 5 y 6
        : { roleId: 5 }; // Otros → solo colaboradores

    // 🔹 Verificar si hay parámetros de paginación válidos
    const page = params.page ? Number(params.page) : undefined;
    const limit = params.limit ? Number(params.limit) : undefined;

    // Sin paginación → devolver solo el array
    if (!page || !limit) {
      const allUsers = await this.prismaService.user.findMany({
        where: whereCondition,
        include: {
          role: true,
          userDetail: {
            include: {
              documentType: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Excluir password y usuario autenticado
      return allUsers
        .map(({ password, ...user }: any) => user)
        .filter((user: any) => user.id !== userId);
    }

    // 📌 Con paginación → devolver objeto con metadata
    const skip = (page - 1) * limit;

    const total = await this.prismaService.user.count({
      where: whereCondition,
    });

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
      orderBy: { createdAt: 'desc' },
    });

    // Excluir password y usuario autenticado
    const safeData = data
      .map(({ password, ...user }: any) => user)
      .filter((user: any) => user.id !== userId);

    return {
      data: safeData,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  //Obtener todos los usuarios con role id 5, detalle del usuario y sus assignments
  async findAllUsers() {
    const users = await this.prismaService.user.findMany({
      where: { roleId: 5 },
      include: {
        userDetail: {
          include: {
            documentType: true,
            userCostPerAssignment: {
              include: {
                assignment: true,
              },
            },
          },
        },
      },
    });

    // Excluir password
    const safeUsers = users.map(({ password, ...user }: any) => user);

    return safeUsers;
  }

  async findOne(id: number) {
    const user = await this.prismaService.user.findUnique({
      where: { id },
      include: {
        userDetail: {
          include: {
            documentType: true,
            userCostPerAssignment: { include: { assignment: true } },
          },
        },
        role: true,
      },
    });

    if (!user) throw new NotFoundException('Usuario no encontrado.');

    const { password, ...safeUser } = user;

    // Mapear asignaciones con su costo
    return {
      ...safeUser,
      assignments: user.userDetail.userCostPerAssignment.map((ucpa) => ({
        assignmentId: ucpa.assignment.id,
        assignmentTitle: ucpa.assignment.title,
        costPerHour: ucpa.costPerHour,
      })),
    };
  }


  async update(email: string, updateUserDto: UpdateUserDto) {
    const user = await this.prismaService.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('Usuario no encontrado.');

    const updatedUser = await this.prismaService.userDetail.update({
      where: { userId: user.id },
      data: {
        names: updateUserDto.names,
        lastNames: updateUserDto.lastNames,
        phone: updateUserDto.phone,
        currentCityId: updateUserDto.currentCityId,
        address: updateUserDto.address,
        documentNumber: updateUserDto.documentNumber,
        birthDate: updateUserDto.birthDate,
      },
    });

    // Reemplazar las asignaciones con costo
    if (updateUserDto.userCostPerAssignment && updateUserDto.userCostPerAssignment.length > 0) {
      await this.prismaService.userCostPerAssignment.deleteMany({
        where: { userDetailId: updatedUser.id },
      });

      await Promise.all(
        updateUserDto.userCostPerAssignment.map(({ assignmentId, costPerHour }) =>
          this.prismaService.userCostPerAssignment.create({
            data: {
              userDetailId: updatedUser.id,
              assignmentId,
              costPerHour,
            },
          })
        )
      );
    }

    return updatedUser;
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

      // Eliminar el detalle del usuario
      await this.prismaService.userDetail.delete({
        where: { userId: id },
      });

      // Borrar relaciones en userCostPerAssignment
      await this.prismaService.userCostPerAssignment.deleteMany({
        where: { userDetailId: getDetailUser.id },
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
