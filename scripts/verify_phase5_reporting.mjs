import CallingService from '../backend/services/calling/CallingService.js';
import PlivoProvider from '../backend/services/calling/PlivoProvider.js';

async function verifyPhase5() {
  console.log('========================================================');
  console.log('🧪 VERIFYING PHASE 5: DYNAMIC TELEPHONY REPORTING ENGINE');
  console.log('Target Database: Sandbox PostgreSQL 17 (mucgmzldgvtblmsurtgo)');
  console.log('========================================================\n');

  const provider = CallingService.getProvider('plivo');
  if (!provider) {
    throw new Error('PlivoProvider not found in CallingService');
  }

  // 1. Verify Today's Calling Summary Report
  console.log('[1/4] Verifying Dynamic Calling Summary for TODAY...');
  const todayReport = await provider.getTelephonySummaryReport({ tenantId: 1, period: 'today' });
  console.log('Today Report:', todayReport);

  if (todayReport.totalCalls < 3 || todayReport.totalMinutes !== 5) {
    throw new Error(`Today report calculation mismatch! Expected 5 minutes, got ${todayReport.totalMinutes}`);
  }
  if (todayReport.totalBilledAmount !== 3.75 || todayReport.grossProfit !== 1.85) {
    throw new Error(`Today report financial mismatch! Expected Billed ₹3.75, Profit ₹1.85, got Billed ₹${todayReport.totalBilledAmount}, Profit ₹${todayReport.grossProfit}`);
  }
  console.log(`✅ Today Summary Verified: 5 mins, ₹${todayReport.totalBilledAmount} revenue, ₹${todayReport.grossProfit} profit (${todayReport.marginPercent}% margin)`);

  // 2. Verify This Month's Calling Summary Report
  console.log('\n[2/4] Verifying Dynamic Calling Summary for THIS MONTH...');
  const monthReport = await provider.getTelephonySummaryReport({ tenantId: 1, period: 'this_month' });
  console.log('This Month Report:', monthReport);

  if (monthReport.totalCalls < 5 || monthReport.totalMinutes < 15) {
    throw new Error(`This Month report calculation mismatch! Expected at least 15 minutes, got ${monthReport.totalMinutes}`);
  }
  if (monthReport.totalBilledAmount < 11.25 || monthReport.grossProfit < 5.55) {
    throw new Error(`This Month report financial mismatch! Expected Billed >= ₹11.25, Profit >= ₹5.55, got Billed ₹${monthReport.totalBilledAmount}, Profit ₹${monthReport.grossProfit}`);
  }
  console.log(`✅ This Month Summary Verified: ${monthReport.totalMinutes} mins, ₹${monthReport.totalBilledAmount} revenue, ₹${monthReport.grossProfit} profit (${monthReport.marginPercent}% margin)`);

  // 3. Verify Agent Performance Breakdown
  console.log('\n[3/4] Verifying Agent-Wise Performance Breakdown...');
  const agentReport = await provider.getAgentPerformanceReport({ tenantId: 1, period: 'this_month' });
  console.log('Agent Breakdown:');
  agentReport.forEach(a => {
    console.log(`  - ${a.agentName}: ${a.totalCalls} calls, ${a.connectedCalls} answered, ${a.totalMinutes} mins, ACD: ${a.avgDurationSeconds}s, Spend: ₹${a.totalBilledAmount}`);
  });

  if (agentReport.length < 3) {
    throw new Error('Expected at least 3 agent performance rows!');
  }
  const rahul = agentReport.find(a => a.agentName.includes('Rahul'));
  if (!rahul || rahul.totalMinutes !== 6 || rahul.totalBilledAmount !== 4.50) {
    throw new Error('Rahul Sharma metrics incorrect: ' + JSON.stringify(rahul));
  }
  console.log('✅ Agent Performance Breakdown verified.');

  // 4. Verify SuperAdmin Financial Ledger
  console.log('\n[4/4] Verifying SuperAdmin Multi-Company Financial Ledger...');
  const superAdminReport = await provider.getSuperAdminFinancialReport({ period: 'this_month' });
  console.log('Grand Totals:', superAdminReport.grandTotals);
  console.log('Tenants:', superAdminReport.tenants);

  if (!superAdminReport.grandTotals || superAdminReport.grandTotals.totalRevenue < 11.25) {
    throw new Error('SuperAdmin report grand total revenue mismatch!');
  }
  console.log('✅ SuperAdmin Financial Ledger verified.');

  console.log('\n========================================================');
  console.log('🎉 ALL PHASE 5 BACKEND TESTS PASSED (4/4) WITH ZERO ERRORS');
  console.log('========================================================');
}

verifyPhase5().catch(err => {
  console.error('\n❌ PHASE 5 VERIFICATION FAILED:', err);
  process.exit(1);
});
