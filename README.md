# TotalStock

A full-stack inventory and distributor billing system: shops, stock, GST sales bills, purchase
orders, analytics, team management and print-ready invoices.

The backend is a Django REST Framework API with JWT authentication. The frontend is a React + Vite
single-page app styled with Tailwind CSS.

## Highlights

- **Roles** — Super Admin, Owner, Marketing and a read-only API role.
- **Billing** — multi-line GST bills with CGST/SGST split, round-off, amount in words and a
  persisted customer/tax snapshot. Saving a bill deducts stock in one database transaction.
- **Purchases** — supplier orders that add stock when received, with part-payment tracking.
- **Audit trail** — every stock change (opening, sale, bill edit/delete, purchase, manual
  adjustment) is written to an append-only movement ledger.
- **Analytics** — revenue, tax, top items, low stock and monthly trends on the dashboard.
- **Shops & users** — customer accounts with GSTIN/FSSAI/state code; Super Admin user management.
- **Business profile** — company identity, tax registrations and bank details printed on invoices.
- **Printing** — A4 invoices per bill, per shop, or a consolidated print run, via the browser.
- **Exports** — real CSV exports (UTF-8 with BOM) for bills, stock, shops, purchases, movements and
  users, scoped by role.
- **Robustness** — `Decimal` money, sequence-backed invoice numbers (`INV-0001`, `PO-0001`),
  server-side pagination/search/filtering, short-lived access tokens with refresh, password change.

## Stack

| Layer     | Technology                                                                 |
| --------- | -------------------------------------------------------------------------- |
| Backend   | Django 5.2, Django REST Framework, SimpleJWT, django-cors-headers          |
| Database  | SQLite for local development; PostgreSQL in Docker Compose                 |
| Frontend  | React 19, Vite 7, TypeScript, Tailwind CSS v4, React Router 7              |
| Libraries | axios, react-hook-form, zod, recharts, lucide-react                        |
| Deployment| Docker Compose, Gunicorn, Caddy, PostgreSQL, Let's Encrypt                 |

## Local development

### 1. Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env          # optional; sensible defaults are built in
python manage.py migrate
python manage.py seed_demo
python manage.py runserver 127.0.0.1:8010
```

The API is served at `http://127.0.0.1:8010/api/` with a health check at
`http://127.0.0.1:8010/health/`.

> Port **8010** is used to avoid clashing with an existing local project on port 8000. Change it in
> the run command (and in `frontend/.env`) if you prefer another port.

### 2. Frontend

```powershell
cd frontend
npm install
copy .env.example .env          # VITE_API_URL=http://127.0.0.1:8010/api
npm run dev
```

Open `http://127.0.0.1:5173`.

For a production build:

```powershell
npm run build                   # type-check + bundle to dist/
npm run preview
```

## Demo accounts

Every seeded account uses the password **`password123`**.

| Email                    | Role       | What they can do                                              |
| ------------------------ | ---------- | ------------------------------------------------------------- |
| `superadmin@example.com` | Super Admin | Everything, including user management                        |
| `owner@example.com`      | Owner      | Dashboard, shops, stock, purchases, bills, settings           |
| `marketing@example.com`  | Marketing  | Create and manage their own bills; read-only shop/stock lists |
| `marketing1..5@example.com` | Marketing | Additional demo sales accounts                             |
| `api@example.com`        | API        | Read-only reporting access across all bills                   |

The seed creates 6 shops, 12 stock items, 34 bills, 3 purchase orders and a business profile.
`seed_demo` is idempotent: it only creates demo business data when no shops exist. Use
`python manage.py seed_demo --no-demo` to create users/profile only.

## Roles and permissions

| Area                        | Super Admin | Owner | Marketing       | API        |
| --------------------------- | ----------- | ----- | --------------- | ---------- |
| Dashboard / analytics       | ✓           | ✓     | —               | —          |
| Shops, stock, purchases     | Manage      | Manage| Read (for bills) | Read-only |
| Bills                       | All         | All   | Own only        | All (read) |
| Users                       | Manage      | —     | —               | —          |
| Business profile            | Edit        | Edit  | Read (for print)| Read       |
| Settings / exports          | ✓           | ✓     | Own bills CSV   | —          |

Backend permissions are authoritative; frontend route guards and navigation are a convenience.

## API overview

