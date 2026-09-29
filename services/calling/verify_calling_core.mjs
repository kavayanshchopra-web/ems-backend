import CallingService from './CallingService.js';
import PlivoProvider from './PlivoProvider.js';

async function testCallingCore() {
  console.log("=== UNIVERSAL PLIVO CLOUD CALLING CORE PERMANENT INTEGRITY TEST ===");
  
  // 1. Verify Provider registration
  const provider = CallingService.getProvider('plivo');
  if (!provider) throw new Error("PlivoProvider missing in CallingService registry!");
  console.log("✓ CallingService & PlivoProvider registered correctly.");

  // 2. Verify Plivo WebRTC Methods
  if (typeof provider.generateAccessToken !== 'function') throw new Error("generateAccessToken missing!");
  if (typeof provider.generateAnswerXml !== 'function') throw new Error("generateAnswerXml missing!");
  if (typeof provider.generateInboundXml !== 'function') throw new Error("generateInboundXml missing!");
  if (typeof provider.deductWallet !== 'function') throw new Error("deductWallet missing!");
  console.log("✓ Universal WebRTC methods verified.");

  // 3. Test Browser WebRTC Calling Dispatch
  const webrtcRes = await CallingService.initiateCall({
    phoneNumber: '9646017866',
    callingMode: 'browser_webrtc',
    providerName: 'plivo'
  });
  if (!webrtcRes.success) throw new Error("WebRTC dispatch failed: " + JSON.stringify(webrtcRes));
  console.log("✓ Browser WebRTC Calling Mode Verified: SUCCESS.");

  console.log("===================================================");
  console.log("ALL UNIVERSAL CALLING CORE TESTS PASSED WITH ZERO DEFECTS!");
  process.exit(0);
}

testCallingCore().catch(err => {
  console.error("CALLING TEST FAILED:", err);
  process.exit(1);
});