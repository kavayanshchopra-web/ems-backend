import { getPgPool } from './backend/postgresDb.js';

const pgSandboxSQL = `
-- 1. SANDBOX AUTOMATION FLOWS (100% Isolated)
CREATE TABLE IF NOT EXISTS sandbox_automation_flows (
  id VARCHAR(100) PRIMARY KEY,
  tenant_id VARCHAR(100) NOT NULL DEFAULT 'org_default',
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) DEFAULT 'general',
  description TEXT,
  trigger_type VARCHAR(50) DEFAULT 'keyword',
  trigger_config TEXT DEFAULT '{}',
  nodes_json TEXT DEFAULT '[]',
  edges_json TEXT DEFAULT '[]',
  is_active SMALLINT DEFAULT 1,
  execution_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. SANDBOX FLOW SESSIONS (Isolated Conversation State Machine)
CREATE TABLE IF NOT EXISTS sandbox_flow_sessions (
  id VARCHAR(100) PRIMARY KEY,
  tenant_id VARCHAR(100) NOT NULL DEFAULT 'org_default',
  flow_id VARCHAR(100) REFERENCES sandbox_automation_flows(id) ON DELETE CASCADE,
  phone_number VARCHAR(50) NOT NULL,
  current_node_id VARCHAR(100),
  variables_json TEXT DEFAULT '{}',
  last_interaction_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SANDBOX FLOW LOGS (Audit & Performance Funnel)
CREATE TABLE IF NOT EXISTS sandbox_flow_logs (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(100) NOT NULL DEFAULT 'org_default',
  flow_id VARCHAR(100),
  phone_number VARCHAR(50),
  node_id VARCHAR(100),
  node_type VARCHAR(50),
  event_type VARCHAR(50) DEFAULT 'EXECUTION',
  payload TEXT,
  status VARCHAR(50) DEFAULT 'success',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sandbox_flows_tenant ON sandbox_automation_flows(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sandbox_flow_logs_flow ON sandbox_flow_logs(flow_id);
`;

