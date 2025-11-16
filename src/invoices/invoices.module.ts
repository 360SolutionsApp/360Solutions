/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { PrismaService } from 'src/prisma.service';
import { InvoiceUpdateService } from './invoice-update';
import { InvoiceCalculationService } from './invoice-calcualtion';

@Module({
  controllers: [InvoicesController],
  providers: [InvoicesService, PrismaService, InvoiceCalculationService, InvoiceUpdateService],
  exports: [InvoicesService, InvoiceUpdateService],
})
export class InvoicesModule { }
