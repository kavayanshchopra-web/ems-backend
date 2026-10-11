import { getPgPool } from './backend/postgresDb.js';

const n8nSchemaSQL = `
-- 1. TENANT N8N WORKFLOW MAPPINGS TABLE
CREATE TABLE IF NOT EXISTS tenant_n8n_mappings (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(100) NOT NULL DEFAULT 'org_default',
  flow_id VARCHAR(100) NOT NULL,
  n8n_workflow_id VARCHAR(100),
  n8n_webhook_path VARCHAR(255),
  n8n_webhook_url TEXT,
  sync_status VARCHAR(50) DEFAULT 'synced',
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  is_active SMALLINT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_tenant_flow UNIQUE (tenant_id, flow_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_n8n_tenant ON tenant_n8n_mappings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_n8n_flow ON tenant_n8n_mappings(flow_id);

-- 2. TENANT AUTOMATION INTEGRATIONS VAULT (Third-party credentials)
CREATE TABLE IF NOT EXISTS tenant_automation_integrations (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(100) NOT NULL DEFAULT 'org_default',
  provider VARCHAR(100) NOT NULL,
  credential_name VARCHAR(255),
  credentials_encrypted TEXT NOT NULL,
  is_active SMALLINT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_tenant_provider UNIQUE (tenant_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_tenant_integrations_tenant ON tenant_automation_integrations(tenant_id);
`;

async function runMigration() {
  console.log('⚡ Applying n8n Multi-Tenant Schema to PostgreSQL...');
  const pool = getPgPool();
  if (!pool) {
    console.error('❌ Could not connect to PostgreSQL pool.');
    process.exit(1);
  }

  try {
    await pool.query(n8nSchemaSQL);
    console.log('✅ Successfully created tenant_n8n_mappings and tenant_automation_integrations tables!');
    
    // Verify tables exist
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('tenant_n8n_mappings', 'tenant_automation_integrations')
    `);
    console.log('📋 Verified Tables:', res.rows.map(r => r.table_name));
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

runMigration();
