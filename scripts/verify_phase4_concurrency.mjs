import CallingService from '../backend/services/calling/CallingService.js';
import PlivoProvider from '../backend/services/calling/PlivoProvider.js';
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:%28sandbox%40113%29@db.mucgmzldgvtblmsurtgo.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function verifyPhase4() {
  console.log('========================================================');
  console.log('🧪 VERIFYING PHASE 4: SHARED NUMBER POOL & INBOUND CONCURRENCY');
  console.log('Target Database: Sandbox PostgreSQL 17 (mucgmzldgvtblmsurtgo)');
  console.log('========================================================\n');

  const provider = CallingService.getProvider('plivo');
  if (!provider) {
    throw new Error('PlivoProvider not found in CallingService');
  }

  // 1. Verify Multi-Agent Presence
  console.log('[1/5] Verifying Agent Telephony Presence in Sandbox PostgreSQL...');
  const agents = await provider.getAgentPresence(1);
  console.log(`Found ${agents.length} agent(s) registered for Tenant 1:`);
  agents.forEach(a => console.log(`  - ${a.agent_id}: ${a.agent_name} | Online: ${a.is_online} | Busy: ${a.is_busy}`));

  if (agents.length < 2) {
    throw new Error('Expected at least 2 demo agents for concurrency testing!');
  }
  console.log('✅ Multi-agent presence verified.');

  // 2. Test Sticky Agent Inbound Routing
  console.log('\n[2/5] Testing Sticky Agent Inbound Routing...');
  const testCustomerPhone = '919988776655';
  
  // Seed a previous call log with agent_102 (Pooja Verma)
  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO call_logs (id, tenant_id, phone, customer_name, agent_id, agent_name, status, duration, created_at)
       VALUES ($1, 1, $2, 'Sticky Test Customer', 'agent_102', 'Pooja Verma (Support)', 'COMPLETED', 120, NOW())
       ON CONFLICT (id) DO UPDATE SET agent_id = 'agent_102', agent_name = 'Pooja Verma (Support)'`,
      ['sticky_test_call_001', testCustomerPhone]
    );
  } finally {
    client.release();
  }

  // Set strategy to sticky_agent
  await provider.updateInboundSettings({
    tenantId: 1,
    inboundRoutingStrategy: 'sticky_agent',
    ringTimeout: 25
  });

  const stickyResult = await provider.generateInboundXml({
    from: testCustomerPhone,
    to: '918031496345',
    tenantId: 1,
    actionUrl: 'https://api.employeemanagementsystems.com/api/telephony/plivo/status?tenant_id=1',
    fallbackUrl: 'https://api.employeemanagementsystems.com/api/telephony/plivo/inbound/fallback?tenant_id=1'
  });

  console.log('Generated Sticky Agent XML:\n' + stickyResult.xml);
  if (!stickyResult.xml.includes('agent_102')) {
    throw new Error('Sticky agent routing failed to match past agent (agent_102)!');
  }
  console.log('✅ Sticky Agent Routing matched past agent: Pooja Verma (agent_102)');

  // 3. Test Ring All Agents Simultaneously
  console.log('\n[3/5] Testing Ring All Agents Concurrency Mode...');
  await provider.updateInboundSettings({
    tenantId: 1,
    inboundRoutingStrategy: 'ring_all',
    ringTimeout: 20
  });

  const ringAllResult = await provider.generateInboundXml({
    from: '911122334455', // Unknown new customer
    to: '918031496345',
    tenantId: 1,
    actionUrl: 'https://api.employeemanagementsystems.com/api/telephony/plivo/status?tenant_id=1',
    fallbackUrl: 'https://api.employeemanagementsystems.com/api/telephony/plivo/inbound/fallback?tenant_id=1'
  });

  console.log('Generated Ring All XML:\n' + ringAllResult.xml);
  if (!ringAllResult.xml.includes('agent_101') || !ringAllResult.xml.includes('agent_102') || !ringAllResult.xml.includes('agent_103')) {
    throw new Error('Ring All mode did not include all available agents in Dial XML!');
  }
  console.log('✅ Ring All Concurrency Mode successfully grouped all 3 agents simultaneously.');

  // 4. Test Fallback Greeting & Missed Call Logging
  console.log('\n[4/5] Testing Fallback Greeting & Missed Call Logging...');
  const fallbackXml = await provider.handleInboundFallback({
    from: '919988776655',
    to: '918031496345',
    tenantId: 1,
    callUuid: 'fallback_test_call_002'
  });

  console.log('Fallback XML:\n' + fallbackXml);
  if (!fallbackXml.includes('<Speak>')) {
    throw new Error('Fallback XML missing Speak greeting tag!');
  }

  // Verify missed call log was created in Sandbox PostgreSQL
  const checkClient = await pool.connect();
  try {
    const missedRes = await checkClient.query(
      `SELECT * FROM call_logs WHERE id = 'fallback_test_call_002'`
    );
    if (missedRes.rows.length === 0 || missedRes.rows[0].status !== 'MISSED') {
      throw new Error('Missed call was not recorded correctly in call_logs!');
    }
    console.log('✅ Missed call recorded in Sandbox PostgreSQL call_logs table.');
  } finally {
    checkClient.release();
  }

  // 5. Test Agent Presence Toggle
  console.log('\n[5/5] Testing Agent Presence Dynamic State Toggle...');
  await provider.updateAgentPresence({
    tenantId: 1,
    agentId: 'agent_103',
    agentName: 'Amit Patel (Retention)',
    isOnline: true,
    isBusy: true
  });
  const updatedAgents = await provider.getAgentPresence(1);
  const agent103 = updatedAgents.find(a => a.agent_id === 'agent_103');
  console.log(`Agent 103 status after update: is_busy = ${agent103.is_busy}`);
  if (!agent103.is_busy) {
    throw new Error('Failed to update agent busy status!');
  }
  // Reset agent 103 back to available
  await provider.updateAgentPresence({
    tenantId: 1,
    agentId: 'agent_103',
    agentName: 'Amit Patel (Retention)',
    isOnline: true,
    isBusy: false
  });
  console.log('✅ Dynamic presence toggle verified.');

  console.log('\n========================================================');
  console.log('🎉 ALL PHASE 4 TESTS PASSED (5/5) WITH ZERO ERRORS');
  console.log('========================================================');
  await pool.end();
}

verifyPhase4().catch(err => {
  console.error('\n❌ PHASE 4 VERIFICATION FAILED:', err);
  process.exit(1);
});
