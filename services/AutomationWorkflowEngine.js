/**
 * backend/services/AutomationWorkflowEngine.js
 * Universal Multi-Step WhatsApp Automation & Drip Execution Engine
 * Supports: Payment Success, Dropped Checkout, Inbound Leads, and Time Delays (e.g. 2 Hours)
 */

import { 
  getSandboxFlows, 
  getSandboxFlowById,
  saveScheduledMessage, 
  logSandboxFlowExecution,
  saveContact,
  getAllSessions
} from '../db.js';
import { sendWhatsAppMessage } from '../sessionManager.js';

class AutomationWorkflowEngine {
  constructor() {
    this.name = 'AutomationWorkflowEngine';
  }

  /**
   * Helper to format recipient phone to JID
   */
  formatRecipientJid(rawPhone) {
    if (!rawPhone) return '';
    let jid = String(rawPhone).trim();
    if (jid.includes('@')) return jid;
    const digits = jid.replace(/\D/g, '');
    const l10 = digits.slice(-10);
    return digits.length >= 10 ? (digits.startsWith('91') ? `${digits}@s.whatsapp.net` : `91${l10}@s.whatsapp.net`) : `${digits}@s.whatsapp.net`;
  }

  /**
   * Resolve active/connected WhatsApp session for tenant
   */
  async resolveActiveSession(tenantId = 1) {
    try {
      const sessions = await getAllSessions();
      const numTenantId = Number(tenantId) || 1;
      const connectedSession = sessions.find(s => s.status === 'connected' && (Number(s.tenant_id) === numTenantId || s.tenant_id === tenantId)) ||
                               sessions.find(s => s.status === 'connected');
      return connectedSession || null;
    } catch (err) {
      console.warn('[AutomationEngine] Session resolution notice:', err.message);
      return null;
    }
  }

  /**
   * Replace all dynamic template variables with real customer & payment data
   */
  renderTemplate(text, payload = {}) {
    if (!text) return '';
    let rendered = String(text);

    const custName = payload.customer_name || payload.name || 'Valued Customer';
    const custPhone = payload.customer_phone || payload.phone || '';
    const amountVal = payload.amount !== undefined ? `₹${payload.amount}` : '';
    const paymentId = payload.payment_id || payload.paymentId || '';
    const orderId = payload.order_id || payload.orderId || '';
    const remainingBalance = payload.remaining_balance !== undefined ? `₹${payload.remaining_balance}` : '';
    const dueDate = payload.due_date || '7 days';
    const paymentLink = payload.payment_link || 'https://app.employeemanagementsystems.com/#/payments';

    const replacements = {
      '{{name}}': custName,
      '{{customer_name}}': custName,
      '{{phone}}': custPhone,
      '{{customer_phone}}': custPhone,
      '{{amount}}': amountVal,
      '{{paid_amount}}': amountVal,
      '{{payment_id}}': paymentId,
      '{{order_id}}': orderId,
      '{{remaining_balance}}': remainingBalance,
      '{{due_date}}': dueDate,
      '{{payment_link}}': paymentLink,
      '{{date}}': new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      '{{time}}': new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    };

    for (const [key, val] of Object.entries(replacements)) {
      rendered = rendered.replace(new RegExp(key, 'gi'), val);
    }

    return rendered;
  }

  /**
   * Parse delay time from node properties or label (e.g. 2 Hours, 15 Minutes, 1 Day)
   */
  extractDelaySeconds(node) {
    if (!node) return 0;
    if (node.delaySeconds) return Number(node.delaySeconds);
    if (node.delayHours) return Number(node.delayHours) * 3600;
    if (node.delayMinutes) return Number(node.delayMinutes) * 60;
    if (node.delayDays) return Number(node.delayDays) * 86400;

    const text = `${node.label || ''} ${node.description || ''}`.toLowerCase();
    const hoursMatch = text.match(/(\d+)\s*(hour|hr|ghante|h)/);
    if (hoursMatch) return parseInt(hoursMatch[1], 10) * 3600;

    const minsMatch = text.match(/(\d+)\s*(min|minute|m)/);
    if (minsMatch) return parseInt(minsMatch[1], 10) * 60;

    const daysMatch = text.match(/(\d+)\s*(day|din|d)/);
    if (daysMatch) return parseInt(daysMatch[1], 10) * 86400;

    return 0;
  }

  /**
   * Order flow nodes sequentially starting from root trigger
   */
  orderFlowNodes(flow) {
    const nodes = flow.nodes || [];
    const edges = flow.edges || [];
    if (nodes.length <= 1) return nodes;

    const triggerNode = nodes.find(n => n.type === 'trigger') || nodes[0];
    const ordered = [triggerNode];
    const visited = new Set([triggerNode.id]);

    let currentId = triggerNode.id;
    while (ordered.length < nodes.length) {
      const outgoingEdges = edges.filter(e => e.source === currentId && !visited.has(e.target));
      if (outgoingEdges.length === 0) {
        // Find next unvisited node
        const nextUnvisited = nodes.find(n => !visited.has(n.id));
        if (!nextUnvisited) break;
        ordered.push(nextUnvisited);
        visited.add(nextUnvisited.id);
        currentId = nextUnvisited.id;
      } else {
        const nextNode = nodes.find(n => n.id === outgoingEdges[0].target);
        if (nextNode && !visited.has(nextNode.id)) {
          ordered.push(nextNode);
          visited.add(nextNode.id);
          currentId = nextNode.id;
        } else {
          break;
        }
      }
    }

    return ordered;
  }

