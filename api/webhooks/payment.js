// Vercel Serverless Function: High-Reliability Payment Webhook Handler
// Writes directly to Supabase PostgreSQL & triggers Baileys WhatsApp Engine

const SUPABASE_URL = 'https://pdjaajbhrvglwukoacuh.supabase.co/rest/v1';
const SUPABASE_KEY = 'sb_publishable_q8SBMvAwczXP0yfDfIMZsQ_ahP5YYq3';
const LIVE_VPS_BACKEND = 'https://api.employeemanagementsystems.com';

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
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(200).json({ status: 'ok', message: 'OmniFlow Payment Webhook Listener Active' });
  }

  try {
    const body = req.body || {};
    const urlTenant = req.query?.tenantId || req.query?.tenant_id || 1;
    const event = body.event || '';
    
    console.log('[OmniFlow Payment Webhook Received]:', event);

    const paymentEntity = body?.payload?.payment?.entity || body?.payload?.order?.entity || {};
    const paymentId = paymentEntity.id || `pay_${Date.now()}`;
    const orderId = paymentEntity.order_id || null;
    const notes = paymentEntity.notes || {};
    const effectiveTenantId = Number(notes.tenant_id) || Number(urlTenant) || 1;

    // Customer details
    const custName = paymentEntity.customer_name || paymentEntity.name || notes.customer_name || notes.name || 'Valued Customer';
    const custEmail = paymentEntity.email || notes.customer_email || notes.email || null;
    const custPhone = paymentEntity.contact || paymentEntity.phone || notes.customer_phone || notes.phone || null;
    const paidAmount = paymentEntity.amount ? Number(paymentEntity.amount) / 100 : 0;
    const currency = paymentEntity.currency || 'INR';

    // Parse form answers from notes or payload
    const formAnswers = { ...notes };
    delete formAnswers.tenant_id;
    delete formAnswers.transaction_id;

    if (event === 'payment.captured' || event === 'order.paid') {
      // 1. Direct Supabase Upsert for Real-Time Dashboard Updates
      try {
        await fetch(`${SUPABASE_URL}/payments_transactions`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            id: paymentId,
            tenant_id: effectiveTenantId,
            order_id: orderId,
            payment_id: paymentId,
            amount: paidAmount,
            currency: currency,
            status: 'paid',
            gateway_name: 'razorpay',
            customer_name: custName,
            customer_email: custEmail,
            customer_phone: custPhone,
            form_answers: formAnswers
          })
        });
      } catch (dbErr) {
        console.warn('[Supabase Sync Warning]:', dbErr.message);
      }

      // 2. Direct Supabase Contacts CRM Sync (Deduplicate, Tag PAID, Merge Questions)
      try {
        await syncPaymentToCrmContact({
          tenantId: effectiveTenantId,
          name: custName,
          phone: custPhone,
          email: custEmail,
          amount: paidAmount,
          status: 'paid',
          transactionId: paymentId,
          formAnswers: formAnswers
        });
      } catch (crmErr) {
        console.warn('[CRM Sync Error]:', crmErr.message);
      }

      // 3. Forward to Persistent VPS for Baileys WhatsApp Automated Dispatch
      try {
        fetch(`${LIVE_VPS_BACKEND}/api/webhooks/payment/${effectiveTenantId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }).catch(() => null);
      } catch (waErr) {}

    } else if (event === 'payment.failed') {
      try {
        await fetch(`${SUPABASE_URL}/payments_transactions`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            id: paymentId,
            tenant_id: effectiveTenantId,
            order_id: orderId,
            payment_id: paymentId,
            amount: paidAmount,
            currency: currency,
            status: 'failed',
            gateway_name: 'razorpay',
            customer_name: custName,
            customer_email: custEmail,
            customer_phone: custPhone,
            form_answers: formAnswers,
            error_code: paymentEntity.error_code || 'PAYMENT_FAILED',
            error_description: paymentEntity.error_description || 'Payment Failed'
          })
        });

        // Tag Contact as PAYMENT_FAILED in CRM for instant agent follow-up
        await syncPaymentToCrmContact({
          tenantId: effectiveTenantId,
          name: custName,
          phone: custPhone,
          email: custEmail,
          amount: paidAmount,
          status: 'failed',
          transactionId: paymentId,
          formAnswers: formAnswers
        });
      } catch (e) {}
    }

    return res.status(200).json({ success: true, message: 'Webhook captured successfully' });
  } catch (err) {
    console.error('[Payment Webhook Error]:', err);
    return res.status(200).json({ success: true, warning: err.message });
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

