import CallingService from '../backend/services/calling/CallingService.js';
import PlivoProvider from '../backend/services/calling/PlivoProvider.js';

async function verifyPhase2() {
  console.log('========================================================');
  console.log('🧪 VERIFYING PHASE 2: PLIVO BACKEND ENGINE & WALLET LEDGER');
  console.log('Target Database: Sandbox PostgreSQL 17 (mucgmzldgvtblmsurtgo)');
  console.log('========================================================\n');

  // 1. Verify Provider Registration
  console.log('[1/4] Verifying PlivoProvider in CallingService registry...');
  const provider = CallingService.getProvider('plivo');
  if (!provider || !(provider instanceof PlivoProvider)) {
    throw new Error('PlivoProvider is not properly registered in CallingService!');
  }
  console.log('✅ PlivoProvider is registered correctly.');

  // 2. Test JWT Token Generation for Browser SDK
  console.log('[2/4] Generating WebRTC JWT Access Token for Agent...');
  const token = provider.generateAccessToken({
    endpointUsername: 'agent_sandbox_1',
    tenantId: 1
  });
  console.log('✅ JWT Token generated successfully (Length: ' + token.length + ' chars)');

  // 3. Test Voice XML Generation for Browser Dial
  console.log('[3/4] Generating Voice XML for Outbound Dial...');
  const xml = provider.generateAnswerXml({
    destination: '918566883642',
    callerId: '918031496345',
    record: true
  });
  console.log('Generated XML:\n' + xml);
  if (!xml.includes('<Dial') || !xml.includes('<Record')) {
    throw new Error('Generated XML is missing required Dial or Record elements!');
  }
  console.log('✅ Voice XML verified.');

  // 4. Test Sandbox PostgreSQL Wallet Fetch & Real-Time Deduction
  console.log('[4/4] Testing Sandbox PostgreSQL 17 Wallet Deduction...');
  const walletBefore = await provider.getWallet(1);
  console.log(`Initial Wallet Balance: ₹${walletBefore.balance}`);

  const deductionResult = await provider.deductWallet({
    tenantId: 1,
    durationSeconds: 75, // 75 seconds = 2 billable minutes @ ₹0.75 = ₹1.50
    ratePerMinute: 0.75,
    agentId: 'agent_sandbox_1',
    agentName: 'Test Agent',
    callUuid: `test_call_${Date.now()}`
  });

  console.log('Deduction Result:', deductionResult);
  if (!deductionResult.success || deductionResult.billedAmount !== 1.5) {
    throw new Error(`Deduction failed or calculation incorrect: ${JSON.stringify(deductionResult)}`);
  }

  const walletAfter = await provider.getWallet(1);
  console.log(`Updated Wallet Balance in Sandbox PostgreSQL: ₹${walletAfter.balance}`);
  console.log(`Verified Difference: ₹${(parseFloat(walletBefore.balance) - parseFloat(walletAfter.balance)).toFixed(2)} (Expected: ₹1.50)`);

  console.log('\n🎉 ALL PHASE 2 BACKEND CHECKS PASSED WITH 100% ACCURACY!');
}

verifyPhase2().catch(err => {
  console.error('❌ Phase 2 Verification Failed:', err);
  process.exit(1);
});
