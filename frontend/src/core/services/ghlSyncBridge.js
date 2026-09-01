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
      if (db) {
        // Find GHL credentials for this tenant
        const q = query(collection(db, 'integrations_ghl_oauth'), where('companyId', '==', String(tenantId)));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const loc = snap.docs[0].data();
          if (loc && loc.accessToken && loc.locationId) {
            const res = await GhlOAuthService.createOrUpdateContactDirectly({
              locationId: loc.locationId,
              accessToken: loc.accessToken,
              contact: {
                ...record,
                phone: cleanPhone,
                name: record.name || record.customer_name || record.title || 'EMS Lead'
              }
            });
            console.log('⚡ [Auto GHL Outbound Push Success]', record.name || record.title, res);
            return res;
          }
        }
      }
    } catch (err) {
      console.warn('[Auto GHL Outbound Push Error]', err.message);
    }

    return null;
  }
}

export default GhlSyncBridge;
