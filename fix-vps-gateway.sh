#!/bin/bash
# ==============================================================================
# OmniFlow EMS - Master Nginx & Automation Engine Auto-Repair Script
# ==============================================================================
set -e

echo "========================================================"
echo "🔍 1. INSPECTING NGINX ERROR LOG FOR 502 CAUSE"
echo "========================================================"
tail -n 15 /var/log/nginx/error.log || true

echo ""
echo "========================================================"
echo "🌐 2. CONFIGURING NGINX REVERSE PROXY FOR /automations-engine/"
echo "========================================================"

# Find active Nginx config file
CONF_FILE=""
if [ -f "/etc/nginx/sites-available/whatsapp-crm" ]; then
    CONF_FILE="/etc/nginx/sites-available/whatsapp-crm"
elif [ -f "/etc/nginx/sites-enabled/whatsapp-crm" ]; then
    CONF_FILE="/etc/nginx/sites-enabled/whatsapp-crm"
elif [ -f "/etc/nginx/sites-available/default" ]; then
    CONF_FILE="/etc/nginx/sites-available/default"
elif [ -f "/etc/nginx/conf.d/default.conf" ]; then
    CONF_FILE="/etc/nginx/conf.d/default.conf"
fi

echo "Active Nginx config target: $CONF_FILE"

# Inject or update /automations-engine/ location block
if [ -n "$CONF_FILE" ]; then
    # Backup original
    cp "$CONF_FILE" "${CONF_FILE}.bak"

    # Check if /automations-engine/ block exists
    if grep -q "location /automations-engine/" "$CONF_FILE"; then
        echo "Updating existing /automations-engine/ block in $CONF_FILE..."
        # Remove old block cleanly and re-insert
        sed -i '/location \/automations-engine\//,/}/d' "$CONF_FILE"
    fi

    # Insert location block right before the main location / block or before the last closing bracket
    sed -i '/location \/ {/i \
    location /automations-engine/ {\
        proxy_pass http://127.0.0.1:5678/;\
        proxy_http_version 1.1;\
        proxy_set_header Upgrade $http_upgrade;\
        proxy_set_header Connection "upgrade";\
        proxy_set_header Host $host;\
        proxy_cache_bypass $http_upgrade;\
        proxy_set_header X-Real-IP $remote_addr;\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\
        proxy_set_header X-Forwarded-Proto $scheme;\
        proxy_buffering off;\
        proxy_read_timeout 86400s;\
    }\
\
    location /webhook/ {\
        proxy_pass http://127.0.0.1:5678/webhook/;\
        proxy_http_version 1.1;\
        proxy_set_header Host $host;\
        proxy_set_header X-Real-IP $remote_addr;\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\
        proxy_set_header X-Forwarded-Proto $scheme;\
        proxy_read_timeout 120s;\
    }\
' "$CONF_FILE"

    echo "Testing Nginx configuration syntax..."
    nginx -t
    systemctl reload nginx || systemctl restart nginx
    echo "✅ Nginx reloaded successfully!"
fi

echo ""
echo "========================================================"
echo "🐳 3. VERIFYING DOCKER N8N CONTAINER"
echo "========================================================"
if ! docker ps | grep -q "ems-n8n-engine"; then
    echo "Starting container ems-n8n-engine..."
    docker rm -f ems-n8n-engine 2>/dev/null || true
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
    sleep 5
fi

docker ps | grep ems-n8n-engine

echo ""
echo "========================================================"
echo "🧪 4. TESTING DIRECT RESPONSES"
echo "========================================================"
echo -n "Port 5678 (Direct n8n): "
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:5678/ || echo "Failed"

echo -n "Nginx Proxy /automations-engine/: "
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1/automations-engine/ || echo "Failed"

echo "========================================================"
echo "🎉 AUTO-REPAIR COMPLETED!"
echo "========================================================"
