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

      // 2. Direct Supabase Contacts CRM Sync
      try {
        if (custPhone) {
          const cleanPhone = custPhone.replace(/\D/g, '').slice(-10);
          await fetch(`${SUPABASE_URL}/contacts`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({
              tenant_id: effectiveTenantId,
              name: custName,
              phone: cleanPhone,
              email: custEmail,
              stage: 'Customer',
              source: 'Razorpay Payment Page'
            })
          }).catch(() => null);
        }
      } catch (crmErr) {}

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
            error_code: paymentEntity.error_code || 'PAYMENT_FAILED',
            error_description: paymentEntity.error_description || 'Payment Failed'
          })
        });
      } catch (e) {}
    }

    return res.status(200).json({ success: true, message: 'Webhook captured successfully' });
  } catch (err) {
    console.error('[Payment Webhook Error]:', err);
    return res.status(200).json({ success: true, warning: err.message });
  }
}