export async function initPostgresSandboxTables() {
  const pool = getPgPool();
  if (!pool) return;
  
  try {
    await pool.query(pgSandboxSQL);
    console.log('⚡ Sandbox Automation Tables verified in PostgreSQL!');

    // Check if seeded
    const countRes = await pool.query(`SELECT COUNT(*) as cnt FROM sandbox_automation_flows`);
    const count = parseInt(countRes.rows[0]?.cnt || 0, 10);
    if (count === 0) {
      console.log('🌱 Seeding Master Archetypes into PostgreSQL Sandbox...');
      const seedTemplates = [
        {
          id: 'tpl_real_estate_site_visit',
          tenant_id: 'org_default',
          name: '🏡 Real Estate 24/7 Site Visit & Brochure Qualifier',
          category: 'real_estate',
          description: 'Captures property interest, auto-sends brochure PDF, and books site visits with sales routing.',
          trigger_type: 'keyword',
          trigger_config: JSON.stringify({ keywords: ['property', 'flat', 'villa', 'brochure', 'visit'] }),
          nodes_json: JSON.stringify([
            { id: 'node_trigger', type: 'trigger', position: { x: 50, y: 100 }, data: { label: 'Inbound WhatsApp: "Property" / "Brochure"', type: 'keyword' } },
            { id: 'node_welcome', type: 'message', position: { x: 300, y: 100 }, data: { label: 'Welcome to Palm Heights! Choose unit type:', buttons: ['2 BHK Luxury', '3 BHK Penthouse', 'Download Brochure 📄', 'Schedule Site Visit 🚗'] } },
            { id: 'node_brochure', type: 'media', position: { x: 600, y: 50 }, data: { label: 'Send PDF Brochure', mediaUrl: 'https://cdn.omniflow.io/templates/palm_heights_brochure.pdf', mediaType: 'document' } },
            { id: 'node_visit_slot', type: 'interactive_time', position: { x: 600, y: 200 }, data: { label: 'Site Visit Slots', buttons: ['Tomorrow 11 AM', 'Tomorrow 4 PM', 'This Weekend'] } },
            { id: 'node_notify_agent', type: 'agent_route', position: { x: 880, y: 150 }, data: { label: 'Route VIP Lead to Real Estate Closer', agentId: 'agent_vip_team', autoCreateContact: true, stage: 'Site Visit Booked' } }
          ]),
          edges_json: JSON.stringify([
            { id: 'e1', source: 'node_trigger', target: 'node_welcome' },
            { id: 'e2', source: 'node_welcome', target: 'node_brochure', condition: 'Download Brochure 📄' },
            { id: 'e3', source: 'node_welcome', target: 'node_visit_slot', condition: 'Schedule Site Visit 🚗' },
            { id: 'e4', source: 'node_visit_slot', target: 'node_notify_agent' }
          ]),
          is_active: 1
        },
        {
          id: 'tpl_ecommerce_abandoned_cart',
          tenant_id: 'org_default',
          name: '🛒 E-Commerce Abandoned Cart Recovery with 15% VIP Coupon',
          category: 'ecommerce',
          description: 'Triggers on abandoned checkout with product card, dynamically applies 15% discount button.',
          trigger_type: 'webhook',
          trigger_config: JSON.stringify({ event: 'cart.abandoned', delayMinutes: 15 }),
          nodes_json: JSON.stringify([
            { id: 'node_trigger', type: 'trigger', position: { x: 50, y: 100 }, data: { label: 'Shopify / WooCommerce Webhook: Cart Abandoned', type: 'webhook' } },
            { id: 'node_cart_msg', type: 'message', position: { x: 300, y: 100 }, data: { label: 'Hey {{name}}! You left items in your cart. Grab 15% OFF now:', buttons: ['Complete Order (15% OFF)', 'Chat with Support', 'Cancel Items'] } },
            { id: 'node_checkout_link', type: 'action', position: { x: 600, y: 80 }, data: { label: 'Send Dynamic Checkout URL', url: 'https://mystore.com/checkout?discount=SAVE15' } },
            { id: 'node_agent_escalate', type: 'agent_route', position: { x: 600, y: 220 }, data: { label: 'Route to Live Support Desk', stage: 'Cart Help Requested' } }
          ]),
          edges_json: JSON.stringify([
            { id: 'e1', source: 'node_trigger', target: 'node_cart_msg' },
            { id: 'e2', source: 'node_cart_msg', target: 'node_checkout_link', condition: 'Complete Order (15% OFF)' },
            { id: 'e3', source: 'node_cart_msg', target: 'node_agent_escalate', condition: 'Chat with Support' }
          ]),
          is_active: 1
        },
        {
          id: 'tpl_healthcare_appointment',
          tenant_id: 'org_default',
          name: '🩺 Doctor & Clinic Smart Appointment Booking + Reminders',
          category: 'healthcare',
          description: 'Automates patient slot selection, collects doctor preference, and sends Google Calendar reminders.',
          trigger_type: 'keyword',
          trigger_config: JSON.stringify({ keywords: ['appointment', 'doctor', 'clinic', 'checkup', 'consultation'] }),
          nodes_json: JSON.stringify([
            { id: 'node_trigger', type: 'trigger', position: { x: 50, y: 100 }, data: { label: 'Inbound: "Doctor Appointment"', type: 'keyword' } },
            { id: 'node_speciality', type: 'message', position: { x: 300, y: 100 }, data: { label: 'Welcome to City Care Hospital. Select Doctor Speciality:', buttons: ['Cardiology', 'Dental & Ortho', 'General Physician', 'Pediatrics'] } },
            { id: 'node_slots', type: 'message', position: { x: 600, y: 100 }, data: { label: 'Available Consultation Slots Today:', buttons: ['11:30 AM', '02:00 PM', '05:30 PM'] } },
            { id: 'node_confirm', type: 'action', position: { x: 880, y: 100 }, data: { label: 'Confirm Slot & Send Location Pin 📍', autoTag: 'Patient Confirmed' } }
          ]),
          edges_json: JSON.stringify([
            { id: 'e1', source: 'node_trigger', target: 'node_speciality' },
            { id: 'e2', source: 'node_speciality', target: 'node_slots' },
            { id: 'e3', source: 'node_slots', target: 'node_confirm' }
          ]),
          is_active: 1
        },
        {
          id: 'tpl_edtech_lead_qualifier',
          tenant_id: 'org_default',
          name: '🎓 EdTech Course Qualifier + Instant Syllabus Download',
          category: 'education',
          description: 'Qualifies student grade/interest, delivers course syllabus PDF, and schedules demo class.',
          trigger_type: 'keyword',
          trigger_config: JSON.stringify({ keywords: ['course', 'syllabus', 'admission', 'class', 'python', 'ai'] }),
          nodes_json: JSON.stringify([
            { id: 'node_trigger', type: 'trigger', position: { x: 50, y: 100 }, data: { label: 'Keyword: "Course Admission"', type: 'keyword' } },
            { id: 'node_grade_select', type: 'message', position: { x: 300, y: 100 }, data: { label: 'Which track are you interested in?', buttons: ['Full Stack Web Dev', 'AI & Machine Learning', 'Data Science Masterclass'] } },
            { id: 'node_send_syllabus', type: 'media', position: { x: 600, y: 60 }, data: { label: 'Send Syllabus PDF', mediaUrl: 'https://cdn.omniflow.io/edtech_syllabus.pdf' } },
            { id: 'node_demo_booking', type: 'agent_route', position: { x: 600, y: 200 }, data: { label: 'Assign to Academic Counselor', stage: 'Demo Class Requested' } }
          ]),
          edges_json: JSON.stringify([
            { id: 'e1', source: 'node_trigger', target: 'node_grade_select' },
            { id: 'e2', source: 'node_grade_select', target: 'node_send_syllabus' },
            { id: 'e3', source: 'node_send_syllabus', target: 'node_demo_booking' }
          ]),
          is_active: 1
        },
        {
          id: 'tpl_google_review_booster',
          tenant_id: 'org_default',
          name: '⭐ 5-Star Google Review Booster & NPS Feedback Engine',
          category: 'marketing',
          description: 'Filters ratings: 5-star ratings route to Google Maps review link; 1-3 stars route privately to management.',
          trigger_type: 'event',
          trigger_config: JSON.stringify({ event: 'order_delivered' }),
          nodes_json: JSON.stringify([
            { id: 'node_trigger', type: 'trigger', position: { x: 50, y: 100 }, data: { label: 'Event: Service Completed / Delivery', type: 'event' } },
            { id: 'node_nps_ask', type: 'message', position: { x: 300, y: 100 }, data: { label: 'How was your experience today?', buttons: ['⭐⭐⭐⭐⭐ (5/5)', '⭐⭐⭐⭐ (4/5)', '⭐⭐⭐ (3/5 or below)'] } },
            { id: 'node_google_link', type: 'action', position: { x: 600, y: 50 }, data: { label: 'Send Google Review URL', url: 'https://g.page/r/your-business/review' } },
            { id: 'node_private_escalate', type: 'agent_route', position: { x: 600, y: 180 }, data: { label: 'Alert Branch Manager (Private Feedback)', priority: 'urgent', stage: 'Negative NPS Followup' } }
          ]),
          edges_json: JSON.stringify([
            { id: 'e1', source: 'node_trigger', target: 'node_nps_ask' },
            { id: 'e2', source: 'node_nps_ask', target: 'node_google_link', condition: '⭐⭐⭐⭐⭐ (5/5)' },
            { id: 'e3', source: 'node_nps_ask', target: 'node_private_escalate', condition: '⭐⭐⭐ (3/5 or below)' }
          ]),
          is_active: 1
        },
        {
          id: 'tpl_smart_faq_agent_router',
          tenant_id: 'org_default',
          name: '🤖 24/7 Smart FAQ Answering & Human Escalation Bridge',
          category: 'customer_support',
          description: 'Handles 80% of routine questions instantly, seamlessly transfers to human agent on demand.',
          trigger_type: 'default_fallback',
          trigger_config: JSON.stringify({ matchAnyMessage: true }),
          nodes_json: JSON.stringify([
            { id: 'node_trigger', type: 'trigger', position: { x: 50, y: 100 }, data: { label: 'Any Incoming Message', type: 'default_fallback' } },
            { id: 'node_faq_menu', type: 'message', position: { x: 300, y: 100 }, data: { label: 'Hello! I am your AI Assistant. How can I assist you?', buttons: ['Pricing & Plans', 'Office Location & Timing', 'Talk to Live Human Agent 👤'] } },
            { id: 'node_agent_transfer', type: 'agent_route', position: { x: 600, y: 140 }, data: { label: 'Transfer Live Chat to On-Duty Support Agent', stage: 'Agent Escalation Needed' } }
          ]),
          edges_json: JSON.stringify([
            { id: 'e1', source: 'node_trigger', target: 'node_faq_menu' },
            { id: 'e2', source: 'node_faq_menu', target: 'node_agent_transfer', condition: 'Talk to Live Human Agent 👤' }
          ]),
          is_active: 1
        }
      ];

      for (const tpl of seedTemplates) {
        await pool.query(
          `INSERT INTO sandbox_automation_flows (id, tenant_id, name, category, description, trigger_type, trigger_config, nodes_json, edges_json, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT(id) DO NOTHING`,
          [tpl.id, tpl.tenant_id, tpl.name, tpl.category, tpl.description, tpl.trigger_type, tpl.trigger_config, tpl.nodes_json, tpl.edges_json, tpl.is_active]
        );
      }
      console.log('✅ Master Archetypes seeded successfully in PostgreSQL!');
    }
  } catch (err) {
    console.error('❌ initPostgresSandboxTables error:', err.message);
  }
}

// Auto-run if executed directly
if (process.argv[1]?.endsWith('init_sandbox_automations_pg.mjs')) {
  initPostgresSandboxTables().then(() => process.exit(0));
}
