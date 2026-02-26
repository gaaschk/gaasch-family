#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Gaasch Family — Lightsail server setup
# Run once on a fresh Ubuntu 22.04 instance as the 'ubuntu' user.
# Usage: bash <(curl -fsSL https://raw.githubusercontent.com/gaaschk/gaasch-family/main/scripts/server-setup.sh)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

APP_DIR="/home/ubuntu/gaasch-family"
REPO="https://github.com/gaaschk/gaasch-family.git"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  Gaasch Family — Server Setup                        ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── 1. System update ─────────────────────────────────────────────────────────
echo "→ Updating system packages..."
sudo apt-get update -qq
sudo apt-get install -y -qq git curl

# ── 2. Swap (protects against OOM during next build) ─────────────────────────
if [ ! -f /swapfile ]; then
  echo "→ Creating 2GB swap file..."
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab > /dev/null
  echo "  ✓ Swap created"
else
  echo "  ✓ Swap already exists — skipping"
fi

# ── 3. Node.js 20 ────────────────────────────────────────────────────────────
if ! command -v node &>/dev/null || [[ "$(node --version)" != v20* ]]; then
  echo "→ Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - > /dev/null 2>&1
  sudo apt-get install -y nodejs > /dev/null
  echo "  ✓ Node.js $(node --version) installed"
else
  echo "  ✓ Node.js $(node --version) already installed"
fi

# ── 4. nginx ─────────────────────────────────────────────────────────────────
if ! command -v nginx &>/dev/null; then
  echo "→ Installing nginx..."
  sudo apt-get install -y nginx > /dev/null
  echo "  ✓ nginx installed"
else
  echo "  ✓ nginx already installed"
fi

# ── 5. PM2 ───────────────────────────────────────────────────────────────────
if ! command -v pm2 &>/dev/null; then
  echo "→ Installing PM2..."
  sudo npm install -g pm2 > /dev/null
  echo "  ✓ PM2 installed"
else
  echo "  ✓ PM2 already installed"
fi

# ── 6. Clone repo ────────────────────────────────────────────────────────────
if [ ! -d "$APP_DIR" ]; then
  echo "→ Cloning repository..."
  git clone "$REPO" "$APP_DIR"
  echo "  ✓ Repo cloned to $APP_DIR"
else
  echo "  ✓ Repo already exists at $APP_DIR"
fi

# ── 7. npm install ───────────────────────────────────────────────────────────
echo "→ Installing npm dependencies..."
cd "$APP_DIR"
npm install --silent

# ── 8. Ask for domain ────────────────────────────────────────────────────────
echo ""
read -p "Enter your domain (e.g. family.kevingaasch.com) or press Enter to use IP only: " DOMAIN
DOMAIN="${DOMAIN:-_}"

# ── 9. Write nginx config ────────────────────────────────────────────────────
echo "→ Writing nginx config..."
sudo tee /etc/nginx/sites-available/gaasch-family > /dev/null << NGINX
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    # Max upload size (for future file uploads)
    client_max_body_size 10M;

    location / {
        proxy_pass         http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade \$http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/gaasch-family /etc/nginx/sites-enabled/gaasch-family
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
echo "  ✓ nginx configured"

# ── 10. Generate .env.local ──────────────────────────────────────────────────
AUTH_SECRET=$(openssl rand -hex 32)

if [ "$DOMAIN" = "_" ]; then
  PUBLIC_URL="http://$(curl -s ifconfig.me)"
else
  PUBLIC_URL="https://$DOMAIN"
fi

cat > "$APP_DIR/.env.local" << ENV
# Database (absolute path — do not change)
DATABASE_URL="file:$APP_DIR/prisma/dev.db"

# Auth.js — auto-generated, do not share
AUTH_SECRET="$AUTH_SECRET"
AUTH_URL="$PUBLIC_URL"

# Email — update these before starting the app
# Gmail: smtp://your-gmail@gmail.com:your-app-password@smtp.gmail.com:587
# Resend: smtp://resend:your-api-key@smtp.resend.com:465
EMAIL_SERVER="smtp://user:password@smtp.yourprovider.com:587"
EMAIL_FROM="Gaasch Family <noreply@${DOMAIN#_}>"
ENV

# ── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║  Setup complete! Two things to do before launching:                  ║"
echo "╠══════════════════════════════════════════════════════════════════════╣"
echo "║                                                                       ║"
echo "║  1. Upload the database from your local machine (run this locally):   ║"
echo "║                                                                       ║"
echo "║     scp -i ~/Downloads/LightsailKey.pem \\                            ║"
echo "║       ~/ProjectHome/gaasch-family-next/prisma/prisma/dev.db \\        ║"
echo "║       ubuntu@$(curl -s ifconfig.me):$APP_DIR/prisma/dev.db  ║"
echo "║                                                                       ║"
echo "║  2. Add your SMTP credentials:                                        ║"
echo "║                                                                       ║"
echo "║     nano $APP_DIR/.env.local                         ║"
echo "║                                                                       ║"
echo "║  Then run: bash $APP_DIR/scripts/deploy.sh           ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""
