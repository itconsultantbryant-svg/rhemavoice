# Deployment — Neon Functions (API) + Vercel (Web / Admin)

## Overview

| Service | Platform | Root |
|---------|----------|------|
| API + WebSockets | [Neon Functions](https://neon.com) | `apps/neon-api/` |
| PostgreSQL | Neon | project `soft-grass-56497276` |
| Member web app | Vercel | `apps/web/` |
| Admin web app | Vercel | `apps/admin/` |
| Mobile (Expo) | Expo | `apps/mobile/` |

The legacy Django API (`backend/`) is no longer deployed. It is kept as the
migration/seed source of truth.

---

## 1. Database

Neon already hosts the schema (Django migrations) and demo data. To rebuild it
from `backend/db.sqlite3`:

```bash
cp .env.example .env.local
# set DATABASE_URL (pooled) and DATABASE_URL_UNPOOLED (direct)
./scripts/migrate-to-neon.sh
```

The script drops `public`, runs Django migrations, dumps SQLite (excluding
`contenttypes` / `auth.permission`, which migrate already creates), loads the
data, and runs `seed_demo`. Neon round-trips are slow, so this takes several
minutes.

Get the connection strings:

```bash
neon connection-string main --project-id soft-grass-56497276 \
  --role-name rhemavoice_owner --database-name rhemavoice --pooled

neon connection-string main --project-id soft-grass-56497276 \
  --role-name rhemavoice_owner --database-name rhemavoice
```

Keep the unpooled URL for migrations; use the pooled URL for app traffic.

## 2. Deploy the API

```bash
JWT_SECRET=$(openssl rand -hex 32)

neon functions deploy rhemavoiceapi \
  --project-id soft-grass-56497276 --branch main \
  --src apps/neon-api --runtime nodejs24 \
  --env JWT_SECRET="$JWT_SECRET" \
  --env CORS_ALLOWED_ORIGINS="https://your-web.vercel.app,https://your-admin.vercel.app" \
  --env OTP_DEBUG=1 --env OTP_CODE=123456 --env PAYMENTS_MODE=sandbox \
  --wait
```

- Neon injects `DATABASE_URL` / `DATABASE_URL_UNPOOLED` at runtime.
- Keep `JWT_SECRET` stable; rotating it invalidates all sessions.
- `OTP_DEBUG=1` is required until a real OTP delivery channel exists.

## 3. Vercel

Create two projects from the same repo. Root directories:

- `apps/web`
- `apps/admin`

Set the same variables on **both**, for Production and Preview:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `https://<function>.compute.<region>.aws.neon.tech/api/v1` |
| `NEXT_PUBLIC_WS_URL` | `wss://<function>.compute.<region>.aws.neon.tech` |

The current deployed values are listed in [`docs/vercel-env.md`](vercel-env.md).
No server-side secrets belong on Vercel.

## 4. Tighten CORS

The initial deploy uses `CORS_ALLOWED_ORIGINS=*`. After the Vercel URLs exist,
redeploy the function with the real list (see `docs/vercel-env.md`).

## 5. Verify

```bash
./scripts/smoke-api.sh https://<function>.compute.<region>.aws.neon.tech
```

The smoke script checks health, login, OTP verification, modules, and dashboard.
It exits early if `OTP_DEBUG` is off.

## 6. Legacy Django on Render (optional)

`render.yaml` + `backend/` are retained for reference. If you still need the
Django API, deploy `backend/` to Render with `DATABASE_URL`, `SECRET_KEY`,
`DATABASE_SSL_REQUIRE=1`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, and
`CSRF_TRUSTED_ORIGINS`. Live chat requires uvicorn/ASGI.

## Checklist

- [ ] `neon functions list` shows `rhemavoiceapi` as deployed
- [ ] `/health/` returns `{"status":"ok"}`
- [ ] Demo login → OTP → dashboard works through the function URL
- [ ] Vercel web + admin have both `NEXT_PUBLIC_*` vars and were rebuilt
- [ ] CORS updated from `*` to the Vercel origins
- [ ] `JWT_SECRET` stored somewhere safe for future deploys
- [ ] Real OTP delivery planned (`OTP_DEBUG=0` is not production-ready yet)
