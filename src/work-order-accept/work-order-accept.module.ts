/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { WorkOrderAcceptService } from './work-order-accept.service';
import { WorkOrderAcceptController } from './work-order-accept.controller';
import { PrismaService } from 'src/prisma.service';
import { OrderRejectionMailerService } from './report-update-accept-collab.service';
import { ZohoMailModule } from 'src/mailer/zoho-mailer.module';

@Module({
  controllers: [WorkOrderAcceptController],
  providers: [WorkOrderAcceptService, PrismaService, OrderRejectionMailerService],
  imports: [ZohoMailModule],
  exports: [WorkOrderAcceptService, OrderRejectionMailerService],
})
export class WorkOrderAcceptModule {}
