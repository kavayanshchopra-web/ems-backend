#!/bin/bash
# ==============================================================================
# OmniFlow EMS - Enterprise Live ERP (Odoo 19) Domain & SSL Setup
# Production Domain: https://erp.employeemanagementsystems.com
# Instant SSL Bridge: https://api.employeemanagementsystems.com:8443
# ==============================================================================

set -e

DOMAIN="erp.employeemanagementsystems.com"
API_DOMAIN="api.employeemanagementsystems.com"
ERP_DIR="/var/www/omniflow-erp"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=============================================================================="
echo "🚀 STARTING OMNIFLOW LIVE ENTERPRISE ERP DEPLOYMENT"
echo "🌐 Production Subdomain: https://$DOMAIN"
echo "⚡ Instant SSL Bridge:   https://$API_DOMAIN:8443"
echo "=============================================================================="

# ------------------------------------------------------------------------------
# STEP 1: PREPARE STORAGE & DIRECTORIES
# ------------------------------------------------------------------------------
echo "📁 [1/6] Creating ERP storage and logging directories..."
mkdir -p "$ERP_DIR/storage/postgres_data"
mkdir -p "$ERP_DIR/storage/filestore"
mkdir -p "$ERP_DIR/storage/logs"
mkdir -p "$ERP_DIR/config"
chmod -R 777 "$ERP_DIR/storage"

# ------------------------------------------------------------------------------
# STEP 2: CONFIGURE ODOO PRODUCTION CONFIG
# ------------------------------------------------------------------------------
echo "⚙️ [2/6] Writing Odoo 19 production configuration..."
cat > "$ERP_DIR/config/odoo.conf" << 'EOF'
[options]
http_port = 8069
longpolling_port = 8072
proxy_mode = True

workers = 0
max_cron_threads = 1
limit_memory_soft = 805306368
limit_memory_hard = 1073741824
limit_request = 4096
limit_time_cpu = 120
limit_time_real = 240

db_host = postgres
db_port = 5432
db_user = odoo
db_password = odoo_live_secure_pass_2026
db_name = omniflow_erp
db_maxconn = 20

list_db = True
admin_passwd = omniflow_live_master_admin_2026!
data_dir = /var/lib/odoo

logfile = /var/log/odoo/odoo-server.log
log_level = info
EOF

# ------------------------------------------------------------------------------
# STEP 3: CONFIGURE DOCKER COMPOSE WITH RESILIENT BOOT
# ------------------------------------------------------------------------------
echo "🐳 [3/6] Configuring Docker Compose for Odoo 19 + PostgreSQL 16..."
cat > "$ERP_DIR/docker-compose.yml" << 'EOF'
services:
  postgres:
    image: postgres:16-alpine
    container_name: omniflow_erp_db
    restart: unless-stopped
    environment:
      POSTGRES_DB: omniflow_erp
      POSTGRES_USER: odoo
      POSTGRES_PASSWORD: odoo_live_secure_pass_2026
    volumes:
      - ./storage/postgres_data:/var/lib/postgresql/data
    networks:
      - omniflow_erp_net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U odoo -d omniflow_erp || exit 1"]
      interval: 5s
      timeout: 5s
      retries: 15
      start_period: 30s

  odoo:
    image: odoo:19.0
    container_name: omniflow_erp_app
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_started
    ports:
      - "127.0.0.1:8069:8069"
      - "127.0.0.1:8072:8072"
    volumes:
      - ./config/odoo.conf:/etc/odoo/odoo.conf:ro
      - ./storage/filestore:/var/lib/odoo
      - ./storage/logs:/var/log/odoo
    environment:
      - HOST=postgres
      - USER=odoo
      - PASSWORD=odoo_live_secure_pass_2026
    networks:
      - omniflow_erp_net

networks:
  omniflow_erp_net:
    driver: bridge
EOF

# Launch containers
cd "$ERP_DIR"
echo "🚀 Restarting ERP containers..."
docker compose down 2>/dev/null || true
docker compose up -d

# ------------------------------------------------------------------------------
# STEP 4: CONFIGURE FIREWALL FOR PORTS
# ------------------------------------------------------------------------------
echo "🛡️ [4/6] Configuring Firewall rules (80, 443, 8443)..."
if command -v ufw &> /dev/null; then
    ufw allow 80/tcp || true
    ufw allow 443/tcp || true
    ufw allow 8443/tcp || true
