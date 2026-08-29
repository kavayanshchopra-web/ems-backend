import ghlApiClient, { GhlApiError } from './GhlApiClient.js';
import { 
  normalizePhoneToE164, 
  phoneToWhatsAppJid, 
  splitFullName, 
  calculatePayloadHash 
} from './ghlUtils.js';
import { 
  getGhlIntegrationByTenant,
  getContact, 
  getAllContacts,
  saveContact,
  updateContactCRM,
  saveGhlEntityLink, 
  getGhlEntityLink, 
  getEmsEntityByGhlId,
  createGhlSyncLog,
  findContactByPhoneOrEmail
} from '../../db.js';

/**
 * Production-grade GHL Contact Bidirectional Synchronization Engine
 * Implements deterministic deduplication, entity linking, loop suppression,
 * and tenant-isolated audit logging.
 */
export class GhlSyncEngine {
  /**
   * Generates a cryptographic MD5 hash of an entity payload to prevent infinite echo loops.
   * @param {Object} payload 
   * @returns {string}
   */
  generatePayloadHash(payload) {
    return calculatePayloadHash(payload);
  }

  /**
   * Synchronizes an EMS Contact to GoHighLevel.
   * - If already linked: updates the existing GHL Contact.
   * - If unlinked: checks for existing GHL contact or creates a new one, then stores the link.
   * - Suppresses infinite loop echoes if the payload has not changed.
   * 
   * @param {number} tenantId - EMS Tenant ID
   * @param {string} emsContactId - EMS Contact Identifier (e.g. WhatsApp JID)
   * @returns {Promise<Object>} Sync result with status and GHL contact details
   */
  async syncContactToGhl(tenantId, emsContactId) {
    if (!tenantId) throw new GhlApiError('tenantId is required for contact sync', 'GHL_VALIDATION_ERROR', 400);
    if (!emsContactId) throw new GhlApiError('emsContactId is required for contact sync', 'GHL_VALIDATION_ERROR', 400);

    // 1. Verify tenant has an active GHL integration
    const integration = await getGhlIntegrationByTenant(tenantId);
    if (!integration || !integration.is_active || !integration.location_id) {
      throw new GhlApiError('GoHighLevel integration is not active or connected for this tenant', 'GHL_NOT_CONNECTED', 400);
    }
    const locationId = integration.location_id;

    // 2. Fetch EMS contact record
    const emsContact = await getContact(emsContactId, tenantId);
    if (!emsContact) {
      throw new GhlApiError(`EMS Contact "${emsContactId}" not found in tenant ${tenantId}`, 'GHL_NOT_FOUND', 404);
    }

    // 3. Compute deterministic payload hash for loop suppression
    const payloadHash = this.generatePayloadHash(emsContact);
    const existingLink = await getGhlEntityLink(tenantId, locationId, 'contact', emsContactId);

    if (existingLink && existingLink.last_synced_hash === payloadHash) {
      return {
        status: 'skipped',
        reason: 'echo_suppressed',
        emsContactId,
        ghlContactId: existingLink.ghl_entity_id,
        locationId
      };
    }

    // 4. Prepare HighLevel standard contact payload
    const normalizedPhone = normalizePhoneToE164(emsContact.id) || normalizePhoneToE164(emsContact.phone_computed) || null;
    const displayName = (emsContact.custom_name || emsContact.name || '').trim();
    const { firstName, lastName, name } = splitFullName(displayName);

    const contactPayload = {
      name: name || undefined,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      email: (emsContact.email || '').trim() || undefined,
      phone: normalizedPhone || undefined,
      tags: Array.isArray(emsContact.labels) ? emsContact.labels : undefined
    };

    let ghlContactId = existingLink ? existingLink.ghl_entity_id : null;
    let operation = existingLink ? 'UPDATE' : 'CREATE';

    try {
      if (ghlContactId) {
        // Update existing HighLevel Contact
        await ghlApiClient.updateContact(locationId, ghlContactId, contactPayload);
      } else {
        // Check if matching contact already exists in GHL by email or phone before creating
        const existingGhl = await ghlApiClient.lookupContact(locationId, {
          email: contactPayload.email,
          phone: contactPayload.phone
        });

        if (existingGhl && existingGhl.id) {
          ghlContactId = existingGhl.id;
          operation = 'LINK_AND_UPDATE';
          await ghlApiClient.updateContact(locationId, ghlContactId, contactPayload);
        } else {
          // Create brand new HighLevel Contact
          const created = await ghlApiClient.createContact(locationId, contactPayload);
          ghlContactId = created.contact?.id || created.id;
        }
      }

      if (!ghlContactId) {
        throw new GhlApiError('HighLevel did not return a valid Contact ID', 'GHL_SYNC_ERROR', 500);
      }

      // 5. Store / update bidirectional entity link
      await saveGhlEntityLink(tenantId, {
        locationId,
        entityType: 'contact',
        emsEntityId: emsContactId,
        ghlEntityId: ghlContactId,
        lastSyncedHash: payloadHash
      });

      // 6. Log successful sync operation in audit trail
      await createGhlSyncLog(tenantId, {
        locationId,
        direction: 'OUTBOUND',
        entityType: 'contact',
        emsEntityId: emsContactId,
        ghlEntityId: ghlContactId,
        eventType: operation === 'UPDATE' ? 'ContactUpdatedInGhl' : 'ContactCreatedInGhl',
        status: 'SUCCESS',
        httpStatus: 200,
        payload: { emsContactId, ghlContactId, payloadHash },
        idempotencyKey: `${locationId}_contact_${emsContactId}_${payloadHash}`
      });

      return {
        status: 'success',
        operation,
        emsContactId,
        ghlContactId,
        locationId,
        syncedAt: new Date().toISOString()
      };
    } catch (err) {
      // Record failed sync attempt
      await createGhlSyncLog(tenantId, {
        locationId,
        direction: 'OUTBOUND',
        entityType: 'contact',
        emsEntityId: emsContactId,
        ghlEntityId: ghlContactId,
        eventType: 'ContactSyncFailed',
        status: 'FAILED',
        httpStatus: err.status || 500,
        errorMessage: err.message,
        payload: { emsContactId, contactPayload },
        idempotencyKey: `${locationId}_contact_${emsContactId}_err_${Date.now()}`
      });

      throw err;
    }
  }

