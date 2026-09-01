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
   * Fetch all records for a tenant from Firestore strictly isolated by tenantId
   */
  static async fetchRecords(collectionName, tenantId = null) {
    const activeTenantId = (tenantId === 'all' || tenantId === 'platform_superadmin') ? tenantId : this.getTenantId(tenantId);
    let records = [];

    if (db) {
      try {
        const colRef = collection(db, collectionName);
        const q = (activeTenantId === 'all')
          ? colRef
          : query(colRef, where('tenantId', '==', activeTenantId));
        const snap = await getDocs(q);

        if (snap && !snap.empty) {
          records = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }
      } catch (err) {
        console.error(`Firebase fetch error (${collectionName}):`, err);
      }
    }

    // Filter out corrupted/null items
    records = records.filter(i => !!i);
    return records;
  }

  /**
   * Delete a record from Firestore
   */
  static async deleteRecord(collectionName, recordId) {
    const docId = String(recordId);
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
   * Realtime Listener for live updates across all devices
   */
  static subscribeToCollection(collectionName, tenantId = null, callback) {
    if (!db) return () => {};
    const activeTenantId = (tenantId === 'all' || tenantId === 'platform_superadmin') ? tenantId : this.getTenantId(tenantId);
    try {
      const colRef = collection(db, collectionName);
      const q = (activeTenantId === 'all' || activeTenantId === 'platform_superadmin') 
        ? colRef 
        : query(colRef, where('tenantId', '==', activeTenantId));
      return onSnapshot(q, (snap) => {
        const records = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (typeof callback === 'function') callback(records);
      }, (err) => {
        console.error(`Firebase subscription error (${collectionName}):`, err);
      });
    } catch (e) {
      return () => {};
    }
  }

  /**
   * Purge all legacy local caches and tenant data completely
   */
  static purgeAllLocalCaches() {
    try {
      if (typeof window === 'undefined') return;
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key && (
            key.startsWith('omnilflow_') ||
            key.startsWith('omniflow_') ||
            key.startsWith('storage_config_') ||
            key.startsWith('whatsapp_crm_') ||
            key.startsWith('custom_columns_')
          ) && 
          key !== 'omnilflow_token' && 
          key !== 'omnilflow_user' &&
          !key.startsWith('omnilflow_master_module_configs_') &&
          !key.startsWith('omnilflow_config_') &&
          !key.startsWith('omnilflow_system_dropdowns') &&
          !key.startsWith('omnilflow_permission_matrix_') &&
          !key.startsWith('omnilflow_feature_provisioning')
        ) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      console.log(`🧹 Purged ${keysToRemove.length} legacy un-isolated cache keys!`);
    } catch (e) {}
  }
}

export default FirebaseCloudEngine;

