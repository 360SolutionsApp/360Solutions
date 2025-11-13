/* eslint-disable prettier/prettier */
import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { BreakPointsService } from './break-points.service';
import { CreateBreakPointDto } from './dto/create-break-point.dto';
import { UpdateBreakPointDto } from './dto/update-break-point.dto';

@Controller('break-points')
export class BreakPointsController {
  constructor(private readonly breakPointsService: BreakPointsService) { }

  @Post()
  create(@Body() createBreakPointDto: CreateBreakPointDto) {
    return this.breakPointsService.create(createBreakPointDto);
  }

  @Get('filter')
  async getByUserAndCheckIn(
    @Query('userCollabId') userCollabId?: string,
    @Query('checkInId') checkInId?: string,
  ) {
    return this.breakPointsService.findByUserAndCheckIn({
      userCollabId: userCollabId ? +userCollabId : undefined,
      checkInId: checkInId ? +checkInId : undefined,
    });
  }

  @Get()
  findAll() {
    return this.breakPointsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.breakPointsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBreakPointDto: UpdateBreakPointDto) {
    return this.breakPointsService.update(+id, updateBreakPointDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.breakPointsService.remove(+id);
  }
}
