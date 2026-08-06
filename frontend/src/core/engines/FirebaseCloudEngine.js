/**
 * FirebaseCloudEngine.js
 * Universal Multi-Tenant Cloud Database Adapter for Firebase Firestore
 * Project: EMS AG (ems-ag)
 * Automatically syncs A-to-Z data across all modules with tenantId isolation,
 * real-time snapshots, zero-lag local cache fallback, and soft-delete connections.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  query,
  where
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDqJ5mYFfBqMauki2omxMf7AO4JGJVh8ik",
  authDomain: "ems-ag.firebaseapp.com",
  projectId: "ems-ag",
  storageBucket: "ems-ag.firebasestorage.app",
  messagingSenderId: "246488148980",
  appId: "1:246488148980:web:8abc1da1675b734ba3a7a1",
  measurementId: "G-SN6SCQFCME"
};

let app = null;
let db = null;

try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  db = getFirestore(app);
  console.log('✅ Firebase Cloud Engine initialized for EMS AG!');
} catch (e) {
  console.error('Firebase initialization error:', e);
}

class FirebaseCloudEngine {
  /**
   * Save / Update a record in Firestore with automatic tenantId isolation
   */
  static async saveRecord(collectionName, recordData, tenantId = 'acme_corp') {
    const docId = recordData.id ? String(recordData.id) : `doc_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const payload = {
      ...recordData,
      id: docId,
      tenantId: tenantId || 'acme_corp',
      updatedAt: new Date().toISOString()
    };

    if (db) {
      try {
        const colRef = collection(db, collectionName);
        await setDoc(doc(colRef, docId), payload, { merge: true });
        console.log(`☁️ Firebase [EMS AG]: Saved ${collectionName}/${docId}`);
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
      else list.push(payload);
      localStorage.setItem(storageKey, JSON.stringify(list));
    } catch (e) {}

    return payload;
  }

  /**
   * Fetch all records for a tenant from Firestore
   */
  static async fetchRecords(collectionName, tenantId = 'acme_corp') {
    if (db) {
      try {
        const colRef = collection(db, collectionName);
        let q;
        if (tenantId === 'all' || tenantId === 'platform_superadmin') {
          q = colRef;
        } else {
          q = query(colRef, where('tenantId', '==', tenantId));
        }
        const snap = await getDocs(q);
        const records = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (records.length > 0) {
          localStorage.setItem(`omnilflow_cloud_cache_${collectionName}`, JSON.stringify(records));
          return records;
        }
      } catch (err) {
        console.error(`Firebase fetch error (${collectionName}):`, err);
      }
    }

    // Fallback to local cache
    try {
      const saved = localStorage.getItem(`omnilflow_cloud_cache_${collectionName}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
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
    try {
      const colRef = collection(db, collectionName);
      let q = (tenantId === 'all' || tenantId === 'platform_superadmin') ? colRef : query(colRef, where('tenantId', '==', tenantId));
      return onSnapshot(q, (snap) => {
        const records = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        localStorage.setItem(`omnilflow_cloud_cache_${collectionName}`, JSON.stringify(records));
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
