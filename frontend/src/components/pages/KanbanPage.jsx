import React from 'react';
import { useModuleRegistry } from '../../core/registry/useModuleRegistry';
import LayoutEngine from '../../core/engines/LayoutEngine/LayoutEngine';

export default function KanbanPage({
  authUser,
  contacts = [],
  setContacts = () => {},
  activeCurrency = 'INR',
  systemDropdowns = null,
  activePipelineStages = [],
  recycleBinItems = [],
  handleRestoreBinItem = () => {},
  handlePermanentDeleteBinItem = () => {},
  softDeleteRecord = () => {},
  showToast = () => {},
  openModuleConfigModal = null,
  onManageStages = () => {},
  onOpenChatWithLead = null
}) {
  const companyId = authUser?.companyId || 'default_tenant';
  const { config } = useModuleRegistry(companyId, 'crm_deals');

  const handleUpdateContacts = (newRecords) => {
    setContacts(newRecords);
    try {
      localStorage.setItem('omnilflow_fallback_contacts', JSON.stringify(newRecords));
    } catch (e) {}
  };

  return (
    <LayoutEngine
      moduleConfig={config}
      records={contacts}
      setRecords={handleUpdateContacts}
      authUser={authUser}
      activeCurrency={activeCurrency}
      systemDropdowns={systemDropdowns}
      activePipelineStages={activePipelineStages}
      recycleBinItems={recycleBinItems}
      handleRestoreBinItem={handleRestoreBinItem}
      handlePermanentDeleteBinItem={handlePermanentDeleteBinItem}
      softDeleteRecord={softDeleteRecord}
      showToast={showToast}
      onOpenModuleConfig={openModuleConfigModal}
      onManageStages={onManageStages}
      onOpenChatWithLead={onOpenChatWithLead}
    />
  );
}
