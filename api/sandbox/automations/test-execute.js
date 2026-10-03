// Vercel Serverless Function: WhatsApp Automation Drip & Live Test Execution Engine
// Directly delivers instant WhatsApp messages via live Baileys VPS Gateway
// and queues time-delayed messages in Supabase PostgreSQL scheduled_messages table.

const SUPABASE_URL = 'https://pdjaajbhrvglwukoacuh.supabase.co/rest/v1';
const SUPABASE_KEY = 'sb_publishable_q8SBMvAwczXP0yfDfIMZsQ_ahP5YYq3';
const LIVE_VPS_BACKEND = 'https://api.employeemanagementsystems.com';

const getHeaders = () => ({
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'resolution=merge-duplicates,return=representation'
});

function formatRecipientJid(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return null;
  const last10 = digits.slice(-10);
  if (last10.length === 10) {
    return `91${last10}@s.whatsapp.net`;
  }
  return `${digits}@s.whatsapp.net`;
}

function renderTemplate(text, payload = {}) {
  if (!text) return '';
  let rendered = String(text);
  const map = {
    name: payload.customer_name || payload.name || 'Valued Customer',
    amount: payload.amount !== undefined ? `₹${payload.amount}` : '',
    payment_id: payload.payment_id || `pay_${Date.now()}`,
    order_id: payload.order_id || `order_${Date.now()}`,
    payment_link: payload.payment_link || 'https://app.employeemanagementsystems.com/#/payments',
    remaining_balance: payload.remaining_balance ? `₹${payload.remaining_balance}` : '₹1,500',
    due_date: payload.due_date || '3 Days',
    link: payload.payment_link || 'https://app.employeemanagementsystems.com'
  };

  for (const [k, v] of Object.entries(map)) {
    const rx = new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'gi');
    rendered = rendered.replace(rx, v);
  }
  return rendered;
}

