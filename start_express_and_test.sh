#!/bin/bash
echo "=== 1. STARTING / RESTARTING PM2 BACKEND ==="
pm2 restart all || pm2 start server.js --name whatsapp-crm-gateway
sleep 3

echo ""
echo "=== 2. TESTING AUTOMATIONS-ENGINE STATUS ==="
curl -k -s -o /dev/null -w "HTTPS automations-engine HTTP Code: %{http_code}\n" https://api.employeemanagementsystems.com/automations-engine/

echo ""
echo "=== 3. TESTING API HEALTH STATUS ==="
curl -k -s -o /dev/null -w "HTTPS api/health HTTP Code: %{http_code}\n" https://api.employeemanagementsystems.com/api/health
