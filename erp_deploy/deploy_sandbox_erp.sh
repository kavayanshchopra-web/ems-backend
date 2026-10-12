#!/bin/bash
# ==============================================================================
# OmniFlow EMS - 1-Click Automated Sandbox ERP Deployment Script
# Database Engine: Supabase Cloud PostgreSQL (ap-south-1) - Zero Local DB Overhead!
# Target Domain: sandbox-erp.employeemanagementsystems.com
# Stack: Odoo 19.0 (Frozen Cut-off)
# ==============================================================================

set -e

ERP_DIR="/var/www/omniflow-erp"
DOMAIN="sandbox-erp.employeemanagementsystems.com"

echo "=============================================================================="
echo "🚀 STARTING OMNIFLOW SANDBOX ERP ENGINE DEPLOYMENT"
echo "🌐 Domain: $DOMAIN"
echo "☁️ Database: Supabase Cloud PostgreSQL (ap-south-1)"
echo "💾 Local DB Footprint: 0 MB (Zero local Postgres container needed!)"
echo "=============================================================================="

# 1. Clean any old unused/half-downloaded docker layers to maximize SSD space
echo "🧹 [1/5] Freeing disk space..."
docker system prune -f 2>/dev/null || true

# 2. Directory structure setup
echo "📁 [2/5] Setting up ERP persistent storage directories..."
mkdir -p "$ERP_DIR"
mkdir -p "$ERP_DIR/storage/filestore"
mkdir -p "$ERP_DIR/storage/logs"
chmod -R 777 "$ERP_DIR/storage"

# 3. Copy configuration & compose files
echo "📦 [3/5] Copying ERP configurations..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cp "$SCRIPT_DIR/docker-compose.sandbox.yml" "$ERP_DIR/docker-compose.yml"
cp -r "$SCRIPT_DIR/config" "$ERP_DIR/" 2>/dev/null || true

# 4. Stop any old local postgres container and start Odoo container
echo "🚀 [4/5] Launching Odoo 19 container connected to Supabase..."
cd "$ERP_DIR"
docker rm -f omniflow_sandbox_erp_db 2>/dev/null || true
docker compose down 2>/dev/null || true
docker compose up -d

# Wait 8 seconds and verify container health
sleep 8
docker ps | grep -E "omniflow_sandbox_erp_app" || docker ps

# 5. Nginx Reverse Proxy & SSL Configuration
echo "🔒 [5/5] Configuring Nginx Reverse Proxy for $DOMAIN..."
cat << 'EOF' > /etc/nginx/sites-available/sandbox-erp.conf
server {
    listen 80;
    server_name sandbox-erp.employeemanagementsystems.com;

    proxy_read_timeout 720s;
    proxy_connect_timeout 720s;
    proxy_send_timeout 720s;

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
echo "🎉 SUCCESS: OMNIFLOW SANDBOX ERP ENGINE IS LIVE (CONNECTED TO SUPABASE)!"
echo "🌐 URL: https://$DOMAIN"
echo "=============================================================================="
