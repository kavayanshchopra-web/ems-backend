import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    console.log('1. Checking and updating call_logs table schema in Supabase PostgreSQL...');
    await client.query(`
      ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS is_bypassed BOOLEAN DEFAULT FALSE;
      ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS bypass_status TEXT;
      ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS recording_status TEXT;
    `);
    console.log('✅ Columns added successfully to call_logs table!');

    console.log('2. Reloading PostgREST schema cache...');
    await client.query(`NOTIFY pgrst, 'reload schema';`);
    console.log('✅ PostgREST schema cache reload notification sent!');

    console.log('3. Verifying updated columns in call_logs...');
    const cols = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'call_logs'
      ORDER BY ordinal_position;
    `);
    console.table(cols.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('❌ Error fixing schema:', err);
  process.exit(1);
});
