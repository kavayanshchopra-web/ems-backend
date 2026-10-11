import { n8nBridge } from './backend/services/n8nBridge.js';

async function testEndpoints() {
  console.log('🧪 Verifying Multi-Tenant n8n Bridge Integration...');

  // 1. Status check
  const status = await n8nBridge.checkConnection();
  console.log('1. Connection Status:', status);

  // 2. Sync flow for Tenant A
  const sampleFlow = {
    id: 'flow_tenant_test_101',
    name: 'Real Estate Auto-Responder',
    is_active: 1,
    nodes: [
      { id: 'trigger_1', type: 'trigger', label: 'Inbound WhatsApp' },
      { id: 'msg_1', type: 'message', label: 'Welcome to Palm Heights!', buttons: ['Brochure', 'Pricing'] }
    ]
  };

  const syncResult = await n8nBridge.syncFlowToN8n(sampleFlow, 'tenant_company_alpha');
  console.log('2. Sync Result for Tenant Alpha:', syncResult);

  // 3. Verify Mapping in DB
  const mapping = await n8nBridge.getMapping('tenant_company_alpha', sampleFlow.id);
  console.log('3. Retrieved Mapping from PostgreSQL:', {
    tenant_id: mapping?.tenant_id,
    flow_id: mapping?.flow_id,
    webhook_path: mapping?.n8n_webhook_path,
    sync_status: mapping?.sync_status
  });

  if (mapping?.tenant_id === 'tenant_company_alpha' && mapping?.flow_id === sampleFlow.id) {
    console.log('🎉 MULTI-TENANT N8N BRIDGE VERIFICATION 100% SUCCESSFUL!');
    process.exit(0);
  } else {
    console.error('❌ Mapping verification mismatch');
    process.exit(1);
  }
}

testEndpoints().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
