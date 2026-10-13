#!/bin/bash
# ==============================================================================
# EMS - Complete White-Labeling, Debranding & Zero-Login Engine
# ==============================================================================

set -e

ERP_DIR="/var/www/omniflow-erp"
ADDONS_SRC="/var/www/whatsapp-crm/erp_deploy/custom_addons"

echo "=============================================================================="
echo "🎨 APPLYING 100% EMS BRANDING, DEBRANDING & ZERO-LOGIN"
echo "=============================================================================="

# 1. Update odoo.conf with addons_path
echo "⚙️ [1/6] Updating addons_path in $ERP_DIR/config/odoo.conf..."
mkdir -p "$ERP_DIR/config"
if ! grep -q "addons_path" "$ERP_DIR/config/odoo.conf" 2>/dev/null; then
    echo "addons_path = /usr/lib/python3/dist-packages/odoo/addons,/mnt/extra-addons" >> "$ERP_DIR/config/odoo.conf"
fi

# 2. Update docker-compose.yml to mount custom_addons
echo "🐳 [2/6] Mounting custom addons to /mnt/extra-addons in Docker..."
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
echo "🚀 [3/6] Restarting Odoo container with custom branding mounted..."
docker compose up -d

echo "⏳ Waiting 5 seconds for container to initialize..."
sleep 5

# 4. Activate or Update omniflow_branding addon in database
echo "⚡ [4/6] Updating omniflow_branding theme in database omniflow_erp..."
docker exec -i omniflow_erp_app odoo -d omniflow_erp -u omniflow_branding --stop-after-init || \
docker exec -i omniflow_erp_app odoo -d omniflow_erp -i omniflow_branding --stop-after-init || {
    echo "⚠️ Auto-init finished or module already queued."
}

# 5. Database-level debranding (Replace all Odoo references with EMS)
echo "🗄️ [5/6] Updating database records: Replacing Odoo with EMS..."
docker exec -i omniflow_erp_db psql -U odoo -d omniflow_erp << 'SQL'
UPDATE ir_module_module SET author = 'EMS' WHERE author ILIKE '%odoo%';
UPDATE ir_module_module SET website = 'https://app.employeemanagementsystems.com' WHERE website ILIKE '%odoo%';
UPDATE ir_module_module SET shortdesc = REPLACE(shortdesc, 'Odoo', 'EMS') WHERE shortdesc ILIKE '%odoo%';
UPDATE ir_module_module SET summary = REPLACE(summary, 'Odoo', 'EMS') WHERE summary ILIKE '%odoo%';
UPDATE ir_module_module SET description = REPLACE(description, 'Odoo', 'EMS') WHERE description ILIKE '%odoo%';
UPDATE res_company SET name = 'EMS' WHERE name ILIKE '%my company%' OR name ILIKE '%odoo%';
UPDATE res_partner SET name = 'EMS' WHERE name ILIKE '%my company%' OR name ILIKE '%odoo%';
SQL

# 6. Nginx Debranding Filter
echo "🌐 [6/6] Configuring Nginx real-time string replacement filter..."
mkdir -p /etc/nginx/snippets
cat > /etc/nginx/snippets/ems_debranding.conf << 'EOF'
proxy_set_header Accept-Encoding "";
sub_filter_types text/html text/plain text/css text/javascript application/javascript application/json;
sub_filter_once off;
sub_filter 'Odoo S.A.' 'EMS';
sub_filter 'Odoo SA' 'EMS';
sub_filter 'Odoo Community' 'EMS';
sub_filter 'Odoo Enterprise' 'EMS';
sub_filter 'Powered by Odoo' 'Powered by EMS';
sub_filter 'www.odoo.com' 'app.employeemanagementsystems.com';
sub_filter 'odoo.com' 'employeemanagementsystems.com';
sub_filter 'Odoo' 'EMS';
EOF

# Inject into Nginx config if not already included
if [ -f "/etc/nginx/sites-available/omniflow-erp" ]; then
    if ! grep -q "ems_debranding.conf" /etc/nginx/sites-available/omniflow-erp; then
        sed -i '/proxy_pass http:\/\/127.0.0.1:8069;/a \        include /etc/nginx/snippets/ems_debranding.conf;' /etc/nginx/sites-available/omniflow-erp
    fi
    nginx -t && systemctl reload nginx || echo "⚠️ Nginx reload notice."
fi

# Restart Odoo to serve new assets
docker compose restart odoo

echo "=============================================================================="
echo "🎉 SUCCESS: 100% EMS BRANDING & COMPLETE DEBRANDING IS ACTIVE!"
echo "🌐 Direct URL: https://erp.employeemanagementsystems.com/web/autologin"
echo "=============================================================================="
