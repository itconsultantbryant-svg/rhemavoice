#!/usr/bin/env bash
# Start ASGI server (HTTP + WebSockets) on Render
set -o errexit
cd "$(dirname "$0")"

# Render injects $PORT
exec uvicorn config.asgi:application \
  --host 0.0.0.0 \
  --port "${PORT:-8000}" \
  --proxy-headers \
  --forwarded-allow-ips='*'
