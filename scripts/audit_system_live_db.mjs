import pg from 'pg';

const LIVE_DB_URL = 'postgresql://postgres:%28Kavay%40113%29@db.pdjaajbhrvglwukoacuh.supabase.co:5432/postgres';

async function auditLiveDatabase() {
  const pool = new pg.Pool({
    connectionString: LIVE_DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  const client = await pool.connect();
  try {
    console.log('--- 1. Tables in Public Schema ---');
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    const tables = tablesRes.rows.map(r => r.table_name);
    console.log('Total Tables:', tables.length);
    console.log('Tables:', tables.join(', '));

    console.log('\n--- 2. GHL Integrations Table ---');
    if (tables.includes('ghl_integrations')) {
      const ghlRes = await client.query(`SELECT id, tenant_id, location_id, is_active, created_at, updated_at FROM ghl_integrations LIMIT 10`);
      console.log('Total GHL Integrations:', ghlRes.rows.length);
      console.log(ghlRes.rows);
    } else {
      console.log('❌ ghl_integrations table NOT FOUND in Live DB!');
    }

    console.log('\n--- 3. GHL Entity Links Table ---');
    if (tables.includes('ghl_entity_links')) {
      const linksRes = await client.query(`SELECT count(*) FROM ghl_entity_links`);
      console.log('GHL Entity Links count:', linksRes.rows[0].count);
    } else {
      console.log('❌ ghl_entity_links table NOT FOUND in Live DB!');
    }

    console.log('\n--- 4. Active Device Sessions Table ---');
    if (tables.includes('user_active_device_sessions')) {
      const devRes = await client.query(`SELECT id, tenant_id, user_id, device_type, device_name, last_heartbeat FROM user_active_device_sessions`);
      console.log('Active Device Sessions:', devRes.rows.length);
      console.log(devRes.rows);
    }

    console.log('\n--- 5. Call Logs Summary ---');
    if (tables.includes('call_logs')) {
      const callRes = await client.query(`SELECT count(*), max(created_at) FROM call_logs`);
      console.log('Total Calls in Live DB:', callRes.rows[0].count, 'Latest:', callRes.rows[0].max);
    }

    console.log('\n--- 6. Contacts Summary ---');
    if (tables.includes('contacts')) {
      const contactRes = await client.query(`SELECT count(*), count(distinct tenant_id) as tenants FROM contacts`);
      console.log('Total Contacts:', contactRes.rows[0].count, 'Across Tenants:', contactRes.rows[0].tenants);
    }

    console.log('\n--- 7. Tenants Summary ---');
    if (tables.includes('tenants')) {
      const tenantRes = await client.query(`SELECT id, company_name, subscription_status FROM tenants LIMIT 10`);
      console.log('Tenants:', tenantRes.rows);
    }
  } catch (err) {
    console.error('Audit Error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

auditLiveDatabase();
