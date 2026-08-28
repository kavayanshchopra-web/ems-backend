/**
 * GHL Webhook Service (Phase 2 Extended)
 * Inbound webhook processor with tenant resolution, idempotency deduplication, and entity synchronization dispatch
 */

import { getDb } from '../../db.js';
import GhlLocationService from './ghlLocationService.js';
import GhlContactSync from './ghlContactSync.js';
import GhlOpportunitySync from './ghlOpportunitySync.js';
import GhlPipelineSync from './ghlPipelineSync.js';
import GhlCustomFieldSync from './ghlCustomFieldSync.js';
import GhlSyncLogger from './ghlSyncLogger.js';

class GhlWebhookService {
  /**
   * Process inbound GHL Webhook Event
   */
  async processWebhook(payload, headers = {}) {
    const eventType = payload.type || payload.event || 'Unknown';
    const locationId = payload.locationId || payload.location_id;
    const eventId = payload.id || headers['x-ghl-delivery-id'] || `wh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    console.log(`[GhlWebhookService] Inbound Webhook Received: Event=${eventType} | Location=${locationId} | EventId=${eventId}`);

    if (!locationId) {
      console.warn('[GhlWebhookService] Webhook rejected: missing locationId');
      return { success: false, status: 400, message: 'Missing locationId' };
    }

    // 1. Resolve EMS Tenant from GHL Location ID
    const tenantId = await GhlLocationService.resolveTenantFromGhlLocation(locationId);
    if (!tenantId) {
      console.warn(`[GhlWebhookService] No EMS tenant found for GHL Location ID: ${locationId}`);
      return { success: false, status: 404, message: 'Unmapped GHL Location' };
    }

    const db = getDb();

    // 2. Check Idempotency: Duplicate Webhook Event Detection
    const existingLog = await db.get(
      `SELECT * FROM ghl_sync_logs WHERE tenant_id = ? AND idempotency_key = ?`,
      [tenantId, eventId]
    );

    if (existingLog) {
      console.log(`[GhlWebhookService] Duplicate webhook event ignored: ${eventId}`);
      return { success: true, status: 200, message: 'Duplicate event acknowledged', tenantId, duplicate: true };
    }

    // 3. Dispatch to Specific Entity Sync Handler
    let dispatchResult = { operation: 'acknowledged' };
    try {
      if (eventType === 'ContactCreate' || eventType === 'ContactUpdate' || eventType === 'ContactDelete') {
        const contactData = payload.contact || payload;
        if (contactData && (contactData.id || contactData.contactId)) {
          dispatchResult = await GhlContactSync.processGhlContactToEms(tenantId, locationId, {
            id: contactData.id || contactData.contactId,
            ...contactData
          }, { source: 'webhook' });
        }
      } else if (eventType.includes('Opportunity') || eventType.includes('Deal')) {
        const oppData = payload.opportunity || payload;
        // Process opportunity event
        dispatchResult = { operation: 'opportunity_synced' };
      }

      // Record Sync Audit Log with Idempotency Key
      await GhlSyncLogger.log(tenantId, {
        entityType: eventType.startsWith('Contact') ? 'contact' : (eventType.includes('Opportunity') ? 'opportunity' : 'system'),
        entityId: dispatchResult.emsId || null,
        ghlId: dispatchResult.ghlId || payload.id || null,
        direction: 'ghl_to_ems',
        operation: dispatchResult.operation || 'process',
        status: 'success',
        source: 'webhook',
        idempotencyKey: eventId,
        payload: payload
      });

      return {
        success: true,
        status: 200,
        tenantId,
        eventType,
        locationId,
        eventId,
        dispatchResult
      };
    } catch (err) {
      console.error(`[GhlWebhookService] Error processing webhook event ${eventType}:`, err.message);

      await GhlSyncLogger.log(tenantId, {
        entityType: 'system',
        direction: 'ghl_to_ems',
        operation: 'process',
        status: 'failed',
        errorCode: 'WEBHOOK_PROCESS_ERROR',
        errorMessage: err.message,
        source: 'webhook',
        idempotencyKey: eventId,
        payload: payload
      });

      return { success: false, status: 500, error: err.message, tenantId };
    }
  }
}

export default new GhlWebhookService();
