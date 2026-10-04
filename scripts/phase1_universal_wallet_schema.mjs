import pg from 'pg';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const SANDBOX_PG_URL = 'postgresql://postgres:%28sandbox%40113%29@db.mucgmzldgvtblmsurtgo.supabase.co:5432/postgres';
const LIVE_PG_URL = 'postgresql://postgres:%28Kavay%40113%29@db.pdjaajbhrvglwukoacuh.supabase.co:5432/postgres';

const PG_SCHEMA_SQL = `
-- 1. Universal Wallets Table
CREATE TABLE IF NOT EXISTS universal_wallets (
    tenant_id INT PRIMARY KEY,
    balance NUMERIC(12, 4) NOT NULL DEFAULT 1000.0000,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    min_threshold NUMERIC(12, 4) NOT NULL DEFAULT 1000.0000,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    last_recharged_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Global Service Rates Table (3-Tier WhatsApp + Extensible)
CREATE TABLE IF NOT EXISTS global_service_rates (
    service_key VARCHAR(80) PRIMARY KEY,
    display_name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'WHATSAPP',
    default_rate NUMERIC(10, 4) NOT NULL,
    unit_type VARCHAR(50) NOT NULL DEFAULT 'per_message',
    wholesale_cost NUMERIC(10, 4) NOT NULL DEFAULT 0.0000,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Tenant Rate Overrides (Custom VIP Pricing)
CREATE TABLE IF NOT EXISTS tenant_rate_overrides (
    id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL,
    service_key VARCHAR(80) NOT NULL REFERENCES global_service_rates(service_key) ON DELETE CASCADE,
    custom_rate NUMERIC(10, 4) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, service_key)
);

-- 4. Payment Gateway Orders (Razorpay / Stripe Verified Tracking)
CREATE TABLE IF NOT EXISTS wallet_payment_orders (
    order_id VARCHAR(100) PRIMARY KEY,
    tenant_id INT NOT NULL,
    amount NUMERIC(12, 4) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    gateway VARCHAR(50) NOT NULL DEFAULT 'razorpay',
    payment_id VARCHAR(100),
    signature TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'CREATED',
    balance_credited BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paid_at TIMESTAMPTZ
);

-- 5. Universal Wallet Transactions Ledger (Audit-Proof Double Entry)
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id VARCHAR(100) PRIMARY KEY,
    tenant_id INT NOT NULL,
    service_key VARCHAR(80),
    transaction_type VARCHAR(50) NOT NULL, -- 'DEBIT', 'CREDIT', 'REFUND', 'BONUS'
    amount NUMERIC(12, 4) NOT NULL,
    balance_before NUMERIC(12, 4) NOT NULL,
    balance_after NUMERIC(12, 4) NOT NULL,
    reference_id VARCHAR(150),
    description TEXT,
    trigger_source VARCHAR(80) NOT NULL DEFAULT 'EMS_WEB_CHAT', -- 'EMS_WEB_CHAT', 'EMS_TEMPLATE', 'EMS_BROADCAST', 'GATEWAY_TOPUP', 'SUPERADMIN_ADJUST'
    recipient_phone VARCHAR(50),
    units INT NOT NULL DEFAULT 1,
    rate_applied NUMERIC(10, 4),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for lightning fast lookups
CREATE INDEX IF NOT EXISTS idx_wallet_tx_tenant ON wallet_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_created ON wallet_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_orders_tenant ON wallet_payment_orders(tenant_id);
`;

const DEFAULT_RATES = [
  {
    service_key: 'whatsapp_normal_chat',
    display_name: '1-to-1 Chat Message (EMS Web)',
    category: 'WHATSAPP',
    default_rate: 0.10,
    unit_type: 'per_message',
    wholesale_cost: 0.00
  },
  {
    service_key: 'whatsapp_template_msg',
    display_name: 'Single Template Message',
    category: 'WHATSAPP',
    default_rate: 0.20,
    unit_type: 'per_message',
    wholesale_cost: 0.00
  },
  {
    service_key: 'whatsapp_bulk_broadcast',
    display_name: 'Bulk Campaign Broadcast',
    category: 'WHATSAPP',
    default_rate: 0.30,
    unit_type: 'per_message',
    wholesale_cost: 0.00
  }
];

