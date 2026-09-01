import { encryptToken, decryptToken, maskToken } from './ghlCrypto.js';
import { 
  saveGhlIntegration, 
  getGhlIntegrationByLocation, 
  getGhlIntegrationByTenant, 
  getAllActiveGhlIntegrations,
  disconnectGhlIntegration,
  getExpiringGhlIntegrations,
  createGhlSyncLog
} from '../../db.js';

/**
 * GHL OAuth 2.0 & Token Lifecycle Management Service
 * Production-grade server-side authorization, AES-256-GCM token storage,
 * and automated expiry-driven token refresh daemon.
 * 
 * Verified against Official HighLevel API v2 OAuth Specifications:
 * - Authorization Endpoint: https://marketplace.gohighlevel.com/oauth/chooselocation
 * - Token Endpoint: https://services.leadconnectorhq.com/oauth/token
 * - Grant Types: authorization_code, refresh_token
 */
export class GhlAuthService {
  constructor() {
    this.tokenEndpoint = 'https://services.leadconnectorhq.com/oauth/token';
    this.authorizationBaseUrl = 'https://marketplace.gohighlevel.com/oauth/chooselocation';
    this.refreshLocks = new Set(); // Concurrency guard to prevent duplicate concurrent refreshes
    this.workerTimer = null;
  }

  /**
   * Generates the official HighLevel Marketplace 1-Click Installation Authorization URL.
   * @param {Object} params
   * @param {string} [params.clientId] - HighLevel Marketplace App Client ID
   * @param {string} [params.redirectUri] - Backend OAuth callback URI
   * @param {Array<string>} [params.scopes] - Requested HighLevel permission scopes
   * @param {string} [params.state] - Cryptographic CSRF state token
   * @returns {string} Fully qualified OAuth authorization URL
   */
  getAuthorizationUrl({ clientId, redirectUri, scopes = [], state = '' }) {
    const cleanClientId = (clientId || process.env.GHL_CLIENT_ID || '').trim();
    if (!cleanClientId) {
      throw new Error('[GhlAuthService] GHL Client ID is required to generate Authorization URL');
    }

    let cleanScopes = '';
    if (scopes && scopes.length > 0) {
      cleanScopes = scopes.join(' ');
    } else if (process.env.GHL_SCOPES) {
      cleanScopes = process.env.GHL_SCOPES.replace(/,/g, ' ').trim();
    } else {
      cleanScopes = 'contacts.readonly contacts.write';
    }

    const cleanRedirect = (redirectUri || process.env.GHL_REDIRECT_URI || 'https://api.employeemanagementsystems.com/api/v1/integrations/marketplace/oauth/callback').trim();

    const query = new URLSearchParams({
      response_type: 'code',
      client_id: cleanClientId,
      redirect_uri: cleanRedirect,
      scope: cleanScopes
    });

    if (state) {
      query.append('state', state);
    }

    return `${this.authorizationBaseUrl}?${query.toString()}`;
  }

