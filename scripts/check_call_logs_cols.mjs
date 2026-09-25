import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:%28sandbox%40113%29@db.mucgmzldgvtblmsurtgo.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function checkCallLogsColumns() {
  const res = await pool.query(`
    SELECT column_name, is_nullable, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'call_logs'
    ORDER BY ordinal_position;
  `);
  console.log(res.rows);
  await pool.end();
}

checkCallLogsColumns();
