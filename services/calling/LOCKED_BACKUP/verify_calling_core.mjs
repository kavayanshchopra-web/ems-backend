import CallingService from './CallingService.js';
import desktopBridge from './desktopBridge.js';
import VoxbayProvider from './VoxbayProvider.js';

async function testCallingCore() {
  console.log("=== VOXBAY CALLING CORE PERMANENT INTEGRITY TEST ===");
  
  // 1. Verify Provider registration
  const provider = CallingService.getProvider('voxbay');
  if (!provider) throw new Error("VoxbayProvider missing in CallingService registry!");
  console.log("✓ CallingService & VoxbayProvider registered correctly.");

  // 2. Verify DesktopBridge methods
  if (typeof desktopBridge.focusSoftphone !== 'function') throw new Error("focusSoftphone missing!");
  if (typeof desktopBridge.dialNumber !== 'function') throw new Error("dialNumber missing!");
  if (typeof desktopBridge.hangupCall !== 'function') throw new Error("hangupCall missing!");
  console.log("✓ DesktopBridge methods verified.");

  // 3. Test Softphone Calling Dispatch (Dry-Run / Live Endpoint Check)
  const softphoneRes = await CallingService.initiateCall({
    phoneNumber: '9646017866',
    callingMode: 'extension_to_mobile',
    agentExtension: '2MaqwezO'
  });
  if (!softphoneRes.success) throw new Error("Softphone dispatch failed: " + JSON.stringify(softphoneRes));
  console.log("✓ Softphone Calling Mode (2MaqwezO) Verified: SUCCESS.");

  // 4. Test Mobile SIM Calling Dispatch
  const mobileRes = await CallingService.initiateCall({
    phoneNumber: '9646017866',
    callingMode: 'mobile_to_mobile',
    agentMobile: '6283513686'
  });
  if (!mobileRes.success) throw new Error("Mobile SIM dispatch failed: " + JSON.stringify(mobileRes));
  console.log("✓ Mobile SIM Calling Mode (6283513686) Verified: SUCCESS.");

  console.log("===================================================");
  console.log("ALL CALLING CORE TESTS PASSED WITH ZERO DEFECTS!");
  process.exit(0);
}

testCallingCore().catch(err => {
  console.error("CALLING TEST FAILED:", err);
  process.exit(1);
});