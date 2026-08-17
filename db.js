import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'database.sqlite');

let db;

export async function initDb() {
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Enable foreign keys
  await db.run('PRAGMA foreign_keys = ON');

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

  // Create contacts table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      name TEXT,
      custom_name TEXT,
      email TEXT,
      notes TEXT,
      pipeline_stage TEXT DEFAULT 'new',
      labels TEXT, -- Store JSON array of labels: e.g. '["VIP","Interested"]'
      profile_pic_url TEXT,
      is_archived INTEGER DEFAULT 0,
      tenant_id INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    )
  `);

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

  // Seed default plans if empty
  const planCount = await db.get(`SELECT COUNT(*) as count FROM plans`);
  if (planCount && planCount.count === 0) {
    await db.run(`
      INSERT INTO plans (id, name, description, features, max_channels, max_contacts, max_employees, allow_chatbot, allow_scheduler, allow_gps_tracking, is_active)
      VALUES ('free_trial', 'Free Trial Tier', 'Standard limited access for checking out system features.', ?, 1, 250, 5, 0, 0, 0, 1)
    `, [JSON.stringify(['1 Connected WhatsApp Account', 'Up to 250 Contacts Synced', 'Standard Pipeline board'])]);

    await db.run(`
      INSERT INTO plans (id, name, description, features, max_channels, max_contacts, max_employees, allow_chatbot, allow_scheduler, allow_gps_tracking, is_active)
      VALUES ('basic', 'Basic CRM Plan', 'Ideal for solo entrepreneurs.', ?, 1, 500, 15, 0, 0, 0, 1)
    `, [JSON.stringify(['1 Connected WhatsApp Account', 'Up to 500 Contacts Synced', 'Standard CRM Pipeline Board', 'No scheduled limits'])]);

    await db.run(`
      INSERT INTO plans (id, name, description, features, max_channels, max_contacts, max_employees, allow_chatbot, allow_scheduler, allow_gps_tracking, is_active)
      VALUES ('pro', 'Unlimited Pro Plan', 'For teams and growing businesses.', ?, 9999, 999999, 9999, 1, 1, 1, 1)
    `, [JSON.stringify(['Unlimited Connected Accounts', 'Unlimited CRM Contacts & History', 'Advanced Keyword Chatbot Rules', 'Scheduled Automations Worker', 'Priority Chat Support'])]);
  }

  // Seed default plan prices if empty
  const priceCount = await db.get(`SELECT COUNT(*) as count FROM plan_prices`);
  if (priceCount && priceCount.count === 0) {
    await db.run(`INSERT INTO plan_prices (plan_id, country_code, currency, amount, stripe_price_id) VALUES ('basic', 'DEFAULT', 'USD', 9.00, 'price_basic_mock')`);
    await db.run(`INSERT INTO plan_prices (plan_id, country_code, currency, amount, stripe_price_id) VALUES ('basic', 'US', 'USD', 9.00, 'price_basic_mock')`);
    await db.run(`INSERT INTO plan_prices (plan_id, country_code, currency, amount, stripe_price_id) VALUES ('basic', 'IN', 'INR', 699.00, 'price_basic_mock_in')`);

    await db.run(`INSERT INTO plan_prices (plan_id, country_code, currency, amount, stripe_price_id) VALUES ('pro', 'DEFAULT', 'USD', 29.00, 'price_pro_mock')`);
    await db.run(`INSERT INTO plan_prices (plan_id, country_code, currency, amount, stripe_price_id) VALUES ('pro', 'US', 'USD', 29.00, 'price_pro_mock')`);
    await db.run(`INSERT INTO plan_prices (plan_id, country_code, currency, amount, stripe_price_id) VALUES ('pro', 'IN', 'INR', 2199.00, 'price_pro_mock_in')`);
  }

  // Run dynamic schema migrations to add tenant_id columns if database already exists
  const migrateColumns = [
    { table: 'whatsapp_sessions', column: 'tenant_id', type: 'INTEGER DEFAULT 1' },
    { table: 'contacts', column: 'tenant_id', type: 'INTEGER DEFAULT 1' },
    { table: 'messages', column: 'tenant_id', type: 'INTEGER DEFAULT 1' },
    { table: 'chatbot_rules', column: 'tenant_id', type: 'INTEGER DEFAULT 1' },
    { table: 'scheduled_messages', column: 'tenant_id', type: 'INTEGER DEFAULT 1' }
  ];

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

export async function saveContact(id, name, tenantId = 1, stage = 'lead') {
  await db.run(
    `INSERT OR IGNORE INTO contacts (id, name, pipeline_stage, labels, tenant_id) VALUES (?, ?, ?, '[]', ?)`,
    [id, name, stage || 'lead', tenantId]
  );
  if (name) {
    await db.run(
      `UPDATE contacts SET name = ?, pipeline_stage = COALESCE(NULLIF(pipeline_stage, 'new'), ?) WHERE id = ? AND tenant_id = ?`,
      [name, stage || 'lead', id, tenantId]
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

export async function updateContactCRM(id, { customName, email, notes, pipelineStage, labels }, tenantId = 1) {
  await db.run(
    `UPDATE contacts 
     SET custom_name = ?, email = ?, notes = ?, pipeline_stage = ?, labels = ? 
     WHERE id = ? AND tenant_id = ?`,
    [customName, email, notes, pipelineStage, JSON.stringify(labels || []), id, tenantId]
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

// Message Helpers
export async function saveMessage({ id, sessionId, contactId, fromMe, textContent, mediaUrl = null, mediaType = 'text', timestamp, isRead = null, status = 0, tenantId = 1 }) {
  const resolvedIsRead = isRead !== null ? isRead : (fromMe ? 1 : 0);
  await db.run(
    `INSERT OR REPLACE INTO messages (id, session_id, contact_id, from_me, text_content, media_url, media_type, timestamp, is_read, status, tenant_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, sessionId, contactId, fromMe ? 1 : 0, textContent, mediaUrl, mediaType, timestamp, resolvedIsRead, status, tenantId]
  );
}

