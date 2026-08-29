import crypto from 'crypto';
import ghlSyncEngine from './GhlSyncEngine.js';
import { GhlApiError } from './GhlApiClient.js';
import { calculatePayloadHash } from './ghlUtils.js';
import { 
  getGhlIntegrationByLocation,
  createGhlSyncLog,
  getGhlSyncLogByIdempotencyKey,
  getEmsEntityByGhlId,
  archiveContact,
  deleteGhlEntityLink
} from '../../db.js';

/**
 * Production-grade HighLevel Inbound Webhook Processing Service
 * Enforces cryptographic HMAC-SHA256 signature verification, fail-closed security,
 * tenant/location resolution, idempotency, loop suppression, and event lifecycle dispatching.
 */
export class GhlWebhookService {
  /**
   * Verifies incoming webhook HMAC-SHA256 signature against the configured shared secret.
   * Fail-closed in production if secret or signature is absent.
   * 
   * @param {string|Buffer} rawBody - Raw request body payload string or Buffer
   * @param {string} signatureHeader - Value of signature header (e.g. x-ghl-signature)
   * @param {string} [secretOverride] - Explicit secret for testing
   * @returns {boolean}
   */
  verifySignature(rawBody, signatureHeader, secretOverride = null) {
    const webhookSecret = secretOverride || process.env.GHL_WEBHOOK_SECRET;

    // Production Security: Must fail closed if secret is missing or empty
    if (!webhookSecret) {
      if (process.env.NODE_ENV === 'production') {
        console.error('[GhlWebhookService] Webhook rejected: GHL_WEBHOOK_SECRET is missing in production environment');
        return false;
      }
      // In local development / test mode with no secret configured, fail closed unless explicit dev override
      if (process.env.ALLOW_INSECURE_DEV_WEBHOOKS === 'true') {
        console.warn('[GhlWebhookService] Warning: Insecure development webhook bypass active');
        return true;
      }
      return false;
    }

    if (!signatureHeader || typeof signatureHeader !== 'string') {
      return false;
    }

    try {
      // Normalize signature header (strip "sha256=" prefix if provided)
      const cleanHeader = signatureHeader.replace(/^sha256=/i, '').trim();

      const bodyStr = typeof rawBody === 'string' ? rawBody : (Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : JSON.stringify(rawBody || {}));
      const hmac = crypto.createHmac('sha256', webhookSecret);
      const computedHex = hmac.update(bodyStr).digest('hex');

      const expectedBuf = Buffer.from(computedHex, 'hex');
      const receivedBuf = Buffer.from(cleanHeader, 'hex');

      if (expectedBuf.length !== receivedBuf.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuf, receivedBuf);
    } catch (err) {
      console.warn('[GhlWebhookService] Signature verification exception:', err.message);
      return false;
    }
  }

  /**
   * Normalizes incoming HighLevel webhook payloads across Marketplace Apps,
   * Custom Workflows, and LeadConnector v2/v3 events into a standard structure.
   * 
   * @param {Object} rawPayload 
   * @returns {Object} { eventType, locationId, ghlContactId, contactData, eventId, payloadHash }
   */
  normalizeWebhookPayload(rawPayload = {}) {
    if (!rawPayload || typeof rawPayload !== 'object') {
      return { eventType: 'Unknown', locationId: null, ghlContactId: null, contactData: null, eventId: null, payloadHash: '' };
    }

    // HighLevel event type variations
    const rawType = rawPayload.type || rawPayload.event || rawPayload.eventType || rawPayload.action || 'Unknown';
    let eventType = rawType;

    // Normalize contact events to canonical names
    const lowerType = String(rawType).toLowerCase().replace(/[^a-z]/g, '');
    if (lowerType.includes('contactcreate') || lowerType === 'contactcreated' || lowerType === 'contactcreate') {
      eventType = 'ContactCreate';
    } else if (lowerType.includes('contactupdate') || lowerType === 'contactupdated' || lowerType === 'contactupdate' || lowerType === 'contacttagupdated') {
      eventType = 'ContactUpdate';
    } else if (lowerType.includes('contactdelete') || lowerType === 'contactdeleted' || lowerType === 'contactdelete') {
      eventType = 'ContactDelete';
    } else if (lowerType.includes('opportunitycreate') || lowerType === 'opportunitycreated') {
      eventType = 'OpportunityCreate';
    } else if (lowerType.includes('opportunityupdate') || lowerType === 'opportunityupdated' || lowerType.includes('opportunitystage') || lowerType.includes('opportunitystatus')) {
      eventType = 'OpportunityUpdate';
    } else if (lowerType.includes('opportunitydelete') || lowerType === 'opportunitydeleted') {
      eventType = 'OpportunityDelete';
    }

    // Location ID resolution
    const locationId = rawPayload.locationId || rawPayload.location_id || rawPayload.location?.id || rawPayload.data?.locationId || null;

    // Contact ID resolution
    const ghlContactId = rawPayload.id || rawPayload.contactId || rawPayload.contact_id || rawPayload.data?.id || rawPayload.data?.contactId || null;

    // Opportunity ID resolution
    const ghlOpportunityId = rawPayload.opportunityId || rawPayload.opportunity_id || (eventType.startsWith('Opportunity') ? (rawPayload.id || rawPayload.data?.id) : null);

    // Contact / Opportunity Data extraction
    const contactData = rawPayload.data || rawPayload;

    // Event ID / Trace ID for idempotency
    const eventId = rawPayload.eventId || rawPayload.traceId || rawPayload.messageId || null;

    // Deterministic payload hash
    const payloadHash = calculatePayloadHash(contactData);

    return {
      eventType,
      rawEventType: rawType,
      locationId,
      ghlContactId,
      ghlOpportunityId,
      contactData,
      eventId,
      payloadHash
    };
  }

