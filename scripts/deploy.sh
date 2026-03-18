#!/usr/bin/env bash
# Emergency manual deploy — run from your local machine
# Usage: ./scripts/deploy.sh <server-ip-or-hostname>
set -euo pipefail

SERVER="${1:?Usage: ./scripts/deploy.sh <server-host>}"
DEPLOY_DIR=/var/www/heirloom

echo "=== Building ==="
npm ci
npx prisma generate
npm run build

echo "=== Preparing standalone artifact ==="
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static
cp -r prisma .next/standalone/prisma
cp ecosystem.config.cjs .next/standalone/ecosystem.config.cjs

echo "=== Syncing to $SERVER ==="
rsync -az --delete \
  .next/standalone/ \
  "ubuntu@${SERVER}:${DEPLOY_DIR}/"

echo "=== Migrating & restarting ==="
ssh "ubuntu@${SERVER}" 'bash -s' << 'ENDSSH'
  set -e
  cd /var/www/heirloom
  set -a && source /var/www/heirloom/.env.production && set +a
  npx prisma migrate deploy
  pm2 describe heirloom > /dev/null 2>&1 \
    && pm2 reload heirloom --update-env \
    || pm2 start ecosystem.config.cjs
  pm2 save
  echo "Deploy complete"
ENDSSH