  /**
   * Imports or updates a HighLevel Contact into the local EMS database.
   * - If already linked: updates local EMS contact.
   * - If unlinked: uses deterministic matching (Email -> Phone).
   * - If conflict detected: logs MATCH_CONFLICT and refuses to merge blindly.
   * 
   * @param {number} tenantId - EMS Tenant ID
   * @param {string} ghlContactId - HighLevel Contact ID
   * @param {Object} [ghlContactData=null] - Optional pre-fetched contact data
   * @returns {Promise<Object>} Import result summary
   */
  async importGhlContact(tenantId, ghlContactId, ghlContactData = null) {
    if (!tenantId) throw new GhlApiError('tenantId is required for contact import', 'GHL_VALIDATION_ERROR', 400);
    if (!ghlContactId) throw new GhlApiError('ghlContactId is required for contact import', 'GHL_VALIDATION_ERROR', 400);

    const integration = await getGhlIntegrationByTenant(tenantId);
    if (!integration || !integration.is_active || !integration.location_id) {
      throw new GhlApiError('GoHighLevel integration is not active for this tenant', 'GHL_NOT_CONNECTED', 400);
    }
    const locationId = integration.location_id;

    // 1. Fetch Contact from HighLevel if not provided
    let contact = ghlContactData;
    if (!contact) {
      const response = await ghlApiClient.getContact(locationId, ghlContactId);
      contact = response.contact || response;
    }

    if (!contact || (!contact.id && !ghlContactId)) {
      throw new GhlApiError(`Contact "${ghlContactId}" not found in HighLevel`, 'GHL_NOT_FOUND', 404);
    }

    const payloadHash = this.generatePayloadHash(contact);

    // 2. Check if already linked
    const existingLink = await getEmsEntityByGhlId(tenantId, locationId, 'contact', ghlContactId);

    if (existingLink && existingLink.last_synced_hash === payloadHash) {
      return {
        status: 'skipped',
        reason: 'echo_suppressed',
        emsContactId: existingLink.ems_entity_id,
        ghlContactId,
        locationId
      };
    }

    let emsContactId = existingLink ? existingLink.ems_entity_id : null;
    let operation = existingLink ? 'UPDATE' : 'CREATE';

    // 3. If unlinked, perform deterministic matching
    if (!emsContactId) {
      const matchResult = await findContactByPhoneOrEmail(tenantId, contact.phone, contact.email);

      if (matchResult && matchResult.matchConflict) {
        // Ambiguous match with multiple local records — log conflict & do not auto-merge
        await createGhlSyncLog(tenantId, {
          locationId,
          direction: 'INBOUND',
          entityType: 'contact',
          ghlEntityId: ghlContactId,
          eventType: 'ContactMatchConflict',
          status: 'CONFLICT',
          httpStatus: 409,
          errorMessage: `Ambiguous match: found ${matchResult.matches.length} local contacts matching GHL contact`,
          payload: { ghlContactId, phone: contact.phone, email: contact.email }
        });

        return {
          status: 'conflict',
          code: 'GHL_MATCH_CONFLICT',
          reason: 'Multiple matching contacts found in EMS database',
          ghlContactId,
          matches: matchResult.matches.map(m => m.id)
        };
      }

      if (matchResult && matchResult.id) {
        emsContactId = matchResult.id;
        operation = 'LINK_AND_UPDATE';
      } else {
        // Derive EMS contact ID from phone (WhatsApp JID format) or GHL ID fallback
        emsContactId = phoneToWhatsAppJid(contact.phone) || `ghl_${ghlContactId}`;
      }
    }

    const fullName = (contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`).trim() || 'HighLevel Contact';
    const email = (contact.email || '').trim();

    // 4. Upsert into local EMS contacts table
    await saveContact(emsContactId, fullName, tenantId, 'lead');
    await updateContactCRM(emsContactId, {
      customName: fullName,
      email: email || undefined,
      labels: Array.isArray(contact.tags) ? contact.tags : undefined
    }, tenantId);

    // 5. Store / update entity link
    await saveGhlEntityLink(tenantId, {
      locationId,
      entityType: 'contact',
      emsEntityId: emsContactId,
      ghlEntityId: ghlContactId,
      lastSyncedHash: payloadHash
    });

    // 6. Record sync audit log
    await createGhlSyncLog(tenantId, {
      locationId,
      direction: 'INBOUND',
      entityType: 'contact',
      emsEntityId: emsContactId,
      ghlEntityId: ghlContactId,
      eventType: operation === 'UPDATE' ? 'ContactUpdatedFromGhl' : 'ContactImportedFromGhl',
      status: 'SUCCESS',
      httpStatus: 200,
      payload: { emsContactId, ghlContactId, payloadHash }
    });

    return {
      status: 'success',
      operation,
      emsContactId,
      ghlContactId,
      locationId,
      importedAt: new Date().toISOString()
    };
  }

  /**
   * Batch synchronizes all active EMS contacts for a tenant to HighLevel.
   * 
   * @param {number} tenantId 
   * @returns {Promise<Object>} Batch summary with total, synced, skipped, and failed counts
   */
  async syncAllContactsToGhl(tenantId) {
    if (!tenantId) throw new GhlApiError('tenantId is required', 'GHL_VALIDATION_ERROR', 400);

    const allContacts = await getAllContacts(tenantId);
    const summary = {
      total: allContacts.length,
      synced: 0,
      skipped: 0,
      failed: 0,
      errors: []
    };

    for (const contact of allContacts) {
      try {
        const result = await this.syncContactToGhl(tenantId, contact.id);
        if (result.status === 'skipped') {
          summary.skipped++;
        } else {
          summary.synced++;
        }
      } catch (err) {
        summary.failed++;
        summary.errors.push({
          contactId: contact.id,
          error: err.message
        });
      }
    }

    return summary;
  }

  // ============================================================================
  // OPPORTUNITIES & PIPELINES SYNC
  // ============================================================================

  /**
   * Resolves the appropriate HighLevel Pipeline ID, Stage ID, and Status
   * based on the EMS contact's pipeline stage.
   * 
   * @param {number} tenantId 
   * @param {string} locationId 
   * @param {string} emsStage 
   * @returns {Promise<{ pipelineId: string, pipelineStageId: string, status: string }>}
   */
  async resolveGhlPipelineAndStage(tenantId, locationId, emsStage = 'new') {
    const pipelinesData = await ghlApiClient.getPipelines(locationId);
    const pipelines = pipelinesData.pipelines || [];

    if (!pipelines.length) {
      throw new GhlApiError(`No pipelines found for HighLevel location ${locationId}`, 'GHL_NOT_FOUND', 404);
    }

    const activePipeline = pipelines[0];
    const stages = activePipeline.stages || [];

    if (!stages.length) {
      throw new GhlApiError(`Pipeline ${activePipeline.id} has no stages defined`, 'GHL_VALIDATION_ERROR', 400);
    }

    const cleanStage = String(emsStage || '').toLowerCase().trim();
    let status = 'open';
    if (cleanStage === 'won' || cleanStage === 'closed_won' || cleanStage === 'customer') {
      status = 'won';
    } else if (cleanStage === 'lost' || cleanStage === 'closed_lost' || cleanStage === 'disqualified') {
      status = 'lost';
    }

    // Match stage by semantic name
    let matchedStage = stages.find(s => s.name && s.name.toLowerCase().includes(cleanStage));
    if (!matchedStage) {
      if (status === 'won') {
        matchedStage = stages.find(s => s.name && s.name.toLowerCase().includes('won'));
      } else if (status === 'lost') {
        matchedStage = stages.find(s => s.name && s.name.toLowerCase().includes('lost'));
      }
    }

    // Default fallback to first stage if unmapped
    const targetStage = matchedStage || stages[0];

    return {
      pipelineId: activePipeline.id,
      pipelineStageId: targetStage.id,
      status
    };
  }

  /**
   * Synchronizes an EMS Contact's Deal / Opportunity to GoHighLevel.
   * Ensures the prerequisite Contact exists on GHL first, resolves pipeline & stage,
   * enforces loop suppression, and persists opportunity entity link.
   * 
   * @param {number} tenantId 
   * @param {string} emsContactId 
   * @returns {Promise<Object>}
   */
  async syncOpportunityToGhl(tenantId, emsContactId) {
    if (!tenantId) throw new GhlApiError('tenantId is required', 'GHL_VALIDATION_ERROR', 400);
    if (!emsContactId) throw new GhlApiError('emsContactId is required', 'GHL_VALIDATION_ERROR', 400);

    const integration = await getGhlIntegrationByTenant(tenantId);
    if (!integration || !integration.is_active || !integration.location_id) {
      throw new GhlApiError('GoHighLevel is not connected for this tenant', 'GHL_NOT_CONNECTED', 400);
    }
    const locationId = integration.location_id;

    // 1. Fetch EMS Contact Record
    const emsContact = await getContact(emsContactId, tenantId);
    if (!emsContact) {
      throw new GhlApiError(`Contact "${emsContactId}" not found in EMS`, 'GHL_NOT_FOUND', 404);
    }

    // 2. Ensure Prerequisite Contact is Linked on HighLevel
    let contactLink = await getGhlEntityLink(tenantId, locationId, 'contact', emsContactId);
    let ghlContactId = contactLink ? contactLink.ghl_entity_id : null;

    if (!ghlContactId) {
      const contactSyncRes = await this.syncContactToGhl(tenantId, emsContactId);
      ghlContactId = contactSyncRes.ghlContactId;
    }

    if (!ghlContactId) {
      throw new GhlApiError('Failed to establish prerequisite HighLevel Contact link', 'GHL_SYNC_ERROR', 500);
    }

    // 3. Resolve Pipeline & Stage
    const { pipelineId, pipelineStageId, status } = await this.resolveGhlPipelineAndStage(tenantId, locationId, emsContact.pipeline_stage);

    const dealTitle = (emsContact.custom_name || emsContact.name || 'Deal').trim() + ' Opportunity';
    const monetaryValue = Number(emsContact.deal_value) || 0;

    const oppPayload = {
      name: dealTitle,
      pipelineId,
      pipelineStageId,
      status,
      monetaryValue,
      contactId: ghlContactId
    };

    // 4. Loop Suppression Hash
    const payloadHash = this.generatePayloadHash(oppPayload);
    const existingOppLink = await getGhlEntityLink(tenantId, locationId, 'opportunity', emsContactId);

    if (existingOppLink && existingOppLink.last_synced_hash === payloadHash) {
      return {
        status: 'skipped',
        reason: 'echo_suppressed',
        emsContactId,
        ghlOpportunityId: existingOppLink.ghl_entity_id,
        locationId
      };
    }

    let ghlOppId = existingOppLink ? existingOppLink.ghl_entity_id : null;
    let operation = existingOppLink ? 'UPDATE' : 'CREATE';

    try {
      if (ghlOppId) {
        await ghlApiClient.updateOpportunity(locationId, ghlOppId, oppPayload);
      } else {
        const created = await ghlApiClient.createOpportunity(locationId, oppPayload);
        ghlOppId = created.opportunity?.id || created.id;
      }

      if (!ghlOppId) {
        throw new GhlApiError('HighLevel did not return a valid Opportunity ID', 'GHL_SYNC_ERROR', 500);
      }

      // 5. Store / update entity link
      await saveGhlEntityLink(tenantId, {
        locationId,
        entityType: 'opportunity',
        emsEntityId: emsContactId,
        ghlEntityId: ghlOppId,
        lastSyncedHash: payloadHash
      });

      // 6. Record sync log
      await createGhlSyncLog(tenantId, {
        locationId,
        direction: 'OUTBOUND',
        entityType: 'opportunity',
        emsEntityId: emsContactId,
        ghlEntityId: ghlOppId,
        eventType: operation === 'UPDATE' ? 'OpportunityUpdatedInGhl' : 'OpportunityCreatedInGhl',
        status: 'SUCCESS',
        httpStatus: 200,
        payload: { emsContactId, ghlOppId, payloadHash },
        idempotencyKey: `${locationId}_opp_${emsContactId}_${payloadHash}`
      });

      return {
        status: 'success',
        operation,
        emsContactId,
        ghlOpportunityId: ghlOppId,
        pipelineId,
        pipelineStageId,
        locationId,
        syncedAt: new Date().toISOString()
      };
    } catch (err) {
      await createGhlSyncLog(tenantId, {
        locationId,
        direction: 'OUTBOUND',
        entityType: 'opportunity',
        emsEntityId: emsContactId,
        ghlEntityId: ghlOppId,
        eventType: 'OpportunitySyncFailed',
        status: 'FAILED',
        httpStatus: err.status || 500,
        errorMessage: err.message,
        payload: { emsContactId, oppPayload },
        idempotencyKey: `${locationId}_opp_${emsContactId}_err_${Date.now()}`
      });

      throw err;
    }
  }

  /**
   * Ingests or updates a HighLevel Opportunity into local EMS CRM contact/deal record.
   * 
   * @param {number} tenantId 
   * @param {string} ghlOppId 
   * @param {Object} [ghlOppData=null] 
   * @returns {Promise<Object>}
   */
  async importGhlOpportunity(tenantId, ghlOppId, ghlOppData = null) {
    if (!tenantId) throw new GhlApiError('tenantId is required', 'GHL_VALIDATION_ERROR', 400);
    if (!ghlOppId) throw new GhlApiError('ghlOppId is required', 'GHL_VALIDATION_ERROR', 400);

    const integration = await getGhlIntegrationByTenant(tenantId);
    if (!integration || !integration.is_active || !integration.location_id) {
      throw new GhlApiError('GoHighLevel is not active for this tenant', 'GHL_NOT_CONNECTED', 400);
    }
    const locationId = integration.location_id;

    let opp = ghlOppData;
    if (!opp) {
      const response = await ghlApiClient.getOpportunity(locationId, ghlOppId);
      opp = response.opportunity || response;
    }

    if (!opp) {
      throw new GhlApiError(`Opportunity "${ghlOppId}" not found in HighLevel`, 'GHL_NOT_FOUND', 404);
    }

    const payloadHash = this.generatePayloadHash(opp);

    // 1. Check existing opportunity link
    const existingOppLink = await getEmsEntityByGhlId(tenantId, locationId, 'opportunity', ghlOppId);

    if (existingOppLink && existingOppLink.last_synced_hash === payloadHash) {
      return {
        status: 'skipped',
        reason: 'echo_suppressed',
        emsContactId: existingOppLink.ems_entity_id,
        ghlOpportunityId: ghlOppId,
        locationId
      };
    }

    let emsContactId = existingOppLink ? existingOppLink.ems_entity_id : null;

    // 2. If unlinked, resolve EMS contact from GHL contactId
    const ghlContactId = opp.contactId || opp.contact_id || (opp.contact && opp.contact.id);
    if (!emsContactId && ghlContactId) {
      const contactLink = await getEmsEntityByGhlId(tenantId, locationId, 'contact', ghlContactId);
      if (contactLink) {
        emsContactId = contactLink.ems_entity_id;
      } else {
        // Automatically import prerequisite contact
        const contactImport = await this.importGhlContact(tenantId, ghlContactId);
        emsContactId = contactImport.emsContactId;
      }
    }

    if (!emsContactId) {
      throw new GhlApiError('Could not resolve EMS Contact for incoming Opportunity', 'GHL_SYNC_ERROR', 500);
    }

    // 3. Map GHL status / stage to EMS pipeline_stage
    let emsStage = 'lead';
    const status = String(opp.status || 'open').toLowerCase();
    if (status === 'won') {
      emsStage = 'won';
    } else if (status === 'lost' || status === 'abandoned') {
      emsStage = 'lost';
    } else {
      emsStage = 'lead';
    }

    const monetaryValue = Number(opp.monetaryValue || opp.value) || 0;

    // 4. Update local contact CRM stage & deal value
    await updateContactCRM(emsContactId, {
      pipelineStage: emsStage,
      dealValue: monetaryValue
    }, tenantId);

    // 5. Store / update opportunity entity link
    await saveGhlEntityLink(tenantId, {
      locationId,
      entityType: 'opportunity',
      emsEntityId: emsContactId,
      ghlEntityId: ghlOppId,
      lastSyncedHash: payloadHash
    });

    // 6. Record sync audit log
    await createGhlSyncLog(tenantId, {
      locationId,
      direction: 'INBOUND',
      entityType: 'opportunity',
      emsEntityId: emsContactId,
      ghlEntityId: ghlOppId,
      eventType: existingOppLink ? 'OpportunityUpdatedFromGhl' : 'OpportunityImportedFromGhl',
      status: 'SUCCESS',
      httpStatus: 200,
      payload: { emsContactId, ghlOppId, payloadHash }
    });

    return {
      status: 'success',
      operation: existingOppLink ? 'UPDATE' : 'CREATE',
      emsContactId,
      ghlOpportunityId: ghlOppId,
      locationId,
      importedAt: new Date().toISOString()
    };
  }

  /**
   * Batch synchronizes all active CRM deals/opportunities to HighLevel.
   * 
   * @param {number} tenantId 
   * @returns {Promise<Object>}
   */
  async syncAllOpportunitiesToGhl(tenantId) {
    if (!tenantId) throw new GhlApiError('tenantId is required', 'GHL_VALIDATION_ERROR', 400);

    const allContacts = await getAllContacts(tenantId);
    const summary = {
      total: allContacts.length,
      synced: 0,
      skipped: 0,
      failed: 0,
      errors: []
    };

    for (const contact of allContacts) {
      try {
        const result = await this.syncOpportunityToGhl(tenantId, contact.id);
        if (result.status === 'skipped') {
          summary.skipped++;
        } else {
          summary.synced++;
        }
      } catch (err) {
        summary.failed++;
        summary.errors.push({
          contactId: contact.id,
          error: err.message
        });
      }
    }

    return summary;
  }
}

export default new GhlSyncEngine();
