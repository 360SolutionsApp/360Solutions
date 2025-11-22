/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { ObservationsService } from './observations.service';
import { ObservationsController } from './observations.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [ObservationsController],
  providers: [ObservationsService, PrismaService],
})
export class ObservationsModule {}
