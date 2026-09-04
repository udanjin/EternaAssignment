# Architecture — StockFlow

## Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Backend runtime | Node.js + NestJS + TypeScript | Structured modules, DI, decorators — showcases architecture clearly |
| Frontend | React + Vite + TypeScript | SPA, fast dev server, simple setup |
| UI kit | shadcn/ui + Tailwind CSS | Modern, professional, accessible components |
| Database | PostgreSQL | Reliable relational DB; handles transactions natively |
| ORM | Prisma | Type-safe, auto-generated client, great migration story |
| Auth | JWT in httpOnly cookie | Protects against XSS; SameSite=Strict protects against CSRF |
| Testing | Jest + Supertest | Standard NestJS integration testing |
| API docs | @nestjs/swagger | Auto-generates OpenAPI from decorators |
| Repo structure | Two folders (`backend/` + `frontend/`) | Simple, clear separation |

---

## Folder Structure

```
stockflow/
├── backend/                   # NestJS app
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── src/
│   │   ├── main.ts            # Bootstrap, cookie-parser, swagger
│   │   ├── app.module.ts
│   │   ├── common/            # Filters, guards, decorators, pipes
│   │   │   ├── filters/       # Global exception filter
│   │   │   ├── guards/        # JwtAuthGuard
│   │   │   ├── decorators/    # @CurrentUser(), @Public()
│   │   │   └── pipes/         # ValidationPipe
│   │   ├── database/          # Data persistence layer
│   │   │   ├── database.module.ts
│   │   │   └── prisma.service.ts
│   │   ├── api/               # Transport layer (HTTP / Controllers / DTOs)
│   │   │   ├── api.module.ts
│   │   │   ├── auth/
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.strategy.ts
│   │   │   │   └── dto/
│   │   │   ├── products/
│   │   │   │   ├── products.controller.ts
│   │   │   │   └── dto/
│   │   │   └── invoices/
│   │   │       ├── invoices.controller.ts
│   │   │       └── dto/
│   │   └── services/          # Pure business logic & domain rules
│   │       ├── services.module.ts
│   │       ├── auth.service.ts        # Credential checks, password hashing, JWT
│   │       ├── products.service.ts    # Product business rules, SKU checks, soft-delete
│   │       ├── invoices.service.ts    # Invoice lifecycle, status state machine
│   │       ├── stock.service.ts       # Stock guard validation & atomic transitions
│   │       └── pricing.service.ts     # Safe integer money & tax calculations
│   ├── test/                  # e2e / integration tests (Jest + Supertest)
│   ├── .env.example
│   └── package.json
```
│
└── frontend/                  # React + Vite app
    ├── src/
    │   ├── main.tsx
    │   ├── App.tsx            # Router + AuthGuard layout
    │   ├── lib/
    │   │   └── api.ts         # Axios instance (withCredentials: true)
    │   ├── pages/
    │   │   ├── LoginPage.tsx
    │   │   ├── RegisterPage.tsx
    │   │   ├── ProductsPage.tsx
    │   │   ├── InvoicesPage.tsx
    │   │   ├── InvoiceCreatePage.tsx
    │   │   └── InvoiceDetailPage.tsx
    │   ├── components/
    │   │   ├── AuthLayout.tsx       # Redirect to /login if unauthenticated
    │   │   └── ui/                  # shadcn/ui components
    │   └── hooks/
    │       └── useAuth.ts
    ├── .env.example
    └── package.json
```

---

## Database Schema (Prisma)

```prisma
model User {
  id        String    @id @default(uuid())
  email     String    @unique
  password  String
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  products  Product[]
  invoices  Invoice[]
}

model Product {
  id             String        @id @default(uuid())
  userId         String
  user           User          @relation(fields: [userId], references: [id])
  sku            String
  name           String
  description    String?
  unitPrice      Int           // minor units (rupiah)
  quantityOnHand Int
  deletedAt      DateTime?     // null = active; soft-delete
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
  invoiceItems   InvoiceItem[]

  @@unique([userId, sku])
}

