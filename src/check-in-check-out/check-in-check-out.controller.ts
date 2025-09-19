/* eslint-disable prettier/prettier */
import { Controller, Get, Post, Body, Param, Delete, UseInterceptors, UploadedFiles, ParseIntPipe, BadRequestException } from '@nestjs/common';
import { CheckInCheckOutService } from './check-in-check-out.service';
import { CreateCheckInCheckOutDto } from './dto/create-check-in-check-out.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CheckInCheckOutAttachmentService } from './checkInCheckOutAttachment.service';
//import { UpdateCheckInCheckOutDto } from './dto/update-check-in-check-out.dto';

@Controller('check-in-check-out')
export class CheckInCheckOutController {
  constructor(
    private readonly checkInCheckOutService: CheckInCheckOutService,
    private readonly checkInCheckOutAttachmentService: CheckInCheckOutAttachmentService
  ) { }

  @Post()
  create(@Body() createCheckInCheckOutDto: CreateCheckInCheckOutDto) {
    return this.checkInCheckOutService.create(createCheckInCheckOutDto);
  }

  @Post(':type/:id')
  @UseInterceptors(FilesInterceptor('files', 2)) // máx 2 imágenes
  async upload(
    @UploadedFiles() files: Express.Multer.File[],
    @Param('id') id: string,
    @Param('type') type: 'checkIn' | 'checkOut',
  ) {
    return this.checkInCheckOutAttachmentService.uploadEvidenceImages(files, +id, type);
  }

  @Delete(':type/:id')
  async deleteEvidence(
    @Param('type') type: 'checkIn' | 'checkOut',
    @Param('id', ParseIntPipe) id: number,
  ) {
    if (!['checkIn', 'checkOut'].includes(type)) {
      throw new BadRequestException('Tipo inválido. Usa checkIn o checkOut');
    }

    await this.checkInCheckOutAttachmentService.deleteEvidenceImages(id, type);
    return { message: `✅ Evidencias eliminadas para ${type} id=${id}` };
  }

  @Get()
  findAll() {
    return this.checkInCheckOutService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.checkInCheckOutService.findOne(+id);
  }
  /*
    @Patch(':id')
    update(@Param('id') id: string, @Body() updateCheckInCheckOutDto: UpdateCheckInCheckOutDto) {
      return this.checkInCheckOutService.update(+id, updateCheckInCheckOutDto);
    }
  */
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.checkInCheckOutService.remove(+id);
  }
}
