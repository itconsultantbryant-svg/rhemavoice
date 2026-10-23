# Vercel environment variables

Both Vercel projects (`apps/web` and `apps/admin`) read the same two
build-time variables. There are no server-side secrets in the frontends.

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

## After the Vercel URLs exist

Tighten CORS on the Neon function (currently `*`) by redeploying with the real
origins:

```bash
neon functions deploy rhemavoiceapi \
  --project-id soft-grass-56497276 --branch main \
  --src apps/neon-api --runtime nodejs24 \
  --env JWT_SECRET="$JWT_SECRET" \
  --env CORS_ALLOWED_ORIGINS="https://your-web.vercel.app,https://your-admin.vercel.app" \
  --env OTP_DEBUG=1 --env OTP_CODE=123456 --env PAYMENTS_MODE=sandbox \
  --wait
```

## Mobile (Expo, not Vercel)

```bash
EXPO_PUBLIC_API_URL=https://br-round-field-b9uy04d6-rhemavoiceapi.compute.c-7.eu-central-1.aws.neon.tech/api/v1
EXPO_PUBLIC_WS_URL=wss://br-round-field-b9uy04d6-rhemavoiceapi.compute.c-7.eu-central-1.aws.neon.tech
```

The mobile API client derives WebSocket URLs from `EXPO_PUBLIC_API_URL`; the
explicit `EXPO_PUBLIC_WS_URL` is kept for parity/tooling.
