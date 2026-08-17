import React, { useMemo } from 'react';
import { useModuleRegistry } from '../../core/registry/useModuleRegistry';
import LayoutEngine from '../../core/engines/LayoutEngine/LayoutEngine';

export default function TelecallingView({
  authUser,
  callLogs = [],
  setCallLogs = () => {},
  systemDropdowns = null,
  activePipelineStages = [],
  recycleBinItems = [],
  handleRestoreBinItem = () => {},
  handlePermanentDeleteBinItem = () => {},
  softDeleteRecord = () => {},
  showToast = () => {},
  onOpenModuleConfig = null,
  onManageStages = () => {},
  onOpenPositionModal = () => {}
}) {
  const companyId = authUser?.companyId || 'default_tenant';
  const { config } = useModuleRegistry(companyId, 'telecalling');

  // Sample default call records formatted to match LayoutEngine standard
  const defaultRecords = useMemo(() => [], []);

  // Format callLogs to match standard fields if passed from parent
  const activeRecords = useMemo(() => {
    if (callLogs && callLogs.length > 0) {
      return callLogs.map((log, index) => ({
        id: log.id || `CALL-${String(index + 1).padStart(4, '0')}`,
        name: log.customerName || log.name || 'Customer',
        agentName: log.agentName || authUser?.name || 'Telecaller Agent',
        phone: log.customerPhone || log.phone || '',
        channel: log.channel || 'SIM',
        type: log.type || 'OUTGOING',
        duration: log.durationSeconds ? `${Math.floor(log.durationSeconds / 60)}m ${log.durationSeconds % 60}s` : (log.duration || '0s'),
        recording: log.recordingUrl || log.recording || '',
        status: log.disposition || log.status || 'Connected',
        notes: log.notes || ''
      }));
    }
    return defaultRecords;
  }, [callLogs, defaultRecords, authUser]);

  const handleUpdateRecords = (newRecords) => {
    setCallLogs(newRecords);
    try {
      localStorage.setItem('omniflow_callLogs', JSON.stringify(newRecords));
    } catch (e) {}
  };

  return (
    <LayoutEngine
      moduleConfig={config}
      records={activeRecords}
      setRecords={handleUpdateRecords}
      authUser={authUser}
      systemDropdowns={systemDropdowns}
      activePipelineStages={activePipelineStages}
      recycleBinItems={recycleBinItems}
      handleRestoreBinItem={handleRestoreBinItem}
      handlePermanentDeleteBinItem={handlePermanentDeleteBinItem}
      softDeleteRecord={softDeleteRecord}
      showToast={showToast}
      onOpenModuleConfig={onOpenModuleConfig}
      onManageStages={onManageStages}
      onOpenPositionModal={onOpenPositionModal}
    />
  );
}
