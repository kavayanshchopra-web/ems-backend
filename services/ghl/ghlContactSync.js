/**
 * GHL Contact Sync Module
 * Bidirectional contact synchronization with deduplication, field normalization, and two-way loop prevention
 */

import { getDb, findContactByNormalizedPhoneOrEmail } from '../../db.js';
import GhlMappingService from './ghlMappingService.js';
import GhlSyncLogger from './ghlSyncLogger.js';

class GhlContactSync {
  /**
   * Normalize phone number to E.164-like digits
   */
  normalizePhone(phone) {
    if (!phone) return null;
    let clean = String(phone).replace(/[^0-9+]/g, '');
    if (clean.startsWith('+')) clean = clean.substring(1);
    // Remove leading zeros
    clean = clean.replace(/^0+/, '');
    return clean.length >= 7 ? clean : null;
  }

  /**
   * Normalize email
   */
  normalizeEmail(email) {
    if (!email) return null;
    return String(email).trim().toLowerCase();
  }

  /**
   * Process a single GHL contact into EMS (GHL -> EMS)
   */
  async processGhlContactToEms(tenantId, locationId, ghlContact, { jobId = null, source = 'sync_engine' } = {}) {
    const db = getDb();
    const ghlId = ghlContact.id;
    if (!ghlId) throw new Error('GHL Contact is missing id');

    const phoneNorm = this.normalizePhone(ghlContact.phone);
    const emailNorm = this.normalizeEmail(ghlContact.email);
    const fullName = (ghlContact.name || `${ghlContact.firstName || ''} ${ghlContact.lastName || ''}`).trim() || 'GHL Contact';

    // 1. Check existing external ID mapping
    const existingMapping = await GhlMappingService.getMappingByGhlId(tenantId, 'contact', ghlId);

    if (existingMapping) {
      const emsId = existingMapping.ems_id;
      // Update existing EMS contact
      await db.run(
        `UPDATE contacts 
         SET name = COALESCE(?, name),
             email = COALESCE(?, email),
             phone_normalized = COALESCE(?, phone_normalized),
             email_normalized = COALESCE(?, email_normalized),
             custom_fields = COALESCE(?, custom_fields)
         WHERE id = ? AND tenant_id = ?`,
        [
          fullName,
          ghlContact.email || null,
          phoneNorm,
          emailNorm,
          ghlContact.customFields ? JSON.stringify(ghlContact.customFields) : null,
          emsId,
          tenantId
        ]
      );

      await GhlMappingService.setMapping(tenantId, {
        entityType: 'contact',
        emsId,
        ghlId,
        locationId,
        metadata: { name: fullName, phone: phoneNorm, email: emailNorm }
      });

      await GhlSyncLogger.log(tenantId, {
        jobId,
        entityType: 'contact',
        entityId: emsId,
        ghlId,
        direction: 'ghl_to_ems',
        operation: 'update',
        status: 'success',
        source
      });

      return { operation: 'update', emsId, ghlId };
    }

    // 2. Secondary deduplication by normalized phone or email
    let duplicateContact = null;
    if (phoneNorm || emailNorm) {
      duplicateContact = await findContactByNormalizedPhoneOrEmail(tenantId, phoneNorm, emailNorm);
    }

    if (duplicateContact) {
      const emsId = duplicateContact.id;
      // Link existing contact and update
      await db.run(
        `UPDATE contacts 
         SET name = COALESCE(?, name),
             email = COALESCE(?, email),
             phone_normalized = COALESCE(?, phone_normalized),
             email_normalized = COALESCE(?, email_normalized),
             custom_fields = COALESCE(?, custom_fields)
         WHERE id = ? AND tenant_id = ?`,
        [
          fullName,
          ghlContact.email || null,
          phoneNorm,
          emailNorm,
          ghlContact.customFields ? JSON.stringify(ghlContact.customFields) : null,
          emsId,
          tenantId
        ]
      );

      await GhlMappingService.setMapping(tenantId, {
        entityType: 'contact',
        emsId,
        ghlId,
        locationId,
        metadata: { name: fullName, phone: phoneNorm, email: emailNorm, deduped: true }
      });

      await GhlSyncLogger.log(tenantId, {
        jobId,
        entityType: 'contact',
        entityId: emsId,
        ghlId,
        direction: 'ghl_to_ems',
        operation: 'update',
        status: 'success',
        source,
        payload: { dedupMatch: duplicateContact.id }
      });

      return { operation: 'update', emsId, ghlId, deduped: true };
    }

    // 3. Create new EMS contact
    const newEmsId = phoneNorm ? `${phoneNorm}@s.whatsapp.net` : `contact_ghl_${ghlId}`;

    await db.run(
      `INSERT INTO contacts 
       (id, name, custom_name, email, pipeline_stage, labels, phone_normalized, email_normalized, custom_fields, tenant_id)
       VALUES (?, ?, ?, ?, 'new', '[]', ?, ?, ?, ?)`,
      [
        newEmsId,
        fullName,
        fullName,
        ghlContact.email || null,
        phoneNorm,
        emailNorm,
        ghlContact.customFields ? JSON.stringify(ghlContact.customFields) : '{}',
        tenantId
      ]
    );

    await GhlMappingService.setMapping(tenantId, {
      entityType: 'contact',
      emsId: newEmsId,
      ghlId,
      locationId,
      metadata: { name: fullName, phone: phoneNorm, email: emailNorm }
    });

    await GhlSyncLogger.log(tenantId, {
      jobId,
      entityType: 'contact',
      entityId: newEmsId,
      ghlId,
      direction: 'ghl_to_ems',
      operation: 'create',
      status: 'success',
      source
    });

    return { operation: 'create', emsId: newEmsId, ghlId };
  }

