/**
 * GHL Sync Logger
 * Audit logger for all synchronization operations with safe token redaction
 */

import { createGhlSyncLog, getGhlSyncLogs, getFailedGhlSyncLogs } from '../../db.js';

class GhlSyncLogger {
  /**
   * Log a sync operation result
   */
  async log(tenantId, {
    jobId = null,
    entityType,
    entityId = null,
    ghlId = null,
    direction = 'ghl_to_ems',
    operation = 'create',
    status = 'success',
    errorCode = null,
    errorMessage = null,
    retryCount = 0,
    source = 'sync_engine',
    idempotencyKey = null,
    payload = null
  }) {
    try {
      // Redact any potential tokens or secrets from payload
      let safeSnippet = null;
      if (payload) {
        const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
        safeSnippet = payloadStr
          .replace(/("?(access_token|refresh_token|client_secret|authorization)"?s*:s*)"[^"]+"/gi, '$1"[REDACTED]"')
          .substring(0, 1000);
      }

      await createGhlSyncLog(tenantId, {
        job_id: jobId,
        entity_type: entityType,
        entity_id: entityId,
        ghl_id: ghlId,
        direction,
        operation,
        status,
        error_code: errorCode,
        error_message: errorMessage,
        retry_count: retryCount,
        source,
        idempotency_key: idempotencyKey,
        payload_snippet: safeSnippet
      });
    } catch (err) {
      console.error('[GhlSyncLogger] Failed to write sync log:', err.message);
    }
  }

  /**
   * Get sync logs for tenant
   */
  async getLogs(tenantId, options = {}) {
    return await getGhlSyncLogs(tenantId, options);
  }

  /**
   * Get failed logs for tenant
   */
  async getFailedLogs(tenantId, limit = 100) {
    return await getFailedGhlSyncLogs(tenantId, limit);
  }
}

export default new GhlSyncLogger();
