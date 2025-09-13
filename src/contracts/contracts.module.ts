/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { ContractsController } from './contracts.controller';
import { PrismaService } from 'src/prisma.service';
import { ClientCompanyAttachmentService } from './attached-file.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  controllers: [ContractsController],
  providers: [ContractsService, PrismaService, ClientCompanyAttachmentService],
  imports: [ConfigModule],
})
export class ContractsModule {}
