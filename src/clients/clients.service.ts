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

    // Preguntamos si el employerIdentificationNumber del cliente ya existe
    const existingClientCompany = await this.prisma.clientCompany.findFirst({
      where: { employerIdentificationNumber: createClientDto.employerIdentificationNumber },
    });

    if (existingClientCompany) {
      throw new BadRequestException('Client with this employerIdentificationNumber already exists');
    }

    // Preguntamos si el email del cliente ya existe
    const existingClient = await this.prisma.clientCompany.findUnique({
      where: { employerEmail: createClientDto.employerEmail },
    });

    if (existingClient) {
      throw new BadRequestException(
        `Error al crear el cliente con email: ${createClientDto.employerEmail} ya existe`,
      );
    }

    // Preguntamos si el email del cliente existe como usuario
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createClientDto.employerEmail },
    });

    if (existingUser) {
      throw new BadRequestException(
        `Error al crear el cliente con email: ${createClientDto.employerEmail} ya existe`,
      );
    }

    // Datos del cliente (forzamos el usuario registrador)
    const dataSelf = {
      ...createClientDto,
      IdUserRegistering: user.id,
    };

    try {

      const { id, ...rest } = dataSelf;
      // 1. Crear el cliente
      const client = await this.prisma.clientCompany.create({
        data: rest,
      });

      // 2. Armar el DTO del usuario cliente
      const createUserDto = {
        // si el nombre es una cadena de 4 palabras separadas por espacios
        // se toman los primeras 2 palabras de lo contrario se toma la primera palabra antes del primer espacio
        // y la segunda palabra despues del primer espacio
        names: createClientDto.representativeName.trim().split(/\s+/).length > 2 ? createClientDto.representativeName.trim().split(/\s+/).slice(0, 2).join(' ') : createClientDto.representativeName.trim().split(/\s+/)[0],
        lastNames: createClientDto.representativeName.trim().split(/\s+/).length > 2 ? createClientDto.representativeName.trim().split(/\s+/).slice(2).join(' ') : createClientDto.representativeName.trim().split(/\s+/)[1],
        documentTypeId: 1,
        documentNumber: createClientDto.employerIdentificationNumber,
        phone: createClientDto.employerPhone,
        email: createClientDto.employerEmail,
        currentCityId: createClientDto.clientCityId,
        address: createClientDto.clientAddress,
        roleId: 3, // rol fijo de cliente
        assignmentIds: [],
      };

      // 3. Crear el usuario cliente usando UsersService
      const userClient = await this.usersService.create(createUserDto);

      return { client, userClient };
    } catch (error) {
      console.error('Error creating client and user:', error);
      throw new BadRequestException(error.message || 'Error creating client and user');
    }
  }

  /*async uploadFile(userEmail: string, clientCompanyId: number, file: Express.Multer.File) {
    const user = await this.prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    try {
      return await this.clientCompanyAttachmentService.uploadOrUpdateContractPdf(
        file,
        clientCompanyId,
      );
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new BadRequestException(error.message || 'Error uploading file');
    }
  }*/

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

    const dataSelf = {
      ...updateClientDto,
      IdUserRegistering: user.id,
    };

    try {
      return await this.prisma.clientCompany.update({
        where: { id },
        data: dataSelf,
      });
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
