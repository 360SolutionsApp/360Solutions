/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class ClientCompanyAttachmentService {
    private readonly logger = new Logger(ClientCompanyAttachmentService.name);
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
     * 📌 Subir contrato PDF (si ya existe uno, se elimina antes)
     */
    async uploadOrUpdateContractPdf(
        file: Express.Multer.File,
        clientCompanyId: number,
    ): Promise<string> {
        const bucket = this.configService.get<string>('AWS_S3_BUCKET');
        const region = this.configService.get<string>('AWS_REGION');

        // 🔹 Validar que sea PDF
        if (file.mimetype !== 'application/pdf') {
            throw new Error('Solo se permiten archivos PDF.');
        }

        const extension = 'pdf';
        const filename = `contracts/${clientCompanyId}/${uuidv4()}.${extension}`;

        // 🔹 Buscar contrato previo
        const clientCompany = await this.prismaService.clientCompany.findUnique({
            where: { id: clientCompanyId },
        });

        const previousUrl = clientCompany?.attachedContractUrl;

        if (previousUrl) {
            try {
                const key = previousUrl.split('.amazonaws.com/')[1];
                if (key) {
                    await this.s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
                    this.logger.log(`🗑️ Contrato anterior eliminado: ${key}`);
                }
            } catch (err: any) {
                this.logger.warn(`No se pudo eliminar contrato anterior: ${err.message}`);
            }
        }

        // 🔹 Subir nuevo contrato
        await this.s3Client.send(
            new PutObjectCommand({
                Bucket: bucket,
                Key: filename,
                Body: file.buffer,
                ContentType: file.mimetype,
            }),
        );

        const url = `https://${bucket}.s3.${region}.amazonaws.com/${filename}`;

        // 🔹 Guardar en DB
        await this.prismaService.clientCompany.update({
            where: { id: clientCompanyId },
            data: { attachedContractUrl: url },
        });

        this.logger.log(`✅ Contrato PDF actualizado: ${url}`);
        return url;
    }

    /**
     * 📌 Eliminar contrato (S3 + DB)
     */
    async deleteContract(clientCompanyId: number): Promise<void> {
        const bucket = this.configService.get<string>('AWS_S3_BUCKET');

        const clientCompany = await this.prismaService.clientCompany.findUnique({
            where: { id: clientCompanyId },
        });

        if (!clientCompany?.attachedContractUrl) {
            this.logger.warn(`⚠️ No hay contrato asociado para clientCompanyId=${clientCompanyId}`);
            return;
        }

        const key = clientCompany.attachedContractUrl.split('.amazonaws.com/')[1];

        if (key) {
            try {
                await this.s3Client.send(
                    new DeleteObjectCommand({
                        Bucket: bucket,
                        Key: key,
                    }),
                );
                this.logger.log(`🗑️ Contrato eliminado en S3: ${key}`);
            } catch (err: any) {
                this.logger.error(`❌ Error eliminando archivo en S3: ${err.message}`, err.stack);
                throw err;
            }
        }

        this.logger.log(`✅ URL eliminada de ClientCompany (id=${clientCompanyId})`);
    }
}
