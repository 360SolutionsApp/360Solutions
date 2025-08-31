/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class CodeVerifyMailerService {
    constructor(private readonly mailerService: MailerService) { }

    async sendVerificationCode(email: string, code: string, token: string, timeExpiration: number) {
        const htmlTemplate = `
            <!DOCTYPE html>
            <html>
            <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verificación de cuenta</title>
            <style>
                body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                margin: 0;
                padding: 0;
                }
                .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                }
                .header {
                color: #2563eb;
                margin-bottom: 24px;
                }
                .code-container {
                background: #f3f4f6;
                padding: 20px;
                text-align: center;
                margin: 30px 0;
                border-radius: 8px;
                border: 1px dashed #d1d5db;
                }
                .verification-code {
                font-size: 28px;
                font-weight: bold;
                letter-spacing: 3px;
                color: #1e40af;
                }
                .footer {
                margin-top: 30px;
                font-size: 14px;
                color: #6b7280;
                text-align: center;
                }
                .logo {
                text-align: center;
                margin-bottom: 20px;
                }
                .logo img {
                max-height: 50px;
                }
            </style>
            </head>
            <body>
            <div class="container">
                <div class="logo">
                <!-- Reemplaza con tu logo -->
                <img src="https://360solutions.s3.us-east-2.amazonaws.com/360-solutions-logo.png" alt="360 Solutions - Logo">
                </div>
                
                <h2 class="header">Verificación de cuenta</h2>
                
                <p>Hola,</p>
                
                <p>Estás a un paso de completar tu registro. Utiliza el siguiente código para verificar tu cuenta:</p>
                
                <div class="code-container">
                <span class="verification-code">${code}</span>
                </div>
                
                <p>Por favor, ingresa este código ingresando a ${process.env.FRONTEND_URL+'user='+email+'/token='+token}</p>
            
                <div class="footer">
                <p>Este código expirará en ${timeExpiration} minutos.</p>
                <p>Si no solicitaste este código, puedes ignorar este mensaje.</p>
                </div>
            </div>
            </body>
            </html>
        `;

        await this.mailerService.sendMail({
            to: email,
            subject: 'Tu código de verificación',
            html: htmlTemplate,
        });
    }
}