enum InvoiceStatus {
  DRAFT
  ISSUED
  PAID
  CANCELLED
}

model Invoice {
  id            String        @id @default(uuid())
  userId        String
  user          User          @relation(fields: [userId], references: [id])
  invoiceNumber String        @unique
  customerName  String
  issueDate     DateTime
  dueDate       DateTime?
  status        InvoiceStatus @default(DRAFT)
  notes         String?
  subtotal      Int           // minor units
  taxAmount     Int           // minor units
  total         Int           // minor units
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  items         InvoiceItem[]
}

model InvoiceItem {
  id          String   @id @default(uuid())
  invoiceId   String
  invoice     Invoice  @relation(fields: [invoiceId], references: [id])
  productId   String?  // nullable: product may be soft-deleted later
  product     Product? @relation(fields: [productId], references: [id])
  productName String   // snapshot
  unitPrice   Int      // snapshot, minor units
  quantity    Int
  lineTotal   Int      // computed
}
```

---

## API Design

### Auth

```
POST /auth/register    — body: { email, password }          -> 201 | 422
POST /auth/login       — body: { email, password }          -> 200 + Set-Cookie | 401
POST /auth/logout      — (authenticated)                    -> 200 + clears cookie
GET  /auth/me          — (authenticated)                    -> 200 { id, email }
```

### Products

```
GET    /products              ?page&limit&search            -> 200 { data[], meta }
POST   /products                                            -> 201 Product
GET    /products/:id                                        -> 200 Product | 404
PATCH  /products/:id                                        -> 200 Product | 404 | 422
DELETE /products/:id          (soft-delete)                 -> 204 | 404
```

### Invoices

```
GET    /invoices              ?page&limit&status            -> 200 { data[], meta }
POST   /invoices                                            -> 201 Invoice (DRAFT)
GET    /invoices/:id                                        -> 200 Invoice + items | 404
PATCH  /invoices/:id          (DRAFT only: update fields/items) -> 200 | 409
POST   /invoices/:id/issue    (DRAFT -> ISSUED)             -> 200 | 409 | 422
POST   /invoices/:id/pay      (ISSUED -> PAID)              -> 200 | 409
POST   /invoices/:id/cancel   (DRAFT|ISSUED -> CANCELLED)   -> 200 | 409
```

All endpoints return consistent shape:
```json
// success list
{ "data": [...], "meta": { "page": 1, "limit": 20, "total": 42 } }

// error
{ "statusCode": 422, "message": "Validation failed", "errors": { "sku": "SKU already exists" } }
```

---

## Auth Flow

```
Client                         Server
  |                              |
  |-- POST /auth/login --------> |
  |                              | verify email+password (bcrypt.compare)
  |                              | sign JWT { sub: userId, email }
  |<-- 200 + Set-Cookie: token=<jwt>; HttpOnly; SameSite=Strict
  |                              |
  |-- GET /products -----------> |
  |   Cookie: token=<jwt>        | JwtStrategy extracts cookie
  |                              | verify JWT, attach req.user
  |<-- 200 { data: [...] } ----- |
```

JWT payload: `{ sub: userId, email, iat, exp }`. Expiry: **7 days**. No refresh token (out of scope for 1-day build).

---

## Stock Transaction Logic

### Issue invoice (DRAFT -> ISSUED)

```
BEGIN TRANSACTION
  FOR each item in invoice.items:
    SELECT quantityOnHand FROM products WHERE id = item.productId FOR UPDATE
    IF quantityOnHand < item.quantity:
      ROLLBACK -> return 422 "Insufficient stock for: {productName}"
    UPDATE products SET quantityOnHand = quantityOnHand - item.quantity
  UPDATE invoices SET status = ISSUED
