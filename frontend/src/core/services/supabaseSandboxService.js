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
  },

  // 5. EXPENSES & CLAIMS
  async fetchExpenses(tenantId = 1) {
    try {
      const res = await fetch(`${SUPABASE_URL}/expenses?tenant_id=eq.${Number(tenantId)}&order=created_at.desc`, {
        headers: getHeaders()
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return (Array.isArray(data) ? data : []).map(exp => ({
        ...exp,
        id: String(exp.id),
        title: exp.title || `${exp.category || 'Expense'} - ₹${exp.amount || 0}`,
        employee: exp.employee_name || 'Staff',
        employee_name: exp.employee_name || 'Staff',
        category: exp.category || 'Other',
        amount: Number(exp.amount) || 0,
        expenseDate: exp.date || (exp.created_at ? exp.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
        status: exp.status || 'Submitted',
        notes: exp.description || exp.notes || '',
        description: exp.description || '',
        receipt: exp.receipt_url || '',
        receipt_url: exp.receipt_url || '',
        createdAt: exp.created_at,
        updatedAt: exp.created_at,
        ...(exp.custom_fields || {})
      }));
    } catch (err) {
      console.error('[Supabase Sandbox] fetchExpenses error:', err);
      return [];
    }
  },

  async createExpense(expData, tenantId = 1) {
    try {
      const payload = {
        tenant_id: Number(tenantId) || 1,
        title: expData.title || expData.name || 'Expense Claim',
        category: expData.category || 'Other',
        amount: parseFloat(expData.amount) || 0,
        status: expData.status || 'Submitted',
        employee_name: expData.employee || expData.employee_name || 'Staff',
        description: expData.notes || expData.description || '',
        notes: expData.notes || expData.description || '',
        receipt_url: expData.receipt || expData.receipt_url || null,
        date: expData.expenseDate || expData.date || new Date().toISOString().split('T')[0],
        custom_fields: expData
      };

      const res = await fetch(`${SUPABASE_URL}/expenses`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create expense in Supabase');
      const saved = Array.isArray(data) ? data[0] : data;
      return {
        ...expData,
        ...saved,
        id: String(saved.id)
      };
    } catch (err) {
      console.error('[Supabase Sandbox] createExpense error:', err);
      throw err;
    }
  },

  async updateExpense(id, expData, tenantId = 1) {
    try {
      const payload = {
        title: expData.title,
        category: expData.category,
        amount: parseFloat(expData.amount) || 0,
        status: expData.status,
        employee_name: expData.employee || expData.employee_name,
        description: expData.notes || expData.description,
        notes: expData.notes || expData.description,
        receipt_url: expData.receipt || expData.receipt_url,
        date: expData.expenseDate || expData.date,
        custom_fields: expData
      };
      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

      const res = await fetch(`${SUPABASE_URL}/expenses?id=eq.${id}&tenant_id=eq.${Number(tenantId)}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update expense in Supabase');
      const saved = Array.isArray(data) ? data[0] : data;
      return { ...expData, ...saved, id: String(saved.id || id) };
    } catch (err) {
      console.error('[Supabase Sandbox] updateExpense error:', err);
      throw err;
    }
  },

  async deleteExpense(id, tenantId = 1) {
    try {
      const res = await fetch(`${SUPABASE_URL}/expenses?id=eq.${id}&tenant_id=eq.${Number(tenantId)}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      return res.ok;
    } catch (err) {
      console.error('[Supabase Sandbox] deleteExpense error:', err);
      return false;
    }
  },

  // 6. TASKS
  async fetchTasks(tenantId = 1) {
    try {
      const res = await fetch(`${SUPABASE_URL}/tasks?tenant_id=eq.${Number(tenantId)}&order=created_at.desc`, {
        headers: getHeaders()
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return (Array.isArray(data) ? data : []).map(t => ({
        ...t,
        id: String(t.id),
        title: t.title || 'Task',
        description: t.description || '',
        status: t.status || 'Pending',
        priority: t.priority || 'Medium',
        assignedTo: t.assigned_to_name || 'Staff',
        dueDate: t.due_date,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
        ...(t.custom_fields || {})
      }));
    } catch (err) {
      console.error('[Supabase Sandbox] fetchTasks error:', err);
      return [];
    }
  },

  async createTask(taskData, tenantId = 1) {
    try {
      const payload = {
        tenant_id: Number(tenantId) || 1,
        title: taskData.title || taskData.name || 'New Task',
        description: taskData.description || '',
        status: taskData.status || 'Pending',
        priority: taskData.priority || 'Medium',
        assigned_to_name: taskData.assignedTo || taskData.assigned_to_name || null,
        due_date: taskData.dueDate || taskData.due_date || null,
        custom_fields: taskData
      };
      const res = await fetch(`${SUPABASE_URL}/tasks`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create task in Supabase');
      const saved = Array.isArray(data) ? data[0] : data;
      return { ...taskData, ...saved, id: String(saved.id) };
    } catch (err) {
      console.error('[Supabase Sandbox] createTask error:', err);
      throw err;
    }
  },

  async updateTask(id, taskData, tenantId = 1) {
    try {
      const payload = {
        title: taskData.title,
        description: taskData.description,
        status: taskData.status,
        priority: taskData.priority,
        assigned_to_name: taskData.assignedTo || taskData.assigned_to_name,
        due_date: taskData.dueDate || taskData.due_date,
        updated_at: new Date().toISOString(),
        custom_fields: taskData
      };
      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
      const res = await fetch(`${SUPABASE_URL}/tasks?id=eq.${id}&tenant_id=eq.${Number(tenantId)}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update task in Supabase');
      const saved = Array.isArray(data) ? data[0] : data;
      return { ...taskData, ...saved, id: String(saved.id || id) };
    } catch (err) {
      console.error('[Supabase Sandbox] updateTask error:', err);
      throw err;
    }
  },

  async deleteTask(id, tenantId = 1) {
    try {
      const res = await fetch(`${SUPABASE_URL}/tasks?id=eq.${id}&tenant_id=eq.${Number(tenantId)}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      return res.ok;
    } catch (err) {
      console.error('[Supabase Sandbox] deleteTask error:', err);
      return false;
    }
  },

  // 7. LEAVES
  async fetchLeaves(tenantId = 1) {
    try {
      const res = await fetch(`${SUPABASE_URL}/leaves?tenant_id=eq.${Number(tenantId)}&order=created_at.desc`, {
        headers: getHeaders()
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return (Array.isArray(data) ? data : []).map(l => ({
        ...l,
        id: String(l.id),
        type: l.leave_type || 'Casual Leave',
        leave_type: l.leave_type || 'Casual Leave',
        startDate: l.start_date,
        start_date: l.start_date,
        endDate: l.end_date,
        end_date: l.end_date,
        status: l.status || 'Pending',
        reason: l.reason || '',
        employee_name: l.employee_name || 'Staff',
        createdAt: l.created_at,
        ...(l.custom_fields || {})
      }));
    } catch (err) {
      console.error('[Supabase Sandbox] fetchLeaves error:', err);
      return [];
    }
  },

  async createLeave(leaveData, tenantId = 1) {
    try {
      const payload = {
        tenant_id: Number(tenantId) || 1,
        leave_type: leaveData.type || leaveData.leave_type || 'Casual Leave',
        start_date: leaveData.startDate || leaveData.start_date || new Date().toISOString().split('T')[0],
        end_date: leaveData.endDate || leaveData.end_date || new Date().toISOString().split('T')[0],
        status: leaveData.status || 'Pending',
        reason: leaveData.reason || '',
        employee_name: leaveData.employee || leaveData.employee_name || 'Staff',
        custom_fields: leaveData
      };
      const res = await fetch(`${SUPABASE_URL}/leaves`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create leave in Supabase');
      const saved = Array.isArray(data) ? data[0] : data;
      return { ...leaveData, ...saved, id: String(saved.id) };
    } catch (err) {
      console.error('[Supabase Sandbox] createLeave error:', err);
      throw err;
    }
  },

  async updateLeave(id, leaveData, tenantId = 1) {
    try {
      const payload = {
        status: leaveData.status,
        reason: leaveData.reason,
        custom_fields: leaveData
      };
      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
      const res = await fetch(`${SUPABASE_URL}/leaves?id=eq.${id}&tenant_id=eq.${Number(tenantId)}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update leave in Supabase');
      const saved = Array.isArray(data) ? data[0] : data;
      return { ...leaveData, ...saved, id: String(saved.id || id) };
    } catch (err) {
      console.error('[Supabase Sandbox] updateLeave error:', err);
      throw err;
    }
  },

  async deleteLeave(id, tenantId = 1) {
    try {
      const res = await fetch(`${SUPABASE_URL}/leaves?id=eq.${id}&tenant_id=eq.${Number(tenantId)}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      return res.ok;
    } catch (err) {
      console.error('[Supabase Sandbox] deleteLeave error:', err);
      return false;
    }
  },

  // 8. HOLIDAYS
  async fetchHolidays(tenantId = 1) {
    try {
      const res = await fetch(`${SUPABASE_URL}/holidays?tenant_id=eq.${Number(tenantId)}&order=date.asc`, {
        headers: getHeaders()
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return (Array.isArray(data) ? data : []).map(h => ({
        ...h,
        id: String(h.id),
        name: h.name,
        date: h.date,
        type: h.type || 'Public',
        description: h.description || '',
        ...(h.custom_fields || {})
      }));
    } catch (err) {
      console.error('[Supabase Sandbox] fetchHolidays error:', err);
      return [];
    }
  },

  async createHoliday(holidayData, tenantId = 1) {
    try {
      const payload = {
        tenant_id: Number(tenantId) || 1,
        name: holidayData.name || holidayData.title || 'Holiday',
        date: holidayData.date || new Date().toISOString().split('T')[0],
        type: holidayData.type || 'Public',
        description: holidayData.description || '',
        custom_fields: holidayData
      };
      const res = await fetch(`${SUPABASE_URL}/holidays`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create holiday');
      const saved = Array.isArray(data) ? data[0] : data;
      return { ...holidayData, ...saved, id: String(saved.id) };
    } catch (err) {
      console.error('[Supabase Sandbox] createHoliday error:', err);
      throw err;
    }
  },

  async deleteHoliday(id, tenantId = 1) {
    try {
      const res = await fetch(`${SUPABASE_URL}/holidays?id=eq.${id}&tenant_id=eq.${Number(tenantId)}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      return res.ok;
    } catch (err) {
      console.error('[Supabase Sandbox] deleteHoliday error:', err);
      return false;
    }
  },

  // 9. NOTICES / NOTICE BOARD
  async fetchNotices(tenantId = 1) {
    try {
      const res = await fetch(`${SUPABASE_URL}/notices?tenant_id=eq.${Number(tenantId)}&order=created_at.desc`, {
        headers: getHeaders()
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return (Array.isArray(data) ? data : []).map(n => ({
        ...n,
        id: String(n.id),
        title: n.title,
        content: n.content,
        priority: n.priority || 'Normal',
        publishedBy: n.published_by || 'Admin',
        createdAt: n.created_at,
        ...(n.custom_fields || {})
      }));
    } catch (err) {
      console.error('[Supabase Sandbox] fetchNotices error:', err);
      return [];
    }
  },

  async createNotice(noticeData, tenantId = 1) {
    try {
      const payload = {
        tenant_id: Number(tenantId) || 1,
        title: noticeData.title || 'Notice',
        content: noticeData.content || '',
        priority: noticeData.priority || 'Normal',
        published_by: noticeData.publishedBy || noticeData.published_by || 'Admin',
        custom_fields: noticeData
      };
      const res = await fetch(`${SUPABASE_URL}/notices`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create notice');
      const saved = Array.isArray(data) ? data[0] : data;
      return { ...noticeData, ...saved, id: String(saved.id) };
    } catch (err) {
      console.error('[Supabase Sandbox] createNotice error:', err);
      throw err;
    }
  },

  async deleteNotice(id, tenantId = 1) {
    try {
      const res = await fetch(`${SUPABASE_URL}/notices?id=eq.${id}&tenant_id=eq.${Number(tenantId)}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      return res.ok;
    } catch (err) {
      console.error('[Supabase Sandbox] deleteNotice error:', err);
      return false;
    }
  },

  // 10. ATTENDANCE LOGS
  async fetchAttendance(tenantId = 1) {
    try {
      const res = await fetch(`${SUPABASE_URL}/attendance_logs?tenant_id=eq.${Number(tenantId)}&order=created_at.desc&limit=200`, {
        headers: getHeaders()
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return (Array.isArray(data) ? data : []).map(a => ({
        ...a,
        id: String(a.id),
        date: a.date,
        status: a.status || 'PRESENT',
        checkIn: a.check_in_time,
        checkOut: a.check_out_time,
        workMode: a.work_mode || 'OFFICE',
        employee_name: a.employee_name || 'Staff',
        notes: a.notes || '',
        ...(a.custom_fields || {})
      }));
    } catch (err) {
      console.error('[Supabase Sandbox] fetchAttendance error:', err);
      return [];
    }
  },

  async createAttendance(attData, tenantId = 1) {
    try {
      const payload = {
        tenant_id: Number(tenantId) || 1,
        date: attData.date || new Date().toISOString().split('T')[0],
        status: attData.status || 'PRESENT',
        check_in_time: attData.check_in_time || attData.checkIn || new Date().toISOString(),
        check_out_time: attData.check_out_time || attData.checkOut || null,
        work_mode: attData.work_mode || attData.workMode || 'OFFICE',
        employee_name: attData.employee_name || attData.name || 'Staff',
        notes: attData.notes || '',
        custom_fields: attData
      };
      const res = await fetch(`${SUPABASE_URL}/attendance_logs`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create attendance log');
      const saved = Array.isArray(data) ? data[0] : data;
      return { ...attData, ...saved, id: String(saved.id) };
    } catch (err) {
      console.error('[Supabase Sandbox] createAttendance error:', err);
      throw err;
    }
  },

  // 11. SYSTEM DROPDOWNS
  async fetchSystemDropdowns(tenantId = 1) {
    try {
      const res = await fetch(`${SUPABASE_URL}/system_dropdowns?tenant_id=eq.${Number(tenantId)}&order=sort_order.asc`, {
        headers: getHeaders()
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('[Supabase Sandbox] fetchSystemDropdowns error:', err);
      return [];
    }
  },

  async saveSystemDropdown(dropdownData, tenantId = 1) {
    try {
      const payload = {
        tenant_id: Number(tenantId) || 1,
        category: dropdownData.category || 'general',
        value: dropdownData.value || dropdownData.label,
        label: dropdownData.label || dropdownData.value,
        is_active: dropdownData.is_active !== false,
        sort_order: dropdownData.sort_order || 0
      };
      const res = await fetch(`${SUPABASE_URL}/system_dropdowns`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      return Array.isArray(data) ? data[0] : data;
    } catch (err) {
      console.error('[Supabase Sandbox] saveSystemDropdown error:', err);
      throw err;
    }
  },

  MODULE_TABLE_MAP: {
    'expenses': 'expenses',
    'expense_claims': 'expenses',
    'tasks': 'tasks',
    'tasks_board': 'tasks',
    'leaves': 'leaves',
    'holidays': 'holidays',
    'notices': 'notices',
    'notice_board': 'notices',
    'attendance': 'attendance_logs',
    'attendance_logs': 'attendance_logs',
    'employees': 'employees',
    'contacts': 'contacts',
    'crm_deals': 'contacts',
    'recruitment_ats': 'recruitment_ats',
    'asset_management': 'asset_management',
    'assets': 'asset_management',
    'verify_documents': 'verify_documents',
    'offboarding': 'offboarding',
    'payroll': 'payroll',
    'taxes_compliance': 'taxes_compliance',
    'ff_settlements': 'ff_settlements',
    'advances_loans': 'advances_loans',
    'shifts': 'shifts',
    'rewards': 'rewards',
    'feedback': 'feedback',
    'system_feedbacks': 'feedback',
    'roles_permissions': 'roles_permissions',
    'permission_matrix': 'roles_permissions',
    'billing': 'invoices',
    'invoices': 'invoices',
    'billing_invoices': 'invoices',
    'custom_pages': 'custom_pages',
    'module_configs': 'module_configs',
    'recycle_bin': 'recycle_bin'
  },

  // =========================================================================
  // 12. UNIVERSAL BRIDGE (All Current & Future Modules Auto-Persistence)
  // =========================================================================
  async saveUniversalRecord(moduleId, recordData, tenantId = 1, recordId = null) {
    const numTenant = Number(tenantId) || 1;
    const cleanMod = String(moduleId || '').toLowerCase().trim();
    const docId = String(recordId || recordData?.id || `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);

    try {
      // Route 1: Specific specialized modules with custom logic
      if (cleanMod === 'expenses' || cleanMod === 'expense_claims') {
        if (recordId) {
          return await this.updateExpense(recordId, recordData, numTenant);
        } else {
          return await this.createExpense(recordData, numTenant);
        }
      } else if (cleanMod === 'tasks' || cleanMod === 'tasks_board') {
        if (recordId) {
          return await this.updateTask(recordId, recordData, numTenant);
        } else {
          return await this.createTask(recordData, numTenant);
        }
      } else if (cleanMod === 'leaves') {
        if (recordId) {
          return await this.updateLeave(recordId, recordData, numTenant);
        } else {
          return await this.createLeave(recordData, numTenant);
        }
      } else if (cleanMod === 'holidays') {
        return await this.createHoliday(recordData, numTenant);
      } else if (cleanMod === 'notices' || cleanMod === 'notice_board') {
        return await this.createNotice(recordData, numTenant);
      } else if (cleanMod === 'attendance' || cleanMod === 'attendance_logs') {
        return await this.createAttendance(recordData, numTenant);
      } else if (cleanMod === 'employees') {
        if (recordId) {
          return await this.updateEmployee(recordId, recordData, numTenant);
        } else {
          return await this.createEmployee(recordData, numTenant);
        }
      } else if (cleanMod === 'contacts' || cleanMod === 'crm_deals') {
        if (recordId) {
          return await this.updateContact(recordId, recordData, numTenant);
        } else {
          return await this.createContact(recordData, numTenant);
        }
      }

      // Route 2: Dedicated SQL Table from MODULE_TABLE_MAP
      const dedicatedTable = this.MODULE_TABLE_MAP[cleanMod];
      if (dedicatedTable) {
        const payload = {
          id: docId,
          tenant_id: numTenant,
          name: recordData.name || recordData.title || recordData.candidate_name || recordData.asset_name || null,
          custom_fields: recordData,
          ...recordData,
          updated_at: new Date().toISOString()
        };

        const res = await fetch(`${SUPABASE_URL}/${dedicatedTable}`, {
          method: 'POST',
          headers: {
            ...getHeaders(),
            'Prefer': 'resolution=merge-duplicates,return=representation'
          },
          body: JSON.stringify(payload)
        });
        const resData = await res.json();
        const saved = Array.isArray(resData) ? resData[0] : resData;
        return {
          ...recordData,
          ...(saved || {}),
          id: docId
        };
      }

      // Route 3: Universal app_records Fallback for Any Unmapped/New Module
      const appRecordPayload = {
        id: docId,
        tenant_id: numTenant,
        module_id: cleanMod,
        data: recordData,
        updated_at: new Date().toISOString()
      };

      const res = await fetch(`${SUPABASE_URL}/app_records`, {
        method: 'POST',
        headers: {
          ...getHeaders(),
          'Prefer': 'resolution=merge-duplicates,return=representation'
        },
        body: JSON.stringify(appRecordPayload)
      });
      const resData = await res.json();
      return Array.isArray(resData) ? (resData[0]?.data || recordData) : (resData?.data || recordData);
    } catch (err) {
      console.warn(`[Supabase Sandbox Universal] saveUniversalRecord notice (${moduleId}):`, err);
      return recordData;
    }
  },

  async fetchUniversalRecords(moduleId, tenantId = 1) {
    const numTenant = Number(tenantId) || 1;
    const cleanMod = String(moduleId || '').toLowerCase().trim();

    try {
      // Route 1: Specific specialized modules with custom logic
      if (cleanMod === 'expenses' || cleanMod === 'expense_claims') {
        return await this.fetchExpenses(numTenant);
      } else if (cleanMod === 'tasks' || cleanMod === 'tasks_board') {
        return await this.fetchTasks(numTenant);
      } else if (cleanMod === 'leaves') {
        return await this.fetchLeaves(numTenant);
      } else if (cleanMod === 'holidays') {
        return await this.fetchHolidays(numTenant);
      } else if (cleanMod === 'notices' || cleanMod === 'notice_board') {
        return await this.fetchNotices(numTenant);
      } else if (cleanMod === 'attendance' || cleanMod === 'attendance_logs') {
        return await this.fetchAttendance(numTenant);
      } else if (cleanMod === 'employees') {
        return await this.fetchEmployees(numTenant);
      } else if (cleanMod === 'contacts' || cleanMod === 'crm_deals') {
        return await this.fetchContacts(numTenant);
      }

      // Route 2: Dedicated SQL Table from MODULE_TABLE_MAP
      const dedicatedTable = this.MODULE_TABLE_MAP[cleanMod];
      if (dedicatedTable) {
        const res = await fetch(`${SUPABASE_URL}/${dedicatedTable}?tenant_id=eq.${numTenant}&order=updated_at.desc`, {
          headers: getHeaders()
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            return data.map(item => ({
              ...(item.custom_fields || {}),
              ...item,
              id: item.id
            }));
          }
        }
      }

      // Route 3: Universal app_records for Any Future Page
      const res = await fetch(`${SUPABASE_URL}/app_records?tenant_id=eq.${numTenant}&module_id=eq.${cleanMod}&order=updated_at.desc`, {
        headers: getHeaders()
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (!Array.isArray(data)) return null;
      return data.map(r => ({
        ...(r.data || {}),
        id: r.id,
        createdAt: r.created_at,
        updatedAt: r.updated_at
      }));
    } catch (err) {
      console.warn(`[Supabase Sandbox Universal] fetchUniversalRecords notice (${moduleId}):`, err);
      return null;
    }
  },

  async deleteUniversalRecord(moduleId, recordId, tenantId = 1) {
    const numTenant = Number(tenantId) || 1;
    const cleanMod = String(moduleId || '').toLowerCase().trim();
    const docId = String(recordId);

    try {
      if (cleanMod === 'expenses' || cleanMod === 'expense_claims') {
        await this.deleteExpense(docId, numTenant);
      } else if (cleanMod === 'tasks' || cleanMod === 'tasks_board') {
        await this.deleteTask(docId, numTenant);
      } else if (cleanMod === 'leaves') {
        await this.deleteLeave(docId, numTenant);
      } else if (cleanMod === 'holidays') {
        await this.deleteHoliday(docId, numTenant);
      } else if (cleanMod === 'notices' || cleanMod === 'notice_board') {
        await this.deleteNotice(docId, numTenant);
      } else if (cleanMod === 'employees') {
        await this.deleteEmployee(docId, numTenant);
      } else if (cleanMod === 'contacts' || cleanMod === 'crm_deals') {
        await this.deleteContact(docId, numTenant);
      }

      // Delete from dedicated table if exists
      const dedicatedTable = this.MODULE_TABLE_MAP[cleanMod];
      if (dedicatedTable) {
        await fetch(`${SUPABASE_URL}/${dedicatedTable}?tenant_id=eq.${numTenant}&id=eq.${docId}`, {
          method: 'DELETE',
          headers: getHeaders()
        }).catch(() => {});
      }

      // Also ensure deletion from app_records if present
      await fetch(`${SUPABASE_URL}/app_records?tenant_id=eq.${numTenant}&module_id=eq.${cleanMod}&id=eq.${docId}`, {
        method: 'DELETE',
        headers: getHeaders()
      }).catch(() => {});

      return true;
    } catch (err) {
      console.warn(`[Supabase Sandbox Universal] deleteUniversalRecord notice (${moduleId}):`, err);
      return false;
    }
  }
};

export default SupabaseSandboxService;
