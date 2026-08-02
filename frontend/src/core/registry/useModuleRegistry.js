/**
 * GLOBAL EMS MODULE REGISTRY HOOK
 * React Hook for consuming dynamic module configurations with live event re-hydration
 */

import { useState, useEffect, useCallback } from 'react';
import { masterModuleRegistry } from './MasterModuleRegistry';

export function useModuleRegistry(companyId, moduleId) {
  const [config, setConfig] = useState(() => {
    return masterModuleRegistry.resolveTenantModuleConfig(companyId, moduleId);
  });

  const refreshConfig = useCallback(() => {
    const latest = masterModuleRegistry.resolveTenantModuleConfig(companyId, moduleId);
    setConfig({ ...latest, _version: Date.now() });
  }, [companyId, moduleId]);

  useEffect(() => {
    refreshConfig();

    if (typeof window !== 'undefined') {
      const handleConfigUpdate = (e) => {
        if (!e.detail || !e.detail.moduleId || e.detail.moduleId === moduleId) {
          refreshConfig();
        }
      };

      window.addEventListener('omnilflow_config_updated', handleConfigUpdate);
      return () => window.removeEventListener('omnilflow_config_updated', handleConfigUpdate);
    }
  }, [companyId, moduleId, refreshConfig]);

  return {
    config,
    manifest: masterModuleRegistry.getSystemManifest(moduleId),
    refreshConfig
  };
}
