/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { OrdersAssignToCollabsService } from './orders-assign-to-collabs.service';
import { OrdersAssignToCollabsController } from './orders-assign-to-collabs.controller';
import { PrismaService } from 'src/prisma.service';
import { ReportOrderAssignToCollabsMailerService } from './report-email-collabs.service';
import { ReportOrderAssignToSupervisorMailerService } from './report-email-supervisor.service';

@Module({
  controllers: [OrdersAssignToCollabsController],
  providers: [OrdersAssignToCollabsService, PrismaService, ReportOrderAssignToCollabsMailerService, ReportOrderAssignToSupervisorMailerService],
  exports: [ReportOrderAssignToCollabsMailerService, ReportOrderAssignToSupervisorMailerService],
})
export class OrdersAssignToCollabsModule {}
