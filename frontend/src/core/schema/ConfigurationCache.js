/**
 * CONFIGURATION CACHE ENGINE
 * Ultra Fast Memory & Storage Caching Layer for Module Configurations
 */

class ConfigurationCache {
  constructor() {
    this._memoryCache = new Map();
  }

  _getKey(companyId, moduleId) {
    return `omnilflow_config_${companyId}_${moduleId}`;
  }

  /**
   * Get cached configuration
   * @param {string} companyId 
   * @param {string} moduleId 
   * @returns {Object|null}
   */
  get(companyId, moduleId) {
    const key = this._getKey(companyId, moduleId);
    
    // 1. Check Memory Cache
    if (this._memoryCache.has(key)) {
      return this._memoryCache.get(key);
    }

    // 2. Check Storage Cache
    if (typeof localStorage !== 'undefined') {
      try {
        const item = localStorage.getItem(key);
        if (item) {
          const parsed = JSON.parse(item);
          this._memoryCache.set(key, parsed);
          return parsed;
        }
      } catch (e) {
        console.error('[ConfigurationCache] Read error:', e);
      }
    }

    return null;
  }

  /**
   * Set configuration cache
   * @param {string} companyId 
   * @param {string} moduleId 
   * @param {Object} config 
   */
  set(companyId, moduleId, config) {
    const key = this._getKey(companyId, moduleId);
    this._memoryCache.set(key, config);

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(key, JSON.stringify(config));
      } catch (e) {
        console.error('[ConfigurationCache] Write error:', e);
      }
    }
  }

  /**
   * Invalidate cache for a company module
   */
  invalidate(companyId, moduleId) {
    const key = this._getKey(companyId, moduleId);
    this._memoryCache.delete(key);
  }

  /**
   * Clear all memory cache
   */
  clearAll() {
    this._memoryCache.clear();
  }
}

export const configurationCache = new ConfigurationCache();
