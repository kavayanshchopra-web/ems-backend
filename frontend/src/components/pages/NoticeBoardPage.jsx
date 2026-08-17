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
  const companyId = authUser?.companyId || authUser?.tenantId || 'default_tenant';
  const { config } = useModuleRegistry(companyId, 'notice_board');
  const [notices, setNotices] = useState(() => {
    try {
      const saved = localStorage.getItem('omnilflow_fallback_notices');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    let cloudList = [];
    try {
      cloudList = await FirebaseCloudEngine.fetchRecords('notice_board', companyId);
      if (!Array.isArray(cloudList)) cloudList = [];
    } catch (e) {}

    let serverList = [];
    try {
      const token = localStorage.getItem('omnilflow_token') || localStorage.getItem('token') || '';
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`${API_URL}/notices`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) serverList = data;
      }
    } catch (err) {
      console.warn('Fetch notices error:', err);
    }

    let localList = [];
    try {
      const saved = localStorage.getItem('omnilflow_fallback_notices');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) localList = parsed;
      }
    } catch (e) {}

    const map = new Map();
    [...localList, ...cloudList, ...serverList].forEach((n, idx) => {
      if (n) {
        const idKey = String(n.id || n._id || n.title || `notice_${idx}`);
        map.set(idKey, { ...n, id: idKey, title: n.title || n.name || 'Notice' });
      }
    });

    const merged = Array.from(map.values());
    setNotices(merged);
    try { localStorage.setItem('omnilflow_fallback_notices', JSON.stringify(merged)); } catch (e) {}
  };

  const handleUpdateNotices = (newNotices) => {
    setNotices(newNotices);
    try {
      localStorage.setItem('omnilflow_fallback_notices', JSON.stringify(newNotices));
      if (Array.isArray(newNotices)) {
        newNotices.forEach(n => {
          if (n && n.id) {
            FirebaseCloudEngine.saveRecord('notice_board', n, companyId);
          }
        });
      }
    } catch (e) {}
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
