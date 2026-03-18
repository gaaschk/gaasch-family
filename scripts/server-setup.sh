#!/usr/bin/env bash
# One-time setup for the Heirloom Lightsail Ubuntu instance (family.kevingaasch.com)
# Run as ubuntu user: bash scripts/server-setup.sh
set -euo pipefail

echo "=== Node.js 22 ==="
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

echo "=== PM2 + prisma CLI (global) ==="
sudo npm install -g pm2 prisma

echo "=== PM2 systemd startup ==="
pm2 startup systemd -u ubuntu --hp /home/ubuntu | tail -1 | sudo bash

echo "=== App directory ==="
sudo mkdir -p /var/www/heirloom
sudo chown ubuntu:ubuntu /var/www/heirloom
sudo mkdir -p /var/log/heirloom
sudo chown ubuntu:ubuntu /var/log/heirloom

echo "=== nginx ==="
sudo apt-get install -y nginx

echo "=== certbot ==="
sudo apt-get install -y certbot python3-certbot-nginx

echo ""
echo "=== NEXT STEPS (manual) ==="
echo ""
echo "1. Deploy SSH key — generate a dedicated keypair for GitHub Actions:"
echo "   ssh-keygen -t ed25519 -C 'github-actions-deploy' -f ~/.ssh/deploy_key -N ''"
echo "   cat ~/.ssh/deploy_key.pub >> ~/.ssh/authorized_keys"
echo "   cat ~/.ssh/deploy_key   # paste this as LIGHTSAIL_SSH_KEY in GitHub Actions secrets"
echo ""
echo "2. Create the production environment file:"
echo "   nano /var/www/heirloom/.env.production"
echo "   (see .env.local.example in the repo for required variables)"
echo "   Required values:"
echo "     DATABASE_URL=postgresql://user:pass@<lightsail-db-endpoint>:5432/heirloom"
echo "     AUTH_SECRET=<openssl rand -base64 32>"
echo "     AUTH_URL=https://family.kevingaasch.com"
echo "     REDIS_URL=redis://<elasticache-endpoint>:6379"
echo "     AWS_ACCESS_KEY_ID=..."
echo "     AWS_SECRET_ACCESS_KEY=..."
echo "     AWS_REGION=us-east-1"
echo "     S3_BUCKET_NAME=..."
echo ""
echo "3. Install nginx vhost:"
echo "   sudo cp nginx/family.kevingaasch.com.conf /etc/nginx/sites-available/"
echo "   sudo ln -s /etc/nginx/sites-available/family.kevingaasch.com.conf /etc/nginx/sites-enabled/"
echo "   sudo nginx -t"
echo ""
echo "4. SSL cert (run AFTER DNS is pointed at this server):"
echo "   sudo certbot --nginx -d family.kevingaasch.com"
echo ""
echo "5. GitHub Actions secrets to set (repo Settings → Secrets → Actions):"
echo "   LIGHTSAIL_HOST  = <public IP or hostname of this instance>"
echo "   LIGHTSAIL_SSH_KEY = <contents of ~/.ssh/deploy_key>"
echo ""
echo "6. First deploy — push to main or run workflow_dispatch manually."
