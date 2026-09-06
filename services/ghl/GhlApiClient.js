import ghlAuthService from './GhlAuthService.js';

/**
 * Standardized HighLevel API Error Class
 */
export class GhlApiError extends Error {
  constructor(message, code = 'GHL_SYNC_ERROR', status = 500, details = null) {
    super(message);
    this.name = 'GhlApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

/**
 * Production-Grade GHL REST API v2/v3 HTTP Client
 * Implements authenticated token injection, rate limit backoff retries,
 * timeout handling, and typed error reporting.
 */
export class GhlApiClient {
  constructor() {
    this.apiBaseUrl = 'https://services.leadconnectorhq.com';
    // Current official HighLevel API version header
    this.apiVersion = '2021-07-28';
    this.maxRetries = 3;
    this.timeoutMs = 10000;
  }

  /**
   * Dispatches an authenticated HTTP request to HighLevel API with automatic token refresh,
   * exponential backoff for rate limits (HTTP 429), and timeout guards.
   * 
   * @param {Object} params
   * @param {string} params.locationId - HighLevel Location ID
   * @param {string} [params.method='GET'] - HTTP Method
   * @param {string} params.path - API Endpoint path (e.g. '/contacts/')
   * @param {Object} [params.body=null] - Request JSON payload
   * @param {Object} [params.query=null] - Query parameters
   * @param {number} [params.attempt=1] - Internal retry attempt counter
   * @returns {Promise<Object>} HighLevel API response payload
   */
  async _request({ locationId, method = 'GET', path, body = null, query = null, attempt = 1 }) {
    if (!locationId) {
      throw new GhlApiError('Location ID is required to make HighLevel API requests', 'GHL_NOT_CONNECTED', 400);
    }

    // 1. Retrieve or refresh valid access token
    let accessToken;
    try {
      accessToken = await ghlAuthService.getValidAccessToken(locationId);
    } catch (authErr) {
      throw new GhlApiError(
        `Failed to acquire valid access token for location ${locationId}: ${authErr.message}`,
        'GHL_AUTH_FAILED',
        401,
        { locationId }
      );
    }

    // 2. Build full URL with query parameters
    let url = `${this.apiBaseUrl}${path}`;
    if (query) {
      const cleanQuery = {};
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null && v !== '') {
          cleanQuery[k] = v;
        }
      }
      const qs = new URLSearchParams(cleanQuery).toString();
      if (qs) {
        url += (url.includes('?') ? '&' : '?') + qs;
      }
    }

    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Version': this.apiVersion,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => controller.abort(), this.timeoutMs);

    const options = {
      method,
      headers,
      signal: controller.signal
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);
      clearTimeout(timeoutTimer);

      // Handle Rate Limiting (HTTP 429)
      if (response.status === 429) {
        if (attempt <= this.maxRetries) {
          const retryAfterHeader = response.headers.get('retry-after');
          const waitSec = retryAfterHeader ? parseInt(retryAfterHeader, 10) : Math.pow(2, attempt);
          console.warn(`[GhlApiClient] Rate limited (429) on ${path}. Retrying in ${waitSec}s (Attempt ${attempt}/${this.maxRetries})...`);
          await new Promise(res => setTimeout(res, waitSec * 1000));
          return this._request({ locationId, method, path, body, query, attempt: attempt + 1 });
        } else {
          throw new GhlApiError('HighLevel API rate limit exceeded. Max retries exhausted.', 'GHL_RATE_LIMITED', 429);
        }
      }

      const rawText = await response.text();
      let data = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        data = { raw: rawText };
      }

      if (!response.ok) {
        const errorMsg = data.message || data.error || `HTTP ${response.status} from HighLevel`;
        if (response.status === 401) {
          throw new GhlApiError(errorMsg, 'GHL_AUTH_FAILED', 401, data);
        } else if (response.status === 404) {
          throw new GhlApiError(errorMsg, 'GHL_NOT_FOUND', 404, data);
        } else if (response.status === 400 || response.status === 422) {
          throw new GhlApiError(errorMsg, 'GHL_VALIDATION_ERROR', response.status, data);
        } else {
          throw new GhlApiError(errorMsg, 'GHL_SYNC_ERROR', response.status, data);
        }
      }

