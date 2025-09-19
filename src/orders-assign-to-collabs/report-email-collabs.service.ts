/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class ReportOrderAssignToCollabsMailerService {
  constructor(private readonly mailerService: MailerService) {}

  async sendAssignmentsToCollabs(
    emails: string[], // varios destinatarios
    orderCode: string,
    companyName: string,
    supervisor: string,
    dateStartWork: string,
    hourStartWork: string,
    locationWork: string,
    observations: string,
  ) {
    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Orden de trabajo creada - 360 Solutions</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 650px; margin: 20px auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background: #ffffff; }
          .header { color: #2563eb; margin-bottom: 24px; text-align: center; }
          .info-box { background: #f9fafb; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 20px; }
          .info-box li { margin-bottom: 8px; }
          .footer { margin-top: 30px; font-size: 14px; color: #6b7280; text-align: center; }
          .logo { text-align: center; margin-bottom: 20px; }
          .logo img { max-height: 60px; }
          .highlight { font-weight: bold; color: #1e40af; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">
            <img src="https://360solutions.s3.us-east-2.amazonaws.com/360-solutions-logo.png" alt="360 Solutions - Logo">
          </div>
          <h2 class="header">Nueva orden de trabajo creada</h2>
          <p>Se ha generado una nueva orden de trabajo con el siguiente detalle:</p>
          
          <ul class="info-box">
            <li>📌 Orden de trabajo: <span class="highlight">${orderCode}</span></li>
            <li>🏢 Empresa: <span class="highlight">${companyName}</span></li>
            <li>👤 Supervisor: <span class="highlight">${supervisor}</span></li>
            <li>📅 Fecha de inicio: <span class="highlight">${dateStartWork}</span></li>
            <li>⏰ Hora de inicio: <span class="highlight">${hourStartWork}</span></li>
            <li>📍 Lugar de trabajo: <span class="highlight">${locationWork}</span></li>
            <li>📝 Observaciones: <span class="highlight">${observations || 'N/A'}</span></li>
          </ul>

          <p>Por favor, ingresa a <a href="${process.env.DOMAIN_URL}" target="_blank">${process.env.DOMAIN_URL}</a> para más detalles, <b>No olvides realizar tu checkIn y checkOut</b>.</p>

          <div class="footer">
            <p>Este es un correo automático enviado por <strong>360 Solutions</strong>. No responder directamente.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.mailerService.sendMail({
      to: emails,
      subject: `Nueva orden de trabajo - ${orderCode}`,
      html: htmlTemplate,
    });
  }
}
