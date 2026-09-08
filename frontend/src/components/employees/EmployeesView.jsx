import React from 'react';
import { useModuleRegistry } from '../../core/registry/useModuleRegistry';
import LayoutEngine from '../../core/engines/LayoutEngine/LayoutEngine';

import TenantStorage from '../../core/services/TenantStorage';

export default function EmployeesView({
  authUser,
  employees = [],
  setEmployees = () => {},
  systemDropdowns = null,
  activePipelineStages = [],
  recycleBinItems = [],
  handleRestoreBinItem = () => {},
  handlePermanentDeleteBinItem = () => {},
  softDeleteRecord = () => {},
  showToast = () => {},
  onOpenModuleConfig = null,
  onManageStages = () => {},
  onOpenPositionModal = () => {}
}) {
  const companyId = authUser?.tenantId || authUser?.companyId || authUser?.tenant_id || 'org_unassigned';
  const { config } = useModuleRegistry(companyId, 'employees');

  const handleUpdateEmployees = (newRecords) => {
    setEmployees(newRecords);
    try {
      TenantStorage.setItem('employees', newRecords, companyId);
    } catch (e) {}
  };

  return (
    <LayoutEngine
      moduleConfig={config}
      records={employees}
      setRecords={handleUpdateEmployees}
      authUser={authUser}
      systemDropdowns={systemDropdowns}
      activePipelineStages={activePipelineStages}
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
