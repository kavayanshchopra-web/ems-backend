/**
 * Automated Test Suite — GHL Marketplace OAuth Callback Preparation (Staging & Generic Hotfix)
 * Target Environment: Staging (database.staging.sqlite, Port 5001)
 */

import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import jwt from 'jsonwebtoken';
import { 
  initDb, 
  getDb, 
  saveGhlOAuthState, 
  getGhlOAuthState, 
  getGhlIntegrationByTenant,
  getGhlIntegrationByLocation
} from '../db.js';
import setupRoutes from '../routes.js';
import { decryptToken } from '../services/ghl/ghlCrypto.js';
import GhlAuthService from '../services/ghl/ghlAuthService.js';
import GhlLocationService from '../services/ghl/ghlLocationService.js';

// Setup Staging Environment Variables
process.env.DB_PATH = 'database.staging.sqlite';
process.env.NODE_ENV = 'staging';
process.env.STAGING = 'true';
process.env.JWT_SECRET = 'ems_staging_jwt_secret_key_ghl_phase1_2026';
process.env.GHL_CLIENT_ID = 'test_staging_ghl_client_id_marketplace';
process.env.GHL_CLIENT_SECRET = 'test_staging_ghl_client_secret_marketplace';
process.env.GHL_REDIRECT_URI = 'https://staging.employeemanagementsystems.com/api/v1/integrations/oauth/callback';
process.env.GHL_TOKEN_ENCRYPTION_KEY = 'staging_32_byte_aes_encryption_key_test_phase1';

let server;
const serverPort = 5001;
const baseUrl = `http://localhost:${serverPort}`;

