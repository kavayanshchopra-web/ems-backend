import React, { useMemo, useState } from 'react';
import { useModuleRegistry } from '../../core/registry/useModuleRegistry';
import LayoutEngine from '../../core/engines/LayoutEngine/LayoutEngine';
import FirebaseCloudEngine from '../../core/engines/FirebaseCloudEngine';
import VoxbayCloudDialerModal from './VoxbayCloudDialerModal';
import { PhoneCall } from 'lucide-react';

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
  const companyId = authUser?.companyId || authUser?.tenantId || authUser?.tenant_id || 'org_default';
  const { config } = useModuleRegistry(companyId, 'telecalling');
  
  const [isVoxbayOpen, setIsVoxbayOpen] = useState(false);

  // Format callLogs to match standard fields if passed from parent
  const activeRecords = useMemo(() => {
    if (Array.isArray(callLogs) && callLogs.length > 0) {
      return callLogs.map((log, index) => ({
        id: log.id || `CALL-${String(index + 1).padStart(4, '0')}`,
        name: log.customerName || log.contactName || log.name || 'Customer',
        agentName: log.agentName || authUser?.name || 'Telecaller Agent',
        phone: log.customerPhone || log.phoneNumber || log.phone || '—',
        channel: log.channel || 'VOXBAY',
        type: log.type || 'OUTGOING',
        duration: typeof log.duration === 'string' ? log.duration : (log.durationSeconds ? `${Math.floor(log.durationSeconds / 60)}m ${log.durationSeconds % 60}s` : '00:30'),
        recording: log.recordingUrl || log.recording || log.audioUrl || '',
        status: log.disposition || log.status || 'Interested',
        notes: log.notes || 'Voxbay Live Call'
      }));
    }
    return [];
  }, [callLogs, authUser]);

  const handleUpdateRecords = (newRecords) => {
    setCallLogs(newRecords);
    if (Array.isArray(newRecords)) {
      newRecords.forEach(rec => {
        if (rec && rec.id) {
          FirebaseCloudEngine.saveRecord('call_logs', rec, companyId);
        }
      });
    }
  };

  const handleCallLogged = (newCall) => {
    const updated = [
      {
        id: `CALL-${String(activeRecords.length + 1).padStart(4, '0')}`,
        name: newCall.contactName || newCall.customerName || newCall.name || 'Customer',
        agentName: authUser?.name || 'Staff 1',
        phone: newCall.phoneNumber || newCall.customerPhone || newCall.phone || '—',
        channel: newCall.channel || 'VOXBAY',
        type: newCall.type || 'OUTGOING',
        duration: typeof newCall.duration === 'string' ? newCall.duration : '00:30',
        recording: newCall.recording || newCall.recordingUrl || '',
        status: newCall.status || 'Interested',
        notes: newCall.notes || 'Voxbay Cloud Call'
      },
      ...activeRecords
    ];
    handleUpdateRecords(updated);
    if (showToast) showToast('📞 Call logged and recording synced successfully!', 'success');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Main Standard LayoutEngine Table */}
      <div style={{ flex: 1 }}>
        <LayoutEngine
          customHeaderActions={
            <button
              type="button"
              onClick={() => setIsVoxbayOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                padding: '7px 14px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
                border: '1px solid #0d9488',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(13, 148, 136, 0.25)',
                transition: 'all 0.2s ease'
              }}
            >
              <PhoneCall size={14} />
              <span>Dial via Voxbay Cloud</span>
            </button>
          }
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
      </div>

      {/* Voxbay Cloud Click-To-Call Modal */}
      {isVoxbayOpen && (
        <VoxbayCloudDialerModal
          isOpen={isVoxbayOpen}
          onClose={() => setIsVoxbayOpen(false)}
          onCallLogged={handleCallLogged}
          showToast={showToast}
          authUser={authUser}
        />
      )}
    </div>
  );
}
