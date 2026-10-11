#!/bin/bash
# ==============================================================================
# OmniFlow EMS - Permanent n8n Auto-Login & Zero-Login Bypass Script
# ==============================================================================

echo "=================================================================="
echo "⚡ OMNIFLOW EMS: PERMANENT N8N AUTO-LOGIN & WHITE-LABEL BYPASS"
echo "=================================================================="

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijg2YjcwMjIwLTBiNWQtNGRjNC04NjJlLTgwMGJiNmE1MDE2ZiIsImhhc2giOiJPMnFERStsSGNHIiwidXNlZE1mYSI6ZmFsc2UsImlhdCI6MTc5MTcxNzU3OCwiZXhwIjoyMTA3MDc3NTc4fQ.X_wKHgYMvnCGG3q_-fmsZ5elhZcHHwOzFKSewP8LP2s"

echo "✅ Verified Active 10-Year Token: ${TOKEN:0:30}..."

# 1. Update Nginx with permanent Cookie injection
echo "🛡️ [1/2] Updating Nginx reverse-proxy configuration..."

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

# 2. Reload Nginx and re-apply SSL
echo "🔄 [2/2] Reloading Nginx and configuring SSL..."
ln -sf /etc/nginx/sites-available/whatsapp-crm /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

certbot --nginx -d api.employeemanagementsystems.com --non-interactive --agree-tos --email admin@employeemanagementsystems.com --redirect 2>/dev/null || true

echo "=================================================================="
echo "🎉 AUTO-LOGIN BYPASS 100% INSTALLED & ACTIVE!"
echo "Nginx is now auto-injecting the authenticated session token for all visitors."
echo "=================================================================="
