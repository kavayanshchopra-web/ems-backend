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

    // 2. Create telephony_wallets table
    console.log('[2/4] Creating/Verifying telephony_wallets table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS telephony_wallets (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER UNIQUE NOT NULL,
        balance NUMERIC(12, 2) DEFAULT 1000.00,
        currency VARCHAR(10) DEFAULT 'INR',
        auto_recharge_enabled BOOLEAN DEFAULT false,
        auto_recharge_threshold NUMERIC(10, 2) DEFAULT 500.00,
        auto_recharge_amount NUMERIC(10, 2) DEFAULT 2000.00,
        payment_mandate_id VARCHAR(255),
        status VARCHAR(50) DEFAULT 'ACTIVE',
        last_recharged_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        metadata JSONB DEFAULT '{}'::jsonb
      );
    `);
    console.log('✅ telephony_wallets verified.');

    // 3. Create telephony_wallet_transactions table
    console.log('[3/4] Creating/Verifying telephony_wallet_transactions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS telephony_wallet_transactions (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL,
        call_id VARCHAR(255),
        type VARCHAR(50) NOT NULL,
        amount NUMERIC(10, 2) NOT NULL,
        balance_after NUMERIC(12, 2) NOT NULL,
        description TEXT,
        agent_id VARCHAR(100),
        agent_name VARCHAR(255),
        duration_seconds INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_wallet_tx_tenant_id ON telephony_wallet_transactions(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_wallet_tx_created_at ON telephony_wallet_transactions(created_at);
    `);
    console.log('✅ telephony_wallet_transactions verified.');

    // 4. Enrich call_logs with cost and billed_amount for Dynamic Reporting Engine
    console.log('[4/4] Enriching call_logs with cost and billed_amount columns for Reporting Engine...');
    await client.query(`
      ALTER TABLE call_logs 
        ADD COLUMN IF NOT EXISTS cost NUMERIC(10, 4) DEFAULT 0.0000,
        ADD COLUMN IF NOT EXISTS billed_amount NUMERIC(10, 2) DEFAULT 0.00;
      CREATE INDEX IF NOT EXISTS idx_call_logs_tenant_created ON call_logs(tenant_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_call_logs_agent_created ON call_logs(agent_id, created_at);
    `);
    console.log('✅ call_logs reporting columns verified.');

    // 5. Seed default Sandbox tenant (tenant_id = 1) if not present
    console.log('Seeding initial Sandbox telephony settings for Tenant 1...');
    await client.query(`
      INSERT INTO telephony_settings (tenant_id, provider, caller_id, rate_per_minute, calling_mode)
      VALUES (1, 'plivo', '918031496345', 0.75, 'browser_webrtc')
      ON CONFLICT (tenant_id) DO UPDATE 
      SET provider = EXCLUDED.provider,
          calling_mode = EXCLUDED.calling_mode;

      INSERT INTO telephony_wallets (tenant_id, balance, currency, auto_recharge_enabled, status)
      VALUES (1, 2500.00, 'INR', true, 'ACTIVE')
      ON CONFLICT (tenant_id) DO NOTHING;
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
