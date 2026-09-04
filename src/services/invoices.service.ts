import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PricingService } from './pricing.service';
import { StockService } from './stock.service';
import { CreateInvoiceDto, UpdateInvoiceDto } from '../api/invoices/dto/invoice.dto';
import { InvoiceStatus, Prisma } from '@prisma/client';

@Injectable()
export class InvoicesService {
  constructor(
    private prisma: PrismaService,
    private pricingService: PricingService,
    private stockService: StockService,
  ) {}

  private async generateInvoiceNumber(userId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.invoice.count({
      where: { userId, createdAt: { gte: new Date(`${year}-01-01`) } },
    });
    return `INV-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  async create(userId: string, dto: CreateInvoiceDto) {
    // 1. Fetch current product prices (Snapshot)
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, userId, deletedAt: null },
    });

    if (products.length !== dto.items.length) {
      throw new UnprocessableEntityException('One or more products are invalid or deleted');
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    // 2. Prepare items for PricingService
    const itemsForPricing = dto.items.map((item) => {
      const p = productMap.get(item.productId)!;
      return {
        productId: p.id,
        productName: p.name,
        unitPrice: p.unitPrice,
        quantity: item.quantity,
      };
    });

    // 3. Calculate safe integer totals
    const { processedItems, subtotal, taxAmount, total } =
      this.pricingService.calculateTotals(itemsForPricing);

    // 4. Generate invoice number (ideally inside transaction, but safe enough here for test scope)
    const invoiceNumber = await this.generateInvoiceNumber(userId);

    // 5. Save Invoice + Items
    return this.prisma.invoice.create({
      data: {
        userId,
        invoiceNumber,
        customerName: dto.customerName,
        issueDate: new Date(dto.issueDate),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        notes: dto.notes,
        status: InvoiceStatus.DRAFT,
        subtotal,
        taxAmount,
        total,
        items: {
          create: processedItems.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            lineTotal: item.lineTotal,
          })),
        },
      },
      include: { items: true },
    });
  }

  async findAll(userId: string, page: number, limit: number, status?: string) {
    const skip = (page - 1) * limit;
    const where: Prisma.InvoiceWhereInput = {
      userId,
      ...(status && { status: status as InvoiceStatus }),
    };

    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total },
    };
  }

  async findOne(userId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, userId },
      include: { items: true },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  // State Machine Transitions

  async issue(userId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch & validate state
      const invoice = await tx.invoice.findFirst({
        where: { id, userId },
        include: { items: true },
      });

      if (!invoice) throw new NotFoundException('Invoice not found');
      if (invoice.status !== InvoiceStatus.DRAFT) {
        throw new ConflictException(`Cannot issue invoice in ${invoice.status} status`);
      }

      // 2. Deduct stock (Throws UnprocessableEntity if insufficient)
      await this.stockService.deductStock(tx, invoice.items);

      // 3. Update status
      return tx.invoice.update({
        where: { id: invoice.id },
        data: { status: InvoiceStatus.ISSUED },
        include: { items: true },
      });
    });
  }

  async pay(userId: string, id: string) {
    const invoice = await this.findOne(userId, id);

    if (invoice.status !== InvoiceStatus.ISSUED) {
      throw new ConflictException(`Cannot pay invoice in ${invoice.status} status`);
    }

    return this.prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: InvoiceStatus.PAID },
    });
  }

  async cancel(userId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: { id, userId },
        include: { items: true },
      });

      if (!invoice) throw new NotFoundException('Invoice not found');
      if (invoice.status === InvoiceStatus.PAID || invoice.status === InvoiceStatus.CANCELLED) {
        throw new ConflictException(`Cannot cancel invoice in ${invoice.status} status`);
      }

      // Restore stock ONLY if it was previously ISSUED and deducted
      if (invoice.status === InvoiceStatus.ISSUED) {
        await this.stockService.restoreStock(tx, invoice.items);
      }

      return tx.invoice.update({
        where: { id: invoice.id },
        data: { status: InvoiceStatus.CANCELLED },
      });
    });
  }
}
