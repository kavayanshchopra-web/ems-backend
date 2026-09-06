// OmniFlow EMS v2.5 — GoHighLevel (GHL) Official Marketplace OAuth 2.0 Service
// Manages OAuth token exchange, Location ID linking, and GHL sub-account lifecycle

import { db } from '../../firebase.js';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';

const GHL_OAUTH_TOKEN_URL = 'https://services.leadconnectorhq.com/oauth/token';

export class GhlOAuthService {
  /**
   * Generates the official GHL Marketplace 1-Click Install Authorization URL
   */
  static getAuthorizationUrl({ clientId, redirectUri, scopes = [] }) {
    if (!clientId) return '#';
    const cleanScopes = scopes.length > 0 
      ? scopes.join(' ') 
      : 'contacts.readonly contacts.write conversations.readonly conversations.write locations.readonly workflows.readonly';
    
    const cleanRedirect = redirectUri || (typeof window !== 'undefined' ? `${window.location.origin}/api/v1/integrations/oauth/callback` : '');
    
    return `https://marketplace.gohighlevel.com/oauth/chooselocation?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(cleanRedirect)}&scope=${encodeURIComponent(cleanScopes)}`;
  }

  /**
   * Exchanges authorization code for access_token, refresh_token, and locationId
   */
  static async exchangeCodeForToken({ clientId, clientSecret, code, redirectUri, companyId = 'default_tenant' }) {
    if (!code) throw new Error('Authorization code is required from GHL OAuth callback');
    if (!clientId || !clientSecret) throw new Error('GHL Client ID and Client Secret are required');

    const cleanRedirect = redirectUri || (typeof window !== 'undefined' ? `${window.location.origin}/api/v1/integrations/oauth/callback` : '');

    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', cleanRedirect);

    try {
      const response = await fetch(GHL_OAUTH_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: params.toString()
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error_description || 'Failed to exchange GHL OAuth token');
      }

      const locationRecord = {
        companyId,
        locationId: data.locationId || data.location_id || 'unknown_location',
        userId: data.userId || data.user_id || '',
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        tokenType: data.token_type || 'Bearer',
        expiresIn: data.expires_in || 86400,
        scope: data.scope || '',
        userType: data.userType || 'Location',
        installedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Save installed location token in Firestore
      await setDoc(doc(db, 'integrations_ghl_oauth', `${companyId}_${locationRecord.locationId}`), locationRecord);

      return locationRecord;
    } catch (err) {
      console.error('[GhlOAuthService] Token Exchange Error:', err);
      throw err;
    }
  }

  /**
   * Fetch all installed GHL sub-account locations for a tenant company
   */
  static async getInstalledLocations(companyId = 'default_tenant') {
    try {
      const q = query(collection(db, 'integrations_ghl_oauth'), where('companyId', '==', companyId));
      const snap = await getDocs(q);
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      return list;
    } catch (e) {
      const saved = JSON.parse(localStorage.getItem(`omnilflow_ghl_installed_${companyId}`) || '[]');
      return saved;
    }
  }

