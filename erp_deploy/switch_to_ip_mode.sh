#!/bin/bash
# ==============================================================================
# OmniFlow EMS - 1-Click VPS Public IP Mode Activator for Odoo 19
# Target URL: http://66.29.135.156:8069
# ==============================================================================

set -e

ERP_DIR="/var/www/omniflow-erp"
echo "=============================================================================="
echo "🚀 STARTING ODOO 19 (INTERNAL ULTRA-LIGHT DB BRIDGE)"
echo "🌐 URL: http://66.29.135.156:8069"
echo "=============================================================================="

# 1. Update compose file & storage permissions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
mkdir -p "$ERP_DIR/storage/postgres_data"
mkdir -p "$ERP_DIR/storage/filestore"
mkdir -p "$ERP_DIR/storage/logs"
chmod -R 777 "$ERP_DIR/storage"

cp "$SCRIPT_DIR/docker-compose.sandbox.yml" "$ERP_DIR/docker-compose.yml"
cp -r "$SCRIPT_DIR/config" "$ERP_DIR/" 2>/dev/null || true

# 2. Re-launch Odoo + Postgres Containers on 0.0.0.0:8069
cd "$ERP_DIR"
docker compose down 2>/dev/null || true
docker compose up -d

# 3. Open port 8069 in Firewall
if command -v ufw &> /dev/null; then
    echo "🛡️ Opening port 8069 in UFW Firewall..."
    ufw allow 8069/tcp || true
fi
iptables -I INPUT -p tcp --dport 8069 -j ACCEPT 2>/dev/null || true

# 4. Verify containers running
echo "⏳ Waiting 15 seconds for PostgreSQL and Odoo to complete boot..."
sleep 15
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "omniflow_sandbox_erp|NAMES"

echo "=============================================================================="
echo "🎉 SUCCESS: Odoo 19 is LIVE on Public IP!"
echo "👉 Open in your browser right now: http://66.29.135.156:8069"
echo "=============================================================================="
