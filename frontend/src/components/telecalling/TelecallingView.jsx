import React, { useMemo, useState } from 'react';
import { useModuleRegistry } from '../../core/registry/useModuleRegistry';
import LayoutEngine from '../../core/engines/LayoutEngine/LayoutEngine';
import SimBridgeSoftphone from './SimBridgeSoftphone';
import { Smartphone, PhoneCall, QrCode, Wifi, CheckCircle2 } from 'lucide-react';

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
  const [isDialerOpen, setIsDialerOpen] = useState(false);

  // Sample default call records formatted to match LayoutEngine standard
  const defaultRecords = useMemo(() => [
    {
      id: 'CALL-0001',
      name: 'Rohan Sharma (Tech Solutions)',
      agentName: authUser?.name || 'Staff 1',
      phone: '+91 98765 43210',
      channel: 'SIM',
      type: 'OUTGOING',
      duration: '3m 15s',
      recording: '/media/recordings/sample_call_1.mp3',
      status: 'Interested',
      notes: 'Customer interested in 50 user annual plan. Follow-up tomorrow.'
    },
    {
      id: 'CALL-0002',
      name: 'Ananya Deshmukh',
      agentName: authUser?.name || 'Staff 1',
      phone: '+91 98112 34567',
      channel: 'SIM',
      type: 'OUTGOING',
      duration: '1m 40s',
      recording: '/media/recordings/sample_call_2.mp3',
      status: 'Demo Scheduled',
      notes: 'Demo booked for Thursday 4 PM.'
    }
  ], [authUser]);

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

  const handleCallLogged = (newCall) => {
    const updated = [
      {
        id: `CALL-${String(activeRecords.length + 1).padStart(4, '0')}`,
        name: newCall.name || 'Customer',
        agentName: authUser?.name || 'Staff 1',
        phone: newCall.phone,
        channel: 'SIM',
        type: 'OUTGOING',
        duration: newCall.duration || '1m 15s',
        recording: newCall.recording || '',
        status: newCall.status || 'Interested',
        notes: newCall.notes || 'SIM Bridge Call'
      },
      ...activeRecords
    ];
    handleUpdateRecords(updated);
    if (showToast) showToast('📞 Call logged and recording synced successfully!');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Top SIM Bridge Quick Status Banner */}
      <div style={{
        margin: '12px 16px 0 16px',
        padding: '10px 16px',
        background: 'linear-gradient(90deg, rgba(6, 78, 67, 0.4) 0%, rgba(15, 23, 42, 0.6) 100%)',
        border: '1px solid rgba(20, 210, 203, 0.25)',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'rgba(16, 185, 129, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#10b981'
          }}>
            <Smartphone size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }}></span>
              <span style={{ fontSize: '12.5px', fontWeight: '800', color: '#ffffff' }}>
                OmniFlow SIM Bridge Active
              </span>
              <span style={{ fontSize: '11px', color: '#34d399', fontWeight: '700', background: 'rgba(16, 185, 129, 0.12)', padding: '1px 6px', borderRadius: '4px' }}>
                Jio 4G / Airtel SIM
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '1px' }}>
              <Wifi size={11} style={{ color: '#14d2cb' }} />
              <span>Laptop Mic WiFi Relay Active &bull; Zero Telecom Per-Minute Cost</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setIsDialerOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #10b981 0%, #0d9488 100%)',
              border: 'none',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: '800',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
            }}
          >
            <PhoneCall size={14} />
            <span>📞 Dial via SIM Bridge</span>
          </button>
        </div>
      </div>

      {/* Main Standard LayoutEngine Table */}
      <div style={{ flex: 1 }}>
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
      </div>

      {/* Softphone Dialer Modal */}
      {isDialerOpen && (
        <SimBridgeSoftphone
          isOpen={isDialerOpen}
          onClose={() => setIsDialerOpen(false)}
          currentStaff={{ id: authUser?.id || 'staff_1', name: authUser?.name || 'Staff 1' }}
          onCallLogged={handleCallLogged}
        />
      )}
    </div>
  );
}
