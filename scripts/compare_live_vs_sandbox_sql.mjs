import pg from 'pg';

const LIVE_CONN = 'postgresql://postgres:%28Kavay%40113%29@db.pdjaajbhrvglwukoacuh.supabase.co:5432/postgres';
const SANDBOX_CONN = 'postgresql://postgres:%28sandbox%40113%29@db.mucgmzldgvtblmsurtgo.supabase.co:5432/postgres';

async function compareSchemas() {
  console.log('Comparing Live Supabase vs Sandbox Supabase schemas (READ ONLY)...');

  const liveClient = new pg.Client({ connectionString: LIVE_CONN, ssl: { rejectUnauthorized: false } });
  const sandboxClient = new pg.Client({ connectionString: SANDBOX_CONN, ssl: { rejectUnauthorized: false } });

  try {
    await liveClient.connect();
    await sandboxClient.connect();

    const q = `
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public'
      ORDER BY table_name, column_name;
    `;

    const liveRes = await liveClient.query(q);
    const sandboxRes = await sandboxClient.query(q);

    const liveMap = new Map();
    for (const row of liveRes.rows) {
      if (!liveMap.has(row.table_name)) liveMap.set(row.table_name, new Map());
      liveMap.get(row.table_name).set(row.column_name, row.data_type);
    }

    const sandboxMap = new Map();
    for (const row of sandboxRes.rows) {
      if (!sandboxMap.has(row.table_name)) sandboxMap.set(row.table_name, new Map());
      sandboxMap.get(row.table_name).set(row.column_name, row.data_type);
    }

    console.log(`\nLive Total Tables: ${liveMap.size}`);
    console.log(`Sandbox Total Tables: ${sandboxMap.size}`);

    // Tables in Live missing in Sandbox
    const missingTablesInSandbox = [];
    for (const tableName of liveMap.keys()) {
      if (!sandboxMap.has(tableName)) {
        missingTablesInSandbox.push(tableName);
      }
    }

    console.log('\n--- TABLES IN LIVE BUT MISSING IN SANDBOX ---');
    console.log(missingTablesInSandbox.length ? missingTablesInSandbox : 'None (All live tables present in sandbox)');

    // Columns in Live missing in Sandbox
    console.log('\n--- COLUMNS IN LIVE BUT MISSING IN SANDBOX ---');
    let missingColCount = 0;
    for (const [table, cols] of liveMap.entries()) {
      if (sandboxMap.has(table)) {
        const sbCols = sandboxMap.get(table);
        const diffCols = [];
        for (const [col, type] of cols.entries()) {
          if (!sbCols.has(col)) {
            diffCols.push(`${col} (${type})`);
            missingColCount++;
          }
        }
        if (diffCols.length > 0) {
          console.log(`Table [${table}]: missing columns -> ${diffCols.join(', ')}`);
        }
      }
    }
    if (missingColCount === 0) {
      console.log('None! All columns from Live exist in Sandbox.');
    }

    // Tables in Sandbox not in Live (e.g. newly created telephony tables)
    const extraInSandbox = [];
    for (const tableName of sandboxMap.keys()) {
      if (!liveMap.has(tableName)) {
        extraInSandbox.push(tableName);
      }
    }
    console.log('\n--- TABLES IN SANDBOX (NOT IN LIVE YET) ---');
    console.log(extraInSandbox.join(', '));

  } finally {
    await liveClient.end().catch(() => {});
    await sandboxClient.end().catch(() => {});
  }
}

compareSchemas().catch(console.error);
