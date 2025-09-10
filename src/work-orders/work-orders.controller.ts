/* eslint-disable prettier/prettier */
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { WorkOrdersService } from './work-orders.service';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';
import { JwtAuthGuard } from 'src/auth/auth.guard';

@Controller('work-orders')
export class WorkOrdersController {
  constructor(private readonly workOrdersService: WorkOrdersService) { }

  // Crear WorkOrder con email del usuario autenticado
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createWorkOrderDto: CreateWorkOrderDto, @Req() req: any) {
    const userEmail = req.user.email; // <- viene del payload del JWT
    return this.workOrdersService.create(createWorkOrderDto, userEmail);
  }

  // Listar todas las WorkOrders
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.workOrdersService.findAll();
  }

  // Buscar una WorkOrder por id
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.workOrdersService.findOne(+id);
  }

  // Actualizar una WorkOrder
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateWorkOrderDto: UpdateWorkOrderDto,
    @Req() req: any
  ) {
    const userEmail = req.user.email;
    return this.workOrdersService.update(+id, updateWorkOrderDto, userEmail);
  }

  // Eliminar una WorkOrder
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    const userEmail = req.user.email;
    return this.workOrdersService.remove(+id, userEmail);
  }
}
