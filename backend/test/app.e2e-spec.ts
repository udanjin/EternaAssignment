import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import * as cookieParser from 'cookie-parser';

describe('StockFlow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let testUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    
    const reflector = app.get(Reflector);
    app.useGlobalGuards(new JwtAuthGuard(reflector));

    await app.init();

    prisma = app.get(PrismaService);
    
    // Clean DB before all tests
    await prisma.invoiceItem.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('1 & 2. Auth & Protected Routes', () => {
    it('should register a test user', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'test@example.com', password: 'password123' })
        .expect(201);
      
      const cookie = res.headers['set-cookie'][0];
      authToken = cookie.split(';')[0]; // Extract token=...

      const user = await prisma.user.findUnique({ where: { email: 'test@example.com' } });
      testUserId = user!.id;
    });

    it('A9: POST /auth/login with wrong password should not leak info (401)', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'wrongpassword' })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toBe('Invalid credentials'); // Generic error
        });
    });

    it('A6: GET /products without cookie should fail (401)', () => {
      return request(app.getHttpServer())
        .get('/products')
        .expect(401); // No cookie attached
    });
  });

  describe('3, 4 & 5. Invoice Stock Rules', () => {
    let productId: string;
    let invoiceId: string;

    beforeEach(async () => {
      // Clean DB before each test in this suite to guarantee isolation
      await prisma.invoiceItem.deleteMany();
      await prisma.invoice.deleteMany();
      await prisma.product.deleteMany();

      // Seed 1 product with 10 stock
      const product = await prisma.product.create({
        data: {
          userId: testUserId,
          sku: 'TEST-SKU',
          name: 'Test Product',
          unitPrice: 10000,
          quantityOnHand: 10,
        },
      });
      productId = product.id;
    });

    it('V5: POST /invoices/:id/issue when stock insufficient -> 422', async () => {
      // 1. Create Draft Invoice requesting 15 quantity (we only have 10)
      const res = await request(app.getHttpServer())
        .post('/invoices')
        .set('Cookie', authToken)
        .send({
          customerName: 'Alice',
          issueDate: new Date().toISOString(),
          items: [{ productId, quantity: 15 }],
        })
        .expect(201);
      
      const id = res.body.id;

      // 2. Try to issue -> Should fail with 422 and mention product name
      await request(app.getHttpServer())
        .post(`/invoices/${id}/issue`)
        .set('Cookie', authToken)
        .expect(422)
        .expect((res) => {
          expect(res.body.message).toContain('Insufficient stock for: Test Product');
        });

      // 3. Verify stock was NOT deducted
      const p = await prisma.product.findUnique({ where: { id: productId } });
      expect(p!.quantityOnHand).toBe(10);
    });

    it('V6: POST /invoices/:id/issue when stock sufficient -> quantityOnHand decremented', async () => {
      // 1. Create Draft Invoice requesting 3 quantity (we have 10)
      const res = await request(app.getHttpServer())
        .post('/invoices')
        .set('Cookie', authToken)
        .send({
          customerName: 'Bob',
          issueDate: new Date().toISOString(),
          items: [{ productId, quantity: 3 }],
        })
        .expect(201);
      
      const id = res.body.id;

      // 2. Issue -> Should succeed (200)
      await request(app.getHttpServer())
        .post(`/invoices/${id}/issue`)
        .set('Cookie', authToken)
        .expect(200);

      // 3. Verify stock WAS deducted (10 - 3 = 7)
      const p = await prisma.product.findUnique({ where: { id: productId } });
      expect(p!.quantityOnHand).toBe(7);
    });

    it('V7: POST /invoices/:id/cancel on ISSUED invoice -> quantityOnHand restored', async () => {
      // 1. Create & Issue Invoice for 4 quantity
      const res = await request(app.getHttpServer())
        .post('/invoices')
        .set('Cookie', authToken)
        .send({
          customerName: 'Charlie',
          issueDate: new Date().toISOString(),
          items: [{ productId, quantity: 4 }],
        })
        .expect(201);
      
      const id = res.body.id;

      await request(app.getHttpServer())
        .post(`/invoices/${id}/issue`)
        .set('Cookie', authToken)
        .expect(200);

      // Verify stock is now 6 (10 - 4)
      const p1 = await prisma.product.findUnique({ where: { id: productId } });
      expect(p1!.quantityOnHand).toBe(6);

      // 2. Cancel the ISSUED invoice -> Should succeed (200)
      await request(app.getHttpServer())
        .post(`/invoices/${id}/cancel`)
        .set('Cookie', authToken)
        .expect(200);

      // 3. Verify stock is restored to 10
      const p2 = await prisma.product.findUnique({ where: { id: productId } });
      expect(p2!.quantityOnHand).toBe(10);
    });
  });
});
