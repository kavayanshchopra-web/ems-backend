import React, { useMemo } from 'react';
import LayoutEngine from '../../core/engines/LayoutEngine/LayoutEngine';
import { useModuleRegistry } from '../../core/registry/useModuleRegistry';

export default function VerifyDocsPage({
  companyId,
  kycDocuments,
  setKycDocuments,
  employees = [],
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
  const { config } = useModuleRegistry(companyId || 'default_tenant', 'verify_documents');

  // Inject Employee Names into schema fields for employee dropdown selection
  const linkedConfig = useMemo(() => {
    if (!config) return config;
    const empOptions = (employees || []).map(e => `${e.first_name || ''} ${e.last_name || ''}`.trim()).filter(Boolean);
    if (empOptions.length === 0) return config;

    const updatedFields = (config.fields || []).map(f => {
      if (f.id === 'name' || f.key === 'name' || f.id === 'employee') {
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

  const handleUpdateKycDocuments = (newDocs) => {
    setKycDocuments(newDocs);
    try {
      localStorage.setItem('omnilflow_fallback_kyc_documents', JSON.stringify(newDocs));
    } catch (e) {}
  };

  return (
    <LayoutEngine
      moduleConfig={linkedConfig || config}
      records={kycDocuments}
      setRecords={handleUpdateKycDocuments}
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
