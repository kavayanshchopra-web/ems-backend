import React from 'react';
import { useModuleRegistry } from '../../core/registry/useModuleRegistry';
import LayoutEngine from '../../core/engines/LayoutEngine/LayoutEngine';

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
  const companyId = authUser?.companyId || 'default_tenant';
  const { config } = useModuleRegistry(companyId, 'employees');

  const handleUpdateEmployees = (newRecords) => {
    setEmployees(newRecords);
    try {
      localStorage.setItem('omnilflow_fallback_employees', JSON.stringify(newRecords));
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
