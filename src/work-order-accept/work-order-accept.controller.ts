/* eslint-disable prettier/prettier */
import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { WorkOrderAcceptService } from './work-order-accept.service';
import { CreateWorkOrderAcceptDto } from './dto/create-work-order-accept.dto';
import { UpdateWorkOrderAcceptDto } from './dto/update-work-order-accept.dto';
import { PaginationDto } from 'src/helpers/pagination.dto';

@Controller('work-order-accept')
export class WorkOrderAcceptController {
  constructor(private readonly workOrderAcceptService: WorkOrderAcceptService) { }

  @Post()
  create(@Body() createWorkOrderAcceptDto: CreateWorkOrderAcceptDto) {
    return this.workOrderAcceptService.create(createWorkOrderAcceptDto);
  }

  @Get('findAllNotConfirmed')
  findAllNotConfirmed(@Query() query: PaginationDto) {
    return this.workOrderAcceptService.findAllNotConfirmed(query);
  }

  @Get('findAllPendingByCollaborator/:collaboratorId')
  findAllPendingByCollaborator(@Param('collaboratorId') collaboratorId: string) {
    return this.workOrderAcceptService.findAllPendingByCollaborator(+collaboratorId);
  }

  @Get('findAllNotAccepted')
  findAllNotAccepted(@Query() query: PaginationDto) {
    return this.workOrderAcceptService.findAllNotAccepted(query);
  }

  @Get()
  findAll(@Query() query: PaginationDto) {
    return this.workOrderAcceptService.findAll(query);
  }

  // Actualizamos la orden como leída
  @Patch('markAsRead/:id')
  markAsRead(@Param('id') id: string) {
    return this.workOrderAcceptService.markAsRead(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateWorkOrderAcceptDto: UpdateWorkOrderAcceptDto) {
    return this.workOrderAcceptService.update(+id, updateWorkOrderAcceptDto);
  }

  @Delete(':id')
  remove(@Body() collaboratorId: number, @Body() workOrderId: number) {
    return this.workOrderAcceptService.remove(+collaboratorId, +workOrderId);
  }
}
