/* eslint-disable prettier/prettier */
import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { PrismaService } from 'src/prisma.service';
import { ZohoMailService } from 'src/mailer/zoho-mailer.service';

@Injectable()
export class OrderRejectionMailerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailerService: MailerService,
    @Inject(forwardRef(() => ZohoMailService))
    private readonly zohoMailService: ZohoMailService,
  ) { }

  async sendOrderRejectionNotice(workOrderId: number, collaboratorId: number) {
    // 1️⃣ Obtener información de la orden, supervisor y colaborador
    const order = await this.prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: {
        supervisorUser: {
          include: { userDetail: true },
        },
      },
    });

    const collaborator = await this.prisma.user.findUnique({
      where: { id: collaboratorId },
      include: { userDetail: true },
    });

    if (!order || !collaborator) return;

    // 2️⃣ Construir texto del mensaje
    const userName = `${collaborator.userDetail?.names || ''} ${collaborator.userDetail?.lastNames || ''}`.trim();
    const userEmail = collaborator.email;
    const orderCode = order.workOrderCodePo || 'Sin código';

    const subject = `Asignación rechazada - Orden ${orderCode}`;
    const messageHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Rechazo de asignación - 360 Solutions</title>
      <style>
        body{font-family:Arial,sans-serif;line-height:1.6;color:#333;background:#f9fafb;padding:20px;margin:0}
        .container{background:#fff;padding:30px;border-radius:8px;max-width:600px;margin:40px auto;border:1px solid #e2e8f0;box-shadow:0 4px 12px rgba(0,0,0,.05)}
        .logo{text-align:center;margin-bottom:25px}
        .logo img{max-height:70px;display:block;margin:0 auto}
        .header{color:#dc2626;text-align:center;margin-bottom:20px;font-size:22px}
        .highlight{font-weight:700;color:#1e40af}
        .footer{margin-top:30px;font-size:13px;color:#6b7280;text-align:center;border-top:1px solid #e5e7eb;padding-top:15px}
        a{color:#2563eb;text-decoration:none}
        a:hover{text-decoration:underline}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">
          <img src="https://360solutions.s3.us-east-2.amazonaws.com/360-solutions-logo-01.png" alt="360 Solutions - Logo">
        </div>
        <h2 class="header">🚫 Asignación rechazada</h2>
        <p>El usuario <span class="highlight">${userName}</span> (<a href="mailto:${userEmail}">${userEmail}</a>) no aceptó la orden de trabajo.</p>
        <p>Por lo tanto, su asignación fue removida de la orden <span class="highlight">${orderCode}</span>.</p>
        <p>Puedes revisar los detalles ingresando a <a href="${process.env.DOMAIN_URL}" target="_blank">${process.env.DOMAIN_URL}</a>.</p>
        <div class="footer">
          <p>Este es un correo automático de <strong>360 Solutions</strong>. No respondas a este mensaje.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    // 3️⃣ Determinar destinatarios
    const recipients: string[] = [];

    // Supervisor
    if (order.supervisorUser?.email && order.supervisorUser?.roleId === 6) {
      recipients.push(order.supervisorUser.email);
    }

    // Talento humano (roleId = 2)
    const talentUsers = await this.prisma.user.findMany({
      where: { roleId: 2 },
      select: { email: true },
    });
    recipients.push(...talentUsers.map(u => u.email));

    // Super admin (roleId = 1)
    const superAdmins = await this.prisma.user.findMany({
      where: { roleId: 1 },
      select: { email: true },
    });
    recipients.push(...superAdmins.map(u => u.email));

    if (!recipients.length) return; // nadie para notificar

    // 4️⃣ Enviar correo por Zoho o SMTP
    const mailData = {
      to: recipients,
      subject,
      html: messageHtml,
    };

    if (this.zohoMailService) {
      await this.zohoMailService.sendMail(mailData);
    } else if (this.mailerService) {
      await this.mailerService.sendMail(mailData);
    } else {
      throw new Error('No hay servicio de correo disponible');
    }
  }
}