  /**
   * Exchanges an authorization code for HighLevel Access & Refresh tokens.
   * Encrypts tokens using AES-256-GCM before saving to database.
   * 
   * @param {Object} params
   * @param {number} params.tenantId - The authenticating EMS tenant ID
   * @param {string} params.code - Authorization code from HighLevel OAuth callback
   * @param {string} [params.redirectUri] - The registered OAuth redirect URI
   * @returns {Promise<Object>} Safe connection summary (no tokens exposed)
   */
  async exchangeCodeForToken({ tenantId, code, redirectUri }) {
    if (!code) throw new Error('[GhlAuthService] Authorization code is required');

    const clientId = (process.env.GHL_CLIENT_ID || '').trim();
    const clientSecret = (process.env.GHL_CLIENT_SECRET || '').trim();
    const callbackUri = (redirectUri || process.env.GHL_REDIRECT_URI || 'https://api.employeemanagementsystems.com/api/v1/integrations/marketplace/oauth/callback').trim();

    if (!clientId || !clientSecret) {
      throw new Error('[GhlAuthService] GHL_CLIENT_ID and GHL_CLIENT_SECRET must be configured in environment');
    }

    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('grant_type', 'authorization_code');
    params.append('code', code.trim());
    params.append('redirect_uri', callbackUri);
    params.append('user_type', 'Location');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    let response;
    let data;

    try {
      response = await fetch(this.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: params.toString(),
        signal: controller.signal
      });

      data = await response.json();
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      const isTimeout = fetchErr.name === 'AbortError';
      const msg = isTimeout ? 'HighLevel token endpoint timed out after 10s' : fetchErr.message;
      
      await createGhlSyncLog(tenantId || 'system', {
        locationId: 'unknown',
        direction: 'INBOUND',
        eventType: 'OAuthTokenExchangeFailed',
        status: 'FAILED',
        httpStatus: 504,
        errorMessage: msg
      });

      throw new Error(`[GhlAuthService] Token exchange failed: ${msg}`);
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok || !data.access_token) {
      const errorMsg = data.error_description || data.message || data.error || `HTTP ${response.status}`;
      
      await createGhlSyncLog(tenantId || 'system', {
        locationId: data.locationId || 'unknown',
        direction: 'INBOUND',
        eventType: 'OAuthTokenExchangeFailed',
        status: 'FAILED',
        httpStatus: response.status,
        errorMessage: errorMsg
      });

      throw new Error(`[GhlAuthService] HighLevel rejected token exchange: ${errorMsg}`);
    }

    // HighLevel returns locationId (or sub-account ID)
    const locationId = data.locationId || data.location_id || `loc_${Date.now()}`;
    const effectiveTenantId = tenantId && tenantId !== 'undefined' && tenantId !== 'null' ? tenantId : `org_${locationId}`;
    const companyId = data.companyId || data.company_id || '';
    const userId = data.userId || data.user_id || '';
    const userType = data.userType || 'Location';
    const expiresIn = data.expires_in || 86400; // 24 hours standard
    const scope = data.scope || '';

    // Calculate expiry: 5 minutes prior to actual expiration for safe proactive refresh
    const expiresAt = new Date(Date.now() + (expiresIn - 300) * 1000).toISOString();

    // Encrypt sensitive token material
    const encryptedAccessToken = encryptToken(data.access_token);
    const encryptedRefreshToken = data.refresh_token ? encryptToken(data.refresh_token) : '';

    // Persist securely into SQLite ghl_integrations
    await saveGhlIntegration(effectiveTenantId, {
      locationId,
      companyId,
      userId,
      userType,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      tokenType: data.token_type || 'Bearer',
      expiresIn,
      expiresAt,
      scope,
      isActive: 1,
      metadata: {
        installedAt: new Date().toISOString(),
        maskedToken: maskToken(data.access_token)
      }
    });

    // Record audit log
    await createGhlSyncLog(effectiveTenantId, {
      locationId,
      direction: 'INBOUND',
      eventType: 'OAuthInstalled',
      status: 'SUCCESS',
      httpStatus: 200,
      payload: { locationId, companyId, scope, expiresIn }
    });

