/* eslint-disable prettier/prettier */
// src/mailer/mailer.controller.ts
import { Controller, Post, Body } from '@nestjs/common'; 
import { ZohoMailService } from './zoho-mailer.service';

@Controller('mail')
export class MailerController {
  constructor(private readonly zohoMailService: ZohoMailService) {}

  @Post('send')
  async sendEmail(
    @Body('to') to: string,
    @Body('subject') subject: string,
    @Body('content') content: string,
  ) {
    return this.zohoMailService.sendMail({ to, subject, html: content });
  }
}
