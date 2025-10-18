/* eslint-disable prettier/prettier */
import { UsersAttachmentService } from './users-attachment.service';
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseIntPipe,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from 'src/auth/auth.guard';
import { UsersCodeVerifyService } from './usersCodeVerify.service';
import { UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { PaginationDto } from 'src/helpers/pagination.dto';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly usersCodeVerifyService: UsersCodeVerifyService,
    private readonly usersAttachmentService: UsersAttachmentService,
  ) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Query() query: PaginationDto, @Req() req) {
    console.log('Usuario autenticado:', req.user.id, req.user.Rol[0].id);

    const userId = req.user.id;
    const roleId = req.user.Rol[0]?.id; // ✅ acceso directo

    if (!roleId) {
      throw new UnauthorizedException('No se pudo obtener el rol del usuario');
    }

    return this.usersService.findAll(query, userId, roleId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('findAllInternalUsers')
  async findAllInternalUsers(@Query() query: PaginationDto, @Req() req) {
    console.log('Usuario autenticado:', req.user.Rol[0].id);

    const userId = req.user.id;
    const roleId = req.user.Rol[0]?.id; // ✅ acceso directo

    if (!roleId) {
      throw new UnauthorizedException('No se pudo obtener el rol del usuario');
    }

    return this.usersService.findAllInternalUsers(query, userId, roleId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('findAllUsersCollabs')
  async findAllUsers() {
    return this.usersService.findAllUsers();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('update-user-status/:email')
  updateUserStatus(
    @Param('email') email: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.usersService.updateUserStatus(email, isActive);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':email')
  update(@Param('email') email: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(email, updateUserDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }

  @Post('assigned-password')
  assignedPassword(
    @Body('email') email: string,
    @Body('password') password: string,
  ) {
    return this.usersService.assignedPassword(email, password);
  }

  @Post('verify-code')
  verifyCode(
    @Body('email') email: string,
    @Body('code') code: string,
    @Body('token') token: string,
  ) {
    return this.usersCodeVerifyService.verifyCode(email, code, token);
  }

  @Post('resend-code')
  resendCode(@Body('email') email: string) {
    return this.usersCodeVerifyService.resendCode(email);
  }

  @UseGuards(JwtAuthGuard)
  @Post('attachment-user')
  @UseInterceptors(FilesInterceptor('files'))
  async attachmentUser(
    @Body('userId', ParseIntPipe) userId: number,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.usersAttachmentService.uploadMultipleAttachments(files, userId);
  }

  @Post('recover-password')
  recoveryPassword(@Body('email') email: string) {
    return this.usersService.recoveryPassword(email);
  }

  @Post('reset-password')
  resetPassword(
    @Body('email') email: string,
    @Body('password') password: string,
  ) {
    return this.usersService.resetPassword(email, password);
  }
}
