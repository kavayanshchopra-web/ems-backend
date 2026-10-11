#!/bin/bash
echo "=== 1. DOCKER PS ==="
docker ps -a | grep ems-n8n-engine || true

echo "=== 2. DOCKER LOGS ==="
docker logs --tail 30 ems-n8n-engine || true

echo "=== 3. NGINX ERROR LOG ==="
tail -n 10 /var/log/nginx/error.log || true
