import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // 1. Create a demo user
  const password = await bcrypt.hash('password123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      password,
    },
  });
  console.log(`Created demo user: demo@example.com / password123`);

  // 2. Clear existing products/invoices for this user to ensure idempotency
  await prisma.invoiceItem.deleteMany({ where: { invoice: { userId: user.id } } });
  await prisma.invoice.deleteMany({ where: { userId: user.id } });
  await prisma.product.deleteMany({ where: { userId: user.id } });

  // 3. Create 10 Products
  const productsData = [
    { sku: 'LAP-001', name: 'ThinkPad T14', unitPrice: 15000000, quantityOnHand: 50 },
    { sku: 'LAP-002', name: 'MacBook Air M2', unitPrice: 18000000, quantityOnHand: 30 },
    { sku: 'MOU-001', name: 'Logitech MX Master 3', unitPrice: 1500000, quantityOnHand: 100 },
    { sku: 'MOU-002', name: 'Razer DeathAdder V3', unitPrice: 1200000, quantityOnHand: 45 },
    { sku: 'KEY-001', name: 'Keychron K2', unitPrice: 1100000, quantityOnHand: 20 },
    { sku: 'MON-001', name: 'Dell UltraSharp 27', unitPrice: 6500000, quantityOnHand: 15 },
    { sku: 'CAB-001', name: 'Anker USB-C to USB-C', unitPrice: 150000, quantityOnHand: 200 },
    { sku: 'CAB-002', name: 'HDMI 2.1 Cable 2m', unitPrice: 200000, quantityOnHand: 150 },
    { sku: 'HUB-001', name: 'Ugreen 7-in-1 USB-C Hub', unitPrice: 550000, quantityOnHand: 60 },
    { sku: 'SSD-001', name: 'Samsung 980 Pro 1TB', unitPrice: 2200000, quantityOnHand: 40 },
  ];

  const products = [];
  for (const p of productsData) {
    const product = await prisma.product.create({
      data: {
        userId: user.id,
        ...p,
      },
    });
    products.push(product);
  }
  console.log(`Created 10 products for demo user.`);

  // 4. Create an Invoice (DRAFT)
  const draftInvoice = await prisma.invoice.create({
    data: {
      userId: user.id,
      invoiceNumber: `INV-DEMO-${Date.now()}`,
      customerName: 'TechCorp Indonesia',
      issueDate: new Date(),
      status: 'DRAFT',
      subtotal: 16500000, // 1 ThinkPad + 1 MX Master
      taxAmount: 1815000, // 11%
      total: 18315000,
      items: {
        create: [
          {
            productId: products[0].id,
            productName: products[0].name,
            unitPrice: products[0].unitPrice,
            quantity: 1,
            lineTotal: products[0].unitPrice * 1,
          },
          {
            productId: products[2].id,
            productName: products[2].name,
            unitPrice: products[2].unitPrice,
            quantity: 1,
            lineTotal: products[2].unitPrice * 1,
          },
        ],
      },
    },
  });
  console.log(`Created draft invoice: ${draftInvoice.invoiceNumber}`);

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
