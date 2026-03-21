/* eslint-disable prettier/prettier */
// simple-email-queue.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ZohoMailService } from '../mailer/zoho-mailer.service';

@Injectable()
export class SimpleEmailQueueService {
    private readonly logger = new Logger(SimpleEmailQueueService.name);
    private queue: Array<{ data: any, retries: number }> = [];
    private isProcessing = false;
    private sentInWindow = 0;
    private windowStart = Date.now();
    private readonly MAX_PER_MINUTE = 2;
    private readonly MAX_QUEUE_SIZE = 300;
    private readonly MAX_RETRIES = 1;
    private consecutiveFailures = 0;
    private readonly MAX_FAILURES = 5;
    private readonly COOLDOWN_TIME = 300000; // 5 minutos
    private recentRecipients = new Map<string, number>();
    private readonly DUPLICATE_WINDOW = 60000; // 1 minuto

    constructor(private readonly zohoMailService: ZohoMailService) {
        // Iniciar el procesador automáticamente
        this.startQueueProcessor();
    }

    private isHardBounce(error: any): boolean {
        const message =
            error?.response?.data?.error?.message ||
            error?.response?.data?.message ||
            error?.message ||
            '';

        const hardBouncePatterns = [
            'invalid',
            'does not exist',
            'NoSuchUser',
            '5.1.1',
            'Recipient address rejected',
        ];

        return hardBouncePatterns.some(pattern =>
            message.toLowerCase().includes(pattern.toLowerCase()),
        );
    }

    /**
     * Agrega un correo a la cola y retorna inmediatamente
     */
    async addToQueue(emailData: { to: string | string[]; subject: string; html: string }): Promise<void> {

        if (this.queue.length >= this.MAX_QUEUE_SIZE) {
            this.logger.warn(`⚠️ Cola llena. Se descarta correo para: ${emailData.to}`);
            return; // No lanzas error al cliente
        }

        const now = Date.now();

        // LIMPIEZA DEL MAP (anti memory growth)
        for (const [key, value] of this.recentRecipients.entries()) {
            if (now - value > this.DUPLICATE_WINDOW) {
                this.recentRecipients.delete(key);
            }
        }

        const recipient = Array.isArray(emailData.to)
            ? emailData.to.join(',')
            : emailData.to;

        const lastSent = this.recentRecipients.get(recipient);

        if (lastSent && now - lastSent < this.DUPLICATE_WINDOW) {
            this.logger.warn(`⚠️ Envío duplicado detectado para ${recipient}. Ignorado.`);
            return;
        }

        this.recentRecipients.set(recipient, now);

        this.queue.push({ data: emailData, retries: 0 });
        this.logger.log(`📨 Correo agregado a cola para: ${emailData.to}`);

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
                    this.consecutiveFailures = 0;                    

                    this.sentInWindow = Math.max(0, this.sentInWindow - 1);
                    this.logger.log(`✅ Correo enviado exitosamente`);

                } catch (error) {
                    // Manejar error
                    //this.logger.error(`❌ Error al enviar correo a ${item.data.to}: ${error.message}`);
                    const errorMsg = error?.message || JSON.stringify(error);
                    this.logger.error(`❌ Error al enviar correo a ${item.data.to}: ${errorMsg}`);

                    const errorMessage = (error.message || '').toLowerCase();

                    // 🌐 errores de red
                    if (
                        errorMessage.includes('timeout') ||
                        errorMessage.includes('network') ||
                        errorMessage.includes('socket') ||
                        errorMessage.includes('econnreset')
                    ) {
                        this.logger.warn('🌐 Error de red detectado, reintentando sin penalizar fuerte');
                        item.retries = 0;
                    } else {
                        // 🔥 SOLO contar fallos reales
                        this.consecutiveFailures++;
                    }

                    const isBlocked =
                        errorMessage.includes('limit') ||
                        errorMessage.includes('blocked') ||
                        errorMessage.includes('rate') ||
                        errorMessage.includes('too many') ||
                        errorMessage.includes('throttled');

                    if (isBlocked) {
                        this.logger.error('🚫 Bloqueo detectado. Pausando TODA la cola 10 minutos...');

                        await new Promise(resolve => setTimeout(resolve, 600000));

                        this.consecutiveFailures = 0;

                        // 🔥 reset rate limiter completamente
                        this.windowStart = Date.now();
                        this.sentInWindow = 0;

                        continue;
                    }

                    if (this.consecutiveFailures >= this.MAX_FAILURES) {
                        this.logger.error('🛑 Demasiados fallos consecutivos. Pausando envío por 5 minutos...');
                        await new Promise(resolve => setTimeout(resolve, this.COOLDOWN_TIME));
                        this.consecutiveFailures = 0;
                    }

                    const isHard = this.isHardBounce(error);

                    if (isHard) {
                        this.logger.error(`🚫 Hard bounce detectado. No se reintentará: ${item.data.to}`);
                        this.queue.shift();
                        continue;
                    }

                    if (item.retries < this.MAX_RETRIES) {
                        item.retries++;
                        this.logger.warn(`🔄 Reintento ${item.retries}/${this.MAX_RETRIES} para: ${item.data.to}`);

                        // Mover al final de la cola para reintentar después
                        this.queue.shift();
                        this.queue.push(item);

                        // Esperar 2 minutos antes de continuar
                        //await new Promise(resolve => setTimeout(resolve, 120000));
                        const backoffTime = 60000 * item.retries; // 1 min, luego 2 min
                        await new Promise(resolve => setTimeout(resolve, backoffTime));

                    } else {
                        // Máximo de intentos alcanzado
                        this.logger.error(`❌ Correo fallado definitivamente: ${item.data.to}`);
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

        if (now - this.windowStart > 60000) {
            this.windowStart = now;
            this.sentInWindow = 0;
        }

        if (this.sentInWindow >= this.MAX_PER_MINUTE) {
            const waitTime = 60000 - (now - this.windowStart);
            this.logger.warn(`⏳ Límite alcanzado. Esperando ${waitTime} ms`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            this.windowStart = Date.now();
            this.sentInWindow = 0;
        }

        this.sentInWindow++;

        await new Promise(resolve => setTimeout(resolve, 3000));
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