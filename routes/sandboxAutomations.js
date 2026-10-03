import express from 'express';
import { 
  getSandboxFlows, 
  getSandboxFlowById, 
  saveSandboxFlow, 
  toggleSandboxFlow, 
  deleteSandboxFlow,
  logSandboxFlowExecution,
  getSandboxFlowLogs 
} from '../db.js';

const router = express.Router();

/**
 * 1. GET /api/sandbox/automations/flows
 * List all sandbox automation flows for the active tenant
 */
router.get('/flows', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] || req.query.tenantId || 'org_default';
    const flows = await getSandboxFlows(tenantId);
    res.json({ success: true, flows, count: flows.length });
  } catch (err) {
    console.error('[SandboxAutomations] List error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 2. GET /api/sandbox/automations/flows/:id
 * Retrieve single flow by ID
 */
router.get('/flows/:id', async (req, res) => {
  try {
    const flow = await getSandboxFlowById(req.params.id);
    if (!flow) {
      return res.status(404).json({ success: false, error: 'Flow not found' });
    }
    res.json({ success: true, flow });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 3. POST /api/sandbox/automations/flows
 * Save / Create / Clone a workflow
 */
router.post('/flows', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] || req.body.tenantId || 'org_default';
    const flowData = {
      ...req.body,
      tenant_id: tenantId
    };
    const saved = await saveSandboxFlow(flowData);
    res.json({ success: true, flow: saved });
  } catch (err) {
    console.error('[SandboxAutomations] Save error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 4. POST /api/sandbox/automations/flows/:id/toggle
 * Enable / Pause flow execution
 */
router.post('/flows/:id/toggle', async (req, res) => {
  try {
    const { isActive } = req.body;
    const updated = await toggleSandboxFlow(req.params.id, isActive);
    res.json({ success: true, flow: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 5. DELETE /api/sandbox/automations/flows/:id
 * Remove flow
 */
router.delete('/flows/:id', async (req, res) => {
  try {
    const result = await deleteSandboxFlow(req.params.id);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 6. POST /api/sandbox/automations/ai-generate
 * Instant Prompt-to-Workflow Generator Engine (2026 AI Flow Standard)
 */
router.post('/ai-generate', async (req, res) => {
  try {
    const { prompt, businessType = 'General Business' } = req.body;
    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }

    const cleanPrompt = prompt.toLowerCase();
    let category = 'custom';
    let flowTitle = 'AI Custom Lead Automation';
    let triggerKeyword = 'hi';
    let welcomeMsg = 'Hello {{name}}! Welcome to our service. How can we help you today?';
    let buttons = ['Explore Options 🚀', 'Pricing & Plans 💰', 'Talk to Expert 📞'];

    if (cleanPrompt.includes('gym') || cleanPrompt.includes('fitness') || cleanPrompt.includes('workout')) {
      category = 'fitness';
      flowTitle = '🏋️ Fitness Gym Membership & Free Trial Bot';
      triggerKeyword = 'gym';
      welcomeMsg = 'Namaste {{name}}! Welcome to FitLife Studio. Ready to transform your fitness? Select your goal:';
      buttons = ['Weight Loss 🏃', 'Muscle Building 💪', 'Book 3-Day Free Pass 🎟️'];
    } else if (cleanPrompt.includes('real estate') || cleanPrompt.includes('flat') || cleanPrompt.includes('property')) {
      category = 'real_estate';
      flowTitle = '🏢 Real Estate Site Visit & Floor Plan Bot';
      triggerKeyword = 'property';
      welcomeMsg = 'Welcome {{name}} to Green Meadows Luxury Residencies! How can we assist your dream home search?';
      buttons = ['2 & 3 BHK Plans 🏠', 'Price & Payment Plan 💰', 'Schedule VIP Site Visit 🚗'];
    } else if (cleanPrompt.includes('doctor') || cleanPrompt.includes('clinic') || cleanPrompt.includes('hospital')) {
      category = 'healthcare';
      flowTitle = '🏥 Clinic Appointment Booking & Consultation Bot';
      triggerKeyword = 'doctor';
      welcomeMsg = 'Hello! Welcome to CareFirst Multi-Specialty Clinic. Please choose your consultation:';
      buttons = ['Book Appointment 🩺', 'Online Video Consult 💻', 'Clinic Timings & Map 📍'];
    } else if (cleanPrompt.includes('course') || cleanPrompt.includes('coaching') || cleanPrompt.includes('edtech')) {
      category = 'coaching';
      flowTitle = '🎓 Online Course & Scholarship Qualifier Bot';
      triggerKeyword = 'admission';
      welcomeMsg = 'Hi {{name}}! Admissions for the upcoming batch are open. What would you like to explore?';
      buttons = ['Download Syllabus 📄', 'Fee & Scholarship 💰', 'Free Demo Class 🎯'];
    }

    const generatedNodes = [
      {
        id: 'node_1',
        type: 'trigger',
        position: { x: 50, y: 150 },
        data: { label: `Inbound Keyword: ${triggerKeyword}`, triggerType: 'keyword', keyword: triggerKeyword }
      },
      {
        id: 'node_2',
        type: 'interactive_button',
        position: { x: 320, y: 130 },
        data: { text: welcomeMsg, buttons }
      },
      {
        id: 'node_3',
        type: 'send_media',
        position: { x: 620, y: 60 },
        data: { text: 'Here is the detailed brochure & catalog PDF.', mediaUrl: 'https://example.com/catalog.pdf' }
      },
      {
        id: 'node_4',
        type: 'assign_agent',
        position: { x: 620, y: 220 },
        data: { extension: '101', tag: 'High-Intent Lead' }
      }
    ];

    const generatedEdges = [
      { id: 'e1-2', source: 'node_1', target: 'node_2' },
      { id: 'e2-3', source: 'node_2', target: 'node_3', sourceHandle: 'btn_1' },
      { id: 'e2-4', source: 'node_2', target: 'node_4', sourceHandle: 'btn_3' }
    ];

    const flowData = {
      name: flowTitle,
      category,
      description: `Auto-generated via AI from prompt: "${prompt}"`,
      trigger_type: 'keyword',
      trigger_config: { keywords: [triggerKeyword], match_type: 'contains' },
      nodes: generatedNodes,
      edges: generatedEdges,
      is_active: 1
    };

    const savedFlow = await saveSandboxFlow(flowData);
    res.json({ success: true, flow: savedFlow });
  } catch (err) {
    console.error('[SandboxAutomations] AI Generate error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 7. POST /api/sandbox/automations/test-trigger
 * Live Simulator: Test a WhatsApp message / button click against Sandbox Flows
 */
router.post('/test-trigger', async (req, res) => {
  try {
    const { flowId, inputMessage, clickedButton, customerPhone = '919876543210', customerName = 'Test User' } = req.body;

    let targetFlow;
    if (flowId) {
      targetFlow = await getSandboxFlowById(flowId);
    } else {
      const all = await getSandboxFlows();
      targetFlow = all.find(f => f.is_active);
    }

    if (!targetFlow) {
      return res.json({
        success: false,
        message: 'No active sandbox flow found to handle this test message.',
        simulatedResponse: null
      });
    }

    const nodes = targetFlow.nodes || [];
    const messageNode = nodes.find(n => n.type === 'interactive_button' || n.type === 'send_message') || nodes[1] || nodes[0];
    const rawText = messageNode?.data?.text || 'Hello! Thank you for messaging us.';
    const parsedText = rawText.replace(/\{\{name\}\}/gi, customerName);
    const buttons = messageNode?.data?.buttons || ['Option 1', 'Option 2'];

    // Log this sandbox test execution
    await logSandboxFlowExecution({
      flow_id: targetFlow.id,
      phone_number: customerPhone,
      node_id: messageNode?.id || 'node_2',
      node_type: messageNode?.type || 'interactive_button',
      event_type: clickedButton ? 'BUTTON_CLICK' : 'INBOUND_MESSAGE',
      payload: { input: inputMessage || clickedButton, responseText: parsedText, buttons },
      status: 'success'
    });

    res.json({
      success: true,
      flowMatched: targetFlow.name,
      simulatedResponse: {
        fromMe: true,
        text: parsedText,
        buttons: buttons,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        channel: 'WhatsApp Sandbox'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 8. GET /api/sandbox/automations/logs/:flowId
 * Retrieve execution logs
 */
router.get('/logs/:flowId', async (req, res) => {
  try {
    const logs = await getSandboxFlowLogs(req.params.flowId, 50);
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 9. GET /api/sandbox/automations/engine-status
 * Check n8n Headless Bridge connection status
 */
router.get('/engine-status', async (req, res) => {
  try {
    const { n8nBridge } = await import('../services/n8nBridge.js');
    const status = await n8nBridge.checkConnection();
    res.json({ success: true, ...status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 10. GET /api/sandbox/automations/n8n-export/:id
 * Export EMS Flow into standard n8n-compatible workflow JSON
 */
router.get('/n8n-export/:id', async (req, res) => {
  try {
    const flow = await getSandboxFlowById(req.params.id);
    if (!flow) return res.status(404).json({ success: false, error: 'Flow not found' });
    const { n8nBridge } = await import('../services/n8nBridge.js');
    const n8nJson = n8nBridge.exportToN8nWorkflowJson(flow);
    res.json({ success: true, workflow: n8nJson });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
/**
 * 11. POST /api/sandbox/automations/test-execute
 * Trigger real test execution on connected WhatsApp or test simulation
 */
router.post('/test-execute', async (req, res) => {
  try {
    const { eventType = 'payment_success', payload = {}, tenantId = 1, flowId } = req.body;
    const { automationWorkflowEngine } = await import('../services/AutomationWorkflowEngine.js');

    if (flowId) {
      const flow = await getSandboxFlowById(flowId);
      if (flow) {
        await automationWorkflowEngine.executeSingleFlow(flow, payload, tenantId);
        return res.json({ success: true, message: `Flow "${flow.name}" executed successfully!`, flowName: flow.name });
      }
    }

    const result = await automationWorkflowEngine.triggerEvent(eventType, payload, tenantId);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[SandboxAutomations] Test Execute Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
