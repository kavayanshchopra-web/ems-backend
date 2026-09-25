import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:%28sandbox%40113%29@db.mucgmzldgvtblmsurtgo.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    const fnRes = await client.query(`
      SELECT routine_name, routine_definition 
      FROM information_schema.routines 
      WHERE routine_name = 'authenticate_user'
    `);
    console.log('Function authenticate_user:');
    console.log(fnRes.rows[0]?.routine_definition || 'Not found');

    const uCols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    console.log('\nUsers columns:');
    console.table(uCols.rows);

    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    console.log('\nPublic tables:');
    console.log(tables.rows.map(r => r.table_name).join(', '));
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
