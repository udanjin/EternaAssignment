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
4. **Integration Tests:** 5 mandatory e2e test cases covering authentication logic, authorization, and the core atomic stock workflows.

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

---

## Tech Choices and Why
- **NestJS:** Chosen for its opinionated, modular architecture which speeds up development and maintains clean structure for scalable applications.
- **PostgreSQL & Prisma:** PostgreSQL offers strong ACID compliance which is critical for inventory and financial data. Prisma provides excellent type safety and an intuitive schema-driven ORM.
- **HTTP-Only Cookies (JWT):** Enhances security by mitigating XSS attacks compared to storing tokens in `localStorage`.
- **React & Vite:** Vite provides an incredibly fast feedback loop for development. React's component model is standard and well-understood.
- **Ant Design & Tailwind CSS:** Combining Ant Design's robust, enterprise-ready components with Tailwind's utility classes allowed for rapid development of a premium, "restrained" B2B UI without writing massive amounts of custom CSS.
- **Atomic Database Transactions:** Used Prisma's `$transaction` to ensure that stock deduction and invoice status updates either succeed together or fail together, preventing data inconsistencies.

## Trade-offs and Known Limitations
- **Currency Handling:** All prices are currently stored as integers to prevent floating-point precision issues, but we haven't implemented a fully robust multi-currency or decimal library (like `decimal.js`).
- **Pagination Strategy:** Uses simple offset-based pagination (`skip`/`take`). While sufficient for this scale, cursor-based pagination would perform better on massive datasets.
- **No Soft-Delete for Invoices:** Invoices are immutable and only have a state machine (Cancelled), but we don't have a soft-delete mechanism for them if an admin truly wants to hide them.
- **Basic Authorization:** There is only a single user role. We assume users can only see their own data, but a real B2B system would need Admin/Manager/Staff RBAC (Role-Based Access Control).

## What I would do with one more week
- **Implement RBAC:** Add distinct roles (Admin vs User) and allow multiple users to belong to the same Organization.
- **Comprehensive Reporting:** Build a dashboard page with charts showing monthly revenue, top-selling products, and low-stock alerts.
- **PDF Generation:** Add the ability to export an Invoice to a clean PDF and email it directly to the customer.
- **Audit Logs:** Add a dedicated audit log table to track exactly *who* issued or cancelled an invoice and *when*.
- **Unit Testing:** While e2e tests cover the core flows, I would add granular unit tests for the Pricing and Stock services.

## AI Usage
- Used **AI Assistant (Gemini)** via IDE integration to brainstorm the database schema and atomic transaction logic.
- Accelerated boilerplate generation for NestJS services and React components.
- Assisted with writing and debugging the 5 mandatory e2e integration tests.

## Time Spent
- Roughly **4-5 hours** focused on architecture, core business logic, and end-to-end testing, plus finalizing the frontend integration.
