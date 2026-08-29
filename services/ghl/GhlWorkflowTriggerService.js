import crypto from 'crypto';
import { 
  getGhlIntegrationByLocation,
  saveGhlTriggerSubscription,
  getGhlTriggerSubscriptions,
  getGhlTriggerSubscriptionById,
  updateGhlTriggerSubscription,
  deleteGhlTriggerSubscription,
  getActiveSubscriptionsForTrigger,
  createGhlSyncLog
} from '../../db.js';
import { GhlApiError } from './GhlApiClient.js';

export class GhlWorkflowTriggerService {
  constructor() {
    this.definedTriggers = [
      {
        id: 'whatsapp_message_received',
        name: 'WhatsApp Message Received',
        description: 'Triggers when a customer sends an inbound WhatsApp message to your connected EMS channel.',
        payloadSchema: {
          phone: 'string',
          contactName: 'string',
          messageText: 'string',
          timestamp: 'string'
        }
      },
      {
        id: 'contact_stage_changed',
        name: 'Lead Pipeline Stage Changed',
        description: 'Triggers when a deal or lead moves to a new stage in OmniFlow CRM.',
        payloadSchema: {
          phone: 'string',
          contactName: 'string',
          oldStage: 'string',
          newStage: 'string',
          dealValue: 'number'
        }
      },
      {
        id: 'telephony_call_completed',
        name: 'Telephony Call Completed',
        description: 'Triggers when a call recording & disposition is finalized in OmniFlow.',
        payloadSchema: {
          customerPhone: 'string',
          callDuration: 'number',
          disposition: 'string',
          recordingUrl: 'string'
        }
      },
      {
        id: 'kiosk_attendance_checkin',
        name: 'Employee Kiosk Check-In',
        description: 'Triggers when a staff member checks in via QR/Face attendance kiosk.',
        payloadSchema: {
          employeeName: 'string',
          employeeId: 'string',
          checkInTime: 'string'
        }
      }
    ];
  }

  /**
   * Returns list of supported Marketplace Workflow Triggers and schemas.
   * 
   * @returns {Array<Object>}
   */
  getAvailableTriggers() {
    return this.definedTriggers;
  }

  /**
   * Registers a new trigger subscription for a HighLevel location.
   * 
   * @param {number} tenantId 
   * @param {string} locationId 
   * @param {Object} data 
   * @returns {Promise<Object>} Created subscription record
   */
  async createSubscription(tenantId, locationId, data = {}) {
    if (!tenantId) throw new GhlApiError('tenantId is required', 'VALIDATION_ERROR', 400);
    if (!locationId) throw new GhlApiError('locationId is required', 'VALIDATION_ERROR', 400);

    const { triggerType, targetUrl, filters = {}, metadata = {} } = data;
    if (!triggerType) {
      throw new GhlApiError('triggerType is required', 'VALIDATION_ERROR', 400);
    }
    if (!targetUrl || !targetUrl.startsWith('http')) {
      throw new GhlApiError('Valid targetUrl is required', 'VALIDATION_ERROR', 400);
    }

    const isValidTrigger = this.definedTriggers.some(t => t.id === triggerType);
    if (!isValidTrigger) {
      throw new GhlApiError(`Unknown triggerType: "${triggerType}"`, 'INVALID_TRIGGER', 400);
    }

    const subscription = await saveGhlTriggerSubscription(tenantId, {
      locationId,
      triggerType,
      targetUrl,
      isActive: 1,
      filters,
      metadata
    });

    await createGhlSyncLog(tenantId, {
      locationId,
      direction: 'OUTBOUND',
      entityType: 'workflow_trigger',
      eventType: 'TriggerSubscriptionCreated',
      status: 'SUCCESS',
      httpStatus: 200,
      payload: { triggerType, targetUrl, subId: subscription.id }
    });

    return subscription;
  }

  /**
   * Lists trigger subscriptions for a tenant and location.
   * 
   * @param {number} tenantId 
   * @param {string} [locationId] 
   * @returns {Promise<Array<Object>>}
   */
  async listSubscriptions(tenantId, locationId = null) {
    if (!tenantId) throw new GhlApiError('tenantId is required', 'VALIDATION_ERROR', 400);
    return await getGhlTriggerSubscriptions(tenantId, locationId);
  }

  /**
   * Updates an existing trigger subscription.
   * 
   * @param {string} id 
   * @param {number} tenantId 
   * @param {Object} updates 
   * @returns {Promise<Object>}
   */
  async updateSubscription(id, tenantId, updates = {}) {
    if (!id) throw new GhlApiError('Subscription ID is required', 'VALIDATION_ERROR', 400);
    if (!tenantId) throw new GhlApiError('tenantId is required', 'VALIDATION_ERROR', 400);

    const updated = await updateGhlTriggerSubscription(id, tenantId, updates);
    if (!updated) {
      throw new GhlApiError(`Subscription "${id}" not found`, 'NOT_FOUND', 404);
    }

    return updated;
  }

  /**
   * Deletes a trigger subscription.
   * 
   * @param {string} id 
   * @param {number} tenantId 
   * @returns {Promise<Object>}
   */
  async deleteSubscription(id, tenantId) {
    if (!id) throw new GhlApiError('Subscription ID is required', 'VALIDATION_ERROR', 400);
    if (!tenantId) throw new GhlApiError('tenantId is required', 'VALIDATION_ERROR', 400);

    const existing = await getGhlTriggerSubscriptionById(id, tenantId);
    if (!existing) {
      throw new GhlApiError(`Subscription "${id}" not found`, 'NOT_FOUND', 404);
    }

    await deleteGhlTriggerSubscription(id, tenantId);

    await createGhlSyncLog(tenantId, {
      locationId: existing.location_id,
      direction: 'OUTBOUND',
      entityType: 'workflow_trigger',
      eventType: 'TriggerSubscriptionDeleted',
      status: 'SUCCESS',
      httpStatus: 200,
      payload: { id, triggerType: existing.trigger_type }
    });

    return { success: true, deletedId: id };
  }

  /**
   * Dispatches an event to all active HighLevel trigger subscribers.
   * 
   * @param {Object} params
   * @param {string} params.locationId 
   * @param {string} params.triggerType 
   * @param {Object} params.eventPayload 
   * @returns {Promise<Object>} Delivery summary
   */
  async dispatchTriggerEvent({ locationId, triggerType, eventPayload = {} }) {
    if (!locationId || !triggerType) return { delivered: 0, failed: 0 };

    const subs = await getActiveSubscriptionsForTrigger(locationId, triggerType);
    const summary = { total: subs.length, delivered: 0, failed: 0 };

    for (const sub of subs) {
      try {
        const body = JSON.stringify({
          locationId,
          triggerType,
          event: triggerType,
          data: eventPayload,
          timestamp: new Date().toISOString()
        });

        // Safe fetch call to target URL
        if (typeof fetch === 'function') {
          await fetch(sub.target_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body
          }).catch(e => console.warn('[Trigger Dispatch Warning]', e.message));
        }

        summary.delivered++;
      } catch (err) {
        summary.failed++;
      }
    }

    return summary;
  }
}

export default new GhlWorkflowTriggerService();
