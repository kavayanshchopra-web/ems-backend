import { 
  getGhlIntegrationByTenant, 
  updateGhlTokens, 
  updateGhlStatus 
} from '../../db.js';
import { encryptToken, decryptToken } from './ghlCrypto.js';

const GHL_OAUTH_TOKEN_URL = 'https://services.leadconnectorhq.com/oauth/token';
const EXPIRY_BUFFER_MS = 5 * 60 * 1000; // 5 minute proactive refresh buffer

export class GhlTokenService {
  /**
   * Retrieves a valid, decrypted access token for the given tenant.
   * Proactively triggers token refresh if token is within 5 minutes of expiration.
   */
  static async getValidAccessToken(tenantId) {
    if (!tenantId) throw new Error('tenantId is required');

    const integration = await getGhlIntegrationByTenant(tenantId);
    if (!integration) {
      throw new Error(`No GHL integration found for tenant ${tenantId}`);
    }

    if (integration.status === 'disconnected') {
      throw new Error(`GHL integration for tenant ${tenantId} is disconnected`);
    }

    const now = Date.now();
    const isExpiredOrExpiringSoon = !integration.token_expires_at || (integration.token_expires_at - now < EXPIRY_BUFFER_MS);

    if (isExpiredOrExpiringSoon) {
      console.log(`[GhlTokenService] Access token for tenant ${tenantId} is expiring/expired. Refreshing...`);
      return await this.refreshAccessToken(tenantId, integration);
    }

    try {
      return decryptToken(integration.access_token_encrypted);
    } catch (err) {
      console.error(`[GhlTokenService] Failed to decrypt access token for tenant ${tenantId}:`, err.message);
      await updateGhlStatus(tenantId, 'error');
      throw new Error('Failed to decrypt GHL access token');
    }
  }

  /**
   * Refreshes the access token using the stored refresh token.
   */
  static async refreshAccessToken(tenantId, existingIntegration = null) {
    const integration = existingIntegration || await getGhlIntegrationByTenant(tenantId);
    if (!integration) {
      throw new Error(`No GHL integration found for tenant ${tenantId}`);
    }

    if (!integration.refresh_token_encrypted) {
      await updateGhlStatus(tenantId, 'reauth_required');
      throw new Error(`No refresh token available for tenant ${tenantId}. Reauthorization required`);
    }

    let refreshToken;
    try {
      refreshToken = decryptToken(integration.refresh_token_encrypted);
    } catch (err) {
      await updateGhlStatus(tenantId, 'reauth_required');
      throw new Error(`Failed to decrypt refresh token for tenant ${tenantId}: ${err.message}`);
    }

    const clientId = process.env.GHL_CLIENT_ID;
    const clientSecret = process.env.GHL_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('GHL server credentials (GHL_CLIENT_ID / GHL_CLIENT_SECRET) are missing');
    }

    const bodyParams = new URLSearchParams();
    bodyParams.append('client_id', clientId);
    bodyParams.append('client_secret', clientSecret);
    bodyParams.append('grant_type', 'refresh_token');
    bodyParams.append('refresh_token', refreshToken);

    try {
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
        console.error(`[GhlTokenService] Refresh failed for tenant ${tenantId}:`, data);
        // If refresh token is expired or revoked, mark integration as reauth_required
        await updateGhlStatus(tenantId, 'reauth_required');
        throw new Error(data.message || data.error_description || 'GHL Token Refresh Rejected by Server');
      }

      const expiresInSeconds = parseInt(data.expires_in, 10) || 86400;
      const tokenExpiresAt = Date.now() + expiresInSeconds * 1000;

      const accessTokenEncrypted = encryptToken(data.access_token);
      const refreshTokenEncrypted = encryptToken(data.refresh_token);

      await updateGhlTokens(tenantId, {
        access_token_encrypted: accessTokenEncrypted,
        refresh_token_encrypted: refreshTokenEncrypted,
        token_expires_at: tokenExpiresAt,
        status: 'connected'
      });

      console.log(`[GhlTokenService] Successfully refreshed GHL tokens for tenant ${tenantId}`);
      return data.access_token;
    } catch (err) {
      console.error(`[GhlTokenService] Token refresh error for tenant ${tenantId}:`, err.message);
      throw err;
    }
  }
}

export default GhlTokenService;
