import React, { useState, useEffect } from 'react';
import { useModuleRegistry } from '../../core/registry/useModuleRegistry';
import LayoutEngine from '../../core/engines/LayoutEngine/LayoutEngine';
import FirebaseCloudEngine from '../../core/engines/FirebaseCloudEngine';

import { isGhostCrmDeal, sanitizeCrmDeals } from '../../core/utils/dealSanitizer';

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
        if (cached) {
          const parsed = JSON.parse(cached);
          return sanitizeCrmDeals(parsed);
        }
      }
    } catch (e) {}
    return [];
  });
  const [loading, setLoading] = useState(false);

  // Load & subscribe to tenant-isolated CRM deals strictly from Firestore in real-time
  useEffect(() => {
    const unsubscribe = FirebaseCloudEngine.subscribeToCollection('crm_deals', companyId, (records) => {
      const list = Array.isArray(records) ? records : [];
      const validList = list.filter(r => !isGhostCrmDeal(r));
      const ghostList = list.filter(isGhostCrmDeal);

      // Clean up ghost records in background from Firestore
      if (ghostList.length > 0) {
        ghostList.forEach(ghost => {
          if (ghost && ghost.id) {
            FirebaseCloudEngine.deleteRecord('crm_deals', ghost.id, companyId).catch(() => {});
          }
        });
      }

      setDeals(validList);
      setLoading(false);
      try {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(cacheKey, JSON.stringify(validList));
          localStorage.setItem(cacheKey, JSON.stringify(validList));
        }
      } catch (e) {}
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [companyId, cacheKey]);

  const handleUpdateDeals = (newRecords) => {
    const valid = sanitizeCrmDeals(newRecords);
    setDeals(valid);
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(cacheKey, JSON.stringify(valid));
        localStorage.setItem(cacheKey, JSON.stringify(valid));
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
