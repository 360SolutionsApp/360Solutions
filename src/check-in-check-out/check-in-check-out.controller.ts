/* eslint-disable prettier/prettier */
import { Controller, Get, Post, Body, Param, Delete, UseInterceptors, UploadedFiles, ParseIntPipe, BadRequestException, Query } from '@nestjs/common';
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

  /**
   * GET /check-in-check-out/with-checkin-status?page=1&limit=10
   * Lista las órdenes del día con colaboradores + estado checkin/checkout (paginado)
   */
  @Get('/with-checkin-status')
  async getOrdersWithCheckInStatus(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.max(Number(limit) || 10, 1);
    return this.checkInCheckOutService.listOrdersWithCheckInStatus(pageNumber, limitNumber);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.checkInCheckOutService.findOne(+id);
  }

  @Get('/orderId/:orderId')
  findByOrderId(@Param('orderId') orderId: string) {
    return this.checkInCheckOutService.findByOrderId(+orderId);
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
