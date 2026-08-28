/**
 * GHL Integration Express Router (Phase 1 & Phase 2)
 * Endpoints for OAuth, Status, Disconnect, Webhook, Sync Controls, Sync Status, Logs & Mappings
 */

import express from 'express';
import GhlAuthService from './ghlAuthService.js';
import GhlLocationService from './ghlLocationService.js';
import GhlWebhookService from './ghlWebhookService.js';
import GhlApiClient from './ghlApiClient.js';
import GhlSyncEngine from './ghlSyncEngine.js';
import GhlSyncLogger from './ghlSyncLogger.js';
import GhlMappingService from './ghlMappingService.js';


/**
 * Shared OAuth Callback Controller
 * Can be mounted at /api/v1/integrations/oauth/callback or /api/v1/integrations/ghl/oauth/callback
 */
export async function handleOAuthCallback(req, res) {
  const { code, state, error, error_description } = req.query;

  if (error) {
    console.error('[GHL Routes] OAuth Access Denied by user:', error, error_description);
    return res.status(400).send(`
      <html>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h2 style="color: #ef4444;">GoHighLevel Connection Cancelled</h2>
          <p>${error_description || error}</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GHL_OAUTH_ERROR', error: '${error}' }, '*');
              setTimeout(() => window.close(), 2500);
            }
          </script>
        </body>
      </html>
    `);
  }

  if (!code || !state) {
    return res.status(400).send(`
      <html>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h2 style="color: #ef4444;">Invalid Authorization Response</h2>
          <p>Missing authorization code or security state.</p>
        </body>
      </html>
    `);
  }

  try {
    const result = await GhlAuthService.handleCallback({ code, state });

    return res.send(`
      <html>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h2 style="color: #10b981;">⚡ GoHighLevel Connected Successfully!</h2>
          <p>Location ID: <strong>${result.locationId}</strong> linked to your account.</p>
          <p style="color: #64748b; font-size: 13px;">This window will close automatically...</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'GHL_OAUTH_SUCCESS', 
                tenantId: ${result.tenantId},
                locationId: '${result.locationId}'
              }, '*');
              setTimeout(() => window.close(), 1500);
            }
          </script>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('[GHL Routes] Callback Processing Error:', err.message);
    return res.status(400).send(`
      <html>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h2 style="color: #ef4444;">Authorization Failed</h2>
          <p>${err.message}</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GHL_OAUTH_ERROR', error: '${err.message}' }, '*');
              setTimeout(() => window.close(), 3000);
            }
          </script>
        </body>
      </html>
    `);
  }
}

export function setupGhlRoutes() {
  const router = express.Router();

  // -------------------------------------------------------------
  // 1. GET /oauth/authorize (Protected: requires valid EMS user JWT)
  // -------------------------------------------------------------
  router.get('/oauth/authorize', async (req, res) => {
    try {
      const tenantId = req.user?.tenant_id || 1;
      const userId = req.user?.id || 1;

      const authData = await GhlAuthService.generateAuthorizationUrl({ tenantId, userId });
      return res.json(authData);
    } catch (err) {
      console.error('[GHL Routes] /oauth/authorize error:', err.message);
      return res.status(500).json({ error: err.message || 'Failed to generate authorization URL' });
    }
  });

  // -------------------------------------------------------------
  // 2. GET /oauth/callback (Public: LeadConnector OAuth Redirect)
  // -------------------------------------------------------------
  router.get('/oauth/callback', handleOAuthCallback);

  // -------------------------------------------------------------
  // 3. GET /status (Protected: queries connection status)
  // -------------------------------------------------------------
  router.get('/status', async (req, res) => {
    try {
      const tenantId = req.user?.tenant_id;
      if (!tenantId) {
        return res.status(401).json({ error: 'Tenant context required' });
      }

      const status = await GhlLocationService.getGhlIntegrationStatus(tenantId);
      return res.json(status);
    } catch (err) {
      console.error('[GHL Routes] /status error:', err.message);
      return res.status(500).json({ error: err.message || 'Failed to get integration status' });
    }
  });

  // -------------------------------------------------------------
  // 4. POST /disconnect (Protected: purges tokens and disconnects)
  // -------------------------------------------------------------
  router.post('/disconnect', async (req, res) => {
    try {
      const tenantId = req.user?.tenant_id;
      if (!tenantId) {
        return res.status(401).json({ error: 'Tenant context required' });
      }

      const result = await GhlLocationService.disconnect(tenantId);
      return res.json(result);
    } catch (err) {
      console.error('[GHL Routes] /disconnect error:', err.message);
      return res.status(500).json({ error: err.message || 'Failed to disconnect integration' });
    }
  });

  // -------------------------------------------------------------
  // 5. POST /test-connection (Protected: tests GHL API connectivity)
  // -------------------------------------------------------------
  router.post('/test-connection', async (req, res) => {
    try {
      const tenantId = req.user?.tenant_id;
      if (!tenantId) {
        return res.status(401).json({ error: 'Tenant context required' });
      }

      const integration = await GhlLocationService.getIntegrationStatus(tenantId);
      if (!integration.connected) {
        return res.status(400).json({ error: 'GHL Integration is not connected' });
      }

      const client = new GhlApiClient(tenantId);
      const response = await client.get(`/locations/${integration.locationId}/customFields`);

      return res.json({
        success: true,
        message: 'GHL API connection verified successfully',
        locationId: integration.locationId,
        data: response
      });
    } catch (err) {
      console.error('[GHL Routes] /test-connection error:', err.message);
      return res.status(500).json({ error: err.message || 'Connection test failed' });
    }
  });

  // -------------------------------------------------------------
  // 6. POST /webhook (Public: receives inbound webhooks)
  // -------------------------------------------------------------
  router.post('/webhook', async (req, res) => {
    try {
      const result = await GhlWebhookService.processWebhook(req.body, req.headers);
      return res.status(result.status || 200).json(result);
    } catch (err) {
      console.error('[GHL Routes] /webhook error:', err.message);
      return res.status(500).json({ error: 'Internal Webhook Processing Error' });
    }
  });

  // -------------------------------------------------------------
  // 7. POST /sync/start (Protected: Triggers full sync or sync now)
  // -------------------------------------------------------------
  router.post('/sync/start', async (req, res) => {
    try {
      const tenantId = req.user?.tenant_id;
      if (!tenantId) {
        return res.status(401).json({ error: 'Tenant context required' });
      }

      const { useMock = false } = req.body || {};
      const syncResult = await GhlSyncEngine.runFullSync(tenantId, { useMock, source: 'sync_now' });

      return res.json({
        success: true,
        message: 'Synchronization started',
        jobId: syncResult.jobId,
        status: syncResult.status,
        startedAt: syncResult.startedAt
      });
    } catch (err) {
      console.error('[GHL Routes] /sync/start error:', err.message);
      const status = err.status || 500;
      return res.status(status).json({
        error: err.message || 'Failed to start sync',
        activeJobId: err.activeJobId || null
      });
    }
  });

  // -------------------------------------------------------------
  // 8. GET /sync/status (Protected: Polls latest sync progress)
  // -------------------------------------------------------------
  router.get('/sync/status', async (req, res) => {
    try {
      const tenantId = req.user?.tenant_id;
      if (!tenantId) {
        return res.status(401).json({ error: 'Tenant context required' });
      }

      const status = await GhlSyncEngine.getSyncStatus(tenantId);
      return res.json(status);
    } catch (err) {
      console.error('[GHL Routes] /sync/status error:', err.message);
      return res.status(500).json({ error: err.message || 'Failed to get sync status' });
    }
  });

  // -------------------------------------------------------------
  // 9. GET /sync/logs (Protected: Returns tenant sync audit logs)
  // -------------------------------------------------------------
  router.get('/sync/logs', async (req, res) => {
    try {
      const tenantId = req.user?.tenant_id;
      if (!tenantId) {
        return res.status(401).json({ error: 'Tenant context required' });
      }

      const { entityType, status, limit = 50, offset = 0 } = req.query;
      const logs = await GhlSyncLogger.getLogs(tenantId, {
        entityType,
        status,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10)
      });

      return res.json({ logs });
    } catch (err) {
      console.error('[GHL Routes] /sync/logs error:', err.message);
      return res.status(500).json({ error: err.message || 'Failed to get sync logs' });
    }
  });

  // -------------------------------------------------------------
  // 10. POST /sync/retry-failed (Protected: Retries failed items)
  // -------------------------------------------------------------
  router.post('/sync/retry-failed', async (req, res) => {
    try {
      const tenantId = req.user?.tenant_id;
      if (!tenantId) {
        return res.status(401).json({ error: 'Tenant context required' });
      }

      const { useMock = false } = req.body || {};
      const result = await GhlSyncEngine.retryFailedItems(tenantId, { useMock });
      return res.json(result);
    } catch (err) {
      console.error('[GHL Routes] /sync/retry-failed error:', err.message);
      return res.status(500).json({ error: err.message || 'Failed to retry failed items' });
    }
  });

  // -------------------------------------------------------------
  // 11. GET /mappings (Protected: Returns entity ID mappings)
  // -------------------------------------------------------------
  router.get('/mappings', async (req, res) => {
    try {
      const tenantId = req.user?.tenant_id;
      if (!tenantId) {
        return res.status(401).json({ error: 'Tenant context required' });
      }

      const { entityType } = req.query;
      const mappings = await GhlMappingService.listMappings(tenantId, entityType);
      return res.json({ mappings });
    } catch (err) {
      console.error('[GHL Routes] /mappings error:', err.message);
      return res.status(500).json({ error: err.message || 'Failed to get mappings' });
    }
  });

  return router;
}

export default setupGhlRoutes;