  /**
   * Main Webhook Ingestion & Processing Pipeline
   * 
   * @param {Object} params
   * @param {string|Buffer} params.rawBody - Raw HTTP body for signature check
   * @param {Object} params.headers - HTTP headers object
   * @param {Object} params.payload - Parsed JSON body
   * @param {string} [params.secretOverride] - Optional test secret override
   * @returns {Promise<Object>} Execution result summary
   */
  async processWebhookEvent({ rawBody, headers = {}, payload = {}, secretOverride = null }) {
    // 1. Signature Verification
    const sigHeader = headers['x-ghl-signature'] || 
                      headers['x-leadconnector-signature'] || 
                      headers['x-hub-signature-256'] || 
                      headers['x-signature'] || null;

    const isAuthentic = this.verifySignature(rawBody, sigHeader, secretOverride);
    if (!isAuthentic) {
      throw new GhlApiError('Invalid or missing webhook signature', 'INVALID_SIGNATURE', 401);
    }

    // 2. Payload Validation & Normalization
    const normalized = this.normalizeWebhookPayload(payload);
    const { eventType, locationId, ghlContactId, ghlOpportunityId, contactData, eventId, payloadHash } = normalized;

    if (!locationId) {
      throw new GhlApiError('Malformed webhook payload: missing locationId', 'MALFORMED_PAYLOAD', 400);
    }

    // 3. Resolve HighLevel Location to EMS Tenant
    const integration = await getGhlIntegrationByLocation(locationId);
    if (!integration || !integration.tenant_id) {
      throw new GhlApiError(`Unknown or unregistered location: "${locationId}"`, 'UNKNOWN_LOCATION', 404);
    }

    const tenantId = integration.tenant_id;

    // 4. Deterministic Idempotency Check
    const entityIdForIdemp = ghlOpportunityId || ghlContactId || 'generic';
    const idempotencyKey = eventId ? `ghl_wh_${eventId}` : `ghl_wh_${locationId}_${eventType}_${entityIdForIdemp}_${payloadHash}`;
    const previousExecution = await getGhlSyncLogByIdempotencyKey(tenantId, idempotencyKey);

    if (previousExecution && previousExecution.status === 'SUCCESS') {
      return {
        status: 'skipped',
        reason: 'idempotent_duplicate',
        eventType,
        locationId,
        ghlContactId,
        ghlOpportunityId,
        idempotencyKey
      };
    }

    // 5. Event Routing & Processing
    try {
      if (eventType === 'ContactCreate' || eventType === 'ContactUpdate') {
        if (!ghlContactId) {
          throw new GhlApiError('Contact event payload is missing Contact ID', 'MALFORMED_PAYLOAD', 400);
        }

        const syncResult = await ghlSyncEngine.importGhlContact(tenantId, ghlContactId, contactData);

        // Record inbound event in sync log with idempotency key
        await createGhlSyncLog(tenantId, {
          locationId,
          direction: 'INBOUND',
          entityType: 'contact',
          emsEntityId: syncResult.emsContactId || null,
          ghlEntityId: ghlContactId,
          eventType: `Webhook${eventType}`,
          status: syncResult.status === 'conflict' ? 'CONFLICT' : 'SUCCESS',
          httpStatus: 200,
          payload: { eventType, ghlContactId, payloadHash },
          idempotencyKey
        });

        return {
          status: syncResult.status,
          eventType,
          locationId,
          ghlContactId,
          emsContactId: syncResult.emsContactId,
          operation: syncResult.operation,
          reason: syncResult.reason
        };
      } else if (eventType === 'ContactDelete') {
        if (!ghlContactId) {
          throw new GhlApiError('Contact delete payload is missing Contact ID', 'MALFORMED_PAYLOAD', 400);
        }

        const existingLink = await getEmsEntityByGhlId(tenantId, locationId, 'contact', ghlContactId);
        let emsContactId = existingLink ? existingLink.ems_entity_id : null;

        if (emsContactId) {
          // Soft-archive local contact and remove GHL entity link (preserve conversation history)
          await archiveContact(emsContactId, tenantId);
          await deleteGhlEntityLink(tenantId, locationId, 'contact', emsContactId);
        }

        await createGhlSyncLog(tenantId, {
          locationId,
          direction: 'INBOUND',
          entityType: 'contact',
          emsEntityId: emsContactId,
          ghlEntityId: ghlContactId,
          eventType: 'WebhookContactDelete',
          status: 'SUCCESS',
          httpStatus: 200,
          payload: { eventType, ghlContactId, emsContactId },
          idempotencyKey
        });

        return {
          status: 'success',
          eventType: 'ContactDelete',
          operation: 'DELETE',
          locationId,
          ghlContactId,
          emsContactId
        };
      } else if (eventType === 'OpportunityCreate' || eventType === 'OpportunityUpdate') {
        const oppId = ghlOpportunityId || ghlContactId;
        if (!oppId) {
          throw new GhlApiError('Opportunity event payload is missing Opportunity ID', 'MALFORMED_PAYLOAD', 400);
        }

        const syncResult = await ghlSyncEngine.importGhlOpportunity(tenantId, oppId, contactData);

        await createGhlSyncLog(tenantId, {
          locationId,
          direction: 'INBOUND',
          entityType: 'opportunity',
          emsEntityId: syncResult.emsContactId || null,
          ghlEntityId: oppId,
          eventType: `Webhook${eventType}`,
          status: syncResult.status === 'conflict' ? 'CONFLICT' : 'SUCCESS',
          httpStatus: 200,
          payload: { eventType, ghlOpportunityId: oppId, payloadHash },
          idempotencyKey
        });

        return {
          status: syncResult.status,
          eventType,
          locationId,
          ghlOpportunityId: oppId,
          emsContactId: syncResult.emsContactId,
          operation: syncResult.operation,
          reason: syncResult.reason
        };
      } else if (eventType === 'OpportunityDelete') {
        const oppId = ghlOpportunityId || ghlContactId;
        if (!oppId) {
          throw new GhlApiError('Opportunity delete payload is missing Opportunity ID', 'MALFORMED_PAYLOAD', 400);
        }

        const existingLink = await getEmsEntityByGhlId(tenantId, locationId, 'opportunity', oppId);
        let emsContactId = existingLink ? existingLink.ems_entity_id : null;

        if (emsContactId) {
          await deleteGhlEntityLink(tenantId, locationId, 'opportunity', emsContactId);
        }

        await createGhlSyncLog(tenantId, {
          locationId,
          direction: 'INBOUND',
          entityType: 'opportunity',
          emsEntityId: emsContactId,
          ghlEntityId: oppId,
          eventType: 'WebhookOpportunityDelete',
          status: 'SUCCESS',
          httpStatus: 200,
          payload: { eventType, ghlOpportunityId: oppId, emsContactId },
          idempotencyKey
        });

        return {
          status: 'success',
          eventType: 'OpportunityDelete',
          operation: 'DELETE',
          locationId,
          ghlOpportunityId: oppId,
          emsContactId
        };
      } else {
        // Unknown or unhandled event type — log and safely acknowledge
        await createGhlSyncLog(tenantId, {
          locationId,
          direction: 'INBOUND',
          entityType: 'generic',
          eventType: `WebhookUnhandled_${eventType}`,
          status: 'IGNORED',
          httpStatus: 200,
          payload: { eventType, rawType: normalized.rawEventType },
          idempotencyKey
        });

        return {
          status: 'ignored',
          reason: 'unhandled_event_type',
          eventType
        };
      }
    } catch (err) {
      // Record failed webhook processing attempt
      await createGhlSyncLog(tenantId, {
        locationId,
        direction: 'INBOUND',
        entityType: 'contact',
        ghlEntityId: ghlContactId,
        eventType: `Webhook${eventType}Failed`,
        status: 'FAILED',
        httpStatus: err.status || 500,
        errorMessage: err.message,
        payload: { eventType, ghlContactId },
        idempotencyKey
      });

      throw err;
    }
  }
}

export default new GhlWebhookService();
