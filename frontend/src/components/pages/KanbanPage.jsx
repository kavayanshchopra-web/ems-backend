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
  const companyId = authUser?.companyId || authUser?.tenantId || 'default_tenant';
  const { config } = useModuleRegistry(companyId, 'crm_deals');
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load tenant-isolated CRM deals strictly from Firestore
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    FirebaseCloudEngine.fetchRecords('crm_deals', companyId)
      .then(records => {
        if (isMounted) {
          setDeals(Array.isArray(records) ? records : []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setDeals([]);
          setLoading(false);
        }
      });
    return () => { isMounted = false; };
  }, [companyId]);

  const handleUpdateDeals = (newRecords) => {
    setDeals(newRecords);
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