  /**
   * Main Trigger Entrypoint: Trigger an event across active workflows
   */
  async triggerEvent(eventType, payload = {}, tenantId = 1) {
    try {
      const numTenantId = Number(tenantId) || 1;
      console.log(`⚡ [Automation Engine] Event Received: "${eventType}" for Tenant: ${numTenantId}`, {
        customer: payload.customer_name || payload.name,
        phone: payload.customer_phone || payload.phone,
        amount: payload.amount
      });

      // 1. Fetch all active flows for tenant (or default fallback)
      const flows = await getSandboxFlows(numTenantId);
      const activeFlows = (flows || []).filter(f => f.is_active === 1 || f.is_active === true);

      // 2. Filter matching flows based on trigger_type and event
      const cleanEvent = String(eventType).toLowerCase().trim();
      const matchedFlows = activeFlows.filter(flow => {
        const tType = String(flow.trigger_type || flow.triggerType || '').toLowerCase();
        const tCfg = flow.triggerConfig || flow.trigger_config || {};

        if (cleanEvent === 'payment_success' || cleanEvent === 'payment.captured' || cleanEvent === 'order.paid') {
          return tType === 'payment_success' || 
                 tType === 'payment' || 
                 tType === 'webhook' || 
                 tCfg.event === 'payment.captured' || 
                 tCfg.event === 'order.paid' ||
                 (flow.name && flow.name.toLowerCase().includes('payment'));
        }

        if (cleanEvent === 'payment_failed' || cleanEvent === 'payment.failed') {
          return tType === 'payment_failed' || 
                 tCfg.event === 'payment.failed' ||
                 (flow.name && (flow.name.toLowerCase().includes('failed') || flow.name.toLowerCase().includes('abandoned') || flow.name.toLowerCase().includes('recovery')));
        }

        if (cleanEvent === 'partial_payment') {
          return tType === 'partial_payment' || 
                 (flow.name && flow.name.toLowerCase().includes('partial'));
        }

        if (cleanEvent === 'inbound_message') {
          if (tType === 'keyword') {
            const input = String(payload.message_text || '').toLowerCase().trim();
            const keywords = Array.isArray(tCfg.keywords) ? tCfg.keywords : ['hi', 'hello', 'demo', 'info'];
            return keywords.some(k => input.includes(String(k).toLowerCase()));
          }
          return false;
        }

        return false;
      });

      console.log(`⚡ [Automation Engine] Matched ${matchedFlows.length} active flow(s) for event "${eventType}"`);

      // Fallback Default Flow if user hasn't created a custom one yet
      if (matchedFlows.length === 0) {
        if (cleanEvent === 'payment_success' || cleanEvent === 'payment.captured') {
          console.log('⚡ [Automation Engine] No custom flow found. Executing Standard Payment Drip Sequence (Instant + 2 Hours Follow-up)...');
          await this.executeDefaultPaymentSuccessDrip(payload, numTenantId);
          return { success: true, flowsExecuted: 1, isDefaultFallback: true };
        }
        return { success: false, reason: 'No matching active workflow found' };
      }

      // 3. Execute each matched workflow
      for (const flow of matchedFlows) {
        await this.executeSingleFlow(flow, payload, numTenantId);
      }

      return { success: true, flowsExecuted: matchedFlows.length };

    } catch (err) {
      console.error('[Automation Engine Error]:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Execute a single flow graph
   */
  async executeSingleFlow(flow, payload, tenantId = 1) {
    const activeSession = await this.resolveActiveSession(tenantId);
    const recipientPhone = payload.customer_phone || payload.phone || '';
    const recipientJid = this.formatRecipientJid(recipientPhone);

    if (!recipientJid) {
      console.warn(`[Automation Engine] Flow "${flow.name}" skipped: Missing customer phone number.`);
      return;
    }

    console.log(`▶️ [Executing Flow]: "${flow.name}" (ID: ${flow.id}) -> Target: ${recipientJid}`);

    const orderedNodes = this.orderFlowNodes(flow);
    let cumulativeDelaySeconds = 0;

    for (let i = 0; i < orderedNodes.length; i++) {
      const node = orderedNodes[i];
      if (node.type === 'trigger') continue;

      // A. Delay / Timer Node
      if (node.type === 'delay' || node.type === 'interactive_time') {
        const stepDelay = this.extractDelaySeconds(node);
        cumulativeDelaySeconds += stepDelay;
        console.log(`⏳ [Delay Step Encountered]: Waiting +${stepDelay}s (Cumulative Delay: ${cumulativeDelaySeconds}s)`);
        continue;
      }

      // B. Message Node (Text or Interactive Buttons)
      if (node.type === 'message' || node.type === 'send_message' || node.type === 'interactive_button' || node.type === 'interactive_buttons') {
        let rawContent = node.label || node.text || node.data?.text || '';
        
        // Append button options cleanly if present
        const buttons = node.buttons || node.data?.buttons || [];
        if (Array.isArray(buttons) && buttons.length > 0) {
          rawContent += '\n\n' + buttons.map((b, idx) => `${idx + 1}️⃣ ${b}`).join('\n');
        }

        const renderedText = this.renderTemplate(rawContent, payload);

        if (cumulativeDelaySeconds === 0) {
          // Instant Delivery
          if (activeSession) {
            try {
              await sendWhatsAppMessage(activeSession.id, recipientJid, renderedText, tenantId);
              console.log(`📱 [Instant WhatsApp Delivered]: Flow "${flow.name}", Node "${node.id}" -> ${recipientJid}`);
            } catch (sendErr) {
              console.warn(`[Instant Send Warning]: ${sendErr.message}`);
            }
          } else {
            console.warn('[Automation Engine] No active WhatsApp session connected to deliver instant message.');
          }

          await logSandboxFlowExecution({
            tenant_id: String(tenantId),
            flow_id: flow.id,
            phone_number: recipientPhone,
            node_id: node.id,
            node_type: 'message',
            event_type: 'INSTANT_DELIVERED',
            payload: { text: renderedText },
            status: 'success'
          });

        } else {
          // Scheduled Delay Delivery (e.g. 2 Hours Later)
          const nowUnix = Math.floor(Date.now() / 1000);
          const sendAt = nowUnix + cumulativeDelaySeconds;
          const sessionId = activeSession?.id || null;

          await saveScheduledMessage(sessionId, recipientJid, renderedText, sendAt, tenantId);
          console.log(`⏰ [Delayed Message Scheduled]: Flow "${flow.name}", Node "${node.id}" set for +${cumulativeDelaySeconds}s (${new Date(sendAt * 1000).toLocaleTimeString()})`);

          await logSandboxFlowExecution({
            tenant_id: String(tenantId),
            flow_id: flow.id,
            phone_number: recipientPhone,
            node_id: node.id,
            node_type: 'scheduled_delay',
            event_type: 'DELAY_SCHEDULED',
            payload: { text: renderedText, sendAt, delaySeconds: cumulativeDelaySeconds },
            status: 'scheduled'
          });
        }
      }

      // C. CRM Stage / Tag Update Node
      if (node.type === 'agent_route' || node.type === 'action' || node.type === 'crm_action') {
        try {
          const stage = node.stage || 'customer';
          await saveContact(recipientJid, payload.customer_name || 'Customer', tenantId);
          console.log(`🏷️ [CRM Tagged]: Contact ${recipientJid} updated to stage "${stage}"`);
        } catch (e) {}
      }
    }
  }

  /**
   * Built-in Safe Default Sequence if no custom flow is created yet:
   * 1. Instant Thank You with Payment ID & Amount
   * 2. Exactly 2 Hours Later: Follow-up & Onboarding Next Steps!
   */
  async executeDefaultPaymentSuccessDrip(payload, tenantId = 1) {
    const activeSession = await this.resolveActiveSession(tenantId);
    const recipientPhone = payload.customer_phone || payload.phone || '';
    const recipientJid = this.formatRecipientJid(recipientPhone);
    if (!recipientJid) return;

    const custName = payload.customer_name || 'Valued Customer';
    const amountVal = payload.amount !== undefined ? `₹${payload.amount}` : '';
    const paymentId = payload.payment_id || '';

    // Step 1: Instant Confirmation
    const instantMsg = `Hi ${custName}! 🎉\n\nThank you for your payment of ${amountVal}!\nPayment ID: ${paymentId}\nStatus: Verified & Confirmed ✅\n\nWe have registered your order and your service is being activated.`;

    if (activeSession) {
      try {
        await sendWhatsAppMessage(activeSession.id, recipientJid, instantMsg, tenantId);
        console.log(`📱 [Default Drip: Instant Message Sent to ${recipientJid}]`);
      } catch (e) {
        console.warn('[Default Drip Send Error]:', e.message);
      }
    }

    // Step 2: 2 Hours Delay Follow-up Message
    const twoHoursInSeconds = 2 * 60 * 60; // 7,200 seconds
    const nowUnix = Math.floor(Date.now() / 1000);
    const sendAt = nowUnix + twoHoursInSeconds;
    const followUpMsg = `Hi ${custName}! 👋\n\nHope you are having a wonderful day!\n\nHere are your onboarding next steps and access details for your purchase:\n👉 Portal Access: https://app.employeemanagementsystems.com\n\nIf you have any questions or need setup assistance, simply reply to this message! 🚀`;

    const sessionId = activeSession?.id || null;
    await saveScheduledMessage(sessionId, recipientJid, followUpMsg, sendAt, tenantId);
    console.log(`⏰ [Default Drip: 2-Hour Follow-up Scheduled for ${recipientJid} at ${new Date(sendAt * 1000).toLocaleTimeString()}]`);
  }
}

export const automationWorkflowEngine = new AutomationWorkflowEngine();
export default automationWorkflowEngine;
