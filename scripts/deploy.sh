#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Gaasch Family — deploy / update script
# Run this on the server to pull latest code and restart the app.
# Usage: bash /home/ubuntu/gaasch-family/scripts/deploy.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

APP_DIR="/home/ubuntu/gaasch-family"
cd "$APP_DIR"

# Export DATABASE_URL so Prisma CLI can resolve the schema
export DATABASE_URL="file:$APP_DIR/prisma/dev.db"

echo ""
echo "→ Pulling latest code..."
git pull

echo "→ Installing dependencies..."
npm install --silent

echo "→ Generating Prisma client..."
npx prisma generate

echo "→ Running database migrations..."
npx prisma migrate deploy

echo "→ Building..."
npm run build

echo "→ Restarting app..."
if pm2 describe gaasch &>/dev/null; then
  pm2 restart gaasch
else
  pm2 start npm --name "gaasch" -- start
  pm2 save
  # Make PM2 restart automatically after server reboots
  STARTUP_CMD=$(pm2 startup | grep "sudo" | tail -1)
  if [ -n "$STARTUP_CMD" ]; then
    eval "$STARTUP_CMD"
  fi
fi

echo ""
echo "✓ Deployed! App is running at http://localhost:3000"
echo ""
