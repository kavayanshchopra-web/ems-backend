#!/bin/bash
# ==============================================================================
# OmniFlow EMS - VPS Express Backend Restarter & Health Checker
# ==============================================================================
set -e

echo "=================================================================="
echo "⚡ OMNIFLOW EMS: FIX & RESTART EXPRESS BACKEND GATEWAY (PORT 5000)"
echo "=================================================================="

# 1. Locate project directory
APP_DIR=""
for dir in /var/www/whatsapp-crm /root/whatsapp-crm /root/ems-backend /home/whatsapp-crm; do
  if [ -f "$dir/server.js" ]; then
    APP_DIR="$dir"
    break
  fi
done

if [ -z "$APP_DIR" ]; then
  APP_DIR=$(find / -name "server.js" -not -path "*/node_modules/*" 2>/dev/null | head -n 1 | xargs dirname 2>/dev/null)
fi

if [ -z "$APP_DIR" ]; then
  echo "❌ Error: Could not locate server.js directory. Defaulting to /var/www/whatsapp-crm."
  APP_DIR="/var/www/whatsapp-crm"
fi

echo "📁 Target Project Directory: $APP_DIR"
cd "$APP_DIR"

# 2. Pull latest code
echo "📥 [1/4] Pulling latest code from GitHub..."
git pull origin main || git pull || true

# 3. Free port 5000 if occupied by dead/hung process
echo "🧹 [2/4] Ensuring port 5000 is clear..."
fuser -k 5000/tcp 2>/dev/null || true

# 4. Launch with PM2
echo "🚀 [3/4] Starting WhatsApp CRM Gateway with PM2..."
pm2 delete whatsapp-crm-gateway 2>/dev/null || true
pm2 delete server 2>/dev/null || true
pm2 delete all 2>/dev/null || true

if [ -f "ecosystem.config.cjs" ]; then
  pm2 start ecosystem.config.cjs
else
  pm2 start server.js --name "whatsapp-crm-gateway" --env PORT=5000
fi

pm2 save

# 5. Verify local port 5000 and public API
echo "🔍 [4/4] Verifying Express Backend Connectivity..."

ONLINE=0
for i in {1..12}; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5000/api/health || true)
  if [ "$CODE" = "200" ]; then
    echo "✅ Local Port 5000 is UP and responding: HTTP 200 (took ${i}s)"
    ONLINE=1
    break
  fi
  sleep 1
done

if [ "$ONLINE" -eq 0 ]; then
  echo "⚠️ Notice: Port 5000 not responding yet. Checking PM2 error logs:"
  pm2 logs whatsapp-crm-gateway --lines 20 --nostream || true
else
  echo -n "2. Public Sessions API: "
  curl -s -o /dev/null -w "HTTP %{http_code}\n" https://api.employeemanagementsystems.com/api/sessions || true
  echo "=================================================================="
  echo "🎉 EXPRESS BACKEND IS NOW ONLINE & ACCEPTING CONNECTIONS!"
  echo "Ab app.employeemanagementsystems.com par jakar QR scan karein!"
  echo "=================================================================="
fi
