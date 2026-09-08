import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:%28Kavay%40113%29@db.pdjaajbhrvglwukoacuh.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

const schemaSQL = `
-- ==============================================================================
-- 🚀 OMNIFLOW MULTI-TENANT ENTERPRISE MASTER SCHEMA (SUPABASE POSTGRESQL 17)
-- ==============================================================================

-- 1. TENANTS & MULTI-TENANCY MASTER
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name != 'tenant_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE tasks RENAME TO old_tasks_legacy;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS tenants (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  subscription_status VARCHAR(50) DEFAULT 'active',
  plan_id VARCHAR(50) DEFAULT 'starter',
  stripe_customer_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. USERS (OWNERS, MANAGERS, AGENTS)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(50) DEFAULT 'owner',
  full_name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TENANT DYNAMIC SETTINGS
CREATE TABLE IF NOT EXISTS tenant_settings (
  tenant_id INTEGER PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  pipeline_stages JSONB DEFAULT '[]'::jsonb,
  tags JSONB DEFAULT '[]'::jsonb,
  business_hours JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. WHATSAPP SESSIONS (BAILEYS MULTI-DEVICE)
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id VARCHAR(100) PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  phone_name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(50),
  status VARCHAR(50) DEFAULT 'disconnected',
  qr_code TEXT,
  profile_pic_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CRM CONTACTS
CREATE TABLE IF NOT EXISTS contacts (
  id VARCHAR(100) PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255),
  custom_name VARCHAR(255),
  phone VARCHAR(50),
  phone_normalized VARCHAR(50),
  email VARCHAR(255),
  notes TEXT,
  pipeline_stage VARCHAR(50) DEFAULT 'new',
  labels JSONB DEFAULT '[]'::jsonb,
  profile_pic_url TEXT,
  is_archived BOOLEAN DEFAULT FALSE,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. LID TO PHONE JID MAPPINGS (WHATSAPP PRIVACY MAPPINGS)
CREATE TABLE IF NOT EXISTS lid_mappings (
  lid VARCHAR(100) PRIMARY KEY,
  pn VARCHAR(100) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. CHAT MESSAGES
CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(150) PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id VARCHAR(100) REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
  contact_id VARCHAR(100) REFERENCES contacts(id) ON DELETE CASCADE,
  from_me BOOLEAN DEFAULT FALSE,
  text_content TEXT,
  media_url TEXT,
  media_type VARCHAR(50) DEFAULT 'text',
  timestamp BIGINT NOT NULL,
  is_read BOOLEAN DEFAULT TRUE,
  is_starred BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. WEBHOOK LOGS
CREATE TABLE IF NOT EXISTS webhook_logs (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source VARCHAR(100) NOT NULL,
  payload JSONB,
  received_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. CHATBOT RULES
CREATE TABLE IF NOT EXISTS chatbot_rules (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  keyword VARCHAR(255) NOT NULL,
  reply_text TEXT NOT NULL,
  match_type VARCHAR(50) DEFAULT 'contains',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. SCHEDULED MESSAGES
CREATE TABLE IF NOT EXISTS scheduled_messages (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id VARCHAR(100) REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
  contact_id VARCHAR(100) REFERENCES contacts(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. PLANS & PRICING
CREATE TABLE IF NOT EXISTS plans (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plan_prices (
  id SERIAL PRIMARY KEY,
  plan_id VARCHAR(50) REFERENCES plans(id) ON DELETE CASCADE,
  country_code VARCHAR(10) NOT NULL,
  currency VARCHAR(10) NOT NULL,
  amount_monthly NUMERIC(10,2) NOT NULL,
  amount_yearly NUMERIC(10,2) NOT NULL,
  stripe_price_id_monthly VARCHAR(255),
  stripe_price_id_yearly VARCHAR(255),
  UNIQUE(plan_id, country_code)
);

-- 12. EMPLOYEES & HR CORE
CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(50),
  role VARCHAR(50) DEFAULT 'employee',
  department VARCHAR(100),
  salary NUMERIC(12,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active',
  joining_date DATE DEFAULT CURRENT_DATE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

-- 13. ATTENDANCE LOGS
CREATE TABLE IF NOT EXISTS attendance_logs (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  check_in_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  check_out_time TIMESTAMPTZ,
  check_in_lat DOUBLE PRECISION,
  check_in_lng DOUBLE PRECISION,
  check_out_lat DOUBLE PRECISION,
  check_out_lng DOUBLE PRECISION,
  status VARCHAR(50) DEFAULT 'checked_in',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. GPS LOCATIONS (FIELD TRACKING)
CREATE TABLE IF NOT EXISTS gps_locations (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. TASKS
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  assigned_to INTEGER REFERENCES employees(id) ON DELETE SET NULL,
  priority VARCHAR(50) DEFAULT 'Medium',
  status VARCHAR(50) DEFAULT 'To Do',
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. NOTICES & ANNOUNCEMENTS
CREATE TABLE IF NOT EXISTS notices (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. HOLIDAYS
CREATE TABLE IF NOT EXISTS holidays (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  date DATE NOT NULL
);

-- 18. LEAVES & TIME OFF
CREATE TABLE IF NOT EXISTS leaves (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  type VARCHAR(50) DEFAULT 'Sick',
  reason TEXT,
  status VARCHAR(50) DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. EXPENSES & CLAIMS (MIGRATED FROM FIRESTORE)
CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  amount NUMERIC(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  receipt_url TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20. ASSETS MANAGEMENT (MIGRATED FROM FIRESTORE)
CREATE TABLE IF NOT EXISTS assets (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100),
  serial_number VARCHAR(100),
  assigned_to INTEGER REFERENCES employees(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'available',
  cost NUMERIC(10,2) DEFAULT 0,
  purchase_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 21. OFFBOARDING & F&F SETTLEMENTS (MIGRATED FROM FIRESTORE)
CREATE TABLE IF NOT EXISTS offboarding (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  resignation_date DATE,
  last_working_day DATE,
  settlement_status VARCHAR(50) DEFAULT 'in_progress',
  fnf_amount NUMERIC(12,2) DEFAULT 0,
  clearance_checklist JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 22. WORK SHIFTS & ROSTER (MIGRATED FROM FIRESTORE)
CREATE TABLE IF NOT EXISTS shifts (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  grace_period_mins INTEGER DEFAULT 15,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 23. PAYROLL & SALARY SLIPS (MIGRATED FROM FIRESTORE)
CREATE TABLE IF NOT EXISTS payroll (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  month_year VARCHAR(20) NOT NULL, -- '2026-09'
  basic_salary NUMERIC(12,2) NOT NULL,
  allowances NUMERIC(12,2) DEFAULT 0,
  deductions NUMERIC(12,2) DEFAULT 0,
  net_payable NUMERIC(12,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'draft',
  slip_pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 24. SIM BRIDGE (COMPANION APP DEVICES)
CREATE TABLE IF NOT EXISTS sim_bridge_devices (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  staff_id VARCHAR(100) NOT NULL,
  staff_name VARCHAR(255),
  extension VARCHAR(20) DEFAULT '101',
  pin VARCHAR(20) DEFAULT '1234',
  device_token VARCHAR(255),
  app_version VARCHAR(50),
  last_seen TIMESTAMPTZ,
  is_online BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 25. TELEPHONY SETTINGS & CLOUD CALLS
CREATE TABLE IF NOT EXISTS telephony_settings (
  tenant_id INTEGER PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  provider VARCHAR(50) DEFAULT 'voxbay',
  uid VARCHAR(100),
  upin VARCHAR(100),
  caller_id VARCHAR(50) DEFAULT '91487110000',
  extension VARCHAR(20) DEFAULT '101',
  mode VARCHAR(50) DEFAULT 'extension_to_mobile',
  source_number VARCHAR(50),
  dept_id VARCHAR(50) DEFAULT '0',
  recording_base_url TEXT DEFAULT 'https://x.voxbay.com:81/callcenter/',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS calls (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  contact_id VARCHAR(100) REFERENCES contacts(id) ON DELETE SET NULL,
  phone_number VARCHAR(50) NOT NULL,
  caller_id VARCHAR(50),
  agent_extension VARCHAR(20),
  provider VARCHAR(50) DEFAULT 'voxbay',
  provider_call_id VARCHAR(100) UNIQUE,
  direction VARCHAR(20) DEFAULT 'outbound',
  status VARCHAR(50) DEFAULT 'initiated',
  duration INTEGER DEFAULT 0,
  conversation_duration INTEGER DEFAULT 0,
  recording_url TEXT,
  dtmf VARCHAR(50),
  notes TEXT,
  metadata JSONB,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  answered_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS call_logs (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  staff_id VARCHAR(100),
  staff_name VARCHAR(255),
  customer_name VARCHAR(255),
  customer_phone VARCHAR(50) NOT NULL,
  channel VARCHAR(20) DEFAULT 'SIM',
  type VARCHAR(20) DEFAULT 'OUTGOING',
  duration_seconds INTEGER DEFAULT 0,
  recording_url TEXT,
  disposition VARCHAR(100) DEFAULT 'Interested',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 26. GOHIGHLEVEL (GHL) INTEGRATIONS
CREATE TABLE IF NOT EXISTS ghl_integrations (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id VARCHAR(100) NOT NULL,
  company_id VARCHAR(100),
  user_id VARCHAR(100),
  user_type VARCHAR(50) DEFAULT 'Location',
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_type VARCHAR(50) DEFAULT 'Bearer',
  expires_in INTEGER DEFAULT 86400,
  expires_at TIMESTAMPTZ NOT NULL,
  scope TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, location_id)
);

CREATE TABLE IF NOT EXISTS ghl_field_mappings (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id VARCHAR(100) NOT NULL,
  crm_field VARCHAR(100) NOT NULL,
  ghl_field VARCHAR(100) NOT NULL,
  direction VARCHAR(20) DEFAULT 'bidirectional',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, location_id, crm_field)
);

CREATE TABLE IF NOT EXISTS ghl_entity_links (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  crm_entity_id VARCHAR(100) NOT NULL,
  ghl_entity_id VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, entity_type, crm_entity_id)
);

-- ==============================================================================
-- 🚀 PERFORMANCE INDEXES (FOR HIGH-SPEED MULTI-TENANT QUERIES)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_contacts_tenant ON contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);
CREATE INDEX IF NOT EXISTS idx_messages_tenant ON messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_messages_contact ON messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_employees_tenant ON employees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_attendance_tenant ON attendance_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_tenant ON tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leaves_tenant ON leaves(tenant_id);
CREATE INDEX IF NOT EXISTS idx_calls_tenant ON calls(tenant_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_tenant ON call_logs(tenant_id);

-- ==============================================================================
-- 🚀 DEFAULT SEED DATA (TENANT 1 & CORE SYSTEM INITIALIZATION)
-- ==============================================================================
INSERT INTO tenants (id, company_name, subscription_status, plan_id)
VALUES (1, 'OmniFlow Default Org', 'active', 'pro')
ON CONFLICT (id) DO UPDATE SET company_name = 'OmniFlow Default Org';

SELECT setval('tenants_id_seq', (SELECT GREATEST(MAX(id), 1) FROM tenants));

INSERT INTO tenant_settings (tenant_id, pipeline_stages, tags)
VALUES (
  1, 
  '[{"id":"new","title":"New Leads","color":"#0d9488"},{"id":"contacted","title":"Contacted","color":"#0ea5e9"},{"id":"interested","title":"Interested","color":"#eab308"},{"id":"proposal","title":"Proposal Sent","color":"#ec4899"},{"id":"won","title":"Closed Won","color":"#10b981"}]'::jsonb,
  '["VIP","Hot","Follow Up","Won"]'::jsonb
)
ON CONFLICT (tenant_id) DO NOTHING;
`;

async function setupSchema() {
  console.log('Connecting to Supabase PostgreSQL...');
  const client = await pool.connect();
  try {
    console.log('Executing Master Schema DDL on Supabase...');
    await client.query(schemaSQL);
    console.log('🎉 SUCCESS: All 26 Multi-Tenant Tables & Indexes created successfully in Supabase PostgreSQL 17!');
    
    // Verify tables count
    const res = await client.query(`
      SELECT count(*) as total_tables 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `);
    console.log(`📊 Verified Public Tables in Supabase: ${res.rows[0].total_tables}`);
  } catch (err) {
    console.error('❌ Schema setup error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

setupSchema();
