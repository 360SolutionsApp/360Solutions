/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { WorkOrdersService } from './work-orders.service';
import { WorkOrdersController } from './work-orders.controller';
import { PrismaService } from 'src/prisma.service';
import { ReportWorkOrderMailerService } from './report-mail.service';
import { ZohoMailModule } from 'src/mailer/zoho-mailer.module';

@Module({
  controllers: [WorkOrdersController],
  providers: [WorkOrdersService, PrismaService, ReportWorkOrderMailerService],
  imports: [ZohoMailModule],
  exports: [WorkOrdersService, ReportWorkOrderMailerService],
})
export class WorkOrdersModule {}
