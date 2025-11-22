/* eslint-disable prettier/prettier */
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateObservationDto } from './dto/create-observation.dto';
import { UpdateObservationDto } from './dto/update-observation.dto';
import { PrismaService } from 'src/prisma.service';
import { Prisma } from '@prisma/client';
import { PaginationDto } from 'src/helpers/pagination.dto';

@Injectable()
export class ObservationsService {
  constructor(private prisma: PrismaService) { }

  async create(createObservationDto: CreateObservationDto) {
    try {
      console.log('createObservationDto', createObservationDto);
      // Validar que al menos una relación exista
      if (!createObservationDto.userCollabId && !createObservationDto.orderId && !createObservationDto.clientId) {
        throw new ConflictException('Debe proporcionar al menos userCollabId, orderId o clientId');
      }

      const getOrder = await this.prisma.orderAssignToCollabs.findUnique({ where: { id: createObservationDto.orderId } });
      const getOrderId = getOrder.workOrderId;

      console.log('getOrderId', getOrderId);

      // Convertir rating a Decimal si existe
      const data: any = { ...createObservationDto };
      if (data.rating !== undefined) {
        data.rating = new Prisma.Decimal(data.rating);
      }

      data.orderId = getOrderId;

      console.log('data a enviar', data);

      const observation = await this.prisma.collabObservations.create({
        data,
        include: {
          userCollab: true,
          workOrder: true,
          client: true,
        },
      });

      return observation;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('La observación ya existe');
      }
      if (error.code === 'P2003') {
        throw new NotFoundException('Relación no encontrada (userCollab, workOrder o client)');
      }
      throw error;
    }
  }

  async findAll(params: PaginationDto) {
    const {
      page,
      limit,
      search,
      filters,
      sortField = 'createdAt',
      orderBy = 'desc'
    } = params;

    // ✅ Configuración de paginación
    const shouldPaginate = !!(page && limit);
    const pageNumber = Number(page) || 1;
    const limitNumber = Number(limit) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    // 🔹 Condición WHERE base
    const whereCondition: any = {};

    // 🔹 Filtro por búsqueda (colaborador o código PO)
    if (search && search.trim() !== '') {
      whereCondition.OR = [
        // Búsqueda por nombre de colaborador
        {
          userCollab: {
            userDetail: {
              OR: [
                { names: { contains: search, mode: 'insensitive' } },
                { lastNames: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        },
        // Búsqueda por código PO
        {
          workOrder: {
            workOrderCodePo: { contains: search, mode: 'insensitive' }
          },
        },
      ];
    }

    // 🔹 Filtro por rating (acepta array de ratings)
    if (filters?.ratings) {
      const ratings = Array.isArray(filters.ratings) ? filters.ratings : [filters.ratings];

      whereCondition.AND = whereCondition.AND || [];
      whereCondition.AND.push({
        rating: {
          in: ratings.map(rating => new Prisma.Decimal(parseFloat(rating)))
        }
      });
    }

    // 🔹 Filtro por rango de fechas (createdAt)
    if (filters?.startDate || filters?.endDate) {
      whereCondition.AND = whereCondition.AND || [];
      whereCondition.AND.push({
        createdAt: {
          gte: filters.startDate ? new Date(filters.startDate) : undefined,
          lte: filters.endDate ? new Date(filters.endDate) : undefined,
        },
      });
    }

    // 🔹 Total de registros
    const total = await this.prisma.collabObservations.count({
      where: whereCondition
    });

    // 🔹 Ordenamiento dinámico
    const orderByCondition: any = {};
    orderByCondition[sortField] = orderBy;

    // 🔹 Consulta principal
    const observations = await this.prisma.collabObservations.findMany({
      where: whereCondition,
      skip: shouldPaginate ? skip : undefined,
      take: shouldPaginate ? limitNumber : undefined,
      orderBy: orderByCondition,
      include: {
        userCollab: {
          select: {
            id: true,
            email: true,
            userDetail: {
              select: {
                id: true,
                names: true,
                lastNames: true,
              },
            },
          },
        },
        workOrder: {
          select: {
            id: true,
            workOrderCodePo: true,
            workOrderStatus: true,
          },
        },
        client: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
    });

    // 🔹 Retornar paginado o completo
    if (!shouldPaginate) return observations;

    return {
      data: observations,
      total,
      page: pageNumber,
      lastPage: Math.ceil(total / limitNumber),
    };
  }

  async findOne(id: number) {
    const observation = await this.prisma.collabObservations.findUnique({
      where: { id },
      include: {
        userCollab: {
          select: {
            id: true,
            email: true,
            userDetail: {
              select: {
                id: true,
                names: true,
                lastNames: true,
              },
            },
          },
        },
        workOrder: {
          select: {
            id: true,
            workOrderCodePo: true,
            workOrderStatus: true,
          },
        },
        client: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
    });

    if (!observation) {
      throw new NotFoundException(`Observación con ID ${id} no encontrada`);
    }

    return observation;
  }

  // Obtener observación por id de colaborador y id de trabajo de orden
  async findByUserCollabWorkOrder(userCollabId: number, orderId: number) {

    const getOrder = await this.prisma.orderAssignToCollabs.findUnique({ where: { id: orderId } });
    const getOrderId = getOrder.workOrderId;

    return this.prisma.collabObservations.findFirst({
      where: { userCollabId, orderId: getOrderId },
      include: {
        userCollab: {
          select: {
            id: true,
            email: true,
            userDetail: {
              select: {
                id: true,
                names: true,
                lastNames: true,
              },
            },
          },
        },
        workOrder: {
          select: {
            id: true,
            workOrderCodePo: true,
            workOrderStatus: true,
          },
        },
        client: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
    });
  }

  async update(id: number, updateObservationDto: UpdateObservationDto) {
    try {
      // Verificar que existe
      await this.findOne(id);

      // Convertir rating a Decimal si existe
      const data: any = { ...updateObservationDto };
      if (data.rating !== undefined) {
        data.rating = new Prisma.Decimal(data.rating);
      }

      const updatedObservation = await this.prisma.collabObservations.update({
        where: { id },
        data,
        include: {
          userCollab: {
            select: {
              id: true,
              email: true,
              userDetail: {
                select: {
                  id: true,
                  names: true,
                  lastNames: true,
                },
              },
            },
          },
          workOrder: {
            select: {
              id: true,
              workOrderCodePo: true,
              workOrderStatus: true,
            },
          },
          client: {
            select: {
              id: true,
              companyName: true,
            },
          },
        },
      });

      return updatedObservation;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Observación con ID ${id} no encontrada`);
      }
      throw error;
    }
  }

  async remove(id: number) {
    try {
      await this.prisma.collabObservations.delete({
        where: { id },
      });

      return { message: `Observación con ID ${id} eliminada correctamente` };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Observación con ID ${id} no encontrada`);
      }
      throw error;
    }
  }

  // Métodos adicionales útiles
  async findByUserCollab(userCollabId: number) {
    const observations = await this.prisma.collabObservations.findMany({
      where: { userCollabId },
      include: {
        userCollab: {
          select: {
            id: true,
            email: true,
            userDetail: {
              select: {
                id: true,
                names: true,
                lastNames: true,
              },
            },
          },
        },
        workOrder: {
          select: {
            id: true,
            workOrderCodePo: true,
            workOrderStatus: true,
          },
        },
        client: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return observations;
  }

  async findByOrder(orderId: number) {
    const observations = await this.prisma.collabObservations.findMany({
      where: { orderId },
      include: {
        userCollab: {
          select: {
            id: true,
            email: true,
            userDetail: {
              select: {
                id: true,
                names: true,
                lastNames: true,
              },
            },
          },
        },
        workOrder: {
          select: {
            id: true,
            workOrderCodePo: true,
            workOrderStatus: true,
          },
        },
        client: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return observations;
  }

  // Obtener todas las observaciones filtradas por client id
  async findAllByClient(params: PaginationDto, user) {
    const {
      page,
      limit,
      search,
      filters,
      sortField = 'createdAt',
      orderBy = 'desc'
    } = params;

    // ✅ Configuración de paginación
    const shouldPaginate = !!(page && limit);
    const pageNumber = Number(page) || 1;
    const limitNumber = Number(limit) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    console.log('=== PARAMS RECIBIDOS ===');
    console.log('search:', search);
    console.log('filters:', filters);
    console.log('filters?.ratings:', filters?.ratings);

    // 🔹 Verificar si el usuario tiene rol "Cliente"
    const isClient = user.Rol && user.Rol.some(rol => rol.name === 'Cliente');

    // 🔹 Condición WHERE base
    const whereCondition: any = {};

    // 🔹 Solo filtrar por cliente si el usuario tiene rol "Cliente"
    if (isClient) {
      const getCompanyId = await this.prisma.clientCompany.findFirst({
        where: {
          employerEmail: user.email
        }
      });

      if (getCompanyId) {
        whereCondition.clientId = getCompanyId.id;
      }
    }

    // 🔹 Filtro por búsqueda (colaborador o código PO)
    if (search && search.trim() !== '') {
      whereCondition.OR = [
        {
          userCollab: {
            userDetail: {
              OR: [
                { names: { contains: search, mode: 'insensitive' } },
                { lastNames: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        },
        {
          workOrder: {
            workOrderCodePo: { contains: search, mode: 'insensitive' }
          },
        },
      ];
    }

    // 🔹 Filtro por rating (acepta array de ratings)
    if (filters?.ratings) {
      console.log('=== APPLYING RATING FILTER ===');
      const ratings = Array.isArray(filters.ratings) ? filters.ratings : [filters.ratings];
      console.log('ratings normalized:', ratings);

      whereCondition.AND = whereCondition.AND || [];
      whereCondition.AND.push({
        rating: {
          in: ratings.map(rating => rating.toString()) // ← Convertir a string
        }
      });

      console.log('whereCondition after rating filter:', JSON.stringify(whereCondition, null, 2));
    }

    // 🔹 Filtro por rango de fechas (createdAt)
    if (filters?.startDate || filters?.endDate) {
      whereCondition.AND = whereCondition.AND || [];
      whereCondition.AND.push({
        createdAt: {
          gte: filters.startDate ? new Date(filters.startDate) : undefined,
          lte: filters.endDate ? new Date(filters.endDate) : undefined,
        },
      });
    }

    console.log('=== FINAL WHERE CONDITION ===');
    console.log(JSON.stringify(whereCondition, null, 2));

    // 🔹 Total de registros
    const total = await this.prisma.collabObservations.count({
      where: whereCondition
    });

    console.log('=== TOTAL COUNT ===');
    console.log('total:', total);

    // 🔹 Ordenamiento dinámico
    const orderByCondition: any = {};
    orderByCondition[sortField] = orderBy;

    // 🔹 Consulta principal
    const observations = await this.prisma.collabObservations.findMany({
      where: whereCondition,
      skip: shouldPaginate ? skip : undefined,
      take: shouldPaginate ? limitNumber : undefined,
      orderBy: orderByCondition,
      include: {
        userCollab: {
          select: {
            id: true,
            email: true,
            userDetail: {
              select: {
                id: true,
                names: true,
                lastNames: true,
              },
            },
          },
        },
        workOrder: {
          select: {
            id: true,
            workOrderCodePo: true,
            workOrderStatus: true,
            orderAssignToCollab: {
              select: {
                id: true,
              },
            }
          },
        },
        client: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
    });

    console.log('=== OBSERVATIONS RETURNED ===');
    console.log('count:', observations.length);
    observations.forEach(obs => {
      console.log(`ID: ${obs.id}, Rating: ${obs.rating}`);
    });

    // 🔹 Retornar paginado o completo
    if (!shouldPaginate) return observations;

    return {
      data: observations,
      total,
      page: pageNumber,
      lastPage: Math.ceil(total / limitNumber),
    };
  }
}