  /**
   * Sync single EMS contact to GHL (EMS -> GHL)
   */
  async syncEmsContactToGhl(tenantId, locationId, apiClient, emsContact, { jobId = null, source = 'crm_event' } = {}) {
    try {
      const emsId = emsContact.id;
      const existingGhlId = await GhlMappingService.getGhlId(tenantId, 'contact', emsId);

      const phoneNorm = emsContact.phone_normalized || this.normalizePhone(emsId.replace(/@.*$/, ''));
      const emailNorm = emsContact.email_normalized || this.normalizeEmail(emsContact.email);

      const nameParts = (emsContact.custom_name || emsContact.name || 'EMS Contact').trim().split(' ');
      const firstName = nameParts[0] || 'EMS';
      const lastName = nameParts.slice(1).join(' ') || 'Contact';

      const ghlPayload = {
        locationId,
        firstName,
        lastName,
        name: emsContact.custom_name || emsContact.name,
        email: emsContact.email || undefined,
        phone: phoneNorm ? `+${phoneNorm}` : undefined,
        tags: Array.isArray(emsContact.labels) ? emsContact.labels : []
      };

      if (existingGhlId) {
        // Update GHL Contact
        await apiClient.put(`/contacts/${existingGhlId}`, ghlPayload);

        await GhlSyncLogger.log(tenantId, {
          jobId,
          entityType: 'contact',
          entityId: emsId,
          ghlId: existingGhlId,
          direction: 'ems_to_ghl',
          operation: 'update',
          status: 'success',
          source
        });

        return { success: true, ghlId: existingGhlId, operation: 'update' };
      } else {
        // Create GHL Contact
        const res = await apiClient.post('/contacts/', ghlPayload);
        const newGhlId = res?.contact?.id || res?.id;

        if (newGhlId) {
          await GhlMappingService.setMapping(tenantId, {
            entityType: 'contact',
            emsId,
            ghlId: newGhlId,
            locationId,
            metadata: { name: ghlPayload.name, phone: phoneNorm, email: emailNorm }
          });

          await GhlSyncLogger.log(tenantId, {
            jobId,
            entityType: 'contact',
            entityId: emsId,
            ghlId: newGhlId,
            direction: 'ems_to_ghl',
            operation: 'create',
            status: 'success',
            source
          });

          return { success: true, ghlId: newGhlId, operation: 'create' };
        }
        throw new Error('GHL did not return a contact ID');
      }
    } catch (err) {
      await GhlSyncLogger.log(tenantId, {
        jobId,
        entityType: 'contact',
        entityId: emsContact.id,
        direction: 'ems_to_ghl',
        operation: 'create',
        status: 'failed',
        errorCode: 'EMS_TO_GHL_CONTACT_ERROR',
        errorMessage: err.message,
        source
      });
      return { success: false, error: err.message };
    }
  }

  /**
   * Bulk sync GHL contacts to EMS with pagination
   */
  async syncAllGhlContactsToEms(tenantId, locationId, apiClient, { jobId = null, limit = 100, onProgress = null } = {}) {
    const summary = { created: 0, updated: 0, failed: 0 };
    let hasMore = true;
    let startAfter = null;
    let page = 1;

    while (hasMore) {
      let url = `/contacts/?locationId=${locationId}&limit=${limit}`;
      if (startAfter) {
        url += `&startAfter=${encodeURIComponent(startAfter)}`;
      }

      const response = await apiClient.get(url);
      const contacts = response?.contacts || [];

      if (contacts.length === 0) {
        hasMore = false;
        break;
      }

      for (const contact of contacts) {
        try {
          const res = await this.processGhlContactToEms(tenantId, locationId, contact, { jobId, source: 'sync_engine' });
          if (res.operation === 'create') summary.created++;
          else if (res.operation === 'update') summary.updated++;
        } catch (err) {
          summary.failed++;
          await GhlSyncLogger.log(tenantId, {
            jobId,
            entityType: 'contact',
            ghlId: contact.id,
            direction: 'ghl_to_ems',
            operation: 'create',
            status: 'failed',
            errorCode: 'CONTACT_BATCH_ERROR',
            errorMessage: err.message
          });
        }
      }

      if (onProgress) {
        onProgress(summary);
      }

      // Check pagination tokens
      if (response?.meta?.startAfter) {
        startAfter = response.meta.startAfter;
      } else if (response?.meta?.nextPageUrl) {
        startAfter = contacts[contacts.length - 1]?.id;
      } else if (contacts.length === limit) {
        startAfter = contacts[contacts.length - 1]?.id;
      } else {
        hasMore = false;
      }

      page++;
      // Safety guard against infinite pagination
      if (page > 500) hasMore = false;
    }

    return summary;
  }
}

export default new GhlContactSync();