export async function updateMessageStatus(id, status) {
  await db.run(
    `UPDATE messages SET status = ? WHERE id = ?`,
    [status, id]
  );
}

export async function getMessagesForContact(contactId, limit = 50, offset = 0, tenantId = 1) {
  const cleanJid = contactId.includes('@') ? contactId : `${contactId}@s.whatsapp.net`;
  const rawNum = contactId.split('@')[0];
  const messages = await db.all(
    `SELECT m.*, s.phone_name as session_name 
     FROM messages m
     LEFT JOIN whatsapp_sessions s ON m.session_id = s.id
     WHERE (m.contact_id = ? OR m.contact_id = ? OR m.contact_id LIKE ?)
     ORDER BY m.timestamp DESC
     LIMIT ? OFFSET ?`,
    [contactId, cleanJid, `%${rawNum}%`, limit, offset]
  );
  return messages.reverse();
}

export async function getRecentChats(tenantId = 1) {
  const chats = await db.all(`
    SELECT c.*, 
           COALESCE(NULLIF(c.name, ''), c.custom_name, REPLACE(REPLACE(c.id, '@s.whatsapp.net', ''), '@g.us', '')) as displayName,
           REPLACE(REPLACE(c.id, '@s.whatsapp.net', ''), '@g.us', '') as phone_computed,
           m.text_content as last_message_text, 
           m.text_content as lastMessage,
           m.timestamp as last_message_time,
           m.timestamp as lastMessageTime,
           m.from_me as last_message_from_me,
           m.media_type as last_message_media_type,
           (SELECT COUNT(*) FROM messages m3 WHERE m3.contact_id = c.id AND m3.from_me = 0 AND m3.is_read = 0 AND m3.tenant_id = ?) as unread_count
    FROM contacts c
    LEFT JOIN (
      SELECT m1.*
      FROM messages m1
      INNER JOIN (
        SELECT contact_id, MAX(timestamp) as max_ts, MAX(id) as max_id
        FROM messages WHERE tenant_id = ?
        GROUP BY contact_id
      ) m2 ON m1.contact_id = m2.contact_id AND m1.timestamp = m2.max_ts AND m1.id = m2.max_id
    ) m ON (c.id = m.contact_id OR m.contact_id LIKE '%' || REPLACE(c.id, '@s.whatsapp.net', '') || '%')
    WHERE c.tenant_id = ? AND c.id != '0@s.whatsapp.net' AND c.id NOT LIKE '%@lid'
    ORDER BY (CASE WHEN m.timestamp IS NOT NULL THEN 1 ELSE 0 END) DESC, COALESCE(m.timestamp, 0) DESC, c.name ASC
  `, [tenantId, tenantId, tenantId]);
  
  return chats.map(c => {
    try {
      c.labels = JSON.parse(c.labels || '[]');
    } catch {
      c.labels = [];
    }
    c.name = c.name || c.custom_name || c.displayName || c.phone_computed;
    c.phone = c.phone_computed || c.id.split('@')[0];
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
    features: p.features ? JSON.parse(p.features) : []
  }));
}

export async function addOrUpdatePlan(id, name, description, features, maxChannels, maxContacts, allowChatbot, allowScheduler, isActive) {
  await db.run(
    `INSERT OR REPLACE INTO plans (id, name, description, features, max_channels, max_contacts, allow_chatbot, allow_scheduler, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, name, description, JSON.stringify(features), maxChannels, maxContacts, allowChatbot ? 1 : 0, allowScheduler ? 1 : 0, isActive ? 1 : 0]
  );
  return await db.get(`SELECT * FROM plans WHERE id = ?`, [id]);
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

// Export database connection instance for transactions
export function getDb() {
  return db;
}
