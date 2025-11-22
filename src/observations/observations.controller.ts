/* eslint-disable prettier/prettier */
import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Req } from '@nestjs/common';
import { ObservationsService } from './observations.service';
import { CreateObservationDto } from './dto/create-observation.dto';
import { UpdateObservationDto } from './dto/update-observation.dto';
import { PaginationDto } from 'src/helpers/pagination.dto';
import { JwtAuthGuard } from 'src/auth/auth.guard';

@Controller('observations')
export class ObservationsController {
  constructor(private readonly observationsService: ObservationsService) { }

  @Post()
  create(@Body() createObservationDto: CreateObservationDto) {
    return this.observationsService.create(createObservationDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/find-all-by-client')
  findAllByClient(@Query() query: PaginationDto, @Req() req) {
    const user = req.user;
    return this.observationsService.findAllByClient(query, user);
  }

  @Get('/user-collab/:userCollabId')
  findByUserCollab(@Param('userCollabId') userCollabId: number) {
    return this.observationsService.findByUserCollab(userCollabId);
  }

  @Get('/order/:orderId')
  findByOrder(@Param('orderId') orderId: number) {
    return this.observationsService.findByOrder(orderId);
  }

  @Get('/user-collab/:userCollabId/work-order/:orderId')
  findByUserCollabWorkOrder(@Param('userCollabId') userCollabId: number, @Param('orderId') orderId: number) {
    return this.observationsService.findByUserCollabWorkOrder(+userCollabId, +orderId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.observationsService.findOne(+id);
  }

  @Get()
  findAll(@Query() query: PaginationDto) {
    return this.observationsService.findAll(query);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateObservationDto: UpdateObservationDto) {
    return this.observationsService.update(+id, updateObservationDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.observationsService.remove(+id);
  }
}
