#!/bin/bash
# ==============================================================================
# OmniFlow EMS - Subpath Asset Fix for Embedded Automation Studio
# ==============================================================================
set -e

echo "========================================================"
echo "⚡ STEP 1: UPDATING NGINX TO PRESERVE /automations-engine/ PATH"
echo "========================================================"
sed -i 's|proxy_pass http://127.0.0.1:5678/;|proxy_pass http://127.0.0.1:5678;|g' /etc/nginx/sites-available/whatsapp-crm || true
nginx -t
systemctl reload nginx
echo "✅ Nginx updated and reloaded!"

echo "========================================================"
echo "⚡ STEP 2: RESTARTING N8N DOCKER WITH N8N_PATH SUBPATH CONFIG"
echo "========================================================"
docker rm -f ems-n8n-engine 2>/dev/null || true

docker run -d \
  --name ems-n8n-engine \
  -p 127.0.0.1:5678:5678 \
  -e N8N_HOST=0.0.0.0 \
  -e N8N_PORT=5678 \
  -e N8N_PATH=/automations-engine/ \
  -e N8N_EDITOR_BASE_URL=https://app.employeemanagementsystems.com/automations-engine/ \
  -e WEBHOOK_URL=https://app.employeemanagementsystems.com/automations-engine/ \
  -e N8N_USER_MANAGEMENT_DISABLED=true \
  -e N8N_PERSONALIZATION_ENABLED=false \
  -e N8N_DIAGNOSTICS_ENABLED=false \
  -e N8N_VERSION_NOTIFICATIONS_ENABLED=false \
  -e N8N_HIRING_BANNER_ENABLED=false \
  -e N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=false \
  -v /var/ems_n8n_data:/home/node/.n8n \
  --restart unless-stopped \
  n8nio/n8n:latest

echo "Waiting for engine startup..."
sleep 8

echo "========================================================"
echo "⚡ STEP 3: VERIFYING ASSET LINKS"
echo "========================================================"
curl -s http://127.0.0.1:5678/automations-engine/ | grep -E "automations-engine/assets|<title>" || true

echo "========================================================"
echo "🎉 SUBPATH RECONFIGURATION COMPLETED!"
echo "========================================================"
