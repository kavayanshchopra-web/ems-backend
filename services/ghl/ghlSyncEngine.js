/**
 * GHL Master Sync Engine
 * Orchestrates Initial Sync, Sync Now, Batch Pagination, Concurrency Locks, and Error Recovery
 */

import { 
  getGhlIntegrationByTenant, 
  createGhlSyncJob, 
  getGhlSyncJob, 
  getLatestGhlSyncJob, 
  updateGhlSyncJobProgress,
  getFailedGhlSyncLogs
} from '../../db.js';
import GhlApiClient from './ghlApiClient.js';
import GhlMockClient from './ghlMockClient.js';
import GhlPipelineSync from './ghlPipelineSync.js';
import GhlCustomFieldSync from './ghlCustomFieldSync.js';
import GhlContactSync from './ghlContactSync.js';
import GhlOpportunitySync from './ghlOpportunitySync.js';
import GhlSyncLogger from './ghlSyncLogger.js';

class GhlSyncEngine {
  /**
   * Run full bidirectional synchronization for a tenant
   */
  async runFullSync(tenantId, { useMock = false, mockClient = null, source = 'sync_now' } = {}) {
    // 1. Verify GHL Integration Status for Tenant
    const integration = await getGhlIntegrationByTenant(tenantId);
    if (!integration || integration.status !== 'connected') {
      const err = new Error('GoHighLevel integration is not active or connected for this tenant');
      err.status = 400;
      throw err;
    }

    const locationId = integration.ghl_location_id;

    // 2. Create Sync Job Lock
    const syncJob = await createGhlSyncJob(tenantId, { jobType: 'full', direction: 'bidirectional' });
    const jobId = syncJob.id;

    // 3. Resolve API Client (Live or Test Mock)
    const apiClient = useMock ? (mockClient || new GhlMockClient(locationId)) : new GhlApiClient(tenantId);

    const overallSummary = {
      pipelines: { created: 0, updated: 0, failed: 0 },
      stages: { created: 0, updated: 0, failed: 0 },
      customFields: { created: 0, updated: 0, failed: 0 },
      contacts: { created: 0, updated: 0, failed: 0 },
      opportunities: { created: 0, updated: 0, failed: 0 }
    };

    // Run async sync execution
    const executeSync = async () => {
      try {
        // -------------------------------------------------------------
        // STEP 1: Pipelines & Stages Sync
        // -------------------------------------------------------------
        await updateGhlSyncJobProgress(tenantId, jobId, {
          progress_stage: 'pipelines',
          summary: overallSummary
        });

        const pipeResult = await GhlPipelineSync.syncGhlToEms(tenantId, locationId, apiClient, { jobId, source });
        overallSummary.pipelines = pipeResult.pipelines;
        overallSummary.stages = pipeResult.stages;

        // -------------------------------------------------------------
        // STEP 2: Custom Fields Sync
        // -------------------------------------------------------------
        await updateGhlSyncJobProgress(tenantId, jobId, {
          progress_stage: 'custom_fields',
          summary: overallSummary
        });

        const cfResult = await GhlCustomFieldSync.syncGhlToEms(tenantId, locationId, apiClient, { jobId, source });
        overallSummary.customFields = cfResult;

        // -------------------------------------------------------------
        // STEP 3: Contacts Sync (Paginated Batches)
        // -------------------------------------------------------------
        await updateGhlSyncJobProgress(tenantId, jobId, {
          progress_stage: 'contacts',
          summary: overallSummary
        });

        const contactResult = await GhlContactSync.syncAllGhlContactsToEms(tenantId, locationId, apiClient, {
          jobId,
          limit: 100,
          onProgress: (batchSummary) => {
            overallSummary.contacts = batchSummary;
            updateGhlSyncJobProgress(tenantId, jobId, {
              summary: overallSummary,
              records_processed: batchSummary.created + batchSummary.updated + batchSummary.failed,
              records_created: batchSummary.created,
              records_updated: batchSummary.updated,
              records_failed: batchSummary.failed
            }).catch(() => {});
          }
        });
        overallSummary.contacts = contactResult;

        // -------------------------------------------------------------
        // STEP 4: Opportunities Sync
        // -------------------------------------------------------------
        await updateGhlSyncJobProgress(tenantId, jobId, {
          progress_stage: 'opportunities',
          summary: overallSummary
        });

        const oppResult = await GhlOpportunitySync.syncGhlToEms(tenantId, locationId, apiClient, { jobId, source });
        overallSummary.opportunities = oppResult;

        // -------------------------------------------------------------
        // STEP 5: Finalize Job Status
        // -------------------------------------------------------------
        const totalCreated = overallSummary.pipelines.created + overallSummary.stages.created +
                             overallSummary.customFields.created + overallSummary.contacts.created +
                             overallSummary.opportunities.created;

        const totalUpdated = overallSummary.pipelines.updated + overallSummary.stages.updated +
                             overallSummary.customFields.updated + overallSummary.contacts.updated +
                             overallSummary.opportunities.updated;

        const totalFailed = overallSummary.pipelines.failed + overallSummary.stages.failed +
                            overallSummary.customFields.failed + overallSummary.contacts.failed +
                            overallSummary.opportunities.failed;

        const finalStatus = totalFailed === 0 ? 'completed' : (totalCreated + totalUpdated > 0 ? 'partial_success' : 'failed');

        await updateGhlSyncJobProgress(tenantId, jobId, {
          status: finalStatus,
          progress_stage: 'completed',
          records_processed: totalCreated + totalUpdated + totalFailed,
          records_created: totalCreated,
          records_updated: totalUpdated,
          records_failed: totalFailed,
          summary: overallSummary
        });

        console.log(`[GhlSyncEngine] Sync Job #${jobId} completed with status: ${finalStatus}`);
      } catch (err) {
        console.error(`[GhlSyncEngine] Sync Job #${jobId} fatal error:`, err.message);
        await updateGhlSyncJobProgress(tenantId, jobId, {
          status: 'failed',
          progress_stage: 'failed',
          error_message: err.message,
          summary: overallSummary
        });
      }
    };

    // Execute synchronous or asynchronous
    const syncPromise = executeSync();
    return {
      jobId,
      status: 'running',
      locationId,
      startedAt: syncJob.started_at,
      syncPromise
    };
  }

