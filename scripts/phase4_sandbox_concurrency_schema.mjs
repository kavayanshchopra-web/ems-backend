import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:%28sandbox%40113%29@db.mucgmzldgvtblmsurtgo.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function runPhase4Migration() {
  console.log('========================================================');
  console.log('🚀 EXECUTING PHASE 4: SHARED DID & CONCURRENCY SCHEMA');
  console.log('Target: omniflow-sandbox (db.mucgmzldgvtblmsurtgo.supabase.co)');
  console.log('Live Production: 100% UNTOUCHED');
  console.log('========================================================\n');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Enrich telephony_settings with Concurrency & Inbound Routing columns
    console.log('[1/3] Adding Concurrency & Inbound Routing settings...');
    await client.query(`
      ALTER TABLE telephony_settings
        ADD COLUMN IF NOT EXISTS inbound_routing_strategy VARCHAR(50) DEFAULT 'sticky_agent',
        ADD COLUMN IF NOT EXISTS ring_timeout INTEGER DEFAULT 25,
        ADD COLUMN IF NOT EXISTS fallback_greeting TEXT DEFAULT 'Thank you for calling. All our executives are currently busy. We will call you back shortly.',
        ADD COLUMN IF NOT EXISTS max_concurrency INTEGER DEFAULT 50,
        ADD COLUMN IF NOT EXISTS assigned_agent_ids JSONB DEFAULT '[]'::jsonb;
    `);
    console.log('✅ telephony_settings enriched with routing & concurrency fields.');

    // 2. Create agent_telephony_presence table for multi-agent WebRTC routing
    console.log('[2/3] Creating agent_telephony_presence table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS agent_telephony_presence (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL,
        agent_id VARCHAR(100) NOT NULL,
        agent_name VARCHAR(255),
        sip_endpoint VARCHAR(255),
        is_online BOOLEAN DEFAULT true,
        is_busy BOOLEAN DEFAULT false,
        last_seen TIMESTAMPTZ DEFAULT NOW(),
        last_call_at TIMESTAMPTZ,
        metadata JSONB DEFAULT '{}'::jsonb,
        UNIQUE(tenant_id, agent_id)
      );
      CREATE INDEX IF NOT EXISTS idx_agent_presence_lookup 
        ON agent_telephony_presence(tenant_id, is_online, is_busy);
    `);
    console.log('✅ agent_telephony_presence table & indexes created.');

    // 3. Seed demo agents for Tenant 1 to demonstrate 1-DID-to-Multiple-Agents sharing
    console.log('[3/3] Seeding demo agents into agent_telephony_presence for Tenant 1...');
    await client.query(`
      INSERT INTO agent_telephony_presence (tenant_id, agent_id, agent_name, sip_endpoint, is_online, is_busy)
      VALUES 
        (1, 'agent_101', 'Rahul Sharma (Sales)', 'sip:agent_101@phone.plivo.com', true, false),
        (1, 'agent_102', 'Pooja Verma (Support)', 'sip:agent_102@phone.plivo.com', true, false),
        (1, 'agent_103', 'Amit Patel (Retention)', 'sip:agent_103@phone.plivo.com', true, false)
      ON CONFLICT (tenant_id, agent_id) DO UPDATE 
      SET agent_name = EXCLUDED.agent_name, is_online = true, is_busy = false, last_seen = NOW();
    `);

    // Update telephony_settings for Tenant 1 to include these agents
    await client.query(`
      UPDATE telephony_settings 
      SET 
        inbound_routing_strategy = 'sticky_agent',
        ring_timeout = 25,
        max_concurrency = 50,
        assigned_agent_ids = '["agent_101", "agent_102", "agent_103"]'::jsonb
      WHERE tenant_id = 1;
    `);
    console.log('✅ Tenant 1 configured with 3 agents sharing DID 918031496345.');

    await client.query('COMMIT');
    console.log('\n========================================================');
    console.log('🎉 PHASE 4 DATABASE SCHEMA & SEEDING COMPLETED SUCCESSFULLY');
    console.log('========================================================');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runPhase4Migration();
