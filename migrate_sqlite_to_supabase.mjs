import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  console.log('🚀 Starting SQLite to Supabase PostgreSQL Data Migration...');
  const sqliteDb = await open({ filename: 'database.sqlite', driver: sqlite3.Database });
  const pgClient = await pgPool.connect();

  try {
    // 1. Migrate Tenants
    const tenants = await sqliteDb.all('SELECT * FROM tenants ORDER BY id ASC');
    console.log(`Migrating ${tenants.length} tenants...`);
    for (const t of tenants) {
      await pgClient.query(`
        INSERT INTO tenants (id, company_name, subscription_status, plan_id, stripe_customer_id, created_at)
        VALUES ($1, $2, $3, $4, $5, COALESCE($6::timestamptz, NOW()))
        ON CONFLICT (id) DO UPDATE SET 
          company_name = EXCLUDED.company_name,
          subscription_status = EXCLUDED.subscription_status;
      `, [t.id, t.company_name, t.subscription_status || 'active', t.plan_id || 'starter', t.stripe_customer_id || null, t.created_at || null]);
    }
    await pgClient.query(`SELECT setval('tenants_id_seq', (SELECT GREATEST(MAX(id), 1) FROM tenants));`);

    // 2. Migrate Tenant Settings
    const settings = await sqliteDb.all('SELECT * FROM tenant_settings');
    console.log(`Migrating ${settings.length} tenant_settings...`);
    for (const s of settings) {
      const stages = s.pipeline_stages ? (typeof s.pipeline_stages === 'string' ? JSON.parse(s.pipeline_stages) : s.pipeline_stages) : [];
      const tags = s.tags ? (typeof s.tags === 'string' ? JSON.parse(s.tags) : s.tags) : [];
      await pgClient.query(`
        INSERT INTO tenant_settings (tenant_id, pipeline_stages, tags)
        VALUES ($1, $2::jsonb, $3::jsonb)
        ON CONFLICT (tenant_id) DO UPDATE SET 
          pipeline_stages = EXCLUDED.pipeline_stages,
          tags = EXCLUDED.tags;
      `, [s.tenant_id, JSON.stringify(stages), JSON.stringify(tags)]);
    }

    // 3. Migrate WhatsApp Sessions
    const sessions = await sqliteDb.all('SELECT * FROM whatsapp_sessions');
    console.log(`Migrating ${sessions.length} whatsapp_sessions...`);
    for (const ws of sessions) {
      await pgClient.query(`
        INSERT INTO whatsapp_sessions (id, tenant_id, phone_name, phone_number, status, qr_code, profile_pic_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET 
          status = EXCLUDED.status,
          phone_number = EXCLUDED.phone_number,
          profile_pic_url = EXCLUDED.profile_pic_url;
      `, [ws.id, ws.tenant_id || 1, ws.phone_name, ws.phone_number || null, ws.status || 'disconnected', ws.qr_code || null, ws.profile_pic_url || null]);
    }

    // 4. Migrate Plans & Prices
    const plans = await sqliteDb.all('SELECT * FROM plans');
    console.log(`Migrating ${plans.length} plans...`);
    for (const p of plans) {
      const features = p.features ? (typeof p.features === 'string' ? JSON.parse(p.features) : p.features) : [];
      await pgClient.query(`
        INSERT INTO plans (id, name, description, features, is_active)
        VALUES ($1, $2, $3, $4::jsonb, $5)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, features = EXCLUDED.features;
      `, [p.id, p.name, p.description || null, JSON.stringify(features), p.is_active !== undefined ? !!p.is_active : true]);
    }

    const prices = await sqliteDb.all('SELECT * FROM plan_prices');
    console.log(`Migrating ${prices.length} plan_prices...`);
    for (const pr of prices) {
      await pgClient.query(`
        INSERT INTO plan_prices (plan_id, country_code, currency, amount_monthly, amount_yearly, stripe_price_id_monthly, stripe_price_id_yearly)
        VALUES ($1, $2, $3, COALESCE($4, 0), COALESCE($5, 0), $6, $7)
        ON CONFLICT (plan_id, country_code) DO NOTHING;
      `, [pr.plan_id, pr.country_code, pr.currency || 'USD', pr.amount_monthly, pr.amount_yearly, pr.stripe_price_id_monthly || null, pr.stripe_price_id_yearly || null]);
    }

    // 5. Migrate Telephony Settings
    const telSettings = await sqliteDb.all('SELECT * FROM telephony_settings');
    console.log(`Migrating ${telSettings.length} telephony_settings...`);
    for (const ts of telSettings) {
      await pgClient.query(`
        INSERT INTO telephony_settings (tenant_id, provider, uid, upin, caller_id, extension, mode, source_number, dept_id, recording_base_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (tenant_id) DO UPDATE SET 
          uid = EXCLUDED.uid,
          upin = EXCLUDED.upin,
          caller_id = EXCLUDED.caller_id,
          extension = EXCLUDED.extension;
      `, [ts.tenant_id, ts.provider || 'voxbay', ts.uid, ts.upin, ts.caller_id, ts.extension, ts.mode, ts.source_number, ts.dept_id, ts.recording_base_url]);
    }

    // 6. Migrate Call Logs
    const callLogs = await sqliteDb.all('SELECT * FROM call_logs');
    console.log(`Migrating ${callLogs.length} call_logs...`);
    for (const cl of callLogs) {
      await pgClient.query(`
        INSERT INTO call_logs (tenant_id, staff_id, staff_name, customer_name, customer_phone, channel, type, duration_seconds, recording_url, disposition, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);
      `, [cl.tenant_id || 1, cl.staff_id, cl.staff_name, cl.customer_name, cl.customer_phone, cl.channel || 'SIM', cl.type || 'OUTGOING', cl.duration_seconds || 0, cl.recording_url, cl.disposition || 'Interested', cl.notes]);
    }

    // 7. Migrate GHL Integrations & Links
    const ghlInts = await sqliteDb.all('SELECT * FROM ghl_integrations');
    console.log(`Migrating ${ghlInts.length} ghl_integrations...`);
    for (const g of ghlInts) {
      await pgClient.query(`
        INSERT INTO ghl_integrations (tenant_id, location_id, company_id, user_id, user_type, access_token, refresh_token, token_type, expires_in, expires_at, scope, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10::timestamptz, NOW()), $11, $12)
        ON CONFLICT (tenant_id, location_id) DO UPDATE SET access_token = EXCLUDED.access_token, refresh_token = EXCLUDED.refresh_token;
      `, [g.tenant_id, g.location_id, g.company_id, g.user_id, g.user_type, g.access_token, g.refresh_token, g.token_type, g.expires_in, g.expires_at, g.scope, !!g.is_active]);
    }

    const ghlLinks = await sqliteDb.all('SELECT * FROM ghl_entity_links');
    console.log(`Migrating ${ghlLinks.length} ghl_entity_links...`);
    for (const gl of ghlLinks) {
      if (!gl.crm_entity_id || !gl.ghl_entity_id) continue;
      await pgClient.query(`
        INSERT INTO ghl_entity_links (tenant_id, location_id, entity_type, crm_entity_id, ghl_entity_id)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (tenant_id, entity_type, crm_entity_id) DO NOTHING;
      `, [gl.tenant_id, gl.location_id, gl.entity_type, gl.crm_entity_id, gl.ghl_entity_id]);
    }

    console.log('🎉 ALL DATA MIGRATED 100% SUCCESSFULLY TO SUPABASE POSTGRESQL!');
  } catch (err) {
    console.error('❌ Migration error:', err);
  } finally {
    await sqliteDb.close();
    pgClient.release();
    await pgPool.end();
  }
}

runMigration();
