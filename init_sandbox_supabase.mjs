import pg from 'pg';

const SANDBOX_DB_URL = 'postgresql://postgres:%28sandbox%40113%29@db.mucgmzldgvtblmsurtgo.supabase.co:5432/postgres';

const pool = new pg.Pool({
  connectionString: SANDBOX_DB_URL,
  ssl: { rejectUnauthorized: false }
});

const schemaSQL = `
-- 1. TENANTS
CREATE TABLE IF NOT EXISTS tenants (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  subscription_status VARCHAR(50) DEFAULT 'active',
  plan_id VARCHAR(50) DEFAULT 'starter',
  stripe_customer_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. USERS
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

-- 3. TENANT SETTINGS
CREATE TABLE IF NOT EXISTS tenant_settings (
  tenant_id INTEGER PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  pipeline_stages JSONB DEFAULT '[]'::jsonb,
  tags JSONB DEFAULT '[]'::jsonb,
  business_hours JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. WHATSAPP SESSIONS
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

-- 5. CONTACTS
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

-- 6. LID MAPPINGS
CREATE TABLE IF NOT EXISTS lid_mappings (
  lid VARCHAR(100) PRIMARY KEY,
  pn VARCHAR(100) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. MESSAGES
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

-- 11. CALL LOGS & TELECALLING
CREATE TABLE IF NOT EXISTS call_logs (
  id VARCHAR(100) PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_name VARCHAR(255) NOT NULL,
  agent_id VARCHAR(100),
  agent_role VARCHAR(100) DEFAULT 'telecaller',
  customer_name VARCHAR(255),
  customer_phone VARCHAR(50),
  phone VARCHAR(50),
  call_type VARCHAR(50) DEFAULT 'OUTGOING',
  type VARCHAR(50) DEFAULT 'OUTGOING',
  channel VARCHAR(50) DEFAULT 'SIM',
  status VARCHAR(50) DEFAULT 'Completed',
  duration VARCHAR(50) DEFAULT '00:00',
  duration_seconds INTEGER DEFAULT 0,
  recording_url TEXT,
  disposition VARCHAR(100) DEFAULT 'Interested',
  notes TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. EMPLOYEES (EMS CORE WITH DEDUPLICATION)
CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(50),
  role VARCHAR(50) DEFAULT 'employee',
  department VARCHAR(100),
  salary NUMERIC(12, 2) DEFAULT 0.00,
  status VARCHAR(50) DEFAULT 'active',
  joining_date DATE DEFAULT CURRENT_DATE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. ATTENDANCE LOGS
CREATE TABLE IF NOT EXISTS attendance_logs (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  date DATE DEFAULT CURRENT_DATE,
  status VARCHAR(50) DEFAULT 'Present',
  work_mode VARCHAR(50) DEFAULT 'Office',
  location_lat NUMERIC(10, 7),
  location_lng NUMERIC(10, 7),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. TASKS
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  assigned_to INTEGER REFERENCES employees(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'pending',
  priority VARCHAR(50) DEFAULT 'medium',
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. EXPENSES
CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
  category VARCHAR(100) NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  description TEXT,
  receipt_url TEXT,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. HOLIDAYS
CREATE TABLE IF NOT EXISTS holidays (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  type VARCHAR(50) DEFAULT 'Public',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. LEAVES
CREATE TABLE IF NOT EXISTS leaves (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. NOTICES
CREATE TABLE IF NOT EXISTS notices (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  priority VARCHAR(50) DEFAULT 'normal',
  published_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. SYSTEM DROPDOWNS
CREATE TABLE IF NOT EXISTS system_dropdowns (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL,
  value VARCHAR(255) NOT NULL,
  label VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id VARCHAR(100),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id VARCHAR(100),
  details JSONB,
  ip_address VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 🔒 STRICT ZERO-DUPLICATE INDEXES
-- ==============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_tenant_email_unique
ON employees (tenant_id, LOWER(TRIM(email)))
WHERE email IS NOT NULL AND TRIM(email) != '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_tenant_phone_unique
ON employees (tenant_id, regexp_replace(phone, '\\D', '', 'g'))
WHERE phone IS NOT NULL AND regexp_replace(phone, '\\D', '', 'g') != '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_tenant_phone_unique
ON contacts (tenant_id, phone_normalized)
WHERE phone_normalized IS NOT NULL AND phone_normalized != '';

-- ==============================================================================
-- 🌱 SEED SANDBOX TENANTS
-- ==============================================================================
INSERT INTO tenants (id, company_name, subscription_status, plan_id)
VALUES 
  (1, '#TEN-0001-RAHUL-CHOPRA-SANDBOX', 'active', 'enterprise'),
  (999, '#TEN-0999-SANDBOX-DEMO', 'active', 'enterprise')
ON CONFLICT (id) DO UPDATE SET company_name = EXCLUDED.company_name;

SELECT setval('tenants_id_seq', (SELECT GREATEST(MAX(id), 1000) FROM tenants));

-- Immortality Trigger for Tenant 1
CREATE OR REPLACE FUNCTION prevent_tenant_1_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.id = 1 THEN
        RAISE EXCEPTION 'CRITICAL INTEGRITY ERROR: Tenant 1 is immortal and cannot be deleted!';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_tenant_1_delete ON tenants;
CREATE TRIGGER trg_prevent_tenant_1_delete
BEFORE DELETE ON tenants
FOR EACH ROW
EXECUTE FUNCTION prevent_tenant_1_delete();
`;

async function run() {
  const client = await pool.connect();
  try {
    console.log('🚀 Running Full Master Schema initialization on Sandbox Supabase...');
    await client.query(schemaSQL);
    console.log('✅ Schema & Constraints initialized successfully!');

    const res = await client.query("SELECT id, company_name FROM tenants ORDER BY id ASC");
    console.log('🏢 Initialized Tenants in Sandbox:', res.rows);

    const tablesRes = await client.query("SELECT count(*) as count FROM information_schema.tables WHERE table_schema = 'public'");
    console.log(`📊 Public Tables created in Sandbox: ${tablesRes.rows[0].count}`);
  } catch (err) {
    console.error('❌ Error initializing Sandbox DB:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
