/**
 * CONFIGURATION MERGER ENGINE
 * Intelligently merges System Manifest defaults with Tenant Overrides
 */

export class ConfigurationMerger {
  /**
   * Merge system manifest with tenant override
   * @param {Object} systemManifest 
   * @param {Object} tenantOverride 
   * @returns {Object} Effective runtime schema
   */
  static merge(systemManifest, tenantOverride = {}) {
    if (!systemManifest) return {};

    const mergedFields = this._mergeFields(systemManifest.defaultFields || [], tenantOverride.fields || []);
    const mergedWidgets = this._mergeWidgets(systemManifest.defaultSummaryWidgets || [], tenantOverride.summaryWidgets || []);
    const mergedColumns = tenantOverride.columns && tenantOverride.columns.length > 0 ? tenantOverride.columns : (systemManifest.defaultColumns || []);
    const mergedViews = tenantOverride.views ? { ...systemManifest.defaultViews, ...tenantOverride.views } : (systemManifest.defaultViews || {});
    const mergedStages = tenantOverride.stages && tenantOverride.stages.length > 0 ? tenantOverride.stages : (systemManifest.defaultStages || []);

    return {
      moduleId: systemManifest.moduleId,
      moduleTitle: systemManifest.name,
      moduleSubtitle: systemManifest.description,
      entityName: systemManifest.name.replace(/s$/, ''),
      entityNamePlural: systemManifest.name,
      icon: systemManifest.icon,
      accentColor: systemManifest.accentColor,
      category: systemManifest.category,
      fields: mergedFields,
      summaryWidgets: mergedWidgets,
      columns: mergedColumns,
      views: mergedViews,
      kanbanFields: tenantOverride.kanbanFields || { position: true, email: true, phone: true, resume: true },
      stages: mergedStages
    };
  }

  static _mergeFields(defaultFields, overrideFields) {
    if (!overrideFields || overrideFields.length === 0) return defaultFields;
    
    // Map existing system fields and preserve tenant custom fields
    const defaultMap = new Map(defaultFields.map(f => [f.id, f]));
    const result = [];

    overrideFields.forEach(f => {
      if (defaultMap.has(f.id)) {
        result.push({ ...defaultMap.get(f.id), ...f });
      } else {
        result.push({ ...f, systemField: false });
      }
    });

    return result;
  }

  static _mergeWidgets(defaultWidgets, overrideWidgets) {
    if (!overrideWidgets || overrideWidgets.length === 0) return defaultWidgets;
    return overrideWidgets;
  }
}
