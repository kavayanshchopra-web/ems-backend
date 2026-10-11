#!/bin/bash
echo "=== NGINX ERROR LOG (LAST 10 LINES) ==="
tail -n 10 /var/log/nginx/error.log

echo ""
echo "=== DIRECT CURL TO PORT 5678 WITH HEADERS ==="
curl -i http://127.0.0.1:5678/

echo ""
echo "=== DOCKER LOGS (LAST 15 LINES) ==="
docker logs --tail 15 ems-n8n-engine

echo ""
echo "=== PM2 STATUS & LOGS ==="
pm2 list
pm2 logs --lines 10 --nostream || true
