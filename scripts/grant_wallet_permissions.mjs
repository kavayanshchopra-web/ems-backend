import pg from 'pg';

const LIVE_PG_URL = 'postgresql://postgres:%28Kavay%40113%29@db.pdjaajbhrvglwukoacuh.supabase.co:5432/postgres';
const SANDBOX_PG_URL = 'postgresql://postgres:%28sandbox%40113%29@db.mucgmzldgvtblmsurtgo.supabase.co:5432/postgres';

async function grantPermissions(connectionString, label) {
  console.log(`\n=== GRANTING PERMISSIONS ON [${label}] ===`);
  const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  const client = await pool.connect();
  try {
    const sql = `
      -- 1. Grant Schema Usage
      GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
      
      -- 2. Grant table permissions
      GRANT ALL ON TABLE universal_wallets TO anon, authenticated, service_role, postgres;
      GRANT ALL ON TABLE wallet_transactions TO anon, authenticated, service_role, postgres;
      GRANT ALL ON TABLE global_service_rates TO anon, authenticated, service_role, postgres;
      GRANT ALL ON TABLE tenant_rate_overrides TO anon, authenticated, service_role, postgres;
      GRANT ALL ON TABLE wallet_payment_orders TO anon, authenticated, service_role, postgres;
      
      -- Grant across all existing and future tables
      GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
      GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
      GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
      
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

      -- 3. Ensure RLS is disabled on wallet tables so anon can read & write directly via PostgREST
      ALTER TABLE universal_wallets DISABLE ROW LEVEL SECURITY;
      ALTER TABLE wallet_transactions DISABLE ROW LEVEL SECURITY;
      ALTER TABLE global_service_rates DISABLE ROW LEVEL SECURITY;
      ALTER TABLE tenant_rate_overrides DISABLE ROW LEVEL SECURITY;
      ALTER TABLE wallet_payment_orders DISABLE ROW LEVEL SECURITY;
    `;
    await client.query(sql);
    console.log(`✅ Permissions & RLS bypass successfully granted on ${label}`);

    // Quick test: select count
    const wRes = await client.query('SELECT tenant_id, balance, status FROM universal_wallets ORDER BY tenant_id;');
    console.log(`Wallets on ${label}:`, wRes.rows);

    const txRes = await client.query('SELECT count(*) FROM wallet_transactions;');
    console.log(`Transactions count on ${label}:`, txRes.rows[0].count);
  } catch (err) {
    console.error(`❌ Error on ${label}:`, err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

async function run() {
  await grantPermissions(LIVE_PG_URL, 'LIVE Production (pdjaajbhrvglwukoacuh)');
  await grantPermissions(SANDBOX_PG_URL, 'Sandbox (mucgmzldgvtblmsurtgo)');
}

run();
