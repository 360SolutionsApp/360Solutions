/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { PrismaService } from 'src/prisma.service';
import { PaginationDto } from 'src/helpers/pagination.dto';
import { ClientCompanyAttachmentService } from './attached-file.service';

@Injectable()
export class ContractsService {

  constructor(
    private readonly prisma: PrismaService,
    private readonly clientCompanyAttachmentService: ClientCompanyAttachmentService
  ) { }

  async create(createContractDto: CreateContractDto, userReq) {

    // Confirmamos que el usuario que está registrando el contrato existe en la base de datos.
    const user = await this.prisma.user.findUnique({
      where: { id: userReq.id },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Verificamos que el contractCodePo no exista en la base de datos.
    const contractCodePoExists = await this.prisma.contractClient.findFirst({
      where: { contractCodePo: createContractDto.contractCodePo },
    });

    if (contractCodePoExists) {
      throw new Error('Contract code PO already exists');
    }

    const dataSelf = {
      ...createContractDto,
      IdUserRegistering: user.id,
    };

    try {

      const contract = await this.prisma.contractClient.create({
        data: dataSelf,
      });

      return contract;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async findAll(params: PaginationDto, userConsultant) {

    // preguntamos si el userConsultant tiene un rol de tipo cliente
    const user = await this.prisma.user.findUnique({
      where: { id: userConsultant.id },
    });

    if (!user) {
      throw new Error('User not found');
    }


    if (user.roleId === 3) {

      // Extraemos los clientes por el email del user
      const client = await this.prisma.clientCompany.findFirst({
        where: {
          employerEmail: user.email,
        },
      })

      // Filtramos la data y paginamos para que muestre solo los contratos del cliente
      const page = params.page ? Number(params.page) : 1;
      const limit = params.limit ? Number(params.limit) : 10;
      const skip = (page - 1) * limit;
      const total = await this.prisma.contractClient.count({
        where: {
          clientId: client.id,
        },
      });

      const data = await this.prisma.contractClient.findMany({
        skip,
        take: limit,
        where: {
          clientId: client.id,
        },
      });

      return { data, total, page, lastPage: Math.ceil(total / limit) };

    } else if (user.roleId === 1) {

      const page = params.page ? Number(params.page) : 1;
      const limit = params.limit ? Number(params.limit) : 10;
      const skip = (page - 1) * limit;
      const total = await this.prisma.contractClient.count();
      const data = await this.prisma.contractClient.findMany({
        skip,
        take: limit,
      });

      return { data, total, page, lastPage: Math.ceil(total / limit) };

    }

  }

  async findOne(id: number, userReq) {
    const user = await this.prisma.user.findUnique({
      where: { id: userReq.id },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.roleId === 1) {
      return await this.prisma.contractClient.findUnique({ where: { id } });
    } else if (user.roleId === 3) {
      const client = await this.prisma.clientCompany.findFirst({
        where: {
          employerEmail: user.email,
        },
      })

      return await this.prisma.contractClient.findFirst({
        where: {
          clientId: client.id,
          id,
        },
      });
    }
  }

  async update(id: number, updateContractDto: UpdateContractDto) {
    return await this.prisma.contractClient.update({
      where: { id: id },
      data: updateContractDto,
    });
  }

  async remove(id: number) {

    // Eliminar contrato PDF del bucket
    await this.clientCompanyAttachmentService.deleteContract(id);

    return await this.prisma.contractClient.delete({
      where: { id: id },
    });
  }

  async uploadFile(userEmail: string, contractId: number, file: Express.Multer.File) {
    const user = await this.prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (!user) {
      throw new Error('User not found');
    }

    try {
      return await this.clientCompanyAttachmentService.uploadOrUpdateContractPdf(
        file,
        contractId,
      );
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error(error.message || 'Error uploading file');
    }
  }
}
