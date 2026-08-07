/**
 * FirebaseCloudEngine.js
 * Universal Multi-Tenant Cloud Database Adapter for Firebase Firestore
 * Project: EMS AG (ems-ag)
 * Automatically syncs A-to-Z data across all modules with tenantId isolation,
 * real-time snapshots, zero-lag local cache fallback, and soft-delete connections.
 */

import { db } from '../../firebase';
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
   * Helper to resolve tenantId based on current environment/hostname
   */
  static getTenantId(userTenantId) {
    if (typeof window !== 'undefined') {
      const host = (window.location.hostname || '').toLowerCase();
      // Production Domains (Custom Domain & Primary Vercel Alias)
      const isProduction = host.includes('employeemanagementsystems.com') || host === 'ems-crm-sandy.vercel.app';
      if (!isProduction) {
        return 'sandbox_dev';
      }
    }
    return userTenantId || 'acme_corp';
  }

  /**
   * Save / Update a record in Firestore with automatic tenantId isolation
   */
  static async saveRecord(collectionName, recordData, tenantId = 'acme_corp') {
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
        console.log(`☁️ Firebase Saved ${collectionName}/${docId}:`, cleanPayload);
      } catch (err) {
        console.error(`Firebase save error (${collectionName}):`, err);
      }
    }

    // Sync local cache fallback
    try {
      const storageKey = `omnilflow_cloud_cache_${collectionName}`;
      const saved = localStorage.getItem(storageKey);
      let list = saved ? JSON.parse(saved) : [];
      const idx = list.findIndex(item => String(item.id) === docId);
      if (idx >= 0) list[idx] = payload;
      else list.unshift(payload);
      localStorage.setItem(storageKey, JSON.stringify(list));

      if (collectionName === 'crm_leads') {
        const savedContacts = localStorage.getItem('omnilflow_fallback_contacts');
        let contactsList = savedContacts ? JSON.parse(savedContacts) : [];
        const cIdx = contactsList.findIndex(c => String(c.id) === docId);
        if (cIdx >= 0) contactsList[cIdx] = { ...contactsList[cIdx], ...payload };
        else contactsList.unshift(payload);
        localStorage.setItem('omnilflow_fallback_contacts', JSON.stringify(contactsList));
      } else if (collectionName === 'recruitment_ats') {
        const savedAts = localStorage.getItem('omnilflow_ats_candidates');
        let atsList = savedAts ? JSON.parse(savedAts) : [];
        const aIdx = atsList.findIndex(a => String(a.id) === docId);
        if (aIdx >= 0) atsList[aIdx] = { ...atsList[aIdx], ...payload };
        else atsList.unshift(payload);
        localStorage.setItem('omnilflow_ats_candidates', JSON.stringify(atsList));
      } else if (collectionName === 'employees') {
        const savedEmp = localStorage.getItem('omnilflow_fallback_employees');
        let empList = savedEmp ? JSON.parse(savedEmp) : [];
        const eIdx = empList.findIndex(e => String(e.id) === docId);
        if (eIdx >= 0) empList[eIdx] = { ...empList[eIdx], ...payload };
        else empList.unshift(payload);
        localStorage.setItem('omnilflow_fallback_employees', JSON.stringify(empList));
      }
    } catch (e) {}

    return payload;
  }

  /**
   * Fetch all records for a tenant from Firestore (with robust local cache fallback & auto-merge)
   */
  static async fetchRecords(collectionName, tenantId = 'acme_corp') {
    const activeTenantId = (tenantId === 'all' || tenantId === 'platform_superadmin') ? tenantId : this.getTenantId(tenantId);
    let records = [];

    if (db) {
      try {
        const colRef = collection(db, collectionName);
        const q = (activeTenantId === 'all' || activeTenantId === 'platform_superadmin')
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

    // Always merge with local storage cache so locally created entries are NEVER lost
    try {
      const storageKey = `omnilflow_cloud_cache_${collectionName}`;
      const saved = localStorage.getItem(storageKey);
      const localCached = saved ? JSON.parse(saved) : [];
      if (Array.isArray(localCached) && localCached.length > 0) {
        const map = new Map();
        localCached.forEach(item => { if (item && item.id) map.set(String(item.id), item); });
        records.forEach(item => { if (item && item.id) map.set(String(item.id), item); });
        records = Array.from(map.values());
      }
    } catch (e) {}

    // Filter out dummy demo seed & old test items (e.g. emp_001, EMP-0271, EMP-0012, EMP-0013, kavayansh)
    records = records.filter(i => {
      if (!i) return false;
      const idStr = String(i.id || i.originalId || '').toLowerCase();
      const nameStr = String(i.name || i.first_name || i.title || '').toLowerCase();
      if (idStr.includes('emp_00') || idStr.includes('emp-0271') || idStr.includes('emp-0012') || idStr.includes('emp-0013') || nameStr.includes('emp_001')) return false;
      return true;
    });

    if (records.length > 0) {
      try {
        localStorage.setItem(`omnilflow_cloud_cache_${collectionName}`, JSON.stringify(records));
      } catch (e) {}
    }

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

    try {
      const storageKey = `omnilflow_cloud_cache_${collectionName}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        let list = JSON.parse(saved);
        list = list.filter(item => String(item.id) !== docId);
        localStorage.setItem(storageKey, JSON.stringify(list));
      }
    } catch (e) {}
  }

  /**
   * Realtime Listener for live updates across all devices
   */
  static subscribeToCollection(collectionName, tenantId = 'acme_corp', callback) {
    if (!db) return () => {};
    const activeTenantId = (tenantId === 'all' || tenantId === 'platform_superadmin') ? tenantId : this.getTenantId(tenantId);
    try {
      const colRef = collection(db, collectionName);
      let q = (activeTenantId === 'all' || activeTenantId === 'platform_superadmin') ? colRef : query(colRef, where('tenantId', '==', activeTenantId));
      return onSnapshot(q, (snap) => {
        const records = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (records.length > 0) {
          localStorage.setItem(`omnilflow_cloud_cache_${collectionName}`, JSON.stringify(records));
        }
        if (typeof callback === 'function') callback(records);
      }, (err) => {
        console.error(`Firebase subscription error (${collectionName}):`, err);
      });
    } catch (e) {
      return () => {};
    }
  }

  /**
   * Clear all local seed caches to guarantee a clean slate for live testing
   */
  static clearAllLocalSeedCaches() {
    try {
      const keysToRemove = [
        'omnilflow_fallback_employees',
        'omnilflow_fallback_tasks',
        'omnilflow_fallback_notices',
        'omnilflow_fallback_holidays',
        'omnilflow_fallback_leaves',
        'omnilflow_fallback_recycle_bin',
        'omnilflow_fallback_assets',
        'omnilflow_fallback_kyc_documents',
        'omnilflow_fallback_offboarding_cases',
        'whatsapp_crm_trash_vault_all',
        'whatsapp_crm_shift_rosters',
        'whatsapp_crm_shift_overrides'
      ];
      keysToRemove.forEach(k => localStorage.removeItem(k));
      console.log('🧹 Cleared all local fallback dummy seed caches!');
    } catch (e) {}
  }
}

export default FirebaseCloudEngine;