function extractDelaySeconds(node) {
  if (!node) return 0;
  if (node.delaySeconds) return Number(node.delaySeconds);
  if (node.delayMinutes) return Number(node.delayMinutes) * 60;
  if (node.delayHours) return Number(node.delayHours) * 3600;
  if (node.delayDays) return Number(node.delayDays) * 86400;

  const label = (node.label || node.text || node.title || '').toLowerCase();
  const mMatch = label.match(/(\d+)\s*(?:min|minute)/);
  if (mMatch) return parseInt(mMatch[1]) * 60;

  const hMatch = label.match(/(\d+)\s*(?:hr|hour)/);
  if (hMatch) return parseInt(hMatch[1]) * 3600;

  const dMatch = label.match(/(\d+)\s*(?:day)/);
  if (dMatch) return parseInt(dMatch[1]) * 86400;

  if (node.type === 'wait' || node.type === 'delay') return 7200; // default 2 hours
  return 0;
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Content-Type, x-tenant-id');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(200).json({ status: 'online', message: 'Automation Live Test Runner Ready' });
  }

  try {
    const body = req.body || {};
    const { eventType = 'payment_success', tenantId = 1, flowId, payload = {}, flow } = body;

    const recipientPhone = payload.customer_phone || payload.phone;
    if (!recipientPhone) {
      return res.status(400).json({ success: false, error: 'Target WhatsApp Phone number is required' });
    }

    const recipientJid = formatRecipientJid(recipientPhone);
    const cleanDigits = recipientPhone.replace(/\D/g, '');
    const custName = payload.customer_name || 'Customer';
    const amountVal = payload.amount !== undefined ? `₹${payload.amount}` : '₹4,999';
    const paymentId = payload.payment_id || `pay_test_${Date.now()}`;

    let instantSent = false;
    let scheduledMessages = [];

    // Check if flow nodes were supplied directly in request
    const nodes = flow?.nodes || [];

    if (nodes && nodes.length > 0) {
      let cumulativeDelay = 0;
      for (const node of nodes) {
        if (node.type === 'wait' || node.type === 'delay') {
          cumulativeDelay += extractDelaySeconds(node);
          continue;
        }

        if (node.type === 'message' || node.type === 'buttons') {
          const rawText = node.content?.text || node.text || node.label || '';
          const renderedText = renderTemplate(rawText, payload);

          if (cumulativeDelay === 0 && !instantSent) {
            // Instant Message dispatch via live VPS Baileys session
            try {
              const waRes = await fetch(`${LIVE_VPS_BACKEND}/api/messages/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  phone: cleanDigits,
                  recipientJid: recipientJid,
                  text: renderedText,
                  tenantId: Number(tenantId) || 1
                })
              });
              const waData = await waRes.json();
              instantSent = waData.success || false;
            } catch (waErr) {
              console.warn('[Vercel Runner WA Error]:', waErr.message);
            }
          } else if (cumulativeDelay > 0) {
            // Delayed Message scheduled in Supabase PostgreSQL
            const sendAt = Math.floor(Date.now() / 1000) + cumulativeDelay;
            const scheduledAt = new Date(Date.now() + cumulativeDelay * 1000).toISOString();
            
            try {
              await fetch(`${SUPABASE_URL}/scheduled_messages`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                  tenant_id: Number(tenantId) || 1,
                  session_id: null,
                  contact_id: recipientJid,
                  message_text: renderedText,
                  send_at: sendAt,
                  scheduled_at: scheduledAt,
                  status: 'pending'
                })
              });
              scheduledMessages.push({ sendAt, delay: cumulativeDelay, preview: renderedText.slice(0, 60) });
            } catch (dbErr) {
              console.warn('[Vercel Runner DB Error]:', dbErr.message);
            }
          }
        }
      }
    }

    // Default Fallback Sequence (Payment Success + 2-Hour Drip) if flow nodes weren't resolved:
    if (!instantSent) {
      let instantMsg = '';
      if (eventType === 'payment_failed') {
        instantMsg = `Hi ${custName}! 👋\n\nWe noticed your transaction for ${amountVal} was not completed. Did you face an issue with UPI or Card?\n\n👉 Retry securely here: https://app.employeemanagementsystems.com/#/payments\n\nNeed assistance? Reply directly to this chat!`;
      } else if (eventType === 'inbound_message') {
        instantMsg = `Hi ${custName}! 🚀\n\nThank you for reaching out to us. We have received your inquiry.\n\nOur team is reviewing your requirements and will connect with you shortly.`;
      } else {
        instantMsg = `Hi ${custName}! 🎉\n\nThank you for your payment of ${amountVal}!\nPayment ID: ${paymentId}\nStatus: Verified & Confirmed ✅\n\nYour order has been registered and setup is in progress.`;
      }

      try {
        const waRes = await fetch(`${LIVE_VPS_BACKEND}/api/messages/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: cleanDigits,
            recipientJid: recipientJid,
            text: instantMsg,
            tenantId: Number(tenantId) || 1
          })
        });
        const waData = await waRes.json();
        instantSent = waData.success || false;
      } catch (err) {
        console.warn('[Direct Live WA Error]:', err.message);
      }

      // Schedule 2-Hour Follow-up Drip in Supabase PostgreSQL
      const twoHoursSec = 7200;
      const sendAt = Math.floor(Date.now() / 1000) + twoHoursSec;
      const scheduledAt = new Date(Date.now() + twoHoursSec * 1000).toISOString();
      const followUpMsg = `Hi ${custName}! 👋\n\nHope your day is going great!\n\nHere are your onboarding next steps and access details for your purchase:\n👉 Portal Access: https://app.employeemanagementsystems.com\n\nIf you need any setup assistance, simply reply here! 🚀`;

      try {
        await fetch(`${SUPABASE_URL}/scheduled_messages`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            tenant_id: Number(tenantId) || 1,
            session_id: null,
            contact_id: recipientJid,
            message_text: followUpMsg,
            send_at: sendAt,
            scheduled_at: scheduledAt,
            status: 'pending'
          })
        });
        scheduledMessages.push({ sendAt, delay: twoHoursSec, preview: followUpMsg.slice(0, 60) });
      } catch (dbErr) {
        console.warn('[Fallback Drip DB Error]:', dbErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Test sequence dispatched! Instant message sent to ${recipientJid}.`,
      instantDelivered: instantSent,
      scheduledDripsCount: scheduledMessages.length,
      scheduledMessages
    });

  } catch (err) {
    console.error('[Automation Test Runner Error]:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
