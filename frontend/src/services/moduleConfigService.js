/**
 * EMS Global Module Configuration Service
 * Master single-source-of-truth service for all module configurations.
 * Manages moduleConfigs[moduleId] keyed per company/tenant.
 * Backed by Firebase Firestore for persistent cloud storage and localStorage for snappy UI.
 */

import { loadAtsModuleConfig, saveAtsModuleConfig } from '../config/atsModuleConfig';
import { GLOBAL_MODULE_REGISTRY } from '../config/globalModuleRegistry';
import { masterModuleRegistry } from '../core/registry/MasterModuleRegistry';
import FirebaseCloudEngine from '../core/engines/FirebaseCloudEngine';

const MASTER_CONFIG_PREFIX = 'omnilflow_master_module_configs_';

function getTenantKey(companyId) {
  if (companyId && companyId !== 'default' && companyId !== 'default_tenant' && companyId !== 'acme_corp') {
    return String(companyId).trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  }
  if (typeof window !== 'undefined') {
    try {
      const storedUser = JSON.parse(localStorage.getItem('omnilflow_user') || 'null');
      const candidate = storedUser?.tenantId || storedUser?.companyId || storedUser?.tenant_id;
      if (candidate && candidate !== 'default' && candidate !== 'default_tenant' && candidate !== 'acme_corp') {
        return String(candidate).trim().replace(/[^a-zA-Z0-9_-]/g, '_');
      }
    } catch (e) {}
  }
  return companyId ? String(companyId).replace(/[^a-zA-Z0-9_-]/g, '_') : 'default_tenant';
}

