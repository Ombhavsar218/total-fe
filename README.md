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

| Layer      | Technology                                                                  |
| ---------- | --------------------------------------------------------------------------- |
| Backend    | Django 5.2, Django REST Framework, SimpleJWT, django-cors-headers           |
| Database   | SQLite for local development; PostgreSQL in Docker Compose or Render        |
| Frontend   | React 19, Vite 7, TypeScript, Tailwind CSS v4, React Router 7               |
| Libraries  | axios, react-hook-form, zod, recharts, lucide-react                         |
| Deployment | Docker Compose, Render Blueprint, Gunicorn, Caddy, PostgreSQL, Let's Encrypt |

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

## Docker Compose deployment

The repository includes a production-oriented Docker Compose stack:

| Service   | Purpose                                                                 |
| --------- | ----------------------------------------------------------------------- |
| `web`     | Caddy: serves the React build, terminates HTTPS, proxies `/api`, `/admin`, `/static` and `/health` to Django |
| `backend` | Gunicorn + Django; applies migrations and collects static files on start |
| `db`      | PostgreSQL with a persistent named volume                               |
| `backup`  | Daily `pg_dump` files in `./backups` with retention                      |

The frontend is built with `VITE_API_URL=/api`, so the API is same-origin in production. Caddy obtains
and renews a Let's Encrypt certificate automatically once the hostname resolves to the server.

### 1. Configure

```bash
cp .env.example .env
```

Edit `.env`:

- `DOMAIN` — your public hostname, e.g. `totalstock.duckdns.org`.
- `ACME_EMAIL` — an email address for Let's Encrypt expiry notices.
- `DJANGO_ALLOWED_HOSTS` — normally the domain plus `localhost,127.0.0.1`.
- `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` — `https://<your-domain>`.
- `HSTS_HEADER` — leave `max-age=0` for local HTTP testing. After HTTPS works, enable HSTS, e.g.
  `max-age=31536000; includeSubDomains`.
- `DJANGO_SECRET_KEY` — generate with `openssl rand -hex 32`.
- `POSTGRES_PASSWORD` — generate with `openssl rand -hex 24`. Keep it URL-safe
  (letters, numbers, hyphen) because it is embedded in `DATABASE_URL`.

Never commit `.env`.

### 2. Start the stack

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f backend web
```

Open `https://<your-domain>`.

Create a Django admin account:

```bash
docker compose exec backend python manage.py createsuperuser
```

Optionally load demo data on a fresh, non-production database:

```bash
docker compose exec backend python manage.py seed_demo
```

### 3. Free hostname with DuckDNS

