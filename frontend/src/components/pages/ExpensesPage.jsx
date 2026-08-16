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
  const companyId = authUser?.companyId || authUser?.tenantId || 'default_tenant';
  const { config } = useModuleRegistry(companyId, 'expenses');

  const [expenseList, setExpenseList] = useState(() => {
    if (Array.isArray(parentExpenses) && parentExpenses.length > 0) return parentExpenses;
    try {
      const saved = localStorage.getItem('omnilflow_fallback_expenses');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  useEffect(() => {
    fetchExpenseList();
  }, []);

  const fetchExpenseList = async () => {
    let cloudList = [];
    try {
      cloudList = await FirebaseCloudEngine.fetchRecords('expenses', companyId);
      if (!Array.isArray(cloudList)) cloudList = [];
    } catch (e) {}

    let serverList = [];
    try {
      const token = localStorage.getItem('omnilflow_token') || localStorage.getItem('token') || '';
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`${API_URL}/expenses`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) serverList = data;
      }
    } catch (err) {
      console.warn('Fetch expenses error:', err);
    }

    let localList = [];
    try {
      const saved = localStorage.getItem('omnilflow_fallback_expenses');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) localList = parsed;
      }
    } catch (e) {}

    const map = new Map();
    [...localList, ...cloudList, ...serverList, ...(Array.isArray(parentExpenses) ? parentExpenses : [])].forEach((eItem, idx) => {
      if (eItem) {
        const idKey = String(eItem.id || eItem._id || eItem.title || `exp_${idx}`);
        map.set(idKey, {
          ...eItem,
          id: idKey,
          title: eItem.title || eItem.name || 'Expense Voucher',
          employee: eItem.employee || eItem.employeeName || authUser?.name || 'Employee',
          status: eItem.status || 'Submitted',
          amount: eItem.amount || 0
        });
      }
    });

    const merged = Array.from(map.values());
    setExpenseList(merged);
    if (parentSetExpenses) parentSetExpenses(merged);
    try { localStorage.setItem('omnilflow_fallback_expenses', JSON.stringify(merged)); } catch (e) {}
  };

  const handleUpdateExpenses = (newExpenses) => {
    setExpenseList(newExpenses);
    if (parentSetExpenses) parentSetExpenses(newExpenses);
    try {
      localStorage.setItem('omnilflow_fallback_expenses', JSON.stringify(newExpenses));
      if (Array.isArray(newExpenses)) {
        newExpenses.forEach(exp => {
          if (exp && exp.id) {
            FirebaseCloudEngine.saveRecord('expenses', exp, companyId);
          }
        });
      }
    } catch (e) {}
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
