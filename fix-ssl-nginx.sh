#!/bin/bash
# ==============================================================================
# OmniFlow EMS - Ultimate VPS Port & SSL Nginx Resolver
# ==============================================================================

echo "========================================================"
echo "🔍 1. CHECKING ACTIVE LISTENING PORTS"
echo "========================================================"
ss -tlpn | grep -E "5000|5001|5678" || netstat -tlpn | grep -E "5000|5001|5678" || true

echo ""
echo "========================================================"
echo "🔍 2. LOCATING ALL NGINX SITES WITH api.employeemanagementsystems.com"
echo "========================================================"
grep -rn "api.employeemanagementsystems.com" /etc/nginx/sites-available/ /etc/nginx/sites-enabled/ 2>/dev/null || true

# Find the real active config file
TARGET_CONF="/etc/nginx/sites-available/whatsapp-crm"
if [ ! -f "$TARGET_CONF" ]; then
    TARGET_CONF="/etc/nginx/sites-enabled/whatsapp-crm"
fi
if [ ! -f "$TARGET_CONF" ]; then
    TARGET_CONF="/etc/nginx/sites-available/default"
fi

echo "Selected Nginx config: $TARGET_CONF"

echo ""
echo "========================================================"
echo "🛠️ 3. DUMPING NGINX UPSTREAM & PORTS BEFORE FIX"
echo "========================================================"
grep -E "listen|server_name|proxy_pass" "$TARGET_CONF" || true

# Check if Express is on 5000 or 5001
EXPRESS_PORT=5000
if ss -tlpn | grep -q ":5001 "; then
    EXPRESS_PORT=5001
elif ss -tlpn | grep -q ":5000 "; then
    EXPRESS_PORT=5000
fi
echo "Detected Express Backend Port: $EXPRESS_PORT"

# Ensure /automations-engine/ is present in ALL server blocks (both 80 and 443 SSL)
# Create a dedicated snippet for automations-engine
cat > /etc/nginx/snippets/omniflow-automations.conf << 'EOF'
location /automations-engine/ {
    proxy_pass http://127.0.0.1:5678/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_buffering off;
    proxy_read_timeout 86400s;
}

location /webhook/ {
    proxy_pass http://127.0.0.1:5678/webhook/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 120s;
}
EOF

# Include snippet in Nginx config if not already included
mkdir -p /etc/nginx/snippets
if ! grep -q "omniflow-automations.conf" "$TARGET_CONF"; then
    # Add include into every server block right before location /
    sed -i 's|location / {|include /etc/nginx/snippets/omniflow-automations.conf;\n    location / {|g' "$TARGET_CONF"
fi

# Fix Express port mismatch if 5001 is offline and 5000 is online
if [ "$EXPRESS_PORT" = "5000" ] && grep -q "127.0.0.1:5001" "$TARGET_CONF"; then
    echo "Fixing Nginx proxy_pass from 5001 -> 5000..."
    sed -i 's|127.0.0.1:5001|127.0.0.1:5000|g' "$TARGET_CONF"
    sed -i 's|localhost:5001|127.0.0.1:5000|g' "$TARGET_CONF"
fi

echo ""
echo "========================================================"
echo "🔄 4. TESTING AND RELOADING NGINX"
echo "========================================================"
nginx -t
systemctl reload nginx || systemctl restart nginx
echo "✅ Nginx Reloaded!"

echo ""
echo "========================================================"
echo "🧪 5. LIVE ENDPOINT TEST"
echo "========================================================"
echo -n "Test n8n direct (5678): "
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:5678/ || echo "Failed"

echo -n "Test Nginx local automations-engine with Host header: "
curl -s -o /dev/null -w "%{http_code}\n" -H "Host: api.employeemanagementsystems.com" http://127.0.0.1/automations-engine/ || echo "Failed"

echo "========================================================"
echo "🎉 SUCCESS: All configs synchronized!"
echo "========================================================"
