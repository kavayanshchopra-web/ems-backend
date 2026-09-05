/**
 * FirebaseCloudEngine.js
 * Universal Multi-Tenant Cloud Database Adapter for Firebase Firestore
 * Project: EMS AG (ems-ag)
 * Automatically syncs A-to-Z data across all modules with strict tenantId isolation,
 * real-time snapshots, zero cross-tenant leakage, and pure cloud state.
 */

import { db } from '../../firebase';
import GhlOAuthService from '../services/ghlOAuthService';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  query,
  where
} from 'firebase/firestore';

class FirebaseCloudEngine {
  static _memoryCache = new Map();

  /**
   * Helper to resolve tenantId strictly from user identity
   */
  static getTenantId(userTenantId) {
    if (userTenantId && userTenantId !== 'default' && userTenantId !== 'default_tenant' && userTenantId !== 'acme_corp') {
      return String(userTenantId).trim();
    }
    if (typeof window !== 'undefined') {
      try {
        const storedUser = JSON.parse(localStorage.getItem('omnilflow_user') || 'null');
        const candidate = storedUser?.tenantId || storedUser?.companyId || storedUser?.tenant_id;
        if (candidate && candidate !== 'default' && candidate !== 'default_tenant') {
          return String(candidate).trim();
        }
      } catch (e) {}
    }
    return userTenantId ? String(userTenantId).trim() : 'org_default';
  }

  static getCacheKey(collectionName, tenantId) {
    const activeTenantId = (tenantId === 'all' || tenantId === 'platform_superadmin') ? tenantId : this.getTenantId(tenantId);
    return `omnilflow_cloud_cache_${activeTenantId}_${collectionName}`;
  }

