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

echo "→ Resolving any stuck failed migrations before deploy..."
# If a migration failed mid-run it is stored in _prisma_migrations with
# started_at set but finished_at/rolled_back_at NULL.  prisma migrate deploy
# refuses to continue past such rows.  Use the already-generated Prisma client
# to mark them as rolled-back via direct SQL (no sqlite3 binary required).
node -e "
  const { PrismaClient } = require('@prisma/client');
  const p = new PrismaClient();
  p.\$executeRawUnsafe(
    \"UPDATE _prisma_migrations SET rolled_back_at = datetime('now') WHERE finished_at IS NULL AND rolled_back_at IS NULL\"
  )
    .then(n => { console.log('  Resolved ' + n + ' stuck migration(s)'); return p.\$disconnect(); })
    .then(() => process.exit(0))
    .catch(e => { console.error('  Resolve warning: ' + e.message); return p.\$disconnect().then(() => process.exit(0)); });
" || true

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
