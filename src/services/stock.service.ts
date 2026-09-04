import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class StockService {
  constructor(private prisma: PrismaService) {}

  /**
   * Deduct stock for all items in an invoice atomically.
   */
  async deductStock(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    items: { productId: string | null; productName: string; quantity: number }[],
  ) {
    for (const item of items) {
      if (!item.productId) continue; // Soft-deleted product reference, skip stock management

      // Fetch product to check stock
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
