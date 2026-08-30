/**
 * FEATURE PROVISIONING ENGINE (FeatureProvisioningEngine)
 * Master engine for SaaS SuperAdmin Global Module Visibility & Per-Tenant Feature Provisioning.
 * Backed by Firebase Firestore (platform_module_provisioning collection) with real-time sync.
 */

import FirebaseCloudEngine from './FirebaseCloudEngine';

const STORAGE_KEY = 'omnilflow_feature_provisioning';
const FIRESTORE_DOC_ID = 'global_provisioning_state';

class FeatureProvisioningEngineService {
  constructor() {
    this._state = this._loadLocalState();
  }

  _loadLocalState() {
    if (typeof window === 'undefined') {
      return { globalDisabledModules: [], tenantOverrides: {} };
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {}
    return {
      globalDisabledModules: [],
      tenantOverrides: {} // { [tenantId]: { disabled: [], enabled: [] } }
    };
  }

  getState() {
    return this._state;
  }

  getGlobalDisabledModules() {
    return this._state.globalDisabledModules || [];
  }

  /**
   * Check if a module is globally disabled across the platform
   * @param {string} moduleId 
   * @returns {boolean}
   */
  isModuleGloballyDisabled(moduleId) {
    if (!moduleId) return false;
    const list = this._state.globalDisabledModules || [];
    return Array.isArray(list) && list.includes(moduleId);
  }

  getTenantOverrides(tenantId) {
    if (!tenantId) return { disabled: [], enabled: [] };
    const cleanId = String(tenantId).trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    return this._state.tenantOverrides?.[cleanId] || { disabled: [], enabled: [] };
  }

  /**
   * Check if a module is enabled for a given tenant (or globally)
   * Supports both (moduleId, tenantId) and (tenantId, moduleId) signatures
   */
  isModuleEnabledForTenant(arg1, arg2, authUser = null) {
    if (!arg1 && !arg2) return true;

    // SuperAdmin always has platform-level access
    if (authUser && (authUser.role === 'superadmin' || authUser.role === 'super_admin' || authUser.isSuperAdmin)) {
      return true;
    }

    let moduleId = arg1;
    let tenantId = arg2;

    // Handle swapped arguments if any
    const globalList = this._state.globalDisabledModules || [];
    if (typeof arg2 === 'string' && (globalList.includes(arg2) || arg2.includes('_') || arg2 === 'payroll' || arg2 === 'employees' || arg2 === 'dashboards')) {
      moduleId = arg2;
      tenantId = arg1;
    }

    if (!moduleId) return true;

    const cleanTenant = tenantId ? String(tenantId).trim().replace(/[^a-zA-Z0-9_-]/g, '_') : 'default_tenant';

    // 1. Check Per-Tenant Specific Overrides first
    const overrides = this._state.tenantOverrides?.[cleanTenant];
    if (overrides) {
      if (Array.isArray(overrides.disabled) && overrides.disabled.includes(moduleId)) {
        return false; // Explicitly disabled for this company
      }
      if (Array.isArray(overrides.enabled) && overrides.enabled.includes(moduleId)) {
        return true; // Explicitly enabled for this company even if globally restricted
      }
    }

    // 2. Check Global Disabled Modules
    if (Array.isArray(this._state.globalDisabledModules) && this._state.globalDisabledModules.includes(moduleId)) {
      return false; // Globally hidden for all companies
    }

    return true; // Default enabled
  }

  /**
   * Set Global Module Status (Enabled/Disabled)
   */
  async setGlobalModuleStatus(moduleId, isEnabled) {
    let disabledList = [...(this._state.globalDisabledModules || [])];
    if (isEnabled) {
      disabledList = disabledList.filter(id => id !== moduleId);
    } else {
      if (!disabledList.includes(moduleId)) {
        disabledList.push(moduleId);
      }
    }

    const updatedState = {
      ...this._state,
      globalDisabledModules: disabledList,
      updatedAt: new Date().toISOString()
    };

    this._state = updatedState;
    this._persistState(updatedState);
    return updatedState;
  }

  /**
   * Set Per-Tenant Module Provisioning Status
   */
  async setTenantModuleStatus(tenantId, moduleId, isEnabled) {
    if (!tenantId) return;
    const cleanTenant = String(tenantId).trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    const existing = this.getTenantOverrides(cleanTenant);

    let disabledList = [...(existing.disabled || [])];
    let enabledList = [...(existing.enabled || [])];

    if (isEnabled) {
      disabledList = disabledList.filter(id => id !== moduleId);
      if (!enabledList.includes(moduleId)) enabledList.push(moduleId);
    } else {
      enabledList = enabledList.filter(id => id !== moduleId);
      if (!disabledList.includes(moduleId)) disabledList.push(moduleId);
    }

    const updatedState = {
      ...this._state,
      tenantOverrides: {
        ...(this._state.tenantOverrides || {}),
        [cleanTenant]: {
          disabled: disabledList,
          enabled: enabledList
        }
      },
      updatedAt: new Date().toISOString()
    };

    this._state = updatedState;
    this._persistState(updatedState);
    return updatedState;
  }

  /**
   * Bulk Save Full Provisioning Matrix
   */
  async saveFullProvisioningState(newState) {
    const cleanState = {
      globalDisabledModules: Array.isArray(newState.globalDisabledModules) ? newState.globalDisabledModules : [],
      tenantOverrides: newState.tenantOverrides || {},
      updatedAt: new Date().toISOString()
    };

    this._state = cleanState;
    this._persistState(cleanState);
    return cleanState;
  }

  _persistState(state) {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        window.dispatchEvent(new CustomEvent('omnilflow_provisioning_updated', { detail: state }));
      }

      // Sync to Firebase Firestore
      FirebaseCloudEngine.saveRecord('platform_module_provisioning', {
        id: FIRESTORE_DOC_ID,
        tenantId: 'platform_superadmin',
        ...state
      }, 'platform_superadmin').catch(err => console.warn('Firebase provisioning save warning:', err));
    } catch (e) {
      console.error('Failed to persist feature provisioning state:', e);
    }
  }

  /**
   * Sync provisioning state from Firebase Firestore
   */
  async syncFromCloud() {
    try {
      const records = await FirebaseCloudEngine.fetchRecords('platform_module_provisioning', 'platform_superadmin');
      if (Array.isArray(records) && records.length > 0) {
        const latest = records[0];
        if (latest) {
          const state = {
            globalDisabledModules: Array.isArray(latest.globalDisabledModules) ? latest.globalDisabledModules : [],
            tenantOverrides: latest.tenantOverrides || {},
            updatedAt: latest.updatedAt || new Date().toISOString()
          };
          this._state = state;
          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            window.dispatchEvent(new CustomEvent('omnilflow_provisioning_updated', { detail: state }));
          }
          console.log(`☁️ Synced Feature Provisioning State from Firebase Firestore`);
          return state;
        }
      }
    } catch (e) {
      console.warn('Failed to sync feature provisioning from cloud:', e);
    }
    return this._state;
  }

  /**
   * Subscribe to real-time Cloud updates
   */
  subscribeToCloudProvisioning(callback) {
    return FirebaseCloudEngine.subscribeToCollection('platform_module_provisioning', 'platform_superadmin', (records) => {
      if (Array.isArray(records) && records.length > 0) {
        const latest = records[0];
        if (latest) {
          const state = {
            globalDisabledModules: Array.isArray(latest.globalDisabledModules) ? latest.globalDisabledModules : [],
            tenantOverrides: latest.tenantOverrides || {},
            updatedAt: latest.updatedAt || new Date().toISOString()
          };
          this._state = state;
          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            window.dispatchEvent(new CustomEvent('omnilflow_provisioning_updated', { detail: state }));
          }
          if (typeof callback === 'function') callback(state);
        }
      }
    });
  }
}

export const FeatureProvisioningEngine = new FeatureProvisioningEngineService();
export default FeatureProvisioningEngine;
