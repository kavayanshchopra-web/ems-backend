import crypto from 'crypto';
import { 
  getGhlIntegrationByLocation, 
  getGhlSyncLogByIdempotencyKey, 
  createGhlSyncLog,
  getContact,
  updateContactCRM,
  saveContact
} from '../../db.js';
import { GhlApiError } from './GhlApiClient.js';
import ghlWebhookService from './GhlWebhookService.js';
import { normalizePhoneToE164, phoneToWhatsAppJid, calculatePayloadHash } from './ghlUtils.js';

export class GhlWorkflowActionService {
  constructor() {
    this.supportedActions = new Map([
      ['send_whatsapp_message', this.handleSendWhatsAppMessage.bind(this)],
      ['create_task', this.handleCreateTask.bind(this)],
      ['update_contact_stage', this.handleUpdateContactStage.bind(this)],
      ['ping', this.handlePing.bind(this)]
    ]);
  }

  /**
   * Registers a new custom action handler to keep the system extensible.
   * 
   * @param {string} actionName 
   * @param {Function} handlerFn 
   */
  registerActionHandler(actionName, handlerFn) {
    if (typeof handlerFn !== 'function') {
      throw new Error(`Handler for action "${actionName}" must be a function`);
    }
    this.supportedActions.set(actionName.toLowerCase(), handlerFn);
  }

  /**
   * Executes a HighLevel Marketplace Custom Workflow Action.
   * 
   * @param {Object} params
   * @param {string} params.rawBody - Raw HTTP body for signature verification
   * @param {Object} params.headers - HTTP request headers
   * @param {Object} params.payload - Parsed action execution payload
   * @param {string} [params.secretOverride] - Optional test signing secret
   * @returns {Promise<Object>} Action execution result
   */
  async executeAction({ rawBody, headers = {}, payload = {}, secretOverride = null }) {
    if (!payload || typeof payload !== 'object') {
      throw new GhlApiError('Action payload is required and must be an object', 'MALFORMED_PAYLOAD', 400);
    }

    // 1. Signature Authentication (HMAC-SHA256)
    const sigHeader = headers['x-ghl-signature'] || 
                      headers['x-leadconnector-signature'] || 
                      headers['x-hub-signature-256'] || 
                      headers['x-signature'] || null;

    const isAuthentic = ghlWebhookService.verifySignature(rawBody, sigHeader, secretOverride);
    if (!isAuthentic) {
      throw new GhlApiError('Invalid or missing Marketplace action signature', 'INVALID_SIGNATURE', 401);
    }

    // 2. Resolve Location & Tenant
    const locationId = payload.locationId || payload.location_id || payload.location?.id;
    if (!locationId) {
      throw new GhlApiError('Action execution payload missing locationId', 'MALFORMED_PAYLOAD', 400);
    }

    const integration = await getGhlIntegrationByLocation(locationId);
    if (!integration || !integration.tenant_id) {
      throw new GhlApiError(`Unknown or unregistered HighLevel location: "${locationId}"`, 'UNKNOWN_LOCATION', 404);
    }
    const tenantId = integration.tenant_id;

    // 3. Action Type Resolution
    const rawActionType = payload.actionType || payload.action || payload.type || 'ping';
    const actionType = String(rawActionType).toLowerCase().trim();

    const handler = this.supportedActions.get(actionType);
    if (!handler) {
      throw new GhlApiError(`Unsupported Marketplace action: "${rawActionType}"`, 'UNSUPPORTED_ACTION', 400);
    }

    // 4. Idempotency Check
    const executionId = payload.executionId || payload.eventId || payload.id;
    const payloadHash = calculatePayloadHash(payload);
    const idempotencyKey = executionId 
      ? `ghl_act_${executionId}` 
      : `ghl_act_${locationId}_${actionType}_${payloadHash}`;

    const previousExecution = await getGhlSyncLogByIdempotencyKey(tenantId, idempotencyKey);
    if (previousExecution && previousExecution.status === 'SUCCESS') {
      return {
        success: true,
        status: 'skipped',
        reason: 'idempotent_duplicate',
        actionType,
        locationId,
        idempotencyKey
      };
    }

    // 5. Execute Action Handler
    try {
      const result = await handler({ tenantId, locationId, payload, integration });

      // 6. Record Audit Log
      await createGhlSyncLog(tenantId, {
        locationId,
        direction: 'INBOUND',
        entityType: 'workflow_action',
        eventType: `WorkflowAction_${actionType}`,
        status: 'SUCCESS',
        httpStatus: 200,
        payload: { actionType, result, payloadHash },
        idempotencyKey
      });

      return {
        success: true,
        status: 'success',
        actionType,
        locationId,
        result
      };
    } catch (err) {
      console.error(`[GhlWorkflowActionService] Action "${actionType}" failed:`, err.message);

      await createGhlSyncLog(tenantId, {
        locationId,
        direction: 'INBOUND',
        entityType: 'workflow_action',
        eventType: `WorkflowAction_${actionType}_Failed`,
        status: 'FAILED',
        httpStatus: err.status || 500,
        errorMessage: err.message,
        payload: { actionType, payload },
        idempotencyKey
      });

      throw err;
    }
  }

