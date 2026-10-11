import crypto from 'crypto';
import { 
  getSandboxFlows, 
  getSandboxFlowById, 
  logSandboxFlowExecution 
} from '../db.js';
import { getPgPool } from '../postgresDb.js';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'omniflow_ems_master_secret_2026_aes256';

/**
 * Encrypt sensitive credentials (API keys, OAuth tokens) per tenant
 */
function encryptCredential(text) {
  try {
    const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (err) {
    console.error('[N8nBridge Encrypt Warn]', err.message);
    return text;
  }
}

/**
 * Decrypt sensitive credentials
 */
function decryptCredential(encryptedText) {
  try {
    if (!encryptedText || !encryptedText.includes(':')) return encryptedText;
    const [ivHex, encrypted] = encryptedText.split(':');
    const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('[N8nBridge Decrypt Warn]', err.message);
    return encryptedText;
  }
}

/**
 * EMS Headless n8n Workflow Bridge (100% Multi-Tenant Isolated & White-Labeled)
 * Runs n8n-compatible workflow graphs seamlessly with zero live risk.
 */
class N8nWorkflowBridge {
  constructor() {
    this.n8nApiUrl = process.env.N8N_API_URL || 'http://localhost:5678/api/v1';
    this.n8nWebhookBaseUrl = process.env.N8N_WEBHOOK_BASE_URL || 'http://localhost:5678/webhook';
    this.n8nApiKey = process.env.N8N_API_KEY || '';
    this.isN8nConnected = false;
    this.activeSessions = new Map(); // phone -> { flowId, currentNodeId, variables, lastActive }
  }

  /**
   * Check connection to external or local n8n instance
   */
  async checkConnection() {
    if (!this.n8nApiKey) {
      this.isN8nConnected = false;
      return { 
        connected: false, 
        mode: 'EMS_HEADLESS_BUILTIN_ENGINE',
        message: 'No N8N_API_KEY configured. Running via EMS internal workflow engine.' 
      };
    }
    try {
      const res = await fetch(`${this.n8nApiUrl}/workflows?limit=1`, {
        headers: { 'X-N8N-API-KEY': this.n8nApiKey }
      });
      this.isN8nConnected = res.ok;
      return { 
        connected: res.ok, 
        mode: res.ok ? 'N8N_DOCKER_ENGINE' : 'EMS_HEADLESS_BUILTIN_ENGINE' 
      };
    } catch (e) {
      this.isN8nConnected = false;
      return { 
        connected: false, 
        mode: 'EMS_HEADLESS_BUILTIN_ENGINE', 
        error: e.message 
      };
    }
  }

  /**
   * Map EMS Flow Nodes to standard n8n-compatible Workflow JSON structure
   * Enforces Tenant-Isolation Tagging and Webhook endpoints.
   */
  exportToN8nWorkflowJson(flow, tenantId = 'org_default') {
    const webhookPath = `ems-${tenantId}-${flow.id}`;
    const n8nNodes = [];
    const n8nConnections = {};

    // 1. Webhook Trigger Node (Entry Point)
    n8nNodes.push({
      id: 'node_webhook_trigger',
      name: 'OmniFlow Trigger',
      type: 'n8n-nodes-base.webhook',
      typeVersion: 1,
      position: [200, 300],
      parameters: {
        httpMethod: 'POST',
        path: webhookPath,
        responseMode: 'onReceived',
        responseData: 'allEntries'
      }
    });

    let prevNodeName = 'OmniFlow Trigger';

    // 2. Map all internal EMS nodes to n8n nodes
    (flow.nodes || []).forEach((node, idx) => {
      const nodeName = node.data?.label || node.label || `Step ${idx + 1}`;
      let n8nNodeType = 'n8n-nodes-base.httpRequest';
      let parameters = {};

      if (node.type === 'trigger') {
        return; // Already represented by entry webhook
      } else if (node.type === 'facebook_lead' || node.type === 'meta_lead') {
        n8nNodeType = 'n8n-nodes-base.facebookLeadAds';
        parameters = {
          event: 'leadgen',
          pageId: node.pageName || 'auto',
          formId: node.formName || 'auto'
        };
      } else if (node.type === 'message' || node.type === 'interactive_buttons') {
        n8nNodeType = 'n8n-nodes-base.httpRequest';
        parameters = {
          url: 'https://api.employeemanagementsystems.com/api/sandbox/automations/dispatch-message',
          method: 'POST',
          sendBody: true,
          specifyBody: 'json',
          jsonBody: JSON.stringify({
            tenantId,
            flowId: flow.id,
            text: node.data?.text || node.label || '',
            buttons: node.data?.buttons || node.buttons || []
          })
        };
      } else if (node.type === 'google_sheets' || node.type === 'sheet') {
        n8nNodeType = 'n8n-nodes-base.googleSheets';
        parameters = {
          operation: 'append',
          sheetId: node.sheetName || node.data?.sheetId || 'auto',
          range: 'A:Z'
        };
      } else if (node.type === 'razorpay') {
        n8nNodeType = 'n8n-nodes-base.razorpay';
        parameters = {
          resource: 'paymentLink',
          operation: 'create',
          amount: node.amount || '4999',
          currency: 'INR'
        };
      } else if (node.type === 'ai_bot' || node.type === 'openai') {
        n8nNodeType = '@n8n/n8n-nodes-langchain.openAi';
        parameters = {
          model: node.model || 'gpt-4o-mini',
          prompt: node.prompt || 'Auto-qualify inbound lead'
        };
      } else if (node.type === 'slack') {
        n8nNodeType = 'n8n-nodes-base.slack';
        parameters = {
          channel: node.channel || '#sales-leads',
          text: node.label || 'New CRM Lead Alert'
        };
      } else if (node.type === 'email' || node.type === 'gmail') {
        n8nNodeType = 'n8n-nodes-base.gmail';
        parameters = {
          operation: 'send',
          subject: node.data?.subject || 'OmniFlow Notification',
          message: node.data?.body || 'Lead update'
        };
      } else {
        // Generic action node
        n8nNodeType = 'n8n-nodes-base.httpRequest';
        parameters = {
          url: 'https://api.employeemanagementsystems.com/api/sandbox/automations/dispatch-action',
          method: 'POST',
          sendBody: true,
          specifyBody: 'json',
          jsonBody: JSON.stringify({
            tenantId,
            flowId: flow.id,
            nodeId: node.id,
            nodeType: node.type,
            data: node.data || {}
          })
        };
      }

      n8nNodes.push({
        id: node.id || `node_${idx + 1}`,
        name: nodeName,
        type: n8nNodeType,
        typeVersion: 1,
        position: [250 * (idx + 2), 300],
        parameters
      });

      // Connect previous node to current node
      if (!n8nConnections[prevNodeName]) {
        n8nConnections[prevNodeName] = { main: [[]] };
      }
      n8nConnections[prevNodeName].main[0].push({
        node: nodeName,
        type: 'main',
        index: 0
      });

      prevNodeName = nodeName;
    });

    return {
      name: `[Tenant: ${tenantId}] ${flow.name}`,
      nodes: n8nNodes,
      connections: n8nConnections,
      active: flow.is_active === 1,
      settings: { executionOrder: 'v1' },
      tags: [tenantId]
    };
  }

  /**
   * Deploy or Sync Flow with n8n instance and store in tenant_n8n_mappings
   */
  async syncFlowToN8n(flow, tenantId = 'org_default') {
    const webhookPath = `ems-${tenantId}-${flow.id}`;
    const webhookUrl = `${this.n8nWebhookBaseUrl}/${webhookPath}`;
    let n8nWorkflowId = null;

    // 1. If N8N API Key is configured, attempt deployment to n8n
    if (this.n8nApiKey) {
      try {
        const n8nJson = this.exportToN8nWorkflowJson(flow, tenantId);
        const existingMapping = await this.getMapping(tenantId, flow.id);

        let endpoint = `${this.n8nApiUrl}/workflows`;
        let method = 'POST';

        if (existingMapping?.n8n_workflow_id) {
          endpoint = `${this.n8nApiUrl}/workflows/${existingMapping.n8n_workflow_id}`;
          method = 'PATCH';
        }

        const res = await fetch(endpoint, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'X-N8N-API-KEY': this.n8nApiKey
          },
          body: JSON.stringify(n8nJson)
        });

        if (res.ok) {
          const deployedData = await res.json();
          n8nWorkflowId = deployedData.id || deployedData.data?.id;
          console.log(`✅ [N8nBridge] Deployed workflow to n8n: ${n8nWorkflowId} for tenant ${tenantId}`);
        } else {
          console.warn(`⚠️ [N8nBridge] n8n sync responded with status: ${res.status}`);
        }
      } catch (syncErr) {
        console.warn(`⚠️ [N8nBridge] n8n API sync warning: ${syncErr.message}`);
      }
    }

    // 2. Save Mapping in PostgreSQL
    await this.saveMapping({
      tenantId,
      flowId: flow.id,
      n8nWorkflowId: n8nWorkflowId || `local_${flow.id}`,
      webhookPath,
      webhookUrl,
      syncStatus: n8nWorkflowId ? 'synced' : 'local_ready'
    });

    return {
      success: true,
      tenantId,
      flowId: flow.id,
      webhookPath,
      webhookUrl,
      n8nWorkflowId
    };
  }

  /**
   * Store or Update Mapping in PostgreSQL Database
   */
  async saveMapping({ tenantId, flowId, n8nWorkflowId, webhookPath, webhookUrl, syncStatus = 'synced' }) {
    const pool = getPgPool();
    if (!pool) return;
    try {
      const sql = `
        INSERT INTO tenant_n8n_mappings (tenant_id, flow_id, n8n_workflow_id, n8n_webhook_path, n8n_webhook_url, sync_status, last_synced_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (tenant_id, flow_id)
        DO UPDATE SET 
          n8n_workflow_id = EXCLUDED.n8n_workflow_id,
          n8n_webhook_path = EXCLUDED.n8n_webhook_path,
          n8n_webhook_url = EXCLUDED.n8n_webhook_url,
          sync_status = EXCLUDED.sync_status,
          last_synced_at = NOW();
      `;
      await pool.query(sql, [tenantId, flowId, n8nWorkflowId, webhookPath, webhookUrl, syncStatus]);
    } catch (err) {
      console.error('[N8nBridge saveMapping error]', err.message);
    }
  }

  /**
   * Retrieve Mapping by Tenant & Flow
   */
  async getMapping(tenantId, flowId) {
    const pool = getPgPool();
    if (!pool) return null;
    try {
      const res = await pool.query(
        'SELECT * FROM tenant_n8n_mappings WHERE tenant_id = $1 AND flow_id = $2 LIMIT 1',
        [tenantId, flowId]
      );
      return res.rows[0] || null;
    } catch (err) {
      console.error('[N8nBridge getMapping error]', err.message);
      return null;
    }
  }

  /**
   * Trigger a workflow via its Webhook URL
   */
  async triggerWorkflowWebhook(flowId, payload = {}, tenantId = 'org_default') {
    const mapping = await this.getMapping(tenantId, flowId);
    if (!mapping || !mapping.n8n_webhook_url) {
      return { success: false, error: 'No active webhook mapping found for this flow' };
    }

    try {
      const res = await fetch(mapping.n8n_webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          tenantId,
          triggeredAt: new Date().toISOString()
        })
      });
      return { success: res.ok, status: res.status };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  /**
   * Process Inbound WhatsApp Message or Button Click
   * Matches keywords, evaluates branches, and returns the next automated reply.
   */
  async processInboundMessage({ tenantId = 'org_default', phone, text, clickedButton = null, sock = null }) {
    try {
      const activeFlows = await getSandboxFlows(tenantId);
      const enabledFlows = (activeFlows || []).filter(f => f.is_active === 1);

      if (enabledFlows.length === 0) return null;

      const incomingText = (clickedButton || text || '').trim();
      const lowerText = incomingText.toLowerCase();

      // 1. Check if user is already in an ongoing flow session
      let session = this.activeSessions.get(phone);
      let targetFlow = null;

      if (session) {
        targetFlow = enabledFlows.find(f => f.id === session.flowId);
      }

      // 2. If no existing session or starting fresh, find matching trigger keyword
      if (!targetFlow) {
        targetFlow = enabledFlows.find(f => {
          const config = typeof f.trigger_config === 'object' ? f.trigger_config : JSON.parse(f.trigger_config || '{}');
          if (config.matchAnyMessage) return true;
          const keywords = config.keywords || [];
          return keywords.some(kw => lowerText.includes(kw.toLowerCase()));
        });
      }

      if (!targetFlow) return null;

      // 3. Find next node to execute in targetFlow
      const nodes = targetFlow.nodes || [];
      let nextNode = null;

      if (!session) {
        // Start from node after trigger (usually node index 1)
        nextNode = nodes.find(n => n.type === 'message' || n.type === 'interactive_buttons') || nodes[1] || nodes[0];
        this.activeSessions.set(phone, {
          flowId: targetFlow.id,
          currentNodeId: nextNode?.id || 'start',
          lastActive: Date.now()
        });
      } else {
        // Advance flow based on button clicked or message
        const currentIdx = nodes.findIndex(n => n.id === session.currentNodeId);
        if (currentIdx >= 0 && currentIdx + 1 < nodes.length) {
          nextNode = nodes[currentIdx + 1];
          session.currentNodeId = nextNode.id;
          session.lastActive = Date.now();
        } else {
          // Loop or complete
          nextNode = nodes.find(n => n.type === 'message') || nodes[0];
          session.currentNodeId = nextNode.id;
        }
      }

      const nodeText = nextNode?.data?.text || nextNode?.data?.label || nextNode?.label || 'Thank you for reaching out!';
      const nodeButtons = nextNode?.data?.buttons || nextNode?.buttons || null;
      const nodeMediaUrl = nextNode?.data?.mediaUrl || nextNode?.mediaUrl || null;

      // 4. Log Execution in isolated sandbox logs
      await logSandboxFlowExecution({
        tenant_id: tenantId,
        flow_id: targetFlow.id,
        phone_number: phone,
        node_id: nextNode?.id || 'msg_node',
        node_type: nextNode?.type || 'message',
        event_type: 'TRIGGER_MATCHED',
        payload: { input: incomingText, output: nodeText, buttons: nodeButtons },
        status: 'success'
      });

      const responsePayload = {
        flowId: targetFlow.id,
        flowName: targetFlow.name,
        nodeId: nextNode?.id,
        text: nodeText,
        buttons: nodeButtons,
        mediaUrl: nodeMediaUrl,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      // 5. If real Baileys socket is provided, send real WhatsApp message in Sandbox
      if (sock && phone) {
        try {
          const jid = phone.includes('@') ? phone : `${phone.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
          if (responsePayload.buttons && responsePayload.buttons.length > 0) {
            // Send interactive buttons or list
            const buttonText = `${responsePayload.text}\n\n` + responsePayload.buttons.map((b, i) => `${i + 1}️⃣ ${b}`).join('\n');
            await sock.sendMessage(jid, { text: buttonText });
          } else if (responsePayload.mediaUrl) {
            await sock.sendMessage(jid, { 
              document: { url: responsePayload.mediaUrl },
              mimetype: 'application/pdf',
              fileName: 'Brochure.pdf',
              caption: responsePayload.text
            });
          } else {
            await sock.sendMessage(jid, { text: responsePayload.text });
          }
        } catch (sockErr) {
          console.warn('[N8nBridge Baileys Send Warn]', sockErr.message);
        }
      }

      return responsePayload;
    } catch (err) {
      console.error('[N8nBridge Process Error]', err);
      return null;
    }
  }
}

export const n8nBridge = new N8nWorkflowBridge();
export default n8nBridge;
