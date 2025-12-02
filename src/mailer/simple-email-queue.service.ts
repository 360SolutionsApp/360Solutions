/* eslint-disable prettier/prettier */
// simple-email-queue.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ZohoMailService } from '../mailer/zoho-mailer.service';

@Injectable()
export class SimpleEmailQueueService {
    private readonly logger = new Logger(SimpleEmailQueueService.name);
    private queue: Array<{ data: any, retries: number }> = [];
    private isProcessing = false;
    private lastSentTime = 0;
    private readonly INTERVAL_MS = 45000; // 45 segundos para ser seguro

    constructor(private readonly zohoMailService: ZohoMailService) {
        // Iniciar el procesador automáticamente
        this.startQueueProcessor();
    }

    /**
     * Agrega un correo a la cola y retorna inmediatamente
     */
    async addToQueue(emailData: { to: string | string[]; subject: string; html: string }): Promise<void> {
        this.queue.push({ data: emailData, retries: 0 });
        this.logger.log(`📨 Correo agregado a cola para: ${emailData.to}`);

        // Iniciar procesamiento si no está activo
        if (!this.isProcessing) {
            this.processQueue();
        }
    }

    /**
     * Procesa la cola en segundo plano
     */
    private async processQueue() {
        if (this.isProcessing) return;

        this.isProcessing = true;

        try {
            while (this.queue.length > 0) {
                const item = this.queue[0];

                try {
                    // Esperar intervalo seguro
                    await this.waitForInterval();

                    this.logger.log(`📤 Enviando correo a: ${item.data.to}`);
                    await this.zohoMailService.sendMail(item.data);

                    // Éxito: remover de la cola
                    this.queue.shift();
                    this.logger.log(`✅ Correo enviado exitosamente`);

                } catch (error) {
                    // Manejar error
                    this.logger.error(`❌ Error al enviar correo a ${item.data.to}: ${error.message}`);
                    if (item.retries < 2) { // Máximo 3 intentos (0, 1, 2)
                        item.retries++;
                        this.logger.warn(`🔄 Reintento ${item.retries}/3 en 2 minutos para: ${item.data.to}`);

                        // Mover al final de la cola para reintentar después
                        this.queue.shift();
                        this.queue.push(item);

                        // Esperar 2 minutos antes de continuar
                        await new Promise(resolve => setTimeout(resolve, 120000));

                    } else {
                        // Máximo de intentos alcanzado
                        this.logger.error(`❌ Correo fallado después de 3 intentos: ${item.data.to}`);
                        this.queue.shift(); // Remover de la cola
                    }
                }
            }
        } finally {
            this.isProcessing = false;
        }
    }

    private async waitForInterval(): Promise<void> {
        const now = Date.now();
        const timeSinceLastSent = now - this.lastSentTime;

        if (timeSinceLastSent < this.INTERVAL_MS) {
            const waitTime = this.INTERVAL_MS - timeSinceLastSent;
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        this.lastSentTime = Date.now();
    }

    private async startQueueProcessor() {
        // Verificar la cola cada 30 segundos por si se quedó estancada
        setInterval(() => {
            if (this.queue.length > 0 && !this.isProcessing) {
                this.processQueue();
            }
        }, 30000);
    }
}