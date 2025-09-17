/* eslint-disable prettier/prettier */
import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { OrdersAssignToCollabsService } from './orders-assign-to-collabs.service';
import { CreateOrdersAssignToCollabDto } from './dto/create-orders-assign-to-collab.dto';
import { UpdateOrdersAssignToCollabDto } from './dto/update-orders-assign-to-collab.dto';
import { PaginationDto } from 'src/helpers/pagination.dto';
import { JwtAuthGuard } from 'src/auth/auth.guard';

@Controller('orders-assign-to-collabs')
export class OrdersAssignToCollabsController {
  constructor(private readonly ordersAssignToCollabsService: OrdersAssignToCollabsService) { }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createOrdersAssignToCollabDto: CreateOrdersAssignToCollabDto) {
    return this.ordersAssignToCollabsService.create(createOrdersAssignToCollabDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Query() query: PaginationDto) {
    return this.ordersAssignToCollabsService.findAll(query);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersAssignToCollabsService.findOne(+id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateOrdersAssignToCollabDto: UpdateOrdersAssignToCollabDto) {
    return this.ordersAssignToCollabsService.update(+id, updateOrdersAssignToCollabDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ordersAssignToCollabsService.remove(+id);
  }
}
