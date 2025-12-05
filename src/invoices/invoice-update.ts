/* eslint-disable prettier/prettier */
// invoice-update.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { InvoiceCalculationService } from './invoice-calcualtion';
import { InvoicesService } from './invoices.service';

@Injectable()
export class InvoiceUpdateService {
    constructor(
        private prisma: PrismaService,
        private invoiceCalculation: InvoiceCalculationService,
        private invoiceService: InvoicesService,
    ) { }

    /**
     * Actualiza todas las facturas relacionadas con un check-in/check-out específico
     */
    // invoice-update.service.ts
    async updateInvoicesByCheckRecord(checkRecordId: number, checkType: 'IN' | 'OUT'): Promise<void> {
        try {
            console.log(`🔄 Actualizando facturas para ${checkType} record: ${checkRecordId}`);

            // Primero obtener el registro básico para obtener userId y orderId
            let basicRecord: any;

            if (checkType === 'IN') {
                basicRecord = await this.prisma.checkIn.findUnique({
                    where: { id: checkRecordId },
                    select: {
                        userCollabId: true,
                        orderId: true,
                    },
                });
            } else {
                basicRecord = await this.prisma.checkOut.findUnique({
                    where: { id: checkRecordId },
                    select: {
                        userCollabId: true,
                        orderId: true,
                    },
                });
            }

            if (!basicRecord) {
                throw new NotFoundException(`Registro de check-${checkType.toLowerCase()} no encontrado`);
            }

            const userId = basicRecord.userCollabId;
            const orderId = basicRecord.orderId;

            console.log(`📋 Datos básicos: usuario ${userId}, orden ${orderId}`);

            // Ahora obtener el registro completo con las relaciones necesarias
            let fullRecord: any;

            if (checkType === 'IN') {
                fullRecord = await this.prisma.checkIn.findUnique({
                    where: { id: checkRecordId },
                    include: {
                        breakPeriods: true,
                        userCollab: true,
                        order: {
                            include: {
                                clientCompany: true,
                                checkIn: {
                                    where: { userCollabId: userId }, // ← Usar userId obtenido
                                    include: { breakPeriods: true },
                                },
                                checkOut: {
                                    where: { userCollabId: userId }, // ← Usar userId obtenido
                                },
                            },
                        },
                    },
                });
            } else {
                fullRecord = await this.prisma.checkOut.findUnique({
                    where: { id: checkRecordId },
                    include: {
                        userCollab: true,
                        order: {
                            include: {
                                clientCompany: true,
                                checkIn: {
                                    where: { userCollabId: userId }, // ← Usar userId obtenido
                                    include: { breakPeriods: true },
                                },
                                checkOut: {
                                    where: { userCollabId: userId }, // ← Usar userId obtenido
                                },
                            },
                        },
                    },
                });
            }

            if (!fullRecord) {
                throw new NotFoundException(`No se pudo obtener el registro completo de check-${checkType.toLowerCase()}`);
            }

            // Buscar todas las facturas activas para este usuario y orden
            const invoices = await this.prisma.invoice.findMany({
                where: {
                    userId,
                    workOrderId: orderId,
                    isDeleted: false,
                },
                include: {
                    invoiceAssignments: {
                        include: {
                            surchargeDetails: {
                                include: { surcharge: true },
                            },
                        },
                    },
                },
            });

            // Si NO hay facturas → CREAR y salir
            if (invoices.length === 0) {
                console.log(`ℹ️ No hay facturas activas para usuario ${userId}, orden ${orderId}. Creando nueva...`);

                const created = await this.invoiceService.createInvoicesForUser(userId, [orderId]);

                console.log(`📄 Factura creada correctamente:`, created);
                return; // se detiene aquí, no intenta recalcular nada
            }

            // Si hay facturas → recalcularlas
            console.log(`📄 Encontradas ${invoices.length} facturas para actualizar`);
            for (const invoice of invoices) {
                await this.recalculateAndUpdateInvoice(invoice.id, userId, orderId);
            }

            console.log(`✅ Facturas actualizadas exitosamente para ${checkType} record: ${checkRecordId}`);
        } catch (error) {
            console.error(`❌ Error actualizando facturas para ${checkType} record ${checkRecordId}:`, error);
            throw error;
        }
    }