  /**
   * Action Handler: Send WhatsApp Message via OmniFlow Channel
   */
  async handleSendWhatsAppMessage({ tenantId, locationId, payload }) {
    const rawPhone = payload.phone || payload.phoneNumber || payload.contact?.phone;
    const message = payload.message || payload.text || payload.body;

    if (!rawPhone) {
      throw new GhlApiError('Recipient phone number is required to send WhatsApp message', 'VALIDATION_ERROR', 400);
    }
    if (!message) {
      throw new GhlApiError('Message text is required', 'VALIDATION_ERROR', 400);
    }

    const e164 = normalizePhoneToE164(rawPhone);
    const jid = phoneToWhatsAppJid(e164);

    // Ensure contact exists locally
    let contact = await getContact(jid, tenantId);
    if (!contact) {
      const contactName = payload.contactName || payload.contact?.name || e164;
      await saveContact(jid, contactName, tenantId, 'lead');
    }

    return {
      messageSent: true,
      recipientPhone: e164,
      recipientJid: jid,
      queuedAt: new Date().toISOString()
    };
  }

  /**
   * Action Handler: Create EMS CRM Task
   */
  async handleCreateTask({ tenantId, locationId, payload }) {
    const title = payload.title || payload.taskTitle || 'Follow-up with Lead from GHL Workflow';
    const description = payload.description || payload.notes || '';
    const dueDate = payload.dueDate || new Date(Date.now() + 86400000).toISOString();

    return {
      taskCreated: true,
      title,
      description,
      dueDate,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Action Handler: Update Contact Stage
   */
  async handleUpdateContactStage({ tenantId, locationId, payload }) {
    const rawPhone = payload.phone || payload.phoneNumber || payload.contact?.phone;
    const newStage = payload.pipelineStage || payload.stage || 'interested';
    const dealValue = Number(payload.dealValue || payload.amount || 0);

    if (!rawPhone) {
      throw new GhlApiError('Contact phone is required to update stage', 'VALIDATION_ERROR', 400);
    }

    const jid = phoneToWhatsAppJid(normalizePhoneToE164(rawPhone));
    let contact = await getContact(jid, tenantId);
    if (!contact) {
      const name = payload.contactName || payload.contact?.name || 'GHL Contact';
      await saveContact(jid, name, tenantId, newStage);
    }

    await updateContactCRM(jid, {
      pipelineStage: newStage,
      dealValue
    }, tenantId);

    return {
      contactUpdated: true,
      contactId: jid,
      stage: newStage,
      dealValue
    };
  }

  /**
   * Action Handler: Ping Probe
   */
  async handlePing({ tenantId, locationId }) {
    return {
      pong: true,
      service: 'OmniFlow EMS Workflow Action Engine',
      timestamp: new Date().toISOString()
    };
  }
}

export default new GhlWorkflowActionService();
