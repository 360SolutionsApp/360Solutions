/* eslint-disable prettier/prettier */
import { Controller, Get, Post, Body, Param, Delete, UseInterceptors, UploadedFiles, ParseIntPipe, BadRequestException, Query, UseGuards, Req, Patch } from '@nestjs/common';
import { CheckInCheckOutService } from './check-in-check-out.service';
import { CheckType, CreateCheckInCheckOutDto } from './dto/create-check-in-check-out.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CheckInCheckOutAttachmentService } from './checkInCheckOutAttachment.service';
import { JwtAuthGuard } from 'src/auth/auth.guard';
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

  @Get('/collaborators/:workOrderId')
  listCollaboratorsWithCheckInStatus(@Param('workOrderId') workOrderId: string) {
    return this.checkInCheckOutService.listCollaboratorsWithCheckInStatus(+workOrderId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/orderId/:orderId')
  findByOrderIdForUser(
    @Param('orderId') orderId: string,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    return this.checkInCheckOutService.findByOrderId(+orderId, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/orderId/:orderId/collaborator/:collabId')
  findByOrderIdForCollaborator(
    @Param('orderId') orderId: string,
    @Param('collabId') collabId: string,
  ) {
    return this.checkInCheckOutService.findByOrderId(+orderId, parseInt(collabId, 10));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.checkInCheckOutService.findOne(+id);
  }


  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { checkType: CheckType; time?: string; status?: string }
  ) {
    return this.checkInCheckOutService.update(id, dto);
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
