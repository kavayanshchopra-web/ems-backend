/**
 * EMS Global Module Configuration Service
 * Master single-source-of-truth service for all module configurations.
 * Manages moduleConfigs[moduleId] keyed per company/tenant.
 */

import { loadAtsModuleConfig, saveAtsModuleConfig } from '../config/atsModuleConfig';
import { GLOBAL_MODULE_REGISTRY } from '../config/globalModuleRegistry';
import { masterModuleRegistry } from '../core/registry/MasterModuleRegistry';

const MASTER_CONFIG_PREFIX = 'omnilflow_master_module_configs_';

function getTenantKey(companyId) {
  if (!companyId || companyId === 'default' || companyId === 'default_tenant') {
    return 'default_tenant';
  }
  return String(companyId).replace(/[^a-zA-Z0-9_-]/g, '_');
}

export const moduleConfigService = {
  // Get Configuration for specific Module
  getModuleConfig(companyId, moduleId = 'recruitment_ats') {
    if (moduleId === 'recruitment_ats') {
      return loadAtsModuleConfig(companyId);
    }

    const tenantKey = getTenantKey(companyId);
    const key = `${MASTER_CONFIG_PREFIX}${tenantKey}`;

    try {
      const saved = localStorage.getItem(key) || localStorage.getItem(`${MASTER_CONFIG_PREFIX}default`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed[moduleId]) return parsed[moduleId];
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
    if (moduleId === 'recruitment_ats') {
      saveAtsModuleConfig(companyId, config);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('omnilflow_config_updated', { detail: { moduleId, companyId } }));
      }
      return;
    }

    const tenantKey = getTenantKey(companyId);
    const key = `${MASTER_CONFIG_PREFIX}${tenantKey}`;

    try {
      const saved = localStorage.getItem(key);
      const allConfigs = saved ? JSON.parse(saved) : {};
      allConfigs[moduleId] = {
        ...config,
        moduleId,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(key, JSON.stringify(allConfigs));
      // Sync fallback key as well
      localStorage.setItem(`${MASTER_CONFIG_PREFIX}default`, JSON.stringify(allConfigs));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('omnilflow_config_updated', { detail: { moduleId, companyId } }));
      }
    } catch (e) {
      console.error(`Error saving module config for ${moduleId}:`, e);
    }
  },

  // Module Registry Accessors
  getRegisteredModules() {
    return Object.values(GLOBAL_MODULE_REGISTRY);
  },

  getModuleDefinition(moduleId) {
    return GLOBAL_MODULE_REGISTRY[moduleId] || null;
  }
};