  /**
   * Directly fetch all contacts from HighLevel Cloud API with cursor pagination
   */
  static async fetchContactsDirectly({ locationId, accessToken, limit = 100, maxTotal = 10000, onPageFetched }) {
    if (!locationId) throw new Error('HighLevel Location ID is required');
    if (!accessToken) throw new Error('HighLevel Access Token is required');

    let startAfter = null;
    let startAfterId = null;
    let hasMore = true;
    let allContacts = [];
    const seenContactIds = new Set();
    let page = 0;
    let totalInGhl = 0;

    while (hasMore && allContacts.length < maxTotal && page < 50) {
      page++;
      const url = new URL('https://services.leadconnectorhq.com/contacts/');
      url.searchParams.append('locationId', locationId);
      url.searchParams.append('limit', String(Math.min(limit, 100)));
      if (startAfter) {
        url.searchParams.append('startAfter', String(startAfter));
      }
      if (startAfterId) {
        url.searchParams.append('startAfterId', String(startAfterId));
      }

      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Version': '2021-07-28',
          'Accept': 'application/json'
        }
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `HighLevel API responded with status ${res.status}`);
      }

      const data = await res.json();
      const contacts = data.contacts || [];
      totalInGhl = data.total || (totalInGhl > 0 ? totalInGhl : contacts.length);

      if (!contacts.length) {
        hasMore = false;
        break;
      }

      let newContactsInThisPage = 0;
      const pageUniqueContacts = [];
      for (const c of contacts) {
        if (!seenContactIds.has(c.id)) {
          seenContactIds.add(c.id);
          allContacts.push(c);
          pageUniqueContacts.push(c);
          newContactsInThisPage++;
        }
      }

      // If no new contacts were returned, stop immediately
      if (newContactsInThisPage === 0) {
        hasMore = false;
        break;
      }

      if (onPageFetched && pageUniqueContacts.length > 0) {
        onPageFetched(pageUniqueContacts, allContacts.length, totalInGhl);
      }

      // Stop if all contacts have been fetched
      if (totalInGhl > 0 && allContacts.length >= totalInGhl) {
        hasMore = false;
        break;
      }

      // Stop if page was not full
      if (contacts.length < limit) {
        hasMore = false;
        break;
      }

      if (data.meta && (data.meta.startAfter || data.meta.startAfterId)) {
        startAfter = data.meta.startAfter;
        startAfterId = data.meta.startAfterId;
      } else {
        const lastContact = contacts[contacts.length - 1];
        startAfter = lastContact.dateAdded;
        startAfterId = lastContact.id;
      }
    }

    return { contacts: allContacts, total: totalInGhl || allContacts.length };
  }

  /**
   * Directly fetch all Pipelines and Opportunities from HighLevel Cloud API
   */
  static async fetchOpportunitiesDirectly({ locationId, accessToken }) {
    if (!locationId) throw new Error('HighLevel Location ID is required');
    if (!accessToken) throw new Error('HighLevel Access Token is required');

    // 1. Fetch Pipelines
    const pipeRes = await fetch(`https://services.leadconnectorhq.com/opportunities/pipelines?locationId=${encodeURIComponent(locationId)}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Version': '2021-07-28',
        'Accept': 'application/json'
      }
    });

    if (!pipeRes.ok) {
      const errJson = await pipeRes.json().catch(() => ({}));
      throw new Error(errJson.message || `Failed to fetch pipelines (${pipeRes.status})`);
    }

    const pipeData = await pipeRes.json();
    const pipelines = pipeData.pipelines || [];
    const allOpportunities = [];

    // 2. Fetch Opportunities for each pipeline
    for (const pipeline of pipelines) {
      try {
        const oppRes = await fetch(`https://services.leadconnectorhq.com/opportunities/search?locationId=${encodeURIComponent(locationId)}&pipelineId=${encodeURIComponent(pipeline.id)}&limit=100`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Version': '2021-07-28',
            'Accept': 'application/json'
          }
        });
        if (oppRes.ok) {
          const oppData = await oppRes.json();
          const opps = oppData.opportunities || [];
          for (const opp of opps) {
            allOpportunities.push({
              ...opp,
              pipelineName: pipeline.name,
              stages: pipeline.stages || []
            });
          }
        }
      } catch (err) {
        console.warn(`Error fetching opps for pipeline ${pipeline.id}:`, err);
      }
    }

    return { pipelines, opportunities: allOpportunities };
  }

  /**
   * Polls the latest recent contacts from HighLevel Cloud API (lightweight single-page query)
   */
  static async pollRecentContacts({ locationId, accessToken, limit = 20 }) {
    if (!locationId || !accessToken) return [];
    try {
      const url = `https://services.leadconnectorhq.com/contacts/?locationId=${encodeURIComponent(locationId)}&limit=${limit}`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Version': '2021-07-28',
          'Accept': 'application/json'
        }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.contacts || [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Directly creates or updates a contact on HighLevel Cloud API
   */
  static async createOrUpdateContactDirectly({ locationId, accessToken, contact }) {
    if (!locationId || !accessToken || !contact) return null;

    const rawName = (contact.name || contact.customer_name || contact.customName || '').trim();
    let firstName = rawName;
    let lastName = '';
    if (rawName.includes(' ')) {
      const parts = rawName.split(' ');
      firstName = parts[0];
      lastName = parts.slice(1).join(' ');
    }

    let phone = (contact.phone || contact.id || '').replace(/[^0-9+]/g, '');
    if (phone.includes('@')) phone = phone.split('@')[0];
    if (phone && !phone.startsWith('+')) {
      if (phone.length === 10) phone = `+91${phone}`;
      else if (phone.length === 12 && phone.startsWith('91')) phone = `+${phone}`;
    }

    const payload = {
      locationId,
      name: rawName || undefined,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      email: (contact.email || '').trim() || undefined,
      phone: phone || undefined,
      tags: Array.isArray(contact.labels || contact.tags) ? (contact.labels || contact.tags) : ['EMS CRM']
    };

    try {
      const res = await fetch(`https://services.leadconnectorhq.com/contacts/upsert`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const fallbackRes = await fetch(`https://services.leadconnectorhq.com/contacts/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Version': '2021-07-28',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        const data = await fallbackRes.json().catch(() => ({}));
        if (data && (data.contact?.id || data.id)) {
          await this.recordSyncAuditLog({
            locationId,
            action: 'PUSH_CONTACT',
            status: 'SUCCESS',
            emsEntityId: contact.id || phone,
            ghlEntityId: data.contact?.id || data.id,
            details: `Provisioned contact "${rawName || phone}" on HighLevel`
          });
        }
        return data;
      }

      const data = await res.json();
      if (data && (data.contact?.id || data.id)) {
        await this.recordSyncAuditLog({
          locationId,
          action: 'PUSH_CONTACT',
          status: 'SUCCESS',
          emsEntityId: contact.id || phone,
          ghlEntityId: data.contact?.id || data.id,
          details: `Provisioned contact "${rawName || phone}" on HighLevel`
        });
      }
      return data;
    } catch (e) {
      console.warn('[GhlOAuthService direct push error]', e.message);
      return null;
    }
  }

  /**
   * Directly posts a call recording event to HighLevel Conversations Cloud API
   */
  static async createConversationCallDirectly({ locationId, accessToken, callLog }) {
    if (!locationId || !accessToken || !callLog) return null;

    try {
      // 1. Resolve or create contact on GHL
      const phone = callLog.customerPhone || callLog.phoneNumber || callLog.phone || '';
      const name = callLog.customerName || 'Customer';

      const contactRes = await this.createOrUpdateContactDirectly({
        locationId,
        accessToken,
        contact: { name, phone }
      });

      const ghlContactId = contactRes?.contact?.id || contactRes?.id;
      if (!ghlContactId) return null;

      const durationSeconds = Number(callLog.durationSeconds || callLog.duration || 0);
      const recordingUrl = callLog.recordingUrl || callLog.recording || callLog.audioUrl || '';
      const rawStatus = (callLog.disposition || callLog.status || 'completed').toLowerCase();
      const direction = (callLog.type || 'OUTGOING').toLowerCase().includes('in') ? 'inbound' : 'outbound';
      const notes = callLog.notes || '';
      const staffName = callLog.agentName || callLog.staffName || 'Agent';

      let normStatus = 'completed';
      if (rawStatus.includes('miss') || rawStatus.includes('reject')) normStatus = 'no-answer';
      else if (rawStatus.includes('busy')) normStatus = 'busy';
      else if (rawStatus.includes('fail')) normStatus = 'failed';

      const durMins = Math.floor(durationSeconds / 60);
      const durSecs = durationSeconds % 60;
      const durStr = `${durMins}m ${durSecs}s`;

      const bodyText = [
        `📞 ${direction.toUpperCase()} CALL`,
        `⏱️ Duration: ${durStr}`,
        `👤 Staff: ${staffName}`,
        `📊 Status: ${normStatus}`,
        notes ? `📝 Notes: ${notes}` : null,
        recordingUrl ? `🎙️ Recording: ${recordingUrl}` : null
      ].filter(Boolean).join('\n');

      let callPostSuccess = false;

      // 1. Attempt standard /conversations/messages
      try {
        const payload = {
          type: 'Call',
          contactId: ghlContactId,
          status: normStatus,
          direction,
          body: bodyText,
          call: {
            duration: durationSeconds,
            status: normStatus,
            ...(recordingUrl ? { recordingUrl } : {})
          },
          ...(recordingUrl ? { attachments: [recordingUrl] } : {})
        };

        const res = await fetch(`https://services.leadconnectorhq.com/conversations/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Version': '2021-07-28',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        if (res.ok) callPostSuccess = true;
      } catch (callErr) {
        console.warn('[GhlOAuthService Call POST notice]', callErr);
      }

      // 2. Attempt inbound/outbound messages endpoint
      if (!callPostSuccess) {
        try {
          const subPath = direction === 'inbound' ? 'inbound' : 'outbound';
          const res = await fetch(`https://services.leadconnectorhq.com/conversations/messages/${subPath}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Version': '2021-07-28',
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              type: direction === 'inbound' ? 'InboundMessage' : 'OutboundMessage',
              locationId,
              contactId: ghlContactId,
              body: bodyText,
              messageType: 'Custom',
              direction,
              attachments: recordingUrl ? [recordingUrl] : []
            })
          });
          if (res.ok) callPostSuccess = true;
        } catch (inboundErr) {
          console.warn('[GhlOAuthService Inbound/Outbound notice]', inboundErr);
        }
      }

      // 3. Always write Contact Note so audio link is guaranteed to display in HighLevel Contact Detail Activity Feed
      try {
        await fetch(`https://services.leadconnectorhq.com/contacts/${ghlContactId}/notes`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Version': '2021-07-28',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ body: bodyText })
        });
      } catch (noteErr) {
        console.warn('[GhlOAuthService Note notice]', noteErr);
      }

      await this.recordSyncAuditLog({
        locationId,
        action: 'PUSH_CALL_RECORDING',
        status: 'SUCCESS',
        emsEntityId: callLog.id || callLog.customerPhone || phone,
        ghlEntityId: ghlContactId,
        details: `Synced ${direction.toUpperCase()} call (${durStr}) for ${name} (${phone})`
      });

      return { success: true, ghlContactId };
    } catch (e) {
      console.warn('[GhlOAuthService call push error]', e.message);
      return null;
    }
  }

  /**
   * Directly posts a WhatsApp / text message to HighLevel Conversations Cloud API
   */
  static async createConversationChatMessageDirectly({ locationId, accessToken, contactId, message }) {
    if (!locationId || !accessToken || !contactId || !message) return null;

    try {
      const text = message.text || message.body || message.textContent || message.caption || message.message || '';
      if (!text && !message.mediaUrl && !message.media_url) return null;

      const direction = (message.fromMe || message.from_me || message.direction === 'outbound') ? 'outbound' : 'inbound';
      const body = text || 'Media attachment';

      // 1. Inbound message endpoint
      if (direction === 'inbound') {
        try {
          const inRes = await fetch(`https://services.leadconnectorhq.com/conversations/messages/inbound`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Version': '2021-07-28',
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              type: 'InboundMessage',
              locationId,
              contactId,
              body,
              messageType: 'Custom',
              direction: 'inbound',
              attachments: (message.mediaUrl || message.media_url) ? [message.mediaUrl || message.media_url] : []
            })
          });
          if (inRes.ok) return await inRes.json().catch(() => ({ success: true }));
        } catch (inErr) {}
      }

      // 2. Outbound / Standard message endpoint
      try {
        const outRes = await fetch(`https://services.leadconnectorhq.com/conversations/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Version': '2021-07-28',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            type: 'Custom',
            contactId,
            body,
            direction,
            status: 'delivered',
            attachments: (message.mediaUrl || message.media_url) ? [message.mediaUrl || message.media_url] : []
          })
        });
        if (outRes.ok) {
          const resJson = await outRes.json().catch(() => ({ success: true }));
          await this.recordSyncAuditLog({
            locationId,
            action: 'SYNC_CHAT_MESSAGE',
            status: 'SUCCESS',
            emsEntityId: message.id || 'wa_msg',
            ghlEntityId: contactId,
            details: `Pushed ${direction.toUpperCase()} message: "${body.substring(0, 30)}..."`
          });
          return resJson;
        }
      } catch (outErr) {}

      return null;
    } catch (e) {
      console.warn('[GhlOAuthService message push error]', e.message);
      return null;
    }
  }

  /**
   * Records a synchronization audit log to Firestore
   */
  static async recordSyncAuditLog({ locationId, tenantId = 'default_tenant', action, status = 'SUCCESS', emsEntityId = '—', ghlEntityId = '—', details = '' }) {
    try {
      const id = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const logDoc = {
        id,
        location_id: locationId || '1g4rrRuP0ubwpF6vqWka',
        locationId: locationId || '1g4rrRuP0ubwpF6vqWka',
        tenant_id: tenantId,
        tenantId,
        direction: 'OUTBOUND',
        event_type: action,
        eventType: action,
        status,
        ems_entity_id: String(emsEntityId || '—'),
        ghl_entity_id: String(ghlEntityId || '—'),
        details: typeof details === 'object' ? JSON.stringify(details) : String(details),
        created_at: new Date().toISOString(),
        timestamp: Date.now()
      };
      await setDoc(doc(db, 'ghl_sync_audit_logs', id), logDoc);
      return logDoc;
    } catch (e) {
      console.warn('[GhlOAuthService record log notice]', e.message);
      return null;
    }
  }

  /**
   * Fetches sync audit logs from Firestore
   */
  static async getSyncAuditLogs(locationId = null, limitCount = 50) {
    try {
      const snap = await getDocs(collection(db, 'ghl_sync_audit_logs'));
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.timestamp || new Date(b.created_at || 0).getTime()) - (a.timestamp || new Date(a.created_at || 0).getTime()));
      if (locationId) {
        return list.filter(l => !l.location_id || l.location_id === locationId || l.locationId === locationId).slice(0, limitCount);
      }
      return list.slice(0, limitCount);
    } catch (e) {
      console.warn('[GhlOAuthService fetch logs notice]', e.message);
      return [];
    }
  }

  /**
   * Revoke & Disconnect a GHL sub-account location
   */
  static async disconnectLocation(docId) {
    if (!docId) return;
    try {
      await deleteDoc(doc(db, 'integrations_ghl_oauth', docId));
    } catch (e) {
      console.warn('Local location delete:', e);
    }
  }
}

export default GhlOAuthService;
