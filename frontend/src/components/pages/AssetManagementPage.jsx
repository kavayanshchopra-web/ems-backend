import React from 'react';
import LayoutEngine from '../../core/engines/LayoutEngine/LayoutEngine';
import { useModuleRegistry } from '../../core/registry/useModuleRegistry';

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
  const { config } = useModuleRegistry(companyId || 'default_tenant', 'asset_management');

  const handleUpdateAssets = (newAssets) => {
    setAssets(newAssets);
    try {
      localStorage.setItem('omnilflow_fallback_assets', JSON.stringify(newAssets));
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
