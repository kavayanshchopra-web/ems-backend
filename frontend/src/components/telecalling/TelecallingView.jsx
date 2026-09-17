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
  employees = [],
  systemDropdowns = null,
  activePipelineStages = [],
  recycleBinItems = [],
  handleRestoreBinItem = () => {},
  handlePermanentDeleteBinItem = () => {},
  softDeleteRecord = () => {},
  showToast = () => {},
  onOpenModuleConfig = null,
  openModuleConfigModal = null,
  onManageStages = () => {},
  onOpenPositionModal = () => {}
}) {
  const rawCompanyId = authUser?.tenantId || authUser?.companyId || authUser?.tenant_id || '1';
  let numericCompanyId = Number(rawCompanyId);
  if (isNaN(numericCompanyId) || numericCompanyId <= 0) {
    numericCompanyId = 1;
  }
  const companyId = String(numericCompanyId);
  const isSuperAdmin = authUser?.role === 'superadmin' && !authUser?.isImpersonating;
  const isOwnerOrManager = authUser?.role === 'owner' || authUser?.role === 'admin' || authUser?.role === 'manager';

  const { config } = useModuleRegistry(companyId, 'telecalling');
  
  const [isVoxbayOpen, setIsVoxbayOpen] = useState(false);
  const [internalLogs, setInternalLogs] = useState(() => {
    if (isSandboxEnvironment()) {
      try { localStorage.removeItem('omniflow_cached_call_logs'); } catch (e) {}
      const cached = TenantStorage.getItem('call_logs', companyId, []);
      if (Array.isArray(cached) && cached.length > 0) return cached;
      if (Array.isArray(callLogs)) {
        return callLogs.filter(c => !c.tenant_id && !c.tenantId || String(c.tenant_id || c.tenantId) === String(companyId));
      }
      return [];
    }
    if (Array.isArray(callLogs) && callLogs.length > 0) {
      return callLogs.filter(c => !c.tenant_id && !c.tenantId || String(c.tenant_id || c.tenantId) === String(companyId));
    }
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
  const [dispositionOverrides, setDispositionOverrides] = useState(() => {
    return TenantStorage.getItem('telecalling_dispositions', companyId, {});
  });

  // Synchronize internal state whenever parent callLogs or companyId changes
  useEffect(() => {
    if (Array.isArray(callLogs)) {
      setInternalLogs(callLogs.filter(c => !c.tenant_id && !c.tenantId || String(c.tenant_id || c.tenantId) === String(companyId)));
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
      const currentTenantId = numericCompanyId || 1;
      const fetchPromise = SupabaseSandboxService.fetchCallLogs(currentTenantId);

      fetchPromise.then(logs => {
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

    // A. Listen to 'callLogs' (Android Companion App Collection - Production only)
    try {
      if (!isSandboxEnvironment() && db) {
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

    const isMatchingTenantAndRole = (c) => {
      if (!c) return false;

      // 1. Tenant Scoping
      if (!isSuperAdmin) {
        const itemTenant = String(c.tenant_id || c.tenantId || '');
        if (itemTenant && itemTenant !== currentTenantStr) return false;
      }

      // 2. Role Check: Super Admin, Company Owner & Manager can audit ALL recordings of the company
      if (isSuperAdmin || isOwnerOrManager) {
        return true;
      }

      // 3. Employee / Telecaller: Strictly view own calls only
      const userEmpId = String(authUser?.employeeId || authUser?.id || '').trim().toLowerCase();
      const userEmail = String(authUser?.email || '').trim().toLowerCase();
      const userName = String(authUser?.name || authUser?.fullName || '').trim().toLowerCase();

      const callAgentId = String(c.agent_id || c.agentId || '').trim().toLowerCase();
      const callAgentEmail = String(c.agentEmail || c.agent_email || c.custom_fields?.agent_email || '').trim().toLowerCase();
      const callAgentName = String(c.agentName || c.agent_name || '').trim().toLowerCase();

      const matchesId = userEmpId && callAgentId && (userEmpId === callAgentId || userEmpId === `sb_emp_${callAgentId}` || userEmpId === `sb_user_${callAgentId}`);
      const matchesEmail = userEmail && callAgentEmail && userEmail === callAgentEmail;
      const matchesName = userName && callAgentName && (userName === callAgentName || callAgentName.includes(userName) || userName.includes(callAgentName));

      return matchesId || matchesEmail || matchesName;
    };

    // Add parent callLogs
    if (Array.isArray(callLogs)) {
      callLogs.filter(isMatchingTenantAndRole).forEach(c => {
        if (c && c.id) combined.set(String(c.id), c);
      });
    }

    // Add internal live logs
    if (Array.isArray(internalLogs)) {
      internalLogs.filter(isMatchingTenantAndRole).forEach(c => {
        if (c && c.id) combined.set(String(c.id), c);
      });
    }

    // Sort all raw logs chronologically ascending (oldest to newest)
    const sortedRaw = Array.from(combined.values()).sort((a, b) => {
      const tA = Number(a._createdAt || (a.created_at ? new Date(a.created_at).getTime() : 0)) || 0;
      const tB = Number(b._createdAt || (b.created_at ? new Date(b.created_at).getTime() : 0)) || 0;
      return tA - tB;
    });

    // Intelligent Deduplication: ONLY merge Stage 1 (instant pending placeholder) and Stage 2 (audio completion) of the EXACT SAME CALL
    const deduplicated = [];
    sortedRaw.forEach(item => {
      const itemId = String(item.id || '');
      const phoneDigits = String(item.customerPhone || item.phoneNumber || item.phone || item.customer_phone || '').replace(/\D/g, '').slice(-10);
      const itemTime = Number(item._createdAt || (item.created_at ? new Date(item.created_at).getTime() : 0)) || 0;
      const itemAgent = String(item.agent_name || item.agentName || '').toLowerCase().trim();

      // Only match if exact same ID OR (same phone AND same agent AND within 20 seconds of each other)
      const existingIdx = deduplicated.findIndex(d => {
        const dId = String(d.id || '');
        if (itemId && dId && itemId === dId) return true;

        const dPhone = String(d.customerPhone || d.phoneNumber || d.phone || d.customer_phone || '').replace(/\D/g, '').slice(-10);
        if (!phoneDigits || dPhone !== phoneDigits) return false;

        const dAgent = String(d.agent_name || d.agentName || '').toLowerCase().trim();
        if (dAgent && itemAgent && dAgent !== itemAgent) return false; // Different agents = NEVER merge!

        const dTime = Number(d._createdAt || (d.created_at ? new Date(d.created_at).getTime() : 0)) || 0;
        // Same call event: Within 20 seconds of each other (Stage 1 placeholder vs Stage 2 audio completion)
        return Math.abs(itemTime - dTime) < 20000;
      });

      if (existingIdx !== -1) {
        const existing = deduplicated[existingIdx];
        const hasRecA = !!(existing.recordingUrl || existing.recording || existing.audioUrl);
        const hasRecB = !!(item.recordingUrl || item.recording || item.audioUrl);
        // Helper to parse seconds from integer, float, or "MM:SS" string without returning NaN
        const parseSecToNum = (val) => {
          if (!val && val !== 0) return 0;
          if (typeof val === 'number') return isNaN(val) ? 0 : val;
          const s = String(val).trim();
          if (s.includes(':')) {
            const parts = s.split(':');
            if (parts.length === 2) {
              const m = parseInt(parts[0], 10) || 0;
              const sec = parseInt(parts[1], 10) || 0;
              return m * 60 + sec;
            }
          }
          const num = parseFloat(s);
          return isNaN(num) ? 0 : num;
        };

        const durA = Math.max(parseSecToNum(existing.durationSeconds), parseSecToNum(existing.duration));
        const durB = Math.max(parseSecToNum(item.durationSeconds), parseSecToNum(item.duration));
        const maxDur = Math.max(durA, durB);
        const dispA = existing.disposition || existing.status || '';
        const dispB = item.disposition || item.status || '';

        const resolvedRec = (hasRecB ? (item.recordingUrl || item.recording || item.audioUrl) : (existing.recordingUrl || existing.recording || existing.audioUrl)) || '';
        // Preserve any custom or active disposition (e.g. Demo Scheduled) rather than falling back to default Interested
        let resolvedDisp = 'Interested';
        if (dispB && !dispB.toLowerCase().includes('pending') && dispB !== 'Interested') {
          resolvedDisp = dispB;
        } else if (dispA && !dispA.toLowerCase().includes('pending') && dispA !== 'Interested') {
          resolvedDisp = dispA;
        } else {
          resolvedDisp = dispB || dispA || 'Interested';
        }

        // Resolve call type: Preserve OUTGOING or INCOMING if either record has it, do NOT blindly default to INCOMING!
        const typeA = String(existing.type || existing.callType || '').toUpperCase();
        const typeB = String(item.type || item.callType || '').toUpperCase();
        let resolvedType = 'OUTGOING';
        if (typeA && typeA !== 'MISSED') resolvedType = existing.type || existing.callType;
        else if (typeB && typeB !== 'MISSED') resolvedType = item.type || item.callType;
        else if (item.type && item.type !== 'MISSED') resolvedType = item.type;
        else if (existing.type && existing.type !== 'MISSED') resolvedType = existing.type;

        // Channel: Preserve SIM 2 if either entry detected SIM 2
        const chanA = String(existing.channel || '');
        const chanB = String(item.channel || '');
        let resolvedChan = item.channel || existing.channel || 'SIM';
        if (chanA.includes('SIM 2') || chanB.includes('SIM 2')) {
          resolvedChan = 'SIM (SIM 2)';
        } else if (chanA.includes('SIM 1') || chanB.includes('SIM 1')) {
          resolvedChan = 'SIM (SIM 1)';
        }

        const simSlotA = String(existing.simSlot || existing.sim_slot || '');
        const simSlotB = String(item.simSlot || item.sim_slot || '');
        const resolvedSlot = (simSlotA.includes('2') || simSlotB.includes('2')) ? 'SIM 2' : (simSlotB || simSlotA || 'SIM 1');

        deduplicated[existingIdx] = {
          ...existing,
          ...item,
          type: resolvedType,
          callType: resolvedType,
          channel: resolvedChan,
          simSlot: resolvedSlot,
          sim_slot: resolvedSlot,
          id: existing.id || item.id,
          recordingUrl: resolvedRec,
          recording: resolvedRec,
          audioUrl: resolvedRec,
          disposition: resolvedDisp,
          status: resolvedDisp,
          stage: resolvedDisp,
          durationSeconds: maxDur,
          duration: maxDur > 0 ? `${Math.floor(maxDur / 60)}m ${maxDur % 60}s` : '0s',
          notes: (item.notes && !item.notes.includes('Pending')) ? item.notes : existing.notes
        };
      } else {
        deduplicated.push(item);
      }
    });

    // Map chronologically so older calls keep lower sequence numbers and newest call gets highest sequential ID
    return deduplicated.map((log, seqIdx) => {
      // Helper to parse seconds
      const parseSec = (val) => {
        if (!val && val !== 0) return 0;
        if (typeof val === 'number') return isNaN(val) ? 0 : val;
        const s = String(val).trim();
        if (s.includes(':')) {
          const parts = s.split(':');
          if (parts.length === 2) return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
        }
        const n = parseFloat(s);
        return isNaN(n) ? 0 : n;
      };
      const durSecs = Math.max(parseSec(log.durationSeconds), parseSec(log.duration));
      let cleanRecording = log.recordingUrl || log.recording || log.audioUrl || '';
      if (cleanRecording.includes('soundhelix.com') || cleanRecording.includes('[no audio]')) {
        cleanRecording = '';
      }

      let isMissed = String(log.type || log.callType || '').toUpperCase() === 'MISSED';

      // CRITICAL: If a valid voice recording exists, call was connected and cannot be MISSED!
      if (cleanRecording && cleanRecording.startsWith('http')) {
        isMissed = false;
      } else if (isMissed || durSecs === 0) {
        cleanRecording = '';
      }

      let formattedDur = '0s';
      if (durSecs > 0) {
        formattedDur = durSecs >= 60 ? `${Math.floor(durSecs / 60)}m ${durSecs % 60}s` : `${durSecs}s`;
      } else if (typeof log.duration === 'string' && log.duration && log.duration !== '00:30' && log.duration !== '00:00' && log.duration !== '0s') {
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

      const persistentSeqId = `CALL-${String(seqIdx + 1).padStart(4, '0')}`;
      const resolvedCallType = isMissed ? 'MISSED' : (log.type && log.type !== 'MISSED' ? log.type : (log.callType && log.callType !== 'MISSED' ? log.callType : 'OUTGOING'));

      // Check if user set an explicit override (guaranteed supreme priority)
      const overrideDisp = dispositionOverrides[String(log.id)] || 
                           dispositionOverrides[persistentSeqId] || 
                           (custPhone && dispositionOverrides[String(custPhone)]) || 
                           (normPhone10 && dispositionOverrides[normPhone10]);

      const rawDisposition = String(log.disposition || log.status || '').trim();
      const resolvedDisposition = overrideDisp || (rawDisposition && rawDisposition.toUpperCase() !== 'MISSED'
        ? rawDisposition
        : (isMissed ? 'Missed Call' : 'Interested'));

      return {
        id: log.id || persistentSeqId,
        displayId: persistentSeqId,
        name: resolvedCustomerName,
        customerName: resolvedCustomerName,
        agentName: log.agent_name || log.agentName || authUser?.name || 'Mobile Agent',
        agent_name: log.agent_name || log.agentName || authUser?.name || 'Mobile Agent',
        agentId: log.agent_id || log.agentId || '',
        agent_id: log.agent_id || log.agentId || '',
        agentEmail: log.agent_email || log.agentEmail || log.custom_fields?.agent_email || '',
        agent_email: log.agent_email || log.agentEmail || log.custom_fields?.agent_email || '',
        agentRole: log.agent_role || log.agentRole || '',
        agent_role: log.agent_role || log.agentRole || '',
        custom_fields: log.custom_fields || {},
        phone: custPhone,
        callTime: log.callTime || log.call_time || log.created_at || log.timestamp || log._createdAt || log.createdAt || Date.now(),
        createdAt: log.created_at || log.createdAt || log.timestamp || (log._createdAt ? new Date(log._createdAt).toISOString() : new Date().toISOString()),
        channel: channelDisplay,
        simSlot: simSlotText,
        type: resolvedCallType,
        callType: resolvedCallType,
        duration: formattedDur,
        recording: cleanRecording,
        recordingUrl: cleanRecording,
        audioUrl: cleanRecording,
        status: resolvedDisposition,
        stage: resolvedDisposition,
        disposition: resolvedDisposition,
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

    // 🔒 Strict Hierarchical Role-Based Visibility Engine
    const userRole = String(authUser?.role || '').toLowerCase().trim();
    const userEmail = String(authUser?.email || '').toLowerCase().trim();
    const userName = String(authUser?.name || '').toLowerCase().trim();
    const userEmpId = String(authUser?.employeeId || authUser?.id || '').toLowerCase().trim();
    const userDept = String(authUser?.department || '').toLowerCase().trim();

    return mapped.filter(item => {
      // 0. Strict Tenant Isolation: Exclude any call belonging to another company
      const itemTenant = item.tenant_id || item.tenantId;
      if (itemTenant && numericCompanyId && String(itemTenant) !== String(numericCompanyId)) {
        return false;
      }

      const itemAgentName = String(item.agentName || item.agent_name || '').toLowerCase().trim();
      const itemAgentId = String(item.agentId || item.agent_id || '').toLowerCase().trim();
      const itemAgentEmail = String(item.agentEmail || item.agent_email || item.custom_fields?.agent_email || '').toLowerCase().trim();

      // 1. Superadmin / Owner / Admin / Company Admin: Sees all calls of the current company/tenant
      if (userRole === 'superadmin' || userRole === 'owner' || userRole === 'admin' || userRole === 'company_admin') {
        return true;
      }

      const isOwnCall = Boolean(
        (userEmail && itemAgentEmail && itemAgentEmail === userEmail) ||
        (userEmpId && itemAgentId && (itemAgentId === userEmpId || itemAgentId.endsWith(`_${userEmpId}`) || userEmpId.endsWith(`_${itemAgentId}`))) ||
        (userName && itemAgentName && (itemAgentName === userName || itemAgentName.includes(userName) || userName.includes(itemAgentName)))
      );

      // 2. Manager: Sees own calls + all calls made by employees in the same department
      if (userRole === 'manager') {
        if (isOwnCall) return true;
        if (Array.isArray(employees) && userDept) {
          const matchedEmp = employees.find(e => {
            const eEmail = String(e.email || '').toLowerCase().trim();
            const eName = String(e.name || `${e.first_name || ''} ${e.last_name || ''}`).toLowerCase().trim();
            const eId = String(e.id || '').toLowerCase().trim();
            return (itemAgentEmail && eEmail === itemAgentEmail) ||
                   (itemAgentId && (eId === itemAgentId || eId.endsWith(`_${itemAgentId}`))) ||
                   (itemAgentName && eName === itemAgentName);
          });
          if (matchedEmp && String(matchedEmp.department || '').toLowerCase().trim() === userDept) {
            return true;
          }
        }
        return false;
      }

      // 3. Employee (Default): STRICTLY own calls ONLY
      return isOwnCall;
    });
  }, [callLogs, internalLogs, crmContactMap, authUser, activeProvider, companyId, employees, dispositionOverrides]);

  const handleUpdateRecords = async (newRecords) => {
    // 1. Immediately update dispositionOverrides with highest priority
    const newOverrides = { ...dispositionOverrides };
    if (Array.isArray(newRecords)) {
      newRecords.forEach(r => {
        if (r && (r.disposition || r.status)) {
          const val = r.disposition || r.status;
          if (r.id) newOverrides[String(r.id)] = val;
          if (r.displayId) newOverrides[String(r.displayId)] = val;
          if (r.phone) newOverrides[String(r.phone)] = val;
          const clean = String(r.phone || '').replace(/\D/g, '').slice(-10);
          if (clean) newOverrides[clean] = val;
        }
      });
    }
    setDispositionOverrides(newOverrides);
    TenantStorage.setItem('telecalling_dispositions', newOverrides, companyId);

    setInternalLogs(newRecords);
    if (typeof setCallLogs === 'function') setCallLogs(newRecords);
    TenantStorage.setItem('call_logs', newRecords, companyId);
    try {
      localStorage.setItem('omniflow_cached_call_logs', JSON.stringify(newRecords));
    } catch (e) {}

    if (isSandboxEnvironment()) {
      if (Array.isArray(newRecords)) {
        for (const rec of newRecords) {
          if (rec && rec.id) {
            const rawId = rec.originalId || rec.id;
            const numId = Number(rawId);
            if (!isNaN(numId) && numId > 0) {
              SupabaseSandboxService.updateCallLog(numId, {
                disposition: rec.disposition || rec.status,
                status: rec.status || rec.disposition,
                notes: rec.notes
              }, companyId).catch(() => {});
            }
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


  // Ensure Date & Time column is always present and properly ordered in telecalling module config
  const enhancedConfig = useMemo(() => {
    if (!config) return config;
    const cols = [...(config.columns || [])];
    const hasCallTime = cols.some(c => c && (c.id === 'callTime' || c.fieldKey === 'callTime'));
    if (!hasCallTime) {
      const phoneIdx = cols.findIndex(c => c && (c.id === 'phone' || c.fieldKey === 'phone'));
      const insertIdx = phoneIdx !== -1 ? phoneIdx + 1 : 3;
      cols.splice(insertIdx, 0, {
        id: 'callTime',
        fieldKey: 'callTime',
        label: 'Date & Time',
        visible: true,
        width: '160px',
        align: 'left',
        sortOrder: 3.5
      });
    }

    const fields = [...(config.fields || [])];
    const hasCallTimeField = fields.some(f => f && (f.id === 'callTime' || f.key === 'callTime'));
    if (!hasCallTimeField) {
      fields.splice(3, 0, {
        id: 'callTime',
        key: 'callTime',
        label: 'Date & Time',
        type: 'datetime',
        systemField: true,
        required: false,
        filterable: true,
        showOnList: true,
        showOnView: true,
        sortOrder: 3.5
      });
    }

    return {
      ...config,
      fields,
      columns: cols.map((c, i) => ({ ...c, sortOrder: c.sortOrder || (i + 1) })).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    };
  }, [config]);

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
          moduleConfig={enhancedConfig}
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
          onOpenModuleConfig={onOpenModuleConfig || openModuleConfigModal}
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
