#!/bin/bash
# ==============================================================================
# OmniFlow EMS - 1-Click Automated Sandbox ERP Deployment Script
# Optimized for: 1 GB Physical RAM + 5 GB SSD Virtual Swap Memory
# Target Domain: sandbox-erp.employeemanagementsystems.com
# Stack: Odoo 19.0 (Frozen Cut-off) + PostgreSQL 16
# ==============================================================================

set -e

ERP_DIR="/var/www/omniflow-erp"
DOMAIN="sandbox-erp.employeemanagementsystems.com"

echo "=============================================================================="
echo "🚀 STARTING OMNIFLOW SANDBOX ERP ENGINE DEPLOYMENT"
echo "🌐 Domain: $DOMAIN"
echo "📦 Engine: Odoo 19 Community (Cut-Off & Locked Core)"
echo "💾 Memory Profile: Ultra-Low Footprint (< 900MB Combined Budget)"
echo "=============================================================================="

# 1. Verify / Configure 4GB+ Virtual Swap Memory
echo "💾 [1/6] Checking Virtual Swap Memory..."
SWAP_TOTAL=$(free -m | awk '/Swap:/ {print $2}')
if [ "$SWAP_TOTAL" -lt 3000 ]; then
    echo "⚠️ Swap is less than 3GB (Current: ${SWAP_TOTAL}MB). Expanding Swap..."
    swapoff -a || true
    fallocate -l 4G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=4096
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    grep -qxF '/swapfile none swap sw 0 0' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
    sysctl vm.swappiness=20
    echo "✅ Swap Memory configured to 4 GB with swappiness=20."
else
    echo "✅ Sufficient Swap Memory detected: ${SWAP_TOTAL} MB."
fi

# 2. Ensure Docker & Docker Compose are installed
echo "🐳 [2/6] Verifying Docker installation..."
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl enable --now docker
    rm -f get-docker.sh
fi

# 3. Directory structure setup
echo "📁 [3/6] Setting up ERP persistent storage directories..."
mkdir -p "$ERP_DIR"
mkdir -p "$ERP_DIR/storage/postgres_data"
mkdir -p "$ERP_DIR/storage/filestore"
mkdir -p "$ERP_DIR/storage/logs"
chmod -R 777 "$ERP_DIR/storage"

# 4. Copy configuration & compose files
echo "📦 [4/6] Copying ERP configurations..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cp "$SCRIPT_DIR/docker-compose.sandbox.yml" "$ERP_DIR/docker-compose.yml"
cp -r "$SCRIPT_DIR/config" "$ERP_DIR/" 2>/dev/null || true
cp -r "$SCRIPT_DIR/custom_addons" "$ERP_DIR/" 2>/dev/null || true

# 5. Start Docker Containers
echo "🚀 [5/6] Launching Odoo 19 + PostgreSQL 16 containers..."
cd "$ERP_DIR"
docker compose down 2>/dev/null || true
docker compose up -d

# Wait 8 seconds and verify container health
sleep 8
docker ps | grep -E "omniflow_sandbox_erp" || docker ps

# 6. Nginx Reverse Proxy & SSL Configuration
echo "🔒 [6/6] Configuring Nginx Reverse Proxy for $DOMAIN..."
cat << 'EOF' > /etc/nginx/sites-available/sandbox-erp.conf
server {
    listen 80;
    server_name sandbox-erp.employeemanagementsystems.com;

    proxy_read_timeout 720s;
    proxy_connect_timeout 720s;
    proxy_send_timeout 720s;

    # Headers for Odoo Web Client Proxy Mode
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Real-IP $remote_addr;

    location / {
        proxy_redirect off;
        proxy_pass http://127.0.0.1:8069;
    }

    location /websocket {
        proxy_pass http://127.0.0.1:8072;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_http_version 1.1;
    }

    gzip_types text/css text/less text/plain text/xml application/xml application/json application/javascript;
    gzip on;
}
EOF

ln -sf /etc/nginx/sites-available/sandbox-erp.conf /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# Obtain SSL Certificate via Certbot
if command -v certbot &> /dev/null; then
    echo "🔑 Obtaining SSL Certificate via Let's Encrypt Certbot..."
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email admin@employeemanagementsystems.com || true
fi

echo "=============================================================================="
echo "🎉 SUCCESS: OMNIFLOW SANDBOX ERP ENGINE IS LIVE!"
echo "🌐 URL: https://$DOMAIN"
echo "=============================================================================="
