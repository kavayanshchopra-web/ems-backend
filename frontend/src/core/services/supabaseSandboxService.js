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
  async fetchEmployees(tenantId = 1) {
    try {
      const res = await fetch(`${SUPABASE_URL}/employees?tenant_id=eq.${tenantId}&order=id.desc`, {
        headers: getHeaders()
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return (Array.isArray(data) ? data : []).map(emp => {
        const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.name || emp.first_name || 'Staff Employee';
        const rawStatus = String(emp.status || 'active').toLowerCase();
        const formattedStatus = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);
        return {
          ...emp,
          id: emp.id,
          name: fullName,
          firstName: emp.first_name || '',
          lastName: emp.last_name || '',
          role: emp.role || 'Staff Employee',
          department: emp.department || 'Engineering',
          designation: emp.metadata?.designation || emp.role || 'Employee',
          email: emp.email || '',
          phone: emp.phone || '',
          salary: emp.salary || 0,
          status: formattedStatus,
          lifecycleStatus: 'ACTIVE',
          tenantId: emp.tenant_id || 1
        };
      });
    } catch (err) {
      console.error('[Supabase Sandbox] fetchEmployees error:', err);
      return [];
    }
  },

  async createEmployee(employeeData, tenantId = 1) {
    try {
      let firstName = employeeData.firstName || employeeData.first_name || '';
      let lastName = employeeData.lastName || employeeData.last_name || '';
      if (!firstName && employeeData.name) {
        const parts = String(employeeData.name).trim().split(/\s+/);
        firstName = parts[0] || 'Staff';
        lastName = parts.slice(1).join(' ') || '';
      }

      const payload = {
        tenant_id: Number(tenantId) || 1,
        first_name: firstName || 'Staff',
        last_name: lastName || '',
        email: (employeeData.email || '').trim().toLowerCase() || null,
        phone: (employeeData.phone || '').trim() || null,
        role: employeeData.role || 'Staff Employee',
        department: employeeData.department || 'Engineering',
        salary: parseFloat(employeeData.salary) || 0,
        status: (employeeData.status || 'active').toLowerCase(),
        joining_date: employeeData.joiningDate || new Date().toISOString().split('T')[0],
        metadata: {
          designation: employeeData.designation || employeeData.role || 'Staff Employee'
        }
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

      const row = Array.isArray(data) ? data[0] : data;
      const fullName = `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.first_name || 'Staff Employee';
      const rawStatus = String(row.status || 'active').toLowerCase();
      return {
        ...row,
        id: row.id,
        name: fullName,
        firstName: row.first_name || '',
        lastName: row.last_name || '',
        role: row.role || 'Staff Employee',
        department: row.department || 'Engineering',
        designation: row.metadata?.designation || row.role || 'Employee',
        email: row.email || '',
        phone: row.phone || '',
        salary: row.salary || 0,
        status: rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1),
        lifecycleStatus: 'ACTIVE',
        tenantId: row.tenant_id || 999
      };
    } catch (err) {
      throw err;
    }
  },

  async updateEmployee(id, employeeData, tenantId = 1) {
    try {
      let firstName = employeeData.firstName || employeeData.first_name;
      let lastName = employeeData.lastName || employeeData.last_name;
      if (!firstName && employeeData.name) {
        const parts = String(employeeData.name).trim().split(/\s+/);
        firstName = parts[0];
        lastName = parts.slice(1).join(' ');
      }

      const payload = {
        first_name: firstName,
        last_name: lastName,
        email: (employeeData.email || '').trim().toLowerCase() || null,
        phone: (employeeData.phone || '').trim() || null,
        role: employeeData.role,
        department: employeeData.department,
        salary: parseFloat(employeeData.salary) || 0,
        status: (employeeData.status || 'active').toLowerCase(),
        metadata: {
          designation: employeeData.designation || employeeData.role
        },
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
      const row = Array.isArray(data) ? data[0] : data;
      const fullName = `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.first_name || 'Staff Employee';
      const rawStatus = String(row.status || 'active').toLowerCase();
      return {
        ...row,
        id: row.id,
        name: fullName,
        firstName: row.first_name || '',
        lastName: row.last_name || '',
        role: row.role || 'Staff Employee',
        department: row.department || 'Engineering',
        designation: row.metadata?.designation || row.role || 'Employee',
        email: row.email || '',
        phone: row.phone || '',
        salary: row.salary || 0,
        status: rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1),
        lifecycleStatus: 'ACTIVE',
        tenantId: row.tenant_id || 999
      };
    } catch (err) {
      throw err;
    }
  },

  async deleteEmployee(id, tenantId = 1) {
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
  async fetchContacts(tenantId = 1) {
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

  async createContact(contactData, tenantId = 1) {
    try {
      const cleanPhone = (contactData.phone || '').replace(/\D/g, '');
      const contactId = contactData.id || (cleanPhone ? `${cleanPhone}@s.whatsapp.net` : `lead_${Date.now()}@temp.net`);
      const payload = {
        id: contactId,
        tenant_id: Number(tenantId) || 1,
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
  },

  async updateContact(id, contactData, tenantId = 1) {
    try {
      const payload = {
        name: contactData.name || contactData.custom_name,
        custom_name: contactData.name || contactData.custom_name,
        phone: contactData.phone,
        pipeline_stage: contactData.pipeline_stage || contactData.stage,
        labels: contactData.labels,
        notes: contactData.notes,
        updated_at: new Date().toISOString()
      };
      Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

      const res = await fetch(`${SUPABASE_URL}/contacts?id=eq.${id}&tenant_id=eq.${Number(tenantId)}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update contact');
      const row = Array.isArray(data) ? data[0] : data;
      return {
        ...row,
        id: row.id,
        name: row.name || row.custom_name || row.phone,
        pipeline_stage: row.pipeline_stage || 'new'
      };
    } catch (err) {
      console.error('[Supabase Sandbox] updateContact error:', err);
      throw err;
    }
  },

  async deleteContact(id, tenantId = 1) {
    try {
      const res = await fetch(`${SUPABASE_URL}/contacts?id=eq.${id}&tenant_id=eq.${Number(tenantId)}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      return res.ok;
    } catch (err) {
      console.error('[Supabase Sandbox] deleteContact error:', err);
      return false;
    }
  },

  // 3. TENANTS / COMPANIES
  async fetchTenants() {
    try {
      const res = await fetch(`${SUPABASE_URL}/tenants?order=id.asc`, {
        headers: getHeaders()
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const tenants = Array.isArray(data) ? data : [];

      // Fetch employee counts per tenant for SuperAdmin telemetry
      try {
        const empRes = await fetch(`${SUPABASE_URL}/employees?select=id,tenant_id`, {
          headers: getHeaders()
        });
        if (empRes.ok) {
          const empList = await empRes.json();
          const countMap = {};
          (empList || []).forEach(e => {
            const tid = e.tenant_id;
            countMap[tid] = (countMap[tid] || 0) + 1;
          });
          return tenants.map(t => ({
            ...t,
            emp_count: countMap[t.id] || 0
          }));
        }
      } catch (countErr) {
        console.warn('[Supabase Sandbox] Employee count query notice:', countErr);
      }

      return tenants;
    } catch (err) {
      console.error('[Supabase Sandbox] fetchTenants error:', err);
      return [];
    }
  },

  async createTenant({ companyName, adminEmail, adminName, planId = 'starter' }) {
    try {
      const res = await fetch(`${SUPABASE_URL}/tenants`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          company_name: companyName,
          subscription_status: 'active',
          plan_id: planId
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create tenant company');
      const tenant = Array.isArray(data) ? data[0] : data;

      // Also create initial admin user if email provided
      if (adminEmail && tenant.id) {
        await fetch(`${SUPABASE_URL}/users`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            tenant_id: tenant.id,
            email: (adminEmail || '').trim().toLowerCase(),
            password_hash: 'sandbox_hash',
            role: 'owner',
            full_name: adminName || companyName
          })
        }).catch(console.warn);
      }

      return tenant;
    } catch (err) {
      throw err;
    }
  },

  async deleteTenant(id) {
    try {
      const res = await fetch(`${SUPABASE_URL}/tenants?id=eq.${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      return res.ok;
    } catch (err) {
      console.error('[Supabase Sandbox] deleteTenant error:', err);
      return false;
    }
  },

  async fetchUsers() {
    try {
      const res = await fetch(`${SUPABASE_URL}/users?order=id.asc`, {
        headers: getHeaders()
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return (Array.isArray(data) ? data : []).map(u => ({
        id: u.id,
        name: u.full_name || (u.email ? u.email.split('@')[0] : 'User'),
        email: u.email,
        role: u.role || 'owner',
        companyName: u.tenant_id === 1 ? '#TEN-0001-KAVYANSH-CHOPRA' : `Tenant #${u.tenant_id}`,
        tenant_id: u.tenant_id,
        createdAt: u.created_at ? new Date(u.created_at).toLocaleDateString() : '2026-09-08'
      }));
    } catch (err) {
      console.error('[Supabase Sandbox] fetchUsers error:', err);
      return [];
    }
  },

  // 4. CALL LOGS & RECORDINGS
  async fetchCallLogs(tenantId = 1) {
    try {
      const res = await fetch(`${SUPABASE_URL}/call_logs?tenant_id=eq.${Number(tenantId)}&order=created_at.desc`, {
        headers: getHeaders()
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return (Array.isArray(data) ? data : []).map(log => ({
        ...log,
        id: log.id,
        name: log.customer_name || log.phone || 'Customer',
        customerName: log.customer_name || log.phone || 'Customer',
        agentName: log.agent_name || 'Telecaller Agent',
        agentRole: log.agent_role || 'telecaller',
        phone: log.phone || log.customer_phone || '—',
        channel: log.channel || 'SIM',
        type: log.call_type || log.type || 'OUTGOING',
        callType: log.call_type || log.type || 'OUTGOING',
        duration: log.duration || '00:30',
        durationSeconds: log.duration_seconds || 30,
        recording: log.recording_url || '',
        recordingUrl: log.recording_url || '',
        status: log.disposition || log.status || 'Interested',
        disposition: log.disposition || log.status || 'Interested',
        notes: log.notes || '',
        timestamp: log.timestamp || log.created_at,
        _createdAt: new Date(log.created_at || log.timestamp).getTime(),
        tenantId: log.tenant_id
      }));
    } catch (err) {
      console.error('[Supabase Sandbox] fetchCallLogs error:', err);
      return [];
    }
  },

  async createCallLog(callData, tenantId = 1) {
    try {
      const callId = callData.id || `CALL-${Date.now()}`;
      const durSec = Number(callData.durationSeconds || callData.duration_seconds || 0);
      let durStr = callData.duration;
      if (!durStr || typeof durStr !== 'string') {
        const m = Math.floor(durSec / 60);
        const s = durSec % 60;
        durStr = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      }
      const custPhone = callData.phone || callData.phoneNumber || callData.customerPhone || callData.customer_phone || '';
      const payload = {
        id: callId,
        tenant_id: Number(tenantId) || 1,
        agent_name: callData.agentName || callData.agent_name || 'Mobile Agent',
        agent_id: callData.agentId || callData.agent_id || null,
        agent_role: callData.agentRole || callData.agent_role || 'telecaller',
        customer_name: callData.customerName || callData.name || callData.contactName || null,
        customer_phone: custPhone || null,
        phone: custPhone || null,
        call_type: (callData.type || callData.call_type || 'OUTGOING').toUpperCase(),
        type: (callData.type || callData.call_type || 'OUTGOING').toUpperCase(),
        channel: (callData.channel || 'SIM').toUpperCase(),
        status: callData.status || callData.disposition || 'Completed',
        duration: durStr || '00:30',
        duration_seconds: durSec || 30,
        recording_url: callData.recordingUrl || callData.recording || null,
        disposition: callData.disposition || callData.status || 'Interested',
        notes: callData.notes || '',
        timestamp: callData.timestamp ? new Date(callData.timestamp).toISOString() : new Date().toISOString()
      };

      const res = await fetch(`${SUPABASE_URL}/call_logs`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to save call log');
      }
      const saved = Array.isArray(data) ? data[0] : payload;
      return {
        ...saved,
        id: saved.id,
        name: saved.customer_name || saved.phone,
        customerName: saved.customer_name || saved.phone,
        agentName: saved.agent_name,
        phone: saved.phone || saved.customer_phone,
        channel: saved.channel,
        type: saved.call_type,
        duration: saved.duration,
        durationSeconds: saved.duration_seconds,
        recording: saved.recording_url,
        recordingUrl: saved.recording_url,
        status: saved.disposition,
        disposition: saved.disposition,
        notes: saved.notes,
        timestamp: saved.timestamp,
        _createdAt: new Date(saved.created_at || saved.timestamp).getTime(),
        tenantId: saved.tenant_id
      };
    } catch (err) {
      console.error('[Supabase Sandbox] createCallLog error:', err);
      throw err;
    }
  },

  async deleteCallLog(id, tenantId = 1) {
    try {
      const res = await fetch(`${SUPABASE_URL}/call_logs?id=eq.${id}&tenant_id=eq.${Number(tenantId)}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      return res.ok;
    } catch (err) {
      console.error('[Supabase Sandbox] deleteCallLog error:', err);
      return false;
    }
  }
};

export default SupabaseSandboxService;
