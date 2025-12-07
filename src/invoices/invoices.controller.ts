/* eslint-disable prettier/prettier */
import { Controller, Post, Body, Get, Query, Patch, Param, ParseIntPipe, Delete } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { InvoiceFilterDto } from './dto/invoice-filter.dto';

@Controller('invoices')
export class InvoicesController {
  constructor(private invoicesService: InvoicesService) { }
  @Post('create-for-user')
  createInvoices(@Body() dto: CreateInvoiceDto) {
    return this.invoicesService.createInvoicesForUser(dto.userId);
  }

  @Get()
  getAll(@Query() query: InvoiceFilterDto) {
    return this.invoicesService.getAllInvoices(query);
  }

  @Patch(':id/invoiceId')
  async updateInvoiceNumber(
    @Param('id', ParseIntPipe) id: number,
    @Body('invoiceNumber') invoiceNumber: string,
  ) {
    return this.invoicesService.updateInvoiceNumber(id, invoiceNumber);
  }

  @Patch('mark-downloaded')
  async markInvoicesAsDownloaded(@Body() body: { ids: number[] }) {
    return this.invoicesService.markInvoicesAsDownloaded(body.ids);
  }

  @Delete(':id/soft')
  async softDelete(@Param('id', ParseIntPipe) id: number) {
    return this.invoicesService.softDeleteInvoice(id);
  }

  @Delete(':id/hard')
  async hardDelete(@Param('id', ParseIntPipe) id: number) {
    return this.invoicesService.hardDeleteInvoice(id);
  }
}
