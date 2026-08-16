import React, { useState, useEffect } from 'react';
import LayoutEngine from '../../core/engines/LayoutEngine/LayoutEngine';
import { useModuleRegistry } from '../../core/registry/useModuleRegistry';
import FirebaseCloudEngine from '../../core/engines/FirebaseCloudEngine';

export default function TasksPage({
  API_URL,
  authUser,
  tasks: parentTasks = [],
  setTasks: parentSetTasks = null,
  showToast = () => {},
  softDeleteRecord = () => {},
  recycleBinItems = [],
  handleRestoreBinItem = () => {},
  handlePermanentDeleteBinItem = () => {},
  openModuleConfigModal = null,
  systemDropdowns = null
}) {
  const companyId = authUser?.companyId || authUser?.tenantId || 'default_tenant';
  const { config } = useModuleRegistry(companyId, 'tasks');

  const [taskList, setTaskList] = useState(() => {
    if (Array.isArray(parentTasks) && parentTasks.length > 0) return parentTasks;
    try {
      const saved = localStorage.getItem('omnilflow_fallback_tasks');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  useEffect(() => {
    fetchTaskList();
  }, []);

  const fetchTaskList = async () => {
    let cloudList = [];
    try {
      cloudList = await FirebaseCloudEngine.fetchRecords('tasks', companyId);
      if (!Array.isArray(cloudList)) cloudList = [];
    } catch (e) {}

    let serverList = [];
    try {
      const token = localStorage.getItem('omnilflow_token') || localStorage.getItem('token') || '';
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`${API_URL}/tasks`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) serverList = data;
      }
    } catch (err) {
      console.warn('Fetch tasks error:', err);
    }

    let localList = [];
    try {
      const saved = localStorage.getItem('omnilflow_fallback_tasks');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) localList = parsed;
      }
    } catch (e) {}

    const map = new Map();
    [...localList, ...cloudList, ...serverList, ...(Array.isArray(parentTasks) ? parentTasks : [])].forEach((t, idx) => {
      if (t) {
        const idKey = String(t.id || t._id || t.title || `task_${idx}`);
        map.set(idKey, {
          ...t,
          id: idKey,
          title: t.title || t.name || 'Task Item',
          status: t.status || 'To Do',
          priority: t.priority || 'Medium'
        });
      }
    });

    const merged = Array.from(map.values());
    setTaskList(merged);
    if (parentSetTasks) parentSetTasks(merged);
    try { localStorage.setItem('omnilflow_fallback_tasks', JSON.stringify(merged)); } catch (e) {}
  };

  const handleUpdateTasks = (newTasks) => {
    setTaskList(newTasks);
    if (parentSetTasks) parentSetTasks(newTasks);
    try {
      localStorage.setItem('omnilflow_fallback_tasks', JSON.stringify(newTasks));
      if (Array.isArray(newTasks)) {
        newTasks.forEach(t => {
          if (t && t.id) {
            FirebaseCloudEngine.saveRecord('tasks', t, companyId);
          }
        });
      }
    } catch (e) {}
  };

  return (
    <LayoutEngine
      moduleConfig={config}
      records={taskList}
      setRecords={handleUpdateTasks}
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
