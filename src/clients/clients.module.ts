/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { PrismaService } from 'src/prisma.service';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from 'src/users/users.module';

@Module({
  controllers: [ClientsController],
  providers: [ClientsService, PrismaService],
  imports: [ConfigModule, UsersModule],
})
export class ClientsModule {}
