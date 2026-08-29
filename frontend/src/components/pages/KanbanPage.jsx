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

  // Normalize SQLite contacts into standardized CRM Deal records with guaranteed status & amount fields
  const normalizedDeals = React.useMemo(() => {
    return (contacts || []).map(c => {
      const cleanPhone = c.phone || c.phone_computed || (c.id ? String(c.id).replace(/@.*$/, '') : '');
      const stageVal = c.status || c.pipeline_stage || c.stage || 'lead';
      const amountVal = c.amount !== undefined ? c.amount : (c.deal_value || 0);

      return {
        ...c,
        id: c.id || (cleanPhone ? `${cleanPhone}@s.whatsapp.net` : `deal_${Date.now()}`),
        name: c.name || c.custom_name || c.displayName || `Deal ${cleanPhone || ''}`,
        deal: c.name || c.custom_name || c.displayName || `Deal ${cleanPhone || ''}`,
        contact: c.custom_name || c.contact || c.name || 'Contact',
        phone: cleanPhone,
        status: stageVal,
        stage: stageVal,
        pipeline_stage: stageVal,
        amount: amountVal,
        dealValue: amountVal,
        deal_value: amountVal,
        email: c.email || '',
        notes: c.notes || ''
      };
    });
  }, [contacts]);

  const handleUpdateContacts = (newRecords) => {
    setContacts(newRecords);
    try {
      localStorage.setItem('omnilflow_fallback_contacts', JSON.stringify(newRecords));
    } catch (e) {}
  };

  return (
    <LayoutEngine
      moduleConfig={config}
      records={normalizedDeals}
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
