/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { PrismaService } from 'src/prisma.service';
import { ClientCompanyAttachmentService } from './attached-file.service';

@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientCompanyAttachmentService: ClientCompanyAttachmentService
  ) { }
  async create(userEmail: string, createClientDto: CreateClientDto) {

    const user = await this.prisma.user.findUnique({
      where: {
        email: userEmail
      }
    })

    if (!user) {
      throw new Error("User not found");
    }

    const dataSelf = {
      IdUserRegistering: user.id,
      ...createClientDto
    }

    try {
      const client = await this.prisma.clientCompany.create({
        data: dataSelf
      });

      if (client) {
        return client;
      }

    } catch (error) {
      console.error("Error creating client:", error);
      throw new Error("Error creating client");
    }

  }

  async uploadFile(userEmail: string, clientCompanyId: number, file: Express.Multer.File) {
    const user = await this.prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (!user) {
      throw new Error('User not found');
    }

    try {
      // 🔹 Subir contrato PDF al bucket y actualizar ClientCompany
      return await this.clientCompanyAttachmentService.uploadOrUpdateContractPdf(
        file,
        clientCompanyId,
      );
    } catch (error) {
      console.error('Error uploading file:', error);
      // imprime el error para que lo peuda leer el frontend
      throw new Error('Error uploading file');
    }


  }

  async findAll() {
    const clients = await this.prisma.clientCompany.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return clients
  }

  async findOne(id: number) {
    try {
      const client = await this.prisma.clientCompany.findUnique({
        where: {
          id: id
        }
      })

      if (client) {
        return client;
      } else {
        throw new Error("Client not found");
      }

    } catch (error) {
      console.error("Error finding client:", error);
      // imprime el error para que lo peuda leer el frontend
      throw new Error("Error finding client");
    }
  }

  async update(id: number, userEmail: string, updateClientDto: UpdateClientDto) {
    console.log('email que llega', userEmail);
    const user = await this.prisma.user.findUnique({
      where: {
        email: userEmail
      }
    })

    if (!user) {
      throw new Error("User not found");
    }

    const dataSelf = {
      IdUserRegistering: user.id,
      ...updateClientDto
    }

    try {
      const client = await this.prisma.clientCompany.update({
        where: {
          id: id
        },
        data: dataSelf
      });

      if (client) {
        return client;
      }

    } catch (error) {
      console.error("Error updating client:", error);
      // imprime el error para que lo peuda leer el frontend
      throw new Error("Error updating client");
    }
  }

  async remove(id: number, userEmail: string) {
    const user = this.prisma.user.findUnique({
      where: {
        email: userEmail
      }
    })

    if (!user) {
      throw new Error("User not found");
    }

    try {

      // 🔹 Eliminar contrato PDF del bucket
      await this.clientCompanyAttachmentService.deleteContract(id);

      const client = await this.prisma.clientCompany.delete({
        where: {
          id: id
        }
      })

      if (client) {
        return client;
      }

    } catch (error) {
      console.error("Error deleting client attachments:", error);
      // imprime el error para que lo peuda leer el frontend
      throw new Error("Error deleting client attachments");
    }

  }
}
