/* eslint-disable prettier/prettier */
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { JwtAuthGuard } from 'src/auth/auth.guard'; 
import { PaginationDto } from 'src/helpers/pagination.dto';

@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) { }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createClientDto: CreateClientDto, @Req() req) {

    const userEmail = req.user.email;

    return this.clientsService.create(userEmail, createClientDto);
  }

  /*@UseGuards(JwtAuthGuard)
  @Post(':id/upload-contract')
  @UseInterceptors(FileInterceptor('file'))
  async uploadContract(
    @Param('id', ParseIntPipe) clientCompanyId: number,
    @UploadedFile() file: Express.Multer.File,
    @Req() req,
  ) {
    const userEmail = req.user.email;
    const url = await this.clientsService.uploadFile(userEmail, clientCompanyId, file);
    return { attachedContractUrl: url };
  }*/

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Query() query: PaginationDto, @Req() req: any) {
    const userEmail = req.user.email;
    return this.clientsService.findAll(query, userEmail);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clientsService.findOne(+id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateClientDto: UpdateClientDto, @Req() req) {

    const userEmail = req.user.email;

    return this.clientsService.update(+id, userEmail, updateClientDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req) {
    const userEmail = req.user.email;
    return this.clientsService.remove(+id, userEmail);
  }
}
