/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { WorkOrdersService } from './work-orders.service';
import { WorkOrdersController } from './work-orders.controller';
import { PrismaService } from 'src/prisma.service';
import { ReportWorkOrderMailerService } from './report-mail.service';

@Module({
  controllers: [WorkOrdersController],
  providers: [WorkOrdersService, PrismaService, ReportWorkOrderMailerService],
  exports: [WorkOrdersService, ReportWorkOrderMailerService],
})
export class WorkOrdersModule {}
