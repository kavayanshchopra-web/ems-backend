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

      // Robust CRM Contact Sync (Deduplicate + Tag PAID/FAILED/PENDING + Merge Form Answers)
      try {
        await syncPaymentToCrmContact({
          tenantId,
          name: custName,
          phone: custPhone,
          email: custEmail,
          amount: record.amount,
          status: record.status,
          transactionId: record.payment_id,
          formAnswers: formAnswers
        });
      } catch (crmErr) {
        console.warn('[CRM Sync Error]:', crmErr.message);
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

async function syncPaymentToCrmContact({
  tenantId,
  name,
  phone,
  email,
  amount,
  status, // 'paid', 'failed', 'pending'
  transactionId,
  formAnswers
}) {
  if (!phone && !email) return;

  const rawPhone = String(phone || '').trim();
  const cleanDigits = rawPhone.replace(/\D/g, '');
  const normPhone10 = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : cleanDigits;

  let contactId = '';
  if (normPhone10 && normPhone10.length === 10) {
    contactId = `91${normPhone10}@s.whatsapp.net`;
  } else if (cleanDigits) {
    contactId = `${cleanDigits}@s.whatsapp.net`;
  } else if (email) {
    contactId = `lead_${email.toLowerCase().replace(/[^a-z0-9]/g, '_')}@temp.net`;
  } else {
    contactId = `lead_${Date.now()}@temp.net`;
  }

  const isPaid = status === 'paid';
  const isFailed = status === 'failed';
  const statusTag = isPaid ? 'PAID' : (isFailed ? 'PAYMENT_FAILED' : 'PAYMENT_PENDING');
  const stage = isPaid ? 'customer' : (isFailed ? 'follow_up' : 'lead');

  // Check if contact already exists in Supabase
  let existingContact = null;
  try {
    let checkUrl = `${SUPABASE_URL}/contacts?tenant_id=eq.${tenantId}`;
    if (normPhone10) {
      checkUrl += `&or=(id.eq.${encodeURIComponent(contactId)},phone_normalized.eq.${normPhone10},phone.ilike.*${normPhone10}*)`;
    } else if (email) {
      checkUrl += `&email=eq.${encodeURIComponent(email.toLowerCase().trim())}`;
    }

    const checkRes = await fetch(checkUrl, { headers: getHeaders() });
    if (checkRes.ok) {
      const data = await checkRes.json();
      if (Array.isArray(data) && data.length > 0) {
        existingContact = data[0];
      }
    }
  } catch (findErr) {
    console.warn('[CRM Find Contact Warning]:', findErr.message);
  }

  const cleanAnswers = (formAnswers && typeof formAnswers === 'object') ? { ...formAnswers } : {};
  delete cleanAnswers.tenant_id;
  delete cleanAnswers.transaction_id;

  if (existingContact) {
    // 1. UPDATE EXISTING CONTACT (NO DUPLICATE)
    let currentLabels = Array.isArray(existingContact.labels) ? [...existingContact.labels] : [];
    // Remove conflicting old payment status tags
    currentLabels = currentLabels.filter(l => !['PAID', 'PAYMENT_FAILED', 'PAYMENT_PENDING'].includes(l));
    if (!currentLabels.includes('Razorpay')) currentLabels.push('Razorpay');
    if (!currentLabels.includes(statusTag)) currentLabels.push(statusTag);

    const mergedCustomFields = {
      ...(existingContact.custom_fields || {}),
      ...cleanAnswers,
      last_payment_id: transactionId || existingContact.custom_fields?.last_payment_id,
      last_payment_status: status,
      last_payment_amount: amount || existingContact.custom_fields?.last_payment_amount,
      last_payment_date: new Date().toISOString()
    };

    const updatePayload = {
      labels: currentLabels,
      custom_fields: mergedCustomFields,
      deal_value: isPaid ? String(amount) : (existingContact.deal_value || String(amount || 0)),
      pipeline_stage: isPaid ? 'customer' : (existingContact.pipeline_stage || stage),
      updated_at: new Date().toISOString()
    };

    // If existing name is generic, update with customer name
    if (name && (!existingContact.name || existingContact.name === 'Valued Customer' || existingContact.name === 'Customer')) {
      updatePayload.name = name;
      updatePayload.custom_name = name;
    }
    if (email && !existingContact.email) {
      updatePayload.email = email;
    }

    await fetch(`${SUPABASE_URL}/contacts?id=eq.${encodeURIComponent(existingContact.id)}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(updatePayload)
    }).catch(err => console.warn('[CRM Update Contact Err]:', err.message));

  } else {
    // 2. CREATE NEW CONTACT
    const newPayload = {
      id: contactId,
      tenant_id: tenantId,
      name: name || (email ? email.split('@')[0] : 'Valued Customer'),
      custom_name: name || (email ? email.split('@')[0] : 'Valued Customer'),
      phone: normPhone10 || cleanDigits,
      phone_normalized: normPhone10,
      email: email || null,
      pipeline_stage: stage,
      labels: ['Razorpay', statusTag],
      deal_value: isPaid ? String(amount) : '0',
      notes: `Razorpay Payment ${statusTag}: ₹${amount || 0} (Txn: ${transactionId || ''})`,
      custom_fields: {
        source: 'Razorpay Payment Page',
        ...cleanAnswers,
        last_payment_id: transactionId,
        last_payment_status: status,
        last_payment_amount: amount,
        last_payment_date: new Date().toISOString()
      },
      is_archived: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await fetch(`${SUPABASE_URL}/contacts`, {
      method: 'POST',
      headers: {
        ...getHeaders(),
        'Prefer': 'resolution=merge-duplicates,return=representation'
      },
      body: JSON.stringify(newPayload)
    }).catch(err => console.warn('[CRM Create Contact Err]:', err.message));
  }
}

