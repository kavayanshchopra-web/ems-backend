import React, { useState, useEffect } from 'react';
import LayoutEngine from '../../core/engines/LayoutEngine/LayoutEngine';
import { useModuleRegistry } from '../../core/registry/useModuleRegistry';
import FirebaseCloudEngine from '../../core/engines/FirebaseCloudEngine';
import { isSandboxEnvironment, SupabaseSandboxService } from '../../core/services/supabaseSandboxService';

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
  const companyId = authUser?.companyId || authUser?.tenantId || authUser?.tenant_id || 'org_default';
  const { config } = useModuleRegistry(companyId, 'holidays');
  const [holidays, setHolidays] = useState([]);

  useEffect(() => {
    fetchHolidays();
  }, [companyId]);

  const fetchHolidays = async () => {
    if (isSandboxEnvironment()) {
      try {
        const safeTenant = Number(companyId) || 1;
        const sbHolidays = await SupabaseSandboxService.fetchHolidays(safeTenant);
        if (Array.isArray(sbHolidays) && sbHolidays.length > 0) {
          setHolidays(sbHolidays);
          return;
        }
      } catch (err) {
        console.warn('[HolidaysPage] Sandbox fetch notice:', err);
      }
    }

    let cloudList = [];
    try {
      cloudList = await FirebaseCloudEngine.fetchRecords('holidays', companyId);
      if (Array.isArray(cloudList) && cloudList.length > 0) {
        setHolidays(cloudList);
        return;
      }
    } catch (e) {}

    try {
      const token = localStorage.getItem('omnilflow_token') || localStorage.getItem('token') || '';
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`${API_URL}/holidays`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setHolidays(data);
          return;
        }
      }
    } catch (err) {
      console.warn('Fetch holidays notice:', err);
    }
    setHolidays([]);
  };

  const handleUpdateHolidays = (newHolidays) => {
    setHolidays(newHolidays);
    if (Array.isArray(newHolidays)) {
      newHolidays.forEach(h => {
        if (h && h.id) {
          if (isSandboxEnvironment()) {
            const safeTenant = Number(companyId) || 1;
            SupabaseSandboxService.saveUniversalRecord('holidays', h, safeTenant, h.id).catch(console.warn);
          } else {
            FirebaseCloudEngine.saveRecord('holidays', h, companyId);
          }
        }
      });
    }
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
