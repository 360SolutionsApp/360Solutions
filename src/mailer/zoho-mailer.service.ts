/* eslint-disable prettier/prettier */

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ZohoMailService {
  private readonly logger = new Logger(ZohoMailService.name);
  private accessToken: string | null = null;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) { }

  /**
   * Obtiene un nuevo access token usando el refresh token
   */
  private async refreshAccessToken(): Promise<void> {
    const url = this.config.get<string>('ZOHO_API_BASE_URL');

    const data = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: this.config.get<string>('ZOHO_CLIENT_ID'),
      client_secret: this.config.get<string>('ZOHO_CLIENT_SECRET'),
      refresh_token: this.config.get<string>('ZOHO_REFRESH_TOKEN'),
    });

    try {
      const response = await firstValueFrom(
        this.http.post(url, data.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );

      this.accessToken = response.data.access_token;
      this.logger.log('🔑 Nuevo access token obtenido');
    } catch (error) {
      this.logger.error('❌ Error al refrescar token:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Envía un correo usando la API de Zoho
   * NOTA: Este método ahora puede fallar, la cola manejará los reintentos
   */
  async sendMail({
    to,
    subject,
    html,
  }: {
    to: string | string[];
    subject: string;
    html: string;
  }): Promise<any> {
    // Asegurarse de tener un access token
    if (!this.accessToken) {
      await this.refreshAccessToken();
    }

    const accountId = process.env.ZOHO_ACCOUNT_ID;
    const fromAddress = process.env.ZOHO_FROM_ADDRESS;

    const baseUrl = this.config.get('ZOHO_API_DOMAIN') || 'https://mail.zoho.com';

    const url = `${baseUrl}/api/accounts/${accountId}/messages`;
    const toAddress = Array.isArray(to) ? to.join(',') : to;

    const payload = {
      fromAddress,
      toAddress,
      subject,
      content: html,
      askReceipt: 'yes',
      mailFormat: 'html',
    };

    this.logger.log(`📤 Enviando correo a: ${toAddress}`);

    try {
      const response = await firstValueFrom(
        this.http.post(url, payload, {
          headers: {
            Authorization: `Zoho-oauthtoken ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      this.logger.log(`✅ Correo enviado exitosamente a: ${toAddress}`);
      return response.data;

    } catch (error) {
      const zohoError = error.response?.data;

      // Manejar token inválido o expirado
      if (
        zohoError?.data?.[0]?.errorCode === 'INVALID_OAUTHTOKEN' ||
        zohoError?.status?.code === 401
      ) {
        this.logger.log('🔄 Token expirado o inválido, refrescando...');
        this.accessToken = null;
        await this.refreshAccessToken();
        // Lanzar error para que la cola reintente
        throw error;
      }

      // Solo loguear otros errores y lanzar para que la cola los maneje
      this.logger.error(`❌ Error al enviar correo:`, zohoError?.status?.description || error.message);
      throw error;
    }
  }
}
/*
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SendMailClient } from 'zeptomail';

@Injectable()
export class ZohoMailService {
  private readonly logger = new Logger(ZohoMailService.name);
  private client: SendMailClient;

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('ZOHO_URL_API');
    const token = this.config.get<string>('ZOHO_TOKEN');

    this.client = new SendMailClient({
      url,
      token,
    });
  }

  async sendMail({
    to,
    subject,
    html,
  }: {
    to: string | string[];
    subject: string;
    html: string;
  }): Promise<any> {

    const fromAddress = this.config.get<string>('ZOHO_EMAIL_FROM');

    const recipients = Array.isArray(to)
      ? to.map(email => ({
        email_address: { address: email, name: email.split('@')[0] } // Opcional: nombre basado en el correo
      }))
      : [
        {
          email_address: { address: to, name: to.split('@')[0] } // Opcional: nombre basado en el correo
        }
      ];

    this.logger.log(`📤 Enviando correo a: ${Array.isArray(to) ? to.join(', ') : to}`);

    try {
      const response = await this.client.sendMail({
        from: {
          address: fromAddress,
          name: 'JM360 System',
        },
        to: recipients,
        subject,
        htmlbody: html,
      });

      this.logger.log(`✅ Correo enviado exitosamente`);
      return response;

    } catch (error: any) {
      this.logger.error(`❌ Error ZeptoMail: ${error.message || error}`);
      throw error; // la cola manejará el retry
    }
  }
}*/