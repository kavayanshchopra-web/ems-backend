import React, { useState, useEffect } from 'react';
import LayoutEngine from '../../core/engines/LayoutEngine/LayoutEngine';
import { useModuleRegistry } from '../../core/registry/useModuleRegistry';
import FirebaseCloudEngine from '../../core/engines/FirebaseCloudEngine';

export default function NoticeBoardPage({
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
  const { config } = useModuleRegistry(companyId, 'notice_board');
  const [notices, setNotices] = useState([]);

  useEffect(() => {
    fetchNotices();
  }, [companyId]);

  const fetchNotices = async () => {
    let cloudList = [];
    try {
      cloudList = await FirebaseCloudEngine.fetchRecords('notice_board', companyId);
      if (Array.isArray(cloudList)) {
        setNotices(cloudList);
        return;
      }
    } catch (e) {}

    try {
      const token = localStorage.getItem('omnilflow_token') || localStorage.getItem('token') || '';
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`${API_URL}/notices`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setNotices(data);
          return;
        }
      }
    } catch (err) {
      console.warn('Fetch notices notice:', err);
    }
    setNotices([]);
  };

  const handleUpdateNotices = (newNotices) => {
    setNotices(newNotices);
    if (Array.isArray(newNotices)) {
      newNotices.forEach(n => {
        if (n && n.id) {
          FirebaseCloudEngine.saveRecord('notice_board', n, companyId);
        }
      });
    }
  };

  return (
    <LayoutEngine
      moduleConfig={config}
      records={notices}
      setRecords={handleUpdateNotices}
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
