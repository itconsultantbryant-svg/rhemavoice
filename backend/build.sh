#!/usr/bin/env bash
# Render build script for the RhemaVoice Django API
set -o errexit
set -o pipefail

cd "$(dirname "$0")"

python -m pip install --upgrade pip
pip install -r requirements.txt

python manage.py collectstatic --no-input
python manage.py migrate --no-input

# Optional: seed demo data on first deploy (set SEED_DEMO=1 in Render env)
if [ "${SEED_DEMO:-0}" = "1" ]; then
  python manage.py seed_demo
fi
