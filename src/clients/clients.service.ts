/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { PrismaService } from 'src/prisma.service';
import { PaginationDto } from 'src/helpers/pagination.dto';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) { }

  async create(userEmail: string, createClientDto: CreateClientDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const existingClientCompany = await this.prisma.clientCompany.findFirst({
      where: { employerIdentificationNumber: createClientDto.employerIdentificationNumber },
    });

    if (existingClientCompany) {
      throw new BadRequestException('Ya existe un cliente con este número de identificación');
    }

    const existingClient = await this.prisma.clientCompany.findUnique({
      where: { employerEmail: createClientDto.employerEmail },
    });

    if (existingClient) {
      throw new BadRequestException(
        `Error al crear el cliente con email: ${createClientDto.employerEmail} ya existe`,
      );
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: createClientDto.employerEmail },
    });

    if (existingUser) {
      throw new BadRequestException(
        `Error al crear el usuario con email: ${createClientDto.employerEmail} ya existe`,
      );
    }

    const existingClientCompanyDocumentNumber = await this.prisma.userDetail.findFirst({
      where: { documentNumber: createClientDto.employerIdentificationNumber },
    });

    if (existingClientCompanyDocumentNumber) {
      throw new BadRequestException('Ya existe un usuario con este número de identificación');
    }

    const dataSelf = {
      ...createClientDto,
      IdUserRegistering: user.id,
    };

    try {
      const { id, valueAssignment, ...rest } = dataSelf;

      // 1️⃣ Crear el cliente
      const client = await this.prisma.clientCompany.create({
        data: rest,
      });

      // 2️⃣ Crear el usuario cliente
      const createUserDto = {
        names:
          createClientDto.representativeName.trim().split(/\s+/).length > 2
            ? createClientDto.representativeName.trim().split(/\s+/).slice(0, 2).join(' ')
            : createClientDto.representativeName.trim().split(/\s+/)[0],
        lastNames:
          createClientDto.representativeName.trim().split(/\s+/).length > 2
            ? createClientDto.representativeName.trim().split(/\s+/).slice(2).join(' ')
            : createClientDto.representativeName.trim().split(/\s+/)[1],
        documentTypeId: 1,
        documentNumber: createClientDto.employerIdentificationNumber,
        phone: createClientDto.employerPhone,
        email: createClientDto.employerEmail,
        currentCityId: createClientDto.clientCityId,
        address: createClientDto.clientAddress,
        roleId: 3,
        assignmentIds: [],
      };

      const userClient = await this.usersService.create(createUserDto);

      // Si hay precios, guardarlos asociados al cliente
      if (valueAssignment && valueAssignment.length > 0) {
        const priceRecords = valueAssignment
          .filter((p) => p.value !== null && p.value !== undefined) // 👈 evita nulos
          .map((p) => ({
            clientId: client.id,
            assignmentId: p.assignmentId,
            pricePerHour: p.value,
          }));

        if (priceRecords.length > 0) {
          await this.prisma.clientPricePerAssignment.createMany({
            data: priceRecords,
          });
        }
      }

      return { client, userClient };
    } catch (error) {
      console.error('Error creating client and user:', error);
      throw new BadRequestException(error.message || 'Error creating client and user');
    }
  }

  async findAll(params: PaginationDto) {
    const page = params.page ? Number(params.page) : undefined;
    const limit = params.limit ? Number(params.limit) : undefined;

    // 🔹 Si NO hay paginación → devolver solo el array de clientes
    if (!page || !limit) {
      return this.prisma.clientCompany.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          ContractClient: true,
        },
      });
    }

    // 🔹 Con paginación → devolver objeto con metadata
    const skip = (page - 1) * limit;

    const total = await this.prisma.clientCompany.count();
    const data = await this.prisma.clientCompany.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        ContractClient: true,
      },
    });

    return {
      data,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }


  async findOne(id: number) {
    try {
      const client = await this.prisma.clientCompany.findUnique({
        where: { id },
        include: {
          ContractClient: true,
          ClientPricePerAssignment: {
            include: {
              assignment: true, // opcional, si deseas ver el nombre o datos de la asignación
            },
          },
        },
      });

      if (!client) {
        throw new BadRequestException('Client not found');
      }
      return client;
    } catch (error) {
      console.error('Error finding client:', error);
      throw new BadRequestException(error.message || 'Error finding client');
    }
  }

  async update(id: number, userEmail: string, updateClientDto: UpdateClientDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Validamos que el correo que viene en updateClientDto sea diferente al que viene en la base de datos.
    const clientEmail = await this.prisma.clientCompany.findUnique({
      where: { id },
    });

    console.log('clientEmail:', clientEmail);

    const emailExists = await this.prisma.user.findFirst({
      where: { email: updateClientDto.employerEmail },
    });

    console.log('emailExists:', emailExists);

    if (clientEmail.employerEmail !== updateClientDto.employerEmail) {
      // Verificamos que el email que viene en updateClientDto no exista en la base de datos.
      if (emailExists && emailExists.id !== id) {
        throw new BadRequestException('Email already exists');
      }
    }

    const { valueAssignment, ...rest } = updateClientDto;
    const dataSelf = {
      ...updateClientDto,
      IdUserRegistering: user.id,
    };

    try {

      console.log('dataSelf:', dataSelf);

      // Actualizamos el correo en la tabla user
      const updatedUser = await this.prisma.user.update({
        where: { email: clientEmail.employerEmail },
        data: { email: updateClientDto.employerEmail },
      });

      if (!updatedUser) {
        throw new BadRequestException('User not found');
      }

      const updatedClient = await this.prisma.clientCompany.update({
        where: { id },
        data: dataSelf,
      });

      // Actualizamos o insertamos precios por asignación (si se envían)
      if (valueAssignment && valueAssignment.length > 0) {
        for (const p of valueAssignment) {
          // 🔹 Ignorar precios nulos o indefinidos
          if (p.value === null || p.value === undefined) continue;

          const existing = await this.prisma.clientPricePerAssignment.findFirst({
            where: {
              clientId: id,
              assignmentId: p.assignmentId,
            },
          });

          if (existing) {
            // Si existe, actualizamos el precio
            await this.prisma.clientPricePerAssignment.update({
              where: { id: existing.id },
              data: { pricePerHour: p.value },
            });
          } else {
            // Si no existe, creamos uno nuevo
            await this.prisma.clientPricePerAssignment.create({
              data: {
                clientId: id,
                assignmentId: p.assignmentId,
                pricePerHour: p.value,
              },
            });
          }
        }
      }

      return updatedClient;

    } catch (error) {
      console.error('Error updating client:', error);
      throw new BadRequestException(error.message || 'Error updating client');
    }
  }

  async remove(id: number, userEmail: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // validamos que el cliente no tenga ordenes asignadas
    const orders = await this.prisma.workOrder.findMany({
      where: { clientId: id },
    });

    if (orders.length > 0) {
      throw new BadRequestException('Cliente tiene ordenes asignadas');
    }

    try {
      // Eliminar contrato PDF del bucket
      //await this.clientCompanyAttachmentService.deleteContract(id);

      // obtenemos el id del usuario asignado al cliente
      const userClientEmail = await this.prisma.clientCompany.findUnique({
        where: { id },
      });

      const userId = await this.prisma.user.findUnique({
        where: { email: userClientEmail.employerEmail },
      });

      // Eliminamos el usuario asignado al cliente
      await this.prisma.user.delete({
        where: { id: userId.id },
      });

      return await this.prisma.clientCompany.delete({
        where: { id },
      });
    } catch (error) {
      console.error('Error deleting client attachments:', error);
      throw new BadRequestException(error.message || 'Error deleting client attachments');
    }
  }
}
