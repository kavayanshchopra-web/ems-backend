import React, { useState, useEffect } from 'react';
import LayoutEngine from '../../core/engines/LayoutEngine/LayoutEngine';
import { useModuleRegistry } from '../../core/registry/useModuleRegistry';
import FirebaseCloudEngine from '../../core/engines/FirebaseCloudEngine';

export default function AdvancesLoansPage({
  API_URL,
  authUser,
  advancesLoans: parentLoans = [],
  setAdvancesLoans: parentSetLoans = null,
  showToast = () => {},
  softDeleteRecord = () => {},
  recycleBinItems = [],
  handleRestoreBinItem = () => {},
  handlePermanentDeleteBinItem = () => {},
  openModuleConfigModal = null,
  systemDropdowns = null
}) {
  const companyId = authUser?.companyId || authUser?.tenantId || authUser?.tenant_id || 'org_default';
  const { config } = useModuleRegistry(companyId, 'advances_loans');

  const [loanList, setLoanList] = useState(() => {
    if (Array.isArray(parentLoans) && parentLoans.length > 0) return parentLoans;
    return [];
  });

  useEffect(() => {
    fetchLoanList();
  }, [companyId]);

  const fetchLoanList = async () => {
    let cloudList = [];
    try {
      cloudList = await FirebaseCloudEngine.fetchRecords('advances_loans', companyId);
      if (Array.isArray(cloudList)) {
        setLoanList(cloudList);
        if (parentSetLoans) parentSetLoans(cloudList);
        return;
      }
    } catch (e) {}

    try {
      const token = localStorage.getItem('omnilflow_token') || localStorage.getItem('token') || '';
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`${API_URL}/advances-loans`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setLoanList(data);
          if (parentSetLoans) parentSetLoans(data);
          return;
        }
      }
    } catch (err) {
      console.warn('Fetch advances loans notice:', err);
    }

    setLoanList([]);
    if (parentSetLoans) parentSetLoans([]);
  };

  const handleUpdateLoans = (newLoans) => {
    setLoanList(newLoans);
    if (parentSetLoans) parentSetLoans(newLoans);
    if (Array.isArray(newLoans)) {
      newLoans.forEach(item => {
        if (item && item.id) {
          FirebaseCloudEngine.saveRecord('advances_loans', item, companyId);
        }
      });
    }
  };

  return (
    <LayoutEngine
      moduleConfig={config}
      records={loanList}
      setRecords={handleUpdateLoans}
      authUser={authUser}
      systemDropdowns={systemDropdowns}
      recycleBinItems={recycleBinItems}
      handleRestoreBinItem={handleRestoreBinItem}
      handlePermanentDeleteBinItem={handlePermanentDeleteBinItem}
      softDeleteRecord={softDeleteRecord}
      showToast={showToast}
      onOpenModuleConfig={openModuleConfigModal}
    />
  );
}
