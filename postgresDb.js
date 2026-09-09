import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
let pool = null;

export function getPgPool() {
  if (!pool && process.env.DATABASE_URL) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    });
    pool.on('error', (err) => {
      console.error('[PostgreSQL Pool Background Error]', err.message);
    });
  }
  return pool;
}

export function convertSqliteToPostgres(sql) {
  // Handle SQLite PRAGMA table_info
  const pragmaMatch = sql.match(/PRAGMA\s+table_info\s*\(\s*['"]?([a-zA-Z0-9_]+)['"]?\s*\)/i);
  if (pragmaMatch) {
    return `SELECT column_name AS name, data_type AS type FROM information_schema.columns WHERE table_name = '${pragmaMatch[1].toLowerCase()}'`;
  }
  if (/^\s*PRAGMA\s+/i.test(sql)) {
    return 'SELECT 1';
  }

  let paramIndex = 1;
  let converted = sql.replace(/\?/g, () => `$${paramIndex++}`);
  
  converted = converted.replace(/CURRENT_TIMESTAMP/gi, 'NOW()');
  converted = converted.replace(/DATETIME\('now'\)/gi, 'NOW()');
  converted = converted.replace(/\bDATETIME\b/gi, 'TIMESTAMPTZ');
  converted = converted.replace(/\browid\b/gi, 'id');
  converted = converted.replace(/WHEN\s+\$(\d+)\s+IS\s+NOT\s+NULL/gi, (m, p1) => `WHEN $${p1}::text IS NOT NULL`);
  
  if (/INSERT\s+OR\s+IGNORE\s+INTO/i.test(converted)) {
    converted = converted.replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, 'INSERT INTO');
    if (!/ON\s+CONFLICT/i.test(converted)) {
      converted += ' ON CONFLICT DO NOTHING';
    }
  }

  if (/INSERT\s+OR\s+REPLACE\s+INTO/i.test(converted)) {
    converted = converted.replace(/INSERT\s+OR\s+REPLACE\s+INTO/gi, 'INSERT INTO');
    if (/ghl_entity_links/i.test(converted) && !/ON\s+CONFLICT/i.test(converted)) {
      converted += ' ON CONFLICT (location_id, entity_type, ems_entity_id) DO UPDATE SET ghl_entity_id = EXCLUDED.ghl_entity_id, last_synced_hash = EXCLUDED.last_synced_hash, last_synced_at = NOW()';
    } else if (/messages/i.test(converted) && !/ON\s+CONFLICT/i.test(converted)) {
      converted += ' ON CONFLICT (id) DO UPDATE SET text_content = EXCLUDED.text_content, status = EXCLUDED.status, is_read = EXCLUDED.is_read';
    } else if (/lid_mappings/i.test(converted) && !/ON\s+CONFLICT/i.test(converted)) {
      converted += ' ON CONFLICT (lid) DO UPDATE SET pn = EXCLUDED.pn';
    } else if (/webhook_logs/i.test(converted) && !/ON\s+CONFLICT/i.test(converted)) {
      converted += ' ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload';
    } else if (!/ON\s+CONFLICT/i.test(converted)) {
      converted += ' ON CONFLICT DO NOTHING';
    }
  }

  return converted;
}

export const postgresAdapter = {
  isPostgres: true,
  async get(sql, params = []) {
    const pgSql = convertSqliteToPostgres(sql);
    const res = await getPgPool().query(pgSql, params);
    return res.rows[0];
  },
  async all(sql, params = []) {
    const pgSql = convertSqliteToPostgres(sql);
    const res = await getPgPool().query(pgSql, params);
    return res.rows;
  },
  async run(sql, params = []) {
    let pgSql = convertSqliteToPostgres(sql);
    const isInsert = /^\s*INSERT\s+INTO/i.test(pgSql);
    let originalSql = pgSql;
    if (isInsert && !/RETURNING/i.test(pgSql)) {
      pgSql += ' RETURNING id';
    }
    try {
      const res = await getPgPool().query(pgSql, params);
      return {
        lastID: res.rows[0]?.id || null,
        changes: res.rowCount
      };
    } catch (err) {
      if (isInsert && (err.message.includes('column "id" does not exist') || err.code === '42703')) {
        const res = await getPgPool().query(originalSql, params);
        return { lastID: null, changes: res.rowCount };
      }
      throw err;
    }
  },
  async exec(sql) {
    const pgSql = convertSqliteToPostgres(sql);
    return await getPgPool().query(pgSql);
  }
};
