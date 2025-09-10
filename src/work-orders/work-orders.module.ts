/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { WorkOrdersService } from './work-orders.service';
import { WorkOrdersController } from './work-orders.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [WorkOrdersController],
  providers: [WorkOrdersService, PrismaService],
})
export class WorkOrdersModule {}
