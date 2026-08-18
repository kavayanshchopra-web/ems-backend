#!/bin/bash
# ==============================================================================
# OmniFlow WhatsApp CRM - 1-Click Automated VPS Server Setup Script
# Target Domain: api.employeemanagementsystems.com
# Compatible with: Ubuntu 20.04 / 22.04 / 24.04 LTS & Debian 11/12
# ==============================================================================

set -e

DOMAIN="api.employeemanagementsystems.com"
APP_DIR="/var/www/whatsapp-crm"

echo "=============================================================================="
echo "🚀 STARTING OMNIFLOW WHATSAPP GATEWAY SERVER SETUP"
echo "🌐 Domain: $DOMAIN"
echo "=============================================================================="

# 1. System Updates & Core Packages
echo "📦 [1/6] Updating system packages..."
apt-get update -y && apt-get upgrade -y
apt-get install -y curl git ufw nginx certbot python3-certbot-nginx build-essential

# 2. Setup 4 GB Virtual Swap Memory (Critical for 1 GB RAM VPS)
echo "💾 [2/6] Configuring 4 GB Virtual Swap Memory on SSD..."
if [ ! -f /swapfile ]; then
    fallocate -l 4G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=4096
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    sysctl vm.swappiness=20
    echo 'vm.swappiness=20' >> /etc/sysctl.conf
    echo "✅ 4 GB Swap File Created & Activated Successfully!"
else
    echo "ℹ️ Swapfile already exists. Skipping swap creation."
fi

# 3. Install Node.js 20.x LTS & PM2
echo "⚡ [3/6] Installing Node.js 20 LTS & PM2 Process Manager..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
npm install -g pm2

# 4. Configure Application Directory
echo "📁 [4/6] Setting up Application Directory at $APP_DIR..."
mkdir -p "$APP_DIR"
mkdir -p "$APP_DIR/media_store"
mkdir -p "$APP_DIR/auth_info_baileys"
mkdir -p "$APP_DIR/logs"

# 5. Configure Nginx Reverse Proxy with WebSocket & Large Media Uploads
echo "🌐 [5/6] Configuring Nginx Reverse Proxy for $DOMAIN..."
cat > /etc/nginx/sites-available/whatsapp-crm <<EOL
server {
    listen 80;
    server_name $DOMAIN;

    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # WebSocket timeouts
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
EOL

ln -sf /etc/nginx/sites-available/whatsapp-crm /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# 6. Obtain Free Let's Encrypt SSL Certificate
echo "🔒 [6/6] Requesting Let's Encrypt SSL Certificate for $DOMAIN..."
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email admin@employeemanagementsystems.com --redirect || true

echo "=============================================================================="
echo "🎉 VPS GATEWAY SETUP COMPLETE!"
echo "Next Steps:"
echo "1. Upload / Git clone your backend code to $APP_DIR"
echo "2. Run: cd $APP_DIR && npm install"
echo "3. Run: pm2 start ecosystem.config.cjs && pm2 save && pm2 startup"
echo "=============================================================================="
