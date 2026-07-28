# Architecture

RhemaVoice is a **kingdom-focused community platform** by **RhemaVoice Technologies Inc.**  
Tagline: **Our Voice Is Light**

Built as a **modular monolith**: one Django API, independent apps per domain, shared auth/RBAC. Clients: React Native (Expo) mobile + Next.js web/admin.

> Note: The product roadmap specifies Supabase; the current implementation uses Django + PostgreSQL/SQLite with Channels for realtime. Multi-tenant partner isolation is enforced via RBAC and organization-scoped data.

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

Clients (Expo / Next.js) → JWT + OTP → Module registry + profile gates → Feature APIs

## Module profile gate

Modules with `requires_profile=true` (Academy, Learn, Business, Rooms, Opportunities) block access until `POST /api/v1/modules/{id}/profile/` completes registration.

## Multi-tenant partner model

Tenants (churches, academies, radio, businesses, employers, transport, event organizers, travel agencies) operate branded spaces on shared infrastructure. Partners only manage their own content; Super Admin / Platform Admin oversee approvals and global settings.

## Roles (RBAC)

Super Administrator, Platform Administrator, Church / Academy / Radio / Business Administrators, Employer, Teacher/Trainer, Student, Event Organizer, Travel / Transport Partners, General User / Member, plus support & finance roles.

## Admin

Super Admin unlocks `/api/v1/admin/*` and the Admin Next.js app — users, partners, feature toggles, moderation, system settings.

## Realtime

JWT-authenticated WebSockets via Channels (`JwtAuthMiddleware`):

- `/ws/chat/<conversation_id>/`
- `/ws/notifications/`

Run the API with an ASGI server (`uvicorn config.asgi:application`).

## Payments

Provider adapters (Stripe / Paystack / Flutterwave / Mobile Money) in `apps/payments/gateway.py`. Sandbox by default; live mode + webhooks for production. Used for courses, tickets, transport, air bookings, donations, and subscriptions.
