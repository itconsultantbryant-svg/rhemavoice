# Architecture

RhemaVoice is a **kingdom-focused community platform** by **RhemaVoice Technologies Inc.**  
Tagline: **Our Voice Is Light**

Built as a **modular monolith**: one API, independent route modules per domain, shared auth/RBAC. Clients: React Native (Expo) mobile + Next.js web/admin.

The live API is **Hono on Neon Functions** (`apps/neon-api`) against Neon PostgreSQL. It reuses Django's exact table/column names and DRF JSON shapes. The legacy Django API (`backend/`) remains the source of truth for migrations and demo seeding; it is no longer the deployment target. Multi-tenant partner isolation is enforced via RBAC and organization-scoped data.

## Core platform modules

| Module | Route | Purpose |
|--------|-------|---------|
| Church Streaming | `/streaming` | Live services, sermons, church follows |
| Rhema Academy™ | `/academy` | Multi-partner LMS (e.g. Chayil) |
| Rhema Learn™ | `/learn` | Voice-based lessons & learning communities |
| Live Radio | `/radio` | Partner radio stations & broadcasts |
| Business Hub | `/business` | Kingdom business profiles |
| Rhema Rooms™ | `/rooms` | Voice rooms (prayer, study, fellowship) |
| Opportunities | `/opportunities` | Jobs, scholarships, grants & loans |
| Rhema-Transervices | `/transport` | Liberia transport booking |
| Rhema-E-Ticketing | `/ticketing` | Event tickets |
| RhemaAir | `/air` | Flight booking via travel partners |

Supporting systems: auth/profiles, notifications, payments/wallet, chat, follow, search, settings, admin.

## Request path

Clients (Expo / Next.js) → Neon Function (Hono) → JWT + OTP → Module registry + profile gates → Feature APIs → Neon PostgreSQL

## Module profile gate

Modules with `requires_profile=true` (Academy, Learn, Business, Rooms, Opportunities) block access until `POST /api/v1/modules/{id}/profile/` completes registration.

## Multi-tenant partner model

Tenants (churches, academies, radio, businesses, employers, transport, event organizers, travel agencies) operate branded spaces on shared infrastructure. Partners only manage their own content; Super Admin / Platform Admin oversee approvals and global settings.

## Roles (RBAC)

Super Administrator, Platform Administrator, Church / Academy / Radio / Business Administrators, Employer, Teacher/Trainer, Student, Event Organizer, Travel / Transport Partners, General User / Member, plus support & finance roles.

## Admin

Super Admin unlocks `/api/v1/admin/*` and the Admin Next.js app — users, partners, feature toggles, moderation, system settings.

## Realtime

JWT-authenticated WebSockets served by the Neon Function:

- `/ws/chat/<conversation_id>/?token=<jwt>`
- `/ws/notifications/?token=<jwt>`

Function instances are isolated, so cross-instance fan-out polls Postgres for
new `chat_message` / `notifications_notification` rows. The legacy Django
Channels implementation lives in `backend/apps/realtime/`.

## Payments

Provider adapters (Stripe / Paystack / Flutterwave / Mobile Money) in
`apps/neon-api/src/routes/payments.ts` (and the legacy
`backend/apps/payments/gateway.py`). Sandbox by default; live mode + webhooks
for production. Used for courses, tickets, transport, air bookings, donations,
and subscriptions.
