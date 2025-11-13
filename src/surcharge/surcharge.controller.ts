/* eslint-disable prettier/prettier */
import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { SurchargeService } from './surcharge.service';
import { CreateSurchargeDto } from './dto/create-surcharge.dto';
import { UpdateSurchargeDto } from './dto/update-surcharge.dto';

@Controller('surcharge')
export class SurchargeController {
  constructor(private readonly surchargeService: SurchargeService) { }

  @Post()
  create(@Body() dto: CreateSurchargeDto) {
    return this.surchargeService.create(dto);
  }

  @Get()
  findAll() {
    return this.surchargeService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.surchargeService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSurchargeDto,
  ) {
    return this.surchargeService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.surchargeService.remove(id);
  }
}
