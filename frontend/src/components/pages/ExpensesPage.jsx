import React, { useState, useEffect } from 'react';
import LayoutEngine from '../../core/engines/LayoutEngine/LayoutEngine';
import { useModuleRegistry } from '../../core/registry/useModuleRegistry';
import FirebaseCloudEngine from '../../core/engines/FirebaseCloudEngine';

export default function ExpensesPage({
  API_URL,
  authUser,
  expenses: parentExpenses = [],
  setExpenses: parentSetExpenses = null,
  showToast = () => {},
  softDeleteRecord = () => {},
  recycleBinItems = [],
  handleRestoreBinItem = () => {},
  handlePermanentDeleteBinItem = () => {},
  openModuleConfigModal = null,
  systemDropdowns = null
}) {
  const companyId = authUser?.companyId || authUser?.tenantId || authUser?.tenant_id || 'org_default';
  const { config } = useModuleRegistry(companyId, 'expenses');

  const [expenseList, setExpenseList] = useState(() => {
    if (Array.isArray(parentExpenses) && parentExpenses.length > 0) return parentExpenses;
    return [];
  });

  useEffect(() => {
    fetchExpenseList();
  }, [companyId]);

  const fetchExpenseList = async () => {
    let cloudList = [];
    try {
      cloudList = await FirebaseCloudEngine.fetchRecords('expenses', companyId);
      if (Array.isArray(cloudList)) {
        setExpenseList(cloudList);
        if (parentSetExpenses) parentSetExpenses(cloudList);
        return;
      }
    } catch (e) {}

    try {
      const token = localStorage.getItem('omnilflow_token') || localStorage.getItem('token') || '';
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`${API_URL}/expenses`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setExpenseList(data);
          if (parentSetExpenses) parentSetExpenses(data);
          return;
        }
      }
    } catch (err) {
      console.warn('Fetch expenses notice:', err);
    }

    setExpenseList([]);
    if (parentSetExpenses) parentSetExpenses([]);
  };

  const handleUpdateExpenses = (newExpenses) => {
    setExpenseList(newExpenses);
    if (parentSetExpenses) parentSetExpenses(newExpenses);
    if (Array.isArray(newExpenses)) {
      newExpenses.forEach(exp => {
        if (exp && exp.id) {
          FirebaseCloudEngine.saveRecord('expenses', exp, companyId);
        }
      });
    }
  };

  return (
    <LayoutEngine
      moduleConfig={config}
      records={expenseList}
      setRecords={handleUpdateExpenses}
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
