/* eslint-disable prettier/prettier */
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query, UseInterceptors, ParseIntPipe, UploadedFile } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { JwtAuthGuard } from 'src/auth/auth.guard';
import { PaginationDto } from 'src/helpers/pagination.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) { }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createContractDto: CreateContractDto, @Req() req) {
    const user = req.user;
    return this.contractsService.create(createContractDto, user);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/upload-contract')
  @UseInterceptors(FileInterceptor('file'))
  async uploadContract(
    @Param('id', ParseIntPipe) contractId: number,
    @UploadedFile() file: Express.Multer.File,
    @Req() req,
  ) {
    const userEmail = req.user.email;
    const url = await this.contractsService.uploadFile(userEmail, contractId, file);
    return { attachedContractUrl: url };
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Query() query: PaginationDto, @Req() req) {

    const user = req.user;

    return this.contractsService.findAll(query, user);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req) {
    const user = req.user;
    return this.contractsService.findOne(+id, user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateContractDto: UpdateContractDto) {
    return this.contractsService.update(+id, updateContractDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.contractsService.remove(+id);
  }
}
