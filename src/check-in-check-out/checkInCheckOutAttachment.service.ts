/* eslint-disable prettier/prettier */
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class CheckInCheckOutAttachmentService {
    private readonly logger = new Logger(CheckInCheckOutAttachmentService.name);
    private readonly s3Client: S3Client;

    constructor(
        private readonly prisma: PrismaService,
        private readonly configService: ConfigService,
    ) {
        this.s3Client = new S3Client({
            region: this.configService.get<string>('AWS_REGION'),
        });
    }

    /**
     * 📌 Subir 1 o 2 imágenes al bucket para checkIn o checkOut
     */
    async uploadEvidenceImages(
        files: Express.Multer.File[],
        recordId: number,
        type: 'checkIn' | 'checkOut',
    ): Promise<{ urls: string[] }> {
        if (!files || files.length === 0) {
            throw new BadRequestException('Debes adjuntar al menos una imagen.');
        }

        const bucket = this.configService.get<string>('AWS_S3_BUCKET');
        const region = this.configService.get<string>('AWS_REGION');

        const urls: string[] = [];

        for (const file of files) {
            if (!file.mimetype.startsWith('image/')) {
                throw new BadRequestException('Solo se permiten archivos de imagen.');
            }

            const extension = file.originalname.split('.').pop();
            const filename = `evidences/${type}/${recordId}/${uuidv4()}.${extension}`;

            await this.s3Client.send(
                new PutObjectCommand({
                    Bucket: bucket,
                    Key: filename,
                    Body: file.buffer,
                    ContentType: file.mimetype,
                }),
            );

            const url = `https://${bucket}.s3.${region}.amazonaws.com/${filename}`;
            urls.push(url);
        }

        // Guardar las evidencias en DB
        if (type === 'checkIn') {
            await this.prisma.checkIn.update({
                where: { id: recordId },
                data: {
                    attachEvidenceOneUrl: urls[0] || null,
                    attachEvidenceTwoUrl: urls[1] || null,
                },
            });
        } else if (type === 'checkOut') {
            await this.prisma.checkOut.update({
                where: { id: recordId },
                data: {
                    attachEvidenceOneUrl: urls[0] || null,
                    attachEvidenceTwoUrl: urls[1] || null,
                },
            });
        }

        this.logger.log(`✅ Evidencias subidas para ${type} con id=${recordId}`);
        return { urls };
    }

    /**
     * 📌 Eliminar evidencias de un checkIn o checkOut
     */
    async deleteEvidenceImages(recordId: number, type: 'checkIn' | 'checkOut'): Promise<void> {
        const bucket = this.configService.get<string>('AWS_S3_BUCKET');

        let record: any = null;
        if (type === 'checkIn') {
            record = await this.prisma.checkIn.findUnique({ where: { id: recordId } });
        } else {
            record = await this.prisma.checkOut.findUnique({ where: { id: recordId } });
        }

        if (!record) {
            throw new BadRequestException(`No se encontró ${type} con id=${recordId}`);
        }

        const urls = [record.attachEvidenceOneUrl, record.attachEvidenceTwoUrl].filter(Boolean);

        for (const url of urls) {
            try {
                const key = url.split('.amazonaws.com/')[1];
                if (key) {
                    await this.s3Client.send(
                        new DeleteObjectCommand({
                            Bucket: bucket,
                            Key: key,
                        }),
                    );
                    this.logger.log(`🗑️ Evidencia eliminada en S3: ${key}`);
                }
            } catch (err: any) {
                this.logger.error(`❌ Error eliminando evidencia en S3: ${err.message}`, err.stack);
            }
        }

        // Resetear en DB
        if (type === 'checkIn') {
            await this.prisma.checkIn.update({
                where: { id: recordId },
                data: { attachEvidenceOneUrl: null, attachEvidenceTwoUrl: null },
            });
        } else {
            await this.prisma.checkOut.update({
                where: { id: recordId },
                data: { attachEvidenceOneUrl: null, attachEvidenceTwoUrl: null },
            });
        }

        this.logger.log(`✅ Evidencias eliminadas para ${type} id=${recordId}`);
    }
}
