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
  let paramIndex = 1;
  let converted = sql.replace(/\?/g, () => `$${paramIndex++}`);
  
  converted = converted.replace(/CURRENT_TIMESTAMP/gi, 'NOW()');
  converted = converted.replace(/DATETIME\('now'\)/gi, 'NOW()');
  converted = converted.replace(/\bDATETIME\b/gi, 'TIMESTAMPTZ');
  
  if (/INSERT\s+OR\s+IGNORE\s+INTO/i.test(converted)) {
    converted = converted.replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, 'INSERT INTO');
    if (!/ON\s+CONFLICT/i.test(converted)) {
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
    return res.rows[0] || null;
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