export const moduleConfigService = {
  getTenantKey,

  // Get Configuration for specific Module
  getModuleConfig(companyId, moduleId = 'recruitment_ats') {
    if (moduleId === 'recruitment_ats') {
      return loadAtsModuleConfig(companyId);
    }

    const tenantKey = getTenantKey(companyId);
    const primaryKey = `${MASTER_CONFIG_PREFIX}${tenantKey}`;

    try {
      // Check multiple candidate keys in order of specificity
      const candidateKeys = [
        primaryKey,
        `${MASTER_CONFIG_PREFIX}default_tenant`,
        `${MASTER_CONFIG_PREFIX}default`,
        `${MASTER_CONFIG_PREFIX}acme_corp`,
        `${MASTER_CONFIG_PREFIX}org_default`
      ];

      for (const key of candidateKeys) {
        const saved = localStorage.getItem(key);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed && parsed[moduleId] && (parsed[moduleId].fields?.length > 0 || parsed[moduleId].columns?.length > 0)) {
              return parsed[moduleId];
            }
          } catch (err) {}
        }
      }
    } catch (e) {
      console.error(`Error reading module config for ${moduleId}:`, e);
    }

    const manifest = masterModuleRegistry.getSystemManifest(moduleId);
    if (manifest) {
      return {
        moduleId: manifest.moduleId,
        schemaVersion: '1.1',
        fields: manifest.defaultFields || [],
        summaryWidgets: manifest.defaultSummaryWidgets || [],
        columns: manifest.defaultColumns || [],
        views: manifest.defaultViews || { availableViews: ['list', 'kanban'], defaultView: 'list' },
        stages: manifest.defaultStages || [],
        idConfig: manifest.defaultIdConfig || { prefix: 'EMP', pattern: 'EMP-0001', nextSeq: 1 }
      };
    }

    return {
      moduleId,
      schemaVersion: '1.1',
      fields: [],
      summaryWidgets: [],
      columns: []
    };
  },

  // Save Configuration for specific Module
  saveModuleConfig(companyId, moduleId = 'recruitment_ats', config) {
    const tenantKey = getTenantKey(companyId);
    const key = `${MASTER_CONFIG_PREFIX}${tenantKey}`;

    const cleanConfig = JSON.parse(JSON.stringify(config, (k, v) => v === undefined ? '' : v));
    const payload = {
      ...cleanConfig,
      moduleId,
      tenantId: tenantKey,
      updatedAt: new Date().toISOString()
    };

    // 1. Local Storage persistence (both tenant-specific and fallbacks)
    try {
      const saved = localStorage.getItem(key);
      const allConfigs = saved ? JSON.parse(saved) : {};
      allConfigs[moduleId] = payload;
      
      const jsonStr = JSON.stringify(allConfigs);
      localStorage.setItem(key, jsonStr);
      localStorage.setItem(`${MASTER_CONFIG_PREFIX}default_tenant`, jsonStr);
      localStorage.setItem(`${MASTER_CONFIG_PREFIX}default`, jsonStr);
    } catch (e) {
      console.error(`Error saving local module config for ${moduleId}:`, e);
    }

    if (moduleId === 'recruitment_ats') {
      saveAtsModuleConfig(tenantKey, config);
    }

    // 2. Firebase Firestore Cloud persistence
    try {
      const docId = `${tenantKey}_${moduleId}`;
      FirebaseCloudEngine.saveRecord('module_configs', {
        id: docId,
        ...payload
      }, tenantKey).catch(err => console.warn('Firebase module_configs save warning:', err));
    } catch (e) {
      console.error(`Error saving cloud module config for ${moduleId}:`, e);
    }

    // 3. Broadcast live event across components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('omnilflow_config_updated', {
        detail: { moduleId, companyId: tenantKey }
      }));
    }
  },

  // Synchronize all module configurations from Firebase Firestore
  async syncFromCloud(companyId) {
    const tenantKey = getTenantKey(companyId);
    const key = `${MASTER_CONFIG_PREFIX}${tenantKey}`;

    try {
      const cloudRecords = await FirebaseCloudEngine.fetchRecords('module_configs', tenantKey);
      if (Array.isArray(cloudRecords) && cloudRecords.length > 0) {
        const saved = localStorage.getItem(key);
        const allConfigs = saved ? JSON.parse(saved) : {};

        cloudRecords.forEach(rec => {
          if (rec && rec.moduleId) {
            allConfigs[rec.moduleId] = {
              ...(allConfigs[rec.moduleId] || {}),
              ...rec
            };
            if (rec.moduleId === 'recruitment_ats') {
              saveAtsModuleConfig(tenantKey, rec);
            }
          }
        });

        const jsonStr = JSON.stringify(allConfigs);
        localStorage.setItem(key, jsonStr);
        localStorage.setItem(`${MASTER_CONFIG_PREFIX}default_tenant`, jsonStr);
        localStorage.setItem(`${MASTER_CONFIG_PREFIX}default`, jsonStr);

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('omnilflow_config_updated', {
            detail: { companyId: tenantKey }
          }));
        }
        console.log(`☁️ Synced ${cloudRecords.length} module configs from Firebase Firestore`);
      }
    } catch (err) {
      console.warn('Failed to sync module configs from cloud:', err);
    }
  },

  // Real-time Firestore subscription
  subscribeToCloudConfigs(companyId, callback) {
    const tenantKey = getTenantKey(companyId);
    const key = `${MASTER_CONFIG_PREFIX}${tenantKey}`;

    return FirebaseCloudEngine.subscribeToCollection('module_configs', tenantKey, (records) => {
      if (Array.isArray(records) && records.length > 0) {
        try {
          const saved = localStorage.getItem(key);
          const allConfigs = saved ? JSON.parse(saved) : {};

          records.forEach(rec => {
            if (rec && rec.moduleId) {
              allConfigs[rec.moduleId] = {
                ...(allConfigs[rec.moduleId] || {}),
                ...rec
              };
              if (rec.moduleId === 'recruitment_ats') {
                saveAtsModuleConfig(tenantKey, rec);
              }
            }
          });

          const jsonStr = JSON.stringify(allConfigs);
          localStorage.setItem(key, jsonStr);
          localStorage.setItem(`${MASTER_CONFIG_PREFIX}default_tenant`, jsonStr);
          localStorage.setItem(`${MASTER_CONFIG_PREFIX}default`, jsonStr);

          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('omnilflow_config_updated', {
              detail: { companyId: tenantKey }
            }));
          }
          if (typeof callback === 'function') callback(allConfigs);
        } catch (e) {}
      }
    });
  },

  // Module Registry Accessors
  getRegisteredModules() {
    return Object.values(GLOBAL_MODULE_REGISTRY);
  },

  getModuleDefinition(moduleId) {
    return GLOBAL_MODULE_REGISTRY[moduleId] || null;
  }
};

export default moduleConfigService;