All endpoints are under `/api/` and require
`Authorization: Bearer <access_token>` unless noted. Successful responses include
`{"success": true, ...}`; errors return `{"success": false, "message": "...", "errors": {...}}`.

| Method            | Endpoint                        | Purpose                                  |
| ----------------- | ------------------------------- | ---------------------------------------- |
| POST              | `/auth/login/`                  | Email + password → access & refresh JWT  |
| POST              | `/auth/refresh/`                | Exchange a refresh token for a new access token |
| GET               | `/auth/me/`                     | Current user                             |
| POST              | `/auth/change-password/`        | Change own password                      |
| GET/POST          | `/shops/`                       | List/create shops                        |
| GET/PUT/DELETE    | `/shops/{id}/`                  | Shop detail                              |
| GET/POST          | `/stocks/`                      | List/create stock                        |
| GET/PUT/DELETE    | `/stocks/{id}/`                 | Stock detail                             |
| GET               | `/stocks/{id}/movements/`       | Recent movements for one item            |
| GET               | `/movements/`                   | Workspace-wide movement ledger           |
| GET/POST          | `/bills/`                       | List/create bills                        |
| GET               | `/bills/grouped/`               | Bills grouped by date                    |
| GET               | `/bills/shop/{shop_id}/`        | Bills for a shop                         |
| GET/PUT/DELETE    | `/bills/{id}/`                  | Bill detail                              |
| GET/POST          | `/purchases/`                   | List/create purchase orders              |
| GET/PUT/DELETE    | `/purchases/{id}/`              | Purchase detail                          |
| PATCH             | `/purchases/{id}/status/`       | Update status / payment                  |
| GET               | `/dashboard/stats/?month=YYYY-MM` | Dashboard aggregates                   |
| GET/PUT           | `/business-profile/`            | Company profile                          |
| GET/POST          | `/users/`                       | List/create users (Super Admin)          |
| GET/PUT/DELETE    | `/users/{id}/`                  | User detail (Super Admin)                |
| POST              | `/users/{id}/toggle-status/`    | Activate/deactivate (Super Admin)        |

List endpoints accept `page`, `page_size` (max 100), and endpoint-specific `search`, `ordering`,
`filter` and `date` parameters.

### Example

```bash
curl -X POST http://127.0.0.1:8010/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@example.com","password":"password123"}'
```

## Business rules

- Bill totals are computed from line items: `amount = price × quantity`,
  `tax = amount × GST rate`, with CGST and SGST as equal halves.
- The grand total is rounded to the nearest rupee; the difference is stored as `round_off` so the
  invoice reconciles exactly.
- Line items snapshot the item name, HSN, MRP, GST rate, taxable value and tax at sale time. Later
  stock edits do not rewrite history.
- Invoice and purchase numbers come from a locked `DocumentSequence`; gaps are never reused.
- Creating a bill deducts stock; editing restores old quantities before applying new ones; deleting
  restores stock. All changes are transactional and recorded in the ledger.
- A purchase order adds stock when it is marked received. Deleting or reversing a purchase is
  blocked if any of that stock has already been sold.
- Only Super Admins can manage users. Owners can manage all business data. Marketing accounts can
  only see and edit their own bills.

## Project layout

```
backend/
  accounts/        custom email-based User, JWT auth, roles, user admin
  config/          settings, URL routing, pagination/date helpers, error envelope
  inventory/       shops, stock, bills, purchases, dashboard, profile, movements
  manage.py
frontend/
  src/components/  layout, UI primitives, bill/purchase forms, invoice renderers
  src/pages/       route pages, including /print/bill/:id, /print/shop/:shopId, /print/all
  src/services/    typed axios clients per resource
  src/contexts/    auth, theme and toast providers
  src/types/       shared API types
```

## Operational notes

- Database: SQLite lives at `backend/db.sqlite3`. To use PostgreSQL set `DATABASE_URL` in
  `backend/.env` and run `python manage.py migrate`.
- Tokens: access tokens expire after 60 minutes by default; refresh tokens after 7 days. The
  frontend refreshes automatically and signs the user out on failure.
- Printing: use the browser print dialog. Print styles hide the app chrome and render A4 pages with
  page-break controls.
- Reset demo data: stop the server, delete `backend/db.sqlite3`, then run `migrate` and
  `seed_demo` again.
#   t o t a l - f e  
 