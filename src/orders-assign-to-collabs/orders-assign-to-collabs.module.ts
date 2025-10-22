/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { OrdersAssignToCollabsService } from './orders-assign-to-collabs.service';
import { OrdersAssignToCollabsController } from './orders-assign-to-collabs.controller';
import { PrismaService } from 'src/prisma.service';
import { ReportOrderAssignToCollabsMailerService } from './report-email-collabs.service';
import { ReportOrderAssignToSupervisorMailerService } from './report-email-supervisor.service';
import { ZohoMailModule } from 'src/mailer/zoho-mailer.module';
import { WorkOrderAcceptService } from 'src/work-order-accept/work-order-accept.service';
import { WorkOrderAcceptModule } from 'src/work-order-accept/work-order-accept.module';
import { WorkOrderAcceptGateway } from 'src/work-order-accept/orders.gateway';

@Module({
  controllers: [OrdersAssignToCollabsController],
  providers: [OrdersAssignToCollabsService, PrismaService, ReportOrderAssignToCollabsMailerService, ReportOrderAssignToSupervisorMailerService, WorkOrderAcceptService, WorkOrderAcceptGateway],
  exports: [ReportOrderAssignToCollabsMailerService, ReportOrderAssignToSupervisorMailerService],
  imports: [ZohoMailModule, WorkOrderAcceptModule],
})
export class OrdersAssignToCollabsModule {}
