# Deployment — Render (API) + Vercel (Web / Admin)

## Overview

| Service | Platform | Root |
|---------|----------|------|
| Django API + WebSockets | [Render](https://render.com) | `backend/` |
| Member web app | [Vercel](https://vercel.com) | `apps/web/` |
| Admin web app | Vercel | `apps/admin/` |

Mobile (Expo) is separate — point `EXPO_PUBLIC_API_URL` / `EXPO_PUBLIC_WS_URL` at the Render API after deploy.

---

## 1. Backend on Render

### Option A — Blueprint (recommended)

1. Push this repo to GitHub/GitLab.
2. Render Dashboard → **New** → **Blueprint**.
3. Select the repo; Render reads [`render.yaml`](../render.yaml).
4. Confirm the Postgres DB + `rhemavoice-api` web service.
5. After first deploy, open the service URL and check `https://<service>.onrender.com/health/` → `{"status":"ok"}`.

### Option B — Manual web service

1. **New** → **Web Service** → connect repo.
2. Settings:
   - **Root Directory:** `backend`
   - **Runtime:** Python 3
   - **Build Command:** `bash build.sh`
   - **Start Command:** `bash start.sh`
   - **Health Check Path:** `/health/`
3. Add a **PostgreSQL** database and link `DATABASE_URL`.

### Required environment variables

| Key | Value |
|-----|--------|
| `DEBUG` | `0` |
| `SECRET_KEY` | Long random string (Render can generate) |
| `DATABASE_URL` | From Render Postgres |
| `DATABASE_SSL_REQUIRE` | `1` |
| `ALLOWED_HOSTS` | `.onrender.com` (and custom domain if any) |
| `CORS_ALLOWED_ORIGINS` | Your Vercel URLs, comma-separated, `https://…` |
| `CSRF_TRUSTED_ORIGINS` | API URL + Vercel URLs, `https://…` |
| `OTP_DEBUG` | `0` in production |
| `SEED_DEMO` | `1` once to seed demo users, then set to `0` |
| `PAYMENTS_MODE` | `sandbox` until live keys are ready |
| `USE_REDIS_CHANNELS` | `0` unless you add Redis |

### Demo accounts (after `SEED_DEMO=1`)

- Admin: `admin@rhemavoice.app` / `Admin123!`
- Demo: `demo@rhemavoice.app` / `Demo123!`
- OTP (only if `OTP_DEBUG=1`): `123456`

### Notes

- Free Render web services **spin down** when idle; first request may take ~30–60s.
- WebSockets work with `uvicorn` (ASGI). Free plans can be limited for long-lived WS connections.
- After Vercel URLs exist, update `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS`, then redeploy.

---

## 2. Frontend on Vercel

Create **two** Vercel projects from the same monorepo.

### Member app (`apps/web`)

1. Vercel → **Add New** → **Project** → import repo.
2. **Root Directory:** `apps/web` (Edit → select folder).
3. Framework: Next.js (auto).
4. Install / Build are already in [`apps/web/vercel.json`](../apps/web/vercel.json) (`npm install` from monorepo root).
5. Environment variables (Production + Preview):

```
NEXT_PUBLIC_API_URL=https://YOUR-RENDER-SERVICE.onrender.com/api/v1
NEXT_PUBLIC_WS_URL=wss://YOUR-RENDER-SERVICE.onrender.com
```

6. Deploy.

### Admin app (`apps/admin`)

Same steps with **Root Directory:** `apps/admin` and the same `NEXT_PUBLIC_*` vars.

[`apps/admin/vercel.json`](../apps/admin/vercel.json) builds `@rhemavoice/admin`.

### After both Vercel apps are live

Update Render env:

```
CORS_ALLOWED_ORIGINS=https://your-web.vercel.app,https://your-admin.vercel.app
CSRF_TRUSTED_ORIGINS=https://YOUR-RENDER-SERVICE.onrender.com,https://your-web.vercel.app,https://your-admin.vercel.app
```

Redeploy the API.

---

## 3. Checklist

- [ ] Render health: `GET /health/` returns ok
- [ ] `POST /api/v1/auth/login/` works from browser (CORS)
- [ ] Web app login → OTP → dashboard
- [ ] Admin app login with super admin
- [ ] `SEED_DEMO` turned off after first seed
- [ ] `OTP_DEBUG=0` and real OTP/email path planned for production
- [ ] Custom domains (optional) added on Render + Vercel and reflected in CORS/CSRF

---

## 4. Local production-like smoke test

```bash
# API
cd backend
source .venv/bin/activate
pip install -r requirements.txt
DEBUG=0 SECRET_KEY=test SECRET_SSL_REDIRECT=0 SECURE_SSL_REDIRECT=0 \
  ALLOWED_HOSTS=localhost CORS_ALLOWED_ORIGINS=http://localhost:3000 \
  bash -c 'python manage.py collectstatic --no-input && uvicorn config.asgi:application --port 8000'

# Web (separate terminal, from repo root)
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1 npm run build:web
```
