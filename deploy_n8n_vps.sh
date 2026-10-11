#!/bin/bash
# ==============================================================================
# OmniFlow EMS - 1-Click n8n Docker Setup & Memory Optimization for VPS
# Target: api.employeemanagementsystems.com
# ==============================================================================

set -e

echo "=============================================================================="
echo "🚀 DEPLOYING OMNIFLOW N8N AUTOMATION CLUSTER"
echo "=============================================================================="

# 1. Ensure Docker & Docker Compose are installed
if ! command -v docker &> /dev/null; then
    echo "📦 [1/4] Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl enable docker
    systemctl start docker
    rm -f get-docker.sh
else
    echo "✅ [1/4] Docker is already installed."
fi

# 2. Setup Persistent Storage Directory with correct permissions
echo "📁 [2/4] Setting up persistent data directory at /var/n8n_data..."
mkdir -p /var/n8n_data
# n8n container runs as user 'node' (UID 1000)
chown -R 1000:1000 /var/n8n_data
chmod -R 775 /var/n8n_data

# 3. Pull official n8n image and launch container
echo "⚡ [3/4] Pulling and launching ems-n8n-engine container..."
docker rm -f ems-n8n-engine >/dev/null 2>&1 || true

docker run -d \
  --name ems-n8n-engine \
  --restart unless-stopped \
  -p 127.0.0.1:5678:5678 \
  -e N8N_HOST=0.0.0.0 \
  -e N8N_PORT=5678 \
  -e N8N_PROTOCOL=https \
  -e NODE_ENV=production \
  -e WEBHOOK_URL=https://api.employeemanagementsystems.com/webhook/ \
  -e GENERIC_TIMEZONE=Asia/Kolkata \
  -e TZ=Asia/Kolkata \
  -e NODE_OPTIONS="--max-old-space-size=350" \
  -e EXECUTIONS_DATA_PRUNE=true \
  -e EXECUTIONS_DATA_MAX_AGE=168 \
  -e EXECUTIONS_DATA_PRUNE_MAX_COUNT=50000 \
  -e N8N_METRICS=false \
  -e N8N_DIAGNOSTICS_ENABLED=false \
  -e N8N_HIRING_BANNER_ENABLED=false \
  -e N8N_VERSION_NOTIFICATIONS_ENABLED=false \
  -e N8N_ENCRYPTION_KEY="omniflow_ems_master_n8n_vault_secret_2026" \
  --memory=512m \
  -v /var/n8n_data:/home/node/.n8n \
  n8nio/n8n:latest

# 4. Verify Container Health
sleep 5
if docker ps | grep -q ems-n8n-engine; then
    echo "=============================================================================="
    echo "🎉 SUCCESS: OmniFlow n8n Engine is RUNNING!"
    echo "🔗 Internal Endpoint: http://127.0.0.1:5678"
    echo "💾 Memory Footprint: Capped at 350-512 MB (Safe for 5GB Swap)"
    echo "🛡️ Status: Protected behind localhost (Nginx ready)"
    echo "=============================================================================="
else
    echo "❌ ERROR: Container failed to start. Run 'docker logs ems-n8n-engine' to inspect."
    exit 1
fi
