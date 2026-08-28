/**
 * GHL Reusable API Client
 * Centralized HTTP client for GoHighLevel API v2 calls
 */

import GhlTokenService from './ghlTokenService.js';

class GhlApiClient {
  constructor(tenantId) {
    if (!tenantId) throw new Error('Tenant ID is required to initialize GhlApiClient');
    this.tenantId = tenantId;
    this.baseUrl = 'https://services.leadconnectorhq.com';
    this.apiVersion = '2021-07-28';
  }

  async request(endpoint, options = {}, retryCount = 0) {
    const accessToken = await GhlTokenService.getValidAccessToken(this.tenantId);

    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Version': this.apiVersion,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const targetUrl = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    try {
      const response = await fetch(targetUrl, {
        ...options,
        headers
      });

      // Handle 401 Unauthorized
      if (response.status === 401 && retryCount === 0) {
        console.warn(`[GhlApiClient] Received 401 for tenant ${this.tenantId}. Forcing token refresh and retrying...`);
        await GhlTokenService.refreshAccessToken(this.tenantId);
        return this.request(endpoint, options, retryCount + 1);
      }

      // Handle Rate Limiting (429 Too Many Requests)
      if (response.status === 429 && retryCount < 3) {
        const retryAfterSec = parseInt(response.headers.get('retry-after') || '2', 10);
        console.warn(`[GhlApiClient] Rate limited (429). Retrying after ${retryAfterSec}s...`);
        await new Promise(res => setTimeout(res, retryAfterSec * 1000));
        return this.request(endpoint, options, retryCount + 1);
      }

      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        responseData = responseText;
      }

      if (!response.ok) {
        const errorDetail = typeof responseData === 'object' 
          ? (responseData.message || responseData.error || JSON.stringify(responseData))
          : responseText;
        const err = new Error(`GHL API Error [${response.status}]: ${errorDetail}`);
        err.status = response.status;
        err.data = responseData;
        throw err;
      }

      return responseData;
    } catch (err) {
      if (err.status) throw err;
      console.error(`[GhlApiClient] Network/Execution Error:`, err.message);
      throw new Error(`GHL API Connection Failed: ${err.message}`);
    }
  }

  async get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  async post(endpoint, body = {}, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: typeof body === 'string' ? body : JSON.stringify(body)
    });
  }

  async put(endpoint, body = {}, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: typeof body === 'string' ? body : JSON.stringify(body)
    });
  }

  async delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }

  async getLocation(locationId) {
    return this.request(`/locations/${locationId}`);
  }

  async testConnection(locationId) {
    return this.request(`/locations/${locationId}`);
  }
}

export default GhlApiClient;
