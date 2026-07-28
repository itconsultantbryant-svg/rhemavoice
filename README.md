# RhemaVoice

**Our Voice Is Light** — kingdom-focused community platform by **RhemaVoice Technologies Inc.**

Modular monolith: Expo mobile, Next.js web/admin, Django API.

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

- **Mobile:** Expo + React Native + TypeScript + Redux Toolkit + React Query + Paper + Reanimated
- **Web / Admin:** Next.js + Tailwind + Framer Motion + React Query
- **Backend:** Django + DRF + SimpleJWT + Channels + Celery + Redis + PostgreSQL
- **Brand:** Sacred Navy (deep navy + soft gold)

## Requirements

- Node.js 20+
- Python 3.9+ (3.12 recommended for Docker)
- Docker (optional, for Postgres/Redis stack)

### 1. API (Docker)

```bash
cp .env.example .env
docker compose up --build
```

API: http://localhost:8000/api/v1/

### 2. API (local SQLite)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo
# ASGI (HTTP + WebSockets for chat/notifications)
uvicorn config.asgi:application --host 127.0.0.1 --port 8000
```

> For HTTP-only development you can still use `python manage.py runserver`, but live chat needs uvicorn (or another ASGI server).

### 3. Frontends

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

**Dev OTP:** `123456`

## Login flow

Splash → Welcome → Login → OTP → Dashboard → Module → Profile gate (if required) → Module home

## Monorepo

```
apps/mobile   Expo app
apps/web      Member portal
apps/admin    Admin + Super Admin
packages/     shared, ui, api-client
backend/      Django modular monolith
docs/         Architecture notes
```

## Realtime & payments

- **WebSockets:** `ws://localhost:8000/ws/chat/<conversation_id>/?token=<jwt>` and `/ws/notifications/?token=<jwt>`
- **Payments:** Sandbox by default (`PAYMENTS_MODE=sandbox`). Initiate → confirm (or webhook) → wallet credit for `wallet_topup` purposes. Set provider secrets + `PAYMENTS_MODE=live` for production checkout URLs.

## Deployment

- **API:** Render (`backend/` + [`render.yaml`](render.yaml))
- **Web / Admin:** Vercel (`apps/web`, `apps/admin`)

See **[docs/deployment.md](docs/deployment.md)** for step-by-step setup, env vars, and CORS wiring.

## Tests

```bash
cd backend && pytest
```

See [docs/architecture.md](docs/architecture.md) for module map, RBAC, and multi-tenant rules.
