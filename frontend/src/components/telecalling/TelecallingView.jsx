import React, { useEffect, useMemo, useState } from 'react';
import { useModuleRegistry } from '../../core/registry/useModuleRegistry';
import LayoutEngine from '../../core/engines/LayoutEngine/LayoutEngine';
import FirebaseCloudEngine from '../../core/engines/FirebaseCloudEngine';
import VoxbayCloudDialerModal from './VoxbayCloudDialerModal';
import { PhoneCall, Smartphone } from 'lucide-react';
import { db } from '../../firebase';
import { collection, onSnapshot, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { GhlOAuthService } from '../../core/services/ghlOAuthService';
import { isSandboxEnvironment, SupabaseSandboxService } from '../../core/services/supabaseSandboxService';
import TenantStorage from '../../core/services/TenantStorage';

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
  const companyId = authUser?.tenantId || authUser?.companyId || authUser?.tenant_id || 'org_default';
  const { config } = useModuleRegistry(companyId, 'telecalling');
  
  const [isVoxbayOpen, setIsVoxbayOpen] = useState(false);
  const [internalLogs, setInternalLogs] = useState(() => {
    if (isSandboxEnvironment()) {
      try { localStorage.removeItem('omniflow_cached_call_logs'); } catch (e) {}
      const cached = TenantStorage.getItem('call_logs', companyId, []);
      if (Array.isArray(cached) && cached.length > 0) return cached;
      if (Array.isArray(callLogs)) {
        const tenantStr = String(companyId);
        return callLogs.filter(c => String(c.tenant_id || c.tenantId) === tenantStr);
      }
      return [];
    }
    if (Array.isArray(callLogs) && callLogs.length > 0) return callLogs;
    const cached = TenantStorage.getItem('call_logs', companyId, null);
    if (Array.isArray(cached)) return cached;
    try {
      const globalCached = localStorage.getItem('omniflow_cached_call_logs');
      return globalCached ? JSON.parse(globalCached) : [];
    } catch (e) {
      return [];
    }
  });
  const activeProvider = localStorage.getItem('active_telephony_provider') || 'sim_runo';

  // Synchronize internal state whenever parent callLogs or companyId changes
  useEffect(() => {
    if (Array.isArray(callLogs)) {
      if (isSandboxEnvironment()) {
        const tenantStr = String(companyId);
        setInternalLogs(callLogs.filter(c => String(c.tenant_id || c.tenantId) === tenantStr));
      } else {
        setInternalLogs(callLogs);
      }
    }
  }, [callLogs, companyId]);

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

  // 1. Direct Real-Time Multi-Collection Firestore Listener / Supabase Sandbox Loader
  useEffect(() => {
    if (isSandboxEnvironment()) {
      try { localStorage.removeItem('omniflow_cached_call_logs'); } catch (e) {}
      const tenantNum = Number(companyId) || 999;
      SupabaseSandboxService.fetchCallLogs(tenantNum).then(logs => {
        setInternalLogs(logs);
        if (typeof setCallLogs === 'function') setCallLogs(logs);
        TenantStorage.setItem('call_logs', logs, companyId);
      }).catch(err => {
        console.error('[Telecalling] Sandbox call_logs fetch error:', err);
      });
      return;
    }

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
          TenantStorage.setItem('call_logs', merged, companyId);
        } catch (e) {}

        // Background auto-sync new calls to GoHighLevel
        try {
          const syncedJson = localStorage.getItem('omniflow_ghl_synced_calls');
          const syncedSet = new Set(syncedJson ? JSON.parse(syncedJson) : []);
          const recentThreshold = Date.now() - 60 * 60 * 1000;

          const parseCallTime = (c) => {
            if (c._createdAt && Number(c._createdAt) > 0) return Number(c._createdAt);
            if (c.createdAt && Number(c.createdAt) > 0) return Number(c.createdAt);
            if (typeof c.timestamp === 'number') return c.timestamp < 10000000000 ? c.timestamp * 1000 : c.timestamp;
            if (typeof c.timestamp === 'string') {
              const parsed = new Date(c.timestamp).getTime();
              if (!isNaN(parsed) && parsed > 0) return parsed;
              const m = c.timestamp.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
              if (m) {
                const d = new Date(`${m[3]}-${m[2]}-${m[1]}`);
                if (!isNaN(d.getTime())) return d.getTime();
              }
            }
            return Date.now();
          };

          const pendingCalls = newDocs.filter(c => {
            if (!c.id || syncedSet.has(c.id)) return false;
            const callTime = parseCallTime(c);
            return callTime >= recentThreshold;
          });

          if (pendingCalls.length > 0) {
            const cleanComp = String(companyId || localStorage.getItem('omnilflow_current_company') || '');
            if (cleanComp && cleanComp !== 'org_default' && cleanComp !== 'default_tenant') {
              GhlOAuthService.getInstalledLocations(cleanComp).then(async (installed) => {
                let directLoc = installed?.find(l => l.accessToken && l.locationId);
                if (!directLoc || !directLoc.accessToken || !directLoc.locationId) return;

                const activeLocationId = directLoc.locationId;

              if (directLoc && directLoc.accessToken) {
                for (const call of pendingCalls) {
                  try {
                    const res = await GhlOAuthService.createConversationCallDirectly({
                      locationId: activeLocationId,
                      accessToken: directLoc.accessToken,
                      callLog: call
                    });
                    if (res) {
                      syncedSet.add(call.id);
                      localStorage.setItem('omniflow_ghl_synced_calls', JSON.stringify(Array.from(syncedSet).slice(-500)));
                    }
                  } catch (e) {}
                }
              }
            }).catch(() => {});
          }
        }
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
  }, [companyId]);

  // Format and merge all sources (parent props + internal live state + CRM contact resolution)
  const activeRecords = useMemo(() => {
    const combined = new Map();
    const currentTenantStr = String(companyId);

    const isMatchingTenant = (c) => {
      if (!c) return false;
      if (isSandboxEnvironment()) {
        const itemTenant = String(c.tenant_id || c.tenantId || '');
        return itemTenant === currentTenantStr;
      }
      return !c.tenantId || String(c.tenantId) === currentTenantStr;
    };

    // Add parent callLogs
    if (Array.isArray(callLogs)) {
      callLogs.filter(isMatchingTenant).forEach(c => {
        if (c && c.id) combined.set(String(c.id), c);
      });
    }

    // Add internal live logs
    if (Array.isArray(internalLogs)) {
      internalLogs.filter(isMatchingTenant).forEach(c => {
        if (c && c.id) combined.set(String(c.id), c);
      });
    }

    // Sort all raw logs chronologically ascending (oldest to newest)
    const sortedRaw = Array.from(combined.values()).sort((a, b) => {
      const tA = Number(a._createdAt || (a.created_at ? new Date(a.created_at).getTime() : 0)) || 0;
      const tB = Number(b._createdAt || (b.created_at ? new Date(b.created_at).getTime() : 0)) || 0;
      return tA - tB;
    });

    if (sortedRaw.length === 0) return [];

    // Intelligent Deduplication: Merge Stage 1 (instant 0ms) and Stage 2 (follow-up/audio) for the same call
    const deduplicated = [];
    sortedRaw.forEach(item => {
      const phoneDigits = String(item.customerPhone || item.phoneNumber || item.phone || item.customer_phone || '').replace(/\D/g, '').slice(-10);
      const itemTime = Number(item._createdAt || (item.created_at ? new Date(item.created_at).getTime() : 0)) || 0;

      // Check if this is a companion call update within 15 minutes (900,000ms)
      const existingIdx = deduplicated.findIndex(d => {
        const dPhone = String(d.customerPhone || d.phoneNumber || d.phone || d.customer_phone || '').replace(/\D/g, '').slice(-10);
        if (!phoneDigits || dPhone !== phoneDigits) return false;
        const dTime = Number(d._createdAt || (d.created_at ? new Date(d.created_at).getTime() : 0)) || 0;
        return Math.abs(itemTime - dTime) < 900000;
      });

      if (existingIdx !== -1) {
        const existing = deduplicated[existingIdx];
        const hasRecA = !!(existing.recordingUrl || existing.recording || existing.audioUrl);
        const hasRecB = !!(item.recordingUrl || item.recording || item.audioUrl);
        const durA = Number(existing.durationSeconds || existing.duration || 0);
        const durB = Number(item.durationSeconds || item.duration || 0);
        const dispA = existing.disposition || existing.status || '';
        const dispB = item.disposition || item.status || '';

        const resolvedRec = (hasRecB ? (item.recordingUrl || item.recording || item.audioUrl) : (existing.recordingUrl || existing.recording || existing.audioUrl)) || '';
        const resolvedDisp = (dispB && !dispB.toLowerCase().includes('pending')) ? dispB : (dispA || 'Interested');

        deduplicated[existingIdx] = {
          ...existing,
          ...item,
          id: existing.id || item.id,
          recordingUrl: resolvedRec,
          recording: resolvedRec,
          audioUrl: resolvedRec,
          disposition: resolvedDisp,
          status: resolvedDisp,
          durationSeconds: Math.max(durA, durB),
          duration: Math.max(durA, durB) > 0 ? `${Math.floor(Math.max(durA, durB) / 60)}m ${Math.max(durA, durB) % 60}s` : (item.duration || existing.duration),
          notes: (item.notes && !item.notes.includes('Pending')) ? item.notes : existing.notes
        };
      } else {
        deduplicated.push(item);
      }
    });

    // Map chronologically so older calls keep lower sequence numbers and newest call gets highest sequential ID
    return deduplicated.map((log, seqIdx) => {
      const durSecs = Number(log.durationSeconds || log.duration || 0);
      const isMissed = String(log.type || log.callType || '').toUpperCase() === 'MISSED' || 
                       String(log.disposition || log.status || '').toUpperCase() === 'MISSED CALL';
      let formattedDur = '0s';
      if (durSecs > 0) {
        formattedDur = durSecs >= 60 ? `${Math.floor(durSecs / 60)}m ${durSecs % 60}s` : `${durSecs}s`;
      } else if (typeof log.duration === 'string' && log.duration && log.duration !== '00:30') {
        formattedDur = log.duration;
      }

      const custPhone = log.customerPhone || log.phoneNumber || log.phone || log.customer_phone || '—';
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

      const simSlotText = log.simSlot || log.sim_slot || '';
      const rawChannel = log.channel || (activeProvider === 'voxbay' ? 'VOXBAY' : 'SIM');
      const channelDisplay = simSlotText && !rawChannel.includes('(') ? `${rawChannel} (${simSlotText})` : rawChannel;

      // Filter out dummy soundhelix audio URLs and suppress audio player for missed calls
      let cleanRecording = log.recordingUrl || log.recording || log.audioUrl || '';
      if (isMissed || durSecs === 0 || cleanRecording.includes('soundhelix.com') || cleanRecording.includes('[no audio]')) {
        cleanRecording = '';
      }

      const persistentSeqId = `CALL-${String(seqIdx + 1).padStart(4, '0')}`;

      return {
        id: log.id || persistentSeqId,
        displayId: persistentSeqId,
        name: resolvedCustomerName,
        customerName: resolvedCustomerName,
        agentName: log.agentName || authUser?.name || 'Mobile Agent',
        phone: custPhone,
        channel: channelDisplay,
        simSlot: simSlotText,
        type: isMissed ? 'MISSED' : (log.type || log.callType || 'OUTGOING'),
        duration: formattedDur,
        recording: cleanRecording,
        recordingUrl: cleanRecording,
        audioUrl: cleanRecording,
        status: isMissed ? 'Missed Call' : (log.disposition || log.status || 'Interested'),
        disposition: isMissed ? 'Missed Call' : (log.disposition || log.status || 'Interested'),
        notes: log.notes || (activeProvider === 'voxbay' ? 'Voxbay Live Call' : 'SIM Companion Call'),
        timestamp: log.timestamp || (log._createdAt ? new Date(log._createdAt).toLocaleString() : new Date().toISOString()),
        tenantId: log.tenant_id || log.tenantId || companyId,
        _createdAt: log._createdAt || (log.created_at ? new Date(log.created_at).getTime() : Date.now())
      };
    }).sort((a, b) => {
      // Sort newest calls to top of table
      const timeA = Number(a._createdAt || 0);
      const timeB = Number(b._createdAt || 0);
      return timeB - timeA;
    });
  }, [callLogs, internalLogs, crmContactMap, authUser, activeProvider, companyId]);

  const handleUpdateRecords = async (newRecords) => {
    setInternalLogs(newRecords);
    if (typeof setCallLogs === 'function') setCallLogs(newRecords);
    TenantStorage.setItem('call_logs', newRecords, companyId);

    if (isSandboxEnvironment()) {
      if (Array.isArray(newRecords) && newRecords.length > 0) {
        const newest = newRecords[0];
        if (newest && newest.id) {
          try {
            await SupabaseSandboxService.createCallLog(newest, companyId);
          } catch (e) {
            console.error('[Telecalling] Sandbox call_log save error:', e);
          }
        }
      }
    } else {
      if (Array.isArray(newRecords)) {
        newRecords.forEach(rec => {
          if (rec && rec.id) {
            FirebaseCloudEngine.saveRecord('call_logs', rec, companyId);
          }
        });
      }
    }
  };

  const handleCallLogged = async (newCall) => {
    const newCallItem = {
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
      tenantId: companyId,
      tenant_id: Number(companyId) || 999,
      _createdAt: Date.now()
    };
    const updated = [newCallItem, ...activeRecords];
    handleUpdateRecords(updated);
    if (showToast) showToast('📞 Call logged and recording synced successfully!', 'success');

    // Asynchronously push to linked GoHighLevel if connected
    try {
      const cleanComp = String(companyId || '');
      if (cleanComp && cleanComp !== 'org_default' && cleanComp !== 'default_tenant') {
        GhlOAuthService.getInstalledLocations(cleanComp).then(async (installed) => {
          let directLoc = installed?.find(l => l.accessToken && l.locationId);
          if (directLoc && directLoc.accessToken && directLoc.locationId) {
            GhlOAuthService.createConversationCallDirectly({
              locationId: directLoc.locationId,
              accessToken: directLoc.accessToken,
              callLog: updated[0]
            }).catch(err => console.warn('[Telecalling Live GHL Push notice]', err));
          }
        }).catch(() => {});
      }
    } catch (e) {}
  };

  const handleSoftDelete = async (recordOrId) => {
    const targetId = typeof recordOrId === 'object' ? (recordOrId.id || recordOrId.originalId) : recordOrId;
    if (!targetId) return;

    if (isSandboxEnvironment()) {
      try {
        await SupabaseSandboxService.deleteCallLog(targetId, companyId);
      } catch (e) {
        console.warn('Sandbox call_log delete notice:', e);
      }
    } else {
      // 1. Delete from active Firestore collections
      try {
        if (db) {
          await deleteDoc(doc(db, 'callLogs', String(targetId)));
          await deleteDoc(doc(db, 'call_logs', String(targetId)));
        }
      } catch (e) {
        console.warn('Firestore callLog delete notice:', e);
      }
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
    TenantStorage.setItem('call_logs', (activeRecords || []).filter(r => r.id !== targetId), companyId);
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