    /**
     * Recalcula y actualiza una factura específica
     */
    async recalculateAndUpdateInvoice(invoiceId: number, userId: number, workOrderId: number): Promise<void> {
        try {
            console.log(`🔄 Recalculando factura ${invoiceId} para usuario ${userId}, orden ${workOrderId}`);

            // Obtener datos actualizados necesarios para el cálculo
            const [user, workOrder, surcharges, originalInvoice] = await Promise.all([
                this.prisma.user.findUnique({
                    where: { id: userId },
                    include: { userDetail: true },
                }),
                this.prisma.workOrder.findUnique({
                    where: { id: workOrderId },
                    include: {
                        clientCompany: true,
                        checkIn: {
                            where: { userCollabId: userId },
                            include: { breakPeriods: true },
                        },
                        checkOut: {
                            where: { userCollabId: userId },
                        },
                    },
                }),
                this.prisma.salarySurcharge.findMany({
                    orderBy: { minHour: 'asc' },
                }),
                this.prisma.invoice.findUnique({
                    where: { id: invoiceId },
                    include: {
                        invoiceAssignments: {
                            include: {
                                assignment: true,
                                surchargeDetails: true,
                            },
                        },
                    },
                }),
            ]);

            // Validaciones
            if (!user || !workOrder) {
                console.error(`❌ Usuario ${userId} u orden de trabajo ${workOrderId} no encontrados`);
                return;
            }

            if (!originalInvoice) {
                console.error(`❌ Factura ${invoiceId} no encontrada`);
                return;
            }

            const checkInRecord = workOrder.checkIn?.[0];
            const checkOutRecord = workOrder.checkOut?.[0];

            if (!checkInRecord || !checkOutRecord) {
                console.log('ℹ️ No hay registros completos de check-in/check-out, no se puede recalcular');
                return;
            }

            console.log(`🕒 Check-in real: ${checkInRecord.startTime}, Check-out real: ${checkOutRecord.finalTime}`);

            // Obtener la fecha base del check-in (usar la fecha real del check-in)
            const checkInDate = new Date(checkInRecord.createdAt);
            const baseDate = this.invoiceCalculation.formatDate(checkInDate); // YYYY-MM-DD

            console.log(`📅 Fecha base para cálculos: ${baseDate}`);

            // Parsear fechas en UTC para consistencia
            const startDate = this.invoiceCalculation.parseDateTimeFromTimeString(baseDate, checkInRecord.startTime);
            let endDate = this.invoiceCalculation.parseDateTimeFromTimeString(baseDate, checkOutRecord.finalTime);

            console.log(`🕐 Fechas parseadas UTC:`);
            console.log(`   Inicio: ${startDate.toISOString()} (UTC: ${startDate.getUTCHours()}:${startDate.getUTCMinutes().toString().padStart(2, '0')})`);
            console.log(`   Fin: ${endDate.toISOString()} (UTC: ${endDate.getUTCHours()}:${endDate.getUTCMinutes().toString().padStart(2, '0')})`);

            // Ajustar si el check-out es del día siguiente (basado en hora UTC)
            if (endDate.getTime() <= startDate.getTime()) {
                console.log('🔁 Ajustando check-out al día siguiente');
                endDate = new Date(endDate);
                endDate.setUTCDate(endDate.getUTCDate() + 1);
                console.log(`🕐 Nueva fecha fin: ${endDate.toISOString()} (UTC: ${endDate.getUTCHours()}:${endDate.getUTCMinutes().toString().padStart(2, '0')})`);
            }

            // Calcular horas totales ANTES de breaks
            const totalHoursBeforeBreaks = this.invoiceCalculation.calcHours(startDate, endDate);
            console.log(`⏱️ Horas totales (sin breaks): ${totalHoursBeforeBreaks.toFixed(2)}`);

            // Calcular breaks
            let totalBreakHours = 0;
            if (checkInRecord.breakPeriods?.length) {
                console.log(`☕ Procesando ${checkInRecord.breakPeriods.length} break(s)`);

                for (const brk of checkInRecord.breakPeriods) {
                    if (brk.breakStartTime && brk.breakEndTime) {
                        const breakStart = this.invoiceCalculation.parseDateTimeFromTimeString(baseDate, brk.breakStartTime);
                        let breakEnd = this.invoiceCalculation.parseDateTimeFromTimeString(baseDate, brk.breakEndTime);

                        // Ajustar si el break termina al día siguiente
                        if (breakEnd.getTime() <= breakStart.getTime()) {
                            console.log(`🔁 Ajustando break al día siguiente: ${brk.breakStartTime}-${brk.breakEndTime}`);
                            breakEnd = new Date(breakEnd);
                            breakEnd.setUTCDate(breakEnd.getUTCDate() + 1);
                        }

                        const breakHours = this.invoiceCalculation.calcHours(breakStart, breakEnd);
                        totalBreakHours += breakHours;

                        console.log(`☕ Break: ${brk.breakStartTime}-${brk.breakEndTime} = ${breakHours.toFixed(2)}h`);
                    }
                }
            }

            console.log(`⏸️ Total horas de breaks: ${totalBreakHours.toFixed(2)}`);

            // Calcular horas totales trabajadas (descontando breaks)
            let totalOrderHours = totalHoursBeforeBreaks - totalBreakHours;
            if (totalOrderHours < 0) totalOrderHours = 0;

            console.log(`📊 Horas netas trabajadas: ${totalOrderHours.toFixed(2)}`);

            // Preparar fechas para guardar en la base de datos (usar las fechas UTC calculadas)
            const checkInForDB = new Date(startDate);
            const checkOutForDB = new Date(endDate);

            // Verificación final de fechas
            console.log(`💾 Fechas finales para DB:`);
            console.log(`   CheckIn: ${checkInForDB.toISOString()} (UTC: ${checkInForDB.getUTCHours()}:${checkInForDB.getUTCMinutes().toString().padStart(2, '0')})`);
            console.log(`   CheckOut: ${checkOutForDB.toISOString()} (UTC: ${checkOutForDB.getUTCHours()}:${checkOutForDB.getUTCMinutes().toString().padStart(2, '0')})`);

            // Recalcular montos para cada asignación
            let invoiceTotalBaseCompany = 0;
            let invoiceTotalBaseCollab = 0;
            let invoiceTotalWithSurchargesCompany = 0;
            let invoiceTotalWithSurchargesCollab = 0;

            const assignmentUpdates = [];

            for (const assignment of originalInvoice.invoiceAssignments) {
                const assignmentId = assignment.assignmentId;
                const assignmentName = assignment.assignmentName;

                console.log(`📝 Procesando asignación: ${assignmentName} (ID: ${assignmentId})`);

                // Recalcular precios (similar a createInvoicesForUser)
                let pricePerHourCollaborator = assignment.pricePerHourCollaborator;
                let pricePerHourCompany: any = assignment.pricePerHourCompany;

                // Si tenemos assignmentId, podemos recalcular los precios actualizados
                if (assignmentId) {
                    const userDetailId = user.userDetail?.id;
                    if (userDetailId) {
                        const ucost = await this.prisma.userCostPerAssignment.findFirst({
                            where: { userDetailId, assignmentId },
                        });
                        if (ucost) {
                            pricePerHourCollaborator = ucost.costPerHour;
                            console.log(`💰 Precio colaborador actualizado: $${pricePerHourCollaborator}`);
                        }
                    }

                    const clientId = workOrder.clientId;
                    if (clientId) {
                        const cprice = await this.prisma.clientPricePerAssignment.findFirst({
                            where: { clientId, assignmentId },
                        });
                        if (cprice) {
                            pricePerHourCompany = cprice.pricePerHour;
                            console.log(`💰 Precio empresa actualizado: $${pricePerHourCompany}`);
                        }
                    }
                }

                // Recalcular horas regulares (primeras 8 horas)
                const regularHours = Math.min(totalOrderHours, 8);
                const totalRegularCompany = regularHours * pricePerHourCompany;
                const totalRegularCollaborator = regularHours * pricePerHourCollaborator;

                console.log(`⏰ Horas regulares: ${regularHours}h, Total Empresa: $${totalRegularCompany}, Total Colab: $${totalRegularCollaborator}`);

                // Recalcular recargos
                const surchargeUpdates = [];
                let assignmentExtraCompany = 0;
                let assignmentExtraCollaborator = 0;

                for (const sc of surcharges) {
                    const applicable = this.invoiceCalculation.hoursForSurcharge(totalOrderHours, sc.minHour, sc.maxHour ?? undefined);

                    if (applicable > 0) {
                        const companyAmountForThis = applicable * pricePerHourCompany * sc.percentage;
                        const collabAmountForThis = applicable * pricePerHourCollaborator * sc.percentage;

                        assignmentExtraCompany += companyAmountForThis;
                        assignmentExtraCollaborator += collabAmountForThis;

                        surchargeUpdates.push({
                            surchargeId: sc.id,
                            hoursApplied: applicable,
                            appliedMultiplier: sc.percentage,
                        });

                        console.log(`⚡ Recargo ${sc.name}: ${applicable}h, Multiplicador: ${sc.percentage}x, Extra Empresa: $${companyAmountForThis}, Extra Colab: $${collabAmountForThis}`);
                    }
                }

                // Totales para esta asignación
                const totalAmountCompany = totalRegularCompany + assignmentExtraCompany;
                const totalAmountCollaborator = totalRegularCollaborator + assignmentExtraCollaborator;

                // Acumular totales de la factura
                invoiceTotalBaseCompany += totalRegularCompany;
                invoiceTotalBaseCollab += totalRegularCollaborator;
                invoiceTotalWithSurchargesCompany += totalAmountCompany;
                invoiceTotalWithSurchargesCollab += totalAmountCollaborator;

                console.log(`🧮 Totales asignación - Empresa: $${totalAmountCompany}, Colab: $${totalAmountCollaborator}`);

                assignmentUpdates.push({
                    where: { id: assignment.id },
                    data: {
                        checkIn: checkInForDB,
                        checkOut: checkOutForDB,
                        hoursWorked: totalOrderHours,
                        pricePerHourCompany,
                        pricePerHourCollaborator,
                        totalAmountCompany,
                        totalAmountCollaborator,
                        totalRegularCompany,
                        totalRegularCollaborator,
                        surchargeDetails: {
                            deleteMany: {},
                            create: surchargeUpdates,
                        },
                    },
                });
            }

            // Actualizar la factura principal
            await this.prisma.invoice.update({
                where: { id: invoiceId },
                data: {
                    totalHoursWorked: totalOrderHours,
                    totalBaseCompany: invoiceTotalBaseCompany,
                    totalBaseCollab: invoiceTotalBaseCollab,
                    totalWithSurchargesCompany: invoiceTotalWithSurchargesCompany,
                    totalWithSurchargesCollab: invoiceTotalWithSurchargesCollab,
                    updatedAt: new Date(),
                },
            });

            console.log(`📄 Factura principal actualizada - Horas: ${totalOrderHours}, Base Empresa: $${invoiceTotalBaseCompany}, Base Colab: $${invoiceTotalBaseCollab}`);

            // Actualizar cada asignación
            for (const update of assignmentUpdates) {
                await this.prisma.invoiceAssignment.update(update);
                console.log(`✅ Asignación ${update.where.id} actualizada`);
            }

            console.log(`🎉 Factura ${invoiceId} recalculada y actualizada exitosamente`);
        } catch (error) {
            console.error(`❌ Error recalculando factura ${invoiceId}:`, error);

            if (error instanceof Error) {
                console.error(`📌 Error details: ${error.message}`);
                console.error(`📌 Stack trace: ${error.stack}`);
            }

            throw error;
        }
    }
}