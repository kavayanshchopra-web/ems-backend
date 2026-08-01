/**
 * CONFIGURATION MIGRATION MANAGER
 * Schema Versioning & Automated Upgrade Engine
 */

import { SCHEMA_VERSIONS } from './masterSchema';

export class ConfigurationMigrationManager {
  /**
   * Migrate a tenant module configuration to the target schema version
   * @param {Object} tenantConfig 
   * @param {string} targetVersion 
   * @returns {Object} Migrated configuration object
   */
  static migrateSchema(tenantConfig, targetVersion = SCHEMA_VERSIONS.CURRENT) {
    if (!tenantConfig) return {};

    const currentVersion = tenantConfig.schemaVersion || '1.0.0';

    if (currentVersion === targetVersion) {
      return tenantConfig;
    }

    console.log(`[ConfigurationMigrationManager] Migrating schema from ${currentVersion} -> ${targetVersion}`);

    // Standard Migration Rules Pipeline
    let migrated = { ...tenantConfig };

    if (currentVersion === '1.0.0' && targetVersion === '1.1.0') {
      migrated = this._migrate100To110(migrated);
    }

    migrated.schemaVersion = targetVersion;
    migrated.migratedAt = new Date().toISOString();

    return migrated;
  }

  static _migrate100To110(config) {
    // Add default search schema parameters if missing
    return {
      ...config,
      searchConfig: config.searchConfig || { minChars: 1, debounceMs: 200, matchMode: 'CONTAINS' }
    };
  }
}
