/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from 'src/prisma.service';

type AttachmentType = 'profilePicture' | 'attachedDocument' | 'socialSecurity' | 'applicationCv';

const aliasToColumn: Record<AttachmentType, string> = {
  profilePicture: 'profilePictureUrl',
  attachedDocument: 'attachedDocumentUrl',
  socialSecurity: 'socialSecurityUrl',
  applicationCv: 'applicationCvUrl',
};

@Injectable()
export class UsersAttachmentService {
  private readonly logger = new Logger(UsersAttachmentService.name);
  private readonly s3Client: S3Client;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.s3Client = new S3Client({
      region: this.configService.get<string>('AWS_REGION'),
    });
  }

  /**
   * 📌 Subida de múltiples archivos con alias
   */
  async uploadMultipleAttachments(
    files: Express.Multer.File[],
    userId: number,
  ): Promise<Record<AttachmentType, string>> {
    const bucket = this.configService.get<string>('AWS_S3_BUCKET');
    const region = this.configService.get<string>('AWS_REGION');

    const uploadedUrls: Partial<Record<AttachmentType, string>> = {};

    for (const file of files) {
      const alias = file.originalname.split('_')[0] as AttachmentType;

      if (!Object.keys(aliasToColumn).includes(alias)) {
        this.logger.warn(`⚠️ Alias inválido recibido: ${alias}, se ignora este archivo`);
        continue;
      }

      const extension = file.originalname.split('.').pop();
      const filename = `${alias}/${userId}/${uuidv4()}.${extension}`;

      // 🔹 Buscar archivo previo
      const userDetail = await this.prismaService.userDetail.findUnique({
        where: { userId: Number(userId) },
      });
      const columnName = aliasToColumn[alias];
      const previousUrl = userDetail?.[columnName];

      if (previousUrl) {
        try {
          const key = previousUrl.split('.amazonaws.com/')[1];
          if (key) {
            await this.s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
            this.logger.log(`🗑️ Archivo anterior eliminado: ${key}`);
          }
        } catch (err: any) {
          this.logger.warn(`No se pudo eliminar archivo anterior: ${err.message}`);
        }
      }

      // 🔹 Subir nuevo archivo con reintentos
      let success = false;
      let attempt = 0;
      let lastError: any;

      while (!success && attempt < 3) {
        try {
          attempt++;
          await this.s3Client.send(
            new PutObjectCommand({
              Bucket: bucket,
              Key: filename,
              Body: file.buffer,
              ContentType: file.mimetype,
            }),
          );
          success = true;
        } catch (error: any) {
          lastError = error;
          this.logger.warn(
            `⚠️ Intento ${attempt} fallido al subir ${filename}: ${error.message}`,
          );
          await new Promise((res) => setTimeout(res, 500));
        }
      }

      if (!success) {
        this.logger.error(
          `❌ Fallo crítico: no se pudo subir ${filename} después de 3 intentos.`,
          lastError?.stack,
        );
        throw lastError;
      }

      const url = `https://${bucket}.s3.${region}.amazonaws.com/${filename}`;

      // 🔹 Actualizar DB usando el nombre correcto de la columna
      await this.prismaService.userDetail.update({
        where: { userId: Number(userId) },
        data: { [columnName]: url },
      });

      this.logger.log(`✅ Archivo actualizado correctamente en ${alias}: ${url}`);
      uploadedUrls[alias] = url;
    }

    return uploadedUrls as Record<AttachmentType, string>;
  }
}