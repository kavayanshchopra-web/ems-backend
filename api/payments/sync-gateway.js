// Vercel Serverless Function: On-Demand Razorpay Live Sync
// Fetches real payments & custom form questions directly from Razorpay API into Supabase

const SUPABASE_URL = 'https://pdjaajbhrvglwukoacuh.supabase.co/rest/v1';
const SUPABASE_KEY = 'sb_publishable_q8SBMvAwczXP0yfDfIMZsQ_ahP5YYq3';

const getHeaders = () => ({
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'resolution=merge-duplicates,return=representation'
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const tenantId = Number(req.query?.tenant_id || req.body?.tenant_id) || 1;

    // 1. Get Gateway Credentials from Supabase
    const cfgRes = await fetch(`${SUPABASE_URL}/tenant_gateway_configs?tenant_id=eq.${tenantId}`, {
      headers: getHeaders()
    });
    const configs = await cfgRes.json();
    const rzpConfig = Array.isArray(configs) ? configs.find(c => c.gateway_name === 'razorpay') : null;

    if (!rzpConfig || !rzpConfig.key_id || !rzpConfig.key_secret) {
      return res.status(400).json({
        success: false,
        error: 'Razorpay Key ID & Key Secret are not configured yet. Please save them in Gateway Settings.'
      });
    }

    // 2. Fetch Live Payments directly from Razorpay API
    const auth = Buffer.from(`${rzpConfig.key_id.trim()}:${rzpConfig.key_secret.trim()}`).toString('base64');
    const rzpRes = await fetch('https://api.razorpay.com/v1/payments?count=50', {
      headers: { Authorization: `Basic ${auth}` }
    });

    const rzpData = await rzpRes.json();
    if (!rzpRes.ok) {
      return res.status(rzpRes.status).json({
        success: false,
        error: rzpData.error?.description || 'Failed to authenticate with Razorpay API'
      });
    }

    let syncedCount = 0;
    for (const p of rzpData.items || []) {
      const isPaid = p.status === 'captured';
      const formAnswers = (p.notes && typeof p.notes === 'object') ? { ...p.notes } : {};
      delete formAnswers.tenant_id;
      delete formAnswers.transaction_id;

      const custName = p.notes?.name || (p.email ? p.email.split('@')[0] : 'Customer');
      const custEmail = p.email || p.notes?.email || null;
      const custPhone = p.contact || p.notes?.phone || null;

      const record = {
        id: p.id,
        tenant_id: tenantId,
        order_id: p.order_id || null,
        payment_id: p.id,
        amount: Number(p.amount) / 100,
        currency: p.currency || 'INR',
        status: isPaid ? 'paid' : (p.status === 'failed' ? 'failed' : p.status),
        gateway_name: 'razorpay',
        customer_name: custName,
        customer_email: custEmail,
        customer_phone: custPhone,
        form_answers: formAnswers,
        error_code: p.error_code || null,
        error_description: p.error_description || null,
        created_at: new Date(p.created_at * 1000).toISOString(),
        updated_at: new Date(p.created_at * 1000).toISOString()
      };

      await fetch(`${SUPABASE_URL}/payments_transactions`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(record)
      }).catch(() => null);

      // Also create contact in CRM if phone is present
      if (custPhone) {
        const cleanPhone = custPhone.replace(/\D/g, '').slice(-10);
        await fetch(`${SUPABASE_URL}/contacts`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            tenant_id: tenantId,
            name: custName,
            phone: cleanPhone,
            email: custEmail,
            stage: 'Customer',
            source: 'Razorpay Live Sync'
          })
        }).catch(() => null);
      }

      syncedCount++;
    }

    return res.status(200).json({
      success: true,
      count: syncedCount,
      message: `Successfully synced ${syncedCount} live payments from Razorpay!`
    });
  } catch (err) {
    console.error('[Sync Gateway Error]:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
