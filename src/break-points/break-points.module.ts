/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { BreakPointsService } from './break-points.service';
import { BreakPointsController } from './break-points.controller';
import { PrismaService } from 'src/prisma.service';
import { CheckInCheckOutService } from 'src/check-in-check-out/check-in-check-out.service';
import { InvoiceUpdateService } from 'src/invoices/invoice-update';
import { InvoicesService } from 'src/invoices/invoices.service';
import { InvoiceCalculationService } from 'src/invoices/invoice-calcualtion';

@Module({
  controllers: [BreakPointsController],
  providers: [BreakPointsService, PrismaService, InvoicesService, CheckInCheckOutService, InvoiceUpdateService, InvoiceCalculationService],
})
export class BreakPointsModule {}
