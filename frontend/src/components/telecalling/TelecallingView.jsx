import React, { useEffect, useMemo, useState } from 'react';
import { useModuleRegistry } from '../../core/registry/useModuleRegistry';
import LayoutEngine from '../../core/engines/LayoutEngine/LayoutEngine';
import FirebaseCloudEngine from '../../core/engines/FirebaseCloudEngine';
import VoxbayCloudDialerModal from './VoxbayCloudDialerModal';
import { PhoneCall, Smartphone } from 'lucide-react';
import { db } from '../../firebase';
import { collection, onSnapshot, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { GhlOAuthService } from '../../core/services/ghlOAuthService';

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
  const [internalLogs, setInternalLogs] = useState(() => {
    if (Array.isArray(callLogs) && callLogs.length > 0) return callLogs;
    try {
      const cached = localStorage.getItem('omniflow_cached_call_logs');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });
  const activeProvider = localStorage.getItem('active_telephony_provider') || 'sim_runo';

  const [crmContactMap, setCrmContactMap] = useState(() => {
    try {
      const cached = localStorage.getItem('omniflow_cached_crm_contacts') || localStorage.getItem('omniflow_cached_contacts');
      if (cached) {
        const parsed = JSON.parse(cached);
        const map = new Map();
        if (Array.isArray(parsed)) {
          parsed.forEach(c => {
            const name = c.name || c.fullName || c.contactName;
            const phone = c.phone || c.phoneNumber;
            if (name && phone) {
              const digits = String(phone).replace(/\D/g, '');
              if (digits.length >= 7) map.set(digits.slice(-10), name.trim());
            }
          });
        } else if (typeof parsed === 'object') {
          Object.entries(parsed).forEach(([k, v]) => map.set(k, v));
        }
        return map;
      }
    } catch (e) {}
    return new Map();
  });

  // 1. Direct Real-Time Multi-Collection Firestore Listener for Companion App & Web Call Logs
  useEffect(() => {
    let unsubs = [];

    const mergeRecords = (newDocs) => {
      if (!Array.isArray(newDocs) || newDocs.length === 0) return;
      setInternalLogs(prev => {
        const map = new Map();
        (prev || []).forEach(p => map.set(String(p.id), p));
        newDocs.forEach(d => map.set(String(d.id), d));
        const merged = Array.from(map.values()).sort((a, b) => {
          const timeA = Number(a._createdAt || a.createdAt || (a.timestamp ? new Date(a.timestamp).getTime() : 0)) || 0;
          const timeB = Number(b._createdAt || b.createdAt || (b.timestamp ? new Date(b.timestamp).getTime() : 0)) || 0;
          return timeB - timeA;
        });
        try {
          localStorage.setItem('omniflow_cached_call_logs', JSON.stringify(merged.slice(0, 300)));
        } catch (e) {}
        return merged;
      });
    };

    // Helper to register phone numbers into CRM contact map
    const registerContacts = (contactDocs) => {
      if (!Array.isArray(contactDocs) || contactDocs.length === 0) return;
      setCrmContactMap(prevMap => {
        const newMap = new Map(prevMap);
        contactDocs.forEach(c => {
          const name = c.name || c.fullName || c.contactName || c.leadName || c.customerName || c.title;
          const phoneCandidates = [c.phone, c.phoneNumber, c.mobile, c.customerPhone, c.phone_number, c.contactPhone];
          if (name && typeof name === 'string' && name.trim()) {
            phoneCandidates.forEach(p => {
              if (p) {
                const cleanDigits = String(p).replace(/\D/g, '');
                if (cleanDigits.length >= 7) {
                  newMap.set(cleanDigits.slice(-10), name.trim());
                }
              }
            });
          }
        });
        return newMap;
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
    const API_BASE = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
      ? 'http://localhost:5000/api'
      : '/api';
    const authToken = typeof window !== 'undefined' ? (localStorage.getItem('omnilflow_token') || localStorage.getItem('token')) : null;

    fetch(`${API_BASE}/telecalling/logs`, {
      headers: { ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}) }
    })
      .then(res => res.json())
      .then(data => {
        if (data?.logs && Array.isArray(data.logs)) {
          mergeRecords(data.logs);
        }
      })
      .catch(() => {});

    // D. Initial Fetch for Backend Contacts (Single Pass)
    fetch(`${API_BASE}/contacts`, {
      headers: { ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}) }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data?.contacts)) registerContacts(data.contacts);
        else if (Array.isArray(data)) registerContacts(data);
      })
      .catch(() => {});

    return () => {
      unsubs.forEach(u => {
        try { u(); } catch (e) {}
      });
    };
  }, []);

  // Format and merge all sources (parent props + internal live state + CRM contact resolution)
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

      const custPhone = log.customerPhone || log.phoneNumber || log.phone || '—';
      const rawName = String(log.customerName || log.contactName || log.name || '').trim();
      const cleanPhoneDigits = String(custPhone).replace(/\D/g, '');
      const normPhone10 = cleanPhoneDigits.length >= 7 ? cleanPhoneDigits.slice(-10) : '';

      // Check if current name is just a raw phone number
      const isNameJustPhone = !rawName || 
        rawName.replace(/[\s\+\-\(\)]/g, '') === cleanPhoneDigits || 
        /^\+?\d{7,15}$/.test(rawName.replace(/[\s\-]/g, '')) ||
        rawName.toLowerCase() === 'customer' ||
        rawName.toLowerCase() === 'call log';

      let resolvedCustomerName = rawName;
      if (isNameJustPhone && normPhone10 && crmContactMap.has(normPhone10)) {
        // Matched in CRM Leads / Contacts!
        resolvedCustomerName = crmContactMap.get(normPhone10);
      } else if (isNameJustPhone) {
        // Fallback to phone number if no contact match found
        resolvedCustomerName = custPhone !== '—' ? custPhone : 'Customer';
      }

      return {
        id: log.id || `CALL-${String(index + 1).padStart(4, '0')}`,
        name: resolvedCustomerName,
        customerName: resolvedCustomerName,
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
  }, [callLogs, internalLogs, crmContactMap, authUser, activeProvider]);

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

    // Asynchronously push to linked GoHighLevel if connected
    try {
      const cleanComp = String(companyId || 'org_default');
      GhlOAuthService.getInstalledLocations(cleanComp).then(installed => {
        const directLoc = installed?.find(l => l.accessToken) || installed?.[0];
        if (directLoc && directLoc.accessToken) {
          GhlOAuthService.createConversationCallDirectly({
            locationId: directLoc.locationId || '1g4rrRuP0ubwpF6vqWka',
            accessToken: directLoc.accessToken,
            callLog: updated[0]
          }).catch(err => console.warn('[Telecalling Live GHL Push notice]', err));
        }
      }).catch(() => {});
    } catch (e) {}
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
