/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { BreakPointsService } from './break-points.service';
import { BreakPointsController } from './break-points.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [BreakPointsController],
  providers: [BreakPointsService, PrismaService],
})
export class BreakPointsModule {}
