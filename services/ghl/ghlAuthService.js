import crypto from 'crypto';
import { 
  saveGhlOAuthState, 
  getGhlOAuthState, 
  deleteGhlOAuthState, 
  cleanupExpiredGhlStates, 
  upsertGhlIntegration 
} from '../../db.js';
import { encryptToken } from './ghlCrypto.js';

const GHL_OAUTH_TOKEN_URL = 'https://services.leadconnectorhq.com/oauth/token';
const DEFAULT_SCOPES = 'contacts.readonly contacts.write conversations.readonly conversations.write locations.readonly workflows.readonly';

export class GhlAuthService {
  /**
   * Generates a secure authorization URL with cryptographically random CSRF state.
   * State is stored in DB with a 10-minute time-to-live (TTL).
   */
  static async generateAuthorizationUrl({ tenantId, userId, redirectUri, scopes = [] }) {
    if (!tenantId) throw new Error('tenantId is required for GHL authorization');

    const clientId = process.env.GHL_CLIENT_ID;
    if (!clientId) {
      throw new Error('GHL_CLIENT_ID is not configured on the server');
    }

    const cleanRedirect = redirectUri || process.env.GHL_REDIRECT_URI || 'https://staging.employeemanagementsystems.com/api/v1/integrations/oauth/callback';
    const cleanScopes = (scopes.length > 0 ? scopes.join(' ') : (process.env.GHL_SCOPES || DEFAULT_SCOPES)).trim();

    // 1. Generate 32-byte cryptographically secure random state
    const stateToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes from now

    // 2. Persist state in SQLite
    await cleanupExpiredGhlStates();
    await saveGhlOAuthState(stateToken, tenantId, userId || null, cleanRedirect, expiresAt);

    // 3. Build authorization URL
    const authUrl = `https://marketplace.gohighlevel.com/oauth/chooselocation?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(cleanRedirect)}&scope=${encodeURIComponent(cleanScopes)}&state=${encodeURIComponent(stateToken)}`;

    return {
      authorizationUrl: authUrl,
      state: stateToken,
      expiresAt
    };
  }

  /**
   * Validates incoming OAuth state and exchanges code for access & refresh tokens.
   */
  static async handleCallback({ code, state }) {
    if (!code) throw new Error('Authorization code is required from GHL callback');
    if (!state) throw new Error('State parameter is missing from GHL callback');

    // 1. Validate state from database
    const savedState = await getGhlOAuthState(state);
    if (!savedState) {
      throw new Error('Invalid or expired OAuth state parameter (CSRF protection failed)');
    }

    if (Date.now() > savedState.expires_at) {
      await deleteGhlOAuthState(state);
      throw new Error('OAuth state has expired. Please restart the authorization flow');
    }

    // 2. One-time use: delete state immediately
    await deleteGhlOAuthState(state);

    const tenantId = savedState.tenant_id;
    const clientId = process.env.GHL_CLIENT_ID;
    const clientSecret = process.env.GHL_CLIENT_SECRET;
    const redirectUri = savedState.redirect_uri || process.env.GHL_REDIRECT_URI;

    if (!clientId || !clientSecret) {
      throw new Error('GHL server credentials (GHL_CLIENT_ID / GHL_CLIENT_SECRET) are missing');
    }

    // 3. Exchange code for tokens via LeadConnector OAuth token endpoint
    const bodyParams = new URLSearchParams();
    bodyParams.append('client_id', clientId);
    bodyParams.append('client_secret', clientSecret);
    bodyParams.append('grant_type', 'authorization_code');
    bodyParams.append('code', code);
    bodyParams.append('redirect_uri', redirectUri);

    const response = await fetch(GHL_OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: bodyParams.toString()
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.message || data.error_description || data.error || 'Failed to exchange GHL authorization code';
      throw new Error(errorMsg);
    }

    const locationId = data.locationId || data.location_id;
    if (!locationId) {
      throw new Error('GHL token response did not contain a valid locationId');
    }

    const expiresInSeconds = parseInt(data.expires_in, 10) || 86400;
    const tokenExpiresAt = Date.now() + expiresInSeconds * 1000;

    // 4. Encrypt tokens before writing to database
    const accessTokenEncrypted = encryptToken(data.access_token);
    const refreshTokenEncrypted = encryptToken(data.refresh_token);

    const integrationPayload = {
      tenant_id: tenantId,
      ghl_location_id: locationId,
      status: 'connected',
      access_token_encrypted: accessTokenEncrypted,
      refresh_token_encrypted: refreshTokenEncrypted,
      token_expires_at: tokenExpiresAt,
      scopes: data.scope || savedState.scopes || '',
      user_type: data.userType || 'Location',
      ghl_user_id: data.userId || data.user_id || '',
      company_id: data.companyId || data.company_id || '',
      last_connected_at: new Date().toISOString(),
      metadata: JSON.stringify({
        planId: data.planId || null,
        installedAt: new Date().toISOString()
      })
    };

    // 5. Upsert integration record scoped to the state's tenant_id
    const savedIntegration = await upsertGhlIntegration(tenantId, integrationPayload);

    return {
      success: true,
      tenantId,
      locationId,
      status: 'connected',
      tokenExpiresAt,
      integration: savedIntegration
    };
  }
}

export default GhlAuthService;
