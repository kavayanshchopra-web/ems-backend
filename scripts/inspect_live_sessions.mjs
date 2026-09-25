import pg from 'pg';

const sandboxPool = new pg.Pool({
  connectionString: 'postgresql://postgres:%28sandbox%40113%29@db.mucgmzldgvtblmsurtgo.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

const livePool = new pg.Pool({
  connectionString: 'postgresql://postgres:%28kavyansh%40113%29@db.pdjaajbhrvglwukoacuh.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log('=== CHECKING SANDBOX DB (mucgmzldgvtblmsurtgo) ===');
  try {
    const sUsers = await sandboxPool.query(`SELECT id, email, role, tenant_id FROM users WHERE LOWER(email) LIKE '%ghl%' OR LOWER(email) LIKE '%113%'`);
    console.log('Sandbox Users:');
    console.table(sUsers.rows);

    const sSessions = await sandboxPool.query(`SELECT * FROM user_active_device_sessions`);
    console.log('Sandbox Active Sessions:');
    console.table(sSessions.rows);
  } catch (err) {
    console.error('Sandbox error:', err.message);
  }

  console.log('\n=== CHECKING LIVE DB (pdjaajbhrvglwukoacuh) ===');
  try {
    const lUsers = await livePool.query(`SELECT id, email, role, tenant_id FROM users WHERE LOWER(email) LIKE '%ghl%' OR LOWER(email) LIKE '%113%'`);
    console.log('Live Users:');
    console.table(lUsers.rows);

    const checkTable = await livePool.query(`
      SELECT table_name FROM information_schema.tables WHERE table_name = 'user_active_device_sessions'
    `);
    console.log('Live has user_active_device_sessions table?', checkTable.rows.length > 0);

    if (checkTable.rows.length > 0) {
      const lSessions = await livePool.query(`SELECT * FROM user_active_device_sessions`);
      console.log('Live Active Sessions:');
      console.table(lSessions.rows);
    }
  } catch (err) {
    console.error('Live error:', err.message);
  } finally {
    await sandboxPool.end();
    await livePool.end();
  }
}

main().catch(console.error);
