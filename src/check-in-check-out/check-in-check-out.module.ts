/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { CheckInCheckOutService } from './check-in-check-out.service';
import { CheckInCheckOutController } from './check-in-check-out.controller';
import { CheckInCheckOutAttachmentService } from './checkInCheckOutAttachment.service';
import { PrismaService } from 'src/prisma.service';
import { ConfigService } from '@nestjs/config';
import { InvoicesService } from 'src/invoices/invoices.service';
import { InvoiceUpdateService } from 'src/invoices/invoice-update';
import { InvoiceCalculationService } from 'src/invoices/invoice-calcualtion';

@Module({
  controllers: [CheckInCheckOutController],
  providers: [ConfigService, CheckInCheckOutService, PrismaService, CheckInCheckOutAttachmentService, InvoicesService, InvoiceCalculationService, InvoiceUpdateService],
  exports: [CheckInCheckOutService]
})
export class CheckInCheckOutModule {}
