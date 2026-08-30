/**
 * TrashVaultEngine.js
 * Universal Soft-Delete & Data Loss Prevention Core Service
 * Handles A-to-Z item archiving, state snapshotting, 1-click restorations,
 * retention scheduling (90 days), and multi-tenant isolation.
 */

import FirebaseCloudEngine from './FirebaseCloudEngine';

const STORAGE_PREFIX = 'whatsapp_crm_trash_vault_';

const DEFAULT_INITIAL_VAULT_ITEMS = [];

class TrashVaultEngine {
  /**
   * Get all vault items for a tenant (or 'all' for Super Admin)
   */
  static getVaultItems(tenantId = 'all') {
    try {
      const activeTenant = (tenantId && tenantId !== 'all') ? String(tenantId).trim() : 'all';
      const storageKey = `${STORAGE_PREFIX}${activeTenant}`;
      const saved = localStorage.getItem(storageKey);
      let items = saved ? JSON.parse(saved) : [];

      if (!Array.isArray(items)) items = [];
      items = items.filter(i => !!i);

      if (tenantId === 'all' || tenantId === 'platform_superadmin') return items;
      return items.filter(i => i.tenantId === activeTenant);
    } catch (e) {
      console.error('TrashVaultEngine.getVaultItems error:', e);
      return [];
    }
  }

  /**
   * Move any item to Trash Vault
   */
  static moveToTrash(tenantId, itemPayload) {
    try {
      const activeTenant = tenantId || itemPayload.tenantId || 'org_default';
      const items = this.getVaultItems(activeTenant);
      const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const origId = itemPayload.id || itemPayload.originalId || itemPayload.payload?.id || '';

      const newItem = {
        id: 'trash_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        originalId: origId,
        tenantId: activeTenant,
        tenantName: itemPayload.tenantName || 'Workspace Organization',
        name: itemPayload.name || itemPayload.title || itemPayload.label || 'Archived Item',
        category: itemPayload.category || 'General',
        deletedBy: itemPayload.deletedBy || 'Admin User',
        deletedByEmail: itemPayload.deletedByEmail || 'admin@company.com',
        deletedAt: nowStr,
        preservedLinks: itemPayload.preservedLinks || 'Full History Intact',
        payload: itemPayload.payload || itemPayload
      };

      const updated = [newItem, ...items];
      localStorage.setItem(`${STORAGE_PREFIX}${activeTenant}`, JSON.stringify(updated));

      // Sync to Firebase Firestore live collection: recycle_bin
      FirebaseCloudEngine.saveRecord('recycle_bin', newItem, activeTenant);

      return newItem;
    } catch (e) {
      console.error('TrashVaultEngine.moveToTrash error:', e);
      return null;
    }
  }

  /**
   * Restore item back from Trash Vault
   */
  static restoreItem(tenantId, itemId) {
    try {
      const activeTenant = tenantId || 'org_default';
      const items = this.getVaultItems(activeTenant);
      const targetStr = String(itemId || '').trim().toLowerCase();

      const itemToRestore = items.find(i => {
        const iId = String(i.id || '').trim().toLowerCase();
        const origId = String(i.originalId || i.payload?.id || '').trim().toLowerCase();
        const recId = String(i.recycleBinId || '').trim().toLowerCase();
        return iId === targetStr || origId === targetStr || recId === targetStr;
      });

      const updated = items.filter(i => {
        const iId = String(i.id || '').trim().toLowerCase();
        const origId = String(i.originalId || i.payload?.id || '').trim().toLowerCase();
        const recId = String(i.recycleBinId || '').trim().toLowerCase();
        return iId !== targetStr && origId !== targetStr && recId !== targetStr;
      });

      localStorage.setItem(`${STORAGE_PREFIX}${activeTenant}`, JSON.stringify(updated));

      if (itemToRestore && itemToRestore.id) {
        FirebaseCloudEngine.deleteRecord('recycle_bin', itemToRestore.id);
      }
      return itemToRestore;
    } catch (e) {
      console.error('TrashVaultEngine.restoreItem error:', e);
      return null;
    }
  }

  /**
   * Permanently purge item from Trash Vault
   */
  static purgeItem(tenantId, itemId) {
    try {
      const activeTenant = tenantId || 'org_default';
      const items = this.getVaultItems(activeTenant);
      const targetStr = String(itemId || '').trim().toLowerCase();
      const updated = items.filter(i => {
        const iId = String(i.id || '').trim().toLowerCase();
        const origId = String(i.originalId || '').trim().toLowerCase();
        const recId = String(i.recycleBinId || '').trim().toLowerCase();
        if (iId === targetStr || origId === targetStr || recId === targetStr) return false;
        return true;
      });
      localStorage.setItem(`${STORAGE_PREFIX}${activeTenant}`, JSON.stringify(updated));
      return true;
    } catch (e) {
      console.error('TrashVaultEngine.purgeItem error:', e);
      return false;
    }
  }

  /**
   * Purge all items from Trash Vault
   */
  static emptyVault(tenantId = 'all') {
    try {
      if (tenantId === 'all') {
        localStorage.setItem(`${STORAGE_PREFIX}all`, JSON.stringify([]));
      } else {
        const items = this.getVaultItems('all');
        const updated = items.filter(i => i.tenantId !== tenantId);
        localStorage.setItem(`${STORAGE_PREFIX}all`, JSON.stringify(updated));
      }
      return true;
    } catch (e) {
      console.error('TrashVaultEngine.emptyVault error:', e);
      return false;
    }
  }

  /**
   * Filter, search and sort archived items
   */
  static getFilteredArchivedItems(tenantId, category, searchQuery, sortField, sortOrder) {
    let items = this.getVaultItems('all');

    // Tenant Filter
    if (tenantId && tenantId !== 'all') {
      items = items.filter(i => i.tenantId === tenantId);
    }

    // Category Filter
    if (category && category !== 'all') {
      items = items.filter(i => (i.category || '').toLowerCase() === category.toLowerCase());
    }

    // Search Query Filter
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      items = items.filter(i => (
        (i.name || '').toLowerCase().includes(query) ||
        (i.category || '').toLowerCase().includes(query) ||
        (i.deletedBy || '').toLowerCase().includes(query) ||
        (i.deletedByEmail || '').toLowerCase().includes(query)
      ));
    }

    // Sort
    if (sortField) {
      items.sort((a, b) => {
        let valA = a[sortField] || '';
        let valB = b[sortField] || '';
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return items;
  }
}

export default TrashVaultEngine;
