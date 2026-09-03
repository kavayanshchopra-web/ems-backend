import React, { useEffect, useMemo, useState } from 'react';
import { useModuleRegistry } from '../../core/registry/useModuleRegistry';
import LayoutEngine from '../../core/engines/LayoutEngine/LayoutEngine';
import FirebaseCloudEngine from '../../core/engines/FirebaseCloudEngine';
import VoxbayCloudDialerModal from './VoxbayCloudDialerModal';
import { PhoneCall, Smartphone } from 'lucide-react';
import { db } from '../../firebase';
import { collection, onSnapshot, getDocs, doc, deleteDoc } from 'firebase/firestore';

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
  const [internalLogs, setInternalLogs] = useState([]);
  const activeProvider = localStorage.getItem('active_telephony_provider') || 'sim_runo';

  // 1. Direct Real-Time Multi-Collection Firestore Listener for Companion App & Web
  useEffect(() => {
    let unsubs = [];

    const mergeRecords = (newDocs) => {
      if (!Array.isArray(newDocs) || newDocs.length === 0) return;
      setInternalLogs(prev => {
        const map = new Map();
        (prev || []).forEach(p => map.set(String(p.id), p));
        newDocs.forEach(d => map.set(String(d.id), d));
        return Array.from(map.values()).sort((a, b) => {
          const timeA = Number(a._createdAt || a.createdAt || (a.timestamp ? new Date(a.timestamp).getTime() : 0)) || 0;
          const timeB = Number(b._createdAt || b.createdAt || (b.timestamp ? new Date(b.timestamp).getTime() : 0)) || 0;
          return timeB - timeA;
        });
      });
    };

    // A. Listen to 'callLogs' (Android Companion App Collection)
    try {
      if (db) {
        const q1 = collection(db, 'callLogs');
        const unsub1 = onSnapshot(q1, (snapshot) => {
          const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          mergeRecords(docs);
        }, (err) => console.warn('[Telecalling] callLogs listener notice:', err));
        unsubs.push(unsub1);

        // B. Listen to 'call_logs' (Web Dashboard Collection)
        const q2 = collection(db, 'call_logs');
        const unsub2 = onSnapshot(q2, (snapshot) => {
          const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          mergeRecords(docs);
        }, (err) => console.warn('[Telecalling] call_logs listener notice:', err));
        unsubs.push(unsub2);
      }
    } catch (e) {
      console.warn('[Telecalling] Firestore subscription error:', e);
    }

    // C. Initial Fetch from Backend SQLite API
    fetch('/api/telecalling/logs')
      .then(res => res.json())
      .then(data => {
        if (data?.logs && Array.isArray(data.logs)) {
          mergeRecords(data.logs);
        }
      })
      .catch(() => {});

    return () => {
      unsubs.forEach(u => {
        try { u(); } catch (e) {}
      });
    };
  }, []);

  // Format and merge all sources (parent props + internal live state)
  const activeRecords = useMemo(() => {
    const combined = new Map();
    
    // Add parent callLogs
    if (Array.isArray(callLogs)) {
      callLogs.forEach(c => {
        if (c && c.id) combined.set(String(c.id), c);
      });
    }

    // Add internal live Firestore logs
    if (Array.isArray(internalLogs)) {
      internalLogs.forEach(c => {
        if (c && c.id) combined.set(String(c.id), c);
      });
    }

    const allList = Array.from(combined.values());
    if (allList.length === 0) return [];

    return allList.map((log, index) => {
      const durSecs = Number(log.durationSeconds || log.duration || 0);
      let formattedDur = '00:30';
      if (durSecs > 0) {
        formattedDur = durSecs >= 60 ? `${Math.floor(durSecs / 60)}m ${durSecs % 60}s` : `${durSecs}s`;
      } else if (typeof log.duration === 'string') {
        formattedDur = log.duration;
      }

      const custName = log.customerName || log.contactName || log.name || log.customerPhone || log.phoneNumber || log.phone || 'Customer';
      const custPhone = log.customerPhone || log.phoneNumber || log.phone || '—';

      return {
        id: log.id || `CALL-${String(index + 1).padStart(4, '0')}`,
        name: custName,
        agentName: log.agentName || authUser?.name || 'Mobile Agent',
        phone: custPhone,
        channel: log.channel || (activeProvider === 'voxbay' ? 'VOXBAY' : 'SIM'),
        type: log.type || log.callType || 'OUTGOING',
        duration: formattedDur,
        recording: log.recordingUrl || log.recording || log.audioUrl || '',
        status: log.disposition || log.status || 'Interested',
        notes: log.notes || (activeProvider === 'voxbay' ? 'Voxbay Live Call' : 'SIM Companion Call'),
        timestamp: log.timestamp || (log._createdAt ? new Date(log._createdAt).toLocaleString() : new Date().toISOString()),
        _createdAt: log._createdAt || Date.now()
      };
    }).sort((a, b) => {
      const timeA = Number(a._createdAt || 0);
      const timeB = Number(b._createdAt || 0);
      return timeB - timeA;
    });
  }, [callLogs, internalLogs, authUser, activeProvider]);

  const handleUpdateRecords = (newRecords) => {
    setInternalLogs(newRecords);
    if (typeof setCallLogs === 'function') setCallLogs(newRecords);
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
        id: `CALL-${Date.now()}`,
        name: newCall.contactName || newCall.customerName || newCall.name || 'Customer',
        agentName: authUser?.name || 'Staff 1',
        phone: newCall.phoneNumber || newCall.customerPhone || newCall.phone || '—',
        channel: newCall.channel || (activeProvider === 'voxbay' ? 'VOXBAY' : 'SIM'),
        type: newCall.type || 'OUTGOING',
        duration: typeof newCall.duration === 'string' ? newCall.duration : '00:30',
        recording: newCall.recording || newCall.recordingUrl || '',
        status: newCall.status || 'Interested',
        notes: newCall.notes || (activeProvider === 'voxbay' ? 'Voxbay Cloud Call' : 'SIM Companion Call'),
        _createdAt: Date.now()
      },
      ...activeRecords
    ];
    handleUpdateRecords(updated);
    if (showToast) showToast('📞 Call logged and recording synced successfully!', 'success');
  };

  const handleSoftDelete = async (recordOrId) => {
    const targetId = typeof recordOrId === 'object' ? (recordOrId.id || recordOrId.originalId) : recordOrId;
    if (!targetId) return;

    // 1. Delete from active Firestore collections
    try {
      if (db) {
        await deleteDoc(doc(db, 'callLogs', String(targetId)));
        await deleteDoc(doc(db, 'call_logs', String(targetId)));
      }
    } catch (e) {
      console.warn('Firestore callLog delete notice:', e);
    }

    // 2. Move to Universal Recycle Bin / Archive
    const rec = (activeRecords || []).find(r => r.id === targetId) || (typeof recordOrId === 'object' ? recordOrId : { id: targetId });
    if (typeof softDeleteRecord === 'function') {
      softDeleteRecord({
        originalId: targetId,
        id: targetId,
        name: rec.name || rec.customerName || rec.phone || 'Call Log',
        category: 'Call Recordings',
        moduleTab: 'telecalling',
        entityData: rec
      });
    }

    // 3. Update React local state
    setInternalLogs(prev => prev.filter(r => r.id !== targetId));
    if (typeof setCallLogs === 'function') {
      setCallLogs(prev => prev.filter(r => r.id !== targetId));
    }
    if (showToast) showToast('🗑️ Call log moved to Trash Archive', 'info');
  };

  const handleHeaderDialClick = () => {
    if (activeProvider === 'voxbay') {
      setIsVoxbayOpen(true);
    } else {
      if (window.openGlobalDialer) {
        window.openGlobalDialer('', 'Customer', false);
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Main Standard LayoutEngine Table */}
      <div style={{ flex: 1 }}>
        <LayoutEngine
          customHeaderActions={
            <button
              type="button"
              onClick={handleHeaderDialClick}
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
              {activeProvider === 'voxbay' ? <PhoneCall size={14} /> : <Smartphone size={14} />}
              <span>{activeProvider === 'voxbay' ? 'Dial via Voxbay Cloud' : 'Call Lead (SIM Dialer)'}</span>
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
          softDeleteRecord={handleSoftDelete}
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
