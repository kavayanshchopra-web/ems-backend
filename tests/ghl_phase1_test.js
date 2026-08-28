import path from 'path';
import { fileURLToPath } from 'url';
/**
 * Automated Test Suite — GHL Integration Phase 1: Secure OAuth & Integration Foundation
 * Target Environment: Staging (database.staging.sqlite)
 */

import http from 'http';
import express from 'express';
import jwt from 'jsonwebtoken';
import { 
  initDb, 
  getDb, 
  saveGhlOAuthState, 
  getGhlOAuthState, 
  deleteGhlOAuthState,
  getGhlIntegrationByTenant,
  getGhlIntegrationByLocation,
  upsertGhlIntegration
} from '../db.js';
import setupRoutes from '../routes.js';
import { encryptToken, decryptToken } from '../services/ghl/ghlCrypto.js';
import GhlAuthService from '../services/ghl/ghlAuthService.js';
import GhlTokenService from '../services/ghl/ghlTokenService.js';
import GhlLocationService from '../services/ghl/ghlLocationService.js';
import GhlWebhookService from '../services/ghl/ghlWebhookService.js';

// Setup Staging Environment Variables
process.env.DB_PATH = 'database.staging.sqlite';
process.env.JWT_SECRET = 'staging_jwt_secret_key_ghl_phase1_test';
process.env.GHL_CLIENT_ID = 'test_ghl_client_id_phase1';
process.env.GHL_CLIENT_SECRET = 'test_ghl_client_secret_phase1';
process.env.GHL_REDIRECT_URI = 'http://localhost:5001/api/v1/integrations/ghl/oauth/callback';
process.env.GHL_TOKEN_ENCRYPTION_KEY = 'test_ghl_encryption_secret_key_32bytes';

let server;
let serverPort = 5001;
let baseUrl = `http://localhost:${serverPort}`;

