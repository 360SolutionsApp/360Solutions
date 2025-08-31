/* eslint-disable prettier/prettier */
// src/common/pagination/pagination.helper.ts
/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import { PaginationDto } from './pagination.dto';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  lastPage: number;
}

/**
 * Paginar resultados con Prisma
 */
export async function paginate<T>(
  model: { findMany: Function; count: Function },
  params: PaginationDto,
  options?: {
    searchFields?: string[]; // campos simples
    relationSearch?: Record<string, string[]>; // campos dentro de relaciones
    include?: Record<string, any>; // para traer relaciones
  }
): Promise<PaginatedResult<T>> {
  const {
    page = 1,
    limit = 10,
    search,
    orderBy = 'desc',
    sortField = 'createdAt',
    filters = {},
  } = params;

  const { searchFields = [], relationSearch = {}, include } = options || {};

  // 🔄 Convertimos a number para Prisma (evita error "Expected Int, provided String")
  const pageNumber = Number(page);
  const limitNumber = Number(limit);

  // 🔎 Construcción dinámica del where
  const where: any = { ...filters };

  if (search) {
    where.OR = [
      // Campos simples
      ...searchFields.map((field) => ({
        [field]: { contains: search, mode: 'insensitive' },
      })),

      // Campos en relaciones (ej: userDetail.names)
      ...Object.entries(relationSearch).flatMap(([relation, fields]) =>
        fields.map((field) => ({
          [relation]: { [field]: { contains: search, mode: 'insensitive' } },
        }))
      ),
    ];
  }

  const [data, total] = await Promise.all([
    model.findMany({
      where,
      skip: (pageNumber - 1) * limitNumber,
      take: limitNumber,
      orderBy: { [sortField]: orderBy },
      include, // 👈 aquí se agregan las relaciones
    }),
    model.count({ where }),
  ]);

  return {
    data,
    total,
    page: pageNumber,
    lastPage: Math.ceil(total / limitNumber),
  };
}
