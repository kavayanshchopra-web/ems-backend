import React, { useState, useEffect } from 'react';
import { useModuleRegistry } from '../../core/registry/useModuleRegistry';
import LayoutEngine from '../../core/engines/LayoutEngine/LayoutEngine';
import FirebaseCloudEngine from '../../core/engines/FirebaseCloudEngine';

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
  const companyId = authUser?.companyId || authUser?.tenantId || authUser?.tenant_id || 'org_default';
  const { config } = useModuleRegistry(companyId, 'crm_deals');
  const cacheKey = `omniflow_kanban_deals_${companyId}`;
  
  const [deals, setDeals] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const cached = sessionStorage.getItem(cacheKey) || localStorage.getItem(cacheKey);
        if (cached) return JSON.parse(cached);
      }
    } catch (e) {}
    return [];
  });
  const [loading, setLoading] = useState(false);

  // Load & subscribe to tenant-isolated CRM deals strictly from Firestore in real-time
  useEffect(() => {
    const unsubscribe = FirebaseCloudEngine.subscribeToCollection('crm_deals', companyId, (records) => {
      const list = Array.isArray(records) ? records : [];
      setDeals(list);
      setLoading(false);
      try {
        if (typeof window !== 'undefined' && list.length > 0) {
          sessionStorage.setItem(cacheKey, JSON.stringify(list));
        }
      } catch (e) {}
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [companyId, cacheKey]);

  const handleUpdateDeals = (newRecords) => {
    setDeals(newRecords);
    try {
      if (typeof window !== 'undefined' && Array.isArray(newRecords)) {
        sessionStorage.setItem(cacheKey, JSON.stringify(newRecords));
      }
    } catch (e) {}
  };

  return (
    <LayoutEngine
      moduleConfig={config}
      records={deals}
      setRecords={handleUpdateDeals}
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