async function applyPostgreSql(connectionString, name) {
  console.log(`\n--- Applying Universal Wallet Schema to [${name}] ---`);
  const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  const client = await pool.connect();
  try {
    await client.query(PG_SCHEMA_SQL);
    console.log(`✅ Schema created successfully on ${name}`);

    // Seed Rates
    for (const r of DEFAULT_RATES) {
      await client.query(`
        INSERT INTO global_service_rates (service_key, display_name, category, default_rate, unit_type, wholesale_cost, is_active, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, TRUE, NOW())
        ON CONFLICT (service_key) DO UPDATE 
        SET display_name = EXCLUDED.display_name,
            category = EXCLUDED.category,
            default_rate = EXCLUDED.default_rate,
            unit_type = EXCLUDED.unit_type,
            wholesale_cost = EXCLUDED.wholesale_cost,
            updated_at = NOW();
      `, [r.service_key, r.display_name, r.category, r.default_rate, r.unit_type, r.wholesale_cost]);
    }
    console.log(`✅ 3-Tier WhatsApp rates seeded on ${name}`);

    // Ensure Tenant 1 has an active wallet with ₹1,000 balance
    await client.query(`
      INSERT INTO universal_wallets (tenant_id, balance, currency, min_threshold, status, created_at, updated_at)
      VALUES (1, 1500.0000, 'INR', 1000.0000, 'ACTIVE', NOW(), NOW())
      ON CONFLICT (tenant_id) DO NOTHING;
    `);
    console.log(`✅ Tenant 1 Universal Wallet initialized on ${name}`);

    // Verify
    const walletCheck = await client.query('SELECT * FROM universal_wallets WHERE tenant_id = 1;');
    console.log(`Wallet Tenant 1 on ${name}:`, walletCheck.rows[0]);

    const ratesCheck = await client.query('SELECT service_key, display_name, default_rate FROM global_service_rates ORDER BY service_key;');
    console.log(`Rates on ${name}:`, ratesCheck.rows);

  } catch (err) {
    console.error(`❌ Error on ${name}:`, err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

async function applySqlite(filePath) {
  console.log(`\n--- Applying SQLite Fallback to [${filePath}] ---`);
  try {
    const db = await open({ filename: filePath, driver: sqlite3.Database });
    await db.exec(`
      CREATE TABLE IF NOT EXISTS universal_wallets (
          tenant_id INTEGER PRIMARY KEY,
          balance REAL NOT NULL DEFAULT 1000.0,
          currency TEXT NOT NULL DEFAULT 'INR',
          min_threshold REAL NOT NULL DEFAULT 1000.0,
          status TEXT NOT NULL DEFAULT 'ACTIVE',
          last_recharged_at TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS global_service_rates (
          service_key TEXT PRIMARY KEY,
          display_name TEXT NOT NULL,
          category TEXT NOT NULL DEFAULT 'WHATSAPP',
          default_rate REAL NOT NULL,
          unit_type TEXT NOT NULL DEFAULT 'per_message',
          wholesale_cost REAL NOT NULL DEFAULT 0.0,
          is_active INTEGER NOT NULL DEFAULT 1,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS tenant_rate_overrides (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tenant_id INTEGER NOT NULL,
          service_key TEXT NOT NULL,
          custom_rate REAL NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(tenant_id, service_key)
      );

      CREATE TABLE IF NOT EXISTS wallet_payment_orders (
          order_id TEXT PRIMARY KEY,
          tenant_id INTEGER NOT NULL,
          amount REAL NOT NULL,
          currency TEXT NOT NULL DEFAULT 'INR',
          gateway TEXT NOT NULL DEFAULT 'razorpay',
          payment_id TEXT,
          signature TEXT,
          status TEXT NOT NULL DEFAULT 'CREATED',
          balance_credited INTEGER NOT NULL DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          paid_at TEXT
      );

      CREATE TABLE IF NOT EXISTS wallet_transactions (
          id TEXT PRIMARY KEY,
          tenant_id INTEGER NOT NULL,
          service_key TEXT,
          transaction_type TEXT NOT NULL,
          amount REAL NOT NULL,
          balance_before REAL NOT NULL,
          balance_after REAL NOT NULL,
          reference_id TEXT,
          description TEXT,
          trigger_source TEXT NOT NULL DEFAULT 'EMS_WEB_CHAT',
          recipient_phone TEXT,
          units INTEGER NOT NULL DEFAULT 1,
          rate_applied REAL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed rates
    for (const r of DEFAULT_RATES) {
      await db.run(`
        INSERT OR REPLACE INTO global_service_rates (service_key, display_name, category, default_rate, unit_type, wholesale_cost, is_active, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
      `, [r.service_key, r.display_name, r.category, r.default_rate, r.unit_type, r.wholesale_cost]);
    }

    await db.run(`
      INSERT OR IGNORE INTO universal_wallets (tenant_id, balance, currency, min_threshold, status)
      VALUES (1, 1500.0, 'INR', 1000.0, 'ACTIVE')
    `);

    console.log(`✅ SQLite schema & seed applied successfully to ${filePath}`);
    await db.close();
  } catch (err) {
    console.error(`❌ Error on SQLite ${filePath}:`, err.message);
  }
}

async function run() {
  console.log('🚀 STARTING PHASE 1: UNIVERSAL WALLET DATABASE DEPLOYMENT');
  
  // 1. Sandbox Supabase
  await applyPostgreSql(SANDBOX_PG_URL, 'SANDBOX Supabase (mucgmzldgvtblmsurtgo)');

  // 2. Live Supabase
  await applyPostgreSql(LIVE_PG_URL, 'LIVE Supabase (pdjaajbhrvglwukoacuh)');

  // 3. Local SQLite
  await applySqlite('database.sqlite');
  await applySqlite('backend/database.sqlite');

  console.log('\n🎉 PHASE 1 SCHEMA DEPLOYMENT COMPLETE ACROSS ALL ENVIRONMENTS!');
}

run().catch(console.error);
