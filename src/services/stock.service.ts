import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class StockService {
  constructor(private prisma: PrismaService) {}

  /**
   * Deduct stock for all items in an invoice atomically.
   * If any product does not have enough stock, the entire transaction is rolled back.
   * We require the Prisma Client Transaction instance to be passed in,
   * so this runs in the SAME transaction as the invoice status update.
   */
  async deductStock(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    items: { productId: string | null; productName: string; quantity: number }[],
  ) {
    for (const item of items) {
      if (!item.productId) continue; // Soft-deleted product reference, skip stock management

      // Fetch the current product to check stock.
      // In a real high-concurrency Postgres system, we would use raw SQL `SELECT ... FOR UPDATE` here
      // to lock the row. Prisma doesn't have a native `findUniqueOrThrow({ lock: true })` yet,
      // but wrapping it in an interactive transaction with serializable isolation works around it.
      const product = await tx.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        throw new UnprocessableEntityException(`Product ${item.productName} not found`);
      }

      if (product.quantityOnHand < item.quantity) {
        throw new UnprocessableEntityException(
          `Insufficient stock for: ${item.productName} (Requested: ${item.quantity}, Available: ${product.quantityOnHand})`,
        );
      }

      // Deduct stock
      await tx.product.update({
        where: { id: item.productId },
        data: {
          quantityOnHand: {
            decrement: item.quantity,
          },
        },
      });
    }
  }

  /**
   * Restore stock for all items in an invoice atomically.
   * Used when an ISSUED invoice is CANCELLED.
   */
  async restoreStock(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    items: { productId: string | null; quantity: number }[],
  ) {
    for (const item of items) {
      if (!item.productId) continue;

      await tx.product.update({
        where: { id: item.productId },
        data: {
          quantityOnHand: {
            increment: item.quantity,
          },
        },
      });
    }
  }
}
