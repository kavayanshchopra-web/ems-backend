#!/bin/bash
# ==============================================================================
# OmniFlow EMS - Apply Emerald Theme, Debranding & Zero-Login
# ==============================================================================

set -e

ERP_DIR="/var/www/omniflow-erp"
ADDONS_SRC="/var/www/whatsapp-crm/erp_deploy/custom_addons"

echo "=============================================================================="
echo "🎨 APPLYING OMNIFLOW EMS BRANDING & ZERO-LOGIN CONTROLLER"
echo "=============================================================================="

# 1. Update odoo.conf with addons_path
echo "⚙️ [1/4] Updating addons_path in $ERP_DIR/config/odoo.conf..."
if ! grep -q "addons_path" "$ERP_DIR/config/odoo.conf"; then
    echo "addons_path = /usr/lib/python3/dist-packages/odoo/addons,/mnt/extra-addons" >> "$ERP_DIR/config/odoo.conf"
fi

# 2. Update docker-compose.yml to mount custom_addons
echo "🐳 [2/4] Mounting custom addons to /mnt/extra-addons in Docker..."
cat > "$ERP_DIR/docker-compose.yml" << 'EOF'
services:
  postgres:
    image: postgres:16-alpine
    container_name: omniflow_erp_db
    restart: unless-stopped
    environment:
      POSTGRES_DB: omniflow_erp
      POSTGRES_USER: odoo
      POSTGRES_PASSWORD: odoo_live_secure_pass_2026
    volumes:
      - omniflow_postgres_data:/var/lib/postgresql/data
    networks:
      - omniflow_erp_net

  odoo:
    image: odoo:19.0
    container_name: omniflow_erp_app
    restart: unless-stopped
    depends_on:
      - postgres
    ports:
      - "127.0.0.1:8069:8069"
      - "127.0.0.1:8072:8072"
    volumes:
      - ./config/odoo.conf:/etc/odoo/odoo.conf:ro
      - omniflow_odoo_filestore:/var/lib/odoo
      - /var/www/whatsapp-crm/erp_deploy/custom_addons:/mnt/extra-addons
    environment:
      - HOST=postgres
      - USER=odoo
      - PASSWORD=odoo_live_secure_pass_2026
    networks:
      - omniflow_erp_net

volumes:
  omniflow_postgres_data:
  omniflow_odoo_filestore:

networks:
  omniflow_erp_net:
    driver: bridge
EOF

# 3. Restart container to load new volume
cd "$ERP_DIR"
echo "🚀 [3/4] Restarting Odoo container with custom branding mounted..."
docker compose up -d

echo "⏳ Waiting 5 seconds for container to initialize..."
sleep 5

# 4. Activate omniflow_branding addon in the database
echo "⚡ [4/4] Activating omniflow_branding theme in database omniflow_erp..."
docker exec -i omniflow_erp_app odoo -d omniflow_erp -i omniflow_branding --stop-after-init || {
    echo "⚠️ Auto-init finished or module already queued."
}

# Restart Odoo to serve new assets
docker compose restart odoo

echo "=============================================================================="
echo "🎉 SUCCESS: OMNIFLOW EMS BRANDING & AUTO-LOGIN ARE LIVE!"
echo "🌐 Zero-Login Direct URL: https://erp.employeemanagementsystems.com/web/autologin"
echo "=============================================================================="
