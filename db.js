import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'database.sqlite');

let db;

export async function initDb() {
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Enable foreign keys and WAL mode for high concurrency
  await db.run('PRAGMA foreign_keys = ON');
  try {
    await db.run('PRAGMA journal_mode = WAL');
    await db.run('PRAGMA synchronous = NORMAL');
  } catch (e) {
    console.warn('[SQLite WAL Warning]', e.message);
  }

  // Create tenants table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS tenants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT NOT NULL,
      subscription_status TEXT DEFAULT 'active', -- active, past_due, cancelled
      stripe_customer_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Auto-seed default Tenant 1 if not exists
  const defaultTenant = await db.get(`SELECT id FROM tenants WHERE id = 1`);
  if (!defaultTenant) {
    await db.run(`INSERT INTO tenants (id, company_name, subscription_status) VALUES (1, 'OmniFlow Default Org', 'active')`);
  }

  // Create users table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'owner', -- owner, admin, manager, agent
      tenant_id INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    )
  `);

  // Create tenant_settings table for dynamic settings (custom pipeline stages and tags)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS tenant_settings (
      tenant_id INTEGER PRIMARY KEY,
      pipeline_stages TEXT, -- Store JSON array of stages
      tags TEXT, -- Store JSON array of allowed tags
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    )
  `);

  // Seed default settings for Tenant 1 if not exists
  const defaultSettings = await db.get(`SELECT tenant_id FROM tenant_settings WHERE tenant_id = 1`);
  if (!defaultSettings) {
    const defaultStages = JSON.stringify([
      { id: 'new', title: 'New Leads', color: '#0d9488' },
      { id: 'contacted', title: 'Contacted', color: '#0ea5e9' },
      { id: 'interested', title: 'Interested', color: '#eab308' },
      { id: 'proposal', title: 'Proposal Sent', color: '#ec4899' },
      { id: 'won', title: 'Closed Won', color: '#10b981' }
    ]);
    const defaultTags = JSON.stringify(['VIP', 'Hot', 'Follow Up', 'Won']);
    await db.run(`INSERT INTO tenant_settings (tenant_id, pipeline_stages, tags) VALUES (1, ?, ?)`, [defaultStages, defaultTags]);
  }

  // Create whatsapp_sessions table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS whatsapp_sessions (
      id TEXT PRIMARY KEY,
      phone_name TEXT NOT NULL,
      phone_number TEXT,
      status TEXT DEFAULT 'disconnected',
      qr_code TEXT,
      profile_pic_url TEXT,
      tenant_id INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    )
  `);

  // Auto-seed default sessions
  try {
    await db.run(`INSERT OR IGNORE INTO whatsapp_sessions (id, phone_name, status, tenant_id) VALUES ('desktop_webview', 'WhatsApp Web Live', 'connected', 1)`);
    await db.run(`INSERT OR IGNORE INTO whatsapp_sessions (id, phone_name, status, tenant_id) VALUES ('primary', 'Primary Account', 'connected', 1)`);
    await db.run(`INSERT OR IGNORE INTO whatsapp_sessions (id, phone_name, status, tenant_id) VALUES ('desktop_companion', 'Desktop Companion', 'connected', 1)`);
  } catch (e) {}

  // Create contacts table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      name TEXT,
      custom_name TEXT,
      phone TEXT,
      email TEXT,
      notes TEXT,
      pipeline_stage TEXT DEFAULT 'new',
      labels TEXT, -- Store JSON array of labels: e.g. '["VIP","Interested"]'
      profile_pic_url TEXT,
      is_archived INTEGER DEFAULT 0,
      tenant_id INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      phone_normalized TEXT,
      email_normalized TEXT,
      FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    )
  `);

  // Auto-migrate phone and normalized columns if table already exists
  try {
    await db.exec(`ALTER TABLE contacts ADD COLUMN phone TEXT;`);
  } catch (e) {}
  try {
    await db.exec(`ALTER TABLE contacts ADD COLUMN phone_normalized TEXT;`);
  } catch (e) {}
  try {
    await db.exec(`ALTER TABLE contacts ADD COLUMN email_normalized TEXT;`);
  } catch (e) {}
  try {
    // Backfill phone from id if id contains WhatsApp JID phone digits
    await db.exec(`
      UPDATE contacts 
      SET phone = REPLACE(id, '@s.whatsapp.net', ''),
          phone_normalized = REPLACE(id, '@s.whatsapp.net', '')
      WHERE (phone IS NULL OR phone = '') AND id LIKE '%@s.whatsapp.net';
    `);
  } catch (e) {}

  // Create lid_mappings table to map WhatsApp LIDs to real phone numbers
  await db.exec(`
    CREATE TABLE IF NOT EXISTS lid_mappings (
      lid TEXT PRIMARY KEY,
      pn TEXT NOT NULL
    )
  `);

  // Create messages table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      contact_id TEXT NOT NULL,
      from_me INTEGER NOT NULL, -- 1 = sent, 0 = received
      text_content TEXT,
      media_url TEXT,
      media_type TEXT DEFAULT 'text',
      timestamp INTEGER NOT NULL,
      is_read INTEGER DEFAULT 0,
      status INTEGER DEFAULT 0,
      is_starred INTEGER DEFAULT 0,
      tenant_id INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY(session_id) REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY(contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
      FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    )
  `);

  // Create chatbot_rules table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS webhook_logs (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL DEFAULT 'default_tenant',
      source TEXT NOT NULL,
      event TEXT NOT NULL,
      status INTEGER NOT NULL DEFAULT 200,
      payload TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create chatbot_rules table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS chatbot_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      keyword TEXT NOT NULL,
      match_type TEXT DEFAULT 'contains',
      reply_text TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      tenant_id INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      UNIQUE(keyword, tenant_id)
    )
  `);

  // Create scheduled_messages table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS scheduled_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      contact_id TEXT NOT NULL,
      message_text TEXT NOT NULL,
      send_at INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      error_message TEXT,
      tenant_id INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    )
  `);

  // Create plans table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      features TEXT, -- JSON string array
      included_modules TEXT DEFAULT '[]', -- JSON array of module IDs
      max_channels INTEGER DEFAULT 1,
      max_contacts INTEGER DEFAULT 250,
      max_employees INTEGER DEFAULT 5,
      allow_chatbot INTEGER DEFAULT 0,
      allow_scheduler INTEGER DEFAULT 0,
      allow_gps_tracking INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    )
  `);

  // Create plan_prices table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS plan_prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id TEXT NOT NULL,
      country_code TEXT NOT NULL,
      currency TEXT NOT NULL,
      amount REAL NOT NULL,
      stripe_price_id TEXT,
      FOREIGN KEY(plan_id) REFERENCES plans(id) ON DELETE CASCADE,
      UNIQUE(plan_id, country_code)
    )
  `);

  // Create employees table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT,
      email TEXT,
      phone TEXT,
      role TEXT DEFAULT 'employee',       -- employee, manager, driver, admin
      department TEXT,                    -- Sales, Field Operations, Support
      salary REAL DEFAULT 0,              -- Payroll base
      status TEXT DEFAULT 'active',       -- active, suspended
      joining_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      user_id INTEGER,                    -- Optional foreign key to users
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL,
      UNIQUE(tenant_id, email)
    )
  `);

  // Create attendance_logs table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS attendance_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL,
      employee_id INTEGER NOT NULL,
      check_in_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      check_out_time DATETIME,
      check_in_lat REAL,
      check_in_lng REAL,
      check_out_lat REAL,
      check_out_lng REAL,
      status TEXT DEFAULT 'checked_in',
      FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE CASCADE
    )
  `);

  // Create gps_locations table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS gps_locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL,
      employee_id INTEGER NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      accuracy REAL,
      recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE CASCADE
    )
  `);

  // Create tasks table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      assigned_to INTEGER,
      priority TEXT DEFAULT 'Medium',
      status TEXT DEFAULT 'To Do',
      due_date DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY(assigned_to) REFERENCES employees(id) ON DELETE SET NULL
    )
  `);

  // Create notices table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS notices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    )
  `);

  // Create holidays table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS holidays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      date DATE NOT NULL,
      FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    )
  `);

  // Create leaves table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS leaves (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL,
      employee_id INTEGER NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      type TEXT DEFAULT 'Sick',
      reason TEXT,
      status TEXT DEFAULT 'Pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE CASCADE
    )
  `);

  // Create sim_bridge_devices table for Laptop-to-Mobile SIM pairing
  await db.exec(`
    CREATE TABLE IF NOT EXISTS sim_bridge_devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL DEFAULT 1,
      staff_id TEXT NOT NULL,
      staff_name TEXT,
      extension TEXT DEFAULT '101',
      pin TEXT DEFAULT '1234',
      device_id TEXT UNIQUE,
      device_name TEXT,
      sim_carrier TEXT DEFAULT 'Mobile SIM (Active)',
      sim_number TEXT,
      device_ip TEXT,
      status TEXT DEFAULT 'online', -- online, offline, calling, busy
      battery_level INTEGER DEFAULT 100,
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      paired_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    )
  `);

  // Auto-migrate extension and pin columns if table already exists
  try {
    await db.exec(`ALTER TABLE sim_bridge_devices ADD COLUMN extension TEXT DEFAULT '101'`);
  } catch (e) {}
  try {
    await db.exec(`ALTER TABLE sim_bridge_devices ADD COLUMN pin TEXT DEFAULT '1234'`);
  } catch (e) {}

  
  
  // Create company_kyc_profiles table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS company_kyc_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER UNIQUE NOT NULL,
      company_name TEXT,
      country TEXT DEFAULT 'India',
      state TEXT,
      pincode TEXT,
      address TEXT,
      gst_number TEXT,
      company_proof_type TEXT DEFAULT 'GST Registration Certificate',
      company_proof_url TEXT,
      auth_person_name TEXT,
      auth_person_email TEXT,
      auth_person_phone TEXT,
      auth_person_country TEXT DEFAULT 'India',
      auth_person_address TEXT,
      auth_person_pincode TEXT,
      id_proof_type TEXT DEFAULT 'Aadhaar Card',
      id_proof_url TEXT,
      profile_photo_url TEXT,
      status TEXT DEFAULT 'not_submitted', -- not_submitted, pending, verified, rejected
      admin_remarks TEXT,
      submitted_at DATETIME,
      verified_at DATETIME,
      verified_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create system_feedbacks table for cross-tenant feedback & suggestions hub
  await db.exec(`
    CREATE TABLE IF NOT EXISTS system_feedbacks (
      id TEXT PRIMARY KEY,
      tenant_id INTEGER DEFAULT 1,
      company_id TEXT,
      company_name TEXT,
      user_id TEXT,
      user_name TEXT,
      user_email TEXT,
      user_role TEXT,
      rating INTEGER DEFAULT 5,
      category TEXT DEFAULT 'general',
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      page_module TEXT,
      priority TEXT DEFAULT 'medium',
      attachment_url TEXT,
      status TEXT DEFAULT 'new',
      admin_reply TEXT,
      admin_replied_by TEXT,
      admin_replied_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create billing_invoices table for official GST Tax Invoices
  await db.exec(`
    CREATE TABLE IF NOT EXISTS billing_invoices (
      id TEXT PRIMARY KEY,
      invoice_number TEXT UNIQUE NOT NULL,
      tenant_id TEXT NOT NULL,
      company_name TEXT,
      buyer_name TEXT,
      buyer_email TEXT,
      buyer_phone TEXT,
      buyer_state TEXT,
      buyer_gstin TEXT,
      plan_id TEXT,
      plan_name TEXT,
      billing_cycle TEXT DEFAULT 'monthly',
      line_items TEXT, -- JSON array of line items with description, SAC, qty, rate, tax
      subtotal REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      taxable_subtotal REAL DEFAULT 0,
      tax_rate REAL DEFAULT 18,
      tax_amount REAL DEFAULT 0,
      cgst_amount REAL DEFAULT 0,
      sgst_amount REAL DEFAULT 0,
      igst_amount REAL DEFAULT 0,
      grand_total REAL DEFAULT 0,
      currency TEXT DEFAULT 'INR',
      payment_mode TEXT DEFAULT 'upi', -- upi, razorpay, bank_transfer, stripe, direct_admin
      utr_ref TEXT,
      receipt_url TEXT,
      status TEXT DEFAULT 'pending', -- pending, paid, rejected, refunded
      admin_notes TEXT,
      approved_by TEXT,
      approved_at DATETIME,
      invoice_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create tenant_subscriptions table for lifecycle management
  await db.exec(`
    CREATE TABLE IF NOT EXISTS tenant_subscriptions (
      id TEXT PRIMARY KEY,
      tenant_id TEXT UNIQUE NOT NULL,
      company_name TEXT,
      plan_id TEXT DEFAULT 'starter',
      plan_name TEXT DEFAULT 'Starter Growth',
      billing_cycle TEXT DEFAULT 'monthly',
      max_seats INTEGER DEFAULT 5,
      max_channels INTEGER DEFAULT 1,
      active_modules TEXT, -- JSON array of enabled module IDs
      amount_paid REAL DEFAULT 0,
      is_trial INTEGER DEFAULT 0,
      start_date DATETIME,
      expiry_date DATETIME,
      status TEXT DEFAULT 'pending_payment', -- active, trial, pending_payment, payment_under_review, expired
      auto_renew INTEGER DEFAULT 1,
      last_notified_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create saas_pricing_config table for platform billing settings
  await db.exec(`
    CREATE TABLE IF NOT EXISTS saas_pricing_config (
      id TEXT PRIMARY KEY DEFAULT 'platform_pricing_master',
      config_json TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create tenant_telephony_settings table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS tenant_telephony_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER UNIQUE NOT NULL,
      provider TEXT DEFAULT 'voxbay',
      voxbay_uid TEXT,
      voxbay_upin TEXT,
      voxbay_did TEXT,
      allowed_extensions TEXT DEFAULT '101,102,103,104,105',
      calling_mode TEXT DEFAULT 'mobile_to_mobile',
      default_agent_mobile TEXT,
      default_extension TEXT DEFAULT '111',
      is_enabled INTEGER DEFAULT 1,
      monthly_quota_minutes INTEGER DEFAULT 500,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create telephony_settings table for persistent credentials
  await db.exec(`
    CREATE TABLE IF NOT EXISTS telephony_settings (
      tenant_id INTEGER PRIMARY KEY DEFAULT 1,
      provider TEXT DEFAULT 'voxbay',
      uid TEXT,
      upin TEXT,
      caller_id TEXT DEFAULT '91487110000',
      extension TEXT DEFAULT '101',
      mode TEXT DEFAULT 'extension_to_mobile',
      source_number TEXT,
      dept_id TEXT DEFAULT '0',
      recording_base_url TEXT DEFAULT 'https://x.voxbay.com:81/callcenter/',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    )
  `);

  // Create calls table for Cloud Telephony (Voxbay, etc.)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS calls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL DEFAULT 1,
      user_id INTEGER,
      contact_id TEXT,
      phone_number TEXT NOT NULL,
      caller_id TEXT,
      agent_extension TEXT,
      provider TEXT DEFAULT 'voxbay',
      provider_call_id TEXT UNIQUE,
      direction TEXT DEFAULT 'outbound',
      status TEXT DEFAULT 'initiated',
      duration INTEGER DEFAULT 0,
      conversation_duration INTEGER DEFAULT 0,
      recording_url TEXT,
      dtmf TEXT,
      notes TEXT,
      metadata TEXT,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      answered_at DATETIME,
      ended_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    )
  `);

  // Create call_logs table for Telecalling and Auto-Recordings
  await db.exec(`
    CREATE TABLE IF NOT EXISTS call_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL DEFAULT 1,
      staff_id TEXT,
      staff_name TEXT,
      customer_name TEXT,
      customer_phone TEXT NOT NULL,
      channel TEXT DEFAULT 'SIM',
      type TEXT DEFAULT 'OUTGOING',
      duration_seconds INTEGER DEFAULT 0,
      recording_url TEXT,
      disposition TEXT DEFAULT 'Interested',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    )
  `);

  // ==============================================================================
  // ⚡ GOHIGHLEVEL (GHL) RELATIONAL INTEGRATION TABLES
  // ==============================================================================
  // 1. ghl_integrations: Multi-tenant Location bindings & Encrypted OAuth credentials
  await db.exec(`
    CREATE TABLE IF NOT EXISTS ghl_integrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL,
      location_id TEXT NOT NULL,
      company_id TEXT,
      user_id TEXT,
      user_type TEXT DEFAULT 'Location',
      access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      token_type TEXT DEFAULT 'Bearer',
      expires_in INTEGER DEFAULT 86400,
      expires_at DATETIME NOT NULL,
      scope TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      sync_contacts INTEGER DEFAULT 1,
      sync_conversations INTEGER DEFAULT 1,
      sync_calls INTEGER DEFAULT 1,
      sync_opportunities INTEGER DEFAULT 1,
      last_sync_at DATETIME,
      metadata TEXT,
      installed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    )
  `);

  // 2. ghl_field_mappings: Dynamic schema field dictionary
  await db.exec(`
    CREATE TABLE IF NOT EXISTS ghl_field_mappings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL,
      location_id TEXT NOT NULL,
      ems_module_id TEXT NOT NULL,
      ems_field_key TEXT NOT NULL,
      ghl_field_id TEXT NOT NULL,
      ghl_field_name TEXT NOT NULL,
      ghl_data_type TEXT NOT NULL,
      sync_direction TEXT DEFAULT 'bidirectional',
      is_active INTEGER DEFAULT 1,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      UNIQUE(location_id, ems_module_id, ems_field_key)
    )
  `);

  // 3. ghl_entity_links: Cross-reference & loop-suppression hash table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS ghl_entity_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL,
      location_id TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      ems_entity_id TEXT NOT NULL,
      ghl_entity_id TEXT NOT NULL,
      last_synced_hash TEXT,
      last_synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      UNIQUE(location_id, entity_type, ems_entity_id),
      UNIQUE(location_id, entity_type, ghl_entity_id)
    )
  `);

  // 4. ghl_sync_logs: Synchronization audit trail & retry queue log
  await db.exec(`
    CREATE TABLE IF NOT EXISTS ghl_sync_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL,
      location_id TEXT NOT NULL,
      direction TEXT NOT NULL,
      entity_type TEXT,
      ems_entity_id TEXT,
      ghl_entity_id TEXT,
      event_type TEXT NOT NULL,
      status TEXT NOT NULL,
      http_status INTEGER,
      payload TEXT,
      error_message TEXT,
      retry_count INTEGER DEFAULT 0,
      idempotency_key TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    )
  `);

  // 5. ghl_oauth_states: Cryptographic single-use CSRF tokens
  await db.exec(`
    CREATE TABLE IF NOT EXISTS ghl_oauth_states (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      state_token TEXT NOT NULL,
      tenant_id INTEGER NOT NULL,
      user_id INTEGER,
      expires_at DATETIME NOT NULL,
      is_used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    )
  `);

  // 6. ghl_trigger_subscriptions: Marketplace Custom Workflow Trigger Subscriptions
  await db.exec(`
    CREATE TABLE IF NOT EXISTS ghl_trigger_subscriptions (
      id TEXT PRIMARY KEY,
      tenant_id INTEGER NOT NULL,
      location_id TEXT NOT NULL,
      trigger_type TEXT NOT NULL,
      target_url TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      filters TEXT,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      UNIQUE(location_id, trigger_type, target_url)
    )
  `);

  // System Feedbacks Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS system_feedbacks (
      id TEXT PRIMARY KEY,
      tenant_id INTEGER NOT NULL DEFAULT 1,
      company_id TEXT DEFAULT 'org_default',
      company_name TEXT DEFAULT 'Unknown Org',
      user_id TEXT DEFAULT 'usr_anonymous',
      user_name TEXT DEFAULT 'Anonymous User',
      user_email TEXT,
      user_role TEXT DEFAULT 'employee',
      rating INTEGER DEFAULT 5,
      category TEXT DEFAULT 'general',
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      page_module TEXT,
      priority TEXT DEFAULT 'medium',
      attachment_url TEXT,
      status TEXT DEFAULT 'new',
      admin_reply TEXT,
      admin_replied_by TEXT,
      admin_replied_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Billing & GST Tax Invoices Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS billing_invoices (
      id TEXT PRIMARY KEY,
      invoice_number TEXT UNIQUE NOT NULL,
      tenant_id TEXT NOT NULL DEFAULT 'org_default',
      company_name TEXT NOT NULL,
      buyer_name TEXT,
      buyer_email TEXT,
      buyer_phone TEXT,
      buyer_state TEXT,
      buyer_gstin TEXT,
      plan_id TEXT NOT NULL DEFAULT 'starter',
      plan_name TEXT NOT NULL DEFAULT 'Starter Growth',
      billing_cycle TEXT DEFAULT 'monthly',
      line_items TEXT DEFAULT '[]',
      subtotal REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      taxable_subtotal REAL DEFAULT 0,
      tax_rate REAL DEFAULT 18,
      tax_amount REAL DEFAULT 0,
      cgst_amount REAL DEFAULT 0,
      sgst_amount REAL DEFAULT 0,
      igst_amount REAL DEFAULT 0,
      grand_total REAL DEFAULT 0,
      currency TEXT DEFAULT 'INR',
      payment_mode TEXT DEFAULT 'upi',
      utr_ref TEXT,
      receipt_url TEXT,
      status TEXT DEFAULT 'pending',
      admin_notes TEXT,
      approved_by TEXT,
      approved_at DATETIME,
      invoice_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Multi-Tenant Active Subscriptions Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS tenant_subscriptions (
      id TEXT PRIMARY KEY,
      tenant_id TEXT UNIQUE NOT NULL,
      company_name TEXT NOT NULL,
      plan_id TEXT NOT NULL DEFAULT 'starter',
      plan_name TEXT NOT NULL DEFAULT 'Starter Growth',
      billing_cycle TEXT DEFAULT 'monthly',
      max_seats INTEGER DEFAULT 5,
      max_channels INTEGER DEFAULT 1,
      active_modules TEXT DEFAULT '[]',
      amount_paid REAL DEFAULT 0,
      is_trial INTEGER DEFAULT 0,
      start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      expiry_date DATETIME NOT NULL,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // SaaS Pricing & Payment Credentials Configuration Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS saas_pricing_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      config_key TEXT UNIQUE NOT NULL,
      config_value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Seed standard 4 SaaS plans if table is empty or incomplete
  const planCount = await db.get(`SELECT COUNT(*) as count FROM plans`);
  if (!planCount || planCount.count === 0) {
    const seedPlans = [
      {
        id: 'free',
        name: 'Free Trial',
        description: '7-Day full access trial with core CRM & essentials',
        features: ['5 Team Employee Seats', '1 Connected WhatsApp Channel', 'Full CRM & Kanban Pipeline', 'Tasks Board & Team Workload'],
        included_modules: ['dashboards', 'contacts', 'conversations', 'crm_deals', 'tasks', 'feedback'],
        max_channels: 1,
        max_contacts: 999999999,
        max_employees: 5,
        prices: [{ country_code: 'IN', currency: 'INR', amount: 0 }, { country_code: 'US', currency: 'USD', amount: 0 }, { country_code: 'DEFAULT', currency: 'USD', amount: 0 }]
      },
      {
        id: 'starter',
        name: 'Starter Growth',
        description: 'Ideal for small growing sales & operations teams',
        features: ['5 Included Employee Seats', '1 Active WhatsApp Channel', 'Cloud PBX & SIM Telecalling', 'Attendance & Kiosk Check-In', 'Notice Board & Team Tasks'],
        included_modules: ['dashboards', 'contacts', 'conversations', 'crm_deals', 'telecalling', 'tasks', 'attendance_kiosk', 'notice_board', 'feedback'],
        max_channels: 1,
        max_contacts: 999999999,
        max_employees: 5,
        prices: [{ country_code: 'IN', currency: 'INR', amount: 1999 }, { country_code: 'US', currency: 'USD', amount: 29 }, { country_code: 'DEFAULT', currency: 'USD', amount: 29 }]
      },
      {
        id: 'pro',
        name: 'Business Pro',
        description: 'Complete HR, CRM, Telecalling & Payroll suite',
        features: ['15 Included Employee Seats', '3 WhatsApp Business Channels', 'Full HR Directory & Employee Profiles', 'Automated Payroll & Salary Slips', 'Recruitment ATS & Candidates', 'Live GPS Field Tracking & Beats'],
        included_modules: ['dashboards', 'contacts', 'conversations', 'whatsapp_chats', 'crm_deals', 'telecalling', 'employees', 'payroll', 'attendance_kiosk', 'recruitment_ats', 'tasks', 'notice_board', 'holidays', 'assets', 'feedback'],
        max_channels: 3,
        max_contacts: 999999999,
        max_employees: 15,
        prices: [{ country_code: 'IN', currency: 'INR', amount: 4999 }, { country_code: 'US', currency: 'USD', amount: 69 }, { country_code: 'DEFAULT', currency: 'USD', amount: 69 }]
      },
      {
        id: 'enterprise',
        name: 'Enterprise Complete',
        description: 'All 22 platform modules unlocked, unlimited scale & custom workflows',
        features: ['50 Included Employee Seats', '10 WhatsApp Business Channels', 'All 22 Platform Modules Unlocked', 'Priority 24/7 Dedicated Support', 'Custom Integrations & Dedicated Isolation'],
        included_modules: ['dashboards', 'contacts', 'conversations', 'whatsapp_chats', 'crm_deals', 'telecalling', 'employees', 'payroll', 'attendance_kiosk', 'recruitment_ats', 'tasks', 'notice_board', 'holidays', 'assets', 'verify_documents', 'offboarding', 'advances_loans', 'expense_claims', 'workspace_kyc', 'my_portal', 'workspace_settings', 'feedback'],
        max_channels: 10,
        max_contacts: 999999999,
        max_employees: 50,
        prices: [{ country_code: 'IN', currency: 'INR', amount: 9999 }, { country_code: 'US', currency: 'USD', amount: 139 }, { country_code: 'DEFAULT', currency: 'USD', amount: 139 }]
      }
    ];

    for (const p of seedPlans) {
      await db.run(
        `INSERT OR REPLACE INTO plans (id, name, description, features, included_modules, max_channels, max_contacts, max_employees, allow_chatbot, allow_scheduler, allow_gps_tracking, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 1, 1)`,
        [p.id, p.name, p.description, JSON.stringify(p.features), JSON.stringify(p.included_modules), p.max_channels, p.max_contacts, p.max_employees]
      );
      for (const pr of p.prices) {
        await db.run(
          `INSERT OR REPLACE INTO plan_prices (plan_id, country_code, currency, amount)
           VALUES (?, ?, ?, ?)`,
          [p.id, pr.country_code, pr.currency, pr.amount]
        );
      }
    }
  }

  // Run dynamic schema migrations to add tenant_id, custom_fields, and GHL columns if database already exists
  const migrateColumns = [
    { table: 'plans', column: 'included_modules', type: "TEXT DEFAULT '[]'" },
    { table: 'plans', column: 'max_employees', type: 'INTEGER DEFAULT 5' },
    { table: 'whatsapp_sessions', column: 'tenant_id', type: 'INTEGER DEFAULT 1' },
    { table: 'contacts', column: 'tenant_id', type: 'INTEGER DEFAULT 1' },
    { table: 'contacts', column: 'deal_value', type: 'TEXT DEFAULT ""' },
    { table: 'contacts', column: 'custom_fields', type: "TEXT DEFAULT '{}'" },
    { table: 'employees', column: 'custom_fields', type: "TEXT DEFAULT '{}'" },
    { table: 'messages', column: 'tenant_id', type: 'INTEGER DEFAULT 1' },
    { table: 'chatbot_rules', column: 'tenant_id', type: 'INTEGER DEFAULT 1' },
    { table: 'scheduled_messages', column: 'tenant_id', type: 'INTEGER DEFAULT 1' },
    // ghl_integrations migrations
    { table: 'ghl_integrations', column: 'tenant_id', type: 'INTEGER NOT NULL DEFAULT 1' },
    { table: 'ghl_integrations', column: 'location_id', type: 'TEXT' },
    { table: 'ghl_integrations', column: 'company_id', type: 'TEXT' },
    { table: 'ghl_integrations', column: 'user_id', type: 'TEXT' },
    { table: 'ghl_integrations', column: 'user_type', type: "TEXT DEFAULT 'Location'" },
    { table: 'ghl_integrations', column: 'access_token', type: "TEXT DEFAULT ''" },
    { table: 'ghl_integrations', column: 'refresh_token', type: "TEXT DEFAULT ''" },
    { table: 'ghl_integrations', column: 'token_type', type: "TEXT DEFAULT 'Bearer'" },
    { table: 'ghl_integrations', column: 'expires_in', type: 'INTEGER DEFAULT 86400' },
    { table: 'ghl_integrations', column: 'expires_at', type: "DATETIME DEFAULT CURRENT_TIMESTAMP" },
    { table: 'ghl_integrations', column: 'scope', type: "TEXT DEFAULT ''" },
    { table: 'ghl_integrations', column: 'is_active', type: 'INTEGER DEFAULT 1' },
    { table: 'ghl_integrations', column: 'sync_contacts', type: 'INTEGER DEFAULT 1' },
    { table: 'ghl_integrations', column: 'sync_conversations', type: 'INTEGER DEFAULT 1' },
    { table: 'ghl_integrations', column: 'sync_calls', type: 'INTEGER DEFAULT 1' },
    { table: 'ghl_integrations', column: 'sync_opportunities', type: 'INTEGER DEFAULT 1' },
    { table: 'ghl_integrations', column: 'last_sync_at', type: 'DATETIME' },
    { table: 'ghl_integrations', column: 'metadata', type: 'TEXT' },
    // ghl_sync_logs migrations
    { table: 'ghl_sync_logs', column: 'tenant_id', type: 'INTEGER NOT NULL DEFAULT 1' },
    { table: 'ghl_sync_logs', column: 'location_id', type: 'TEXT' },
    { table: 'ghl_sync_logs', column: 'direction', type: "TEXT DEFAULT 'INBOUND'" },
    { table: 'ghl_sync_logs', column: 'entity_type', type: 'TEXT' },
    { table: 'ghl_sync_logs', column: 'ems_entity_id', type: 'TEXT' },
    { table: 'ghl_sync_logs', column: 'ghl_entity_id', type: 'TEXT' },
    { table: 'ghl_sync_logs', column: 'event_type', type: "TEXT DEFAULT 'GenericEvent'" },
    { table: 'ghl_sync_logs', column: 'status', type: "TEXT DEFAULT 'SUCCESS'" },
    { table: 'ghl_sync_logs', column: 'http_status', type: 'INTEGER DEFAULT 200' },
    { table: 'ghl_sync_logs', column: 'payload', type: 'TEXT' },
    { table: 'ghl_sync_logs', column: 'error_message', type: 'TEXT' },
    { table: 'ghl_sync_logs', column: 'retry_count', type: 'INTEGER DEFAULT 0' },
    { table: 'ghl_sync_logs', column: 'idempotency_key', type: 'TEXT' },
    // ghl_oauth_states migrations
    { table: 'ghl_oauth_states', column: 'state_token', type: 'TEXT' },
    { table: 'ghl_oauth_states', column: 'tenant_id', type: 'INTEGER NOT NULL DEFAULT 1' },
    { table: 'ghl_oauth_states', column: 'user_id', type: 'INTEGER' },
    { table: 'ghl_oauth_states', column: 'expires_at', type: 'DATETIME' },
    { table: 'ghl_oauth_states', column: 'is_used', type: 'INTEGER DEFAULT 0' }
  ];

  for (const m of migrateColumns) {
    try {
      await db.exec(`ALTER TABLE ${m.table} ADD COLUMN ${m.column} ${m.type}`);
    } catch (err) {
      // Column already exists
    }
  }

  // Create GHL indexes safely after column migrations
  const ghlIndexes = [
    `CREATE INDEX IF NOT EXISTS idx_ghl_integrations_tenant ON ghl_integrations(tenant_id)`,
    `CREATE INDEX IF NOT EXISTS idx_ghl_integrations_location ON ghl_integrations(location_id)`,
    `CREATE INDEX IF NOT EXISTS idx_ghl_field_mappings_loc ON ghl_field_mappings(location_id, ems_module_id)`,
    `CREATE INDEX IF NOT EXISTS idx_ghl_links_lookup ON ghl_entity_links(location_id, entity_type, ghl_entity_id)`,
    `CREATE INDEX IF NOT EXISTS idx_ghl_sync_logs_tenant ON ghl_sync_logs(tenant_id, created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_ghl_sync_logs_idempotency ON ghl_sync_logs(idempotency_key)`,
    `CREATE INDEX IF NOT EXISTS idx_ghl_oauth_states_token ON ghl_oauth_states(state_token)`,
    `CREATE INDEX IF NOT EXISTS idx_messages_tenant_contact_ts ON messages(tenant_id, contact_id, timestamp DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_messages_contact_latest ON messages(tenant_id, contact_id, timestamp DESC, id DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(tenant_id, contact_id, from_me, is_read)`,
    `CREATE INDEX IF NOT EXISTS idx_contacts_tenant_id ON contacts(tenant_id, id)`,
    `CREATE INDEX IF NOT EXISTS idx_contacts_tenant_archived ON contacts(tenant_id, is_archived, id)`,
    `CREATE INDEX IF NOT EXISTS idx_call_logs_tenant_ts ON call_logs(tenant_id, timestamp DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_call_logs_phone ON call_logs(customer_phone)`
  ];

  for (const idx of ghlIndexes) {
    try {
      await db.exec(idx);
    } catch (e) {
      // Index exists or non-critical
    }
  }


  for (const m of migrateColumns) {
    try {
      await db.exec(`ALTER TABLE ${m.table} ADD COLUMN ${m.column} ${m.type}`);
    } catch (err) {
      // Column already exists
    }
  }

  // Add plan_id column to tenants
  try {
    await db.exec(`ALTER TABLE tenants ADD COLUMN plan_id TEXT DEFAULT 'free_trial'`);
  } catch (err) {
    // Column already exists
  }

  // Add max_employees column to plans
  try {
    await db.exec(`ALTER TABLE plans ADD COLUMN max_employees INTEGER DEFAULT 5`);
  } catch (err) {
    // Column already exists
  }

  // Add allow_gps_tracking column to plans
  try {
    await db.exec(`ALTER TABLE plans ADD COLUMN allow_gps_tracking INTEGER DEFAULT 0`);
  } catch (err) {
    // Column already exists
  }

  // Extra migrations for messages table fields
  try {
    await db.exec(`ALTER TABLE messages ADD COLUMN is_starred INTEGER DEFAULT 0`);
  } catch (err) {}
  try {
    await db.exec(`ALTER TABLE messages ADD COLUMN is_read INTEGER DEFAULT 0`);
  } catch (err) {}
  try {
    await db.exec(`ALTER TABLE messages ADD COLUMN status INTEGER DEFAULT 0`);
  } catch (err) {}
  try {
    await db.exec(`ALTER TABLE contacts ADD COLUMN profile_pic_url TEXT`);
  } catch (err) {}
  try {
    await db.exec(`ALTER TABLE contacts ADD COLUMN is_archived INTEGER DEFAULT 0`);
  } catch (err) {}
  try {
    await db.exec(`ALTER TABLE whatsapp_sessions ADD COLUMN profile_pic_url TEXT`);
  } catch (err) {}

  // Database cleanup: Remove legacy @lid entries and incorrect placeholders
  try {
    await db.run(`DELETE FROM contacts WHERE id LIKE '%@lid'`);
    await db.run(`DELETE FROM messages WHERE contact_id LIKE '%@lid'`);
    await db.run(`UPDATE contacts SET name = NULL WHERE name = 'Rs Digital Marketing World'`);
    await db.run(`UPDATE contacts SET profile_pic_url = NULL WHERE profile_pic_url = 'none'`);
    await db.run(`UPDATE contacts SET name = NULL WHERE name = REPLACE(id, '@s.whatsapp.net', '')`);
    await db.run(`UPDATE contacts SET name = NULL WHERE name = REPLACE(id, '@g.us', '')`);
  } catch (err) {
    console.error('Failed to run database cleanup:', err);
  }

  // Create high-performance composite B-Tree indexes for ultra-fast instant lookups (<10ms)
  try {
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_messages_contact_ts ON messages(contact_id, timestamp DESC);`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_messages_tenant_contact_ts ON messages(tenant_id, contact_id, timestamp DESC);`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(tenant_id, contact_id, from_me, is_read);`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_contacts_tenant_archived ON contacts(tenant_id, is_archived, created_at DESC);`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);`);
  } catch (err) {
    console.warn('[DB Index Notice]', err.message);
  }

  console.log('Database initialized successfully at:', dbPath);
  return db;
}

// SaaS Tenant Helpers
export async function createTenant(companyName) {
  const result = await db.run(
    `INSERT INTO tenants (company_name, subscription_status) VALUES (?, 'active')`,
    [companyName]
  );
  const tenantId = result.lastID;
  
  // Seed default stages & tags for the new tenant
  const defaultStages = JSON.stringify([
    { id: 'new', title: 'New Leads', color: '#0d9488' },
    { id: 'contacted', title: 'Contacted', color: '#0ea5e9' },
    { id: 'interested', title: 'Interested', color: '#eab308' },
    { id: 'proposal', title: 'Proposal Sent', color: '#ec4899' },
    { id: 'won', title: 'Closed Won', color: '#10b981' }
  ]);
  const defaultTags = JSON.stringify(['VIP', 'Hot', 'Follow Up', 'Won']);
  await db.run(
    `INSERT INTO tenant_settings (tenant_id, pipeline_stages, tags) VALUES (?, ?, ?)`,
    [tenantId, defaultStages, defaultTags]
  );
  return await getTenant(tenantId);
}

export async function updateTenantSubscription(tenantId, status, stripeCustomerId = null) {
  await db.run(
    `UPDATE tenants SET subscription_status = ?, stripe_customer_id = COALESCE(?, stripe_customer_id) WHERE id = ?`,
    [status, stripeCustomerId, tenantId]
  );
  return await getTenant(tenantId);
}

export async function getTenant(tenantId) {
  return await db.get(`SELECT * FROM tenants WHERE id = ?`, [tenantId]);
}

// SaaS User Helpers
export async function createUser(email, passwordHash, role = 'owner', tenantId = 1) {
  const result = await db.run(
    `INSERT INTO users (email, password_hash, role, tenant_id) VALUES (?, ?, ?, ?)`,
    [email.toLowerCase().trim(), passwordHash, role, tenantId]
  );
  return await getUserById(result.lastID);
}

export async function getUserByEmail(email) {
  return await db.get(`SELECT * FROM users WHERE email = ?`, [email.toLowerCase().trim()]);
}

export async function getUserById(id) {
  return await db.get(`SELECT * FROM users WHERE id = ?`, [id]);
}

// SaaS Tenant Settings Helpers
export async function getTenantSettings(tenantId = 1) {
  const settings = await db.get(`SELECT * FROM tenant_settings WHERE tenant_id = ?`, [tenantId]);
  if (settings) {
    try { settings.pipeline_stages = JSON.parse(settings.pipeline_stages || '[]'); } catch { settings.pipeline_stages = []; }
    try { settings.tags = JSON.parse(settings.tags || '[]'); } catch { settings.tags = []; }
  }
  return settings;
}

export async function updateTenantSettings(tenantId = 1, { pipelineStages, tags }) {
  await db.run(
    `UPDATE tenant_settings 
     SET pipeline_stages = ?, tags = ? 
     WHERE tenant_id = ?`,
    [JSON.stringify(pipelineStages || []), JSON.stringify(tags || []), tenantId]
  );
  return await getTenantSettings(tenantId);
}

// Session Helpers
export async function saveSession(id, phoneName, tenantId = 1) {
  await db.run(
    `INSERT OR IGNORE INTO whatsapp_sessions (id, phone_name, status, tenant_id) VALUES (?, ?, 'disconnected', ?)`,
    [id, phoneName, tenantId]
  );
}

export async function updateSessionStatus(id, status, qrCode = null, phoneNumber = null, profilePicUrl = null) {
  const existing = await db.get(`SELECT id FROM whatsapp_sessions WHERE id = ?`, [id]);
  if (!existing) {
    await db.run(
      `INSERT INTO whatsapp_sessions (id, phone_name, status, qr_code, phone_number, profile_pic_url, tenant_id) VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [id, id, status, qrCode, phoneNumber, profilePicUrl]
    );
  } else {
    await db.run(
      `UPDATE whatsapp_sessions 
       SET status = ?, 
           qr_code = ?, 
           phone_number = COALESCE(?, phone_number), 
           profile_pic_url = COALESCE(?, profile_pic_url), 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [status, qrCode, phoneNumber, profilePicUrl, id]
    );
  }
}

export async function getSession(id) {
  return await db.get(`SELECT * FROM whatsapp_sessions WHERE id = ?`, [id]);
}

export async function getAllSessions(tenantId = 1) {
  return await db.all(`SELECT * FROM whatsapp_sessions WHERE tenant_id = ? ORDER BY created_at DESC`, [tenantId]);
}

export async function deleteSession(id) {
  await db.run(`DELETE FROM whatsapp_sessions WHERE id = ?`, [id]);
}

export async function saveContact(id, name, tenantId = 1, stage = 'lead', phone = null) {
  const cleanPhone = phone || (id && id.includes('@s.whatsapp.net') ? id.split('@')[0] : (id && !id.includes('@') ? id : null));
  const norm10 = cleanPhone ? String(cleanPhone).replace(/\D/g, '').slice(-10) : null;

  await db.run(
    `INSERT OR IGNORE INTO contacts (id, name, phone, phone_normalized, pipeline_stage, labels, tenant_id) VALUES (?, ?, ?, ?, ?, '[]', ?)`,
    [id, name, cleanPhone, norm10, stage || 'lead', tenantId]
  );
  if (name || cleanPhone) {
    await db.run(
      `UPDATE contacts 
       SET name = COALESCE(?, name),
           phone = COALESCE(?, phone),
           phone_normalized = COALESCE(?, phone_normalized),
           pipeline_stage = COALESCE(NULLIF(pipeline_stage, 'new'), ?)
       WHERE id = ? AND tenant_id = ?`,
      [name, cleanPhone, norm10, stage || 'lead', id, tenantId]
    );
  }
}

export async function updateContactProfilePic(id, url) {
  await db.run(`UPDATE contacts SET profile_pic_url = ? WHERE id = ?`, [url, id]);
}

export async function saveLidMapping(lid, pn) {
  await db.run(
    `INSERT OR REPLACE INTO lid_mappings (lid, pn) VALUES (?, ?)`,
    [lid, pn]
  );
}

export async function saveWebhookLog({ id, companyId, source, event, status, payload, timestamp }) {
  try {
    const cleanId = id || `wh_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const cleanCompanyId = companyId || 'default_tenant';
    await db.run(
      `INSERT OR REPLACE INTO webhook_logs (id, company_id, source, event, status, payload, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [cleanId, cleanCompanyId, source, event, status || 200, typeof payload === 'string' ? payload : JSON.stringify(payload || {}), timestamp || new Date().toISOString()]
    );
  } catch (err) {
    console.warn('saveWebhookLog warning:', err.message);
  }
}

export async function getWebhookLogs(companyId = 'default_tenant') {
  try {
    return await db.all(
      `SELECT id, company_id as companyId, source, event, status, payload, timestamp FROM webhook_logs WHERE company_id = ? OR company_id = 'default_tenant' ORDER BY timestamp DESC LIMIT 200`,
      [companyId]
    );
  } catch (err) {
    console.warn('getWebhookLogs warning:', err.message);
    return [];
  }
}

export async function getPnFromLid(lid) {
  const row = await db.get(`SELECT pn FROM lid_mappings WHERE lid = ?`, [lid]);
  return row ? row.pn : null;
}

export async function updateContactCRM(id, { customName, email, notes, pipelineStage, labels, dealValue }, tenantId = 1) {
  await db.run(
    `UPDATE contacts 
     SET custom_name = COALESCE(?, custom_name), 
         email = COALESCE(?, email), 
         notes = COALESCE(?, notes), 
         pipeline_stage = COALESCE(?, pipeline_stage), 
         labels = CASE WHEN ? IS NOT NULL THEN ? ELSE labels END,
         deal_value = COALESCE(?, deal_value)
     WHERE id = ? AND tenant_id = ?`,
    [
      customName ?? null,
      email ?? null,
      notes ?? null,
      pipelineStage ?? null,
      labels ? JSON.stringify(labels) : null,
      labels ? JSON.stringify(labels) : null,
      dealValue ?? null,
      id,
      tenantId
    ]
  );
  return await db.get(`SELECT * FROM contacts WHERE id = ? AND tenant_id = ?`, [id, tenantId]);
}

export async function getContact(id, tenantId = 1) {
  const contact = await db.get(`SELECT * FROM contacts WHERE id = ? AND tenant_id = ?`, [id, tenantId]);
  if (contact && contact.labels) {
    try {
      contact.labels = JSON.parse(contact.labels);
    } catch {
      contact.labels = [];
    }
  }
  return contact;
}

export async function deleteContact(id, tenantId = 1) {
  try {
    await db.run(`DELETE FROM messages WHERE contact_id = ? AND tenant_id = ?`, [id, tenantId]);
    await db.run(`DELETE FROM scheduled_messages WHERE contact_id = ? AND tenant_id = ?`, [id, tenantId]);
    await db.run(`DELETE FROM ghl_entity_links WHERE ems_entity_id = ? AND tenant_id = ?`, [id, tenantId]);
    await db.run(`DELETE FROM contacts WHERE id = ? AND tenant_id = ?`, [id, tenantId]);
  } catch (err) {
    console.error('[db] deleteContact error:', err.message);
    throw err;
  }
}

export async function getAllContacts(tenantId = 1) {
  const contacts = await db.all(`SELECT * FROM contacts WHERE tenant_id = ? ORDER BY created_at DESC`, [tenantId]);
  return contacts.map(c => {
    try {
      c.labels = JSON.parse(c.labels || '[]');
    } catch {
      c.labels = [];
    }
    return c;
  });
}

export async function findContactByPhoneOrEmail(tenantId = 1, phone = null, email = null) {
  if (!phone && !email) return null;

  if (email && email.trim()) {
    const byEmail = await db.all(
      `SELECT * FROM contacts WHERE tenant_id = ? AND LOWER(email) = LOWER(?)`,
      [tenantId, email.trim()]
    );
    if (byEmail.length === 1) {
      try { byEmail[0].labels = JSON.parse(byEmail[0].labels || '[]'); } catch { byEmail[0].labels = []; }
      return byEmail[0];
    }
    if (byEmail.length > 1) return { matchConflict: true, matches: byEmail };
  }

  if (phone) {
    const rawDigits = String(phone).replace(/\D/g, '');
    const last10 = rawDigits.slice(-10);
    if (last10.length === 10) {
      const byPhone = await db.all(
        `SELECT * FROM contacts 
         WHERE tenant_id = ? AND (
           id LIKE ? OR id LIKE ?
         )`,
        [
          tenantId,
          `%${last10}%`,
          `%${rawDigits}%`
        ]
      );
      if (byPhone.length === 1) {
        try { byPhone[0].labels = JSON.parse(byPhone[0].labels || '[]'); } catch { byPhone[0].labels = []; }
        return byPhone[0];
      }
      if (byPhone.length > 1) return { matchConflict: true, matches: byPhone };
    }
  }

  return null;
}

// Message Helpers
export async function saveMessage({ id, sessionId, contactId, fromMe, textContent, mediaUrl = null, mediaType = 'text', timestamp, isRead = null, status = 0, tenantId = 1 }) {
  const resolvedIsRead = isRead !== null ? isRead : (fromMe ? 1 : 0);
  const effectiveSessionId = sessionId || 'desktop_webview';

  // Ensure session row exists to satisfy foreign key constraint
  try {
    await db.run(
      `INSERT OR IGNORE INTO whatsapp_sessions (id, phone_name, status, tenant_id) VALUES (?, ?, 'connected', ?)`,
      [effectiveSessionId, effectiveSessionId, tenantId]
    );
  } catch (e) {}

  // Ensure contact row exists to satisfy foreign key constraint
  try {
    await db.run(
      `INSERT OR IGNORE INTO contacts (id, name, tenant_id) VALUES (?, ?, ?)`,
      [contactId, contactId, tenantId]
    );
  } catch (e) {}

  await db.run(
    `INSERT OR REPLACE INTO messages (id, session_id, contact_id, from_me, text_content, media_url, media_type, timestamp, is_read, status, tenant_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, effectiveSessionId, contactId, fromMe ? 1 : 0, textContent, mediaUrl, mediaType, timestamp, resolvedIsRead, status, tenantId]
  );
}

export async function updateMessageStatus(id, status) {
  await db.run(
    `UPDATE messages SET status = ? WHERE id = ?`,
    [status, id]
  );
}

export async function clearAllCrmData(tenantId = null) {
  if (tenantId) {
    await db.run(`DELETE FROM messages WHERE tenant_id = ?`, [tenantId]);
    await db.run(`DELETE FROM contacts WHERE tenant_id = ?`, [tenantId]);
    await db.run(`DELETE FROM scheduled_messages WHERE tenant_id = ?`, [tenantId]);
  } else {
    await db.run(`DELETE FROM messages`);
    await db.run(`DELETE FROM contacts`);
    await db.run(`DELETE FROM scheduled_messages`);
  }
}

export async function getMessagesForContact(contactId, limit = 100, offset = 0, tenantId = 1, extraPhone = null) {
  const possibleIds = new Set();
  
  if (contactId) {
    const sId = String(contactId);
    possibleIds.add(sId);
    if (sId.includes('@')) {
      possibleIds.add(sId.split('@')[0]);
    } else {
      possibleIds.add(`${sId}@s.whatsapp.net`);
      possibleIds.add(`${sId}@c.us`);
      const digits = sId.replace(/\D/g, '');
      if (digits) {
        possibleIds.add(digits);
        if (digits.length >= 10) {
          const l10 = digits.slice(-10);
          possibleIds.add(l10);
          possibleIds.add(`91${l10}`);
          possibleIds.add(`+91${l10}`);
          possibleIds.add(`91${l10}@s.whatsapp.net`);
          possibleIds.add(`91${l10}@c.us`);
          possibleIds.add(`${l10}@s.whatsapp.net`);
        }
      }
    }
  }

  const cleanExtra = extraPhone ? String(extraPhone).replace(/\D/g, '') : '';
  if (cleanExtra) {
    possibleIds.add(cleanExtra);
    possibleIds.add(`${cleanExtra}@s.whatsapp.net`);
    possibleIds.add(`${cleanExtra}@c.us`);
    if (cleanExtra.length >= 10) {
      const last10 = cleanExtra.slice(-10);
      possibleIds.add(last10);
      possibleIds.add(`91${last10}`);
      possibleIds.add(`+91${last10}`);
      possibleIds.add(`91${last10}@s.whatsapp.net`);
      possibleIds.add(`91${last10}@c.us`);
      possibleIds.add(`${last10}@s.whatsapp.net`);
    }
  }

  // Lookup contact row to find all associated phone numbers
  try {
    const idClean = String(contactId || '').replace(/\D/g, '');
    const searchTarget = cleanExtra || idClean;
    const last10 = searchTarget.length >= 7 ? searchTarget.slice(-10) : '';

    const contactRow = await db.get(
      `SELECT id, phone, phone_normalized FROM contacts 
       WHERE (id = ? OR id LIKE ? OR phone = ? OR phone LIKE ? OR phone_normalized = ? OR phone_normalized LIKE ?) 
         AND tenant_id = ? LIMIT 1`,
      [contactId, `%${last10}%`, searchTarget, `%${last10}%`, last10, `%${last10}%`, tenantId]
    );

    if (contactRow) {
      if (contactRow.id) possibleIds.add(String(contactRow.id));
      const cleanP = String(contactRow.phone || contactRow.phone_normalized || '').replace(/\D/g, '');
      if (cleanP) {
        possibleIds.add(cleanP);
        possibleIds.add(`${cleanP}@s.whatsapp.net`);
        possibleIds.add(`${cleanP}@c.us`);
        if (cleanP.length >= 10) {
          const l10 = cleanP.slice(-10);
          possibleIds.add(l10);
          possibleIds.add(`91${l10}`);
          possibleIds.add(`+91${l10}`);
          possibleIds.add(`91${l10}@s.whatsapp.net`);
          possibleIds.add(`91${l10}@c.us`);
          possibleIds.add(`${l10}@s.whatsapp.net`);
        }
      }
    }
  } catch (e) {}

  const idDigits = String(contactId || '').replace(/\D/g, '');
  if (idDigits.length >= 7) {
    possibleIds.add(idDigits);
    possibleIds.add(`${idDigits}@s.whatsapp.net`);
    possibleIds.add(`${idDigits}@c.us`);
    if (idDigits.length >= 10) {
      const l10 = idDigits.slice(-10);
      possibleIds.add(l10);
      possibleIds.add(`91${l10}`);
      possibleIds.add(`+91${l10}`);
      possibleIds.add(`91${l10}@s.whatsapp.net`);
      possibleIds.add(`91${l10}@c.us`);
      possibleIds.add(`${l10}@s.whatsapp.net`);
    }
  }

  const idList = Array.from(possibleIds).filter(Boolean);
  if (idList.length === 0) return [];
  const placeholders = idList.map(() => '?').join(', ');

  const messages = await db.all(
    `SELECT m.*, s.phone_name as session_name 
     FROM messages m
     LEFT JOIN whatsapp_sessions s ON m.session_id = s.id
     WHERE m.tenant_id = ? AND m.contact_id IN (${placeholders})
     ORDER BY m.timestamp DESC
     LIMIT ? OFFSET ?`,
    [tenantId, ...idList, limit, offset]
  );
  return messages.reverse();
}

export async function getRecentChats(tenantId = 1, limit = 2000, offset = 0) {
  // Ultra-fast single-pass indexed Window CTE query (Executes in <10ms on 100,000+ records)
  const chats = await db.all(`
    WITH LatestMsg AS (
      SELECT contact_id,
             text_content,
             timestamp,
             from_me,
             media_type,
             ROW_NUMBER() OVER (PARTITION BY contact_id ORDER BY timestamp DESC, id DESC) as rn
      FROM messages
      WHERE tenant_id = ?
    ),
    UnreadSummary AS (
      SELECT contact_id, COUNT(*) as unread_count
      FROM messages
      WHERE tenant_id = ? AND from_me = 0 AND is_read = 0
      GROUP BY contact_id
    )
    SELECT c.*, 
           COALESCE(NULLIF(c.name, ''), c.custom_name, REPLACE(REPLACE(c.id, '@s.whatsapp.net', ''), '@g.us', '')) as displayName,
           REPLACE(REPLACE(c.id, '@s.whatsapp.net', ''), '@g.us', '') as phone_computed,
           lm.text_content as last_message_text,
           lm.text_content as lastMessage,
           lm.timestamp as last_message_time,
           lm.timestamp as lastMessageTime,
           lm.from_me as last_message_from_me,
           lm.media_type as last_message_media_type,
           COALESCE(us.unread_count, 0) as unread_count
    FROM contacts c
    LEFT JOIN LatestMsg lm ON (lm.contact_id = c.id OR lm.contact_id = c.id || '@s.whatsapp.net') AND lm.rn = 1
    LEFT JOIN UnreadSummary us ON (us.contact_id = c.id OR us.contact_id = c.id || '@s.whatsapp.net')
    WHERE c.tenant_id = ? 
      AND c.id != '0@s.whatsapp.net' 
      AND c.id NOT LIKE '%@lid'
      AND (c.is_archived IS NULL OR c.is_archived = 0)
    ORDER BY COALESCE(lm.timestamp, 0) DESC, c.created_at DESC
    LIMIT ? OFFSET ?
  `, [tenantId, tenantId, tenantId, limit, offset]);
  
  return chats.map(c => {
    try {
      c.labels = JSON.parse(c.labels || '[]');
    } catch {
      c.labels = [];
    }
    c.name = c.name || c.custom_name || c.displayName || c.phone_computed;
    c.phone = c.phone_computed || (c.id && c.id.includes('@') ? c.id.split('@')[0] : c.id);
    if (c.lastMessageTime && c.lastMessageTime < 10000000000) {
      c.lastMessageTime = c.lastMessageTime * 1000;
    }
    return c;
  });
}

export async function updateMessageMediaUrl(id, mediaUrl) {
  return await db.run("UPDATE messages SET media_url = ? WHERE id = ?", [mediaUrl, id]);
}

export async function markMessagesAsRead(contactId, tenantId = 1) {
  await db.run(
    `UPDATE messages SET is_read = 1 WHERE contact_id = ? AND tenant_id = ? AND from_me = 0`,
    [contactId, tenantId]
  );
}

// Chatbot Rules Helpers
export async function getChatbotRules(tenantId = 1) {
  return await db.all(`SELECT * FROM chatbot_rules WHERE tenant_id = ?`, [tenantId]);
}

export async function addChatbotRule(keyword, matchType, replyText, tenantId = 1) {
  await db.run(
    `INSERT OR REPLACE INTO chatbot_rules (keyword, match_type, reply_text, is_active, tenant_id) VALUES (?, ?, ?, 1, ?)`,
    [keyword.toLowerCase().trim(), matchType, replyText, tenantId]
  );
  return await db.get(`SELECT * FROM chatbot_rules WHERE keyword = ? AND tenant_id = ?`, [keyword.toLowerCase().trim(), tenantId]);
}

export async function deleteChatbotRule(id, tenantId = 1) {
  await db.run(`DELETE FROM chatbot_rules WHERE id = ? AND tenant_id = ?`, [id, tenantId]);
}

export async function toggleChatbotRule(id, isActive, tenantId = 1) {
  await db.run(`UPDATE chatbot_rules SET is_active = ? WHERE id = ? AND tenant_id = ?`, [isActive ? 1 : 0, id, tenantId]);
}

// Scheduled Messages Helpers
export async function saveScheduledMessage(sessionId, contactId, text, sendAt, tenantId = 1) {
  const result = await db.run(
    `INSERT INTO scheduled_messages (session_id, contact_id, message_text, send_at, status, tenant_id) VALUES (?, ?, ?, ?, 'pending', ?)`,
    [sessionId, contactId, text, sendAt, tenantId]
  );
  return await db.get(`SELECT * FROM scheduled_messages WHERE id = ? AND tenant_id = ?`, [result.lastID, tenantId]);
}

export async function getPendingScheduledMessages() {
  const nowUnix = Math.floor(Date.now() / 1000);
  return await db.all(
    `SELECT * FROM scheduled_messages WHERE status = 'pending' AND send_at <= ?`,
    [nowUnix]
  );
}

export async function updateScheduledMessageStatus(id, status, errorMessage = null) {
  await db.run(
    `UPDATE scheduled_messages SET status = ?, error_message = ? WHERE id = ?`,
    [status, errorMessage, id]
  );
}

export async function getScheduledMessagesForContact(contactId, tenantId = 1) {
  return await db.all(
    `SELECT * FROM scheduled_messages WHERE contact_id = ? AND tenant_id = ? ORDER BY send_at ASC`,
    [contactId, tenantId]
  );
}

export async function deleteScheduledMessage(id, tenantId = 1) {
  await db.run(`DELETE FROM scheduled_messages WHERE id = ? AND tenant_id = ?`, [id, tenantId]);
}

// Starred Messages Helpers
export async function updateMessageStarStatus(id, isStarred, tenantId = 1) {
  await db.run(`UPDATE messages SET is_starred = ? WHERE id = ? AND tenant_id = ?`, [isStarred ? 1 : 0, id, tenantId]);
  return await db.get(`SELECT * FROM messages WHERE id = ? AND tenant_id = ?`, [id, tenantId]);
}

export async function getStarredMessagesForContact(contactId, tenantId = 1) {
  return await db.all(
    `SELECT * FROM messages WHERE contact_id = ? AND tenant_id = ? AND is_starred = 1 ORDER BY timestamp ASC`,
    [contactId, tenantId]
  );
}

// Plan & Subscription Helpers
export async function getTenantPlanDetails(tenantId) {
  const tenant = await db.get(`SELECT plan_id, subscription_status FROM tenants WHERE id = ?`, [tenantId]);
  if (!tenant) return null;
  const plan = await db.get(`SELECT * FROM plans WHERE id = ?`, [tenant.plan_id || 'free_trial']);
  return {
    ...plan,
    features: plan?.features ? JSON.parse(plan.features) : [],
    subscription_status: tenant.subscription_status
  };
}

export async function getAllPlans(includeInactive = false) {
  const query = includeInactive ? `SELECT * FROM plans` : `SELECT * FROM plans WHERE is_active = 1`;
  const plans = await db.all(query);
  return plans.map(p => ({
    ...p,
    features: p.features ? (typeof p.features === 'string' ? JSON.parse(p.features) : p.features) : [],
    included_modules: p.included_modules ? (typeof p.included_modules === 'string' ? JSON.parse(p.included_modules) : p.included_modules) : []
  }));
}

export async function addOrUpdatePlan(id, name, description, features, maxChannels, maxContacts, allowChatbot, allowScheduler, isActive, includedModules = [], maxEmployees = 5) {
  const incMods = Array.isArray(includedModules) ? JSON.stringify(includedModules) : (typeof includedModules === 'string' ? includedModules : '[]');
  const feats = Array.isArray(features) ? JSON.stringify(features) : (typeof features === 'string' ? features : '[]');
  await db.run(
    `INSERT OR REPLACE INTO plans (id, name, description, features, max_channels, max_contacts, max_employees, allow_chatbot, allow_scheduler, is_active, included_modules)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, name, description, feats, parseInt(maxChannels) || 1, parseInt(maxContacts) || 250, parseInt(maxEmployees) || 5, allowChatbot ? 1 : 0, allowScheduler ? 1 : 0, isActive ? 1 : 0, incMods]
  );
  const updated = await db.get(`SELECT * FROM plans WHERE id = ?`, [id]);
  if (updated) {
    try { updated.features = JSON.parse(updated.features); } catch (e) {}
    try { updated.included_modules = JSON.parse(updated.included_modules); } catch (e) {}
  }
  return updated;
}

export async function getPlanPrices(planId) {
  return await db.all(`SELECT * FROM plan_prices WHERE plan_id = ?`, [planId]);
}

export async function updatePlanPrice(planId, countryCode, currency, amount, stripePriceId) {
  await db.run(
    `INSERT OR REPLACE INTO plan_prices (plan_id, country_code, currency, amount, stripe_price_id)
     VALUES (?, ?, ?, ?, ?)`,
    [planId, countryCode.toUpperCase().trim(), currency.toUpperCase().trim(), amount, stripePriceId]
  );
}

export async function deletePlanPrice(planId, countryCode) {
  await db.run(`DELETE FROM plan_prices WHERE plan_id = ? AND country_code = ?`, [planId, countryCode]);
}

export async function getPlansWithPrices(countryCode = 'DEFAULT') {
  const activePlans = await db.all(`SELECT * FROM plans WHERE is_active = 1`);
  const plansWithPricing = [];

  for (const plan of activePlans) {
    // Try to get country specific price, fallback to DEFAULT
    let price = await db.get(`SELECT * FROM plan_prices WHERE plan_id = ? AND country_code = ?`, [plan.id, countryCode.toUpperCase()]);
    if (!price && countryCode !== 'DEFAULT') {
      price = await db.get(`SELECT * FROM plan_prices WHERE plan_id = ? AND country_code = 'DEFAULT'`, [plan.id]);
    }
    
    plansWithPricing.push({
      ...plan,
      features: plan.features ? JSON.parse(plan.features) : [],
      price: price ? {
        currency: price.currency,
        amount: price.amount,
        stripe_price_id: price.stripe_price_id,
        country_code: price.country_code
      } : null
    });
  }

  return plansWithPricing;
}

// Employee Directory Helpers
export async function getEmployees(tenantId) {
  return await db.all(`SELECT * FROM employees WHERE tenant_id = ? ORDER BY id DESC`, [tenantId]);
}

export async function getEmployeesCount(tenantId) {
  const result = await db.get(`SELECT COUNT(*) as count FROM employees WHERE tenant_id = ?`, [tenantId]);
  return result ? result.count : 0;
}

export async function createEmployee(tenantId, employeeData) {
  const { firstName, lastName, email, phone, role, department, salary, userId } = employeeData;
  const result = await db.run(
    `INSERT INTO employees (tenant_id, first_name, last_name, email, phone, role, department, salary, user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [tenantId, firstName, lastName, email || null, phone || null, role || 'employee', department || null, parseFloat(salary) || 0, userId || null]
  );
  return await db.get(`SELECT * FROM employees WHERE id = ? AND tenant_id = ?`, [result.lastID, tenantId]);
}

export async function updateEmployee(tenantId, id, employeeData) {
  const { firstName, lastName, email, phone, role, department, salary, status } = employeeData;
  await db.run(
    `UPDATE employees 
     SET first_name = ?, last_name = ?, email = ?, phone = ?, role = ?, department = ?, salary = ?, status = ?
     WHERE id = ? AND tenant_id = ?`,
    [firstName, lastName, email || null, phone || null, role || 'employee', department || null, parseFloat(salary) || 0, status || 'active', id, tenantId]
  );
  return await db.get(`SELECT * FROM employees WHERE id = ? AND tenant_id = ?`, [id, tenantId]);
}

export async function deleteEmployee(tenantId, id) {
  // If there's an associated user login account, delete it as well
  const employee = await db.get(`SELECT user_id FROM employees WHERE id = ? AND tenant_id = ?`, [id, tenantId]);
  if (employee && employee.user_id) {
    await db.run(`DELETE FROM users WHERE id = ? AND tenant_id = ?`, [employee.user_id, tenantId]);
  }
  await db.run(`DELETE FROM employees WHERE id = ? AND tenant_id = ?`, [id, tenantId]);
}

// GPS & Attendance Helpers
export async function getAttendanceLogs(tenantId) {
  return await db.all(
    `SELECT a.*, e.first_name, e.last_name, e.role, e.department 
     FROM attendance_logs a
     JOIN employees e ON a.employee_id = e.id
     WHERE a.tenant_id = ? 
     ORDER BY a.id DESC LIMIT 100`,
    [tenantId]
  );
}

export async function getEmployeeAttendanceToday(tenantId, employeeId) {
  return await db.get(
    `SELECT * FROM attendance_logs 
     WHERE tenant_id = ? AND employee_id = ? 
     ORDER BY id DESC LIMIT 1`,
    [tenantId, employeeId]
  );
}

export async function checkInEmployee(tenantId, employeeId, lat, lng) {
  const result = await db.run(
    `INSERT INTO attendance_logs (tenant_id, employee_id, check_in_lat, check_in_lng, status)
     VALUES (?, ?, ?, ?, 'checked_in')`,
    [tenantId, employeeId, lat || null, lng || null]
  );
  return await db.get(`SELECT * FROM attendance_logs WHERE id = ?`, [result.lastID]);
}

export async function checkOutEmployee(tenantId, employeeId, lat, lng) {
  const activeLog = await db.get(
    `SELECT id FROM attendance_logs 
     WHERE tenant_id = ? AND employee_id = ? AND status = 'checked_in' 
     ORDER BY id DESC LIMIT 1`,
    [tenantId, employeeId]
  );
  if (!activeLog) throw new Error('No active check-in found.');

  await db.run(
    `UPDATE attendance_logs 
     SET check_out_time = CURRENT_TIMESTAMP, check_out_lat = ?, check_out_lng = ?, status = 'checked_out'
     WHERE id = ?`,
    [lat || null, lng || null, activeLog.id]
  );
  return await db.get(`SELECT * FROM attendance_logs WHERE id = ?`, [activeLog.id]);
}

export async function addGpsLocation(tenantId, employeeId, lat, lng, accuracy) {
  await db.run(
    `INSERT INTO gps_locations (tenant_id, employee_id, latitude, longitude, accuracy)
     VALUES (?, ?, ?, ?, ?)`,
    [tenantId, employeeId, lat, lng, accuracy || null]
  );
}

export async function getLiveLocations(tenantId) {
  return await db.all(
    `SELECT g.*, e.first_name, e.last_name, e.role, e.department, a.check_in_time 
     FROM gps_locations g
     JOIN employees e ON g.employee_id = e.id
     JOIN attendance_logs a ON a.employee_id = e.id AND a.status = 'checked_in'
     WHERE g.tenant_id = ? 
       AND g.id = (
         SELECT id FROM gps_locations 
         WHERE employee_id = g.employee_id 
         ORDER BY recorded_at DESC LIMIT 1
       )
     ORDER BY g.recorded_at DESC`,
    [tenantId]
  );
}

export async function getGpsHistory(tenantId, employeeId, dateStr) {
  const filterDate = dateStr ? `${dateStr}%` : '20%';
  return await db.all(
    `SELECT * FROM gps_locations 
     WHERE tenant_id = ? AND employee_id = ? AND recorded_at LIKE ?
     ORDER BY recorded_at ASC`,
    [tenantId, employeeId, filterDate]
  );
}

// Tasks Helpers
export async function getTasks(tenantId) {
  return await db.all(
    `SELECT t.*, e.first_name, e.last_name 
     FROM tasks t
     LEFT JOIN employees e ON t.assigned_to = e.id
     WHERE t.tenant_id = ?
     ORDER BY t.id DESC`,
    [tenantId]
  );
}

export async function createTask(tenantId, taskData) {
  const { title, description, assignedTo, priority, status, dueDate } = taskData;
  const result = await db.run(
    `INSERT INTO tasks (tenant_id, title, description, assigned_to, priority, status, due_date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [tenantId, title, description || null, assignedTo || null, priority || 'Medium', status || 'To Do', dueDate || null]
  );
  return await db.get(`SELECT * FROM tasks WHERE id = ?`, [result.lastID]);
}

export async function updateTask(tenantId, id, taskData) {
  const { title, description, assignedTo, priority, status, dueDate } = taskData;
  await db.run(
    `UPDATE tasks 
     SET title = ?, description = ?, assigned_to = ?, priority = ?, status = ?, due_date = ?
     WHERE id = ? AND tenant_id = ?`,
    [title, description || null, assignedTo || null, priority || 'Medium', status || 'To Do', dueDate || null, id, tenantId]
  );
  return await db.get(`SELECT * FROM tasks WHERE id = ?`, [id]);
}

export async function deleteTask(tenantId, id) {
  await db.run(`DELETE FROM tasks WHERE id = ? AND tenant_id = ?`, [id, tenantId]);
}

// Notices Helpers
export async function getNotices(tenantId) {
  return await db.all(
    `SELECT * FROM notices WHERE tenant_id = ? ORDER BY id DESC`,
    [tenantId]
  );
}

export async function createNotice(tenantId, noticeData) {
  const { title, content } = noticeData;
  const result = await db.run(
    `INSERT INTO notices (tenant_id, title, content) VALUES (?, ?, ?)`,
    [tenantId, title, content || null]
  );
  return await db.get(`SELECT * FROM notices WHERE id = ?`, [result.lastID]);
}

export async function deleteNotice(tenantId, id) {
  await db.run(`DELETE FROM notices WHERE id = ? AND tenant_id = ?`, [id, tenantId]);
}

// Holidays Helpers
export async function getHolidays(tenantId) {
  return await db.all(
    `SELECT * FROM holidays WHERE tenant_id = ? ORDER BY date ASC`,
    [tenantId]
  );
}

export async function createHoliday(tenantId, holidayData) {
  const { name, date } = holidayData;
  const result = await db.run(
    `INSERT INTO holidays (tenant_id, name, date) VALUES (?, ?, ?)`,
    [tenantId, name, date]
  );
  return await db.get(`SELECT * FROM holidays WHERE id = ?`, [result.lastID]);
}

export async function deleteHoliday(tenantId, id) {
  await db.run(`DELETE FROM holidays WHERE id = ? AND tenant_id = ?`, [id, tenantId]);
}

// Leaves Helpers
export async function getLeaves(tenantId) {
  return await db.all(
    `SELECT l.*, e.first_name, e.last_name, e.department, e.role
     FROM leaves l
     JOIN employees e ON l.employee_id = e.id
     WHERE l.tenant_id = ?
     ORDER BY l.id DESC`,
    [tenantId]
  );
}

export async function createLeave(tenantId, leaveData) {
  const { employeeId, startDate, endDate, type, reason } = leaveData;
  const result = await db.run(
    `INSERT INTO leaves (tenant_id, employee_id, start_date, end_date, type, reason, status)
     VALUES (?, ?, ?, ?, ?, ?, 'Pending')`,
    [tenantId, employeeId, startDate, endDate, type || 'Sick', reason || null]
  );
  return await db.get(`SELECT * FROM leaves WHERE id = ?`, [result.lastID]);
}

export async function updateLeaveStatus(tenantId, id, status) {
  await db.run(
    `UPDATE leaves SET status = ? WHERE id = ? AND tenant_id = ?`,
    [status, id, tenantId]
  );
  return await db.get(`SELECT * FROM leaves WHERE id = ?`, [id]);
}

// ==========================================
// 📱 SIM BRIDGE & TELECALLING HELPERS
// ==========================================

export async function getSimBridgeDevices(tenantId = 1) {
  return await db.all(
    `SELECT * FROM sim_bridge_devices WHERE tenant_id = ? ORDER BY last_seen DESC`,
    [tenantId]
  );
}

export async function getSimBridgeDeviceByStaff(tenantId = 1, staffId) {
  return await db.get(
    `SELECT * FROM sim_bridge_devices WHERE tenant_id = ? AND (staff_id = ? OR extension = ?)`,
    [tenantId, String(staffId), String(staffId)]
  );
}

export async function getSimBridgeDeviceByExtension(tenantId = 1, extension) {
  return await db.get(
    `SELECT * FROM sim_bridge_devices WHERE tenant_id = ? AND extension = ?`,
    [tenantId, String(extension)]
  );
}

export async function registerOrUpdateSimDevice(tenantId = 1, deviceData) {
  const { staffId, staffName, extension, pin, deviceId, deviceName, simCarrier, simNumber, deviceIp, batteryLevel, status } = deviceData;
  const ext = String(extension || staffId || '101');
  const existing = await db.get(
    `SELECT id FROM sim_bridge_devices WHERE tenant_id = ? AND (device_id = ? OR extension = ? OR staff_id = ?)`,
    [tenantId, deviceId, ext, String(staffId)]
  );

  if (existing) {
    await db.run(
      `UPDATE sim_bridge_devices 
       SET staff_id = ?, staff_name = ?, extension = ?, pin = ?, device_name = ?, sim_carrier = ?, sim_number = ?, device_ip = ?, battery_level = ?, status = ?, last_seen = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [String(staffId || ext), staffName || 'Staff Agent', ext, pin || '1234', deviceName || 'Android Phone', simCarrier || 'Mobile SIM (Active)', simNumber || '', deviceIp || '127.0.0.1', batteryLevel || 100, status || 'online', existing.id]
    );
    return await db.get(`SELECT * FROM sim_bridge_devices WHERE id = ?`, [existing.id]);
  } else {
    const result = await db.run(
      `INSERT INTO sim_bridge_devices (tenant_id, staff_id, staff_name, extension, pin, device_id, device_name, sim_carrier, sim_number, device_ip, battery_level, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [tenantId, String(staffId || ext), staffName || 'Staff Agent', ext, pin || '1234', deviceId || `DEV_${Date.now()}`, deviceName || 'Android Phone', simCarrier || 'Mobile SIM (Active)', simNumber || '', deviceIp || '127.0.0.1', batteryLevel || 100, status || 'online']
    );
    return await db.get(`SELECT * FROM sim_bridge_devices WHERE id = ?`, [result.lastID]);
  }
}

export async function getCallLogs(tenantId = 1, limit = 100) {
  return await db.all(
    `SELECT * FROM call_logs WHERE tenant_id = ? ORDER BY id DESC LIMIT ?`,
    [tenantId, limit]
  );
}

export async function createCallLog(tenantId = 1, logData) {
  const { staffId, staffName, customerName, customerPhone, channel, type, durationSeconds, recordingUrl, disposition, notes } = logData;
  const result = await db.run(
    `INSERT INTO call_logs (tenant_id, staff_id, staff_name, customer_name, customer_phone, channel, type, duration_seconds, recording_url, disposition, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [tenantId, staffId || '1', staffName || 'Telecaller', customerName || 'Customer', customerPhone, channel || 'SIM', type || 'OUTGOING', durationSeconds || 0, recordingUrl || '', disposition || 'Interested', notes || '']
  );
  return await db.get(`SELECT * FROM call_logs WHERE id = ?`, [result.lastID]);
}

export async function findRecentCallLog(tenantId = 1, customerPhone, callId = '') {
  if (callId) {
    const byId = await db.get(
      `SELECT * FROM call_logs WHERE tenant_id = ? AND notes LIKE ? ORDER BY id DESC LIMIT 1`,
      [tenantId, `%${callId}%`]
    );
    if (byId) return byId;
  }
  if (customerPhone) {
    const cleanPhone = String(customerPhone).replace(/\D/g, '').slice(-10);
    return await db.get(
      `SELECT * FROM call_logs WHERE tenant_id = ? AND customer_phone LIKE ? AND created_at >= datetime('now', '-15 minutes') ORDER BY id DESC LIMIT 1`,
      [tenantId, `%${cleanPhone}%`]
    );
  }
  return null;
}

export async function updateCallLog(tenantId = 1, id, updates = {}) {
  if (!id) return null;
  const existing = await db.get(`SELECT * FROM call_logs WHERE id = ? AND tenant_id = ?`, [id, tenantId]);
  if (!existing) return null;

  const fields = [];
  const values = [];
  if (updates.disposition) { fields.push('disposition = ?'); values.push(updates.disposition); }
  if (updates.notes) { fields.push('notes = ?'); values.push(updates.notes); }
  if (updates.recordingUrl) { fields.push('recording_url = ?'); values.push(updates.recordingUrl); }
  if (updates.durationSeconds) { fields.push('duration_seconds = ?'); values.push(updates.durationSeconds); }

  if (fields.length === 0) return existing;
  values.push(id, tenantId);
  await db.run(`UPDATE call_logs SET ${fields.join(', ')} WHERE id = ? AND tenant_id = ?`, values);
  return await db.get(`SELECT * FROM call_logs WHERE id = ?`, [id]);
}


// ==========================================
// 📞 CLOUD TELEPHONY (VOXBAY) HELPERS
// ==========================================

export async function createCallRecord(tenantId = 1, callData = {}) {
  const {
    user_id,
    contact_id,
    phone_number,
    caller_id,
    agent_extension,
    provider = 'voxbay',
    provider_call_id,
    direction = 'outbound',
    status = 'initiated',
    duration = 0,
    conversation_duration = 0,
    recording_url = '',
    dtmf = '',
    notes = '',
    metadata = ''
  } = callData;

  const result = await db.run(
    `INSERT INTO calls (
      tenant_id, user_id, contact_id, phone_number, caller_id, agent_extension,
      provider, provider_call_id, direction, status, duration, conversation_duration,
      recording_url, dtmf, notes, metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      tenantId,
      user_id || null,
      contact_id || null,
      phone_number,
      caller_id || '',
      agent_extension || '101',
      provider,
      provider_call_id,
      direction,
      status,
      duration,
      conversation_duration,
      recording_url,
      dtmf,
      notes,
      metadata
    ]
  );

  return await db.get(`SELECT * FROM calls WHERE id = ?`, [result.lastID]);
}

export async function updateCallRecord(providerCallId, updates = {}) {
  if (!providerCallId) return null;

  const existing = await db.get(`SELECT * FROM calls WHERE provider_call_id = ? OR id = ?`, [providerCallId, providerCallId]);
  if (!existing) return null;

  const fields = [];
  const values = [];

  const allowedFields = [
    'status', 'duration', 'conversation_duration', 'recording_url',
    'dtmf', 'notes', 'metadata', 'answered_at', 'ended_at'
  ];

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push(updates[field]);
    }
  }

  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(existing.id);

  await db.run(
    `UPDATE calls SET ${fields.join(', ')} WHERE id = ?`,
    values
  );

  return await db.get(`SELECT * FROM calls WHERE id = ?`, [existing.id]);
}

export async function getCallByProviderId(providerCallId) {
  return await db.get(
    `SELECT * FROM calls WHERE provider_call_id = ? OR id = ?`,
    [providerCallId, providerCallId]
  );
}

export async function getTenantCalls(tenantId = 1, options = {}) {
  const { status, search, limit = 100, offset = 0 } = options;
  let query = `SELECT * FROM calls WHERE tenant_id = ?`;
  const params = [tenantId];

  if (status && status !== 'all' && status !== 'ALL') {
    query += ` AND status = ?`;
    params.push(status.toLowerCase());
  }

  if (search) {
    query += ` AND (phone_number LIKE ? OR caller_id LIKE ? OR notes LIKE ? OR provider_call_id LIKE ?)`;
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  query += ` ORDER BY id DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  return await db.all(query, params);
}

export async function getCallingStats(tenantId = 1) {
  const totalRow = await db.get(`SELECT COUNT(*) as total FROM calls WHERE tenant_id = ?`, [tenantId]);
  const answeredRow = await db.get(`SELECT COUNT(*) as answered FROM calls WHERE tenant_id = ? AND (status = 'answered' OR status = 'completed')`, [tenantId]);
  const durationRow = await db.get(`SELECT SUM(duration) as totalDuration, SUM(conversation_duration) as totalTalkTime FROM calls WHERE tenant_id = ?`, [tenantId]);
  const missedRow = await db.get(`SELECT COUNT(*) as missed FROM calls WHERE tenant_id = ? AND (status = 'no_answer' OR status = 'cancelled' OR status = 'rejected')`, [tenantId]);
  const busyRow = await db.get(`SELECT COUNT(*) as busy FROM calls WHERE tenant_id = ? AND status = 'busy'`, [tenantId]);

  const total = totalRow?.total || 0;
  const answered = answeredRow?.answered || 0;
  const totalTalkTime = durationRow?.totalTalkTime || durationRow?.totalDuration || 0;
  const avgDuration = total > 0 ? Math.round(totalTalkTime / total) : 0;
  const answerRate = total > 0 ? Math.round((answered / total) * 100) : 0;

  return {
    totalCalls: total,
    answeredCalls: answered,
    missedCalls: missedRow?.missed || 0,
    busyCalls: busyRow?.busy || 0,
    totalTalkTime,
    avgDuration,
    answerRate
  };
}


export async function getTelephonySettings(tenantId = 1) {
  let settings = await db.get(`SELECT * FROM telephony_settings WHERE tenant_id = ?`, [tenantId]);
  if (!settings) {
    settings = {
      tenant_id: tenantId,
      provider: 'voxbay',
      uid: process.env.VOXBAY_UID || '',
      upin: process.env.VOXBAY_UPIN || '',
      caller_id: process.env.VOXBAY_CALLER_ID || '91487110000',
      extension: process.env.VOXBAY_EXTENSION || '101',
      mode: process.env.VOXBAY_MODE || 'extension_to_mobile',
      dept_id: process.env.VOXBAY_DEPT_ID || '0',
      recording_base_url: process.env.VOXBAY_RECORDING_BASE_URL || 'https://x.voxbay.com:81/callcenter/'
    };
    try {
      await db.run(
        `INSERT OR IGNORE INTO telephony_settings (tenant_id, provider, uid, upin, caller_id, extension, mode, dept_id, recording_base_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [tenantId, settings.provider, settings.uid, settings.upin, settings.caller_id, settings.extension, settings.mode, settings.dept_id, settings.recording_base_url]
      );
    } catch(e) {}
  }
  return settings;
}

export async function saveTelephonySettings(tenantId = 1, data = {}) {
  const { uid, upin, callerId, extension, mode, sourceNumber, deptId } = data;
  const existing = await db.get(`SELECT * FROM telephony_settings WHERE tenant_id = ?`, [tenantId]);
  
  if (existing) {
    await db.run(
      `UPDATE telephony_settings 
       SET uid = COALESCE(?, uid),
           upin = COALESCE(?, upin),
           caller_id = COALESCE(?, caller_id),
           extension = COALESCE(?, extension),
           mode = COALESCE(?, mode),
           source_number = COALESCE(?, source_number),
           dept_id = COALESCE(?, dept_id),
           updated_at = CURRENT_TIMESTAMP
       WHERE tenant_id = ?`,
      [uid !== undefined ? uid : existing.uid,
       upin !== undefined && upin !== '' ? upin : existing.upin,
       callerId !== undefined ? callerId : existing.caller_id,
       extension !== undefined ? extension : existing.extension,
       mode !== undefined ? mode : existing.mode,
       sourceNumber !== undefined ? sourceNumber : existing.source_number,
       deptId !== undefined ? deptId : existing.dept_id,
       tenantId]
    );
  } else {
    await db.run(
      `INSERT INTO telephony_settings (tenant_id, uid, upin, caller_id, extension, mode, source_number, dept_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [tenantId, uid || '', upin || '', callerId || '91487110000', extension || '101', mode || 'extension_to_mobile', sourceNumber || '', deptId || '0']
    );
  }
  return await db.get(`SELECT * FROM telephony_settings WHERE tenant_id = ?`, [tenantId]);
}

// Export database connection instance for transactions
export async function getAllTenantTelephonyConfigs() {
  const tenants = await db.all(`SELECT id, company_name, subscription_status FROM tenants ORDER BY id ASC`);
  const configs = await db.all(`SELECT * FROM tenant_telephony_settings`);
  const configMap = new Map();
  configs.forEach(c => configMap.set(c.tenant_id, c));

  return tenants.map(t => {
    const existing = configMap.get(t.id);
    return {
      tenant_id: t.id,
      company_name: t.name || `Company #${t.id}`,
      email: t.email,
      plan_id: t.plan_id,
      provider: existing?.provider || 'voxbay',
      voxbay_uid: existing?.voxbay_uid || 'x97x4zzfz1',
      voxbay_upin: existing?.voxbay_upin || '8uqctamkgf',
      voxbay_did: existing?.voxbay_did || '918031496345',
      allowed_extensions: existing?.allowed_extensions || '101,102,103,104,105',
      calling_mode: existing?.calling_mode || 'mobile_to_mobile',
      default_agent_mobile: existing?.default_agent_mobile || '6283513686',
      default_extension: existing?.default_extension || '111',
      is_enabled: existing ? existing.is_enabled : 1,
      monthly_quota_minutes: existing?.monthly_quota_minutes || 500,
      notes: existing?.notes || ''
    };
  });
}

export async function saveTenantTelephonyConfig(tenantId, data = {}) {
  const {
    provider = 'voxbay',
    voxbay_uid = 'x97x4zzfz1',
    voxbay_upin = '8uqctamkgf',
    voxbay_did = '918031496345',
    allowed_extensions = '101,102,103,104,105',
    calling_mode = 'mobile_to_mobile',
    default_agent_mobile = '6283513686',
    default_extension = '111',
    is_enabled = 1,
    monthly_quota_minutes = 500,
    notes = ''
  } = data;

  const existing = await db.get(`SELECT * FROM tenant_telephony_settings WHERE tenant_id = ?`, [tenantId]);

  if (existing) {
    await db.run(
      `UPDATE tenant_telephony_settings
       SET provider = ?,
           voxbay_uid = ?,
           voxbay_upin = ?,
           voxbay_did = ?,
           allowed_extensions = ?,
           calling_mode = ?,
           default_agent_mobile = ?,
           default_extension = ?,
           is_enabled = ?,
           monthly_quota_minutes = ?,
           notes = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE tenant_id = ?`,
      [provider, voxbay_uid, voxbay_upin, voxbay_did, allowed_extensions, calling_mode, default_agent_mobile, default_extension, is_enabled, monthly_quota_minutes, notes, tenantId]
    );
  } else {
    await db.run(
      `INSERT INTO tenant_telephony_settings
       (tenant_id, provider, voxbay_uid, voxbay_upin, voxbay_did, allowed_extensions, calling_mode, default_agent_mobile, default_extension, is_enabled, monthly_quota_minutes, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [tenantId, provider, voxbay_uid, voxbay_upin, voxbay_did, allowed_extensions, calling_mode, default_agent_mobile, default_extension, is_enabled, monthly_quota_minutes, notes]
    );
  }

  return await db.get(`SELECT * FROM tenant_telephony_settings WHERE tenant_id = ?`, [tenantId]);
}

export async function getCompanyKyc(tenantId = 1) {
  let kyc = await db.get(`SELECT * FROM company_kyc_profiles WHERE tenant_id = ?`, [tenantId]);
  if (!kyc) {
    // Check if tenant exists to pull basic company name
    const tenant = await db.get(`SELECT company_name FROM tenants WHERE id = ?`, [tenantId]);
    kyc = {
      tenant_id: tenantId,
      company_name: tenant?.company_name || 'My Company',
      country: 'India',
      state: 'Punjab',
      pincode: '141001',
      address: '',
      gst_number: '',
      company_proof_type: 'GST Registration Certificate',
      company_proof_url: '',
      auth_person_name: 'Company Owner',
      auth_person_email: tenant?.email || '',
      auth_person_phone: '',
      auth_person_country: 'India',
      auth_person_address: '',
      auth_person_pincode: '141001',
      id_proof_type: 'Aadhaar Card',
      id_proof_url: '',
      profile_photo_url: '',
      status: 'not_submitted',
      admin_remarks: ''
    };
  }
  return kyc;
}

export async function saveCompanyKyc(tenantId, data = {}) {
  const existing = await db.get(`SELECT * FROM company_kyc_profiles WHERE tenant_id = ?`, [tenantId]);
  const now = new Date().toISOString();

  if (existing) {
    await db.run(
      `UPDATE company_kyc_profiles
       SET company_name = COALESCE(?, company_name),
           country = COALESCE(?, country),
           state = COALESCE(?, state),
           pincode = COALESCE(?, pincode),
           address = COALESCE(?, address),
           gst_number = COALESCE(?, gst_number),
           company_proof_type = COALESCE(?, company_proof_type),
           company_proof_url = COALESCE(?, company_proof_url),
           auth_person_name = COALESCE(?, auth_person_name),
           auth_person_email = COALESCE(?, auth_person_email),
           auth_person_phone = COALESCE(?, auth_person_phone),
           auth_person_country = COALESCE(?, auth_person_country),
           auth_person_address = COALESCE(?, auth_person_address),
           auth_person_pincode = COALESCE(?, auth_person_pincode),
           id_proof_type = COALESCE(?, id_proof_type),
           id_proof_url = COALESCE(?, id_proof_url),
           profile_photo_url = COALESCE(?, profile_photo_url),
           status = 'pending',
           submitted_at = ?,
           updated_at = ?
       WHERE tenant_id = ?`,
      [
        data.company_name, data.country, data.state, data.pincode, data.address, data.gst_number,
        data.company_proof_type, data.company_proof_url, data.auth_person_name, data.auth_person_email,
        data.auth_person_phone, data.auth_person_country, data.auth_person_address, data.auth_person_pincode,
        data.id_proof_type, data.id_proof_url, data.profile_photo_url, now, now, tenantId
      ]
    );
  } else {
    await db.run(
      `INSERT INTO company_kyc_profiles
       (tenant_id, company_name, country, state, pincode, address, gst_number, company_proof_type, company_proof_url,
        auth_person_name, auth_person_email, auth_person_phone, auth_person_country, auth_person_address, auth_person_pincode,
        id_proof_type, id_proof_url, profile_photo_url, status, submitted_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [
        tenantId, data.company_name || '', data.country || 'India', data.state || '', data.pincode || '',
        data.address || '', data.gst_number || '', data.company_proof_type || 'GST Registration Certificate',
        data.company_proof_url || '', data.auth_person_name || '', data.auth_person_email || '',
        data.auth_person_phone || '', data.auth_person_country || 'India', data.auth_person_address || '',
        data.auth_person_pincode || '', data.id_proof_type || 'Aadhaar Card', data.id_proof_url || '',
        data.profile_photo_url || '', now, now
      ]
    );
  }
  return await db.get(`SELECT * FROM company_kyc_profiles WHERE tenant_id = ?`, [tenantId]);
}

export async function getAllKycSubmissions() {
  const list = await db.all(`
    SELECT k.*, t.company_name as tenant_company_name, t.subscription_status
    FROM company_kyc_profiles k
    LEFT JOIN tenants t ON k.tenant_id = t.id
    ORDER BY k.updated_at DESC
  `);
  return list;
}

export async function updateKycStatus(tenantId, status, remarks = '', adminName = 'SuperAdmin') {
  const now = new Date().toISOString();
  await db.run(
    `UPDATE company_kyc_profiles
     SET status = ?,
         admin_remarks = ?,
         verified_by = ?,
         verified_at = ?,
         updated_at = ?
     WHERE tenant_id = ?`,
    [status, remarks, adminName, status === 'verified' ? now : null, now, tenantId]
  );
  return await db.get(`SELECT * FROM company_kyc_profiles WHERE tenant_id = ?`, [tenantId]);
}

// ==========================================
// ⚡ GOHIGHLEVEL (GHL) DATABASE HELPER FUNCTIONS
// ==========================================

export async function ensureTenantRowExists(tenantId, companyName = '') {
  if (!tenantId || tenantId === 'undefined' || tenantId === 'null') return 1;
  // If numeric
  if (typeof tenantId === 'number' || (/^\d+$/.test(String(tenantId).trim()))) {
    const num = parseInt(tenantId, 10);
    const row = await db.get(`SELECT id FROM tenants WHERE id = ?`, [num]);
    if (!row) {
      await db.run(`INSERT OR IGNORE INTO tenants (id, company_name) VALUES (?, ?)`, [num, companyName || `Company ${num}`]);
    }
    return num;
  }

  // If string (e.g. 'org_6e625WqmbKCdRrvted' or locationId)
  const strId = String(tenantId).trim();
  const existing = await db.get(`SELECT id FROM tenants WHERE company_name = ?`, [strId]);
  if (existing) {
    return existing.id;
  }
  const ins = await db.run(`INSERT INTO tenants (company_name) VALUES (?)`, [strId]);
  return ins.lastID;
}

export async function saveGhlIntegration(tenantId, data = {}) {
  const safeTenantId = await ensureTenantRowExists(tenantId, data?.companyId || tenantId);

  const {
    locationId,
    companyId = '',
    userId = '',
    userType = 'Location',
    accessToken = 'ghl_direct_link_' + locationId,
    refreshToken = 'ghl_direct_link_' + locationId,
    tokenType = 'Bearer',
    expiresIn = 86400,
    expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    scope = 'contacts,conversations,opportunities,workflows,locations',
    isActive = 1,
    syncContacts = 1,
    syncConversations = 1,
    syncCalls = 1,
    syncOpportunities = 1,
    metadata = '{}'
  } = data;

  if (!locationId) throw new Error('[db] locationId is required for GHL integration');

  let hasGhlLocationIdCol = false;
  try {
    const cols = await db.all('PRAGMA table_info(ghl_integrations)');
    hasGhlLocationIdCol = cols.some(c => c.name === 'ghl_location_id');
  } catch (e) {}

  const existing = hasGhlLocationIdCol
    ? await db.get(`SELECT id FROM ghl_integrations WHERE tenant_id = ? OR location_id = ? OR ghl_location_id = ?`, [safeTenantId, locationId, locationId])
    : await db.get(`SELECT id FROM ghl_integrations WHERE tenant_id = ? OR location_id = ?`, [safeTenantId, locationId]);

  if (existing) {
    if (hasGhlLocationIdCol) {
      await db.run(
        `UPDATE ghl_integrations
         SET tenant_id = ?,
             ghl_location_id = COALESCE(?, ghl_location_id, location_id),
             location_id = COALESCE(?, location_id, ghl_location_id),
             company_id = COALESCE(?, company_id),
             user_id = COALESCE(?, user_id),
             user_type = COALESCE(?, user_type),
             access_token = COALESCE(?, access_token),
             refresh_token = COALESCE(?, refresh_token),
             token_type = COALESCE(?, token_type),
             expires_in = COALESCE(?, expires_in),
             expires_at = COALESCE(?, expires_at),
             scope = COALESCE(?, scope),
             is_active = COALESCE(?, is_active),
             sync_contacts = COALESCE(?, sync_contacts),
             sync_conversations = COALESCE(?, sync_conversations),
             sync_calls = COALESCE(?, sync_calls),
             sync_opportunities = COALESCE(?, sync_opportunities),
             metadata = COALESCE(?, metadata),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          safeTenantId, locationId, locationId, companyId, userId, userType, accessToken, refreshToken, tokenType,
          expiresIn, expiresAt, scope, isActive, syncContacts, syncConversations,
          syncCalls, syncOpportunities, typeof metadata === 'string' ? metadata : JSON.stringify(metadata),
          existing.id
        ]
      );
    } else {
      await db.run(
        `UPDATE ghl_integrations
         SET tenant_id = ?,
             location_id = COALESCE(?, location_id),
             company_id = COALESCE(?, company_id),
             user_id = COALESCE(?, user_id),
             user_type = COALESCE(?, user_type),
             access_token = COALESCE(?, access_token),
             refresh_token = COALESCE(?, refresh_token),
             token_type = COALESCE(?, token_type),
             expires_in = COALESCE(?, expires_in),
             expires_at = COALESCE(?, expires_at),
             scope = COALESCE(?, scope),
             is_active = COALESCE(?, is_active),
             sync_contacts = COALESCE(?, sync_contacts),
             sync_conversations = COALESCE(?, sync_conversations),
             sync_calls = COALESCE(?, sync_calls),
             sync_opportunities = COALESCE(?, sync_opportunities),
             metadata = COALESCE(?, metadata),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          safeTenantId, locationId, companyId, userId, userType, accessToken, refreshToken, tokenType,
          expiresIn, expiresAt, scope, isActive, syncContacts, syncConversations,
          syncCalls, syncOpportunities, typeof metadata === 'string' ? metadata : JSON.stringify(metadata),
          existing.id
        ]
      );
    }
    return await db.get(`SELECT * FROM ghl_integrations WHERE id = ?`, [existing.id]);
  } else {
    let result;
    if (hasGhlLocationIdCol) {
      result = await db.run(
        `INSERT INTO ghl_integrations (
          tenant_id, ghl_location_id, location_id, company_id, user_id, user_type, access_token, refresh_token,
          token_type, expires_in, expires_at, scope, is_active, sync_contacts, sync_conversations,
          sync_calls, sync_opportunities, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          safeTenantId, locationId, locationId, companyId, userId, userType, accessToken, refreshToken,
          tokenType, expiresIn, expiresAt, scope, isActive, syncContacts, syncConversations,
          syncCalls, syncOpportunities, typeof metadata === 'string' ? metadata : JSON.stringify(metadata)
        ]
      );
    } else {
      result = await db.run(
        `INSERT INTO ghl_integrations (
          tenant_id, location_id, company_id, user_id, user_type, access_token, refresh_token,
          token_type, expires_in, expires_at, scope, is_active, sync_contacts, sync_conversations,
          sync_calls, sync_opportunities, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          safeTenantId, locationId, companyId, userId, userType, accessToken, refreshToken,
          tokenType, expiresIn, expiresAt, scope, isActive, syncContacts, syncConversations,
          syncCalls, syncOpportunities, typeof metadata === 'string' ? metadata : JSON.stringify(metadata)
        ]
      );
    }
    return await db.get(`SELECT * FROM ghl_integrations WHERE id = ?`, [result.lastID]);
  }
}

export async function getGhlIntegrationByLocation(locationId) {
  let hasGhlLocationIdCol = false;
  try {
    const cols = await db.all('PRAGMA table_info(ghl_integrations)');
    hasGhlLocationIdCol = cols.some(c => c.name === 'ghl_location_id');
  } catch (e) {}

  if (hasGhlLocationIdCol) {
    return await db.get(
      `SELECT * FROM ghl_integrations WHERE location_id = ? OR ghl_location_id = ?`,
      [locationId, locationId]
    );
  } else {
    return await db.get(
      `SELECT * FROM ghl_integrations WHERE location_id = ?`,
      [locationId]
    );
  }
}

export async function getGhlIntegrationByTenant(tenantId) {
  if (!tenantId || tenantId === 'undefined' || tenantId === 'null') return null;
  const safeTenantId = await ensureTenantRowExists(tenantId);
  return await db.get(
    `SELECT * FROM ghl_integrations 
     WHERE (tenant_id = ? OR CAST(tenant_id AS TEXT) = CAST(? AS TEXT) OR company_id = ? OR CAST(company_id AS TEXT) = CAST(? AS TEXT)) 
       AND is_active = 1 
     ORDER BY updated_at DESC LIMIT 1`,
    [safeTenantId, String(tenantId), String(tenantId), String(tenantId)]
  );
}

export async function getAllActiveGhlIntegrations() {
  return await db.all(`SELECT * FROM ghl_integrations WHERE is_active = 1 ORDER BY id ASC`);
}

export async function saveGhlFieldMapping(tenantId, mappingData = {}) {
  const safeTenantId = await ensureTenantRowExists(tenantId);
  const {
    locationId,
    emsModuleId = 'contacts',
    emsFieldKey,
    ghlFieldId,
    ghlFieldName,
    ghlDataType = 'TEXT',
    syncDirection = 'bidirectional',
    isActive = 1,
    metadata = '{}'
  } = mappingData;

  const existing = await db.get(
    `SELECT id FROM ghl_field_mappings WHERE location_id = ? AND ems_module_id = ? AND ems_field_key = ?`,
    [locationId, emsModuleId, emsFieldKey]
  );

  if (existing) {
    await db.run(
      `UPDATE ghl_field_mappings
       SET ghl_field_id = ?,
           ghl_field_name = ?,
           ghl_data_type = ?,
           sync_direction = ?,
           is_active = ?,
           metadata = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [ghlFieldId, ghlFieldName, ghlDataType, syncDirection, isActive, typeof metadata === 'string' ? metadata : JSON.stringify(metadata), existing.id]
    );
    return await db.get(`SELECT * FROM ghl_field_mappings WHERE id = ?`, [existing.id]);
  } else {
    const result = await db.run(
      `INSERT INTO ghl_field_mappings (
        tenant_id, location_id, ems_module_id, ems_field_key, ghl_field_id, ghl_field_name,
        ghl_data_type, sync_direction, is_active, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        safeTenantId, locationId, emsModuleId, emsFieldKey, ghlFieldId, ghlFieldName,
        ghlDataType, syncDirection, isActive, typeof metadata === 'string' ? metadata : JSON.stringify(metadata)
      ]
    );
    return await db.get(`SELECT * FROM ghl_field_mappings WHERE id = ?`, [result.lastID]);
  }
}

export async function getGhlFieldMappings(tenantId, locationId, emsModuleId = 'contacts') {
  const safeTenantId = await ensureTenantRowExists(tenantId);
  return await db.all(
    `SELECT * FROM ghl_field_mappings WHERE (tenant_id = ? OR tenant_id = 1) AND location_id = ? AND ems_module_id = ? AND is_active = 1`,
    [safeTenantId, locationId, emsModuleId]
  );
}

export async function saveGhlEntityLink(tenantId, linkData = {}) {
  const safeTenantId = await ensureTenantRowExists(tenantId);
  const { locationId, entityType, emsEntityId, ghlEntityId, lastSyncedHash = '' } = linkData;
  const existing = await db.get(
    `SELECT id FROM ghl_entity_links 
     WHERE location_id = ? AND entity_type = ? AND (ems_entity_id = ? OR ghl_entity_id = ?)`,
    [locationId, entityType, String(emsEntityId), String(ghlEntityId)]
  );

  if (existing) {
    await db.run(
      `UPDATE ghl_entity_links
       SET ems_entity_id = ?,
           ghl_entity_id = ?,
           last_synced_hash = ?,
           last_synced_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [String(emsEntityId), String(ghlEntityId), lastSyncedHash, existing.id]
    );
    return await db.get(`SELECT * FROM ghl_entity_links WHERE id = ?`, [existing.id]);
  } else {
    const result = await db.run(
      `INSERT OR REPLACE INTO ghl_entity_links (tenant_id, location_id, entity_type, ems_entity_id, ghl_entity_id, last_synced_hash)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [safeTenantId, locationId, entityType, String(emsEntityId), String(ghlEntityId), lastSyncedHash]
    );
    return await db.get(`SELECT * FROM ghl_entity_links WHERE id = ?`, [result.lastID]);
  }
}

export async function getGhlEntityLink(tenantId, locationId, entityType, emsEntityId) {
  const safeTenantId = await ensureTenantRowExists(tenantId);
  return await db.get(
    `SELECT * FROM ghl_entity_links WHERE (tenant_id = ? OR tenant_id = 1) AND location_id = ? AND entity_type = ? AND ems_entity_id = ?`,
    [safeTenantId, locationId, entityType, String(emsEntityId)]
  );
}

export async function getEmsEntityByGhlId(tenantId, locationId, entityType, ghlEntityId) {
  const safeTenantId = await ensureTenantRowExists(tenantId);
  return await db.get(
    `SELECT * FROM ghl_entity_links WHERE (tenant_id = ? OR tenant_id = 1) AND location_id = ? AND entity_type = ? AND ghl_entity_id = ?`,
    [safeTenantId, locationId, entityType, String(ghlEntityId)]
  );
}

export async function createGhlSyncLog(tenantId, logData = {}) {
  const safeTenantId = await ensureTenantRowExists(tenantId);
  const {
    locationId,
    direction = 'INBOUND',
    entityType = 'generic',
    emsEntityId = null,
    ghlEntityId = null,
    eventType = 'GenericEvent',
    status = 'SUCCESS',
    httpStatus = 200,
    payload = null,
    errorMessage = null,
    retryCount = 0,
    idempotencyKey = null
  } = logData;

  const cols = await db.all("PRAGMA table_info(ghl_sync_logs)");
  const colNames = new Set(cols.map(c => c.name));

  if (colNames.has('operation')) {
    const result = await db.run(
      `INSERT INTO ghl_sync_logs (
        tenant_id, location_id, direction, operation, entity_type, ems_entity_id, ghl_entity_id,
        event_type, status, http_status, payload, error_message, retry_count, idempotency_key
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        safeTenantId, locationId, direction, eventType, entityType, emsEntityId ? String(emsEntityId) : null,
        ghlEntityId ? String(ghlEntityId) : null, eventType, status, httpStatus,
        typeof payload === 'string' ? payload : (payload ? JSON.stringify(payload) : null),
        errorMessage, retryCount, idempotencyKey
      ]
    );
    return await db.get(`SELECT * FROM ghl_sync_logs WHERE id = ?`, [result.lastID]);
  } else {
    const result = await db.run(
      `INSERT INTO ghl_sync_logs (
        tenant_id, location_id, direction, entity_type, ems_entity_id, ghl_entity_id,
        event_type, status, http_status, payload, error_message, retry_count, idempotency_key
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        safeTenantId, locationId, direction, entityType, emsEntityId ? String(emsEntityId) : null,
        ghlEntityId ? String(ghlEntityId) : null, eventType, status, httpStatus,
        typeof payload === 'string' ? payload : (payload ? JSON.stringify(payload) : null),
        errorMessage, retryCount, idempotencyKey
      ]
    );
    return await db.get(`SELECT * FROM ghl_sync_logs WHERE id = ?`, [result.lastID]);
  }
}

export async function getGhlSyncLogs(tenantId, locationId = null, limit = 100) {
  if (locationId) {
    return await db.all(
      `SELECT * FROM ghl_sync_logs WHERE tenant_id = ? AND location_id = ? ORDER BY id DESC LIMIT ?`,
      [tenantId, locationId, limit]
    );
  }
  return await db.all(
    `SELECT * FROM ghl_sync_logs WHERE tenant_id = ? ORDER BY id DESC LIMIT ?`,
    [tenantId, limit]
  );
}

export async function getGhlSyncLogByIdempotencyKey(tenantId, idempotencyKey) {
  if (!idempotencyKey) return null;
  return await db.get(
    `SELECT * FROM ghl_sync_logs WHERE tenant_id = ? AND idempotency_key = ? ORDER BY id DESC LIMIT 1`,
    [tenantId, idempotencyKey]
  );
}

export async function archiveContact(contactId, tenantId = 1) {
  await db.run(
    `UPDATE contacts SET is_archived = 1 WHERE id = ? AND tenant_id = ?`,
    [contactId, tenantId]
  );
  return await db.get(`SELECT * FROM contacts WHERE id = ? AND tenant_id = ?`, [contactId, tenantId]);
}

export async function deleteGhlEntityLink(tenantId, locationId, entityType, emsEntityId) {
  return await db.run(
    `DELETE FROM ghl_entity_links WHERE tenant_id = ? AND location_id = ? AND entity_type = ? AND ems_entity_id = ?`,
    [tenantId, locationId, entityType, String(emsEntityId)]
  );
}

export async function createGhlOAuthState(tenantId, userId = null, ttlMinutes = 10) {
  const stateToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();

  const cols = await db.all("PRAGMA table_info(ghl_oauth_states)");
  const colNames = new Set(cols.map(c => c.name));

  if (colNames.has('state') && !colNames.has('state_token')) {
    await db.run(
      `INSERT INTO ghl_oauth_states (state, tenant_id, user_id, expires_at, is_used)
       VALUES (?, ?, ?, ?, 0)`,
      [stateToken, tenantId, userId, expiresAt]
    );
  } else if (colNames.has('state') && colNames.has('state_token')) {
    await db.run(
      `INSERT INTO ghl_oauth_states (state_token, state, tenant_id, user_id, expires_at, is_used)
       VALUES (?, ?, ?, ?, ?, 0)`,
      [stateToken, stateToken, tenantId, userId, expiresAt]
    );
  } else {
    await db.run(
      `INSERT INTO ghl_oauth_states (state_token, tenant_id, user_id, expires_at, is_used)
       VALUES (?, ?, ?, ?, 0)`,
      [stateToken, tenantId, userId, expiresAt]
    );
  }

  return stateToken;
}

export async function validateAndConsumeGhlOAuthState(stateToken) {
  if (!stateToken || typeof stateToken !== 'string') return null;

  const now = new Date().toISOString();
  const cols = await db.all("PRAGMA table_info(ghl_oauth_states)");
  const colNames = new Set(cols.map(c => c.name));

  let record = null;
  if (colNames.has('state') && !colNames.has('state_token')) {
    record = await db.get(
      `SELECT rowid as _rowid, * FROM ghl_oauth_states
       WHERE state = ? AND is_used = 0 AND expires_at > ?`,
      [stateToken, now]
    );
    if (!record) return null;
    await db.run(`UPDATE ghl_oauth_states SET is_used = 1 WHERE rowid = ?`, [record._rowid]);
  } else if (colNames.has('state') && colNames.has('state_token')) {
    record = await db.get(
      `SELECT rowid as _rowid, * FROM ghl_oauth_states
       WHERE (state_token = ? OR state = ?) AND is_used = 0 AND expires_at > ?`,
      [stateToken, stateToken, now]
    );
    if (!record) return null;
    await db.run(`UPDATE ghl_oauth_states SET is_used = 1 WHERE rowid = ?`, [record._rowid]);
  } else {
    record = await db.get(
      `SELECT rowid as _rowid, * FROM ghl_oauth_states
       WHERE state_token = ? AND is_used = 0 AND expires_at > ?`,
      [stateToken, now]
    );
    if (!record) return null;
    await db.run(`UPDATE ghl_oauth_states SET is_used = 1 WHERE rowid = ?`, [record._rowid]);
  }

  return record;
}

export async function disconnectGhlIntegration(tenantId, locationId = null) {
  if (locationId) {
    await db.run(
      `UPDATE ghl_integrations
       SET is_active = 0,
           access_token = '',
           refresh_token = '',
           updated_at = CURRENT_TIMESTAMP
       WHERE tenant_id = ? AND location_id = ?`,
      [tenantId, locationId]
    );
  } else {
    await db.run(
      `UPDATE ghl_integrations
       SET is_active = 0,
           access_token = '',
           refresh_token = '',
           updated_at = CURRENT_TIMESTAMP
       WHERE tenant_id = ?`,
      [tenantId]
    );
  }
  return { success: true };
}

export async function getExpiringGhlIntegrations(withinMinutes = 15) {
  const threshold = new Date(Date.now() + withinMinutes * 60 * 1000).toISOString();
  return await db.all(
    `SELECT * FROM ghl_integrations
     WHERE is_active = 1 AND access_token != '' AND expires_at <= ?
     ORDER BY expires_at ASC`,
    [threshold]
  );
}

export async function saveGhlTriggerSubscription(tenantId, data) {
  const { id, locationId, triggerType, targetUrl, isActive = 1, filters = {}, metadata = {} } = data;
  const subId = id || `sub_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  await db.run(
    `INSERT INTO ghl_trigger_subscriptions (id, tenant_id, location_id, trigger_type, target_url, is_active, filters, metadata, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(id) DO UPDATE SET
       target_url = excluded.target_url,
       is_active = excluded.is_active,
       filters = excluded.filters,
       metadata = excluded.metadata,
       updated_at = CURRENT_TIMESTAMP`,
    [
      subId,
      tenantId,
      locationId,
      triggerType,
      targetUrl,
      isActive ? 1 : 0,
      typeof filters === 'object' ? JSON.stringify(filters) : (filters || '{}'),
      typeof metadata === 'object' ? JSON.stringify(metadata) : (metadata || '{}')
    ]
  );
  return await getGhlTriggerSubscriptionById(subId, tenantId);
}

export async function getGhlTriggerSubscriptions(tenantId, locationId = null) {
  if (locationId) {
    return await db.all(
      `SELECT * FROM ghl_trigger_subscriptions WHERE tenant_id = ? AND location_id = ? ORDER BY created_at DESC`,
      [tenantId, locationId]
    );
  }
  return await db.all(
    `SELECT * FROM ghl_trigger_subscriptions WHERE tenant_id = ? ORDER BY created_at DESC`,
    [tenantId]
  );
}

export async function getGhlTriggerSubscriptionById(id, tenantId = null) {
  if (tenantId) {
    return await db.get(
      `SELECT * FROM ghl_trigger_subscriptions WHERE id = ? AND tenant_id = ?`,
      [id, tenantId]
    );
  }
  return await db.get(
    `SELECT * FROM ghl_trigger_subscriptions WHERE id = ?`,
    [id]
  );
}

export async function updateGhlTriggerSubscription(id, tenantId, updates = {}) {
  const existing = await getGhlTriggerSubscriptionById(id, tenantId);
  if (!existing) return null;

  const targetUrl = updates.targetUrl !== undefined ? updates.targetUrl : existing.target_url;
  const isActive = updates.isActive !== undefined ? (updates.isActive ? 1 : 0) : existing.is_active;
  const filters = updates.filters !== undefined ? (typeof updates.filters === 'object' ? JSON.stringify(updates.filters) : updates.filters) : existing.filters;
  const metadata = updates.metadata !== undefined ? (typeof updates.metadata === 'object' ? JSON.stringify(updates.metadata) : updates.metadata) : existing.metadata;

  await db.run(
    `UPDATE ghl_trigger_subscriptions
     SET target_url = ?, is_active = ?, filters = ?, metadata = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND tenant_id = ?`,
    [targetUrl, isActive, filters, metadata, id, tenantId]
  );
  return await getGhlTriggerSubscriptionById(id, tenantId);
}

export async function deleteGhlTriggerSubscription(id, tenantId) {
  return await db.run(
    `DELETE FROM ghl_trigger_subscriptions WHERE id = ? AND tenant_id = ?`,
    [id, tenantId]
  );
}

export async function getActiveSubscriptionsForTrigger(locationId, triggerType) {
  return await db.all(
    `SELECT * FROM ghl_trigger_subscriptions WHERE location_id = ? AND trigger_type = ? AND is_active = 1`,
    [locationId, triggerType]
  );
}

/**
 * Multi-Tenant Feedback System Database Helpers
 */
export async function createFeedbackRecord(feedbackData) {
  const id = feedbackData.id || `fb_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const tenantId = feedbackData.tenant_id || feedbackData.tenantId || 1;
  const companyId = feedbackData.company_id || feedbackData.companyId || 'org_default';
  const companyName = feedbackData.company_name || feedbackData.companyName || 'Unknown Org';
  const userId = feedbackData.user_id || feedbackData.userId || 'usr_anonymous';
  const userName = feedbackData.user_name || feedbackData.userName || 'Anonymous User';
  const userEmail = feedbackData.user_email || feedbackData.userEmail || '';
  const userRole = feedbackData.user_role || feedbackData.userRole || 'employee';
  const rating = Number(feedbackData.rating) || 5;
  const category = feedbackData.category || 'general';
  const title = feedbackData.title || 'Platform Feedback';
  const message = feedbackData.message || '';
  const pageModule = feedbackData.page_module || feedbackData.pageModule || '';
  const priority = feedbackData.priority || 'medium';
  const attachmentUrl = feedbackData.attachment_url || feedbackData.attachmentUrl || '';
  const status = feedbackData.status || 'new';

  await db.run(
    `INSERT INTO system_feedbacks (
      id, tenant_id, company_id, company_name, user_id, user_name, user_email, user_role,
      rating, category, title, message, page_module, priority, attachment_url, status,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [id, tenantId, companyId, companyName, userId, userName, userEmail, userRole, rating, category, title, message, pageModule, priority, attachmentUrl, status]
  );

  return await getFeedbackById(id);
}

export async function getFeedbackById(id) {
  return await db.get(`SELECT * FROM system_feedbacks WHERE id = ?`, [id]);
}

export async function getFeedbacksByTenant(tenantId, companyId = null) {
  if (companyId) {
    return await db.all(
      `SELECT * FROM system_feedbacks WHERE tenant_id = ? OR company_id = ? ORDER BY created_at DESC`,
      [tenantId, companyId]
    );
  }
  return await db.all(
    `SELECT * FROM system_feedbacks WHERE tenant_id = ? ORDER BY created_at DESC`,
    [tenantId]
  );
}

export async function getAllFeedbacks(filters = {}) {
  let query = `SELECT * FROM system_feedbacks WHERE 1=1`;
  const params = [];

  if (filters.companyId && filters.companyId !== 'all') {
    query += ` AND (company_id = ? OR company_name = ?)`;
    params.push(filters.companyId, filters.companyId);
  }

  if (filters.category && filters.category !== 'all') {
    query += ` AND category = ?`;
    params.push(filters.category);
  }

  if (filters.status && filters.status !== 'all') {
    query += ` AND status = ?`;
    params.push(filters.status);
  }

  if (filters.rating && filters.rating !== 'all') {
    query += ` AND rating = ?`;
    params.push(Number(filters.rating));
  }

  if (filters.search) {
    query += ` AND (title LIKE ? OR message LIKE ? OR company_name LIKE ? OR user_name LIKE ? OR user_email LIKE ?)`;
    const s = `%${filters.search}%`;
    params.push(s, s, s, s, s);
  }

  query += ` ORDER BY created_at DESC`;

  return await db.all(query, params);
}

export async function updateFeedbackStatusAndReply(id, status, adminReply, adminName) {
  await db.run(
    `UPDATE system_feedbacks
     SET status = COALESCE(?, status),
         admin_reply = ?,
         admin_replied_by = ?,
         admin_replied_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [status, adminReply, adminName, id]
  );

  return await getFeedbackById(id);
}

export async function deleteFeedbackRecord(id) {
  return await db.run(`DELETE FROM system_feedbacks WHERE id = ?`, [id]);
}

/**
 * Dynamic Multi-Tenant Subscription & GST Tax Invoice Helpers
 */
export async function createBillingInvoice(data) {
  const id = data.id || `inv_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const invoiceNumber = data.invoice_number || data.invoiceNumber || `INV/2026-27/${Date.now().toString().slice(-4)}`;
  const tenantId = String(data.tenant_id || data.tenantId || 'org_default');
  const companyName = data.company_name || data.companyName || 'Organization';
  const buyerName = data.buyer_name || data.buyerName || '';
  const buyerEmail = data.buyer_email || data.buyerEmail || '';
  const buyerPhone = data.buyer_phone || data.buyerPhone || '';
  const buyerState = data.buyer_state || data.buyerState || '';
  const buyerGstin = data.buyer_gstin || data.buyerGstin || '';
  const planId = data.plan_id || data.planId || 'starter';
  const planName = data.plan_name || data.planName || 'Starter Growth';
  const billingCycle = data.billing_cycle || data.billingCycle || 'monthly';
  const lineItems = typeof data.line_items === 'object' ? JSON.stringify(data.line_items) : (data.line_items || '[]');
  const subtotal = Number(data.subtotal) || 0;
  const discount = Number(data.discount) || 0;
  const taxableSubtotal = Number(data.taxable_subtotal || data.taxableSubtotal) || (subtotal - discount);
  const taxRate = Number(data.tax_rate || data.taxRate) || 18;
  const taxAmount = Number(data.tax_amount || data.taxAmount) || 0;
  const cgstAmount = Number(data.cgst_amount || data.cgstAmount) || 0;
  const sgstAmount = Number(data.sgst_amount || data.sgstAmount) || 0;
  const igstAmount = Number(data.igst_amount || data.igstAmount) || 0;
  const grandTotal = Number(data.grand_total || data.grandTotal) || (taxableSubtotal + taxAmount);
  const currency = data.currency || 'INR';
  const paymentMode = data.payment_mode || data.paymentMode || 'upi';
  const utrRef = data.utr_ref || data.utrRef || '';
  const receiptUrl = data.receipt_url || data.receiptUrl || '';
  const status = data.status || 'pending';
  const adminNotes = data.admin_notes || data.adminNotes || '';
  const approvedBy = data.approved_by || data.approvedBy || '';
  const approvedAt = data.approved_at || data.approvedAt || null;

  await db.run(
    `INSERT INTO billing_invoices (
      id, invoice_number, tenant_id, company_name, buyer_name, buyer_email, buyer_phone,
      buyer_state, buyer_gstin, plan_id, plan_name, billing_cycle, line_items,
      subtotal, discount, taxable_subtotal, tax_rate, tax_amount, cgst_amount, sgst_amount, igst_amount,
      grand_total, currency, payment_mode, utr_ref, receipt_url, status, admin_notes,
      approved_by, approved_at, invoice_date, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [
      id, invoiceNumber, tenantId, companyName, buyerName, buyerEmail, buyerPhone,
      buyerState, buyerGstin, planId, planName, billingCycle, lineItems,
      subtotal, discount, taxableSubtotal, taxRate, taxAmount, cgstAmount, sgstAmount, igstAmount,
      grandTotal, currency, paymentMode, utrRef, receiptUrl, status, adminNotes,
      approvedBy, approvedAt
    ]
  );

  return await getInvoiceById(id);
}

export async function getInvoiceById(id) {
  const inv = await db.get(`SELECT * FROM billing_invoices WHERE id = ? OR invoice_number = ?`, [id, id]);
  if (inv && inv.line_items) {
    try { inv.line_items = JSON.parse(inv.line_items); } catch (e) {}
  }
  return inv;
}

export async function getTenantInvoices(tenantId) {
  const rows = await db.all(`SELECT * FROM billing_invoices WHERE tenant_id = ? ORDER BY created_at DESC`, [String(tenantId)]);
  return (rows || []).map(r => {
    if (r.line_items) {
      try { r.line_items = JSON.parse(r.line_items); } catch (e) {}
    }
    return r;
  });
}

export async function getAllBillingInvoices(filters = {}) {
  let sql = `SELECT * FROM billing_invoices WHERE 1=1`;
  const params = [];

  if (filters.status && filters.status !== 'all') {
    sql += ` AND status = ?`;
    params.push(filters.status);
  }
  if (filters.tenantId && filters.tenantId !== 'all') {
    sql += ` AND tenant_id = ?`;
    params.push(String(filters.tenantId));
  }
  if (filters.search) {
    sql += ` AND (invoice_number LIKE ? OR company_name LIKE ? OR buyer_name LIKE ? OR buyer_email LIKE ? OR utr_ref LIKE ?)`;
    const s = `%${filters.search}%`;
    params.push(s, s, s, s, s);
  }

  sql += ` ORDER BY created_at DESC`;
  const rows = await db.all(sql, params);
  return (rows || []).map(r => {
    if (r.line_items) {
      try { r.line_items = JSON.parse(r.line_items); } catch (e) {}
    }
    return r;
  });
}

export async function updateInvoiceStatus(id, status, adminNotes = '', approvedBy = '') {
  await db.run(
    `UPDATE billing_invoices
     SET status = ?, admin_notes = ?, approved_by = ?, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? OR invoice_number = ?`,
    [status, adminNotes, approvedBy, id, id]
  );
  return await getInvoiceById(id);
}

export async function createOrUpdateTenantSubscription(data) {
  const tenantId = String(data.tenant_id || data.tenantId);
  const id = data.id || `sub_${tenantId}`;
  const companyName = data.company_name || data.companyName || 'Organization';
  const planId = data.plan_id || data.planId || 'starter';
  const planName = data.plan_name || data.planName || 'Starter Growth';
  const billingCycle = data.billing_cycle || data.billingCycle || 'monthly';
  const maxSeats = Number(data.max_seats || data.maxSeats) || 5;
  const maxChannels = Number(data.max_channels || data.maxChannels) || 1;
  const activeModules = typeof data.active_modules === 'object' ? JSON.stringify(data.active_modules) : (data.active_modules || '[]');
  const amountPaid = Number(data.amount_paid || data.amountPaid) || 0;
  const isTrial = (data.is_trial || data.isTrial) ? 1 : 0;
  const startDate = data.start_date || data.startDate || new Date().toISOString();
  const expiryDate = data.expiry_date || data.expiryDate || new Date(Date.now() + 30 * 86400000).toISOString();
  const status = data.status || 'active';

  const existing = await db.get(`SELECT id FROM tenant_subscriptions WHERE tenant_id = ?`, [tenantId]);
  if (existing) {
    await db.run(
      `UPDATE tenant_subscriptions
       SET company_name = ?, plan_id = ?, plan_name = ?, billing_cycle = ?, max_seats = ?, max_channels = ?,
           active_modules = ?, amount_paid = ?, is_trial = ?, start_date = ?, expiry_date = ?, status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE tenant_id = ?`,
      [companyName, planId, planName, billingCycle, maxSeats, maxChannels, activeModules, amountPaid, isTrial, startDate, expiryDate, status, tenantId]
    );
  } else {
    await db.run(
      `INSERT INTO tenant_subscriptions (
        id, tenant_id, company_name, plan_id, plan_name, billing_cycle, max_seats, max_channels,
        active_modules, amount_paid, is_trial, start_date, expiry_date, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [id, tenantId, companyName, planId, planName, billingCycle, maxSeats, maxChannels, activeModules, amountPaid, isTrial, startDate, expiryDate, status]
    );
  }

  // Also update tenants table subscription_status
  try {
    await db.run(`UPDATE tenants SET subscription_status = ? WHERE id = ? OR company_name = ?`, [status, tenantId, companyName]);
  } catch (e) {}

  return await getTenantSubscription(tenantId);
}

export async function getTenantSubscription(tenantId) {
  const sub = await db.get(`SELECT * FROM tenant_subscriptions WHERE tenant_id = ?`, [String(tenantId)]);
  if (sub) {
    if (sub.active_modules) {
      try { sub.active_modules = JSON.parse(sub.active_modules); } catch (e) {}
    }
    // Automated Expiry Enforcement
    if ((sub.status === 'active' || sub.status === 'trial') && sub.expiry_date) {
      if (new Date(sub.expiry_date).getTime() < Date.now()) {
        sub.status = 'expired';
        try {
          await db.run(`UPDATE tenant_subscriptions SET status = 'expired', updated_at = CURRENT_TIMESTAMP WHERE tenant_id = ?`, [String(tenantId)]);
          await db.run(`UPDATE tenants SET subscription_status = 'expired' WHERE id = ?`, [String(tenantId)]);
        } catch (e) {}
      }
    }
  }
  return sub;
}

export async function extendTenantSubscription(tenantId, { additionalDays = 7, newExpiryDate = null, status = null }) {
  const sub = await getTenantSubscription(tenantId);
  let calculatedExpiry = newExpiryDate;
  if (!calculatedExpiry) {
    const currentExpiry = sub?.expiry_date ? new Date(sub.expiry_date) : new Date();
    const baseTime = currentExpiry.getTime() > Date.now() ? currentExpiry.getTime() : Date.now();
    calculatedExpiry = new Date(baseTime + Number(additionalDays) * 86400000).toISOString();
  }
  const targetStatus = status || (sub?.is_trial ? 'trial' : 'active');

  await db.run(
    `UPDATE tenant_subscriptions SET expiry_date = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE tenant_id = ?`,
    [calculatedExpiry, targetStatus, String(tenantId)]
  );
  try {
    await db.run(`UPDATE tenants SET subscription_status = ? WHERE id = ?`, [targetStatus, String(tenantId)]);
  } catch (e) {}

  return await getTenantSubscription(tenantId);
}

export async function getPendingSubscriptionApprovals() {
  const rows = await db.all(
    `SELECT i.*, s.status as sub_status, s.max_seats, s.max_channels
     FROM billing_invoices i
     LEFT JOIN tenant_subscriptions s ON i.tenant_id = s.tenant_id
     WHERE i.status = 'pending' OR s.status = 'pending_payment' OR s.status = 'payment_under_review'
     ORDER BY i.created_at DESC`
  );
  return (rows || []).map(r => {
    if (r.line_items) {
      try { r.line_items = JSON.parse(r.line_items); } catch (e) {}
    }
    return r;
  });
}

export async function getSaaSPricingConfigs() {
  const rows = await db.all(`SELECT * FROM saas_pricing_config`);
  const config = {};
  for (const r of rows) {
    try {
      config[r.config_key] = JSON.parse(r.config_value);
    } catch (e) {
      config[r.config_key] = r.config_value;
    }
  }
  return config;
}

export async function setSaaSPricingConfig(configKey, configValue) {
  const valStr = typeof configValue === 'object' ? JSON.stringify(configValue) : String(configValue);
  await db.run(
    `INSERT INTO saas_pricing_config (config_key, config_value, updated_at)
     VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(config_key) DO UPDATE SET config_value = excluded.config_value, updated_at = CURRENT_TIMESTAMP`,
    [configKey, valStr]
  );
  return await getSaaSPricingConfigs();
}

export function getDb() {
  return db;
}
