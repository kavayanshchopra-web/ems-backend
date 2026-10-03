import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:%28sandbox%40113%29@db.mucgmzldgvtblmsurtgo.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function runPhase1Migration() {
  console.log('========================================================');
  console.log('🚀 EXECUTING PHASE 1: SANDBOX POSTGRESQL 17 TELEPHONY SCHEMA');
  console.log('Target: omniflow-sandbox (db.mucgmzldgvtblmsurtgo.supabase.co)');
  console.log('Live Production: 100% UNTOUCHED');
  console.log('========================================================\n');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Create telephony_settings table
    console.log('[1/4] Creating/Verifying telephony_settings table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS telephony_settings (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER UNIQUE NOT NULL,
        provider VARCHAR(50) DEFAULT 'sim_runo',
        auth_id VARCHAR(255),
        auth_token VARCHAR(255),
        caller_id VARCHAR(50),
        allowed_extensions TEXT,
        calling_mode VARCHAR(50) DEFAULT 'browser_webrtc',
        default_agent_mobile VARCHAR(50),
        default_extension VARCHAR(50),
        is_enabled INTEGER DEFAULT 1,
        monthly_quota_minutes INTEGER DEFAULT 1000,
        rate_per_minute NUMERIC(10, 2) DEFAULT 0.75,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        custom_fields JSONB DEFAULT '{}'::jsonb
      );
    `);
    console.log('✅ telephony_settings verified.');

    // 2. Enrich call_logs with cost and billed_amount for Dynamic Reporting Engine
    console.log('[2/2] Enriching call_logs with cost and billed_amount columns for Reporting Engine...');
    await client.query(`
      ALTER TABLE call_logs 
        ADD COLUMN IF NOT EXISTS cost NUMERIC(10, 4) DEFAULT 0.0000,
        ADD COLUMN IF NOT EXISTS billed_amount NUMERIC(10, 2) DEFAULT 0.00;
      CREATE INDEX IF NOT EXISTS idx_call_logs_tenant_created ON call_logs(tenant_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_call_logs_agent_created ON call_logs(agent_id, created_at);
    `);
    console.log('✅ call_logs reporting columns verified.');

    // 3. Seed default Sandbox tenant (tenant_id = 1) if not present
    console.log('Seeding initial Sandbox telephony settings for Tenant 1...');
    await client.query(`
      INSERT INTO telephony_settings (tenant_id, provider, caller_id, rate_per_minute, calling_mode)
      VALUES (1, 'sim_runo', '918031496345', 0.75, 'mobile_to_mobile')
      ON CONFLICT (tenant_id) DO UPDATE 
      SET provider = EXCLUDED.provider,
          calling_mode = EXCLUDED.calling_mode;
    `);
    console.log('✅ Seed data initialized for Sandbox Tenant 1.');

    await client.query('COMMIT');
    console.log('\n🎉 PHASE 1 SCHEMA MIGRATION COMPLETED SUCCESSFULLY IN SANDBOX POSTGRESQL 17!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Phase 1 Migration Failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runPhase1Migration().catch(console.error);