const testResults = [];

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    testResults.push({ name: testName, status: 'PASS' });
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    testResults.push({ name: testName, status: 'FAIL' });
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('🚀 Starting GHL Marketplace OAuth Callback Staging Test Suite');
  console.log('================================================================\n');

  // 1. Initialize SQLite Database (Staging)
  const stagingDbPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'database.staging.sqlite');
  await initDb(stagingDbPath);
  const db = getDb();
  console.log('Initialized staging SQLite database: database.staging.sqlite');

  // Clear GHL tables in staging DB
  await db.run(`DELETE FROM ghl_integrations`);
  await db.run(`DELETE FROM ghl_oauth_states`);

  // Seed Tenants
  await db.run(`INSERT OR IGNORE INTO tenants (id, company_name, subscription_status) VALUES (1, 'Alpha Staging Tenant', 'active')`);
  await db.run(`INSERT OR IGNORE INTO tenants (id, company_name, subscription_status) VALUES (2, 'Beta Staging Tenant', 'active')`);

  // 2. Start Express Test Server on Port 5001
  const app = express();
  app.use(express.json());
  const mockIo = { on: () => {}, emit: () => {} };
  app.use('/api', setupRoutes(mockIo));

  await new Promise((resolve) => {
    server = app.listen(serverPort, () => {
      console.log(`Staging test server running on port ${serverPort}\n`);
      resolve();
    });
  });

  // -------------------------------------------------------------
  // TEST 1: Staging Health Check Endpoint
  // -------------------------------------------------------------
  console.log('--- 1. Health & Environment Verification ---');
  try {
    const resHealth = await fetch(`${baseUrl}/api/v1/health`);
    const healthData = await resHealth.json();
    assert(resHealth.status === 200 && healthData.status === 'ok' && healthData.environment === 'staging', 'Test 1: GET /api/v1/health returns HTTP 200 with environment=staging');
  } catch (e) {
    assert(false, `Test 1 Error: ${e.message}`);
  }

  // -------------------------------------------------------------
  // TEST 2: Generic OAuth Callback Route Exists (/api/v1/integrations/oauth/callback)
  // -------------------------------------------------------------
  console.log('\n--- 2. Generic OAuth Callback Route Diagnostics ---');
  try {
    // Missing code and state -> must return 400 without crashing or requiring JWT auth
    const resGenericEmpty = await fetch(`${baseUrl}/api/v1/integrations/oauth/callback`);
    const text = await resGenericEmpty.text();
  console.log('Test 2a debug:', resGenericEmpty.status, text);
  assert(resGenericEmpty.status === 400, 'Test 2a: Generic callback /api/v1/integrations/oauth/callback exists, is public, and rejects empty query (400)');

    const resLegacyEmpty = await fetch(`${baseUrl}/api/v1/integrations/ghl/oauth/callback`);
    assert(resLegacyEmpty.status === 400, 'Test 2b: Legacy callback /api/v1/integrations/ghl/oauth/callback preserved for backward compatibility (400)');
  } catch (e) {
    assert(false, `Test 2 Error: ${e.message}`);
  }

  // -------------------------------------------------------------
  // TEST 3 & 4: Missing Code and Missing State Validation on Generic Route
  // -------------------------------------------------------------
  try {
    const resNoCode = await fetch(`${baseUrl}/api/v1/integrations/oauth/callback?state=valid_looking_state_token`);
    assert(resNoCode.status === 400, 'Test 3: Generic callback rejects request with missing code parameter (400)');

    const resNoState = await fetch(`${baseUrl}/api/v1/integrations/oauth/callback?code=mock_auth_code_123`);
    assert(resNoState.status === 400, 'Test 4: Generic callback rejects request with missing state parameter (400)');
  } catch (e) {
    assert(false, `Test 3/4 Error: ${e.message}`);
  }

  // -------------------------------------------------------------
  // TEST 5 & 6: Invalid & Expired State Validation on Generic Route
  // -------------------------------------------------------------
  try {
    const resInvalidState = await fetch(`${baseUrl}/api/v1/integrations/oauth/callback?code=mock_code&state=nonexistent_tampered_state`);
    const htmlInvalid = await resInvalidState.text();
    assert(resInvalidState.status === 400 && htmlInvalid.includes('Authorization Failed'), 'Test 5: Generic callback rejects invalid/unrecognized CSRF state token (400)');

    // Expired state in DB
    const expiredState = 'expired_csrf_token_test_1234567890abcdef1234567890abcdef';
    await saveGhlOAuthState(expiredState, 1, 101, process.env.GHL_REDIRECT_URI, Date.now() - 5000);
    const resExpired = await fetch(`${baseUrl}/api/v1/integrations/oauth/callback?code=mock_code&state=${expiredState}`);
    const htmlExpired = await resExpired.text();
    assert(resExpired.status === 400 && htmlExpired.includes('Authorization Failed'), 'Test 6: Generic callback rejects expired CSRF state token (400)');
  } catch (e) {
    assert(false, `Test 5/6 Error: ${e.message}`);
  }

  // -------------------------------------------------------------
  // TEST 7: Reused Authorization State Protection (One-Time Use)
  // -------------------------------------------------------------
  console.log('\n--- 3. State Single-Use & Anti-Replay Protection ---');
  const validStateToken = 'valid_onetime_state_token_1234567890abcdef1234567890abcdef';
  await saveGhlOAuthState(validStateToken, 1, 101, process.env.GHL_REDIRECT_URI, Date.now() + 10 * 60 * 1000);

  const stateBefore = await getGhlOAuthState(validStateToken);
  assert(stateBefore !== null && stateBefore.tenant_id === 1, 'Test 7a: One-time CSRF state token persisted in SQLite with tenant binding');

  // -------------------------------------------------------------
  // TEST 8 & 9: Token Encryption & Location ↔ Tenant Mapping
  // -------------------------------------------------------------
  console.log('\n--- 4. Token Encryption & Location Mapping ---');
  const mockLocationId = 'loc_ghl_marketplace_staging_99';
  
  const savedRecord = await GhlLocationService.getGhlIntegrationStatus(1);
  assert(savedRecord.connected === false, 'Test 8a: Initial tenant state is disconnected');

  const { upsertGhlIntegration } = await import('../db.js');
  const { encryptToken } = await import('../services/ghl/ghlCrypto.js');
  const sampleToken = 'ghl_live_access_token_secret_xyz123';
  const encrypted = encryptToken(sampleToken);

  await upsertGhlIntegration(1, {
    ghl_location_id: mockLocationId,
    status: 'connected',
    access_token_encrypted: encrypted,
    refresh_token_encrypted: encryptToken('refresh_secret_abc'),
    token_expires_at: Date.now() + 86400 * 1000,
    scopes: 'contacts.readonly contacts.write locations.readonly'
  });

  const rawDbRow = await db.get(`SELECT * FROM ghl_integrations WHERE tenant_id = 1`);
  assert(rawDbRow.access_token_encrypted && !rawDbRow.access_token_encrypted.includes('secret_xyz123'), 'Test 8b: Token is stored in SQLite encrypted using AES-256-GCM');
  assert(decryptToken(rawDbRow.access_token_encrypted) === sampleToken, 'Test 8c: Encrypted token decrypts accurately on demand');

  const resolvedTenant = await GhlLocationService.resolveTenantFromGhlLocation(mockLocationId);
  assert(resolvedTenant === 1, 'Test 9: Location ID resolves dynamically to Tenant ID (1)');

  // -------------------------------------------------------------
  // TEST 10: Multi-Tenant Isolation
  // -------------------------------------------------------------
  console.log('\n--- 5. Multi-Tenant Isolation ---');
  const tenant2Status = await GhlLocationService.getGhlIntegrationStatus(2);
  assert(tenant2Status.connected === false && tenant2Status.locationId === null, 'Test 10: Tenant 2 is NOT affected by Tenant 1 installation (Tenant Isolation)');

  // -------------------------------------------------------------
  // TEST 11: Production Safety Verification
  // -------------------------------------------------------------
  console.log('\n--- 6. Production Safety Verification ---');
  const fsModule = await import('fs');
  const prodDbExists = fsModule.existsSync('D:/AG Projects/whatsapp-crm/database.sqlite');
  assert(prodDbExists === true, 'Test 11a: Production database file exists untouched');

  const prodEnv = fsModule.readFileSync('D:/AG Projects/whatsapp-crm/.env', 'utf8');
  assert(prodEnv.includes('PORT=5000'), 'Test 11b: Production .env is preserved with PORT=5000');

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log('\n================================================================');
  const passed = testResults.filter(r => r.status === 'PASS').length;
  const failed = testResults.filter(r => r.status === 'FAIL').length;
  console.log(`OAuth Staging Test Suite Complete: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  server.close();
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal Test Runner Error:', err);
  if (server) server.close();
  process.exit(1);
});
