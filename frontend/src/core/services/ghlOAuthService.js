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
