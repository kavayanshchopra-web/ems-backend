/**
 * GHL Opportunity Sync Module
 * Synchronizes opportunities between EMS and GHL with dependency resolution
 */

import { getDb } from '../../db.js';
import GhlMappingService from './ghlMappingService.js';
import GhlSyncLogger from './ghlSyncLogger.js';

class GhlOpportunitySync {
  /**
   * Sync GHL Opportunities to EMS
   */
  async syncGhlToEms(tenantId, locationId, apiClient, { jobId = null, source = 'sync_engine' } = {}) {
    const summary = { created: 0, updated: 0, failed: 0 };
    const db = getDb();

    try {
      const response = await apiClient.get(`/opportunities/search?location_id=${locationId}&limit=100`);
      const opportunities = response?.opportunities || [];

      for (const opp of opportunities) {
        try {
          const ghlOppId = opp.id;
          const contactGhlId = opp.contact?.id || opp.contactId;
          const stageGhlId = opp.pipelineStageId || opp.stageId;

          // 1. Resolve Contact Dependency
          let emsContactId = null;
          if (contactGhlId) {
            emsContactId = await GhlMappingService.getEmsId(tenantId, 'contact', contactGhlId);
          }

          // 2. Resolve Stage Dependency
          let emsStageId = 'lead';
          if (stageGhlId) {
            const mappedStage = await GhlMappingService.getEmsId(tenantId, 'stage', stageGhlId);
            if (mappedStage) emsStageId = mappedStage;
          }

          // 3. Resolve Opportunity Mapping
          const existingMap = await GhlMappingService.getMappingByGhlId(tenantId, 'opportunity', ghlOppId);
          const emsOppId = existingMap ? existingMap.ems_id : (emsContactId || `opp_${ghlOppId}`);

          const dealValue = String(opp.monetaryValue || opp.value || '0');

          if (emsContactId) {
            // Update contact's deal value and stage
            await db.run(
              `UPDATE contacts 
               SET deal_value = ?, pipeline_stage = ?
               WHERE id = ? AND tenant_id = ?`,
              [dealValue, emsStageId, emsContactId, tenantId]
            );
          }

          if (existingMap) {
            await GhlMappingService.setMapping(tenantId, {
              entityType: 'opportunity',
              emsId: emsOppId,
              ghlId: ghlOppId,
              locationId,
              metadata: {
                name: opp.name,
                value: dealValue,
                stageId: stageGhlId,
                status: opp.status
              }
            });
            summary.updated++;
            await GhlSyncLogger.log(tenantId, {
              jobId,
              entityType: 'opportunity',
              entityId: emsOppId,
              ghlId: ghlOppId,
              direction: 'ghl_to_ems',
              operation: 'update',
              status: 'success',
              source
            });
          } else {
            await GhlMappingService.setMapping(tenantId, {
              entityType: 'opportunity',
              emsId: emsOppId,
              ghlId: ghlOppId,
              locationId,
              metadata: {
                name: opp.name,
                value: dealValue,
                stageId: stageGhlId,
                status: opp.status
              }
            });
            summary.created++;
            await GhlSyncLogger.log(tenantId, {
              jobId,
              entityType: 'opportunity',
              entityId: emsOppId,
              ghlId: ghlOppId,
              direction: 'ghl_to_ems',
              operation: 'create',
              status: 'success',
              source
            });
          }
        } catch (oppErr) {
          summary.failed++;
          await GhlSyncLogger.log(tenantId, {
            jobId,
            entityType: 'opportunity',
            ghlId: opp.id,
            direction: 'ghl_to_ems',
            operation: 'create',
            status: 'failed',
            errorCode: 'OPPORTUNITY_SYNC_ERROR',
            errorMessage: oppErr.message,
            source
          });
        }
      }
    } catch (err) {
      console.error('[GhlOpportunitySync] Opportunity sync error:', err.message);
      summary.failed++;
    }

    return summary;
  }

  /**
   * Sync single EMS Deal / Opportunity to GHL (EMS -> GHL)
   */
  async syncEmsToGhl(tenantId, locationId, apiClient, emsDeal, { jobId = null, source = 'crm_event' } = {}) {
    try {
      const emsContactId = emsDeal.contact_id || emsDeal.id;
      const contactGhlId = await GhlMappingService.getGhlId(tenantId, 'contact', emsContactId);
      const stageGhlId = emsDeal.pipeline_stage ? await GhlMappingService.getGhlId(tenantId, 'stage', emsDeal.pipeline_stage) : null;
      const pipelineGhlId = emsDeal.pipeline_id ? await GhlMappingService.getGhlId(tenantId, 'pipeline', emsDeal.pipeline_id) : null;

      const existingGhlId = await GhlMappingService.getGhlId(tenantId, 'opportunity', emsDeal.id);

      const ghlPayload = {
        locationId,
        name: emsDeal.name || `Deal: ${emsContactId}`,
        monetaryValue: parseFloat(emsDeal.deal_value || 0) || 0,
        pipelineId: pipelineGhlId || undefined,
        pipelineStageId: stageGhlId || undefined,
        contactId: contactGhlId || undefined,
        status: 'open'
      };

      if (existingGhlId) {
        await apiClient.put(`/opportunities/${existingGhlId}`, ghlPayload);

        await GhlSyncLogger.log(tenantId, {
          jobId,
          entityType: 'opportunity',
          entityId: emsDeal.id,
          ghlId: existingGhlId,
          direction: 'ems_to_ghl',
          operation: 'update',
          status: 'success',
          source
        });

        return { success: true, ghlId: existingGhlId, operation: 'update' };
      } else {
        const res = await apiClient.post('/opportunities/', ghlPayload);
        const createdGhlId = res?.opportunity?.id || res?.id;

        if (createdGhlId) {
          await GhlMappingService.setMapping(tenantId, {
            entityType: 'opportunity',
            emsId: emsDeal.id,
            ghlId: createdGhlId,
            locationId,
            metadata: ghlPayload
          });

          await GhlSyncLogger.log(tenantId, {
            jobId,
            entityType: 'opportunity',
            entityId: emsDeal.id,
            ghlId: createdGhlId,
            direction: 'ems_to_ghl',
            operation: 'create',
            status: 'success',
            source
          });

          return { success: true, ghlId: createdGhlId, operation: 'create' };
        }
        return { success: false, error: 'No opportunity ID returned' };
      }
    } catch (err) {
      await GhlSyncLogger.log(tenantId, {
        jobId,
        entityType: 'opportunity',
        entityId: emsDeal.id,
        direction: 'ems_to_ghl',
        operation: 'create',
        status: 'failed',
        errorCode: 'EMS_TO_GHL_OPP_ERROR',
        errorMessage: err.message,
        source
      });
      return { success: false, error: err.message };
    }
  }
}

export default new GhlOpportunitySync();