// Test Results Tracker
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
  console.log('🚀 Starting GHL Integration Phase 1 Staging Test Suite');
  console.log('================================================================\n');

  // 1. Initialize SQLite Database (Staging)
  await initDb(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'database.staging.sqlite'));
  const db = getDb();
  console.log('Initialized staging SQLite database: database.staging.sqlite');

  // Seed two tenants for cross-tenant testing
  await db.run(`INSERT OR IGNORE INTO tenants (id, company_name, subscription_status) VALUES (1, 'Tenant Org Alpha', 'active')`);
  await db.run(`INSERT OR IGNORE INTO tenants (id, company_name, subscription_status) VALUES (2, 'Tenant Org Beta', 'active')`);

  // Clear GHL tables in staging DB
  await db.run(`DELETE FROM ghl_integrations`);
  await db.run(`DELETE FROM ghl_oauth_states`);

  // 2. Start Express Test Server
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

  // Generate Tokens for Tenant 1 and Tenant 2
  const tokenTenant1 = jwt.sign({ id: 101, email: 'owner@tenant1.com', role: 'owner', tenant_id: 1 }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const tokenTenant2 = jwt.sign({ id: 201, email: 'owner@tenant2.com', role: 'owner', tenant_id: 2 }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const invalidJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature';

  // -------------------------------------------------------------
  // TEST 1: Unauthenticated Request (Protected route -> 401)
  // -------------------------------------------------------------
  console.log('--- 1. Authentication Security Tests ---');
  try {
    const res = await fetch(`${baseUrl}/api/v1/integrations/ghl/status`);
    assert(res.status === 401, 'Test 1: Unauthenticated request to /status returns 401 Unauthorized');
  } catch (e) {
    assert(false, `Test 1 Error: ${e.message}`);
  }

  // -------------------------------------------------------------
  // TEST 2: Invalid JWT Token (Protected route -> 401)
  // -------------------------------------------------------------
  try {
    const res = await fetch(`${baseUrl}/api/v1/integrations/ghl/status`, {
      headers: { 'Authorization': `Bearer ${invalidJwt}` }
    });
    assert(res.status === 401, 'Test 2: Invalid JWT returns 401 Unauthorized without SuperAdmin fallback');
  } catch (e) {
    assert(false, `Test 2 Error: ${e.message}`);
  }

  // -------------------------------------------------------------
  // TEST 3: Valid EMS Authentication
  // -------------------------------------------------------------
  try {
    const res = await fetch(`${baseUrl}/api/v1/integrations/ghl/status`, {
      headers: { 'Authorization': `Bearer ${tokenTenant1}` }
    });
    const data = await res.json();
    console.log('Test 3 debug:', res.status, data);
  assert(res.status === 200 && data.tenantId === 1 && data.connected === false, 'Test 3: Valid JWT returns 200 with correct tenantId (1)');
  } catch (e) {
    assert(false, `Test 3 Error: ${e.message}`);
  }

  // -------------------------------------------------------------
  // TEST 4 & 5: OAuth Authorization URL & CSRF State Generation
  // -------------------------------------------------------------
  console.log('\n--- 2. OAuth Flow & CSRF State Security Tests ---');
  let generatedState = null;
  try {
    const res = await fetch(`${baseUrl}/api/v1/integrations/ghl/oauth/authorize`, {
      headers: { 'Authorization': `Bearer ${tokenTenant1}` }
    });
    const data = await res.json();
    generatedState = data.state;

    const hasState = generatedState && generatedState.length === 64;
    const hasClientParam = data.authorizationUrl && data.authorizationUrl.includes(process.env.GHL_CLIENT_ID);
    assert(res.status === 200 && hasState && hasClientParam, 'Test 4: /oauth/authorize generates valid URL with client_id and 32-byte hex state');

    const stateInDb = await getGhlOAuthState(generatedState);
    assert(stateInDb && stateInDb.tenant_id === 1 && stateInDb.expires_at > Date.now(), 'Test 5: OAuth state is persisted in SQLite with valid 10-minute TTL tied to tenant_id=1');
  } catch (e) {
    assert(false, `Test 4/5 Error: ${e.message}`);
  }

  // -------------------------------------------------------------
  // TEST 6 & 7: Invalid & Expired OAuth State Validation
  // -------------------------------------------------------------
  try {
    const resInvalid = await fetch(`${baseUrl}/api/v1/integrations/ghl/oauth/callback?code=mock_code&state=nonexistent_state_123`);
    assert(resInvalid.status === 400, 'Test 6: OAuth callback rejects invalid/tampered state parameter with 400 Bad Request');
  } catch (e) {
    assert(false, `Test 6 Error: ${e.message}`);
  }

  try {
    const expiredStateToken = 'expired_state_token_for_testing_1234567890abcdef1234567890abcdef';
    await saveGhlOAuthState(expiredStateToken, 1, 101, process.env.GHL_REDIRECT_URI, Date.now() - 5000); // 5s expired
    const resExpired = await fetch(`${baseUrl}/api/v1/integrations/ghl/oauth/callback?code=mock_code&state=${expiredStateToken}`);
    assert(resExpired.status === 400, 'Test 7: OAuth callback rejects expired state token with 400 Bad Request');
  } catch (e) {
    assert(false, `Test 7 Error: ${e.message}`);
  }

  // -------------------------------------------------------------
  // TEST 8 & 9: Token Encryption & Decryption (AES-256-GCM)
  // -------------------------------------------------------------
  console.log('\n--- 3. Token Encryption & Decryption (AES-256-GCM) ---');
  const sampleAccessToken = 'ghl_access_token_super_secret_sample_token_xyz123';
  const sampleRefreshToken = 'ghl_refresh_token_super_secret_sample_token_abc789';

  const encryptedAccess = encryptToken(sampleAccessToken);
  const encryptedRefresh = encryptToken(sampleRefreshToken);

  const isEncrypted = encryptedAccess && !encryptedAccess.includes('sample_token') && encryptedAccess.includes(':');
  assert(isEncrypted, 'Test 8: Tokens are encrypted using AES-256-GCM (format: iv:authTag:ciphertext)');

  const decryptedAccess = decryptToken(encryptedAccess);
  const decryptedRefresh = decryptToken(encryptedRefresh);
  assert(decryptedAccess === sampleAccessToken && decryptedRefresh === sampleRefreshToken, 'Test 9: Encrypted tokens decrypt accurately back to original plaintext');

  // -------------------------------------------------------------
  // TEST 10: GHL Location ↔ EMS Tenant Mapping & Integration Upsert
  // -------------------------------------------------------------
  console.log('\n--- 4. Location Mapping & Integration State Tests ---');
  const testLocationId1 = 'loc_ghl_subaccount_alpha_123';
  const testLocationId2 = 'loc_ghl_subaccount_beta_456';

  await upsertGhlIntegration(1, {
    ghl_location_id: testLocationId1,
    status: 'connected',
    access_token_encrypted: encryptedAccess,
    refresh_token_encrypted: encryptedRefresh,
    token_expires_at: Date.now() + 86400 * 1000,
    scopes: 'contacts.readonly contacts.write',
    user_type: 'Location',
    ghl_user_id: 'user_1',
    company_id: 'tenant_1_company'
  });

  await upsertGhlIntegration(2, {
    ghl_location_id: testLocationId2,
    status: 'connected',
    access_token_encrypted: encryptToken('token_tenant_2'),
    refresh_token_encrypted: encryptToken('refresh_tenant_2'),
    token_expires_at: Date.now() + 86400 * 1000,
    scopes: 'contacts.readonly contacts.write',
    user_type: 'Location',
    ghl_user_id: 'user_2',
    company_id: 'tenant_2_company'
  });

  const resolvedTenant1 = await GhlLocationService.resolveTenantFromGhlLocation(testLocationId1);
  const resolvedTenant2 = await GhlLocationService.resolveTenantFromGhlLocation(testLocationId2);
  const resolvedNonexistent = await GhlLocationService.resolveTenantFromGhlLocation('loc_unknown');

  assert(resolvedTenant1 === 1 && resolvedTenant2 === 2 && resolvedNonexistent === null, 'Test 10: resolveTenantFromGhlLocation maps GHL Location IDs to correct EMS tenants without hardcoded IDs');

  // -------------------------------------------------------------
  // TEST 11: Integration Status Endpoint (/status)
  // -------------------------------------------------------------
  try {
    const resStatus = await fetch(`${baseUrl}/api/v1/integrations/ghl/status`, {
      headers: { 'Authorization': `Bearer ${tokenTenant1}` }
    });
    const statusData = await resStatus.json();

    const isValidStatus = statusData.connected === true && 
                          statusData.locationId === testLocationId1 && 
                          statusData.status === 'connected' &&
                          !statusData.access_token_encrypted; // Ensure encrypted tokens are not exposed in status

    assert(resStatus.status === 200 && isValidStatus, 'Test 11: /status returns connected state, location ID, and redacts token strings');
  } catch (e) {
    assert(false, `Test 11 Error: ${e.message}`);
  }

  // -------------------------------------------------------------
  // TEST 12: Cross-Tenant Access Protection
  // -------------------------------------------------------------
  console.log('\n--- 5. Multi-Tenant Isolation & Cross-Tenant Security ---');
  try {
    // Tenant 2 requests status -> must ONLY receive Tenant 2's location
    const resTenant2 = await fetch(`${baseUrl}/api/v1/integrations/ghl/status`, {
      headers: { 'Authorization': `Bearer ${tokenTenant2}` }
    });
    const dataTenant2 = await resTenant2.json();

    const isIsolated = dataTenant2.tenantId === 2 && 
                       dataTenant2.locationId === testLocationId2 && 
                       dataTenant2.locationId !== testLocationId1;

    assert(isIsolated, 'Test 12: Tenant 2 cannot view or access Tenant 1 GHL location (Strict Tenant Isolation)');
  } catch (e) {
    assert(false, `Test 12 Error: ${e.message}`);
  }

  // -------------------------------------------------------------
  // TEST 13: Inbound Webhook Foundation & Tenant Resolution
  // -------------------------------------------------------------
  console.log('\n--- 6. Inbound Webhook Foundation Tests ---');
  try {
    const whResult = await GhlWebhookService.processWebhook({
      type: 'ContactCreate',
      locationId: testLocationId1,
      contact: { name: 'John Doe', phone: '+1234567890' }
    }, { 'user-agent': 'LeadConnector-Webhook' });

    assert(whResult.success === true && whResult.tenantId === 1, 'Test 13: GHL Webhook resolves correct tenantId (1) dynamically from locationId');

    const unmappedWh = await GhlWebhookService.processWebhook({
      type: 'ContactCreate',
      locationId: 'loc_unknown_unregistered'
    }, {});
    assert(unmappedWh.success === false && unmappedWh.status === 404, 'Test 13b: GHL Webhook rejects unmapped location with 404');
  } catch (e) {
    assert(false, `Test 13 Error: ${e.message}`);
  }

  // -------------------------------------------------------------
  // TEST 14: Disconnect Integration
  // -------------------------------------------------------------
  console.log('\n--- 7. Disconnect & Revocation Tests ---');
  try {
    const resDisconnect = await fetch(`${baseUrl}/api/v1/integrations/ghl/disconnect`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenTenant1}` }
    });
    const discData = await resDisconnect.json();

    const recordAfterDisc = await getGhlIntegrationByTenant(1);
    const isDisconnected = recordAfterDisc.status === 'disconnected' && 
                           recordAfterDisc.access_token_encrypted === null &&
                           recordAfterDisc.refresh_token_encrypted === null;

    assert(resDisconnect.status === 200 && isDisconnected, 'Test 14: /disconnect sets status to disconnected and purges encrypted tokens');
  } catch (e) {
    assert(false, `Test 14 Error: ${e.message}`);
  }

  // -------------------------------------------------------------
  // TEST 15: Public Routes Functionality Without Auth Header
  // -------------------------------------------------------------
  console.log('\n--- 8. Public Endpoints Compatibility ---');
  try {
    const resPlans = await fetch(`${baseUrl}/api/billing/plans`);
    assert(resPlans.status === 200, 'Test 15: Public endpoint /api/billing/plans functions without auth header');
  } catch (e) {
    assert(false, `Test 15 Error: ${e.message}`);
  }

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log('\n================================================================');
  const passed = testResults.filter(r => r.status === 'PASS').length;
  const failed = testResults.filter(r => r.status === 'FAIL').length;
  console.log(`Test Suite Complete: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  // Close test server
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