      return data;
    } catch (err) {
      clearTimeout(timeoutTimer);
      if (err instanceof GhlApiError) {
        throw err;
      }
      if (err.name === 'AbortError') {
        throw new GhlApiError(`Request to HighLevel timed out after ${this.timeoutMs}ms`, 'GHL_NETWORK_ERROR', 408);
      }
      throw new GhlApiError(`Network error communicating with HighLevel: ${err.message}`, 'GHL_NETWORK_ERROR', 500);
    }
  }

  // ============================================================================
  // OFFICIAL HIGHLEVEL CONTACTS API METHODS
  // ============================================================================

  /**
   * Retrieve a single Contact by HighLevel Contact ID.
   * Endpoint: GET /contacts/:id
   * 
   * @param {string} locationId 
   * @param {string} ghlContactId 
   * @returns {Promise<Object>} { contact: { id, firstName, lastName, email, phone, ... } }
   */
  async getContact(locationId, ghlContactId) {
    if (!ghlContactId) throw new GhlApiError('ghlContactId is required', 'GHL_VALIDATION_ERROR', 400);
    return this._request({
      locationId,
      method: 'GET',
      path: `/contacts/${ghlContactId}`
    });
  }

  /**
   * Search or list Contacts in a HighLevel location.
   * Endpoint: GET /contacts/?locationId=...&query=...&limit=...
   * 
   * @param {string} locationId 
   * @param {Object} params
   * @param {string} [params.query] - Search term (name, email, or phone)
   * @param {number} [params.limit=20] - Number of records to return (max 100)
   * @param {string} [params.startAfter] - Cursor pagination
   * @returns {Promise<Object>} { contacts: [...], total, meta }
   */
  async searchContacts(locationId, { query = '', limit = 20, startAfter = null } = {}) {
    return this._request({
      locationId,
      method: 'GET',
      path: '/contacts/',
      query: {
        locationId,
        query: query || undefined,
        limit: Math.min(limit, 100),
        startAfter: startAfter || undefined
      }
    });
  }

  /**
   * Create a new Contact in HighLevel.
   * Endpoint: POST /contacts/
   * 
   * @param {string} locationId 
   * @param {Object} contactPayload
   * @returns {Promise<Object>} { contact: { id, ... } }
   */
  async createContact(locationId, contactPayload) {
    return this._request({
      locationId,
      method: 'POST',
      path: '/contacts/',
      body: {
        locationId,
        ...contactPayload
      }
    });
  }

  /**
   * Update an existing Contact in HighLevel.
   * Endpoint: PUT /contacts/:id
   * 
   * @param {string} locationId 
   * @param {string} ghlContactId 
   * @param {Object} contactPayload
   * @returns {Promise<Object>} { contact: { id, ... } }
   */
  async updateContact(locationId, ghlContactId, contactPayload) {
    if (!ghlContactId) throw new GhlApiError('ghlContactId is required for update', 'GHL_VALIDATION_ERROR', 400);
    return this._request({
      locationId,
      method: 'PUT',
      path: `/contacts/${ghlContactId}`,
      body: {
        locationId,
        ...contactPayload
      }
    });
  }

  /**
   * Upsert a Contact in HighLevel (matches on email or phone).
   * Endpoint: POST /contacts/upsert
   * 
   * @param {string} locationId 
   * @param {Object} contactPayload
   * @returns {Promise<Object>} { contact: { id, ... } }
   */
  async upsertContact(locationId, contactPayload) {
    return this._request({
      locationId,
      method: 'POST',
      path: '/contacts/upsert',
      body: {
        locationId,
        ...contactPayload
      }
    });
  }

  /**
   * Searches for an existing contact by exact email or phone number.
   * 
   * @param {string} locationId 
   * @param {Object} criteria
   * @param {string} [criteria.email]
   * @param {string} [criteria.phone]
   * @returns {Promise<Object|null>} Matching GHL contact or null
   */
  async lookupContact(locationId, { email, phone }) {
    if (!email && !phone) return null;

    if (email) {
      const emailResult = await this.searchContacts(locationId, { query: email, limit: 5 });
      const contacts = emailResult.contacts || [];
      const match = contacts.find(c => c.email && c.email.toLowerCase() === email.toLowerCase());
      if (match) return match;
    }

    if (phone) {
      const cleanPhone = phone.replace(/\D/g, '');
      const phoneResult = await this.searchContacts(locationId, { query: phone, limit: 5 });
      const contacts = phoneResult.contacts || [];
      const match = contacts.find(c => c.phone && c.phone.replace(/\D/g, '').includes(cleanPhone.slice(-10)));
      if (match) return match;
    }

    return null;
  }

  // ============================================================================
  // OFFICIAL HIGHLEVEL OPPORTUNITIES & PIPELINES API METHODS
  // ============================================================================

  /**
   * Retrieve all Pipelines and their nested Stages for a HighLevel location.
   * Endpoint: GET /opportunities/pipelines?locationId=...
   * 
   * @param {string} locationId 
   * @returns {Promise<Object>} { pipelines: [ { id, name, stages: [ { id, name, position } ] } ] }
   */
  async getPipelines(locationId) {
    return this._request({
      locationId,
      method: 'GET',
      path: '/opportunities/pipelines',
      query: { locationId }
    });
  }

  /**
   * Retrieve a single Opportunity by HighLevel Opportunity ID.
   * Endpoint: GET /opportunities/:id
   * 
   * @param {string} locationId 
   * @param {string} opportunityId 
   * @returns {Promise<Object>} { opportunity: { id, name, pipelineId, pipelineStageId, status, monetaryValue, contactId, ... } }
   */
  async getOpportunity(locationId, opportunityId) {
    if (!opportunityId) throw new GhlApiError('opportunityId is required', 'GHL_VALIDATION_ERROR', 400);
    return this._request({
      locationId,
      method: 'GET',
      path: `/opportunities/${opportunityId}`
    });
  }

  /**
   * Search or list Opportunities in a HighLevel location.
   * Endpoint: GET /opportunities/search?locationId=...&pipeline_id=...
   * 
   * @param {string} locationId 
   * @param {Object} params
   * @param {string} [params.pipelineId]
   * @param {string} [params.query]
   * @param {number} [params.limit=20]
   * @param {string} [params.startAfter]
   * @returns {Promise<Object>} { opportunities: [...], total, meta }
   */
  async searchOpportunities(locationId, { pipelineId = null, query = '', limit = 20, startAfter = null } = {}) {
    return this._request({
      locationId,
      method: 'GET',
      path: '/opportunities/search',
      query: {
        locationId,
        pipeline_id: pipelineId || undefined,
        query: query || undefined,
        limit: Math.min(limit, 100),
        startAfter: startAfter || undefined
      }
    });
  }

  /**
   * Create a new Opportunity in HighLevel.
   * Endpoint: POST /opportunities/
   * 
   * @param {string} locationId 
   * @param {Object} opportunityPayload
   * @returns {Promise<Object>} { opportunity: { id, ... } }
   */
  async createOpportunity(locationId, opportunityPayload) {
    return this._request({
      locationId,
      method: 'POST',
      path: '/opportunities/',
      body: {
        locationId,
        ...opportunityPayload
      }
    });
  }

  /**
   * Update an existing Opportunity in HighLevel.
   * Endpoint: PUT /opportunities/:id
   * 
   * @param {string} locationId 
   * @param {string} opportunityId 
   * @param {Object} opportunityPayload
   * @returns {Promise<Object>} { opportunity: { id, ... } }
   */
  async updateOpportunity(locationId, opportunityId, opportunityPayload) {
    if (!opportunityId) throw new GhlApiError('opportunityId is required for update', 'GHL_VALIDATION_ERROR', 400);
    return this._request({
      locationId,
      method: 'PUT',
      path: `/opportunities/${opportunityId}`,
      body: opportunityPayload
    });
  }

  /**
   * Update Opportunity Status in HighLevel (open, won, lost, abandoned).
   * Endpoint: PUT /opportunities/:id/status
   * 
   * @param {string} locationId 
   * @param {string} opportunityId 
   * @param {string} status - 'open' | 'won' | 'lost' | 'abandoned'
   * @returns {Promise<Object>}
   */
  async updateOpportunityStatus(locationId, opportunityId, status) {
    if (!opportunityId) throw new GhlApiError('opportunityId is required', 'GHL_VALIDATION_ERROR', 400);
    return this._request({
      locationId,
      method: 'PUT',
      path: `/opportunities/${opportunityId}/status`,
      body: { status }
    });
  }

  /**
   * Delete an Opportunity in HighLevel.
   * Endpoint: DELETE /opportunities/:id
   * 
   * @param {string} locationId 
   * @param {string} opportunityId 
   * @returns {Promise<Object>}
   */
  /**
   * Delete an Opportunity in HighLevel.
   * Endpoint: DELETE /opportunities/:id
   * 
   * @param {string} locationId 
   * @param {string} opportunityId 
   * @returns {Promise<Object>}
   */
  async deleteOpportunity(locationId, opportunityId) {
    if (!opportunityId) throw new GhlApiError('opportunityId is required', 'GHL_VALIDATION_ERROR', 400);
    return this._request({
      locationId,
      method: 'DELETE',
      path: `/opportunities/${opportunityId}`
    });
  }

  /**
   * Post a Call Message with Duration & Recording directly to GHL Conversations Inbox.
   * Endpoint: POST /conversations/messages
   * 
   * @param {string} locationId 
   * @param {Object} params
   * @param {string} params.contactId - GHL Contact ID
   * @param {number} [params.durationSeconds=0] - Call duration in seconds
   * @param {string} [params.recordingUrl=''] - Audio recording URL (.wav/.mp3)
   * @param {string} [params.status='completed'] - Call status
   * @param {string} [params.direction='outbound'] - 'inbound' | 'outbound'
   * @param {string} [params.channel='VOXBAY'] - 'VOXBAY' | 'SIM_COMPANION'
   * @param {string} [params.staffName='Agent'] - Calling agent name
   * @param {string} [params.notes=''] - Call notes
   * @returns {Promise<Object>}
   */
  async createConversationCallMessage(locationId, {
    contactId,
    durationSeconds = 0,
    recordingUrl = '',
    status = 'completed',
    direction = 'outbound',
    channel = 'VOXBAY',
    staffName = 'Agent',
    notes = ''
  }) {
    if (!contactId) throw new GhlApiError('contactId is required to post conversation call', 'GHL_VALIDATION_ERROR', 400);

    const durMins = Math.floor(durationSeconds / 60);
    const durSecs = durationSeconds % 60;
    const durStr = `${durMins}m ${durSecs}s`;

    const normDirection = (direction || '').toLowerCase().includes('in') ? 'inbound' : 'outbound';
    let normStatus = 'completed';
    const s = (status || '').toLowerCase();
    if (s.includes('miss') || s.includes('reject')) normStatus = 'no-answer';
    else if (s.includes('busy')) normStatus = 'busy';
    else if (s.includes('fail')) normStatus = 'failed';
    else normStatus = 'completed';

    const bodyText = [
      `📞 ${normDirection.toUpperCase()} CALL (${channel})`,
      `⏱️ Duration: ${durStr}`,
      `👤 Staff: ${staffName}`,
      `📊 Status: ${normStatus}`,
      notes ? `📝 Notes: ${notes}` : null,
      recordingUrl ? `🎙️ Recording: ${recordingUrl}` : null
    ].filter(Boolean).join('\n');

    let ghlRes = null;
    const isValidAudioUrl = typeof recordingUrl === 'string' && (recordingUrl.startsWith('http://') || recordingUrl.startsWith('https://'));

    // 1. Resolve or create conversation thread for contact
    let conversationId = null;
    try {
      conversationId = await this.resolveOrCreateConversation(locationId, contactId);
    } catch (convErr) {
      console.warn(`[GhlApiClient] resolve conversation notice: ${convErr.message}`);
    }

    // 2. Post call summary message to the contact's GHL conversation thread
    try {
      ghlRes = await this._request({
        locationId,
        method: 'POST',
        path: '/conversations/messages',
        body: {
          type: 'SMS',
          contactId,
          ...(conversationId ? { conversationId } : {}),
          message: bodyText,
          body: bodyText,
          status: 'delivered',
          direction: normDirection,
          ...(isValidAudioUrl ? { attachments: [recordingUrl] } : {})
        }
      });
    } catch (convErr) {
      console.warn(`[GhlApiClient] /conversations/messages Call notice: ${convErr.message}`);
    }

    // 3. Always attach Contact Note so recording link and duration is guaranteed to appear in HighLevel contact activity feed
    try {
      await this.addContactNote(locationId, contactId, bodyText);
    } catch (noteErr) {
      console.warn(`[GhlApiClient] Contact note notice: ${noteErr.message}`);
    }

    return ghlRes || { status: 'success', contactId, conversationId };
  }

  /**
   * Resolve existing or create new Conversation thread for contact in HighLevel
   */
  async resolveOrCreateConversation(locationId, contactId) {
    if (!locationId || !contactId) return null;
    try {
      const searchRes = await this._request({
        locationId,
        method: 'GET',
        path: `/conversations/search?locationId=${encodeURIComponent(locationId)}&contactId=${encodeURIComponent(contactId)}`
      });
      const foundId = searchRes?.conversations?.[0]?.id;
      if (foundId) return foundId;
    } catch (e) {}

    try {
      const createRes = await this._request({
        locationId,
        method: 'POST',
        path: '/conversations/',
        body: { locationId, contactId }
      });
      return createRes?.conversation?.id || createRes?.id || null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Post a WhatsApp / Text Chat Message directly to GHL Conversations Inbox.
   * Endpoint: POST /conversations/messages
   * 
   * @param {string} locationId 
   * @param {Object} params
   * @param {string} params.contactId - GHL Contact ID
   * @param {string} [params.message=''] - Message content
   * @param {string} [params.direction='inbound'] - 'inbound' | 'outbound'
   * @param {string} [params.status='delivered'] - 'delivered' | 'read'
   * @param {string} [params.mediaUrl=''] - Optional media attachment
   * @returns {Promise<Object>}
   */
  async createConversationChatMessage(locationId, {
    contactId,
    message = '',
    direction = 'inbound',
    status = 'delivered',
    mediaUrl = ''
  }) {
    if (!contactId) throw new GhlApiError('contactId is required to post message', 'GHL_VALIDATION_ERROR', 400);

    const bodyText = [
      `💬 WHATSAPP (${direction.toUpperCase()})`,
      message ? `💬 Message: ${message}` : null,
      mediaUrl ? `📎 Media: ${mediaUrl}` : null
    ].filter(Boolean).join('\n');

    const isValidMedia = typeof mediaUrl === 'string' && (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://'));

    // 1. Resolve or create conversation thread
    let conversationId = null;
    try {
      conversationId = await this.resolveOrCreateConversation(locationId, contactId);
    } catch (e) {}

    // 2. Post to /conversations/messages
    const payload = {
      type: 'SMS',
      contactId,
      ...(conversationId ? { conversationId } : {}),
      direction: direction.toLowerCase(),
      status: status.toLowerCase() === 'read' ? 'read' : 'delivered',
      message: message || bodyText,
      body: message || bodyText,
      ...(isValidMedia ? { attachments: [mediaUrl] } : {})
    };

    try {
      return await this._request({
        locationId,
        method: 'POST',
        path: '/conversations/messages',
        body: payload
      });
    } catch (convErr) {
      console.warn(`[GhlApiClient] /conversations/messages note: ${convErr.message}. Fallback to Contact Note.`);
      return await this.addContactNote(locationId, contactId, bodyText);
    }
  }

  /**
   * Add a Note to a HighLevel Contact Timeline.
   * Endpoint: POST /contacts/:id/notes
   * 
   * @param {string} locationId 
   * @param {string} contactId 
   * @param {string} noteBody 
   * @returns {Promise<Object>}
   */
  async addContactNote(locationId, contactId, noteBody) {
    if (!contactId) throw new GhlApiError('contactId is required to add note', 'GHL_VALIDATION_ERROR', 400);
    return this._request({
      locationId,
      method: 'POST',
      path: `/contacts/${contactId}/notes`,
      body: { body: noteBody }
    });
  }
}

export default new GhlApiClient();

