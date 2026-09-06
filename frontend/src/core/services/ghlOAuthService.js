// OmniFlow EMS v2.5 — GoHighLevel (GHL) Official Marketplace OAuth 2.0 Service
// Manages OAuth token exchange, Location ID linking, and GHL sub-account lifecycle

import { db, storage } from '../../firebase.js';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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
      if (list.length > 0) return list;

      // Fallback: Query all docs in integrations_ghl_oauth if companyId differed
      const allSnap = await getDocs(collection(db, 'integrations_ghl_oauth'));
      allSnap.forEach(d => {
        const data = d.data();
        if (data && data.accessToken) {
          list.push({ id: d.id, ...data });
        }
      });
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
   * Helper to parse arbitrary duration strings (e.g. "36s", "00:30", "1m 15s") to seconds
   */
  static parseDurationToSeconds(val) {
    if (val === undefined || val === null) return 30;
    if (typeof val === 'number' && !isNaN(val)) return Math.max(0, Math.round(val));
    const str = String(val).trim().toLowerCase();
    if (!str) return 30;
    if (/^\d+\s*s?$/.test(str)) {
      const p = parseInt(str, 10);
      return !isNaN(p) && p >= 0 ? p : 30;
    }
    if (str.includes(':')) {
      const parts = str.split(':').map(p => parseInt(p, 10) || 0);
      if (parts.length === 2) return parts[0] * 60 + parts[1];
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    const minM = str.match(/(\d+)\s*m/);
    const secM = str.match(/(\d+)\s*s/);
    if (minM || secM) {
      return (minM ? parseInt(minM[1], 10) * 60 : 0) + (secM ? parseInt(secM[1], 10) : 0);
    }
    const num = parseInt(str.replace(/\D/g, ''), 10);
    return !isNaN(num) && num >= 0 ? num : 30;
  }

  /**
   * Directly creates or updates a contact on HighLevel Cloud API
   */
  static async createOrUpdateContactDirectly({ locationId, accessToken, contact }) {
    if (!locationId || !accessToken || !contact) return null;

    const rawName = (contact.name || contact.customerName || contact.customer_name || contact.customName || '').trim();
    let firstName = rawName;
    let lastName = '';
    if (rawName.includes(' ')) {
      const parts = rawName.split(' ');
      firstName = parts[0];
      lastName = parts.slice(1).join(' ');
    }

    const rawPhone = String(contact.phone || contact.phoneNumber || contact.customerPhone || contact.id || '').trim();
    const cleanDigits = rawPhone.replace(/\D/g, '');
    const normPhone10 = cleanDigits.length >= 7 ? cleanDigits.slice(-10) : cleanDigits;

    let phone = rawPhone.replace(/[^0-9+]/g, '');
    if (phone.includes('@')) phone = phone.split('@')[0];
    if (phone && !phone.startsWith('+')) {
      if (phone.length === 10) phone = `+91${phone}`;
      else if (phone.length === 11 && phone.startsWith('0')) phone = `+91${phone.slice(1)}`;
      else if (phone.length === 12 && phone.startsWith('91')) phone = `+${phone}`;
    }

    // Step A: Search for existing contact by phone query in HighLevel first!
    if (normPhone10 && normPhone10.length >= 7) {
      try {
        const searchUrl = `https://services.leadconnectorhq.com/contacts/?locationId=${encodeURIComponent(locationId)}&query=${encodeURIComponent(normPhone10)}`;
        const searchRes = await fetch(searchUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Version': '2021-07-28',
            'Accept': 'application/json'
          }
        });
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (Array.isArray(searchData?.contacts) && searchData.contacts.length > 0) {
            const matched = searchData.contacts.find(c => {
              const cDigits = String(c.phone || '').replace(/\D/g, '');
              return cDigits.endsWith(normPhone10) || cDigits.includes(normPhone10);
            }) || searchData.contacts[0];

            if (matched && matched.id) {
              // If matched contact in GHL is missing name or is just phone number, update it to real customer name
              if (rawName && rawName.toLowerCase() !== 'customer' && (!matched.name || matched.name.replace(/\D/g, '') === normPhone10 || matched.name.includes('0'))) {
                try {
                  await fetch(`https://services.leadconnectorhq.com/contacts/${matched.id}`, {
                    method: 'PUT',
                    headers: {
                      'Authorization': `Bearer ${accessToken}`,
                      'Version': '2021-07-28',
                      'Content-Type': 'application/json',
                      'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                      name: rawName,
                      firstName: firstName || rawName,
                      lastName: lastName || undefined,
                      ...(contact.email ? { email: contact.email } : {})
                    })
                  });
                } catch (putErr) {}
              }

              return { contact: matched, id: matched.id };
            }
          }
        }
      } catch (searchErr) {
        console.warn('[GhlOAuthService Contact Search Notice]', searchErr);
      }
    }

    // Step B: Upsert contact if not found by search
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
   * Converts Base64 audio into a permanent public HTTPS URL (via Backend API / Firebase Storage) for GHL attachment & playback
   */
  static async uploadAudioBase64ToStorage(base64Data, callId = '') {
    if (!base64Data || typeof base64Data !== 'string') return null;
    if (!base64Data.startsWith('data:audio/')) return null;

    // 1. Try uploading to Backend API server first for instantaneous static MP3 persistence
    try {
      const isDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      const customGateway = typeof window !== 'undefined' ? localStorage.getItem('omniflow_custom_gateway') : null;
      const apiBase = customGateway || (isDev ? 'http://localhost:5000/api' : 'https://api.employeemanagementsystems.com/api');

      const uploadRes = await fetch(`${apiBase}/telecalling/upload-recording`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: base64Data,
          callId: String(callId || Date.now())
        })
      });

      if (uploadRes.ok) {
        const uploadJson = await uploadRes.json();
        if (uploadJson && (uploadJson.url || uploadJson.recordingUrl)) {
          return uploadJson.url || uploadJson.recordingUrl;
        }
      }
    } catch (apiErr) {
      console.warn('[uploadAudioBase64ToStorage Backend Notice]', apiErr.message);
    }

    // 2. Fallback to Firebase Storage
    try {
      if (storage) {
        const arr = base64Data.split(',');
        if (arr.length < 2) return null;
        const mimeMatch = arr[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'audio/mp4';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const ext = mime.includes('mp4') || mime.includes('m4a') ? 'm4a' : (mime.includes('wav') ? 'wav' : 'mp3');
        const safeId = String(callId || Date.now()).replace(/[^a-zA-Z0-9_-]/g, '_');
        const storageRef = ref(storage, `call_recordings/${safeId}.${ext}`);
        const snapshot = await uploadBytes(storageRef, blob, { contentType: mime });
        const downloadUrl = await getDownloadURL(snapshot.ref);
        return downloadUrl;
      }
    } catch (e) {
      console.warn('[uploadAudioBase64ToStorage Firebase Notice]', e.message);
    }
    return null;
  }

  /**
   * Directly posts a call recording event to HighLevel Conversations Cloud API
   */
  static async createConversationCallDirectly({ locationId, accessToken, callLog }) {
    if (!locationId || !accessToken || !callLog) return null;

    try {
      // 1. Resolve or create contact on GHL
      const phone = callLog.customerPhone || callLog.phoneNumber || callLog.phone || '';
      const name = callLog.customerName || callLog.contactName || callLog.name || 'Customer';

      const contactRes = await this.createOrUpdateContactDirectly({
        locationId,
        accessToken,
        contact: { name, phone }
      });

      const ghlContactId = contactRes?.contact?.id || contactRes?.id;
      if (!ghlContactId) return null;

      const durationSeconds = this.parseDurationToSeconds(callLog.durationSeconds ?? callLog.duration);
      let recordingUrl = callLog.recordingUrl || callLog.recording || callLog.audioUrl || callLog.audio_url || callLog.audioBase64 || callLog.recordingBase64 || '';
      const rawStatus = (callLog.disposition || callLog.status || 'completed').toLowerCase();
      const direction = (callLog.type || callLog.callType || 'OUTGOING').toLowerCase().includes('in') ? 'inbound' : 'outbound';
      let rawNotes = String(callLog.notes || '').trim();
      const staffName = callLog.agentName || callLog.staffName || 'Mobile Agent';

      // 1. Auto-upload Base64 audio from mobile app to get a real playable HTTPS URL
      if (recordingUrl && typeof recordingUrl === 'string' && recordingUrl.startsWith('data:audio/')) {
        try {
          const uploadedUrl = await this.uploadAudioBase64ToStorage(recordingUrl, callLog.id || phone);
          if (uploadedUrl) {
            recordingUrl = uploadedUrl;
          }
        } catch (upErr) {
          console.warn('[Audio upload notice]', upErr);
        }
      }

      // Ensure raw base64 string is NEVER placed in notes or body text
      if (rawNotes.includes('data:audio/')) {
        rawNotes = rawNotes.replace(/data:audio\/[a-zA-Z0-9+=/;,\s]+/g, '[HD Audio Stream]');
      }

      const isValidAudioUrl = typeof recordingUrl === 'string' && (recordingUrl.startsWith('http://') || recordingUrl.startsWith('https://'));

      let audioDisplayLine = null;
      if (isValidAudioUrl) {
        audioDisplayLine = `🎙️ Audio Recording: ${recordingUrl}`;
      } else if (recordingUrl && typeof recordingUrl === 'string' && recordingUrl.startsWith('data:audio/')) {
        audioDisplayLine = `🎙️ Audio: [HD Audio recorded on SIM Companion App]`;
      }

      let normStatus = 'completed';
      if (rawStatus.includes('miss') || rawStatus.includes('reject')) normStatus = 'no-answer';
      else if (rawStatus.includes('busy')) normStatus = 'busy';
      else if (rawStatus.includes('fail')) normStatus = 'failed';

      const durMins = Math.floor(durationSeconds / 60);
      const durSecs = durationSeconds % 60;
      const durStr = `${durMins}m ${durSecs}s`;

      const bodyText = [
        `📞 ${direction.toUpperCase()} CALL (${callLog.channel || 'SIM'})`,
        `⏱️ Duration: ${durStr}`,
        `👤 Staff: ${staffName}`,
        `📊 Status: ${normStatus}`,
        rawNotes ? `📝 Notes: ${rawNotes}` : null,
        audioDisplayLine
      ].filter(Boolean).join('\n');

      let callPostSuccess = false;

      // 1. Resolve or initialize HighLevel conversation thread for this contact
      let conversationId = null;
      try {
        const sRes = await fetch(`https://services.leadconnectorhq.com/conversations/search?locationId=${encodeURIComponent(locationId)}&contactId=${encodeURIComponent(ghlContactId)}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Version': '2021-07-28',
            'Accept': 'application/json'
          }
        });
        if (sRes.ok) {
          const sData = await sRes.json();
          conversationId = sData?.conversations?.[0]?.id;
        }
        if (!conversationId) {
          const cRes = await fetch(`https://services.leadconnectorhq.com/conversations/`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Version': '2021-07-28',
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({ locationId, contactId: ghlContactId })
          });
          if (cRes.ok) {
            const cData = await cRes.json();
            conversationId = cData?.conversation?.id || cData?.id;
          }
        }
      } catch (convInitErr) {
        console.warn('[GhlOAuthService Conversation Init Notice]', convInitErr);
      }

      // 2. Post Call event to HighLevel Conversation Thread (Try inbound endpoint for incoming calls, fallback to general messages)
      try {
        const msgPayload = {
          type: 'SMS',
          contactId: ghlContactId,
          ...(conversationId ? { conversationId } : {}),
          message: bodyText,
          body: bodyText,
          status: 'delivered',
          direction: direction.toLowerCase(),
          ...(isValidAudioUrl ? { attachments: [recordingUrl] } : {})
        };

        const isIncoming = direction.toLowerCase() === 'inbound';
        const primaryEndpoint = isIncoming ? '/conversations/messages/inbound' : '/conversations/messages';

        let res = await fetch(`https://services.leadconnectorhq.com${primaryEndpoint}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Version': '2021-07-28',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(msgPayload)
        });

        if (!res.ok) {
          // Fallback to /conversations/messages
          res = await fetch(`https://services.leadconnectorhq.com/conversations/messages`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Version': '2021-07-28',
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(msgPayload)
          });
        }

        if (res.ok) callPostSuccess = true;
      } catch (callErr) {
        console.warn('[GhlOAuthService Call POST notice]', callErr);
      }

      // 3. Always write Contact Note so audio link & duration is guaranteed to display in HighLevel Contact Detail Activity Feed
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

      return { success: true, ghlContactId, conversationId };
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

      // 1. Resolve or initialize HighLevel conversation thread
      let conversationId = null;
      try {
        const sRes = await fetch(`https://services.leadconnectorhq.com/conversations/search?locationId=${encodeURIComponent(locationId)}&contactId=${encodeURIComponent(contactId)}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Version': '2021-07-28',
            'Accept': 'application/json'
          }
        });
        if (sRes.ok) {
          const sData = await sRes.json();
          conversationId = sData?.conversations?.[0]?.id;
        }
        if (!conversationId) {
          const cRes = await fetch(`https://services.leadconnectorhq.com/conversations/`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Version': '2021-07-28',
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({ locationId, contactId })
          });
          if (cRes.ok) {
            const cData = await cRes.json();
            conversationId = cData?.conversation?.id || cData?.id;
          }
        }
      } catch (convErr) {}

      // 2. Post to /conversations/messages/inbound or /conversations/messages
      const media = message.mediaUrl || message.media_url;
      const isValidMedia = typeof media === 'string' && (media.startsWith('http://') || media.startsWith('https://'));

      const msgPayload = {
        type: 'SMS',
        contactId,
        ...(conversationId ? { conversationId } : {}),
        message: body,
        body,
        status: 'delivered',
        direction: direction.toLowerCase(),
        ...(isValidMedia ? { attachments: [media] } : {})
      };

      const endpoint = direction.toLowerCase() === 'inbound' ? '/conversations/messages/inbound' : '/conversations/messages';

      let res = await fetch(`https://services.leadconnectorhq.com${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(msgPayload)
      });

      if (!res.ok) {
        res = await fetch(`https://services.leadconnectorhq.com/conversations/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Version': '2021-07-28',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(msgPayload)
        });
      }

      if (res.ok) {
        const resJson = await res.json().catch(() => ({ success: true }));
        await this.recordSyncAuditLog({
          locationId,
          action: 'SYNC_CHAT_MESSAGE',
          status: 'SUCCESS',
          emsEntityId: message.id || 'wa_msg',
          ghlEntityId: contactId,
          details: `Pushed message: "${body.substring(0, 30)}..."`
        });
        return resJson;
      }
      return null;
    } catch (e) {
      console.warn('[GhlOAuthService msg push error]', e.message);
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