    return {
      success: true,
      tenantId: effectiveTenantId,
      locationId,
      companyId,
      scope,
      expiresAt,
      message: 'GoHighLevel sub-account connected successfully'
    };
  }

  /**
   * Refreshes an expired or expiring HighLevel Access Token using stored Refresh Token.
   * Encrypted tokens are decrypted, exchanged, re-encrypted, and updated atomically.
   * 
   * @param {string} locationId - The GHL location identifier to refresh
   * @returns {Promise<Object>} Refresh result status
   */
  async refreshLocationToken(locationId) {
    if (!locationId) throw new Error('[GhlAuthService] locationId is required for token refresh');

    // Concurrency guard: Avoid parallel duplicate refreshes for the same location
    if (this.refreshLocks.has(locationId)) {
      return { status: 'in_flight', message: 'Token refresh already in progress for this location' };
    }

    this.refreshLocks.add(locationId);

    try {
      const integration = await getGhlIntegrationByLocation(locationId);
      if (!integration || !integration.refresh_token) {
        throw new Error(`[GhlAuthService] No active integration or refresh token found for location: ${locationId}`);
      }

      const tenantId = integration.tenant_id;
      const rawRefreshToken = decryptToken(integration.refresh_token);

      const clientId = (process.env.GHL_CLIENT_ID || '').trim();
      const clientSecret = (process.env.GHL_CLIENT_SECRET || '').trim();

      const params = new URLSearchParams();
      params.append('client_id', clientId);
      params.append('client_secret', clientSecret);
      params.append('grant_type', 'refresh_token');
      params.append('refresh_token', rawRefreshToken);
      params.append('user_type', integration.user_type || 'Location');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      let response;
      let data;

      try {
        response = await fetch(this.tokenEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          body: params.toString(),
          signal: controller.signal
        });

        data = await response.json();
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok || !data.access_token) {
        const errorMsg = data.error_description || data.message || data.error || `HTTP ${response.status}`;
        
        // If refresh token is revoked or invalid, mark integration as reauthorization required
        if (response.status === 400 || response.status === 401) {
          await saveGhlIntegration(tenantId, {
            locationId,
            isActive: 0,
            metadata: {
              reauthRequired: true,
              lastRefreshError: errorMsg,
              errorTimestamp: new Date().toISOString()
            }
          });
        }

        await createGhlSyncLog(tenantId, {
          locationId,
          direction: 'INBOUND',
          eventType: 'OAuthTokenRefreshFailed',
          status: 'FAILED',
          httpStatus: response.status,
          errorMessage: errorMsg
        });

        throw new Error(`[GhlAuthService] HighLevel token refresh rejected: ${errorMsg}`);
      }

      const expiresIn = data.expires_in || 86400;
      const expiresAt = new Date(Date.now() + (expiresIn - 300) * 1000).toISOString();
      const encryptedAccess = encryptToken(data.access_token);
      const encryptedRefresh = data.refresh_token ? encryptToken(data.refresh_token) : integration.refresh_token;

      await saveGhlIntegration(tenantId, {
        locationId,
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        expiresIn,
        expiresAt,
        scope: data.scope || integration.scope,
        isActive: 1,
        metadata: {
          lastRefreshedAt: new Date().toISOString(),
          maskedToken: maskToken(data.access_token)
        }
      });

      await createGhlSyncLog(tenantId, {
        locationId,
        direction: 'INBOUND',
        eventType: 'OAuthTokenRefreshSuccess',
        status: 'SUCCESS',
        httpStatus: 200,
        payload: { locationId, expiresIn }
      });

      return {
        success: true,
        locationId,
        expiresAt,
        message: 'Token refreshed and saved securely'
      };
    } finally {
      this.refreshLocks.delete(locationId);
    }
  }

  /**
   * Scans active integrations and refreshes any tokens nearing expiry (within 15 minutes).
   * @returns {Promise<Array>} Refresh results summary
   */
  async checkAndRefreshExpiringTokens() {
    const expiring = await getExpiringGhlIntegrations(15);
    const results = [];

    for (const integration of expiring) {
      try {
        const res = await this.refreshLocationToken(integration.location_id);
        results.push({ locationId: integration.location_id, status: 'refreshed', ...res });
      } catch (err) {
        console.warn(`[GhlAuthService] Background refresh failed for location ${integration.location_id}:`, err.message);
        results.push({ locationId: integration.location_id, status: 'error', error: err.message });
      }
    }

    return results;
  }

  /**
   * Starts the expiry-driven background refresh worker.
   * Runs periodically (default: every 5 minutes) to ensure continuous token validity.
   * @param {number} [intervalMs=300000] - Interval in milliseconds (default 5 min)
   */
  startBackgroundRefreshWorker(intervalMs = 300000) {
    if (this.workerTimer) {
      clearInterval(this.workerTimer);
    }

    this.workerTimer = setInterval(async () => {
      try {
        await this.checkAndRefreshExpiringTokens();
      } catch (err) {
        console.error('[GhlAuthService] Background worker error:', err.message);
      }
    }, intervalMs);

    // Initial check on server startup (deferred by 5s)
    setTimeout(() => {
      this.checkAndRefreshExpiringTokens().catch(() => {});
    }, 5000);
  }

  /**
   * Stops the background refresh worker daemon.
   */
  stopBackgroundRefreshWorker() {
    if (this.workerTimer) {
      clearInterval(this.workerTimer);
      this.workerTimer = null;
    }
  }

  /**
   * Retrieves decrypted access token for internal backend API clients.
   * If token is approaching expiry, triggers proactive refresh first.
   * NEVER returns plaintext token to external API callers or frontend.
   * 
   * @param {string} locationId
   * @returns {Promise<string>} Plaintext access token for backend HTTP calls
   */
  async getValidAccessToken(locationId) {
    let integration = await getGhlIntegrationByLocation(locationId);
    if (!integration || !integration.access_token || integration.is_active !== 1) {
      throw new Error(`[GhlAuthService] No active GHL integration found for location: ${locationId}`);
    }

    // If token expires in less than 2 minutes, refresh immediately
    const expiresTime = new Date(integration.expires_at).getTime();
    if (Date.now() >= expiresTime - 120000) {
      try {
        await this.refreshLocationToken(locationId);
        integration = await getGhlIntegrationByLocation(locationId);
      } catch (refreshErr) {
        console.warn(`[GhlAuthService] On-demand token refresh failed for ${locationId}:`, refreshErr.message);
      }
    }

    try {
      return decryptToken(integration.access_token);
    } catch (cryptoErr) {
      throw new Error(`[GhlAuthService] HighLevel access token format invalid for location "${locationId}". Re-authorization required via 1-Click OAuth.`);
    }
  }

  /**
   * Disconnects GHL integration for an EMS tenant.
   * @param {number} tenantId
   * @returns {Promise<Object>}
   */
  async disconnectTenant(tenantId) {
    if (!tenantId) throw new Error('[GhlAuthService] tenantId is required to disconnect');

    const integration = await getGhlIntegrationByTenant(tenantId);
    const locationId = integration?.location_id || 'unknown';

    await disconnectGhlIntegration(tenantId);

    await createGhlSyncLog(tenantId, {
      locationId,
      direction: 'OUTBOUND',
      eventType: 'OAuthDisconnected',
      status: 'SUCCESS',
      payload: { tenantId, disconnectedAt: new Date().toISOString() }
    });

    return {
      success: true,
      message: 'GoHighLevel disconnected successfully'
    };
  }

  /**
   * Retrieves safe connection status for frontend display without exposing tokens.
   * @param {number|string} tenantId
   */
  async getTenantConnectionStatus(tenantId) {
    if (!tenantId) {
      return { connected: false, locationId: null, companyId: null, tenantId: null };
    }
    const integration = await getGhlIntegrationByTenant(tenantId);
    if (!integration || integration.is_active !== 1) {
      return { connected: false, locationId: null, companyId: null, tenantId: String(tenantId) };
    }

    // Validate that stored access token is genuine and encrypted
    let isValidToken = false;
    if (integration.access_token) {
      try {
        const decrypted = decryptToken(integration.access_token);
        if (decrypted && decrypted.length > 3) {
          isValidToken = true;
        }
      } catch (e) {
        isValidToken = false;
      }
    }

    if (!isValidToken) {
      return {
        connected: false,
        reauthRequired: true,
        locationId: integration.location_id,
        companyId: integration.company_id,
        tenantId: String(integration.tenant_id),
        error: 'HighLevel OAuth authorization required for this sub-account.'
      };
    }

    return {
      connected: true,
      locationId: integration.location_id,
      companyId: integration.company_id,
      tenantId: String(integration.tenant_id),
      scope: integration.scope,
      installedAt: integration.installed_at || integration.created_at,
      updatedAt: integration.updated_at,
      lastSyncAt: integration.last_sync_at,
      expiresAt: integration.expires_at,
      syncSettings: {
        contacts: integration.sync_contacts === 1,
        conversations: integration.sync_conversations === 1,
        calls: integration.sync_calls === 1,
        opportunities: integration.sync_opportunities === 1
      }
    };
  }
}

export default new GhlAuthService();
