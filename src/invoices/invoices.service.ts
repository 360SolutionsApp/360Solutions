/* eslint-disable prettier/prettier */
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import dayjs from 'dayjs'; // si no usas dayjs, reemplazar con Date puro
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { PaginationDto } from 'src/helpers/pagination.dto';
import { PrismaService } from 'src/prisma.service';
dayjs.extend(customParseFormat);

interface InvoiceFilterDto extends PaginationDto {
  collaboratorName?: string;
  clientName?: string;
  invoiceNumber?: string;
  workOrderCodePo?: string;
  sortBy?: string; // ejemplo: 'createdAt', 'totalWithSurchargesCompany'
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) { }
  private parseDateTimeFromTimeString(baseDateIso: string, hhmm: string) {
    // baseDateIso => "2025-11-11" ; hhmm => "22:30"
    // produce JS Date in UTC
    return new Date(`${baseDateIso}T${hhmm}:00Z`);
  }

  private calcHours(startDate: Date, endDate: Date) {
    const s = dayjs(startDate);
    let e = dayjs(endDate);
    if (e.isBefore(s)) e = e.add(1, 'day'); // crossing midnight
    const hours = e.diff(s, 'hour', true);
    return Math.max(0, hours);
  }

  private hoursForSurcharge(hoursWorked: number, minHour: number, maxHour?: number) {
    const upper = typeof maxHour === 'number' ? Math.min(hoursWorked, maxHour) : hoursWorked;
    const val = Math.max(0, upper - minHour);
    return Math.max(0, val);
  }

  async createInvoicesForUser(userId: number, workOrderIds?: number[]) {
    // 1) traer user y su userDetail (para userCostPerAssignment)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { userDetail: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    // 2) traer las reglas de recargo (dinámicas)
    const surcharges = await this.prisma.salarySurcharge.findMany({
      orderBy: { minHour: 'asc' },
    }); // [{id, name, percentage, minHour, maxHour}, ...]

    // 3) obtener orderAssignToCollabs donde el usuario aparece en worksAssigned
    const assignedOrders = await this.prisma.orderAssignToCollabs.findMany({
      where: {
        worksAssigned: {
          some: { collaboratorId: userId },
        },
      },
      include: {
        workOrder: {
          include: {
            clientCompany: true,
            // traemos checkIn / checkOut solo del usuario (filtro en include)
            checkIn: {
              where: { userCollabId: userId },
              include: { breakPeriods: true }, // Incluimos los breaks
            },
            checkOut: { where: { userCollabId: userId } },
          },
        },
        worksAssigned: {
          include: {
            assignment: true,
            collaborator: true,
          },
        },
      },
    });

    if (!assignedOrders.length) {
      throw new BadRequestException('El colaborador no tiene órdenes asignadas');
    }

    // 4) filtrar por workOrderIds si vienen
    const ordersFiltered = workOrderIds?.length
      ? assignedOrders.filter((o) => workOrderIds.includes(o.workOrderId))
      : assignedOrders;

    if (!ordersFiltered.length) {
      throw new BadRequestException('No hay órdenes válidas para facturar');
    }

    const createdInvoices = [];

    for (const orderAssign of ordersFiltered) {
      const workOrder = orderAssign.workOrder;
      if (!workOrder) continue;

      // obtener el checkIn/checkOut del usuario (podrían ser múltiples, tomamos el primero válido)
      const checkInRecord = workOrder.checkIn?.[0];
      const checkOutRecord = workOrder.checkOut?.[0];

      if (!checkInRecord || !checkOutRecord) {
        // no facturamos si falta alguno
        continue;
      }

      // evitar facturas duplicadas (user + workOrder)
      const existing = await this.prisma.invoice.findFirst({
        where: { userId, workOrderId: workOrder.id, isDeleted: false },
      });
      if (existing) {
        // saltar si ya existe
        continue;
      }

      // base date from checkIn.createdAt for building ISO datetimes
      const baseDate = dayjs(checkInRecord.createdAt).format('YYYY-MM-DD');
      const startDate = this.parseDateTimeFromTimeString(baseDate, checkInRecord.startTime);
      let endDate = this.parseDateTimeFromTimeString(baseDate, checkOutRecord.finalTime);
      if (dayjs(endDate).isBefore(dayjs(startDate))) endDate = dayjs(endDate).add(1, 'day').toDate();

      // Calcular duración total de breaks
      let totalBreakHours = 0;
      if (checkInRecord.breakPeriods?.length) {
        for (const brk of checkInRecord.breakPeriods) {
          if (brk.breakStartTime && brk.breakEndTime) {
            const breakStart = this.parseDateTimeFromTimeString(baseDate, brk.breakStartTime);
            let breakEnd = this.parseDateTimeFromTimeString(baseDate, brk.breakEndTime);
            if (dayjs(breakEnd).isBefore(dayjs(breakStart))) {
              breakEnd = dayjs(breakEnd).add(1, 'day').toDate();
            }
            const breakHours = this.calcHours(breakStart, breakEnd);
            totalBreakHours += breakHours;
          }
        }
      }

      // 👉 2️⃣ Calcular horas totales descontando los breaks
      let totalOrderHours = this.calcHours(startDate, endDate) - totalBreakHours;
      if (totalOrderHours < 0) totalOrderHours = 0;

      // We'll compute invoice-level totals by summing per-assignment results
      let invoiceTotalBaseCompany = 0;
      let invoiceTotalBaseCollab = 0;
      let invoiceTotalWithSurchargesCompany = 0;
      let invoiceTotalWithSurchargesCollab = 0;

      // gather nested creates for InvoiceAssignment
      const invoiceAssignmentsCreates = [];

      // find all worksAssigned entries that belong to this user
      const userWorks = orderAssign.worksAssigned.filter((w) => w.collaboratorId === userId);

      for (const wa of userWorks) {
        const assignment = wa.assignment; // may be null if assignment deleted
        const assignmentId = assignment?.id ?? null;
        const assignmentName = assignment?.title ?? 'Asignación eliminada';

        // price collaborator: check userCostPerAssignment (userDetail) -> fallback to assignment.costPerHour
        const userDetailId = user.userDetail?.id;
        let pricePerHourCollaborator = assignment?.costPerHour ?? 0;
        if (userDetailId && assignmentId) {
          const ucost = await this.prisma.userCostPerAssignment.findFirst({
            where: { userDetailId, assignmentId },
          });
          if (ucost) pricePerHourCollaborator = ucost.costPerHour;
        }

        // price company: ClientPricePerAssignment for this client and assignment
        const clientId = workOrder.clientId!;
        let pricePerHourCompany = 0;
        if (assignmentId) {
          const cprice = await this.prisma.clientPricePerAssignment.findFirst({
            where: { clientId, assignmentId },
          });
          if (cprice) pricePerHourCompany = cprice.pricePerHour;
        }

        // regular hours (up to 8)
        const regularHours = Math.min(totalOrderHours, 8);
        const totalRegularCompany = regularHours * pricePerHourCompany;
        const totalRegularCollaborator = regularHours * pricePerHourCollaborator;

        // compute surcharge hours per surcharge rule (dynamic)
        const surchargeCreates = [];
        let assignmentExtraCompany = 0;
        let assignmentExtraCollaborator = 0;

        for (const sc of surcharges) {
          const applicable = this.hoursForSurcharge(totalOrderHours, sc.minHour, sc.maxHour ?? undefined);
          if (applicable <= 0) continue;

          // total for this surcharge: apply full multiplier (e.g. 1.5 * price) for the applicable hours
          const companyAmountForThis = applicable * pricePerHourCompany * sc.percentage;
          const collabAmountForThis = applicable * pricePerHourCollaborator * sc.percentage;

          // BUT careful: we already counted regular hours up to 8,
          // surcharge hours should be counted fully (not added to regular), so when summing totals we will:
          // total = (regularHours*price) + sum(applicable * price * percentage)
          assignmentExtraCompany += companyAmountForThis;
          assignmentExtraCollaborator += collabAmountForThis;

          surchargeCreates.push({
            surcharge: { connect: { id: sc.id } },
            hoursApplied: applicable,
            appliedMultiplier: sc.percentage,
          });
        }

        // total amounts for this assignment
        const totalAmountCompany = totalRegularCompany + assignmentExtraCompany;
        const totalAmountCollaborator = totalRegularCollaborator + assignmentExtraCollaborator;

        // accumulate into invoice totals
        invoiceTotalBaseCompany += totalRegularCompany;
        invoiceTotalBaseCollab += totalRegularCollaborator;
        invoiceTotalWithSurchargesCompany += totalAmountCompany;
        invoiceTotalWithSurchargesCollab += totalAmountCollaborator;

        // create InvoiceAssignment nested object
        invoiceAssignmentsCreates.push({
          assignmentId: assignmentId,
          assignmentName,
          roleName: assignment?.title ?? '',
          checkIn: startDate,
          checkOut: endDate,
          hoursWorked: totalOrderHours,
          pricePerHourCompany,
          pricePerHourCollaborator,
          totalAmountCompany,
          totalAmountCollaborator,
          totalRegularCompany,
          totalRegularCollaborator,
          surchargeDetails: { create: surchargeCreates },
        });
      } // end per-assignment loop

      // 6) create invoice
      const invoice = await this.prisma.invoice.create({
        data: {
          clientId: workOrder.clientId!,
          userId,
          workOrderId: workOrder.id,
          clientName: workOrder.clientCompany?.companyName ?? '',
          employerIdentificationNumber: workOrder.clientCompany?.employerIdentificationNumber ?? '',
          workOrderCodePo: workOrder.workOrderCodePo ?? '',
          collaboratorName: `${user.userDetail?.names ?? ''} ${user.userDetail?.lastNames ?? ''}`.trim(),
          collaboratorDocumentNumber: user.userDetail?.documentNumber ?? '',
          totalHoursWorked: totalOrderHours,
          totalBaseCompany: invoiceTotalBaseCompany,
          totalBaseCollab: invoiceTotalBaseCollab,
          totalWithSurchargesCompany: invoiceTotalWithSurchargesCompany,
          totalWithSurchargesCollab: invoiceTotalWithSurchargesCollab,
          invoiceAssignments: {
            create: invoiceAssignmentsCreates,
          },
        },
        include: {
          invoiceAssignments: {
            include: { surchargeDetails: { include: { surcharge: true } } },
          },
        },
      });

      createdInvoices.push(invoice);
    } // end orders loop

    return { message: 'Facturas generadas correctamente', invoices: createdInvoices };
  }

  // listar todas las facturas (con detalles)
  async getAllInvoices(params: InvoiceFilterDto) {
    const page = params.page ? Number(params.page) : undefined;
    const limit = params.limit ? Number(params.limit) : undefined;
    const skip = page && limit ? (page - 1) * limit : undefined;

    const filters: any = { isDeleted: false };

    if (params.collaboratorName) {
      filters.collaboratorName = { contains: params.collaboratorName, mode: 'insensitive' };
    }
    if (params.clientName) {
      filters.clientName = { contains: params.clientName, mode: 'insensitive' };
    }
    if (params.invoiceNumber) {
      filters.invoiceNumber = { contains: params.invoiceNumber, mode: 'insensitive' };
    }
    if (params.workOrderCodePo) {
      filters.workOrderCodePo = { contains: params.workOrderCodePo, mode: 'insensitive' };
    }

    const orderByField = params.sortBy ?? 'createdAt';
    const orderByDirection = params.sortOrder ?? 'desc';

    // 🔹 Si no hay paginación
    if (!page || !limit) {
      const data = await this.prisma.invoice.findMany({
        where: filters,
        orderBy: { [orderByField]: orderByDirection },
        include: {
          client: true,
          user: { include: { userDetail: true } },
          invoiceAssignments: {
            include: { surchargeDetails: { include: { surcharge: true } } },
          },
        },
      });
      return { data };
    }

    // 🔹 Con paginación
    const total = await this.prisma.invoice.count({ where: filters });

    const data = await this.prisma.invoice.findMany({
      where: filters,
      skip,
      take: limit,
      orderBy: { [orderByField]: orderByDirection },
      include: {
        client: true,
        user: { include: { userDetail: true } },
        invoiceAssignments: {
          include: { surchargeDetails: { include: { surcharge: true } } },
        },
      },
    });

    return {
      data,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  async updateInvoiceNumber(invoiceId: number, invoiceNumber: string) {
    // Validar que exista la factura
    const existingInvoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!existingInvoice) {
      throw new NotFoundException(`La factura con ID ${invoiceId} no existe`);
    }

    // Verificar si el número ya está siendo usado por otra factura
    const duplicate = await this.prisma.invoice.findFirst({
      where: {
        invoiceNumber,
        NOT: { id: invoiceId }, // evita conflicto consigo misma
      },
    });

    if (duplicate) {
      throw new BadRequestException(
        `El número de factura '${invoiceNumber}' ya está asignado a otra factura`
      );
    }

    // Actualizar el número de factura
    const updated = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { invoiceNumber },
    });

    return {
      message: 'Número de factura actualizado correctamente',
      invoice: updated,
    };
  }

  async softDeleteInvoice(id: number) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });

    if (!invoice) {
      throw new NotFoundException(`La factura con ID ${id} no existe`);
    }

    if (invoice.isDeleted) {
      throw new BadRequestException(`La factura con ID ${id} ya está eliminada`);
    }

    const deletedInvoice = await this.prisma.invoice.update({
      where: { id },
      data: { isDeleted: true },
    });

    return {
      message: 'Factura eliminada lógicamente (soft delete) con éxito',
      invoice: deletedInvoice,
    };
  }

  async hardDeleteInvoice(id: number) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        invoiceAssignments: {
          include: { surchargeDetails: true },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`La factura con ID ${id} no existe`);
    }

    // 🔹 Primero eliminar los recargos (InvoiceAssignmentSurcharge)
    for (const assignment of invoice.invoiceAssignments) {
      if (assignment.surchargeDetails.length > 0) {
        await this.prisma.invoiceAssignmentSurcharge.deleteMany({
          where: { invoiceAssignmentId: assignment.id },
        });
      }
    }

    // 🔹 Luego eliminar las asignaciones de factura (InvoiceAssignment)
    await this.prisma.invoiceAssignment.deleteMany({
      where: { invoiceId: id },
    });

    // 🔹 Finalmente eliminar la factura
    await this.prisma.invoice.delete({
      where: { id },
    });

    return { message: 'Factura y sus relaciones eliminadas definitivamente' };
  }
}