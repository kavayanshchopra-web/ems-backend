import React, { useState, useEffect } from 'react';
import LayoutEngine from '../../core/engines/LayoutEngine/LayoutEngine';
import { useModuleRegistry } from '../../core/registry/useModuleRegistry';

export default function HolidaysPage({
  API_URL,
  authUser,
  showToast = () => {},
  softDeleteRecord = () => {},
  recycleBinItems = [],
  handleRestoreBinItem = () => {},
  handlePermanentDeleteBinItem = () => {},
  openModuleConfigModal = null,
  systemDropdowns = null
}) {
  const companyId = authUser?.companyId || authUser?.tenantId || 'default_tenant';
  const { config } = useModuleRegistry(companyId, 'holidays');
  const [holidays, setHolidays] = useState(() => {
    try {
      const saved = localStorage.getItem('omnilflow_fallback_holidays');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    let serverList = [];
    try {
      const token = localStorage.getItem('omnilflow_token') || localStorage.getItem('token') || '';
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`${API_URL}/holidays`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) serverList = data;
      }
    } catch (err) {
      console.warn('Fetch holidays error:', err);
    }

    let localList = [];
    try {
      const saved = localStorage.getItem('omnilflow_fallback_holidays');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) localList = parsed;
      }
    } catch (e) {}

    const map = new Map();
    localList.forEach(h => { if (h && h.id) map.set(String(h.id), h); });
    serverList.forEach(h => { if (h && h.id) map.set(String(h.id), h); });

    const merged = Array.from(map.values());
    setHolidays(merged);
    try { localStorage.setItem('omnilflow_fallback_holidays', JSON.stringify(merged)); } catch (e) {}
  };

  const handleUpdateHolidays = (newHolidays) => {
    setHolidays(newHolidays);
    try {
      localStorage.setItem('omnilflow_fallback_holidays', JSON.stringify(newHolidays));
    } catch (e) {}
  };

  return (
    <LayoutEngine
      moduleConfig={config}
      records={holidays}
      setRecords={handleUpdateHolidays}
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
