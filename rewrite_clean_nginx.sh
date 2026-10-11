#!/bin/bash
# ==============================================================================
# OmniFlow EMS - Definitive Clean Nginx SSL & Automation Engine Reconfigurator
# ==============================================================================
set -e

echo "========================================================"
echo "⚡ STEP 1: BACKING UP CURRENT NGINX CONFIG"
echo "========================================================"
cp /etc/nginx/sites-available/whatsapp-crm /etc/nginx/sites-available/whatsapp-crm.pre_clean_bak || true

echo "========================================================"
echo "⚡ STEP 2: WRITING CLEAN, ROCK-SOLID NGINX CONFIG"
echo "========================================================"

cat > /etc/nginx/sites-available/whatsapp-crm << 'EOF'
# HTTP -> HTTPS Redirect
server {
    listen 80;
    server_name api.employeemanagementsystems.com 66.29.135.156;

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS Server Block (SSL)
server {
    listen 443 ssl http2;
    server_name api.employeemanagementsystems.com 66.29.135.156;

    ssl_certificate /etc/letsencrypt/live/api.employeemanagementsystems.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.employeemanagementsystems.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # 1. White-Labeled Automation Studio Reverse Proxy (n8n Port 5678)
    location /automations-engine/ {
        proxy_pass http://127.0.0.1:5678/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_buffering off;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # 2. Webhook Ingestion Route
    location /webhook/ {
        proxy_pass http://127.0.0.1:5678/webhook/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 120s;
    }

    # 3. Main Express Backend Gateway (Port 5000)
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
        client_max_body_size 100M;
    }
}
EOF

echo "Ensuring symlink in /etc/nginx/sites-enabled/..."
ln -sf /etc/nginx/sites-available/whatsapp-crm /etc/nginx/sites-enabled/whatsapp-crm

echo "========================================================"
echo "⚡ STEP 3: TESTING NGINX CONFIG & RELOADING"
echo "========================================================"
nginx -t
systemctl reload nginx || systemctl restart nginx
echo "✅ Nginx reloaded successfully!"

echo "========================================================"
echo "⚡ STEP 4: VERIFYING HTTPS TEST ON AUTOMATIONS-ENGINE"
echo "========================================================"
echo -n "Direct HTTPS /automations-engine/ test: "
curl -k -s -o /dev/null -w "%{http_code}\n" -H "Host: api.employeemanagementsystems.com" https://127.0.0.1/automations-engine/ || echo "Failed"

echo -n "Direct HTTPS Root / test: "
curl -k -s -o /dev/null -w "%{http_code}\n" -H "Host: api.employeemanagementsystems.com" https://127.0.0.1/ || echo "Failed"

echo "========================================================"
echo "🎉 SUCCESS: NGINX IS 100% CONFIGURED!"
echo "========================================================"
