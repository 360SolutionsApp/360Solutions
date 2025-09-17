/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { OrdersAssignToCollabsService } from './orders-assign-to-collabs.service';
import { OrdersAssignToCollabsController } from './orders-assign-to-collabs.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [OrdersAssignToCollabsController],
  providers: [OrdersAssignToCollabsService, PrismaService],
})
export class OrdersAssignToCollabsModule {}
