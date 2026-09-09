import React, { useState, useEffect } from 'react';
import LayoutEngine from '../../core/engines/LayoutEngine/LayoutEngine';
import { useModuleRegistry } from '../../core/registry/useModuleRegistry';
import FirebaseCloudEngine from '../../core/engines/FirebaseCloudEngine';
import { isSandboxEnvironment, SupabaseSandboxService } from '../../core/services/supabaseSandboxService';

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
  const companyId = authUser?.companyId || authUser?.tenantId || authUser?.tenant_id || 'org_default';
  const { config } = useModuleRegistry(companyId, 'tasks');

  const [taskList, setTaskList] = useState(() => {
    if (Array.isArray(parentTasks) && parentTasks.length > 0) return parentTasks;
    return [];
  });

  useEffect(() => {
    fetchTaskList();
  }, [companyId]);

  const fetchTaskList = async () => {
    if (isSandboxEnvironment()) {
      try {
        const safeTenant = Number(companyId) || 1;
        const sbTasks = await SupabaseSandboxService.fetchTasks(safeTenant);
        if (Array.isArray(sbTasks) && sbTasks.length > 0) {
          setTaskList(sbTasks);
          if (parentSetTasks) parentSetTasks(sbTasks);
          return;
        }
      } catch (err) {
        console.warn('[TasksPage] Sandbox fetch notice:', err);
      }
    }

    let cloudList = [];
    try {
      cloudList = await FirebaseCloudEngine.fetchRecords('tasks', companyId);
      if (Array.isArray(cloudList) && cloudList.length > 0) {
        setTaskList(cloudList);
        if (parentSetTasks) parentSetTasks(cloudList);
        return;
      }
    } catch (e) {}

    try {
      const token = localStorage.getItem('omnilflow_token') || localStorage.getItem('token') || '';
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`${API_URL}/tasks`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setTaskList(data);
          if (parentSetTasks) parentSetTasks(data);
          return;
        }
      }
    } catch (err) {
      console.warn('Fetch tasks notice:', err);
    }

    setTaskList([]);
    if (parentSetTasks) parentSetTasks([]);
  };

  const handleUpdateTasks = (newTasks) => {
    setTaskList(newTasks);
    if (parentSetTasks) parentSetTasks(newTasks);
    if (Array.isArray(newTasks)) {
      newTasks.forEach(t => {
        if (t && t.id) {
          if (isSandboxEnvironment()) {
            const safeTenant = Number(companyId) || 1;
            SupabaseSandboxService.saveUniversalRecord('tasks', t, safeTenant, t.id).catch(console.warn);
          } else {
            FirebaseCloudEngine.saveRecord('tasks', t, companyId);
          }
        }
      });
    }
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
