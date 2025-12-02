/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ZohoMailService } from 'src/mailer/zoho-mailer.service';
import { formatToTextDate } from 'src/helpers/formatDate';

@Injectable()
export class ReportOrderAssignToCollabsMailerService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly zohoMailService: ZohoMailService,
  ) {}

  /**
   * Genera el HTML del correo (sin enviarlo)
   */
  generateEmailHtml(
    emails: string[],
    orderCode: string,
    companyName: string,
    supervisor: string,
    dateStartWork: string,
    hourStartWork: string,
    locationWork: string,
    observations: string,
    assignments: string[],
  ): { subject: string; html: string } {
    // Generar bloque de HTML con las asignaciones
    const assignmentsHtml =
      assignments?.length > 0
        ? `<ul>${assignments.map((a) => `<li>🛠️ ${a}</li>`).join('')}</ul>`
        : '<p>No se especificaron asignaciones.</p>';

    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Asignación de orden de trabajo - 360 Solutions</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 680px; margin: 20px auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 10px; background: #ffffff; }
          .header { color: #2563eb; margin-bottom: 24px; text-align: center; }
          .info-box { background: #f9fafb; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 24px; }
          .info-box li { margin-bottom: 8px; }
          .footer { margin-top: 30px; font-size: 14px; color: #6b7280; text-align: center; }
          .logo { text-align: center; margin-bottom: 20px; }
          .logo img { max-height: 60px; }
          .highlight { font-weight: bold; color: #1e40af; }
          .assignments { background: #f3f4f6; padding: 12px 16px; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">
            <img src="https://360solutions.s3.us-east-2.amazonaws.com/360-solutions-logo-01.png" alt="360 Solutions - Logo">
          </div>
          <h2 class="header">Nueva asignación de orden de trabajo</h2>
          <p>Has sido asignado a una nueva orden de trabajo con el siguiente detalle:</p>
          
          <ul class="info-box">
            <li>📌 <strong>Orden:</strong> <span class="highlight">${orderCode}</span></li>
            <li>🏢 <strong>Empresa:</strong> <span class="highlight">${companyName}</span></li>
            <li>👤 <strong>Supervisor:</strong> <span class="highlight">${supervisor}</span></li>
            <li>📅 <strong>Fecha de inicio:</strong> <span class="highlight">${formatToTextDate(dateStartWork)}</span></li>
            <li>⏰ <strong>Hora de inicio:</strong> <span class="highlight">${hourStartWork}</span></li>
            <li>📍 <strong>Ubicación:</strong> <span class="highlight">${locationWork}</span></li>
            <li>📝 <strong>Observaciones:</strong> <span class="highlight">${observations || 'N/A'}</span></li>
          </ul>

          <h3>👷 Tus asignaciones:</h3>
          <div class="assignments">${assignmentsHtml}</div>

          <p>Por favor, ingresa a <a href="${process.env.DOMAIN_URL}" target="_blank">${process.env.DOMAIN_URL}</a> para más detalles.<br>
          <strong>No olvides que primero debes <b>aceptar</b> la orden de trabajo para poder realizar tu <b>checkIn</b> al iniciar tus actividades y <b>checkOut</b> al finalizarlas desde la plataforma.</strong></p>

          <div class="footer">
            <p>Este es un correo automático enviado por <strong>360 Solutions</strong>. No responder directamente.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return {
      subject: `Nueva orden de trabajo - ${orderCode}`,
      html: htmlTemplate
    };
  }

  /**
   * Envía notificación a los colaboradores (método original)
   */
  async sendAssignmentsToCollabs(
    emails: string[],
    orderCode: string,
    companyName: string,
    supervisor: string,
    dateStartWork: string,
    hourStartWork: string,
    locationWork: string,
    observations: string,
    assignments: string[],
    useZohoApi = false,
  ) {
    const { subject, html } = this.generateEmailHtml(
      emails,
      orderCode,
      companyName,
      supervisor,
      dateStartWork,
      hourStartWork,
      locationWork,
      observations,
      assignments,
    );

    if (useZohoApi) {
      await this.zohoMailService.sendMail({
        to: emails,
        subject,
        html,
      });
    } else {
      await this.mailerService.sendMail({
        to: emails,
        subject,
        html,
      });
    }
  }
}