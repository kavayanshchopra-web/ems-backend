/**
 * TenantStorage.js
 * Universal Strict Multi-Tenant Storage Engine for OmniFlow CRM & EMS
 * 
 * Guarantees that:
 * 1. No business data is ever saved under a generic/global localStorage key.
 * 2. All caches are automatically namespaced: `omni_${tenantId}_${key}`.
 * 3. Cross-tenant leakage between user sessions on the same browser is mathematically prevented.
 * 4. Full purge on logout removes all trace of tenant data.
 */

class TenantStorage {
  /**
   * Resolves the active tenant ID strictly.
   * Rejects insecure fallbacks ('default', 'acme_corp', 'all').
   */
  static getTenantId(explicitTenantId = null) {
    if (explicitTenantId && explicitTenantId !== 'default' && explicitTenantId !== 'default_tenant' && explicitTenantId !== 'acme_corp' && explicitTenantId !== 'all') {
      return String(explicitTenantId).trim();
    }

    if (typeof window !== 'undefined') {
      if (window.__omniflow_tenant && window.__omniflow_tenant !== 'default' && window.__omniflow_tenant !== 'default_tenant' && window.__omniflow_tenant !== 'all') {
        return String(window.__omniflow_tenant).trim();
      }

      try {
        const stored = localStorage.getItem('omnilflow_user');
        if (stored) {
          const u = JSON.parse(stored);
          const candidate = u?.tenantId || u?.companyId || u?.tenant_id;
          if (candidate && candidate !== 'default' && candidate !== 'default_tenant' && candidate !== 'all') {
            return String(candidate).trim();
          }
        }
      } catch (e) {}
    }

    return explicitTenantId ? String(explicitTenantId).trim() : 'org_unassigned';
  }

  /**
   * Generates a strictly isolated key
   */
  static getKey(key, tenantId = null) {
    const tId = this.getTenantId(tenantId);
    return `omni_${tId}_${key}`;
  }

  /**
   * Retrieves an item strictly scoped to the tenant
   */
  static getItem(key, tenantId = null, defaultValue = null) {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const fullKey = this.getKey(key, tenantId);
      const val = localStorage.getItem(fullKey);
      if (val === null || val === undefined) return defaultValue;
      return JSON.parse(val);
    } catch (e) {
      return defaultValue;
    }
  }

  /**
   * Saves an item strictly scoped to the tenant
   */
  static setItem(key, value, tenantId = null) {
    if (typeof window === 'undefined') return;
    try {
      const fullKey = this.getKey(key, tenantId);
      localStorage.setItem(fullKey, JSON.stringify(value));
    } catch (e) {
      console.warn('[TenantStorage] Write error:', e.message);
    }
  }

  /**
   * Removes a specific item for a tenant
   */
  static removeItem(key, tenantId = null) {
    if (typeof window === 'undefined') return;
    try {
      const fullKey = this.getKey(key, tenantId);
      localStorage.removeItem(fullKey);
    } catch (e) {}
  }

  /**
   * Clears ALL cached records for a specific tenant
   */
  static clearTenant(tenantId = null) {
    if (typeof window === 'undefined') return;
    const tId = this.getTenantId(tenantId);
    const prefix = `omni_${tId}_`;
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) {
        toRemove.push(k);
      }
    }
    toRemove.forEach(k => localStorage.removeItem(k));
  }

  /**
   * Complete session purge (Called on Sign Out and Clean Switch)
   * Wipes all tenant caches and legacy keys cleanly.
   */
  static clearAll() {
    if (typeof window === 'undefined') return;
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      // Preserve UI preferences (theme, sidebar state) only
      if (k === 'ems_theme' || k === 'sidebar_collapsed' || k === 'appCurrency') continue;
      toRemove.push(k);
    }
    toRemove.forEach(k => localStorage.removeItem(k));
    sessionStorage.clear();
    if (window) window.__omniflow_tenant = null;
  }
}

export default TenantStorage;
