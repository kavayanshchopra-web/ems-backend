// Vercel Serverless Function: Manage Sandbox Automation Flows
// Directly reads and writes to Supabase PostgreSQL table sandbox_automation_flows

const SUPABASE_URL = 'https://pdjaajbhrvglwukoacuh.supabase.co/rest/v1';
const SUPABASE_KEY = 'sb_publishable_q8SBMvAwczXP0yfDfIMZsQ_ahP5YYq3';

const getHeaders = () => ({
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'resolution=merge-duplicates,return=representation'
});

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Content-Type, x-tenant-id');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const tenantId = req.headers['x-tenant-id'] || req.query.tenantId || '1';

  try {
    if (req.method === 'GET') {
      const url = `${SUPABASE_URL}/sandbox_automation_flows?tenant_id=eq.${tenantId}&order=updated_at.desc`;
      const sRes = await fetch(url, { headers: getHeaders() });
      if (!sRes.ok) {
        return res.status(200).json({ success: true, flows: [], count: 0 });
      }
      const rawFlows = await sRes.json();
      const flows = (rawFlows || []).map(f => ({
        ...f,
        nodes: typeof f.nodes === 'string' ? JSON.parse(f.nodes) : f.nodes,
        edges: typeof f.edges === 'string' ? JSON.parse(f.edges) : f.edges,
        trigger: typeof f.trigger === 'string' ? JSON.parse(f.trigger) : f.trigger
      }));
      return res.status(200).json({ success: true, flows, count: flows.length });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const flowId = body.id || `flow_${Date.now()}`;
      const payload = {
        id: flowId,
        tenant_id: String(tenantId),
        name: body.name || 'Custom Automation Flow',
        description: body.description || '',
        category: body.category || 'marketing',
        trigger_type: body.trigger_type || body.trigger?.type || 'webhook',
        trigger: JSON.stringify(body.trigger || {}),
        nodes: JSON.stringify(body.nodes || []),
        edges: JSON.stringify(body.edges || []),
        is_active: body.is_active !== undefined ? (body.is_active ? 1 : 0) : 1,
        stats: JSON.stringify(body.stats || { executions: 0, completions: 0, dropoffs: 0 }),
        updated_at: new Date().toISOString()
      };

      const sRes = await fetch(`${SUPABASE_URL}/sandbox_automation_flows`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await sRes.json();
      return res.status(200).json({ success: true, flow: data[0] || payload });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[Vercel Flows Handler Error]:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
