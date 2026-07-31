/**
 * EMS Global Module Configuration Service
 * Master single-source-of-truth service for all module configurations.
 * Manages moduleConfigs[moduleId] keyed per company/tenant.
 */

import { loadAtsModuleConfig, saveAtsModuleConfig } from '../config/atsModuleConfig';
import { GLOBAL_MODULE_REGISTRY } from '../config/globalModuleRegistry';

const MASTER_CONFIG_PREFIX = 'omnilflow_master_module_configs_';

export const moduleConfigService = {
  // Get Configuration for specific Module
  getModuleConfig(companyId, moduleId = 'recruitment_ats') {
    if (moduleId === 'recruitment_ats') {
      return loadAtsModuleConfig(companyId);
    }

    const tenantKey = companyId ? String(companyId).replace(/[^a-zA-Z0-9_-]/g, '_') : 'default';
    const key = `${MASTER_CONFIG_PREFIX}${tenantKey}`;

    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed[moduleId]) return parsed[moduleId];
      }
    } catch (e) {
      console.error(`Error reading module config for ${moduleId}:`, e);
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
      return;
    }

    const tenantKey = companyId ? String(companyId).replace(/[^a-zA-Z0-9_-]/g, '_') : 'default';
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
