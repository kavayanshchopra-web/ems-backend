#!/bin/bash
# ==============================================================================
# OmniFlow EMS - Permanent n8n Auto-Login & Zero-Login Bypass Script
# ==============================================================================
set -e

echo "=================================================================="
echo "⚡ OMNIFLOW EMS: PERMANENT N8N AUTO-LOGIN & WHITE-LABEL BYPASS"
echo "=================================================================="

ADMIN_EMAIL="admin@employeemanagementsystems.com"
ADMIN_PASS="OmniFlowAdmin2026!"
ADMIN_FIRST="OmniFlow"
ADMIN_LAST="Admin"

# 1. Ensure directories exist
mkdir -p /var/ems_n8n_data
chmod -R 777 /var/ems_n8n_data
chown -R 1000:1000 /var/ems_n8n_data 2>/dev/null || true

# 2. Restart Docker Container with 10-Year JWT Lifespan
echo "🐳 [1/5] Starting container with extended session duration..."
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
  -e N8N_USER_MANAGEMENT_JWT_DURATION_HOURS=87600 \
  -e N8N_USER_MANAGEMENT_JWT_REFRESH_TIMEOUT_HOURS=87600 \
  -e WEBHOOK_URL=https://app.employeemanagementsystems.com \
  -v /var/ems_n8n_data:/home/node/.n8n \
  --restart unless-stopped \
  n8nio/n8n:latest

echo "⏳ Waiting 6 seconds for n8n engine to initialize..."
sleep 6

# 3. Reset User Management to allow clean automated owner setup
echo "🔑 [2/5] Resetting user management to ensure fresh owner config..."
docker exec -u node ems-n8n-engine n8n user-management:reset 2>/dev/null || true
sleep 2

# 4. Perform Setup or Login to acquire permanent JWT session token
echo "🔐 [3/5] Setting up system admin and acquiring session token..."
SETUP_RESP=$(curl -s -i -X POST http://127.0.0.1:5678/rest/owner/setup \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"firstName\":\"$ADMIN_FIRST\",\"lastName\":\"$ADMIN_LAST\",\"password\":\"$ADMIN_PASS\"}")

TOKEN=$(echo "$SETUP_RESP" | grep -i "Set-Cookie:" | grep "n8n-auth=" | sed -e 's/.*n8n-auth=\([^;]*\).*/\1/' | tr -d '\r\n')

if [ -z "$TOKEN" ]; then
  echo "⚠️ Setup did not return cookie, attempting login directly..."
  LOGIN_RESP=$(curl -s -i -X POST http://127.0.0.1:5678/rest/login \
    -H "Content-Type: application/json" \
    -d "{\"emailOrLdapLoginId\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}")
  TOKEN=$(echo "$LOGIN_RESP" | grep -i "Set-Cookie:" | grep "n8n-auth=" | sed -e 's/.*n8n-auth=\([^;]*\).*/\1/' | tr -d '\r\n')
fi

if [ -z "$TOKEN" ]; then
  echo "❌ Error: Could not obtain n8n-auth token automatically."
  exit 1
fi

echo "✅ SUCCESS: Acquired permanent n8n session token (${#TOKEN} chars)."

# 5. Inject Token into Nginx Reverse Proxy for 100% Zero-Login Experience
echo "🛡️ [4/5] Injecting auth token into Nginx reverse proxy..."

cat > /etc/nginx/sites-available/whatsapp-crm << EOL
# OmniFlow EMS Master Nginx Configuration with Zero-Login n8n Injection
server {
    listen 80;
    server_name api.employeemanagementsystems.com;

    # Gzip Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # 1. Direct Webhook Ingestion Route
    location /webhook/ {
        proxy_pass http://127.0.0.1:5678/webhook/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
    }

    # 2. White-Labeled Automation Studio Reverse Proxy (Force Auth Injected)
    location /automations-engine/ {
        proxy_pass http://127.0.0.1:5678/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # 🚀 SERVER-SIDE PERMANENT AUTH INJECTION (Bypasses Login Form for everyone)
        proxy_set_header Cookie "n8n-auth=$TOKEN";

        # 🛡️ Frame headers for seamless embedding
        proxy_hide_header X-Frame-Options;
        add_header X-Frame-Options "ALLOWALL" always;
        add_header Content-Security-Policy "frame-ancestors 'self' https://app.employeemanagementsystems.com http://localhost:*;" always;
    }

    # 3. Automation Studio REST Endpoints (Force Auth Injected)
    location /rest/ {
        proxy_pass http://127.0.0.1:5678/rest/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # 🚀 SERVER-SIDE PERMANENT AUTH INJECTION
        proxy_set_header Cookie "n8n-auth=$TOKEN";

        proxy_hide_header X-Frame-Options;
        add_header X-Frame-Options "ALLOWALL" always;
        add_header Content-Security-Policy "frame-ancestors 'self' https://app.employeemanagementsystems.com http://localhost:*;" always;
    }

    # 4. Automation Studio Static Assets
    location /assets/ {
        proxy_pass http://127.0.0.1:5678/assets/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_hide_header X-Frame-Options;
        add_header X-Frame-Options "ALLOWALL" always;
        add_header Content-Security-Policy "frame-ancestors 'self' https://app.employeemanagementsystems.com http://localhost:*;" always;
    }

    # 5. Main Express Backend & WebSocket Gateway
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

        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
EOL

# 6. Test and Reload Nginx + SSL
echo "🔄 [5/5] Reloading Nginx and verifying SSL..."
ln -sf /etc/nginx/sites-available/whatsapp-crm /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# Re-apply certbot SSL certificates
certbot --nginx -d api.employeemanagementsystems.com --non-interactive --agree-tos --email admin@employeemanagementsystems.com --redirect || true

echo "=================================================================="
echo "🎉 AUTO-LOGIN BYPASS COMPLETE!"
echo "Testing verification call to /rest/users/me..."
VERIFY_ME=$(curl -s https://api.employeemanagementsystems.com/rest/users/me)
echo "Verification Result: $VERIFY_ME"
echo "=================================================================="
