import fs from 'fs';
import path from 'path';

const SUPABASE_BASE = 'https://pdjaajbhrvglwukoacuh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_q8SBMvAwczXP0yfDfIMZsQ_ahP5YYq3';
const BUCKET = 'omniflow-vault';

async function uploadFile(remotePath, fileBuffer, contentType) {
  const url = `${SUPABASE_BASE}/storage/v1/object/${BUCKET}/${remotePath}`;
  console.log(`Uploading ${remotePath} (${fileBuffer.length} bytes) to ${url}...`);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': contentType,
      'x-upsert': 'true'
    },
    body: fileBuffer
  });

  const resText = await res.text();
  console.log(`Upload status for ${remotePath}: ${res.status} ${res.statusText} -> ${resText}`);
  if (!res.ok) {
    throw new Error(`Failed to upload ${remotePath}: ${res.status} ${resText}`);
  }
}

async function verifyUrl(publicUrl) {
  console.log(`Verifying: ${publicUrl}...`);
  const res = await fetch(`${publicUrl}?nocache=${Date.now()}`);
  console.log(`Status: ${res.status} ${res.statusText}`);
  if (res.ok) {
    const len = res.headers.get('content-length');
    console.log(`Content-Length: ${len}`);
    return true;
  }
  return false;
}

async function main() {
  console.log('🚀 Starting OmniFlow Companion OTA Update Publisher...');

  const apkPath = path.resolve('OmniFlow-Live-Companion.apk');
  if (!fs.existsSync(apkPath)) {
    throw new Error(`APK not found at ${apkPath}`);
  }

  const apkBuffer = fs.readFileSync(apkPath);
  console.log(`Read APK file: ${apkPath} (${(apkBuffer.length / (1024 * 1024)).toFixed(2)} MB)`);

  // 1. Upload APK
  await uploadFile('app/OmniFlow-Live-Companion.apk', apkBuffer, 'application/vnd.android.package-archive');

  // 2. Prepare and Upload version.json
  const versionInfo = {
    versionCode: 7,
    versionName: "1.0.7",
    apkUrl: `${SUPABASE_BASE}/storage/v1/object/public/${BUCKET}/app/OmniFlow-Live-Companion.apk`,
    changeLog: "Permanent session persistence, 1 Phone + 1 Laptop dual-device policy, instant takeover alert popup, auto-flush offline call queue on logout, 24/7 background call recording resilience, and zero cross-contamination protection.",
    minVersionCode: 1,
    forceUpdate: true,
    updatedAt: new Date().toISOString()
  };

  const versionJsonBuffer = Buffer.from(JSON.stringify(versionInfo, null, 2), 'utf-8');
  await uploadFile('app/version.json', versionJsonBuffer, 'application/json');

  // 3. Verify public accessibility
  const publicApkUrl = `${SUPABASE_BASE}/storage/v1/object/public/${BUCKET}/app/OmniFlow-Live-Companion.apk`;
  const publicVersionUrl = `${SUPABASE_BASE}/storage/v1/object/public/${BUCKET}/app/version.json`;

  const apkOk = await verifyUrl(publicApkUrl);
  const versionOk = await verifyUrl(publicVersionUrl);

  if (apkOk && versionOk) {
    console.log('\n🎉 SUCCESS! OmniFlow Companion OTA Update is LIVE on Supabase CDN!');
    console.log(`APK Version: ${versionInfo.versionName} (Code: ${versionInfo.versionCode})`);
    console.log(`Version JSON: ${publicVersionUrl}`);
    console.log(`Direct APK: ${publicApkUrl}`);
  } else {
    console.error('⚠️ Verification failed for one or more endpoints.');
  }
}

main().catch(err => {
  console.error('❌ Error publishing update:', err);
  process.exit(1);
});
