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
