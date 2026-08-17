import React, { useMemo } from 'react';
import LayoutEngine from '../../core/engines/LayoutEngine/LayoutEngine';
import { useModuleRegistry } from '../../core/registry/useModuleRegistry';

export default function OffboardingPage({
  companyId,
  offboardingCases,
  setOffboardingCases,
  employees = [],
  assets = [],
  authUser,
  systemDropdowns,
  recycleBinItems,
  handleRestoreBinItem,
  handlePermanentDeleteBinItem,
  softDeleteRecord,
  showToast,
  onOpenModuleConfig,
  onManageStages,
  onOpenPositionModal
}) {
  const { config } = useModuleRegistry(companyId || 'default_tenant', 'offboarding');

  // Cross-Module Dynamic Linkage: Auto-compute IT Asset Clearance from live assets directory!
  const syncedOffboardingCases = useMemo(() => {
    return (offboardingCases || []).map(caseItem => {
      const empName = (caseItem.employee || '').toLowerCase().trim();
      if (!empName) return caseItem;

      // Find all assets assigned to this employee in Asset Management
      const assignedAssets = (assets || []).filter(a => {
        const assignedTo = (a.assignedTo || a.employee || '').toLowerCase().trim();
        return (assignedTo && empName.includes(assignedTo)) || (assignedTo && assignedTo.includes(empName));
      });

      let calculatedAssetClearance = caseItem.assetClearance;
      if (assignedAssets.length > 0) {
        const assetNames = assignedAssets.map(a => a.name || a.tag).join(', ');
        calculatedAssetClearance = `⏳ Pending Return (${assignedAssets.length}: ${assetNames})`;
      } else if (!caseItem.assetClearance || caseItem.assetClearance.includes('Pending')) {
        calculatedAssetClearance = '✓ Cleared';
      }

      return {
        ...caseItem,
        assetClearance: calculatedAssetClearance
      };
    });
  }, [offboardingCases, assets]);

  // Inject Employee Names into schema fields for employee dropdown selection!
  const linkedConfig = useMemo(() => {
    if (!config) return config;
    const empOptions = (employees || []).map(e => `${e.first_name || ''} ${e.last_name || ''}`.trim()).filter(Boolean);
    if (empOptions.length === 0) return config;

    const updatedFields = (config.fields || []).map(f => {
      if (f.id === 'employee' || f.key === 'employee') {
        return {
          ...f,
          type: 'dropdown',
          options: empOptions
        };
      }
      return f;
    });

    return {
      ...config,
      fields: updatedFields
    };
  }, [config, employees]);

  const handleUpdateOffboardingCases = (newCases) => {
    setOffboardingCases(newCases);
    try {
      localStorage.setItem('omnilflow_fallback_offboarding_cases', JSON.stringify(newCases));
    } catch (e) {}
  };

  return (
    <LayoutEngine
      moduleConfig={linkedConfig || config}
      records={syncedOffboardingCases}
      setRecords={handleUpdateOffboardingCases}
      authUser={authUser}
      systemDropdowns={systemDropdowns}
      recycleBinItems={recycleBinItems}
      handleRestoreBinItem={handleRestoreBinItem}
      handlePermanentDeleteBinItem={handlePermanentDeleteBinItem}
      softDeleteRecord={softDeleteRecord}
      showToast={showToast}
      onOpenModuleConfig={onOpenModuleConfig}
      onManageStages={onManageStages}
      onOpenPositionModal={onOpenPositionModal}
    />
  );
}
