import pg from 'pg';

const LIVE_CONN = 'postgresql://postgres:%28Kavay%40113%29@db.pdjaajbhrvglwukoacuh.supabase.co:5432/postgres';

async function getLiveDDL() {
  console.log('Fetching DDL of missing tables from Live Supabase (READ ONLY)...');
  const client = new pg.Client({ connectionString: LIVE_CONN, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const tables = [
    'sim_bridge_devices',
    'ghl_entity_links',
    'ghl_field_mappings',
    'ghl_oauth_states',
    'ghl_sync_logs',
    'ghl_trigger_subscriptions',
    'gps_locations',
    'assets',
    'plan_prices',
    'plans'
  ];

  for (const t of tables) {
    const res = await client.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position;
    `, [t]);
    console.log(`\nTable ${t}:`);
    res.rows.forEach(r => {
      console.log(`  ${r.column_name}: ${r.data_type} (default: ${r.column_default}, nullable: ${r.is_nullable})`);
    });
  }

  await client.end();
}

getLiveDDL().catch(console.error);
