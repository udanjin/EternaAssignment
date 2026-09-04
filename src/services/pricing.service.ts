import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PricingService {
  private taxRate: number;

  constructor(private configService: ConfigService) {
    // Default to 11% (0.11) as requested by the spec
    this.taxRate = parseFloat(this.configService.get<string>('TAX_RATE', '0.11'));
  }

  /**
   * Calculate invoice totals purely using integer math (minor units)
   * to avoid floating point precision issues.
   */
  calculateTotals(items: { unitPrice: number; quantity: number }[]) {
    // lineTotal is unitPrice * quantity
    const processedItems = items.map(item => ({
      ...item,
      lineTotal: item.unitPrice * item.quantity,
    }));

    // subtotal is the sum of all line totals
    const subtotal = processedItems.reduce((sum, item) => sum + item.lineTotal, 0);

    // taxAmount is subtotal * taxRate, rounded to nearest integer
    const taxAmount = Math.round(subtotal * this.taxRate);

    // total is subtotal + taxAmount
    const total = subtotal + taxAmount;

    return {
      processedItems,
      subtotal,
      taxAmount,
      total,
    };
  }
}
