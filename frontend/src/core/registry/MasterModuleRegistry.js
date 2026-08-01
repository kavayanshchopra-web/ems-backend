/**
 * GLOBAL EMS MASTER MODULE REGISTRY
 * Singleton Engine & Registry Manager for Platform Modules
 */

import { RECRUITMENT_ATS_MANIFEST } from './manifests/recruitmentAts.manifest';
import { CRM_DEALS_MANIFEST } from './manifests/crmDeals.manifest';
import { EMPLOYEES_MANIFEST } from './manifests/employees.manifest';
import { PAYROLL_MANIFEST } from './manifests/payroll.manifest';
import { moduleConfigService } from '../../services/moduleConfigService';

class MasterModuleRegistry {
  constructor() {
    this._manifests = new Map();
    this._initialized = false;
    this._initSystemManifests();
  }

  /**
   * Register default system manifests
   */
  _initSystemManifests() {
    if (this._initialized) return;

    this.registerModule(RECRUITMENT_ATS_MANIFEST);
    this.registerModule(CRM_DEALS_MANIFEST);
    this.registerModule(EMPLOYEES_MANIFEST);
    this.registerModule(PAYROLL_MANIFEST);

    this._initialized = true;
  }

  /**
   * Register a module manifest in the system
   * @param {Object} manifest 
   */
  registerModule(manifest) {
    if (!manifest || !manifest.moduleId) {
      throw new Error('[MasterModuleRegistry] Manifest must specify a valid moduleId.');
    }
    
    // Freeze to prevent accidental mutation of system defaults
    this._manifests.set(manifest.moduleId, Object.freeze({ ...manifest }));
  }

  /**
   * Retrieve a system manifest by moduleId
   * @param {string} moduleId 
   * @returns {Object|null}
   */
  getSystemManifest(moduleId) {
    return this._manifests.get(moduleId) || null;
  }

  /**
   * Get all registered system manifests
   * @returns {Array<Object>}
   */
  getAllSystemManifests() {
    return Array.from(this._manifests.values());
  }

  /**
   * Resolve live module configuration merging System Manifest with Tenant Storage Overrides
   * @param {string} companyId 
   * @param {string} moduleId 
   * @returns {Object} Effective runtime module configuration
   */
  resolveTenantModuleConfig(companyId, moduleId) {
    const manifest = this.getSystemManifest(moduleId);
    if (!manifest) {
      console.warn(`[MasterModuleRegistry] Unknown moduleId "${moduleId}". Returning empty schema.`);
      return { fields: [], summaryWidgets: [], columns: [], views: { availableViews: ['kanban', 'list'], defaultView: 'kanban' } };
    }

    // Read stored tenant overrides from moduleConfigService
    const storedConfig = moduleConfigService.getModuleConfig(companyId, moduleId);

    // Deep merge manifest defaults with tenant stored overrides
    const fields = storedConfig.fields && storedConfig.fields.length > 0
      ? storedConfig.fields
      : manifest.defaultFields;

    const summaryWidgets = storedConfig.summaryWidgets && storedConfig.summaryWidgets.length > 0
      ? storedConfig.summaryWidgets
      : manifest.defaultSummaryWidgets;

    const columns = storedConfig.columns && storedConfig.columns.length > 0
      ? storedConfig.columns
      : manifest.defaultColumns;

    const views = storedConfig.views
      ? storedConfig.views
      : manifest.defaultViews;

    const kanbanFields = storedConfig.kanbanFields
      ? storedConfig.kanbanFields
      : { position: true, email: true, phone: true, resume: true };

    return {
      moduleId: manifest.moduleId,
      moduleTitle: manifest.name,
      moduleSubtitle: manifest.description,
      entityName: manifest.name.replace(/s$/, ''),
      entityNamePlural: manifest.name,
      icon: manifest.icon,
      accentColor: manifest.accentColor,
      category: manifest.category,
      fields,
      summaryWidgets,
      columns,
      views,
      kanbanFields,
      stages: manifest.defaultStages || []
    };
  }

  /**
   * Validate dependency graph for a target module
   * @param {string} companyId 
   * @param {string} moduleId 
   * @returns {{ valid: boolean, missingDependencies: Array<string> }}
   */
  validateDependencies(companyId, moduleId) {
    const manifest = this.getSystemManifest(moduleId);
    if (!manifest) return { valid: false, missingDependencies: [`Module "${moduleId}" not found`] };

    const missing = [];
    (manifest.dependencies || []).forEach(dep => {
      const depManifest = this.getSystemManifest(dep.moduleId);
      if (!depManifest) {
        missing.push(dep.moduleId);
      }
    });

    return {
      valid: missing.length === 0,
      missingDependencies: missing
    };
  }
}

// Export singleton instance
export const masterModuleRegistry = new MasterModuleRegistry();
