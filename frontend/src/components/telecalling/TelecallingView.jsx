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
  const defaultRecords = useMemo(() => [
    {
      id: 'CALL-0001',
      name: 'Priya Sharma',
      agentName: authUser?.name || 'Telecaller Agent',
      phone: '+91 98765 11223',
      channel: 'SIM',
      type: 'OUTGOING',
      duration: '2m 25s',
      recording: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      status: 'Interested',
      notes: 'Requested CRM product catalog & pricing.'
    },
    {
      id: 'CALL-0002',
      name: 'Amit Roy',
      agentName: 'Rahul Verma',
      phone: '+91 98123 44556',
      channel: 'WHATSAPP',
      type: 'INCOMING',
      duration: '3m 30s',
      recording: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
      status: 'Demo Scheduled',
      notes: 'Scheduled live product demo for tomorrow.'
    },
    {
      id: 'CALL-0003',
      name: 'Karan Malhotra',
      agentName: 'Neha Gupta',
      phone: '+91 97111 22334',
      channel: 'SIM',
      type: 'MISSED',
      duration: '0s',
      recording: '',
      status: 'Follow-up Required',
      notes: 'Missed call during lunch break.'
    }
  ], [authUser]);

  // Format callLogs to match standard fields if passed from parent
  const activeRecords = useMemo(() => {
    if (callLogs && callLogs.length > 0) {
      return callLogs.map((log, index) => ({
        id: log.id || `CALL-${String(index + 1).padStart(4, '0')}`,
        name: log.customerName || log.name || 'Priya Sharma',
        agentName: log.agentName || 'Telecaller Agent',
        phone: log.customerPhone || log.phone || '+91 98765 11223',
        channel: log.channel || 'SIM',
        type: log.type || 'OUTGOING',
        duration: log.durationSeconds ? `${Math.floor(log.durationSeconds / 60)}m ${log.durationSeconds % 60}s` : (log.duration || '0s'),
        recording: log.recordingUrl || log.recording || (log.type === 'MISSED' ? '' : 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'),
        status: log.disposition || log.status || 'Interested',
        notes: log.notes || ''
      }));
    }
    return defaultRecords;
  }, [callLogs, defaultRecords]);

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
