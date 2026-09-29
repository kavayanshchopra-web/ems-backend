import { 
  getSandboxFlows, 
  getSandboxFlowById, 
  logSandboxFlowExecution 
} from '../db.js';

/**
 * EMS Headless n8n Workflow Bridge (100% White-Labeled)
 * Runs n8n-compatible workflow graphs seamlessly with zero live risk.
 */
class N8nWorkflowBridge {
  constructor() {
    this.n8nApiUrl = process.env.N8N_API_URL || 'http://localhost:5678/api/v1';
    this.n8nApiKey = process.env.N8N_API_KEY || '';
    this.isN8nConnected = false;
    this.activeSessions = new Map(); // phone -> { flowId, currentNodeId, variables, lastActive }
  }

  /**
   * Check connection to external n8n instance
   */
  async checkConnection() {
    if (!this.n8nApiKey) {
      this.isN8nConnected = false;
      return { connected: false, mode: 'EMS_HEADLESS_BUILTIN_ENGINE' };
    }
    try {
      const res = await fetch(`${this.n8nApiUrl}/workflows?limit=1`, {
        headers: { 'X-N8N-API-KEY': this.n8nApiKey }
      });
      this.isN8nConnected = res.ok;
      return { connected: res.ok, mode: res.ok ? 'N8N_REMOTE_API' : 'EMS_HEADLESS_BUILTIN_ENGINE' };
    } catch (e) {
      this.isN8nConnected = false;
      return { connected: false, mode: 'EMS_HEADLESS_BUILTIN_ENGINE', error: e.message };
    }
  }

  /**
   * Map EMS Flow Nodes to standard n8n-compatible Workflow JSON structure
   */
  exportToN8nWorkflowJson(flow) {
    const n8nNodes = [];
    const n8nConnections = {};

    (flow.nodes || []).forEach((node, idx) => {
      let n8nNodeType = 'n8n-nodes-base.webhook';
      let parameters = {};

      if (node.type === 'trigger') {
        n8nNodeType = 'n8n-nodes-base.webhook';
        parameters = {
          httpMethod: 'POST',
          path: `ems-trigger-${flow.id}`,
          responseMode: 'onReceived'
        };
      } else if (node.type === 'message' || node.type === 'interactive_buttons') {
        n8nNodeType = 'n8n-nodes-base.httpRequest';
        parameters = {
          url: 'https://api.employeemanagementsystems.com/api/sandbox/automations/dispatch-message',
          method: 'POST',
          bodyParametersUi: {
            text: node.label,
            buttons: node.buttons || []
          }
        };
      } else if (node.type === 'agent_route' || node.type === 'crm_action') {
        n8nNodeType = 'n8n-nodes-base.httpRequest';
        parameters = {
          url: 'https://api.employeemanagementsystems.com/api/contacts/stage',
          method: 'POST',
          stage: node.stage || 'Qualified Lead'
        };
      }

      n8nNodes.push({
        id: node.id || `node_${idx}`,
        name: node.label || `Step ${idx + 1}`,
        type: n8nNodeType,
        typeVersion: 1,
        position: [250 * (idx + 1), 300],
        parameters
      });
    });

    return {
      name: `EMS: ${flow.name}`,
      nodes: n8nNodes,
      connections: n8nConnections,
      active: flow.is_active === 1,
      settings: { executionOrder: 'v1' }
    };
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
