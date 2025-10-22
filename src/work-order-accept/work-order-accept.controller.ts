/* eslint-disable prettier/prettier */
import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { WorkOrderAcceptService } from './work-order-accept.service';
import { CreateWorkOrderAcceptDto } from './dto/create-work-order-accept.dto';
import { UpdateWorkOrderAcceptDto } from './dto/update-work-order-accept.dto';

@Controller('work-order-accept')
export class WorkOrderAcceptController {
  constructor(private readonly workOrderAcceptService: WorkOrderAcceptService) { }

  @Post()
  create(@Body() createWorkOrderAcceptDto: CreateWorkOrderAcceptDto) {
    return this.workOrderAcceptService.create(createWorkOrderAcceptDto);
  }

  @Get('findAllPendingByCollaborator/:collaboratorId')
  findAllPendingByCollaborator(@Param('collaboratorId') collaboratorId: string) {
    return this.workOrderAcceptService.findAllPendingByCollaborator(+collaboratorId);
  }

  @Get('findAllNotAccepted')
  findAllNotAccepted() {
    return this.workOrderAcceptService.findAllNotAccepted();
  }

  @Get()
  findAll() {
    return this.workOrderAcceptService.findAll();
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
