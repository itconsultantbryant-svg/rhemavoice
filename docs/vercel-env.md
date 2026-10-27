# Vercel environment variables

Both Vercel projects (`apps/web` and `apps/admin`) read the same two
build-time variables. There are no server-side secrets or provider credentials
in either frontend.

## Member app (`apps/web`)

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `https://br-round-field-b9uy04d6-rhemavoiceapi.compute.c-7.eu-central-1.aws.neon.tech/api/v1` |
| `NEXT_PUBLIC_WS_URL` | `wss://br-round-field-b9uy04d6-rhemavoiceapi.compute.c-7.eu-central-1.aws.neon.tech` |

## Admin app (`apps/admin`)

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `https://br-round-field-b9uy04d6-rhemavoiceapi.compute.c-7.eu-central-1.aws.neon.tech/api/v1` |
| `NEXT_PUBLIC_WS_URL` | `wss://br-round-field-b9uy04d6-rhemavoiceapi.compute.c-7.eu-central-1.aws.neon.tech` |

Set both keys for **Production** and **Preview**, then redeploy. `NEXT_PUBLIC_*`
values are inlined at build time, so changing them requires a new build.

> Do **not** add `JWT_SECRET`, `DATABASE_URL`, payment keys, storage keys, or
> any integration credential to Vercel. `NEXT_PUBLIC_*` values are visible in
> the browser.

## Neon Function runtime configuration (not Vercel)

Configure these on the `rhemavoiceapi` Neon Function, then redeploy that
function. Neon manages `DATABASE_URL`; do not copy it to a Vercel project.

| Key | Required / purpose |
|-----|-----|
| `JWT_SECRET` | **Required in production.** A long, unique signing secret. |
| `CORS_ALLOWED_ORIGINS` | **Required in production.** Comma-separated exact Vercel origins for the member and admin apps. |
| `OTP_DEBUG` | Set `0` in production. |
| `OTP_CODE` | Development-only fixed OTP; do not set in production. |
| `OTP_TTL_SECONDS` | Optional OTP lifetime; defaults to `600`. |
| `PAYMENTS_MODE` | Keep `sandbox` until a payment provider is fully integrated and webhook-verified. |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Only for a completed Stripe integration; Neon secret values. |
| `PAYSTACK_SECRET_KEY` | Only for a completed Paystack integration; Neon secret value. |
| `FLUTTERWAVE_SECRET_KEY` | Only for a completed Flutterwave integration; Neon secret value. |
| `MOBILE_MONEY_API_KEY` | Only for a completed mobile-money integration; Neon secret value. |
| `RADIO_STREAMING_ENABLED` | Set `true` only after valid non-demo radio stream URLs are deployed. Otherwise omit or set `false`. |
| `STREAMING_ENABLED` | Set `true` only after valid non-demo church playback URLs are deployed. Otherwise omit or set `false`. |
| `ROOMS_WEBRTC_ENABLED` | Set `true` only with a functioning managed WebRTC integration. |
| `ROOMS_WEBRTC_PROVIDER` | Provider identifier required with `ROOMS_WEBRTC_ENABLED=true`. |
| `AIR_SUPPLIER_ENABLED` | Set `true` only with a live travel inventory/booking supplier. |
| `AIR_SUPPLIER_PROVIDER` | Supplier identifier required with `AIR_SUPPLIER_ENABLED=true`. |
| `CCI_STORAGE_ENABLED` | Set `true` only after protected CCI object storage is integrated. |
| `CCI_STORAGE_BUCKET` | Protected storage bucket identifier required with `CCI_STORAGE_ENABLED=true`. |

Feature flags deliberately default to unavailable. Enabling a flag alone does
not create an integration: configure the corresponding provider implementation,
credentials, webhook handling, and operational verification first.

## After the Vercel URLs exist

Tighten CORS on the Neon function (currently `*`) by redeploying with the real
origins:

```bash
set -a; source .env.local; set +a

neon functions deploy rhemavoiceapi \
  --project-id soft-grass-56497276 --branch main \
  --src apps/neon-api --runtime nodejs24 \
  --env JWT_SECRET="$JWT_SECRET" \
  --env CORS_ALLOWED_ORIGINS="https://your-web.vercel.app,https://your-admin.vercel.app" \
  --env OTP_DEBUG=0 --env PAYMENTS_MODE=sandbox \
  --wait
```

## Mobile (Expo, not Vercel)

```bash
EXPO_PUBLIC_API_URL=https://br-round-field-b9uy04d6-rhemavoiceapi.compute.c-7.eu-central-1.aws.neon.tech/api/v1
EXPO_PUBLIC_WS_URL=wss://br-round-field-b9uy04d6-rhemavoiceapi.compute.c-7.eu-central-1.aws.neon.tech
```

The mobile API client derives WebSocket URLs from `EXPO_PUBLIC_API_URL`; the
explicit `EXPO_PUBLIC_WS_URL` is kept for parity/tooling.
