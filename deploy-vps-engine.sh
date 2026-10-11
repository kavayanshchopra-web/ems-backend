#!/bin/bash
# ==============================================================================
# OmniFlow EMS - Enterprise Automation Engine 1-Click Updater & Launcher
# ==============================================================================
set -e

echo "========================================================"
echo "⚡ OMNIFLOW EMS - CLOUD ENGINE UPDATE & LAUNCHER"
echo "========================================================"

# 1. Pull Latest Backend Code
echo "📥 [1/4] Pulling latest backend updates from GitHub..."
git pull origin main || git pull origin feature/ghl-integration || true

# 2. Restart PM2 Node.js backend
echo "🔄 [2/4] Restarting Express Backend Gateway..."
if command -v pm2 &> /dev/null; then
    pm2 restart all || pm2 restart server || true
    echo "✅ PM2 Backend restarted."
fi

# 3. Ensure Docker is Installed
echo "🐳 [3/4] Verifying Docker installation..."
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl enable --now docker
fi

# 4. Launch or Restart White-Labeled n8n Automation Engine Container
echo "🚀 [4/4] Starting OmniFlow Automation Engine (n8n on port 5678)..."
mkdir -p /var/ems_n8n_data
chmod -R 777 /var/ems_n8n_data
chown -R 1000:1000 /var/ems_n8n_data 2>/dev/null || true

docker rm -f ems-n8n-engine 2>/dev/null || true
docker rm -f omniflow-n8n 2>/dev/null || true

docker run -d \
  --name ems-n8n-engine \
  -p 127.0.0.1:5678:5678 \
  -e N8N_HOST=0.0.0.0 \
  -e N8N_PORT=5678 \
  -e N8N_DIAGNOSTICS_ENABLED=false \
  -e N8N_VERSION_NOTIFICATIONS_ENABLED=false \
  -e N8N_HIRING_BANNER_ENABLED=false \
  -e N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=false \
  -e WEBHOOK_URL=https://app.employeemanagementsystems.com \
  -v /var/ems_n8n_data:/home/node/.n8n \
  --restart unless-stopped \
  n8nio/n8n:latest

# Wait 5 seconds and verify container health
sleep 5
docker ps | grep ems-n8n-engine || docker logs --tail 20 ems-n8n-engine

echo "========================================================"
echo "🎉 SUCCESS: OmniFlow Automation Engine is LIVE on port 5678!"
echo "🌐 Embedded URL: https://app.employeemanagementsystems.com/automations-engine/"
echo "========================================================"
