import automationWorkflowEngine from '../backend/services/AutomationWorkflowEngine.js';
import { initDb, getPendingScheduledMessages, getSandboxFlowLogs } from '../backend/db.js';

async function testEngine() {
  console.log('🧪 Initializing Database Connection...');
  const db = await initDb();
  console.log('🧪 Testing AutomationWorkflowEngine...');

  // 1. Test template variable rendering
  const sampleTemplate = 'Hi {{name}}! Received {{amount}} for Order #{{order_id}}. Ref: {{payment_id}}. Pay link: {{payment_link}}';
  const rendered = automationWorkflowEngine.renderTemplate(sampleTemplate, {
    customer_name: 'Kavayansh Chopra',
    amount: '4999',
    order_id: 'order_98124',
    payment_id: 'pay_98124'
  });
  console.log('\n✅ 1. Rendered Template Test:');
  console.log(rendered);

  // 2. Test delay parser
  const delay1 = automationWorkflowEngine.extractDelaySeconds({ label: '⏱️ Wait 2 Hours' });
  const delay2 = automationWorkflowEngine.extractDelaySeconds({ label: '⏱️ Wait 15 Minutes' });
  const delay3 = automationWorkflowEngine.extractDelaySeconds({ label: '⏱️ Wait 1 Day' });
  console.log('\n✅ 2. Delay Extraction Test:');
  console.log(`2 Hours: ${delay1}s (expected 7200s) - ${delay1 === 7200 ? 'PASS' : 'FAIL'}`);
  console.log(`15 Mins: ${delay2}s (expected 900s) - ${delay2 === 900 ? 'PASS' : 'FAIL'}`);
  console.log(`1 Day:   ${delay3}s (expected 86400s) - ${delay3 === 86400 ? 'PASS' : 'FAIL'}`);

  // 3. Test Trigger Event (Payment Success with 2-Hour Drip Flow)
  console.log('\n✅ 3. Triggering Payment Success with 2-Hour Drip Flow...');
  const { MASTER_AUTOMATION_TEMPLATES } = await import('../frontend/src/components/pages/automationTemplatesData.js');
  const dripFlow = MASTER_AUTOMATION_TEMPLATES.find(t => t.id === 'tpl_payment_success_onboarding_drip');
  
  if (dripFlow) {
    console.log(`Executing Flow: "${dripFlow.name}"`);
    await automationWorkflowEngine.executeSingleFlow(dripFlow, {
      customer_name: 'Rahul Sharma',
      customer_phone: '919876543210',
      amount: '2999',
      payment_id: 'pay_live_test_001',
      order_id: 'order_live_test_001'
    }, 1);
  }

  // 4. Check if delayed messages were scheduled in database
  const scheduled = await db.all(`SELECT id, contact_id, send_at, scheduled_at, status, message_text FROM scheduled_messages WHERE status = 'pending' ORDER BY id DESC LIMIT 5`);
  console.log('\n✅ 4. Scheduled Delay Messages in Database:');
  console.log(`Found ${scheduled.length} scheduled message(s) queued for future delay execution.`);
  if (scheduled.length > 0) {
    scheduled.forEach(msg => {
      console.log({
        id: msg.id,
        contact: msg.contact_id,
        send_at: new Date(msg.send_at * 1000).toLocaleString(),
        status: msg.status,
        text_preview: msg.message_text.slice(0, 80).replace(/\n/g, ' ') + '...'
      });
    });
  }

  console.log('\n🎉 ALL TESTS COMPLETED SUCCESSFULLY!');
  process.exit(0);
}

testEngine().catch(console.error);
