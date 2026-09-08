import React from 'react';
import LayoutEngine from '../../core/engines/LayoutEngine/LayoutEngine';
import { useModuleRegistry } from '../../core/registry/useModuleRegistry';
import TenantStorage from '../../core/services/TenantStorage';

export default function AssetManagementPage({
  companyId,
  assets,
  setAssets,
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
  const { config } = useModuleRegistry(activeTenant, 'asset_management');

  const handleUpdateAssets = (newAssets) => {
    setAssets(newAssets);
    try {
      TenantStorage.setItem('assets', newAssets, activeTenant);
    } catch (e) {}
  };

  return (
    <LayoutEngine
      moduleConfig={config}
      records={assets}
      setRecords={handleUpdateAssets}
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
