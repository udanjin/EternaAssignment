# StockFlow

StockFlow is a complete B2B Inventory and Invoicing system, built for the Fullstack Take-Home Test.

## Tech Stack
- **Backend**: NestJS, PostgreSQL, Prisma, Passport (JWT in HTTP-only cookies).
- **Frontend**: React, Vite, TypeScript, Ant Design, Tailwind CSS.

## Features Included
1. **Authentication:** Secure cookie-based JWT authentication (`/auth/login`, `/auth/register`).
2. **Products Module:** Full CRUD with soft deletion (`deletedAt`), integer-based pricing to prevent float errors, and per-user filtering.
3. **Invoices & Stock Math:** 
   - State machine (`DRAFT` -> `ISSUED` -> `PAID/CANCELLED`).
   - Atomic Transactions: Issuing an invoice strictly checks and deducts `quantityOnHand`. Cancelling restores it.
   - Price Snapshotting: Invoices store the unit price at the time of creation so future product price changes don't affect historical records.
4. **Integration Tests:** 5 mandatory e2e test cases covering authentication logic, authorization, and the core atomic stock workflows (V5, V6, V7).

---

## Quick Start (Setup)

### 1. Backend Setup
\`\`\`bash
cd backend
npm install

# Setup your local .env (Make sure you have a running PostgreSQL instance)
cp .env.example .env

# Run migrations and apply the seed script
npx prisma migrate dev
npx prisma db seed

# Run the backend (Port 3000)
npm run start:dev
\`\`\`

The \`seed\` script will automatically generate a demo account:
- **Email:** `demo@example.com`
- **Password:** `password123`
- Pre-populates 10 products and 1 Draft Invoice.

### 2. Run E2E Tests
To verify the core business logic (Auth + Stock Math):
\`\`\`bash
cd backend
npm run test:e2e
\`\`\`

### 3. Frontend Setup
\`\`\`bash
cd frontend
npm install

# Run the frontend (Vite)
npm run dev
\`\`\`
The frontend uses Ant Design and Tailwind CSS to ensure a highly responsive, robust, and clean dashboard experience.
