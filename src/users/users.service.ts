/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
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
    if (createUserDto.documentNumber && createUserDto.documentNumber.trim() !== '') {
      const verifyDoc = await this.prismaService.userDetail.findUnique({
        where: { documentNumber: createUserDto.documentNumber },
      });
      if (verifyDoc) throw new ConflictException('El documento ya está registrado');
    }

    console.log('createUserDto:', createUserDto);

    try {
      // ✅ 3. Crear usuario con su detalle
      const user = await this.prismaService.user.create({
        data: {
          email: createUserDto.email,
          password: createUserDto.password,
          role: { connect: { id: createUserDto.roleId } },
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
          userDetail: { include: { documentType: true, userCostPerAssignment: true } },
        },
      });

      // ✅ 4. Insertar costos por asignación SOLO si el usuario puede tenerlos
      // Roles internos: 1,2,4,6 (Super admin, Talento humano, Contable, Supervisor)
      const internalRoleIds = [1, 2, 4, 6];

      if (
        createUserDto.userCostPerAssignment?.length &&
        !internalRoleIds.includes(createUserDto.roleId)
      ) {
        const validCosts = createUserDto.userCostPerAssignment
          .filter(
            ({ assignmentId, costPerHour }) =>
              assignmentId != null && (costPerHour != null && Number(costPerHour) > 0)
          );

        if (validCosts.length > 0) {
          await this.prismaService.$transaction(
            validCosts.map(({ assignmentId, costPerHour }) =>
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
      }

      // ✅ 5. Crear el código de verificación
      await this.usersCodeVerifyService.createCode(user.id);

      return user;
    } catch (error) {
      console.error('❌ Error al crear el usuario:', error);
      throw new InternalServerErrorException('No se pudo crear el usuario');
    }
  }


  async validatePassword(password: string): Promise<void> {
    await Promise.resolve(); // 🔥 forzar async boundary

    const passwordLength = password.length;
    if (passwordLength < 8) {
      throw new BadRequestException(
        'La contraseña debe tener al menos 8 caracteres.',
      );
    }

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

    if (!passwordRegex.test(password)) {
      throw new BadRequestException(
        'La contraseña debe contener al menos una letra mayúscula, una letra minúscula, un número y un carácter especial.',
      );
    }
  }


  async assignedPassword(email: string, password: string) {

    try {
      await this.validatePassword(password);
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
    const {
      page: rawPage,
      limit: rawLimit,
      search,
      sortField = 'createdAt',
      orderBy = 'desc',
    } = params;

    console.log('Role ID del usuario autenticado:', roleId);

    // 🔹 Convertir page y limit a número si existen
    const page = rawPage ? Number(rawPage) : undefined;
    const limit = rawLimit ? Number(rawLimit) : undefined;

    // 🔹 Condición base por rol
    const baseCondition =
      roleId === 1 || roleId === 2
        ? { roleId: 5 } // Super Admin y Admin → ven todos los colaboradores
        : { roleId: 5 };

    // 🔹 Inicializamos condiciones del where
    const whereCondition: any = { AND: [baseCondition] };

    // 🔹 Si hay texto de búsqueda, agregamos OR dinámicamente
    if (search && search.trim() !== '') {
      const normalizedSearch = search.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const terms = normalizedSearch.split(' ').filter((t) => t.trim() !== '');

      whereCondition.AND.push({
        OR: terms.flatMap((term) => [
          { userDetail: { names: { contains: term, mode: 'insensitive' } } },
          { userDetail: { lastNames: { contains: term, mode: 'insensitive' } } },
          { userDetail: { documentNumber: { contains: term, mode: 'insensitive' } } },
          { userDetail: { phone: { contains: term, mode: 'insensitive' } } },
          { email: { contains: term, mode: 'insensitive' } },
        ]),
      });
    }

    // 🔹 Paginación (solo si se envían los params)
    const skip = page && limit ? (page - 1) * limit : undefined;
    const take = limit ?? undefined;

    // 🔹 Ordenamiento dinámico
    const orderByCondition: any = {};
    if (sortField.startsWith('userDetail.')) {
      const [relation, field] = sortField.split('.');
      orderByCondition[relation] = { [field]: orderBy };
    } else {
      orderByCondition[sortField] = orderBy;
    }

    // 🔹 Total de registros
    const total = await this.prismaService.user.count({
      where: whereCondition,
    });

    // 🔹 Obtener registros
    const data = await this.prismaService.user.findMany({
      where: whereCondition,
      ...(skip !== undefined && { skip }),
      ...(take !== undefined && { take }),
      include: {
        role: true,
        userDetail: {
          include: {
            documentType: true,
            userCostPerAssignment: {
              include: { assignment: true },
            },
          },
        },
      },
      orderBy: orderByCondition,
    });

    // 🔒 Excluir password y usuario autenticado
    const safeData = data
      .filter((user: any) => user.id !== getUserId)
      .map(({ password, ...user }: any) => ({
        ...user,
        assignments:
          user.userDetail?.userCostPerAssignment?.map((ucpa) => ({
            assignmentId: ucpa.assignment.id,
            assignmentTitle: ucpa.assignment.title,
            costPerHour: ucpa.costPerHour,
          })) || [],
      }));

    // 🔹 Si no hay paginación, no devolvemos meta
    if (!page || !limit) {
      return { data: safeData };
    }

    return {
      data: safeData,
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
        ? { roleId: { notIn: [5] } } // Super Admin → ve todos excepto roles 1, 5 y 6
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

  // Actualizar todos los datos de un usuario (names, lastnames, phone, etc...) y su rol
  async updateUserAndRole(email: string, updateRoleDto: UpdateUserDto) {
    const user = await this.prismaService.user.findUnique({
      where: { email: email },
    });

    if (!user) throw new NotFoundException('Usuario no encontrado.');

    const id = user.id;

    // Solo actualizar campos como: names, lastNames, phone, etc...
    await this.prismaService.userDetail.update({
      where: { userId: id },
      data: {
        names: updateRoleDto.names,
        lastNames: updateRoleDto.lastNames,
        phone: updateRoleDto.phone,
        currentCityId: updateRoleDto.currentCityId,
        address: updateRoleDto.address,
        documentTypeId: updateRoleDto.documentTypeId,
        documentNumber: updateRoleDto.documentNumber,
        birthDate: updateRoleDto.birthDate,
      },
    });

    // Actualizar el rol y el email
    return this.prismaService.user.update({
      where: { id },
      data: {
        email: updateRoleDto.email,
        roleId: updateRoleDto.userCostPerAssignment[0].assignmentId,
      },
    });
  }


  async update(email: string, updateUserDto: UpdateUserDto) {
    const user = await this.prismaService.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    console.log('usuario encontrado', user);

    // ✅ Construir data dinámicamente
    const data: any = {
      names: updateUserDto.names,
      lastNames: updateUserDto.lastNames,
    };

    if (updateUserDto.phone !== null) {
      data.phone = updateUserDto.phone;
    }

    if (updateUserDto.currentCityId !== null) {
      data.currentCityId = updateUserDto.currentCityId;
    }

    if (updateUserDto.address !== null) {
      data.address = updateUserDto.address;
    }    

    if (updateUserDto.documentTypeId !== null) {
      data.documentTypeId = updateUserDto.documentTypeId;
    }

    console.log('tipo de documento', updateUserDto.documentTypeId)

    if (updateUserDto.documentNumber.length !== 0) {
      data.documentNumber = updateUserDto.documentNumber;
    }

    if (updateUserDto.birthDate !== null) {
      data.birthDate = updateUserDto.birthDate;
    }

    const updatedUser = await this.prismaService.userDetail.update({
      where: { userId: user.id },
      data,
    });

    console.log('updatedUser:', updatedUser);

    // ✅ Reemplazar asignaciones con costo SOLO si vienen
    if (
      updateUserDto.userCostPerAssignment &&
      updateUserDto.userCostPerAssignment.length > 0
    ) {
      await this.prismaService.userCostPerAssignment.deleteMany({
        where: { userDetailId: updatedUser.id },
      });

      await Promise.all(
        updateUserDto.userCostPerAssignment.map(
          ({ assignmentId, costPerHour }) =>
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


  async updateUserStatus(email: string, isActive: boolean) {
    const user = await this.prismaService.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('Usuario no encontrado.');

    return await this.prismaService.user.update({
      where: { id: user.id },
      data: { isActive },
    });
  }

  async remove(id: number) {
    const user = await this.prismaService.user.findUnique({
      where: { id },
      include: {
        userDetail: true,
        userVerification: true
      }
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    try {
      // 1. Eliminar archivos de S3 si existen
      if (user.userDetail) {
        const urlsAttachments = [
          user.userDetail.profilePictureUrl,
          user.userDetail.attachedDocumentUrl,
          user.userDetail.socialSecurityUrl,
          user.userDetail.applicationCvUrl,
        ].filter((url) => url != null);

        if (urlsAttachments.length > 0) {
          await this.usersAttachmentService.deleteFilesFromS3(urlsAttachments);
        }
      }

      // 2. Usar una transacción para asegurar consistencia
      await this.prismaService.$transaction(async (tx) => {
        // Eliminar relaciones en orden inverso a las dependencias

        // Primero: Eliminar relaciones de breakPeriod
        await tx.breakPeriod.deleteMany({
          where: { userCollabId: id }
        });

        // Eliminar relaciones de checkIn y checkOut
        await tx.checkIn.deleteMany({
          where: { userCollabId: id }
        });

        await tx.checkOut.deleteMany({
          where: { userCollabId: id }
        });

        // Eliminar relaciones de workersAssignToOrder
        await tx.workersAssignToOrder.deleteMany({
          where: { collaboratorId: id }
        });

        // Eliminar relaciones de orderAcceptByCollab
        await tx.orderAcceptByCollab.deleteMany({
          where: { collaboratorId: id }
        });

        // Eliminar relaciones de collabObservations
        await tx.collabObservations.deleteMany({
          where: { userCollabId: id }
        });

        // Eliminar userCostPerAssignment (a través de userDetail)
        if (user.userDetail) {
          await tx.userCostPerAssignment.deleteMany({
            where: { userDetailId: user.userDetail.id }
          });
        }

        // CORRECCIÓN: Para Invoice, no podemos setear userId a null porque es requerido
        // En su lugar, hacemos soft delete o eliminamos las invoices
        await tx.invoice.updateMany({
          where: { userId: id },
          data: {
            isDeleted: true,
            status: 'DELETED'
          }
        });

        // Actualizar workOrders donde es supervisor (no podemos eliminar)
        await tx.workOrder.updateMany({
          where: { supervisorUserId: id },
          data: { supervisorUserId: null }
        });

        // Eliminar UserVerification si existe
        if (user.userVerification) {
          await tx.userVerification.delete({
            where: { userId: id }
          });
        }

        // Eliminar UserDetail si existe
        if (user.userDetail) {
          await tx.userDetail.delete({
            where: { userId: id }
          });
        }

        // Finalmente eliminar el usuario
        await tx.user.delete({
          where: { id }
        });
      });

      return { message: 'Usuario eliminado correctamente.' };
    } catch (error) {
      console.error('Error al eliminar el usuario:', error);

      // Mejor manejo de errores específicos
      if (error.code === 'P2003') {
        // Obtener información detallada de la relación conflictiva
        const conflictInfo = await this.findConflictingRelations(id);
        throw new BadRequestException(
          `No se puede eliminar el usuario porque tiene registros asociados: ${conflictInfo}`
        );
      }

      throw new InternalServerErrorException('Error al eliminar el usuario.');
    }
  }

  // Método auxiliar para encontrar relaciones conflictivas
  private async findConflictingRelations(userId: number): Promise<string> {
    try {
      // Verificar workersAssignToOrder
      const workersAssign = await this.prismaService.workersAssignToOrder.findFirst({
        where: { collaboratorId: userId }
      });
      if (workersAssign) return 'tiene asignaciones de trabajo activas';

      // Verificar checkIn
      const checkIn = await this.prismaService.checkIn.findFirst({
        where: { userCollabId: userId }
      });
      if (checkIn) return 'tiene registros de check-in';

      // Verificar checkOut
      const checkOut = await this.prismaService.checkOut.findFirst({
        where: { userCollabId: userId }
      });
      if (checkOut) return 'tiene registros de check-out';

      // Verificar invoices
      const invoice = await this.prismaService.invoice.findFirst({
        where: { userId: userId, isDeleted: false }
      });
      if (invoice) return 'tiene facturas asociadas';

      // Verificar workOrder como supervisor
      const workOrder = await this.prismaService.workOrder.findFirst({
        where: { supervisorUserId: userId }
      });
      if (workOrder) return 'es supervisor de órdenes de trabajo';

      return 'relaciones desconocidas';
    } catch (error) {
      return 'no se pudieron verificar las relaciones';
    }
  }
}
