import { db } from '../../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import GhlOAuthService from './ghlOAuthService';

/**
 * GhlSyncBridge.js
 * Dedicated, loop-safe background sync bridge between EMS and GoHighLevel.
 * Enforces strict origin filtering (source !== 'GoHighLevel') and valid phone/email validation.
 */
class GhlSyncBridge {
  /**
   * Push a single locally-created EMS contact or deal to HighLevel
   */
  static async pushSingleContactAuto(tenantId, record) {
    if (!record || !tenantId) return null;

    // Safety check 1: Never push records that originated from GoHighLevel
    if (
      record.source === 'GoHighLevel' ||
      String(record.id).startsWith('ghl_') ||
      String(record.id).startsWith('deal_ghl_') ||
      String(record.id).startsWith('deal_') && record.notes && String(record.notes).includes('Imported from GoHighLevel')
    ) {
      return null;
    }

    // Safety check 2: Clean phone and check validity
    const cleanPhone = (record.phone || '').replace(/[^0-9+]/g, '');
    const hasValidPhone = cleanPhone.length >= 10;
    const hasValidEmail = record.email && String(record.email).includes('@');

    // Skip incomplete / dummy data
    if (!hasValidPhone && !hasValidEmail) {
      return null;
    }

    try {
      // Use resilient getInstalledLocations to resolve credentials across company ID variants/fallbacks
      let installed = await GhlOAuthService.getInstalledLocations(tenantId);
      
      // If no locations found for this tenantId, try active company from localStorage or fallback to 1 (SuperAdmin) / 100003
      if ((!installed || installed.length === 0) && typeof window !== 'undefined') {
        const storedCompany = localStorage.getItem('omnilflow_current_company');
        if (storedCompany && String(storedCompany) !== String(tenantId)) {
          installed = await GhlOAuthService.getInstalledLocations(storedCompany);
        }
        if (!installed || installed.length === 0) {
          installed = await GhlOAuthService.getInstalledLocations(1);
        }
        if (!installed || installed.length === 0) {
          installed = await GhlOAuthService.getInstalledLocations(100003);
        }
      }

      const loc = (installed || []).find(l => (l.accessToken || l.access_token) && (l.locationId || l.location_id)) || (installed && installed[0]);
      const activeAccessToken = loc?.accessToken || loc?.access_token;
      const activeLocationId = loc?.locationId || loc?.location_id;

      if (loc && activeAccessToken && activeLocationId) {
        let pushPhone = cleanPhone;
        if (pushPhone && !pushPhone.startsWith('+')) {
          if (pushPhone.length === 10) {
            pushPhone = `+91${pushPhone}`;
          } else {
            pushPhone = `+${pushPhone}`;
          }
        }

        const res = await GhlOAuthService.createOrUpdateContactDirectly({
          locationId: activeLocationId,
          accessToken: activeAccessToken,
          contact: {
            ...record,
            phone: pushPhone,
            email: record.email || undefined,
            name: record.name || record.customer_name || record.title || 'EMS Lead'
          }
        });
        console.log('⚡ [Auto GHL Outbound Push Success]', record.name || record.title, res);
        return res;
      } else {
        console.warn('[Auto GHL Outbound Push Notice] No active GHL integration found for tenant', tenantId);
      }
    } catch (err) {
      console.warn('[Auto GHL Outbound Push Error]', err.message);
    }

    return null;
  }
}

export default GhlSyncBridge;
