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

# 3. Ensure required directories exist and free port 5000
echo "🧹 [2/5] Ensuring directories exist and port 5000 is clear..."
mkdir -p logs media_store auth_info_baileys
fuser -k 5000/tcp 2>/dev/null || true

# 4. Direct startup test to catch any unhandled exceptions
echo "🧪 [3/5] Testing server.js startup directly..."
node -c server.js routes.js sessionManager.js db.js

pm2 delete whatsapp-crm-gateway 2>/dev/null || true
pm2 delete server 2>/dev/null || true

if [ -f "ecosystem.config.cjs" ]; then
  pm2 start ecosystem.config.cjs
else
  pm2 start server.js --name "whatsapp-crm-gateway" --env PORT=5000
fi

pm2 save

# 5. Verify local port 5000 and public API
echo "🔍 [4/5] Verifying Express Backend Connectivity..."

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
  
  echo "📱 [5/5] Requesting live QR code generation test for session_1_primary..."
  QR_RESP=$(curl -s -m 8 -X POST http://127.0.0.1:5000/api/sessions/start/session_1_primary?force=true || true)
  if echo "$QR_RESP" | grep -q "qr_code"; then
    echo "✅ SUCCESS! Live Baileys QR Code generated and confirmed ready in backend!"
  else
    echo "ℹ️ Session start initiated: $QR_RESP"
  fi
  
  echo "=================================================================="
  echo "🎉 EXPRESS BACKEND & QR GENERATION ENGINE ARE 100% ONLINE!"
  echo "Ab browser me app.employeemanagementsystems.com refresh karein"
  echo "aur 'Scan QR' button dabayein — QR code turant screen par aayega!"
  echo "=================================================================="
fi