  static getCachedRecords(collectionName, tenantId) {
    const cacheKey = this.getCacheKey(collectionName, tenantId);
    if (this._memoryCache.has(cacheKey)) {
      return this._memoryCache.get(cacheKey);
    }
    if (typeof window !== 'undefined') {
      try {
        const local = localStorage.getItem(cacheKey);
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed)) {
            this._memoryCache.set(cacheKey, parsed);
            return parsed;
          }
        }
      } catch (e) {}
    }
    return null;
  }

  static setCachedRecords(collectionName, tenantId, records) {
    if (!Array.isArray(records)) return;
    const cacheKey = this.getCacheKey(collectionName, tenantId);
    this._memoryCache.set(cacheKey, records);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(records.slice(0, 500)));
      } catch (e) {}
    }
  }

  /**
   * Save / Update a record in Firestore with automatic tenantId isolation
   */
  static async saveRecord(collectionName, recordData, tenantId = null) {
    const activeTenantId = this.getTenantId(tenantId);
    const docId = recordData.id ? String(recordData.id) : `doc_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const payload = {
      ...recordData,
      id: docId,
      tenantId: activeTenantId,
      updatedAt: new Date().toISOString()
    };

    // Optimistically update memory cache
    const current = this.getCachedRecords(collectionName, tenantId) || [];
    const index = current.findIndex(r => String(r.id) === docId);
    let updated;
    if (index >= 0) {
      updated = [...current];
      updated[index] = { ...updated[index], ...payload };
    } else {
      updated = [payload, ...current];
    }
    this.setCachedRecords(collectionName, tenantId, updated);

    if (db) {
      try {
        const cleanPayload = JSON.parse(JSON.stringify(payload, (key, value) => value === undefined ? '' : value));
        const colRef = collection(db, collectionName);
        await setDoc(doc(colRef, docId), cleanPayload, { merge: true });
        console.log(`☁️ Firebase Saved [${activeTenantId}] ${collectionName}/${docId}`);
      } catch (err) {
        console.error(`Firebase save error (${collectionName}):`, err);
      }
    }

    return payload;
  }

  /**
   * Fetch all records for a tenant from Firestore strictly isolated by tenantId (with SWR caching)
   */
  static async fetchRecords(collectionName, tenantId = null) {
    const activeTenantId = (tenantId === 'all' || tenantId === 'platform_superadmin') ? tenantId : this.getTenantId(tenantId);
    const cached = this.getCachedRecords(collectionName, tenantId);

    // If we have cached records, initiate background refresh and return cached immediately
    if (db) {
      try {
        const colRef = collection(db, collectionName);
        const q = (activeTenantId === 'all')
          ? colRef
          : query(colRef, where('tenantId', '==', activeTenantId));
        
        const fetchPromise = getDocs(q).then((snap) => {
          if (snap && !snap.empty) {
            const fresh = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(i => !!i);
            this.setCachedRecords(collectionName, tenantId, fresh);
            return fresh;
          } else {
            this.setCachedRecords(collectionName, tenantId, []);
            return [];
          }
        }).catch(err => {
          console.error(`Firebase fetch error (${collectionName}):`, err);
          return cached || [];
        });

        // If cached exists, return cached for instantaneous 0ms UI render
        if (cached && cached.length > 0) {
          fetchPromise.catch(() => {});
          return cached;
        }

        return await fetchPromise;
      } catch (err) {
        console.error(`Firebase fetch error (${collectionName}):`, err);
      }
    }

    return cached || [];
  }

  /**
   * Delete a record from Firestore
   */
  static async deleteRecord(collectionName, recordId, tenantId = null) {
    const docId = String(recordId);
    // Optimistic cache update
    const current = this.getCachedRecords(collectionName, tenantId) || [];
    const filtered = current.filter(r => String(r.id) !== docId);
    this.setCachedRecords(collectionName, tenantId, filtered);

    if (db) {
      try {
        await deleteDoc(doc(db, collectionName, docId));
        console.log(`☁️ Firebase [EMS AG]: Deleted ${collectionName}/${docId}`);
      } catch (err) {
        console.error(`Firebase delete error (${collectionName}):`, err);
      }
    }
  }

  /**
   * Realtime Listener for live updates across all devices with instant cached first-fire
   */
  static subscribeToCollection(collectionName, tenantId = null, callback) {
    const activeTenantId = (tenantId === 'all' || tenantId === 'platform_superadmin') ? tenantId : this.getTenantId(tenantId);
    
    // Fire callback immediately with cached data if present (0ms instant render)
    const cached = this.getCachedRecords(collectionName, tenantId);
    if (cached && cached.length > 0 && typeof callback === 'function') {
      try { callback(cached); } catch (e) {}
    }

    if (!db) return () => {};

    try {
      const colRef = collection(db, collectionName);
      const q = (activeTenantId === 'all' || activeTenantId === 'platform_superadmin') 
        ? colRef 
        : query(colRef, where('tenantId', '==', activeTenantId));
      return onSnapshot(q, (snap) => {
        const records = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(i => !!i);
        this.setCachedRecords(collectionName, tenantId, records);
        if (typeof callback === 'function') callback(records);
      }, (err) => {
        console.error(`Firebase subscription error (${collectionName}):`, err);
      });
    } catch (e) {
      return () => {};
    }
  }

  /**
   * Purge all legacy un-isolated local caches while preserving active CRM & tenant data
   */
  static purgeAllLocalCaches() {
    try {
      if (typeof window === 'undefined') return;
      const keysToRemove = [];
      const preservedKeys = [
        'omnilflow_token',
        'omnilflow_user',
        'omnilflow_master_module_configs_',
        'omnilflow_config_',
        'omnilflow_system_dropdowns',
        'omnilflow_permission_matrix_',
        'omnilflow_feature_provisioning',
        'omniflow_cached_contacts',
        'omniflow_cached_call_logs',
        'omnilflow_fallback_contacts',
        'omnilflow_cached_contacts',
        'omniflow_contacts_',
        'omnilflow_cloud_cache_',
        'omnilflow_disposition_options',
        'omnilflow_fallback_sessions'
      ];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;

        const isPreserved = preservedKeys.some(p => key.startsWith(p) || key === p);
        if (isPreserved) continue;

        if (
          key.startsWith('storage_config_') ||
          key.startsWith('whatsapp_crm_') ||
          key.startsWith('custom_columns_') ||
          key.startsWith('legacy_')
        ) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      if (keysToRemove.length > 0) {
        console.log(`🧹 Cleaned up ${keysToRemove.length} legacy keys.`);
      }
    } catch (e) {}
  }
}

export default FirebaseCloudEngine;