COMMIT
```

### Cancel invoice

```
BEGIN TRANSACTION
  IF invoice.status == ISSUED:
    FOR each item: UPDATE products SET quantityOnHand = quantityOnHand + item.quantity
  UPDATE invoices SET status = CANCELLED
COMMIT
```

Prisma `$transaction([...])` wraps both blocks.

---

## Invoice Number Generation

Auto-generated on creation:
1. Count existing invoices for this user in the current year.
2. Format: `INV-{YYYY}-{NNNN}` (zero-padded to 4 digits).
3. Done inside a transaction to avoid duplicates under concurrent inserts.

Example: `INV-2026-0001`, `INV-2026-0042`.

---

## Money Handling

All monetary values stored and computed as **integers (minor units = rupiah)**.

```typescript
// Creation: client sends unitPrice as integer (e.g. 50000 = Rp 50,000)
const lineTotal = unitPrice * quantity;          // integer
const subtotal  = items.reduce((s, i) => s + i.lineTotal, 0);  // integer
const taxAmount = Math.round(subtotal * taxRate);  // integer (round half-up)
const total     = subtotal + taxAmount;             // integer
```

No `parseFloat`, no `toFixed`, no division on stored values.

---

## Frontend Architecture

Single-page app with React Router v6.

```
/login               LoginPage       (public)
/register            RegisterPage    (public)
/products            ProductsPage    (protected)
/invoices            InvoicesPage    (protected)
/invoices/new        InvoiceCreatePage (protected)
/invoices/:id        InvoiceDetailPage (protected)
```

**AuthLayout:** wraps all protected routes. On mount, calls `GET /auth/me`; if 401, redirects to `/login`.

**API client:** single Axios instance at `src/lib/api.ts` with `baseURL` from env, `withCredentials: true` (sends cookies), and a response interceptor that redirects to `/login` on 401.

**State:** no global state library needed — React Query (TanStack Query) for server state (caching, loading, error), local `useState` for forms.

---

## Testing Strategy

Integration tests in `backend/test/` using Jest + Supertest against a real test database (separate `TEST_DATABASE_URL`).

| Test | Covers |
|------|--------|
| `POST /auth/login` with wrong password | A9: generic error, no info leak |
| `GET /products` without cookie | A6: returns 401 |
| `POST /invoices/:id/issue` when stock insufficient | V5: 422 with product name |
| `POST /invoices/:id/issue` when stock sufficient | V6: quantityOnHand decremented |
| `POST /invoices/:id/cancel` on ISSUED invoice | V7: quantityOnHand restored |

Each test spins up a fresh user + seed data in `beforeEach`, cleans up in `afterAll`.

---

## Environment Variables

```
# backend/.env.example
DATABASE_URL=postgresql://user:pass@localhost:5432/stockflow
TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/stockflow_test
JWT_SECRET=change-me-to-a-long-random-string
TAX_RATE=0.11
PORT=3000

# frontend/.env.example
VITE_API_URL=http://localhost:3000
```

---

## Key Design Decisions & Trade-offs

| Decision | Rationale |
|----------|-----------|
| httpOnly cookie for JWT | Eliminates XSS token theft. No refresh token (1-day scope). |
| Soft-delete products | Invoice snapshots remain intact; referential integrity preserved. |
| Integer minor units for money | Eliminates float rounding errors. Rupiah has no sub-units so display is trivial. |
| Prisma transactions for stock | Atomic: either all lines commit or none. Prevents overselling under concurrent requests. |
| Snapshot productName + unitPrice on InvoiceItem | Price changes never retroactively alter invoices (V4). |
| `FOR UPDATE` row lock on issue | Prevents race condition where two concurrent issue requests both pass the stock check. |
| No refresh tokens | Out of scope per spec. 7-day expiry is acceptable for 1-day build. |
| shadcn/ui + Tailwind | Fast to build functional UI without custom CSS; looks professional. |
