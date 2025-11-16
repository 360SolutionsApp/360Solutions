/* eslint-disable prettier/prettier */
// invoice-calculation.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class InvoiceCalculationService {
    parseDateTimeFromTimeString(baseDate: string, timeString: string): Date {
        // Método directo y explícito - crear fecha en UTC para evitar problemas
        const [hours, minutes] = timeString.split(':').map(Number);

        // Crear fecha en UTC explícitamente
        const date = new Date(baseDate + 'T00:00:00Z'); // Fecha base en UTC
        date.setUTCHours(hours, minutes, 0, 0); // Establecer hora en UTC

        console.log(`🕒 Parse UTC: ${baseDate} ${timeString} -> ${date.toISOString()} (UTC: ${date.getUTCHours()}:${date.getUTCMinutes().toString().padStart(2, '0')})`);

        return date;
    }

    formatDate(date: Date): string {
        return date.toISOString().split('T')[0]; // YYYY-MM-DD
    }

    calcHours(start: Date, end: Date): number {
        const diffMs = end.getTime() - start.getTime();
        const hours = diffMs / (1000 * 60 * 60);
        console.log(`⏱️ Cálculo horas: ${start.toISOString()} -> ${end.toISOString()} = ${hours.toFixed(2)}h`);
        return hours;
    }

    hoursForSurcharge(totalHours: number, minHour: number, maxHour?: number): number {
        if (totalHours <= minHour) return 0;
        if (maxHour && totalHours > maxHour) return maxHour - minHour;
        return totalHours - minHour;
    }
}