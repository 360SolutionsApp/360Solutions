/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { CheckInCheckOutService } from './check-in-check-out.service';
import { CheckInCheckOutController } from './check-in-check-out.controller';
import { CheckInCheckOutAttachmentService } from './checkInCheckOutAttachment.service';
import { PrismaService } from 'src/prisma.service';
import { ConfigService } from '@nestjs/config';
import { InvoicesService } from 'src/invoices/invoices.service';

@Module({
  controllers: [CheckInCheckOutController],
  providers: [ConfigService, CheckInCheckOutService, PrismaService, CheckInCheckOutAttachmentService, InvoicesService],
})
export class CheckInCheckOutModule {}
