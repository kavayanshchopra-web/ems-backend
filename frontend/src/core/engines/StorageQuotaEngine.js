// OmniFlow EMS — Storage Quota & Tier Engine
// Default 2GB Quota Enforcer, Plan Upgrades, & Storage Usage Analytics

import { db } from '../../firebase.js';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';

export const STORAGE_TIERS = {
  FREE_STARTER: {
    key: 'FREE_STARTER',
    name: 'Free Starter Plan',
    limitBytes: 2 * 1024 * 1024 * 1024, // 2 GB
    priceMonthly: '₹0 / month',
    description: 'Default 2 GB storage for small teams'
  },
  PRO_GROWTH: {
    key: 'PRO_GROWTH',
    name: 'Pro Growth Plan',
    limitBytes: 10 * 1024 * 1024 * 1024, // 10 GB
    priceMonthly: '₹499 / month',
    description: '10 GB storage for growing businesses'
  },
  BUSINESS_SCALE: {
    key: 'BUSINESS_SCALE',
    name: 'Business Scale Plan',
    limitBytes: 50 * 1024 * 1024 * 1024, // 50 GB
    priceMonthly: '₹1,499 / month',
    description: '50 GB storage for medium to large enterprises'
  },
  ENTERPRISE_UNLIMITED: {
    key: 'ENTERPRISE_UNLIMITED',
    name: 'Enterprise Plan',
    limitBytes: 500 * 1024 * 1024 * 1024, // 500 GB
    priceMonthly: '₹4,999 / month',
    description: '500 GB dedicated high-speed cloud storage'
  }
};

export class StorageQuotaEngine {
  /**
   * Safely extracts string tenantId from string or object
   */
  static getTenantString(tenantId) {
    if (!tenantId) return 'acme_corp';
    if (typeof tenantId === 'string') return tenantId;
    if (typeof tenantId === 'object') return tenantId.id || tenantId.tenantId || tenantId.companyId || 'acme_corp';
    return String(tenantId);
  }

  /**
   * Helper to format bytes to human readable string (KB, MB, GB)
   */
  static formatBytes(bytes, decimals = 2) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * Retrieves tenant quota & usage config from Firestore or localStorage
   */
  static async getTenantQuotaConfig(tenantId) {
    const cleanTenant = this.getTenantString(tenantId);
    const cacheKey = `storage_config_${cleanTenant}`;

    try {
      const docRef = doc(db, 'tenant_storage_configs', cleanTenant);
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        const data = snap.data();
        localStorage.setItem(cacheKey, JSON.stringify(data));
        return data;
      }
    } catch (e) {
      console.warn('Using cached storage config:', e);
    }

    // Local Storage fallback
    const local = localStorage.getItem(cacheKey);
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }

    // Default configuration (2 GB Free Starter)
    const defaultConfig = {
      tenantId: cleanTenant,
      tierKey: 'FREE_STARTER',
      limitBytes: STORAGE_TIERS.FREE_STARTER.limitBytes,
      usedBytes: 0,
      updatedAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'tenant_storage_configs', cleanTenant), defaultConfig);
    } catch (e) {}

    return defaultConfig;
  }

  /**
   * Checks if tenant has enough quota available for new upload
   */
  static async checkQuotaAvailable(tenantId, newSizeBytes = 0) {
    const config = await this.getTenantQuotaConfig(tenantId);
    const limitBytes = config.limitBytes || STORAGE_TIERS.FREE_STARTER.limitBytes;
    const usedBytes = config.usedBytes || 0;
    const projectedUsed = usedBytes + newSizeBytes;

    const allowed = projectedUsed <= limitBytes;
    const usedPercentage = Math.min(100, Math.round((usedBytes / limitBytes) * 100));

    return {
      allowed,
      limitBytes,
      usedBytes,
      remainingBytes: Math.max(0, limitBytes - usedBytes),
      usedPercentage,
      usedFormatted: this.formatBytes(usedBytes),
      limitFormatted: this.formatBytes(limitBytes),
      remainingFormatted: this.formatBytes(Math.max(0, limitBytes - usedBytes)),
      tierKey: config.tierKey || 'FREE_STARTER'
    };
  }

  /**
   * Updates storage usage bytes (add or subtract when files are uploaded/deleted)
   */
  static async recordStorageUsage(tenantId, deltaBytes = 0) {
    if (deltaBytes === 0) return;
    const cleanTenant = tenantId || 'acme_corp';
    const config = await this.getTenantQuotaConfig(cleanTenant);

    const newUsedBytes = Math.max(0, (config.usedBytes || 0) + deltaBytes);
    const updatedConfig = {
      ...config,
      usedBytes: newUsedBytes,
      updatedAt: new Date().toISOString()
    };

    try {
      const docRef = doc(db, 'tenant_storage_configs', cleanTenant);
      await setDoc(docRef, updatedConfig, { merge: true });
      localStorage.setItem(`storage_config_${cleanTenant}`, JSON.stringify(updatedConfig));
    } catch (e) {
      console.error('Failed to update storage quota usage:', e);
    }
  }

  /**
   * Recalculates & auto-heals total used storage bytes based on actual active files sum
   */
  static async recalculateStorageUsage(tenantId, actualUsedBytes = 0) {
    const cleanTenant = this.getTenantString(tenantId);
    const config = await this.getTenantQuotaConfig(cleanTenant);

    const safeBytes = Math.max(0, actualUsedBytes);
    const updatedConfig = {
      ...config,
      usedBytes: safeBytes,
      updatedAt: new Date().toISOString()
    };

    try {
      const docRef = doc(db, 'tenant_storage_configs', cleanTenant);
      await setDoc(docRef, updatedConfig, { merge: true });
      localStorage.setItem(`storage_config_${cleanTenant}`, JSON.stringify(updatedConfig));
    } catch (e) {
      console.error('Failed to recalculate storage quota usage:', e);
    }
    return updatedConfig;
  }

  /**
   * Upgrades company tier plan
   */
  static async updateTenantTier(tenantId, newTierKey) {
    const targetTier = STORAGE_TIERS[newTierKey];
    if (!targetTier) throw new Error(`Invalid tier key: ${newTierKey}`);
    const cleanTenant = tenantId || 'acme_corp';

    const config = await this.getTenantQuotaConfig(cleanTenant);
    const updatedConfig = {
      ...config,
      tierKey: newTierKey,
      limitBytes: targetTier.limitBytes,
      updatedAt: new Date().toISOString()
    };

    const docRef = doc(db, 'tenant_storage_configs', cleanTenant);
    await setDoc(docRef, updatedConfig, { merge: true });
    localStorage.setItem(`storage_config_${cleanTenant}`, JSON.stringify(updatedConfig));

    return updatedConfig;
  }
}

export default StorageQuotaEngine;
