import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaService } from 'src/prisma.service';
import { CodeVerifyMailerService } from './code-verify-mail.service';
import { MailerModule } from 'src/mailer/mailer.module';
import { UsersCodeVerifyService } from './usersCodeVerify.service';
import { UsersAttachmentService } from './users-attachment.service';
import { ConfigModule } from '@nestjs/config';
import { ZohoMailModule } from 'src/mailer/zoho-mailer.module';

@Module({
  controllers: [UsersController],
  providers: [
    UsersService,
    PrismaService,
    UsersCodeVerifyService,
    CodeVerifyMailerService,
    UsersAttachmentService,
  ],
  imports: [ConfigModule, MailerModule, ZohoMailModule],
  exports: [UsersService, UsersCodeVerifyService],
})
export class UsersModule {}
