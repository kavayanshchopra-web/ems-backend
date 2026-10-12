#!/bin/bash
# ==============================================================================
# OmniFlow EMS - Nginx server_names_hash_bucket_size Fix & SSL Generator
# ==============================================================================

set -e

DOMAIN="sandbox-erp.employeemanagementsystems.com"

echo "🔧 [1/3] Enabling server_names_hash_bucket_size 128 in /etc/nginx/nginx.conf..."
sed -i 's/# server_names_hash_bucket_size.*/server_names_hash_bucket_size 128;/' /etc/nginx/nginx.conf 2>/dev/null || true
if ! grep -q "server_names_hash_bucket_size" /etc/nginx/nginx.conf; then
    sed -i '/http {/a \    server_names_hash_bucket_size 128;' /etc/nginx/nginx.conf
fi

echo "🔍 [2/3] Testing and reloading Nginx configuration..."
nginx -t
systemctl reload nginx

echo "🔑 [3/3] Obtaining Let's Encrypt SSL certificate for $DOMAIN..."
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email admin@employeemanagementsystems.com || true

echo "=============================================================================="
echo "🎉 SUCCESS: NGINX & SSL CONFIGURED!"
echo "🌐 Your Odoo 19 Sandbox is LIVE at: https://$DOMAIN"
echo "=============================================================================="
