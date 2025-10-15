/* eslint-disable prettier/prettier */
import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Req } from '@nestjs/common';
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
  findAll(@Query() query: PaginationDto, @Req() req) {
  
      const user = req.user;
  
    return this.ordersAssignToCollabsService.findAll(query, user);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersAssignToCollabsService.findOne(+id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('unassigned-users/:workOrderId')
  findAllUnassignedUsers(@Param('workOrderId') workOrderId: number) {
    return this.ordersAssignToCollabsService.findAllUnassignedUsers(workOrderId);
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

  @UseGuards(JwtAuthGuard)
  @Delete('definitive/:id')
  removeDefinitive(@Param('id') id: string) {
    return this.ordersAssignToCollabsService.removeDefinitive(+id);
  }
}
