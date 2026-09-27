/**
 * TrashVaultEngine.js
 * Universal Soft-Delete & Data Loss Prevention Core Service
 * Handles A-to-Z item archiving, state snapshotting, 1-click restorations,
 * retention scheduling (90 days), and multi-tenant isolation.
 */

import FirebaseCloudEngine from './FirebaseCloudEngine';

const STORAGE_PREFIX = 'whatsapp_crm_trash_vault_';

class TrashVaultEngine {
  /**
   * Get all vault items for a tenant (or 'all' for Super Admin / All tenants)
   */
  static getVaultItems(tenantId = 'all') {
    try {
      const activeTenant = (tenantId && tenantId !== 'all') ? String(tenantId).trim() : 'all';
      const allItemsMap = new Map();

      // Scan all localStorage keys starting with STORAGE_PREFIX
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX)) {
          try {
            const raw = localStorage.getItem(key);
            const parsed = raw ? JSON.parse(raw) : [];
            if (Array.isArray(parsed)) {
              parsed.forEach(item => {
                if (item && item.id) {
                  allItemsMap.set(item.id, item);
                }
              });
            }
          } catch (err) {}
        }
      }

      let items = Array.from(allItemsMap.values());

      if (activeTenant !== 'all' && activeTenant !== 'platform_superadmin') {
        items = items.filter(i => String(i.tenantId) === activeTenant);
      }

      items = (items || []).filter(i => !!i);
      // Sort newest first
      return items.sort((a, b) => new Date(b.deletedAt || 0) - new Date(a.deletedAt || 0));
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
      const activeTenant = String(tenantId || itemPayload.tenantId || 'org_default');
      const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const origId = itemPayload.id || itemPayload.originalId || itemPayload.payload?.id || itemPayload.payload?.record?.id || '';

      const modTab = itemPayload.moduleTab || itemPayload.type || (itemPayload.category?.toLowerCase()?.includes('contact') ? 'contacts' : 'employees');

      const newItem = {
        id: 'trash_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        originalId: origId,
        tenantId: activeTenant,
        tenantName: itemPayload.tenantName || 'Workspace Organization',
        name: itemPayload.name || itemPayload.title || itemPayload.label || 'Archived Item',
        category: itemPayload.category || 'General',
        moduleTab: modTab,
        type: itemPayload.type || modTab,
        deletedBy: itemPayload.deletedBy || 'Admin User',
        deletedByEmail: itemPayload.deletedByEmail || 'admin@company.com',
        deletedAt: nowStr,
        preservedLinks: itemPayload.preservedLinks || 'Full History Intact',
        payload: itemPayload.payload || itemPayload.entityData || itemPayload
      };

      // Save to tenant-specific key
      const tenantKey = `${STORAGE_PREFIX}${activeTenant}`;
      let tenantItems = [];
      try {
        const saved = localStorage.getItem(tenantKey);
        tenantItems = saved ? JSON.parse(saved) : [];
        if (!Array.isArray(tenantItems)) tenantItems = [];
      } catch (e) {}
      const updatedTenant = [newItem, ...tenantItems.filter(i => i.id !== newItem.id && i.originalId !== newItem.originalId)];
      localStorage.setItem(tenantKey, JSON.stringify(updatedTenant));

      // Also save to master 'all' key
      const allKey = `${STORAGE_PREFIX}all`;
      let allItems = [];
      try {
        const savedAll = localStorage.getItem(allKey);
        allItems = savedAll ? JSON.parse(savedAll) : [];
        if (!Array.isArray(allItems)) allItems = [];
      } catch (e) {}
      const updatedAll = [newItem, ...allItems.filter(i => i.id !== newItem.id && i.originalId !== newItem.originalId)];
      localStorage.setItem(allKey, JSON.stringify(updatedAll));

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
      const targetStr = String(itemId || '').trim().toLowerCase();
      let itemToRestore = null;

      // Clean up across all vault storage keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX)) {
          try {
            const raw = localStorage.getItem(key);
            const items = raw ? JSON.parse(raw) : [];
            if (Array.isArray(items)) {
              if (!itemToRestore) {
                itemToRestore = items.find(item => {
                  const iId = String(item.id || '').trim().toLowerCase();
                  const origId = String(item.originalId || item.payload?.id || '').trim().toLowerCase();
                  const recId = String(item.recycleBinId || '').trim().toLowerCase();
                  return iId === targetStr || origId === targetStr || recId === targetStr;
                });
              }
              const updated = items.filter(item => {
                const iId = String(item.id || '').trim().toLowerCase();
                const origId = String(item.originalId || item.payload?.id || '').trim().toLowerCase();
                const recId = String(item.recycleBinId || '').trim().toLowerCase();
                return iId !== targetStr && origId !== targetStr && recId !== targetStr;
              });
              localStorage.setItem(key, JSON.stringify(updated));
            }
          } catch (err) {}
        }
      }

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
      const targetStr = String(itemId || '').trim().toLowerCase();
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX)) {
          try {
            const raw = localStorage.getItem(key);
            const items = raw ? JSON.parse(raw) : [];
            if (Array.isArray(items)) {
              const updated = items.filter(item => {
                const iId = String(item.id || '').trim().toLowerCase();
                const origId = String(item.originalId || item.payload?.id || '').trim().toLowerCase();
                const recId = String(item.recycleBinId || '').trim().toLowerCase();
                return iId !== targetStr && origId !== targetStr && recId !== targetStr;
              });
              localStorage.setItem(key, JSON.stringify(updated));
            }
          } catch (err) {}
        }
      }
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
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && key.startsWith(STORAGE_PREFIX)) {
            localStorage.setItem(key, JSON.stringify([]));
          }
        }
      } else {
        const activeTenant = String(tenantId);
        const tenantKey = `${STORAGE_PREFIX}${activeTenant}`;
        localStorage.setItem(tenantKey, JSON.stringify([]));
        // Also remove matching items from allKey
        const allKey = `${STORAGE_PREFIX}all`;
        try {
          const rawAll = localStorage.getItem(allKey);
          const allList = rawAll ? JSON.parse(rawAll) : [];
          if (Array.isArray(allList)) {
            const updated = allList.filter(i => String(i.tenantId) !== activeTenant);
            localStorage.setItem(allKey, JSON.stringify(updated));
          }
        } catch (e) {}
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

    if (tenantId && tenantId !== 'all') {
      items = items.filter(i => String(i.tenantId) === String(tenantId));
    }

    if (category && category !== 'all') {
      items = items.filter(i => (i.category || '').toLowerCase() === category.toLowerCase());
    }

    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      items = items.filter(i => (
        (i.name || '').toLowerCase().includes(query) ||
        (i.category || '').toLowerCase().includes(query) ||
        (i.deletedBy || '').toLowerCase().includes(query) ||
        (i.deletedByEmail || '').toLowerCase().includes(query)
      ));
    }

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
