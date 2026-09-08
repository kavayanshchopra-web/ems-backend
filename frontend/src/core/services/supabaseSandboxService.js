/**
 * supabaseSandboxService.js
 * Dedicated Direct Supabase PostgreSQL 17 Client for Sandbox Environment
 * Project: omniflow-sandbox (mucgmzldgvtblmsurtgo)
 * 100% Isolated from Live Production
 */

const SUPABASE_URL = 'https://mucgmzldgvtblmsurtgo.supabase.co/rest/v1';
const SUPABASE_KEY = 'sb_publishable_xRGskG_bEbCJebUMT_XPHA_vjwf1Lr1';

const getHeaders = () => ({
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
});

export const isSandboxEnvironment = () => {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host.includes('sandbox') || host.includes('vercel.app') || window.location.search.includes('sandbox=true');
};

export const SupabaseSandboxService = {
  // 1. EMPLOYEES
  async fetchEmployees(tenantId = 999) {
    try {
      const res = await fetch(`${SUPABASE_URL}/employees?tenant_id=eq.${tenantId}&order=id.desc`, {
        headers: getHeaders()
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('[Supabase Sandbox] fetchEmployees error:', err);
      return [];
    }
  },

  async createEmployee(employeeData, tenantId = 999) {
    try {
      const payload = {
        tenant_id: Number(tenantId) || 999,
        first_name: employeeData.firstName || employeeData.first_name || '',
        last_name: employeeData.lastName || employeeData.last_name || '',
        email: (employeeData.email || '').trim().toLowerCase() || null,
        phone: (employeeData.phone || '').trim() || null,
        role: employeeData.role || 'employee',
        department: employeeData.department || 'Engineering',
        salary: parseFloat(employeeData.salary) || 0,
        status: employeeData.status || 'active',
        joining_date: employeeData.joiningDate || new Date().toISOString().split('T')[0]
      };

      const res = await fetch(`${SUPABASE_URL}/employees`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.code === '23505') {
          const isEmail = String(data.details || '').includes('email');
          const field = isEmail ? 'Email' : 'Phone Number';
          throw new Error(`⚠️ Duplicate Blocked: Is ${field} se pehle se employee account exist karta hai. 1 Gmail/Number se 2 accounts nahi ban sakte!`);
        }
        throw new Error(data.message || 'Failed to save employee profile');
      }

      return data[0] || data;
    } catch (err) {
      throw err;
    }
  },

  async updateEmployee(id, employeeData, tenantId = 999) {
    try {
      const payload = {
        first_name: employeeData.firstName || employeeData.first_name,
        last_name: employeeData.lastName || employeeData.last_name,
        email: (employeeData.email || '').trim().toLowerCase() || null,
        phone: (employeeData.phone || '').trim() || null,
        role: employeeData.role,
        department: employeeData.department,
        salary: parseFloat(employeeData.salary) || 0,
        status: employeeData.status || 'active',
        updated_at: new Date().toISOString()
      };

      const res = await fetch(`${SUPABASE_URL}/employees?id=eq.${id}&tenant_id=eq.${tenantId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.code === '23505') {
          throw new Error('⚠️ Duplicate Blocked: Email ya Phone number pehle se used hai!');
        }
        throw new Error(data.message || 'Failed to update employee');
      }
      return data[0] || data;
    } catch (err) {
      throw err;
    }
  },

  async deleteEmployee(id, tenantId = 999) {
    try {
      const res = await fetch(`${SUPABASE_URL}/employees?id=eq.${id}&tenant_id=eq.${tenantId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      return res.ok;
    } catch (err) {
      console.error('[Supabase Sandbox] deleteEmployee error:', err);
      return false;
    }
  },

  // 2. CONTACTS / LEADS
  async fetchContacts(tenantId = 999) {
    try {
      const res = await fetch(`${SUPABASE_URL}/contacts?tenant_id=eq.${tenantId}&order=updated_at.desc`, {
        headers: getHeaders()
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return (Array.isArray(data) ? data : []).map(c => ({
        ...c,
        id: c.id,
        name: c.name || c.custom_name || c.phone,
        phone_computed: c.phone || (c.id ? c.id.replace(/@.*/, '') : ''),
        pipeline_stage: c.pipeline_stage || 'new',
        unread_count: 0
      }));
    } catch (err) {
      console.error('[Supabase Sandbox] fetchContacts error:', err);
      return [];
    }
  },

  async createContact(contactData, tenantId = 999) {
    try {
      const cleanPhone = (contactData.phone || '').replace(/\D/g, '');
      const contactId = contactData.id || (cleanPhone ? `${cleanPhone}@s.whatsapp.net` : `lead_${Date.now()}@temp.net`);
      const payload = {
        id: contactId,
        tenant_id: Number(tenantId) || 999,
        name: contactData.name || cleanPhone || 'New Lead',
        custom_name: contactData.name || cleanPhone || 'New Lead',
        phone: cleanPhone || contactData.phone,
        phone_normalized: cleanPhone.slice(-10),
        pipeline_stage: contactData.pipeline_stage || 'new',
        is_archived: false,
        labels: contactData.labels || [],
        notes: contactData.notes || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const res = await fetch(`${SUPABASE_URL}/contacts`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.code === '23505') {
          // Already exists in Sandbox, fetch and return
          const existing = await this.fetchContacts(tenantId);
          const found = existing.find(c => c.id === contactId);
          if (found) return found;
        }
        throw new Error(data.message || 'Failed to create lead');
      }

      return data[0] || payload;
    } catch (err) {
      throw err;
    }
  }
};

export default SupabaseSandboxService;
