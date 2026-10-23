# RhemaVoice

**Our Voice Is Light** — kingdom-focused community platform by **RhemaVoice Technologies Inc.**

Modular monolith: Expo mobile, Next.js web/admin, Hono API on **Neon Functions** (PostgreSQL). The legacy Django API remains in `backend/` as the migration/seed source of truth.

## Core modules

1. Church Streaming  
2. Rhema Academy™ (multi-partner LMS)  
3. Rhema Learn™  
4. Live Radio Broadcast  
5. Business Hub  
6. Rhema Rooms™  
7. Opportunities (Jobs, Scholarships, Grants & Loans)  
8. Rhema-Transervices (Liberia)  
9. Rhema-E-Ticketing  
10. RhemaAir  

## Stack

- **API:** Hono + Neon Functions + PostgreSQL (`apps/neon-api`)
- **Legacy API:** Django + DRF + Channels (`backend/`, migrations/seed only)
- **Mobile:** Expo + React Native + TypeScript + Redux Toolkit + React Query + Paper + Reanimated
- **Web / Admin:** Next.js + Tailwind + Framer Motion + React Query
- **Brand:** dark purple + soft gold

## Requirements

- Node.js 20.19+
- Python 3.9+ (only for the legacy Django migrations/seed)
- Neon CLI (`neon`) and `psql` for database work

## API (Neon Functions)

`apps/neon-api` is the live API. It uses Neon's pooled Postgres connection,
Django-compatible password hashing/JWT, and the same JSON shapes as DRF so the
deployed frontends keep working unchanged.

### Rebuild the database from SQLite

```bash
cp .env.example .env.local   # set DATABASE_URL and DATABASE_URL_UNPOOLED
./scripts/migrate-to-neon.sh
```

The script drops and recreates the `public` schema, applies Django migrations,
loads the SQLite data, and seeds demo content. Neon latency makes this take a
few minutes.

### Deploy

```bash
JWT_SECRET=$(openssl rand -hex 32)

neon functions deploy rhemavoiceapi \
  --project-id <project-id> --branch main \
  --src apps/neon-api --runtime nodejs24 \
  --env JWT_SECRET="$JWT_SECRET" \
  --env CORS_ALLOWED_ORIGINS="https://your-web.vercel.app,https://your-admin.vercel.app" \
  --env OTP_DEBUG=1 --env OTP_CODE=123456 --env PAYMENTS_MODE=sandbox \
  --wait
```

Neon injects `DATABASE_URL` and `DATABASE_URL_UNPOOLED` into the function at
runtime; do not put them in Vercel.

### Smoke test

```bash
./scripts/smoke-api.sh https://<function>.compute.<region>.aws.neon.tech
```

### Local functions dev

```bash
npm run dev --workspace=@rhemavoice/neon-api
```

See [`docs/vercel-env.md`](docs/vercel-env.md) for the exact Vercel variables and
[`docs/deployment.md`](docs/deployment.md) for the full runbook.

## Legacy Django API (local SQLite)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo
uvicorn config.asgi:application --host 127.0.0.1 --port 8000
```

## Frontends

```bash
npm install
npm run web      # http://localhost:3000
npm run admin    # http://localhost:3001
npm run mobile   # Expo
```

## Demo accounts

| Account | Email | Password |
|---------|-------|----------|
| Super Admin | admin@rhemavoice.app | Admin123! |
| Member | demo@rhemavoice.app | Demo123! |

**Dev OTP:** `123456` (only when `OTP_DEBUG=1`; real OTP delivery is not wired yet)

## Login flow

Splash → Welcome → Login → OTP → Dashboard → Module → Profile gate (if required) → Module home

## Monorepo

```
apps/mobile     Expo app
apps/web        Member portal
apps/admin      Admin + Super Admin
apps/neon-api   Hono API on Neon Functions
packages/       shared, ui, api-client
backend/        Legacy Django API (migrations + seed source of truth)
docs/           Architecture, deployment, Vercel env
scripts/        Neon migration + API smoke test
```

## Realtime & payments

- **WebSockets:** `wss://<function>/ws/chat/<conversation_id>/?token=<jwt>` and `/ws/notifications/?token=<jwt>`. Cross-instance fan-out uses Postgres polling.
- **Payments:** Sandbox by default (`PAYMENTS_MODE=sandbox`). Initiate → confirm (or webhook) → wallet credit for `wallet_topup`. Set provider secrets + `PAYMENTS_MODE=live` for production checkout URLs.

## Tests

```bash
cd backend && pytest                                     # legacy API
npx tsc --noEmit -p apps/neon-api/tsconfig.json          # Neon API typecheck
./scripts/smoke-api.sh <api-base-url>                    # deployed API smoke
```

See [docs/architecture.md](docs/architecture.md) for the module map, RBAC, and multi-tenant rules.
