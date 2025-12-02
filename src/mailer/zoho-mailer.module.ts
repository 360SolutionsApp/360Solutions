/* eslint-disable prettier/prettier */
// src/zoho-mail/zoho-mail.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config'; 
import { ZohoMailService } from './zoho-mailer.service';
import { SimpleEmailQueueService } from './simple-email-queue.service';

@Module({
  imports: [ConfigModule.forRoot(), HttpModule],
  providers: [ZohoMailService, SimpleEmailQueueService],
  exports: [ZohoMailService, SimpleEmailQueueService],
})
export class ZohoMailModule {}
