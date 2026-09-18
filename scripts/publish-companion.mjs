// scripts/publish-companion.mjs
// Automated Release Pipeline for OmniFlow Android Companion App
// Uploads APK and publishes version.json to Supabase Storage CDN

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const SUPABASE_STORAGE_URL = 'https://pdjaajbhrvglwukoacuh.supabase.co/storage/v1';
const SUPABASE_KEY = 'sb_publishable_q8SBMvAwczXP0yfDfIMZsQ_ahP5YYq3';
const STORAGE_BUCKET = 'omniflow-vault';

async function uploadFileToSupabase(objectPath, fileBuffer, contentType) {
  const uploadUrl = `${SUPABASE_STORAGE_URL}/object/${STORAGE_BUCKET}/${objectPath}`;
  console.log(`📤 Uploading to: ${uploadUrl} (${fileBuffer.length} bytes)...`);

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': contentType,
      'x-upsert': 'true'
    },
    body: fileBuffer
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Upload failed HTTP ${res.status}: ${errText}`);
  }

  const publicUrl = `${SUPABASE_STORAGE_URL}/object/public/${STORAGE_BUCKET}/${objectPath}`;
  console.log(`✅ Success: ${publicUrl}`);
  return publicUrl;
}

async function main() {
  console.log('🚀 Starting OmniFlow Companion Release...');

  const apkPath = path.join(rootDir, 'OmniFlow-Live-Companion.apk');
  if (!fs.existsSync(apkPath)) {
    throw new Error(`APK file not found at: ${apkPath}`);
  }

  const apkBytes = fs.readFileSync(apkPath);
  console.log(`📦 Loaded APK: ${apkBytes.length} bytes`);

  // 1. Upload APK to Storage
  const apkObjectPath = 'app/OmniFlow-Live-Companion.apk';
  const apkPublicUrl = await uploadFileToSupabase(apkObjectPath, apkBytes, 'application/vnd.android.package-archive');

  // 2. Read current version from build.gradle
  const gradlePath = path.join(rootDir, 'android_companion_app', 'build.gradle');
  let versionCode = 2;
  let versionName = '1.0.2';

  if (fs.existsSync(gradlePath)) {
    const gradleContent = fs.readFileSync(gradlePath, 'utf8');
    const codeMatch = gradleContent.match(/versionCode\s+(\d+)/);
    const nameMatch = gradleContent.match(/versionName\s+["']([^"']+)["']/);
    if (codeMatch) versionCode = parseInt(codeMatch[1], 10);
    if (nameMatch) versionName = nameMatch[1];
  }

  console.log(`🏷️ Releasing Version: v${versionName} (Build ${versionCode})`);

  // 3. Upload version.json manifest
  const versionManifest = {
    versionCode: versionCode,
    versionName: versionName,
    apkUrl: apkPublicUrl,
    changeLog: 'Added In-App Auto-Updater, Multi-Layer SIM 2 detection, 0s call ghost-audio protection',
    minVersionCode: 1,
    forceUpdate: false,
    updatedAt: new Date().toISOString()
  };

  const manifestBytes = Buffer.from(JSON.stringify(versionManifest, null, 2), 'utf8');
  await uploadFileToSupabase('app/version.json', manifestBytes, 'application/json');

  console.log('\n🎉 ALL DONE! Release is now live on Supabase Storage CDN.');
  console.log(`🔗 Public Version Check: ${SUPABASE_STORAGE_URL}/object/public/${STORAGE_BUCKET}/app/version.json`);
  console.log(`📥 Public APK Download: ${apkPublicUrl}`);
}

main().catch(err => {
  console.error('❌ Release error:', err);
  process.exit(1);
});