  /**
   * Get sync status and progress for tenant
   */
  async getSyncStatus(tenantId) {
    const latestJob = await getLatestGhlSyncJob(tenantId);
    if (!latestJob) {
      return {
        status: 'ready',
        lastSync: null,
        summary: null
      };
    }
    return {
      jobId: latestJob.id,
      status: latestJob.status,
      progressStage: latestJob.progress_stage,
      recordsProcessed: latestJob.records_processed,
      recordsCreated: latestJob.records_created,
      recordsUpdated: latestJob.records_updated,
      recordsFailed: latestJob.records_failed,
      summary: latestJob.summary,
      errorMessage: latestJob.error_message,
      startedAt: latestJob.started_at,
      completedAt: latestJob.completed_at
    };
  }

  /**
   * Retry failed sync items
   */
  async retryFailedItems(tenantId, { useMock = false, mockClient = null } = {}) {
    const failedLogs = await getFailedGhlSyncLogs(tenantId, 50);
    if (failedLogs.length === 0) {
      return { message: 'No failed records to retry', retried: 0 };
    }

    const integration = await getGhlIntegrationByTenant(tenantId);
    if (!integration || integration.status !== 'connected') {
      throw new Error('Integration not connected');
    }

    const locationId = integration.ghl_location_id;
    const apiClient = useMock ? (mockClient || new GhlMockClient(locationId)) : new GhlApiClient(tenantId);

    let successCount = 0;
    let failCount = 0;

    for (const log of failedLogs) {
      try {
        if (log.entity_type === 'contact' && log.ghl_id) {
          const ghlContact = await apiClient.get(`/contacts/${log.ghl_id}`);
          if (ghlContact?.contact) {
            await GhlContactSync.processGhlContactToEms(tenantId, locationId, ghlContact.contact, { source: 'retry' });
            successCount++;
          }
        }
      } catch (err) {
        failCount++;
      }
    }

    return {
      message: `Retried ${failedLogs.length} items: ${successCount} succeeded, ${failCount} failed`,
      retried: failedLogs.length,
      successCount,
      failCount
    };
  }
}

export default new GhlSyncEngine();
