import { Injectable } from '@nestjs/common';
import { CreateDocumentTypeDto } from './dto/create-document-type.dto';
import { UpdateDocumentTypeDto } from './dto/update-document-type.dto';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class DocumentTypesService {
  constructor(private readonly prisma: PrismaService) {}
  async create(createDocumentTypeDto: CreateDocumentTypeDto[]) {
    const names = createDocumentTypeDto
      .map((documentType) => documentType.name) // ⚡️ aquí usas names
      .filter((name): name is string => !!name);

    if (names.length === 0) {
      throw new Error(
        'No se proporcionaron nombres de tipos de documento válidos',
      );
    }

    const existing = await this.prisma.documentType.findMany({
      where: { name: { in: names } },
    });

    if (existing.length > 0) {
      throw new Error(
        `Los tipos de documento ${existing.map((d) => d.name).join(', ')} ya existen`,
      );
    }

    const created = await this.prisma.documentType.createMany({
      data: createDocumentTypeDto.map((dto) => ({
        name: dto.name, // ⚡️ mapeas aquí al campo real
      })),
      skipDuplicates: true,
    });

    return {
      message: 'Tipos de documento creados exitosamente',
      count: created.count,
    };
  }

  async findAll() {
    return await this.prisma.documentType.findMany();
  }

  async findOne(id: number) {
    return await this.prisma.documentType.findUnique({
      where: { id: id },
    });
  }

  update(id: number, updateDocumentTypeDto: UpdateDocumentTypeDto) {
    return this.prisma.documentType.update({
      where: { id: id },
      data: updateDocumentTypeDto,
    });
  }

  remove(id: number) {
    return this.prisma.documentType.delete({
      where: { id: id },
    });
  }
}
