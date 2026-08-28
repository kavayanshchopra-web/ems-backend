/**
 * GHL Pipeline & Stage Sync Module
 * Synchronizes pipelines and stages between EMS and GHL while preserving hierarchy
 */

import { getTenantSettings, updateTenantSettings, getDb } from '../../db.js';
import GhlMappingService from './ghlMappingService.js';
import GhlSyncLogger from './ghlSyncLogger.js';

class GhlPipelineSync {
  /**
   * Sync GHL Pipelines & Stages to EMS
   */
  async syncGhlToEms(tenantId, locationId, apiClient, { jobId = null, source = 'sync_engine' } = {}) {
    const pipelineSummary = { created: 0, updated: 0, failed: 0 };
    const stageSummary = { created: 0, updated: 0, failed: 0 };

    try {
      const response = await apiClient.get(`/opportunities/pipelines?locationId=${locationId}`);
      const ghlPipelines = response?.pipelines || [];

      // Fetch current EMS tenant pipeline settings
      const settings = await getTenantSettings(tenantId) || { pipeline_stages: [] };
      const currentEmsStages = Array.isArray(settings.pipeline_stages) ? [...settings.pipeline_stages] : [];

      for (const pipeline of ghlPipelines) {
        try {
          const ghlPipelineId = pipeline.id;
          const emsPipelineId = `pipeline_${ghlPipelineId}`;

          // 1. Map Pipeline
          const existingPipelineMap = await GhlMappingService.getMappingByGhlId(tenantId, 'pipeline', ghlPipelineId);
          if (!existingPipelineMap) {
            await GhlMappingService.setMapping(tenantId, {
              entityType: 'pipeline',
              emsId: emsPipelineId,
              ghlId: ghlPipelineId,
              locationId,
              metadata: { name: pipeline.name }
            });
            pipelineSummary.created++;
            await GhlSyncLogger.log(tenantId, {
              jobId,
              entityType: 'pipeline',
              entityId: emsPipelineId,
              ghlId: ghlPipelineId,
              direction: 'ghl_to_ems',
              operation: 'create',
              status: 'success',
              source
            });
          } else {
            pipelineSummary.updated++;
            await GhlSyncLogger.log(tenantId, {
              jobId,
              entityType: 'pipeline',
              entityId: existingPipelineMap.ems_id,
              ghlId: ghlPipelineId,
              direction: 'ghl_to_ems',
              operation: 'update',
              status: 'success',
              source
            });
          }

          // 2. Sync Stages for this Pipeline
          const ghlStages = pipeline.stages || [];
          for (let pos = 0; pos < ghlStages.length; pos++) {
            const stage = ghlStages[pos];
            try {
              const ghlStageId = stage.id;
              const emsStageId = `stage_${ghlStageId}`;

              const existingStageMap = await GhlMappingService.getMappingByGhlId(tenantId, 'stage', ghlStageId);

              if (!existingStageMap) {
                // Add to mapping
                await GhlMappingService.setMapping(tenantId, {
                  entityType: 'stage',
                  emsId: emsStageId,
                  ghlId: ghlStageId,
                  locationId,
                  metadata: {
                    name: stage.name,
                    position: pos,
                    pipelineId: ghlPipelineId
                  }
                });

                // Add to EMS stages list if not present
                if (!currentEmsStages.some(s => s.id === emsStageId)) {
                  currentEmsStages.push({
                    id: emsStageId,
                    title: stage.name,
                    color: '#0ea5e9',
                    position: pos,
                    ghlStageId: ghlStageId,
                    pipelineId: ghlPipelineId
                  });
                }
                stageSummary.created++;
                await GhlSyncLogger.log(tenantId, {
                  jobId,
                  entityType: 'stage',
                  entityId: emsStageId,
                  ghlId: ghlStageId,
                  direction: 'ghl_to_ems',
                  operation: 'create',
                  status: 'success',
                  source
                });
              } else {
                // Update stage title in EMS stages list
                const existingIdx = currentEmsStages.findIndex(s => s.id === existingStageMap.ems_id);
                if (existingIdx !== -1) {
                  currentEmsStages[existingIdx].title = stage.name;
                }
                stageSummary.updated++;
                await GhlSyncLogger.log(tenantId, {
                  jobId,
                  entityType: 'stage',
                  entityId: existingStageMap.ems_id,
                  ghlId: ghlStageId,
                  direction: 'ghl_to_ems',
                  operation: 'update',
                  status: 'success',
                  source
                });
              }
            } catch (stageErr) {
              stageSummary.failed++;
              await GhlSyncLogger.log(tenantId, {
                jobId,
                entityType: 'stage',
                ghlId: stage.id,
                direction: 'ghl_to_ems',
                operation: 'create',
                status: 'failed',
                errorCode: 'STAGE_SYNC_ERROR',
                errorMessage: stageErr.message,
                source
              });
            }
          }
        } catch (pipeErr) {
          pipelineSummary.failed++;
          await GhlSyncLogger.log(tenantId, {
            jobId,
            entityType: 'pipeline',
            ghlId: pipeline.id,
            direction: 'ghl_to_ems',
            operation: 'create',
            status: 'failed',
            errorCode: 'PIPELINE_SYNC_ERROR',
            errorMessage: pipeErr.message,
            source
          });
        }
      }

      // Update tenant settings with merged stages
      if (currentEmsStages.length > 0) {
        await updateTenantSettings(tenantId, currentEmsStages, settings.tags || []);
      }
    } catch (err) {
      console.error('[GhlPipelineSync] Pipeline sync failed:', err.message);
      pipelineSummary.failed++;
    }

    return { pipelines: pipelineSummary, stages: stageSummary };
  }

  /**
   * Sync EMS Stages to GHL (Outbound)
   */
  async syncEmsToGhl(tenantId, locationId, apiClient, emsStage, { jobId = null, source = 'sync_engine' } = {}) {
    try {
      const existingGhlId = await GhlMappingService.getGhlId(tenantId, 'stage', emsStage.id);
      if (existingGhlId) {
        return { success: true, ghlId: existingGhlId, operation: 'noop' };
      }
      // GHL stages belong to pipelines; return existing or map
      return { success: true, operation: 'mapped' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}

export default new GhlPipelineSync();
