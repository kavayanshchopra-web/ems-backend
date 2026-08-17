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
  const companyId = authUser?.companyId || authUser?.tenantId || 'default_tenant';
  const { config } = useModuleRegistry(companyId, 'advances_loans');

  const [loanList, setLoanList] = useState(() => {
    if (Array.isArray(parentLoans) && parentLoans.length > 0) return parentLoans;
    try {
      const saved = localStorage.getItem('omnilflow_fallback_advances_loans');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  useEffect(() => {
    fetchLoanList();
  }, []);

  const fetchLoanList = async () => {
    let cloudList = [];
    try {
      cloudList = await FirebaseCloudEngine.fetchRecords('advances_loans', companyId);
      if (!Array.isArray(cloudList)) cloudList = [];
    } catch (e) {}

    let serverList = [];
    try {
      const token = localStorage.getItem('omnilflow_token') || localStorage.getItem('token') || '';
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`${API_URL}/advances-loans`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) serverList = data;
      }
    } catch (err) {
      console.warn('Fetch advances loans error:', err);
    }

    let localList = [];
    try {
      const saved = localStorage.getItem('omnilflow_fallback_advances_loans');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) localList = parsed;
      }
    } catch (e) {}

    const map = new Map();
    [...localList, ...cloudList, ...serverList, ...(Array.isArray(parentLoans) ? parentLoans : [])].forEach((item, idx) => {
      if (item) {
        const idKey = String(item.id || item._id || item.title || `loan_${idx}`);
        map.set(idKey, {
          ...item,
          id: idKey,
          title: item.title || item.purpose || 'Salary Advance Request',
          employee: item.employee || item.employeeName || authUser?.name || 'Employee',
          requestType: item.requestType || 'Salary Advance',
          status: item.status || 'Requested',
          amount: item.amount || 0
        });
      }
    });

    const merged = Array.from(map.values());
    setLoanList(merged);
    if (parentSetLoans) parentSetLoans(merged);
    try { localStorage.setItem('omnilflow_fallback_advances_loans', JSON.stringify(merged)); } catch (e) {}
  };

  const handleUpdateLoans = (newLoans) => {
    setLoanList(newLoans);
    if (parentSetLoans) parentSetLoans(newLoans);
    try {
      localStorage.setItem('omnilflow_fallback_advances_loans', JSON.stringify(newLoans));
      if (Array.isArray(newLoans)) {
        newLoans.forEach(item => {
          if (item && item.id) {
            FirebaseCloudEngine.saveRecord('advances_loans', item, companyId);
          }
        });
      }
    } catch (e) {}
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
