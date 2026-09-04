# Design — StockFlow

## Overview

StockFlow is a minimal internal web app for a small distribution business. Staff log in and manage product inventory and customer invoices. The app enforces stock limits automatically — no more overselling.

**Core constraint:** 1 day of focused work. Ship less scope finished properly over more scope half-broken.

---

## System Design

### Two-app structure

```
backend/    NestJS API (port 3000)
frontend/   React + Vite SPA (port 5173)
```

No shared package / monorepo tooling needed. Frontend calls backend via REST. Cookie auth bridges the two.

### Component map

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (React + Vite)                                     │
│  ┌────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │ Auth pages │  │ Products     │  │ Invoices           │  │
│  │ /login     │  │ /products    │  │ /invoices          │  │
│  │ /register  │  │ CRUD + search│  │ /invoices/new      │  │
│  └────────────┘  └──────────────┘  │ /invoices/:id      │  │
│                                    └────────────────────┘  │
│  Axios (withCredentials: true) ─────────────────────────►  │
└──────────────────────────────────────────────────────────►──┘
                          │ httpOnly cookie (JWT)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  NestJS API (port 3000)                                     │
│  ┌────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │ AuthModule │  │ ProductsModule│  │ InvoicesModule     │  │
│  │ /auth/*    │  │ /products/*  │  │ /invoices/*        │  │
│  └────────────┘  └──────────────┘  └────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Common: JwtAuthGuard, ValidationPipe, ExceptionFilter │  │
│  └───────────────────────────────────────────────────────┘  │
│                          │ Prisma Client                     │
└──────────────────────────┼──────────────────────────────────┘
                           ▼
              ┌────────────────────────┐
              │ PostgreSQL             │
              │ users / products       │
              │ invoices / invoice_items│
              └────────────────────────┘
```

---

## Core Domain Logic

### Stock guard (V5 + V6)

The single most critical business rule. Enforced **only server-side** in a DB transaction.

```
Issue invoice flow:
1. Load invoice (must be DRAFT, must belong to user)
2. BEGIN TRANSACTION
3. For each line item:
   a. SELECT product FOR UPDATE (row lock)
   b. IF product.quantityOnHand < item.quantity -> ROLLBACK, 422
   c. UPDATE product SET quantityOnHand -= item.quantity
4. UPDATE invoice SET status = ISSUED
5. COMMIT
```

The `FOR UPDATE` lock prevents a race where two concurrent requests both read the same stock level and both pass the check.

### Status machine (V8)

```
         DRAFT
        /     \
   ISSUED    CANCELLED (terminal)
   /    \
 PAID   CANCELLED (terminal)
(terminal)
```

Implemented as a map in `InvoicesService`:

```typescript
const ALLOWED_TRANSITIONS = {
  DRAFT:   ['ISSUED', 'CANCELLED'],
  ISSUED:  ['PAID', 'CANCELLED'],
  PAID:    [],
  CANCELLED: [],
};
```

Any transition not in the allowed list returns `409 Conflict`.

### Money arithmetic (no floats)

All prices stored as integers (rupiah, no sub-units).

```typescript
// server-side only — client totals are ignored
const lineTotal = item.unitPrice * item.quantity;
const subtotal  = items.reduce((acc, i) => acc + i.lineTotal, 0);
const taxAmount = Math.round(subtotal * taxRate);   // round half-up
const total     = subtotal + taxAmount;
```

`Math.round` on an integer multiplication result is safe — no accumulated float error.

### Invoice number generation

```typescript
// inside a transaction
const count = await tx.invoice.count({ where: { userId, issueDate: { gte: startOfYear } } });
const invoiceNumber = `INV-${year}-${String(count + 1).padStart(4, '0')}`;
```

Done inside the same transaction as the `invoice.create` to avoid gaps or duplicates.

---

## Auth Design

**JWT in httpOnly cookie.**

- Cookie: `token=<jwt>; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800` (7 days)
- NestJS Passport strategy reads cookie, not `Authorization` header.
- `JwtAuthGuard` applied globally; public routes decorated with `@Public()`.
- Logout: server sets `Set-Cookie: token=; Max-Age=0` — cookie deleted on client.
- No refresh token: acceptable for 1-day scope. README documents the 7-day expiry decision.

**Password hashing:**
```typescript
const hash = await bcrypt.hash(password, 12);   // 12 rounds
const valid = await bcrypt.compare(password, hash);
```

**Auth error (A9):** always `{ statusCode: 401, message: "Invalid credentials." }` — never reveals which field was wrong.

---

## API Contract

### Error shape (N6)

Every error returns:
```json
{
  "statusCode": 422,
  "message": "Validation failed",
  "errors": {
    "sku": "SKU already exists for this account",
    "unitPrice": "Must be a non-negative integer"
  }
}
```

Implemented via a global `HttpExceptionFilter` + NestJS `ValidationPipe` with `exceptionFactory`.

### Pagination shape

```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3
  }
}
```

Query params: `?page=1&limit=20&search=widget&status=DRAFT`

---

## Module Breakdown (NestJS)

### API Layer (`src/api/`)
Handles HTTP transport, cookies, DTO validation, route guards, Swagger docs:
- `api/auth/auth.controller.ts`: endpoints (`/auth/register`, `/auth/login`, `/auth/logout`, `/auth/me`), sets/clears httpOnly cookie
- `api/auth/auth.strategy.ts`: Passport JWT strategy extracting cookie
- `api/products/products.controller.ts`: endpoints (`GET`, `POST`, `PATCH`, `DELETE /products`)
- `api/invoices/invoices.controller.ts`: endpoints (`GET`, `POST`, `PATCH`, `POST :id/issue`, `POST :id/pay`, `POST :id/cancel`)

### Services Layer (`src/services/`)
Pure business logic, domain rules, state machines, DB orchestration:
- `auth.service.ts`: bcrypt hashing/comparing, JWT signing, user credential validation (A4, A5, A9)
- `products.service.ts`: active product scoping (`deletedAt: null`), SKU uniqueness check, soft-delete execution (I1–I4)
- `invoices.service.ts`: invoice CRUD, invoice number counter generation (`INV-YYYY-NNNN`), status state machine validation (V1, V8, V9, V10)
- `stock.service.ts`: stock availability check, atomic decrement with row-level locking (`FOR UPDATE`), stock restoration on cancellation (V5, V6, V7)
- `pricing.service.ts`: strict integer currency math, subtotal calculation, tax rounding without floating point errors (V2, V3, V4)

### Common & Database (`src/common/` & `src/database/`)
- `GlobalExceptionFilter`: catches all exceptions, normalizes to `{ statusCode, message, errors? }`
- `ValidationPipe`: `whitelist: true, forbidNonWhitelisted: true, transform: true`
- `@CurrentUser()` decorator: extracts `req.user` from JWT payload
- `@Public()` decorator: marks routes that skip `JwtAuthGuard`
- `prisma.service.ts`: manages database connections and `$transaction` helper

---

## Frontend Page Design

### Auth pages (F1)
- Single centered card. Email + password fields. Submit button.
- On error: inline red message below field.
- `useAuth` hook: wraps login/register API calls, stores user in React context.

### Products page (F2)
- Top: search input (debounced 300ms) + "Add Product" button.
- Table: SKU | Name | Price | Stock | Actions (Edit / Delete).
- Pagination controls at bottom.
- Edit: opens a modal (shadcn Dialog) with pre-filled form.
- Delete: confirmation dialog, then soft-delete.

### Invoice create page (F3)
- Form: Customer Name, Issue Date, Due Date (optional), Notes.
- Line items section: "Add Item" button -> product select (searchable), quantity input.
- Live total preview: subtotal, tax (11%), total — computed client-side for display only (server recomputes on save).
- Submit: POST /invoices -> redirect to invoice detail.

### Invoice list page (F4 — list)
- Filter tabs: All | Draft | Issued | Paid | Cancelled.
- Table: Invoice # | Customer | Date | Total | Status | Actions.
- Pagination.

### Invoice detail page (F4 — detail)
- Header: invoice number, customer, dates, status badge.
- Line items table: product | qty | unit price | line total.
- Totals box: subtotal, tax, total.
- Action buttons (contextual by status):
  - DRAFT: "Issue Invoice" + "Cancel"
  - ISSUED: "Mark Paid" + "Cancel"
  - PAID/CANCELLED: no actions (readonly)

### Authenticated layout (F5)
- `AuthLayout` wraps all protected routes.
- On mount: `GET /auth/me`. If 401 -> redirect `/login`.
- Sidebar: Logo | Products | Invoices | Logout button.

### Loading + error states (F6)
- TanStack Query handles `isLoading`, `isError` per query.
- Loading: skeleton or spinner inside the component area (not full-page blank).
- Error: inline error message with retry option.

---

## Build Order (Core First)

Follow this order — each step is independently testable before moving on:

1. **Backend scaffold** — NestJS project, Prisma schema, DB connection, migration
2. **Auth** — register, login, logout endpoints + guard + tests
3. **Products** — CRUD + list/search + soft-delete
4. **Invoices** — create (DRAFT) + list + detail
5. **Stock logic** — issue (atomic decrement) + cancel (restore) + tests
6. **Frontend scaffold** — Vite + React Router + Axios + AuthLayout
7. **Auth pages** — login + register
8. **Products pages** — list + create + edit + delete
9. **Invoice pages** — create + list + detail + status actions
10. **Polish** — loading states, error states, seed script, README, Swagger
11. **(Bonus, if time permits)** — docker-compose, stock-movement ledger, etc.

---

## Scope Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| No refresh tokens | 7-day JWT only | Out of scope; 1-day build |
| Soft-delete products | `deletedAt` field | Invoice snapshot integrity |
| Tax rate in env | `TAX_RATE=0.11` | Spec requirement |
| Integer money | Rupiah integers | No sub-units; eliminates float bugs |
| No roles | Single user type | Out of scope per spec |
| `FOR UPDATE` row lock | On product rows during issue | Prevents concurrent oversell |
| `INV-YYYY-NNNN` format | Per-user, per-year counter | Readable, unique, easy to implement |
