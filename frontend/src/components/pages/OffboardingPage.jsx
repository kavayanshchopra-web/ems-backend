import React, { useMemo } from 'react';
import LayoutEngine from '../../core/engines/LayoutEngine/LayoutEngine';
import { useModuleRegistry } from '../../core/registry/useModuleRegistry';
import TenantStorage from '../../core/services/TenantStorage';

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
  const activeTenant = authUser?.tenantId || authUser?.companyId || companyId || 'org_unassigned';
  const { config } = useModuleRegistry(activeTenant, 'offboarding');

  // Cross-Module Dynamic Linkage: Auto-compute IT Asset Clearance from live assets directory!
  const syncedOffboardingCases = useMemo(() => {
    return (offboardingCases || []).map(c => {
      // Find all assets assigned to this employee
      const assignedAssets = (assets || []).filter(a =>
        a.assigned_to && (
          String(a.assigned_to).toLowerCase() === String(c.employee_name).toLowerCase() ||
          String(a.assigned_to).toLowerCase() === String(c.employee_id).toLowerCase() ||
          String(a.assigned_to_id) === String(c.employee_id)
        )
      );

      const hasPendingAssets = assignedAssets.some(a =>
        String(a.status || '').toLowerCase() === 'assigned' ||
        String(a.status || '').toLowerCase() === 'in use'
      );

      return {
        ...c,
        assets_reclaimed: assignedAssets.length > 0 && !hasPendingAssets ? 'YES' : (assignedAssets.length > 0 ? 'NO' : 'N/A'),
        _assignedAssetsCount: assignedAssets.length
      };
    });
  }, [offboardingCases, assets]);

  // Inject dynamic active employee list into employee_name dropdown
  const linkedConfig = useMemo(() => {
    if (!config || !config.fields) return config;
    const updatedFields = config.fields.map(f => {
      if (f.name === 'employee_name' && employees.length > 0) {
        return {
          ...f,
          type: 'select',
          options: employees.map(emp => emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.email || `EMP #${emp.id}`)
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
      TenantStorage.setItem('offboarding_cases', newCases, activeTenant);
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