fi
iptables -I INPUT -p tcp --dport 8443 -j ACCEPT 2>/dev/null || true

# ------------------------------------------------------------------------------
# STEP 5: CONFIGURE NGINX REVERSE PROXY WITH IFRAME & SSL SUPPORT
# ------------------------------------------------------------------------------
echo "🌐 [5/6] Writing Nginx Virtual Host for Live ERP..."

# Ensure server_names_hash_bucket_size is 128
sed -i 's/# server_names_hash_bucket_size.*/server_names_hash_bucket_size 128;/' /etc/nginx/nginx.conf 2>/dev/null || true
if ! grep -q "server_names_hash_bucket_size" /etc/nginx/nginx.conf; then
    sed -i '/http {/a \    server_names_hash_bucket_size 128;' /etc/nginx/nginx.conf
fi

cat > /etc/nginx/sites-available/omniflow-erp << 'EOF'
# ==============================================================================
# 1. Instant SSL Bridge on api.employeemanagementsystems.com:8443
# Uses the already existing valid Let's Encrypt certificate!
# ==============================================================================
server {
    listen 8443 ssl http2;
    server_name api.employeemanagementsystems.com 66.29.135.156;

    ssl_certificate /etc/letsencrypt/live/api.employeemanagementsystems.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.employeemanagementsystems.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 100M;
    proxy_read_timeout 720s;
    proxy_connect_timeout 720s;
    proxy_send_timeout 720s;

    # Allow embedding inside app.employeemanagementsystems.com
    proxy_hide_header X-Frame-Options;
    proxy_hide_header Content-Security-Policy;
    add_header Content-Security-Policy "frame-ancestors 'self' https://app.employeemanagementsystems.com https://*.employeemanagementsystems.com *" always;

    location /websocket {
        proxy_pass http://127.0.0.1:8072;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header X-Forwarded-Host $host:8443;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        proxy_pass http://127.0.0.1:8069;
        proxy_http_version 1.1;
        proxy_set_header Host $host:8443;
        proxy_set_header X-Forwarded-Host $host:8443;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

# ==============================================================================
# 2. Main Live ERP Subdomain: erp.employeemanagementsystems.com
# Port 80 (Auto-redirects to HTTPS if SSL cert exists)
# ==============================================================================
server {
    listen 80;
    server_name erp.employeemanagementsystems.com;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        proxy_pass http://127.0.0.1:8069;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        proxy_hide_header X-Frame-Options;
        proxy_hide_header Content-Security-Policy;
        add_header Content-Security-Policy "frame-ancestors 'self' https://app.employeemanagementsystems.com https://*.employeemanagementsystems.com *" always;
    }
}
EOF

ln -sf /etc/nginx/sites-available/omniflow-erp /etc/nginx/sites-enabled/omniflow-erp

echo "🔍 Testing Nginx configuration..."
nginx -t
systemctl reload nginx

# ------------------------------------------------------------------------------
# STEP 6: CERTBOT SSL ISSUANCE FOR erp.employeemanagementsystems.com
# ------------------------------------------------------------------------------
echo "🔑 [6/6] Checking DNS and obtaining SSL Certificate for $DOMAIN..."
if host "$DOMAIN" >/dev/null 2>&1 || ping -c 1 "$DOMAIN" >/dev/null 2>&1; then
    echo "✅ DNS is resolved for $DOMAIN! Running Certbot..."
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email admin@employeemanagementsystems.com --redirect || {
        echo "⚠️ Certbot hit a challenge issue, keeping HTTP and Bridge active."
    }
else
    echo "ℹ️ Note: $DOMAIN DNS A Record has not propagated to this server yet."
    echo "👉 Once you add the DNS A Record in Cloudflare/DNS manager:"
    echo "   Run: certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@employeemanagementsystems.com"
fi

systemctl reload nginx 2>/dev/null || true

echo "=============================================================================="
echo "🎉 DEPLOYMENT FINISHED!"
echo "------------------------------------------------------------------------------"
echo "1️⃣  INSTANT LIVE ACCESS (HTTPS with valid SSL - Ready Right Now):"
echo "    👉 https://$API_DOMAIN:8443"
echo ""
echo "2️⃣  PRODUCTION SUBDOMAIN (Ready as soon as DNS A Record is added):"
echo "    👉 https://$DOMAIN"
echo ""
echo "🔑 Master Admin Password: omniflow_live_master_admin_2026!"
echo "=============================================================================="
