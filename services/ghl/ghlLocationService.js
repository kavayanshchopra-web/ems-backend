import { 
  getGhlIntegrationByTenant, 
  getGhlIntegrationByLocation, 
  disconnectGhlIntegration 
} from '../../db.js';

export class GhlLocationService {
  /**
   * Resolves the EMS tenant ID mapped to a GHL Location ID.
   */
  static async resolveTenantFromGhlLocation(locationId) {
    if (!locationId) return null;
    const record = await getGhlIntegrationByLocation(locationId);
    return record ? record.tenant_id : null;
  }

  /**
   * Retrieves clean integration status for the tenant without exposing encrypted tokens.
   */
  static async getGhlIntegrationStatus(tenantId) {
    if (!tenantId) throw new Error('tenantId is required');
    const integration = await getGhlIntegrationByTenant(tenantId);

    if (!integration) {
      return {
        connected: false,
        status: 'disconnected',
        tenantId,
        locationId: null,
        lastConnectedAt: null,
        lastSyncAt: null,
        scopes: null
      };
    }

    return {
      connected: integration.status === 'connected',
      status: integration.status,
      tenantId: integration.tenant_id,
      locationId: integration.ghl_location_id,
      userType: integration.user_type,
      ghlUserId: integration.ghl_user_id,
      scopes: integration.scopes,
      lastConnectedAt: integration.last_connected_at,
      lastSyncAt: integration.last_sync_at,
      tokenExpiresAt: integration.token_expires_at,
      metadata: integration.metadata ? JSON.parse(integration.metadata) : null
    };
  }

  /**
   * Disconnects GHL integration for a tenant.
   */
  static async disconnect(tenantId) {
    if (!tenantId) throw new Error('tenantId is required');
    await disconnectGhlIntegration(tenantId);
    return {
      success: true,
      message: `GHL integration for tenant ${tenantId} has been disconnected.`
    };
  }
}

export default GhlLocationService;
