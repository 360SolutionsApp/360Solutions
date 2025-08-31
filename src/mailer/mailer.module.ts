/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/require-await */
// src/mailer/mailer.module.ts
import { Module } from '@nestjs/common';
import { MailerModule as NestMailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(), // Importa ConfigModule aquí
    NestMailerModule.forRootAsync({
      imports: [ConfigModule], // Importa ConfigModule para el contexto del factory
      useFactory: async (config: ConfigService) => ({
        transport: {
          host: config.get<string>('MAIL_HOST'),
          port: config.get<number>('MAIL_PORT', 465),
          secure: true,
          auth: {
            user: config.get<string>('MAIL_USER'),
            pass: config.get<string>('MAIL_PASSWORD'),
          },
          tls: {
            // Necesario para Zoho en algunos casos
            ciphers: 'TLSv1.2',
            rejectUnauthorized: false, // Solo para desarrollo
          },
          connectionTimeout: 10000,
          logger: true,
          debug: true,
        },
        defaults: {
          from: `"No Reply" <${config.get<string>('MAIL_FROM')}>`,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [],
  exports: [NestMailerModule],
})
export class MailerModule {}