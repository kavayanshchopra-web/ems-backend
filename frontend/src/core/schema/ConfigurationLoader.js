/**
 * CONFIGURATION LOADER ENGINE
 * Unified Loader & Resolver for Multi-Tenant Module Configurations
 */

import { configurationCache } from './ConfigurationCache';
import { ConfigurationMerger } from './ConfigurationMerger';
import { masterModuleRegistry } from '../registry/MasterModuleRegistry';

export class ConfigurationLoader {
  /**
   * Load effective module schema for a company
   * @param {string} companyId 
   * @param {string} moduleId 
   * @returns {Object}
   */
  static loadModuleSchema(companyId, moduleId) {
    const cached = configurationCache.get(companyId, moduleId);
    if (cached) return cached;

    const manifest = masterModuleRegistry.getSystemManifest(moduleId);
    if (!manifest) {
      console.warn(`[ConfigurationLoader] System manifest not found for "${moduleId}".`);
      return {};
    }

    const effectiveConfig = masterModuleRegistry.resolveTenantModuleConfig(companyId, moduleId);
    configurationCache.set(companyId, moduleId, effectiveConfig);

    return effectiveConfig;
  }

  /**
   * Save and update tenant configuration
   * @param {string} companyId 
   * @param {string} moduleId 
   * @param {Object} newConfig 
   */
  static saveModuleSchema(companyId, moduleId, newConfig) {
    configurationCache.invalidate(companyId, moduleId);
    masterModuleRegistry.resolveTenantModuleConfig(companyId, moduleId);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('omnilflow_config_updated', {
        detail: { moduleId, companyId, timestamp: Date.now() }
      }));
    }
  }
}
