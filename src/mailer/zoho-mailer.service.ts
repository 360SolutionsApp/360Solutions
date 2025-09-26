/* eslint-disable prettier/prettier */
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ZohoMailService {
  private accessToken: string | null = null;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Obtiene un nuevo access token usando el refresh token
   */
  private async refreshAccessToken(): Promise<void> {
    const url = this.config.get<string>('ZOHO_API_BASE_URL'); // https://accounts.zoho.com/oauth/v2/token

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
      console.log('🔑 Nuevo access token obtenido');
    } catch (error) {
      console.error(
        '❌ Error al refrescar token:',
        error.response?.data || error.message,
      );
      throw new HttpException(
        'No se pudo refrescar el access token',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Envía un correo usando la API de Zoho
   */
  async sendMail({
    to,
    subject,
    html,
  }: {
    to: string;
    subject: string;
    html: string;
  }): Promise<any> {
    // Asegurarse de tener un access token
    if (!this.accessToken) {
      await this.refreshAccessToken();
    }

    const accountId = process.env.ZOHO_ACCOUNT_ID;
    const fromAddress = process.env.ZOHO_FROM_ADDRESS;

    const url = `https://mail.zoho.com/api/accounts/${accountId}/messages`;

    const payload = {
      fromAddress,
      toAddress: to,
      subject,
      content: html, // puede ser HTML o texto
      askReceipt: 'yes',
      mailFormat: 'html',
    };

    try {
      const response = await firstValueFrom(
        this.http.post(url, payload, {
          headers: {
            Authorization: `Zoho-oauthtoken ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      return response.data;
    } catch (error) {
      // Si el token expiró, refrescar y reintentar
      if (error.response?.data?.data?.moreInfo === 'INVALID_OAUTHTOKEN') {
        console.log('🔄 Token expirado, refrescando...');
        await this.refreshAccessToken();
        return this.sendMail({ to, subject, html });
      }

      console.error(
        '❌ Error al enviar correo:',
        error.response?.data || error.message,
      );
      throw new HttpException(
        'No se pudo enviar el correo',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
