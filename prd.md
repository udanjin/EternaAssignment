# PRD — StockFlow (Minimal Inventory & Invoicing System)

## Problem

A small distribution business tracks stock and invoices in spreadsheets. Staff oversell stock that does not exist. They need a simple internal web app to manage products and raise invoices with automatic stock control.

## Users

Single user type: **Staff member** (authenticated). Each user owns their own data workspace — no shared data across accounts.

## Goals

1. Run from a clean clone with documented steps.
2. Auth done the professional way (hashed passwords, httpOnly JWT, no info leakage).
3. Business rules correct: stock guards, atomic transitions, price snapshots, money without floats.
4. Code a teammate can read and extend on Monday.

---

## Functional Requirements

### Auth (A1–A9)

| ID | Requirement |
|----|-------------|
| A1 | Register with email + password. Email unique, format-validated server-side. |
| A2 | Login returns JWT stored in httpOnly cookie. |
| A3 | Logout clears the cookie (server sets `Set-Cookie: token=; Max-Age=0`). |
| A4 | Passwords hashed with **bcrypt** (>=12 rounds). Plaintext = auto-fail. |
| A5 | Minimum password: **8 characters**, enforced server-side. |
| A6 | Every inventory and invoice endpoint requires auth. Returns `401` when unauthenticated. |
| A7 | All queries scoped to `userId`. Users cannot access each other's data. |
| A8 | Secrets (JWT_SECRET, DATABASE_URL, TAX_RATE) in `.env`. `.env.example` committed; real `.env` gitignored. |
| A9 | Auth errors return generic message: "Invalid credentials." No "user not found" vs "wrong password" distinction. |

### Inventory / Products (I1–I4)

| ID | Requirement |
|----|-------------|
| I1 | CRUD: create, read (single), update, soft-delete a product. |
| I2 | List products: paginated (default page=1, limit=20), searchable by `name` or `sku` (case-insensitive). |
| I3 | Server-side validation: `sku` unique per user, `unitPrice >= 0`, `quantityOnHand >= 0`, required fields present. Returns `422` with field-level messages. |
| I4 | Soft-delete: sets `deletedAt` timestamp. Product stays in DB so invoice snapshots remain valid. Soft-deleted products excluded from list/search by default. |

**Product schema:**
```
Product
  id             uuid
  userId         uuid (FK)
  sku            string, unique per user
  name           string
  description    string?
  unitPrice      integer (minor units, e.g. cents/rupiah)
  quantityOnHand integer >= 0
  deletedAt      timestamp? (null = active)
  createdAt / updatedAt
```

> **Money rule:** `unitPrice` stored as integer minor units (rupiah). All arithmetic in integer. Display layer shows raw integer value.

### Invoices (V1–V10)

| ID | Requirement |
|----|-------------|
| V1 | Create invoice with 1+ line items referencing existing (non-deleted) products. Status starts as `DRAFT`. |
| V2 | Server computes `lineTotal = unitPrice x quantity`, `subtotal = sum(lineTotal)`, `taxAmount = subtotal x TAX_RATE`, `total = subtotal + taxAmount`. Client totals ignored. |
| V3 | Tax rate from env var `TAX_RATE`, default **0.11** (11%). |
| V4 | `unitPrice` and `productName` snapshotted onto `InvoiceItem` at creation. Later product edits do not touch existing invoices. |
| V5 | Stock guard: each line's `quantity` must not exceed product's current `quantityOnHand`. Reject with `422` naming the offending product. |
| V6 | `DRAFT -> ISSUED`: decrement `quantityOnHand` for all lines atomically in a DB transaction. All succeed or none. |
| V7 | `ISSUED -> CANCELLED`: restore `quantityOnHand` for all lines atomically. `DRAFT -> CANCELLED`: no stock change. |
| V8 | Allowed transitions only: `DRAFT->ISSUED`, `DRAFT->CANCELLED`, `ISSUED->PAID`, `ISSUED->CANCELLED`. `PAID` and `CANCELLED` are terminal. Any other = `409`. |
| V9 | Line items editable only on `DRAFT` invoices. |
| V10 | List invoices: paginated + filterable by status. Single invoice view includes all line items + totals. |

**Invoice schema:**
```
Invoice
  id             uuid
  userId         uuid (FK)
  invoiceNumber  string, unique (INV-YYYY-NNNN, auto-generated)
  customerName   string
  issueDate      date
  dueDate        date?
  status         DRAFT | ISSUED | PAID | CANCELLED
  notes          string?
  subtotal       integer (minor units)
  taxAmount      integer (minor units)
  total          integer (minor units)
  createdAt / updatedAt

InvoiceItem
  id             uuid
  invoiceId      uuid (FK)
  productId      uuid (FK, nullable)
  productName    string (snapshot)
  unitPrice      integer (snapshot, minor units)
  quantity       integer > 0
  lineTotal      integer (computed)
```

### Frontend (F1–F6)

| ID | Screen |
|----|--------|
| F1 | Register page + Login page. Server error messages displayed inline. |
| F2 | Products list: search bar, pagination, create button, edit/delete per row. |
| F3 | Invoice creation form: customer name, date fields, add product lines with quantity, live total preview. |
| F4 | Invoice list (filter by status) + invoice detail page with status action buttons (Issue / Mark Paid / Cancel). |
| F5 | Authenticated layout: unauthenticated visitor redirected to `/login`. |
| F6 | Loading spinners and error states on every async operation. |

---

## Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| N1 | README: prerequisites, env vars, migration + seed steps, run commands for both apps. |
| N2 | `.env.example` with all vars and safe placeholders. |
| N3 | Seed script: 1 demo user + >=5 products. Credentials in README. |
| N4 | >=5 automated tests covering: wrong-password rejected, unauth 401, over-stock rejected, issue decrements stock, cancel restores stock. |
| N5 | API docs: Swagger via `@nestjs/swagger` exposed at `/api/docs`. |
| N6 | Consistent error shape: `{ statusCode, message, errors? }`. |
| N7 | Git history: incremental commits, readable messages. |

---

## Out of Scope

Payment gateways, multi-currency, purchase orders, email, password reset, OAuth, real-time updates, multi-tenancy beyond per-user, elaborate design system.

---

## Success Criteria

- `git clone` -> follow README -> app runs with no undocumented steps.
- All 12 submission checklist items pass.
- 5 automated tests pass with single command.
- No plaintext passwords. No float arithmetic on money. No auth info leakage.
