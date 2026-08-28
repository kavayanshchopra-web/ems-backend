/**
 * GHL Custom Field Sync Module
 * Synchronizes dynamic custom field schemas between EMS and GHL
 */

import GhlMappingService from './ghlMappingService.js';
import GhlSyncLogger from './ghlSyncLogger.js';

class GhlCustomFieldSync {
  /**
   * Sync GHL custom fields to EMS
   */
  async syncGhlToEms(tenantId, locationId, apiClient, { jobId = null, source = 'sync_engine' } = {}) {
    const summary = { created: 0, updated: 0, failed: 0 };
    try {
      const response = await apiClient.get(`/locations/${locationId}/customFields`);
      const ghlFields = response?.customFields || [];

      for (const field of ghlFields) {
        try {
          const ghlId = field.id;
          const emsFieldId = field.fieldKey ? field.fieldKey.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase() : `ghl_${ghlId}`;

          // Check existing mapping
          const existingMapping = await GhlMappingService.getMappingByGhlId(tenantId, 'custom_field', ghlId);

          if (existingMapping) {
            // Update mapping metadata
            await GhlMappingService.setMapping(tenantId, {
              entityType: 'custom_field',
              emsId: existingMapping.ems_id,
              ghlId: ghlId,
              locationId,
              metadata: {
                name: field.name,
                fieldKey: field.fieldKey,
                dataType: field.dataType,
                options: field.options
              }
            });
            summary.updated++;
            await GhlSyncLogger.log(tenantId, {
              jobId,
              entityType: 'custom_field',
              entityId: existingMapping.ems_id,
              ghlId,
              direction: 'ghl_to_ems',
              operation: 'update',
              status: 'success',
              source
            });
          } else {
            // Create mapping
            await GhlMappingService.setMapping(tenantId, {
              entityType: 'custom_field',
              emsId: emsFieldId,
              ghlId: ghlId,
              locationId,
              metadata: {
                name: field.name,
                fieldKey: field.fieldKey,
                dataType: field.dataType,
                options: field.options
              }
            });
            summary.created++;
            await GhlSyncLogger.log(tenantId, {
              jobId,
              entityType: 'custom_field',
              entityId: emsFieldId,
              ghlId,
              direction: 'ghl_to_ems',
              operation: 'create',
              status: 'success',
              source
            });
          }
        } catch (err) {
          summary.failed++;
          await GhlSyncLogger.log(tenantId, {
            jobId,
            entityType: 'custom_field',
            ghlId: field.id,
            direction: 'ghl_to_ems',
            operation: 'create',
            status: 'failed',
            errorCode: 'CUSTOM_FIELD_SYNC_ERROR',
            errorMessage: err.message,
            source
          });
        }
      }
    } catch (err) {
      console.error('[GhlCustomFieldSync] Custom fields sync error:', err.message);
      summary.failed++;
    }
    return summary;
  }

  /**
   * Sync single EMS custom field to GHL
   */
  async syncEmsToGhl(tenantId, locationId, apiClient, emsField, { jobId = null, source = 'sync_engine' } = {}) {
    try {
      const existingGhlId = await GhlMappingService.getGhlId(tenantId, 'custom_field', emsField.id);
      if (existingGhlId) {
        return { success: true, ghlId: existingGhlId, operation: 'noop' };
      }

      // Create custom field in GHL
      const ghlPayload = {
        name: emsField.name || emsField.id,
        dataType: emsField.type || 'TEXT',
        placeholder: emsField.placeholder || ''
      };

      const res = await apiClient.post(`/locations/${locationId}/customFields`, ghlPayload);
      const createdGhlId = res?.customField?.id || res?.id;

      if (createdGhlId) {
        await GhlMappingService.setMapping(tenantId, {
          entityType: 'custom_field',
          emsId: emsField.id,
          ghlId: createdGhlId,
          locationId,
          metadata: ghlPayload
        });

        await GhlSyncLogger.log(tenantId, {
          jobId,
          entityType: 'custom_field',
          entityId: emsField.id,
          ghlId: createdGhlId,
          direction: 'ems_to_ghl',
          operation: 'create',
          status: 'success',
          source
        });

        return { success: true, ghlId: createdGhlId, operation: 'create' };
      }
      return { success: false, error: 'No GHL ID returned' };
    } catch (err) {
      await GhlSyncLogger.log(tenantId, {
        jobId,
        entityType: 'custom_field',
        entityId: emsField.id,
        direction: 'ems_to_ghl',
        operation: 'create',
        status: 'failed',
        errorCode: 'EMS_TO_GHL_CUSTOM_FIELD_ERROR',
        errorMessage: err.message,
        source
      });
      return { success: false, error: err.message };
    }
  }
}

export default new GhlCustomFieldSync();
