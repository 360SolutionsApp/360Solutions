/* eslint-disable prettier/prettier */
import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ZohoMailService } from 'src/mailer/zoho-mailer.service';

@Injectable()
export class ReportWorkOrderMailerService {
  // Ambos servicios son opcionales: usa el que esté disponible
  constructor(
    private readonly mailerService: MailerService,        // SMTP
    @Inject(forwardRef(() => ZohoMailService))
    private readonly zohoMailService: ZohoMailService,    // API Zoho
  ) { }

  async sendWorkOrder(
    emails: string[], // varios destinatarios
    orderCode: string,
    companyName: string,
    assignaments: { name: string; quantity: number }[],
  ) {
    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Orden de trabajo creada - 360 Solutions</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; }
          .header { color: #2563eb; margin-bottom: 24px; }
          .code-container { background: #f3f4f6; padding: 20px; margin: 30px 0; border-radius: 8px; border: 1px dashed #d1d5db; }
          .footer { margin-top: 30px; font-size: 14px; color: #6b7280; text-align: center; }
          .logo { text-align: center; margin-bottom: 20px; }
          .logo img { max-height: 50px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">
            <img src="https://360solutions.s3.us-east-2.amazonaws.com/360-solutions-logo-01.png" alt="360 Solutions - Logo">
          </div>
          <h2 class="header">Nueva orden de trabajo</h2>
          <p>Se ha creado una nueva orden de trabajo con la siguiente información:</p>
          <ul class="code-container">
            <li>Orden de trabajo: <strong>${orderCode}</strong></li>
            <li>Empresa: <strong>${companyName}</strong></li>
            <li>Asignaciones: 
              <ul>
                <li>${assignaments.map(a => `${a.name} x (${a.quantity})`).join(', ')}</li>
              </ul>
            </li>
          </ul>
          <p>Por favor, ingresa a <a href="${process.env.DOMAIN_URL}">${process.env.DOMAIN_URL}</a> para asignar colaboradores a la orden de trabajo.</p>
        </div>
      </body>
      </html>
    `;

    const subject = 'Nueva orden de trabajo creada';

    // ✅ Si ZohoMailService está configurado, usarlo
    if (this.zohoMailService) {
      // Un solo correo con todos en "to"
      await this.zohoMailService.sendMail({
        to: emails.join(','), // la API de Zoho espera string
        subject,
        html: htmlTemplate,
      });
    }
    // ✅ De lo contrario, usar Mailer SMTP
    else if (this.mailerService) {
      await this.mailerService.sendMail({
        to: emails, // puede recibir array
        subject,
        html: htmlTemplate,
      });
    } else {
      throw new Error('No hay servicio de correo disponible');
    }
  }
}
