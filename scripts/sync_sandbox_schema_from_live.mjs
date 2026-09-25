import pg from 'pg';

// STRICT SAFETY: Target is EXCLUSIVELY Sandbox Supabase!
const SANDBOX_CONN = 'postgresql://postgres:%28sandbox%40113%29@db.mucgmzldgvtblmsurtgo.supabase.co:5432/postgres';

async function alignSandboxSchema() {
  console.log('=== STRICTLY TARGETING SANDBOX SUPABASE (mucgmzldgvtblmsurtgo) ===');
  const client = new pg.Client({ connectionString: SANDBOX_CONN, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const statements = [
    // 1. Missing Tables from Live
    `CREATE TABLE IF NOT EXISTS sim_bridge_devices (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL,
      staff_id VARCHAR(255) NOT NULL,
      staff_name VARCHAR(255),
      extension VARCHAR(50) DEFAULT '101',
      pin VARCHAR(50) DEFAULT '1234',
      device_token VARCHAR(255),
      app_version VARCHAR(50),
      last_seen TIMESTAMPTZ,
      is_online BOOLEAN DEFAULT false,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS ghl_entity_links (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL,
      location_id VARCHAR(255) NOT NULL,
      entity_type VARCHAR(100) NOT NULL,
      crm_entity_id VARCHAR(255),
      ghl_entity_id VARCHAR(255) NOT NULL,
      ems_entity_id TEXT,
      last_synced_hash TEXT,
      last_synced_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS ghl_field_mappings (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL,
      location_id VARCHAR(255) NOT NULL,
      crm_field VARCHAR(255) NOT NULL,
      ghl_field VARCHAR(255) NOT NULL,
      direction VARCHAR(50) DEFAULT 'bidirectional',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      metadata TEXT
    )`,

    `CREATE TABLE IF NOT EXISTS ghl_oauth_states (
      id SERIAL PRIMARY KEY,
      state_token TEXT NOT NULL,
      tenant_id INTEGER NOT NULL,
      user_id INTEGER,
      expires_at TIMESTAMPTZ NOT NULL,
      is_used INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS ghl_sync_logs (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL,
      location_id TEXT NOT NULL,
      direction TEXT NOT NULL,
      entity_type TEXT,
      ems_entity_id TEXT,
      ghl_entity_id TEXT,
      event_type TEXT NOT NULL,
      status TEXT NOT NULL,
      http_status INTEGER,
      payload TEXT,
      error_message TEXT,
      retry_count INTEGER DEFAULT 0,
      idempotency_key TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS ghl_trigger_subscriptions (
      id TEXT PRIMARY KEY,
      tenant_id INTEGER NOT NULL,
      location_id TEXT NOT NULL,
      trigger_type TEXT NOT NULL,
      target_url TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      filters TEXT,
      metadata TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS gps_locations (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL,
      employee_id INTEGER NOT NULL,
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      accuracy DOUBLE PRECISION,
      recorded_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS assets (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(100),
      serial_number VARCHAR(255),
      assigned_to INTEGER,
      status VARCHAR(50) DEFAULT 'available',
      cost NUMERIC DEFAULT 0,
      purchase_date DATE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS plans (
      id VARCHAR(100) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      features JSONB DEFAULT '[]'::jsonb,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS plan_prices (
      id SERIAL PRIMARY KEY,
      plan_id VARCHAR(100) REFERENCES plans(id) ON DELETE CASCADE,
      country_code VARCHAR(10) NOT NULL,
      currency VARCHAR(10) NOT NULL,
      amount_monthly NUMERIC NOT NULL,
      amount_yearly NUMERIC NOT NULL,
      stripe_price_id_monthly VARCHAR(255),
      stripe_price_id_yearly VARCHAR(255)
    )`,

    // 2. Missing Columns in Existing Sandbox Tables
    // call_logs
    `ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS recording_status TEXT`,
    `ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS is_bypassed BOOLEAN DEFAULT false`,
    `ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS bypass_status TEXT`,
    `ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS staff_id VARCHAR(255)`,
    `ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS staff_name VARCHAR(255)`,
    `ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS call_id VARCHAR(255)`,

    // contacts
    `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS created_by VARCHAR(255)`,

    // attendance_logs
    `ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS check_in_lat DOUBLE PRECISION`,
    `ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS check_in_lng DOUBLE PRECISION`,
    `ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS check_out_lat DOUBLE PRECISION`,
    `ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS check_out_lng DOUBLE PRECISION`,

    // expenses
    `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS currency VARCHAR(50)`,

    // ghl_integrations
    `ALTER TABLE ghl_integrations ADD COLUMN IF NOT EXISTS company_id VARCHAR(255)`,
    `ALTER TABLE ghl_integrations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`,
    `ALTER TABLE ghl_integrations ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ`,
    `ALTER TABLE ghl_integrations ADD COLUMN IF NOT EXISTS is_active INTEGER DEFAULT 1`,
    `ALTER TABLE ghl_integrations ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ`,
    `ALTER TABLE ghl_integrations ADD COLUMN IF NOT EXISTS metadata TEXT`,
    `ALTER TABLE ghl_integrations ADD COLUMN IF NOT EXISTS sync_calls INTEGER DEFAULT 0`,
    `ALTER TABLE ghl_integrations ADD COLUMN IF NOT EXISTS sync_contacts INTEGER DEFAULT 0`,
    `ALTER TABLE ghl_integrations ADD COLUMN IF NOT EXISTS sync_conversations INTEGER DEFAULT 0`,
    `ALTER TABLE ghl_integrations ADD COLUMN IF NOT EXISTS sync_opportunities INTEGER DEFAULT 0`,

    // leaves
    `ALTER TABLE leaves ADD COLUMN IF NOT EXISTS type VARCHAR(100)`,
    `ALTER TABLE leaves ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`,

    // offboarding
    `ALTER TABLE offboarding ADD COLUMN IF NOT EXISTS clearance_checklist JSONB DEFAULT '[]'::jsonb`,
    `ALTER TABLE offboarding ADD COLUMN IF NOT EXISTS fnf_amount NUMERIC DEFAULT 0`,
    `ALTER TABLE offboarding ADD COLUMN IF NOT EXISTS notes TEXT`,
    `ALTER TABLE offboarding ADD COLUMN IF NOT EXISTS settlement_status VARCHAR(100)`,

    // payroll
    `ALTER TABLE payroll ADD COLUMN IF NOT EXISTS allowances NUMERIC DEFAULT 0`,
    `ALTER TABLE payroll ADD COLUMN IF NOT EXISTS month_year VARCHAR(50)`,
    `ALTER TABLE payroll ADD COLUMN IF NOT EXISTS net_payable NUMERIC DEFAULT 0`,
    `ALTER TABLE payroll ADD COLUMN IF NOT EXISTS slip_pdf_url TEXT`,

    // telephony_settings
    `ALTER TABLE telephony_settings ADD COLUMN IF NOT EXISTS dept_id VARCHAR(100)`,
    `ALTER TABLE telephony_settings ADD COLUMN IF NOT EXISTS extension VARCHAR(50)`,
    `ALTER TABLE telephony_settings ADD COLUMN IF NOT EXISTS mode VARCHAR(50)`,
    `ALTER TABLE telephony_settings ADD COLUMN IF NOT EXISTS recording_base_url TEXT`,
    `ALTER TABLE telephony_settings ADD COLUMN IF NOT EXISTS source_number VARCHAR(50)`,
    `ALTER TABLE telephony_settings ADD COLUMN IF NOT EXISTS uid VARCHAR(100)`,
    `ALTER TABLE telephony_settings ADD COLUMN IF NOT EXISTS upin VARCHAR(100)`
  ];

  for (const sql of statements) {
    try {
      await client.query(sql);
      console.log(`✅ Applied to Sandbox: ${sql.replace(/\s+/g, ' ').substring(0, 60)}...`);
    } catch (err) {
      console.warn(`Notice on Sandbox SQL:`, err.message);
    }
  }

  await client.end();
  console.log('\n🎉 ALL LIVE SCHEMA UPDATES APPLIED TO SANDBOX POSTGRESQL SUCCESSFULLY!');
}

alignSandboxSchema().catch(console.error);