1. Sign in at [duckdns.org](https://www.duckdns.org/), create a subdomain and copy its token.
2. Point the subdomain at the server's public IPv4 address using the DuckDNS dashboard or the
   update URL (`https://www.duckdns.org/update?domains=<name>&token=<token>&ip=`).
3. Ensure inbound TCP ports **80** and **443** are open.
4. Set `DOMAIN` in `.env`, then recreate Caddy:

   ```bash
   docker compose up -d --force-recreate web
   ```

Caddy requests the certificate automatically. A real domain can replace the DuckDNS name later by
updating DNS and the three host/origin values in `.env`; no application code changes are needed.

### 4. Oracle Cloud Always Free

1. Create an **Ubuntu 24.04 ARM** VM (`VM.Standard.A1.Flex`, up to 2 OCPU / 12 GB while Always Free
   capacity is available).
2. Reserve a public IPv4 address and attach it to the VM.
3. In the VCN security list or NSG, allow ingress TCP 80 and 443 from `0.0.0.0/0`; allow SSH only
   from your own IP.
4. SSH in, install Docker Engine and the Compose plugin using Docker's official Ubuntu instructions,
   then copy or clone this repository.
5. Create `.env`, start the stack, and point DuckDNS at the public IP.
6. If `ufw` is enabled, run `sudo ufw allow 80/tcp` and `sudo ufw allow 443/tcp`.

Capacity for free ARM instances is not guaranteed in every region or availability domain. Retry
later or try another availability domain if provisioning fails.

### 5. Operations

```bash
# Update and rebuild (migrations run automatically)
git pull
docker compose up -d --build

# Logs
docker compose logs -f --tail=100 backend web

# Restart application containers
docker compose restart backend web

# Stop (keeps database and certificate volumes)
docker compose down

# Database shell
docker compose exec db psql -U totalstock -d totalstock
```

> Do not run `docker compose down -v` unless you intend to delete the PostgreSQL database and Caddy
> certificates.

Backups are written to `./backups/totalstock-*.dump`. Copy them off the VM periodically (OCI Object
Storage, another server, or your own machine). To restore:

```bash
docker compose stop backend web
docker compose cp backups/<file>.dump db:/tmp/restore.dump
docker compose exec db pg_restore --clean --if-exists --no-owner -U totalstock -d totalstock /tmp/restore.dump
docker compose start backend web
```

The Compose stack starts with a fresh PostgreSQL database; existing SQLite data is not copied
automatically. Use `seed_demo` for a demo, or export/import data deliberately.

For a local smoke test, set `DOMAIN=localhost`, `HTTP_PORT=8081` and `HTTPS_PORT=8443` in `.env` and
open `https://localhost:8443` directly. Caddy will use its local CA, so the browser will show a
certificate warning until you trust it; the HTTP-to-HTTPS redirect assumes the standard port 443.

## Render deployment

Render does not support `docker-compose.yml`. The checked-in `render.yaml` Blueprint creates:

| Resource         | Purpose                                    |
| ---------------- | ------------------------------------------ |
| `totalstock-api` | Django + Gunicorn Docker web service       |
| `totalstock-web` | React static site served from Render's CDN |
| `totalstock-db`  | Render PostgreSQL                          |

### Deploy

1. Push the repository to GitHub or GitLab.
2. In Render, choose **New → Blueprint**, select the repository, and apply `render.yaml`.
3. When prompted, set the first admin credentials:
   - `DJANGO_SUPERUSER_EMAIL`
   - `DJANGO_SUPERUSER_PASSWORD`
   `DJANGO_SECRET_KEY` is generated automatically by Render.
4. Wait for both services to deploy. Verify `https://<api>.onrender.com/health/`, then open the static
   site URL and sign in with the admin account.

The API container runs migrations and `collectstatic` on every start; `initialDeployHook` creates
the admin account once. If Render assigns different service names, update `CORS_ALLOWED_ORIGINS`,
`CSRF_TRUSTED_ORIGINS` and `VITE_API_URL` in `render.yaml` to the generated URLs.

If you add a custom domain later, update `DJANGO_ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`,
`CSRF_TRUSTED_ORIGINS` and the static site's `VITE_API_URL`, then redeploy the frontend.

If the hook did not run, create the admin from a machine with access to the Render database:

```bash
cd backend
export DATABASE_URL="<Render external connection string>"
python manage.py createsuperuser
```

On PowerShell, use `$env:DATABASE_URL = "..."` instead.

### Free-tier limits

- Free web services spin down after 15 minutes without traffic, so the first request can take about
  a minute.
- Render's free PostgreSQL instance expires after roughly 30 days. For persistent data, use a paid
  Render database or a free Neon database and set `DATABASE_URL` manually.
- Free web services do not provide Shell access. Use the Django admin for account changes, or adjust
  `initialDeployHook` for one-time setup tasks.

### What the Blueprint configures

- API Dockerfile: `backend/Dockerfile`; build context: `backend`.
- Health check: `/health/`.
- Render injects `PORT`; Gunicorn binds it automatically.
- One-year HSTS is enabled on API responses and the static site; Render's edge handles the HTTPS
  redirect.
- `DB_CONN_MAX_AGE=0` and 2 Gunicorn workers / 2 threads fit the 512 MB free instance.
- Static site build: `cd frontend && npm ci && npm run build`; publish: `frontend/dist`.
- SPA rewrite: `/*` -> `/index.html`.
- `VITE_API_URL` is baked into the frontend at build time.

### Manual service setup without the Blueprint

1. Create a **PostgreSQL** instance and copy its internal connection string.
2. Create a **Web Service → Docker**:
   - Dockerfile path: `backend/Dockerfile`
   - Docker context: `backend`
   - Health check path: `/health/`
   - Add the environment variables from `render.yaml`, with `DATABASE_URL` set to the database
     connection string.
3. Create a **Static Site**:
   - Root directory: `frontend`
   - Build command: `npm ci && npm run build`
   - Publish directory: `dist`
   - Add `VITE_API_URL=https://<api>.onrender.com/api`
   - Add rewrite `/*` -> `/index.html`

Never point Render at `docker-compose.yml`; `x-logging` and the other top-level fields are Compose
syntax, not Dockerfile instructions.

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
  Dockerfile       Gunicorn production image
  entrypoint.sh    migrate + collectstatic + start Gunicorn
  manage.py
frontend/
  src/components/  layout, UI primitives, bill/purchase forms, invoice renderers
  src/pages/       route pages, including /print/bill/:id, /print/shop/:shopId, /print/all
  src/services/    typed axios clients per resource
  src/contexts/    auth, theme and toast providers
  src/types/       shared API types
deploy/
  Caddyfile        HTTPS, SPA fallback and Django proxy
  frontend.Dockerfile
  backup.sh        nightly PostgreSQL dumps
docker-compose.yml
render.yaml        Render Blueprint: API, static site and PostgreSQL
.env.example       Docker Compose deployment configuration template
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
