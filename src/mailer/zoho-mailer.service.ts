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
}