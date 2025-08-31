/* eslint-disable prettier/prettier */
import { BadRequestException, Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from 'src/prisma.service';
import { CodeVerifyMailerService } from './code-verify-mail.service';

@Injectable()
export class UsersCodeVerifyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codeVerifyMailerService: CodeVerifyMailerService
  ) { }

  async createCode(userId: number) {

    // Obtener email del usuario
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    // Genera un código OTP (One-Time Password) de 6 dígitos.
    // Asegura que el número esté en el rango de 100000 a 999999.
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Establece la fecha de expiración del código.
    // El código expirará 10 minutos después de su creación.
    const verificationCodeExpiry = new Date(Date.now() + 10 * 60 * 1000);

    // Generar un token único usando la versión 4 de UUID.
    const tokenToResetPassword = uuidv4();

    // Establecer la fecha y hora de expiración para el token.
    // En este caso, el token expirará en 1 hora (60 minutos * 60 segundos * 1000 milisegundos).
    const tokenToResetPasswordExpiry = new Date(Date.now() + 60 * 60 * 1000);

    // Guarda en la tabla 'UserVerification' usando Prisma.
    try {
      const result = await this.prisma.userVerification.create({
        data: {
          userId,
          verificationCode,
          verificationCodeExpiry,
          tokenToResetPassword,
          tokenToResetPasswordExpiry,
        },
      });

      if (!result) {
        throw new BadRequestException('No se pudieron guardar los códigos de verificación.');
      }

      const timeExpiration = Math.floor((verificationCodeExpiry.getTime() - Date.now()) / 60000); // tiempo de expiración en minutos

      console.log('Tiempo de expiración en minutos:', timeExpiration);

      // Envía el correo electrónico con el código de verificación.
      await this.codeVerifyMailerService.sendVerificationCode(
        user.email,
        verificationCode,
        tokenToResetPassword,
        timeExpiration
      );

      return {
        verificationCode,
        tokenToResetPassword,
      };
    } catch (error) {
      console.error('Error al guardar los códigos de verificación:', error);
      throw new BadRequestException('No se pudieron generar los códigos de verificación.');
    }
  }

  async resendCode(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email },
    });

    const userId = user.id;

    const verifyCodeExist = await this.prisma.userVerification.findFirst({
      where: {
        userId: userId,
        verificationCodeExpiry: {
          gt: new Date(),
        },
      },
    });

    // si el código ya existe y no ha expirado, no generar uno nuevo
    if (verifyCodeExist) {
      return {
        message: 'El código de verificación ya existe y no ha expirado.',
      };
    }

    // Elimina cualquier código de verificación existente para el usuario.
    await this.prisma.userVerification.deleteMany({
      where: { userId },
    });

    // Generar y guardar nuevos códigos de verificación.
    const newCode = this.createCode(userId);

    if (!newCode) {
      throw new BadRequestException('No se pudo reenviar el código de verificación.');
    }

    return {
      message: 'El código de verificación ha sido reenviado.',
    };
  }

  /**
   * Valida el código de verificación y el token de un usuario.
   *
   * @param userId El ID del usuario.
   * @param code El código de verificación de 6 dígitos.
   * @param token El token de restablecimiento de contraseña.
   * @returns Un objeto de éxito si la validación es correcta.
   * @throws BadRequestException Si el código, el token o la expiración no son válidos.
   */
  async verifyCode(email: string, code: string, token: string) {
    const record = await this.prisma.userVerification.findFirst({
      where: {
        user: {
          email: email,
        },
        verificationCode: code,
        tokenToResetPassword: token,
      },
    });

    // Validar si el registro existe.
    if (!record) {
      throw new BadRequestException('Código o token de verificación incorrecto.');
    }

    const now = new Date();

    // Validar la expiración del código de verificación.
    if (record.verificationCodeExpiry < now) {
      throw new BadRequestException('El código de verificación ha expirado. Por favor, solicita uno nuevo.');
    }

    // Validar la expiración del token de restablecimiento.
    if (record.tokenToResetPasswordExpiry < now) {
      throw new BadRequestException('El token de restablecimiento ha expirado. Por favor, solicita un nuevo token.');
    }

    await this.prisma.user.update({
      where: { id: record.userId },
      data: { isVerified: true },
    });

    // Si todas las validaciones pasan, se considera un éxito.
    // Elimina todos los códigos de verificación asociados al usuario para evitar su reutilización.
    try {

      const getEmail = await this.prisma.user.findUnique({
        where: { id: record.userId },
        select: { email: true },
      });

      await this.prisma.userVerification.deleteMany({
        where: { id: record.id },
      });

      // Retorna una respuesta de éxito.
      return {
        status: 'success',
        message: 'Código verificado correctamente. Puedes continuar.',
        data: {
          email: getEmail.email,
        },
      };
    } catch (error) {
      console.error('Error al verificar los códigos:', error);
      throw new BadRequestException('Ocurrió un error al procesar la solicitud. Inténtalo de nuevo.');
    }
  }

}
