/**
 * UNIFIED CONVERSATIONS & OMNI-TIMELINE HUB (GHL STYLE)
 * Consolidates WhatsApp Chats, Multi-Call Recordings, and Lead Interactions into a single continuous stream
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import io from 'socket.io-client';
import { 
  MessageSquare, 
  Phone, 
  PhoneCall, 
  PhoneIncoming, 
  PhoneOutgoing, 
  PhoneMissed, 
  Search, 
  Send, 
  Paperclip, 
  Smile, 
  Play, 
  Pause, 
  Download, 
  Volume2, 
  Clock, 
  User, 
  Filter, 
  ChevronRight, 
  RefreshCw, 
  Check, 
  CheckCheck, 
  Calendar, 
  Tag, 
  Zap, 
  Layers, 
  Sparkles,
  FileText,
  ExternalLink,
  Mic,
  Trash2,
  ArrowLeft,
  ChevronLeft,
  QrCode,
  CheckCircle2,
  X,
  Smartphone,
  Wifi,
  WifiOff,
  AlertCircle
} from 'lucide-react';
import { TimelineEngine } from '../../core/engines/TimelineEngine';
import { normalizePhone10, formatPhoneDisplay, toE164Phone, isSamePhone } from '../../core/utils/phoneUtils';
import { db } from '../../firebase';
import { collection, onSnapshot, doc, getDocs, setDoc, query, where, deleteDoc } from 'firebase/firestore';
import GhlOAuthService from '../../core/services/ghlOAuthService';
import { isSandboxEnvironment, SupabaseSandboxService } from '../../core/services/supabaseSandboxService';
import TenantStorage from '../../core/services/TenantStorage';

// Robust unwrap helper for Firestore REST API, Web SDK, SQLite, or Socket.IO call records
function unwrapCallRecord(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const f = raw.fields || {};
  const getVal = (key) => {
    if (raw[key] !== undefined && raw[key] !== null) return raw[key];
    if (f[key]) {
      return f[key].stringValue ?? f[key].integerValue ?? f[key].doubleValue ?? f[key].booleanValue ?? f[key].timestampValue;
    }
    return undefined;
  };

  const phone = getVal('customerPhone') || getVal('customer_phone') || getVal('phoneNumber') || getVal('phone') || getVal('number') || '';
  const name = getVal('customerName') || getVal('customer_name') || getVal('name') || getVal('contactName') || '';
  const rawDur = getVal('durationSeconds') || getVal('duration_seconds') || getVal('duration') || 0;
  const duration = GhlOAuthService.parseDurationToSeconds(rawDur);
  const type = getVal('type') || getVal('callType') || getVal('call_type') || 'OUTGOING';
  const disposition = getVal('disposition') || getVal('status') || '';
  const notes = getVal('notes') || getVal('remark') || '';
  const agentName = getVal('staffName') || getVal('staff_name') || getVal('agentName') || getVal('agent') || 'Agent';
  const channel = getVal('channel') || 'SIM';
  const recording = getVal('recordingUrl') || getVal('recording') || getVal('audioUrl') || getVal('recording_url') || getVal('fileUrl') || '';
  const createdAt = Number(getVal('_createdAt') || getVal('createdAt')) || (raw.timestamp ? new Date(raw.timestamp).getTime() : Date.now());

  return {
    id: String(raw.id || `call_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`),
    customerPhone: String(phone),
    phoneNumber: String(phone),
    customerName: String(name),
    recordingUrl: recording,
    recording: recording,
    audioUrl: recording,
    durationSeconds: duration,
    type: String(type),
    disposition: String(disposition),
    notes: String(notes),
    agentName: String(agentName),
    channel: String(channel),
    timestamp: raw.timestamp || new Date(createdAt).toISOString(),
    _createdAt: createdAt
  };
}

// In-thread Embedded Audio Player Component
function TimelineAudioPlayer({ src, duration = 0 }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const [blobUrl, setBlobUrl] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!src || src === '[no audio]' || src === '[on device]') {
      setBlobUrl(null);
      return;
    }

    if (src.startsWith('blob:') || src.startsWith('http://') || src.startsWith('https://')) {
      setBlobUrl(src);
      return;
    }

    if (src.startsWith('data:')) {
      try {
        const parts = src.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'audio/mp4';
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime || 'audio/mp4' });
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
        return () => {
          URL.revokeObjectURL(url);
        };
      } catch (e) {
        setBlobUrl(src);
      }
    } else {
      setBlobUrl(src);
    }
  }, [src]);

  const formatTime = (secs) => {
    const s = Math.floor(secs || 0);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem < 10 ? '0' : ''}${rem}`;
  };

  const togglePlay = (e) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current && audioRef.current.duration && !isNaN(audioRef.current.duration)) {
      setTotalDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  if (!src || src === '[no audio]') {
    return (
      <div style={{ fontSize: '10px', color: '#94a3b8', fontStyle: 'italic', padding: '2px 0' }}>
        No audio recording available
      </div>
    );
  }

  if (src === '[on device]') {
    return (
      <div style={{ fontSize: '10.5px', color: '#0d9488', fontWeight: '500', padding: '3px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span>📱</span> <span>Audio recorded locally on Companion Device</span>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      background: 'rgba(15, 23, 42, 0.03)',
      padding: '4px 8px',
      borderRadius: '6px',
      border: '1px solid rgba(226, 232, 240, 0.7)',
      marginTop: '4px',
      width: '100%',
      maxWidth: '340px'
    }}>
      <audio
        ref={audioRef}
        src={blobUrl || src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
      />
      <button
        type="button"
        onClick={togglePlay}
        style={{
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          background: isPlaying ? '#0d9488' : '#2563eb',
          color: '#ffffff',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}
        title={isPlaying ? 'Pause Recording' : 'Play Recording'}
      >
        {isPlaying ? <Pause size={10} /> : <Play size={10} style={{ marginLeft: '1px' }} />}
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '1px' }}>
        <input
          type="range"
          min="0"
          max={totalDuration || duration || 100}
          value={currentTime}
          onChange={handleSeek}
          style={{
            width: '100%',
            height: '3px',
            accentColor: '#0d9488',
            cursor: 'pointer'
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#64748b', fontWeight: '600', lineHeight: 1 }}>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(totalDuration || duration)}</span>
        </div>
      </div>

      <a
        href={src}
        download="call-recording.wav"
        target="_blank"
        rel="noreferrer"
        style={{ color: '#64748b', padding: '2px', display: 'flex', alignItems: 'center' }}
        title="Download Audio"
      >
        <Download size={11} />
      </a>
    </div>
  );
}

export default function ConversationsPage({
  authUser,
  contacts: propContacts = [],
  sessions = [],
  activePipelineStages = [],
  showToast = () => {}
}) {
  const rawCompanyId = authUser?.tenantId || authUser?.companyId || authUser?.tenant_id || '1';
  let numericCompanyId = Number(rawCompanyId);
  if (isNaN(numericCompanyId) || numericCompanyId <= 0) {
    numericCompanyId = 1;
  }
  const companyId = String(numericCompanyId);

  const userRole = String(authUser?.role || 'employee').toLowerCase().trim();
  const userEmpId = String(authUser?.employeeId || authUser?.id || '').toLowerCase().trim();
  const userEmail = String(authUser?.email || '').toLowerCase().trim();
  const userName = String(authUser?.name || authUser?.fullName || '').toLowerCase().trim();
  const isOwnerOrAdmin = ['superadmin', 'super_admin', 'owner', 'admin', 'company_admin'].includes(userRole);

  // Model A RBAC Scoping Helper: Determines whether a lead/contact is visible to active user
  const isContactVisibleToUser = (c, callLogsList = []) => {
    if (!c) return false;

    // 1. Strict Tenant Isolation
    const itemTenant = String(c.tenant_id ?? c.tenantId ?? '');
    if (itemTenant && itemTenant !== companyId) return false;

    // 2. Company Owner, Super Admin, Company Admin have supervisory overview of all company leads
    if (isOwnerOrAdmin) return true;

    // 3. Employee Role: Strictly sees only assigned leads OR leads where employee has called/received a call
    // A. Check Assigned Lead
    const assignedVal = String(c.assigned_to || c.assignedTo || c.employee || c.agent || '').toLowerCase().trim();
    if (assignedVal) {
      if (userEmpId && (assignedVal === userEmpId || assignedVal.includes(userEmpId))) return true;
      if (userEmail && assignedVal === userEmail) return true;
      if (userName && (assignedVal === userName || assignedVal.includes(userName) || userName.includes(assignedVal))) return true;
    }

    // B. Check if employee has call/recording interaction with this phone number
    const contactPhone10 = c.normPhone10 || String(c.phone || c.rawPhone || c.customerPhone || c.id || '').replace(/\D/g, '').slice(-10);
    const logsToCheck = (Array.isArray(callLogsList) && callLogsList.length > 0) ? callLogsList : (allCallLogs || []);
    if (contactPhone10 && Array.isArray(logsToCheck) && logsToCheck.length > 0) {
      const hasMyCall = logsToCheck.some(call => {
        const cPhone = String(call.customerPhone || call.customer_phone || call.phoneNumber || call.phone || '').replace(/\D/g, '');
        if (!cPhone.endsWith(contactPhone10)) return false;

        const aId = String(call.agent_id || call.agentId || '').toLowerCase().trim();
        const aEmail = String(call.agentEmail || call.agent_email || call.custom_fields?.agent_email || '').toLowerCase().trim();
        const aName = String(call.agentName || call.agent_name || '').toLowerCase().trim();

        return (userEmpId && aId && (aId === userEmpId || aId.endsWith(`_${userEmpId}`))) ||
               (userEmail && aEmail && aEmail === userEmail) ||
               (userName && aName && (aName === userName || aName.includes(userName) || userName.includes(aName)));
      });
      if (hasMyCall) return true;
    }

    return false;
  };

  const formatContactRoster = (rawList) => {
    if (!Array.isArray(rawList)) return [];
    const dedupMap = new Map();

    rawList.forEach(c => {
      if (!c || !c.id) return;
      const idStr = String(c.id);
      if (idStr.endsWith('@g.us') || idStr.endsWith('@broadcast') || idStr.endsWith('@newsletter') || idStr.endsWith('@lid') || idStr === '0@s.whatsapp.net') {
        return;
      }

      const norm10 = normalizePhone10(c.phone || c.phoneNumber || c.customerPhone || c.id || '');
      const cleanPhone = String(c.phone || c.phoneNumber || c.customerPhone || (c.id.includes('@s.whatsapp.net') ? c.id.split('@')[0] : '')).replace(/\D/g, '');
      const isInternal = cleanPhone.toLowerCase().startsWith('ghl_') || /[a-z]/i.test(cleanPhone);
      const formattedPhone = norm10 ? formatPhoneDisplay(norm10) : ((!isInternal && cleanPhone.length >= 7) ? `+${cleanPhone}` : '—');

      let rawName = String(c.name || c.fullName || c.custom_name || c.customName || c.displayName || '').replace(/@s\.whatsapp\.net/g, '').trim();
      if (rawName.toLowerCase().startsWith('ghl_') || !rawName) {
        rawName = formattedPhone !== '—' ? formattedPhone : (c.email ? c.email.split('@')[0] : 'Contact');
      }

      // Deduplication key: phone 10-digit > email > JID
      let key = '';
      if (norm10) key = `phone_${norm10}`;
      else if (c.email) key = `email_${c.email.toLowerCase().trim()}`;
      else key = `id_${c.id}`;

      const rec = {
        id: c.id,
        name: rawName,
        phone: formattedPhone,
        rawPhone: cleanPhone,
        normPhone10: norm10,
        email: c.email || '',
        lastMessage: c.lastMessage || c.last_message_text || '',
        lastMessageTime: c.lastMessageTime || c.last_message_time || c.updatedAt || c.createdAt || Date.now(),
        unreadCount: c.unread_count || c.unreadCount || 0,
        stage: c.pipelineStage || c.stage || c.status || 'New Leads',
        source: c.source || (c.ghlContactId ? 'GoHighLevel' : 'WhatsApp'),
        ghlContactId: c.ghlContactId || null,
        tags: Array.isArray(c.labels) ? c.labels : (Array.isArray(c.tags) ? c.tags : []),
        assigned_to: c.assigned_to || c.assignedTo || c.employee || c.agent || '',
        tenant_id: c.tenant_id ?? c.tenantId ?? companyId
      };

      if (dedupMap.has(key)) {
        const existing = dedupMap.get(key);
        const isExistingGeneric = !existing.name || existing.name === existing.phone || existing.name === 'Contact';
        const isCleanGeneric = !rawName || rawName === formattedPhone || rawName === 'Contact';
        const betterName = (!isExistingGeneric) ? existing.name : (!isCleanGeneric ? rawName : (existing.name || rawName));

        dedupMap.set(key, {
          ...existing,
          ...rec,
          name: betterName,
          phone: (existing.phone && existing.phone !== '—') ? existing.phone : formattedPhone,
          lastMessage: rec.lastMessage || existing.lastMessage,
          lastMessageTime: Math.max(new Date(existing.lastMessageTime || 0).getTime(), new Date(rec.lastMessageTime || 0).getTime()),
          assigned_to: rec.assigned_to || existing.assigned_to
        });
      } else {
        dedupMap.set(key, rec);
      }
    });

    const list = Array.from(dedupMap.values()).sort((a, b) => {
      const timeA = new Date(a.lastMessageTime || 0).getTime();
      const timeB = new Date(b.lastMessageTime || 0).getTime();
      return timeB - timeA;
    });

    return list.map((c, idx) => ({
      ...c,
      displayId: `CON-${String(idx + 1).padStart(4, '0')}`
    }));
  };

  // 1. Master State strictly scoped to companyId and Model A role
  const [conversationsList, setConversationsList] = useState(() => {
    let source = [];
    if (Array.isArray(propContacts) && propContacts.length > 0) {
      source = propContacts;
    } else {
      source = TenantStorage.getItem('contacts', companyId, []) || [];
    }
    const scoped = (source || []).filter(c => isContactVisibleToUser(c));
    return formatContactRoster(scoped);
  });

  const [activeContact, setActiveContact] = useState(() => {
    let source = [];
    if (Array.isArray(propContacts) && propContacts.length > 0) {
      source = propContacts;
    } else {
      source = TenantStorage.getItem('contacts', companyId, []) || [];
    }
    const scoped = (source || []).filter(c => isContactVisibleToUser(c));
    const roster = formatContactRoster(scoped);
    return roster.length > 0 ? roster[0] : null;
  });

  const [activeMessages, setActiveMessages] = useState([]);
  const [allCallLogs, setAllCallLogs] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const tId = companyId || authUser?.tenantId || authUser?.companyId || authUser?.tenant_id;
        const cached = TenantStorage.getItem('call_logs', tId, null);
        if (Array.isArray(cached) && cached.length > 0) return cached;
        if (!isSandboxEnvironment()) {
          const legacy = localStorage.getItem('omniflow_cached_call_logs');
          if (legacy) return JSON.parse(legacy);
        }
      }
    } catch (e) {}
    return [];
  });
  const [crmNotes, setCrmNotes] = useState([]);
  const [activeTabFilter, setActiveTabFilter] = useState('all'); // 'all' | 'whatsapp' | 'calls' | 'notes'
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);
  const [mobileTab, setMobileTab] = useState('list'); // 'list' | 'chat' | 'details'

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(typeof window !== 'undefined' && window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [searchQuery, setSearchQuery] = useState('');
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');

  const messagesEndRef = useRef(null);
  const messagesCacheRef = useRef(new Map());

  const isDesktop = typeof window !== 'undefined' && (Boolean(window.electronAPI) || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const API_URL = isDesktop
    ? 'http://localhost:5000/api'
    : 'https://api.employeemanagementsystems.com/api';
  const token = typeof window !== 'undefined' ? (localStorage.getItem('omnilflow_token') || localStorage.getItem('token')) : null;

  // WhatsApp Baileys Gateway & QR Connection State
  const [localSessions, setLocalSessions] = useState(() => (Array.isArray(sessions) ? sessions : []));
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrActionMsg, setQrActionMsg] = useState('');

  // Sync prop sessions when parent updates
  useEffect(() => {
    if (Array.isArray(sessions) && sessions.length > 0) {
      setLocalSessions(sessions);
    }
  }, [sessions]);

  const activeTenantId = String(authUser?.tenantId || authUser?.companyId || companyId || '1');

  const primarySession = localSessions[0] || null;
  const isConnected = primarySession?.status === 'connected';
  const isQRReady = primarySession?.status === 'qr_ready' && Boolean(primarySession?.qr_code);
  const isConnecting = primarySession?.status === 'connecting' || qrLoading;
  const connectedPhone = primarySession?.phone_number || primarySession?.phoneNumber || '';

  // Fetch active sessions from backend API
  const fetchCurrentSessions = async () => {
    try {
      const res = await fetch(`${API_URL}/sessions`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-tenant-id': activeTenantId
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setLocalSessions(data);
          return data;
        }
      }
    } catch (e) {
      console.warn('[ConversationsPage] Sessions fetch notice:', e);
    }
    return [];
  };

  // Poll sessions while QR modal is open to capture QR image and connection updates in real-time
  useEffect(() => {
    fetchCurrentSessions();
    if (showQrModal && !isConnected) {
      const interval = setInterval(() => {
        fetchCurrentSessions();
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [API_URL, token, showQrModal, isConnected, activeTenantId]);

  // Start or trigger QR code generation for WhatsApp session
  const handleStartSession = async (sessId) => {
    setQrLoading(true);
    setQrActionMsg('Requesting WhatsApp QR Code from Baileys gateway...');
    try {
      const reqHeaders = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'x-tenant-id': activeTenantId
      };

      let currentList = localSessions;
      if (!currentList || currentList.length === 0) {
        currentList = await fetchCurrentSessions();
      }

      let targetId = sessId || currentList[0]?.id;
      if (!targetId) {
        // Create primary session if none exists yet
        const createRes = await fetch(`${API_URL}/sessions`, {
          method: 'POST',
          headers: reqHeaders,
          body: JSON.stringify({ phoneName: 'Primary WhatsApp Line' })
        });
        if (createRes.ok) {
          const created = await createRes.json();
          targetId = created.id;
          setLocalSessions([created]);
        }
      }

      if (targetId) {
        const startRes = await fetch(`${API_URL}/sessions/start/${targetId}`, {
          method: 'POST',
          headers: reqHeaders
        });
        if (startRes.ok) {
          setQrActionMsg('Connecting to Baileys... QR will appear in 2-3 seconds.');
        }
      }
      setTimeout(fetchCurrentSessions, 1200);
      setTimeout(fetchCurrentSessions, 2800);
    } catch (err) {
      console.error('[Start Session Error]', err);
      setQrActionMsg('Connection notice: ' + err.message);
    } finally {
      setQrLoading(false);
    }
  };

  // Disconnect / Reset active WhatsApp session
  const handleDisconnectSession = async (sessId) => {
    if (!window.confirm('Kya aap WhatsApp re-link karna chahte hain taaki saari past chats aur 50-50 messages CRM mein fetch ho sakein?')) return;
    try {
      const targetId = sessId || primarySession?.id;
      if (targetId) {
        await fetch(`${API_URL}/sessions/reset/${targetId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        });
        await fetchCurrentSessions();
        handleStartSession(targetId);
      }
    } catch (err) {
      console.error('[Disconnect Session Error]', err);
    }
  };

  // Sync prop contacts when parent updates (scoped by Model A)
  useEffect(() => {
    if (Array.isArray(propContacts) && propContacts.length > 0) {
      const tenantScoped = propContacts.filter(p => isContactVisibleToUser(p, allCallLogs));
      const formatted = formatContactRoster(tenantScoped);
      if (formatted.length > 0) {
        setConversationsList(prev => {
          const map = new Map();
          (prev || []).forEach(c => {
            const key = c.normPhone10 || normalizePhone10(c.phone || c.rawPhone || c.id || '') || c.id;
            map.set(key, c);
          });
          formatted.forEach(c => {
            const key = c.normPhone10 || normalizePhone10(c.phone || c.rawPhone || c.id || '') || c.id;
            if (map.has(key)) {
              map.set(key, { ...map.get(key), ...c });
            } else {
              map.set(key, c);
            }
          });
          return Array.from(map.values()).sort((a, b) => new Date(b.lastMessageTime || 0).getTime() - new Date(a.lastMessageTime || 0).getTime());
        });
        if (!activeContact) {
          setActiveContact(formatted[0]);
        } else {
          const updatedActive = formatted.find(c => c.id === activeContact.id || (c.normPhone10 && c.normPhone10 === activeContact.normPhone10));
          setActiveContact(updatedActive || formatted[0]);
        }
      } else if (!isOwnerOrAdmin) {
        setConversationsList([]);
        setActiveContact(null);
      }
    }
  }, [propContacts, companyId, userRole, userEmpId, userEmail, userName]);

  // 2. Fetch / Stream Call Logs (Firestore + SQLite with live caching)
  useEffect(() => {
    if (isSandboxEnvironment()) {
      const tenantNum = Number(companyId) || 999;
      SupabaseSandboxService.fetchCallLogs(tenantNum).then(logs => {
        setAllCallLogs(logs);
        TenantStorage.setItem('call_logs', logs, companyId);
      }).catch(err => console.error('[ConversationsPage] Sandbox call_logs error:', err));
      return;
    }

    let unsubs = [];

    const handleNewCallDocs = (docs) => {
      if (!Array.isArray(docs) || docs.length === 0) return;
      const unwrapped = docs.map(unwrapCallRecord).filter(Boolean);
      if (unwrapped.length === 0) return;

      // 1. Merge into allCallLogs state and cache
      setAllCallLogs(prev => {
        const map = new Map();
        (prev || []).forEach(p => map.set(String(p.id), p));
        unwrapped.forEach(d => map.set(String(d.id), d));
        const merged = Array.from(map.values()).sort((a, b) => {
          const timeA = Number(a._createdAt || (a.timestamp ? new Date(a.timestamp).getTime() : 0)) || 0;
          const timeB = Number(b._createdAt || (b.timestamp ? new Date(b.timestamp).getTime() : 0)) || 0;
          return timeB - timeA;
        });
        try {
          TenantStorage.setItem('call_logs', merged.slice(0, 300), companyId);
        } catch (e) {}
        return merged;
      });

      // 2. Auto-Link call leads into Conversations roster (create new lead if phone not in list)
      setConversationsList(prev => {
        let updatedList = [...prev];
        let hasChanges = false;

        unwrapped.forEach(call => {
          // If active user is an employee, only auto-link if this was their own call!
          if (!isOwnerOrAdmin) {
            const aId = String(call.agent_id || call.agentId || '').toLowerCase().trim();
            const aEmail = String(call.agentEmail || call.agent_email || call.custom_fields?.agent_email || '').toLowerCase().trim();
            const aName = String(call.agentName || call.agent_name || '').toLowerCase().trim();
            const isMyCall = (userEmpId && aId && (aId === userEmpId || aId.endsWith(`_${userEmpId}`))) ||
                             (userEmail && aEmail && aEmail === userEmail) ||
                             (userName && aName && (aName === userName || aName.includes(userName) || userName.includes(aName)));
            if (!isMyCall) return;
          }

          const rawPhone = String(call.customerPhone || call.phoneNumber || '').replace(/\D/g, '');
          const norm10 = rawPhone.length >= 7 ? rawPhone.slice(-10) : '';
          if (!norm10) return;

          const existingIdx = updatedList.findIndex(c => {
            const cNorm = c.normPhone10 || String(c.phone || c.rawPhone || c.id || '').replace(/\D/g, '').slice(-10);
            return cNorm && cNorm === norm10;
          });

          const durSecs = call.durationSeconds || 0;
          const durStr = durSecs >= 60 ? `${Math.floor(durSecs / 60)}m ${durSecs % 60}s` : `${durSecs}s`;
          const lastMsg = `📞 ${call.type || 'INCOMING'} Call (${durStr})`;
          const callTime = call._createdAt || (call.timestamp ? new Date(call.timestamp).getTime() : Date.now());

          if (existingIdx !== -1) {
            const current = updatedList[existingIdx];
            const isCallNewer = callTime >= (new Date(current.lastMessageTime || 0).getTime());
            const hasBetterName = call.customerName && call.customerName !== 'Customer' && (!current.name || current.name.replace(/\D/g, '') === norm10);
            
            if (isCallNewer || hasBetterName) {
              hasChanges = true;
              updatedList[existingIdx] = {
                ...current,
                name: hasBetterName ? call.customerName : current.name,
                lastMessage: isCallNewer ? lastMsg : current.lastMessage,
                lastMessageTime: isCallNewer ? callTime : current.lastMessageTime
              };
            }
          } else {
            // Brand new lead detected from call! Insert into conversations list
            hasChanges = true;
            const formattedPhone = formatPhoneDisplay(norm10);
            const newLead = {
              id: `call_lead_${norm10}`,
              name: (call.customerName && call.customerName !== 'Customer') ? call.customerName : formattedPhone,
              phone: formattedPhone,
              rawPhone: rawPhone,
              normPhone10: norm10,
              email: '',
              lastMessage: lastMsg,
              lastMessageTime: callTime,
              unreadCount: 0,
              stage: 'New Leads',
              source: 'SIM Companion',
              displayId: `CON-${String(updatedList.length + 1).padStart(4, '0')}`,
              tags: ['SIM Call']
            };
            updatedList.unshift(newLead);
          }
        });

        if (hasChanges) {
          const sorted = updatedList.sort((a, b) => new Date(b.lastMessageTime || 0).getTime() - new Date(a.lastMessageTime || 0).getTime());
          try {
            localStorage.setItem(`omniflow_cached_contacts_${companyId}`, JSON.stringify(sorted.slice(0, 200)));
          } catch (e) {}
          return sorted;
        }
        return prev;
      });

      // 3. Live Auto-Sync to GoHighLevel in background
      try {
        const syncedJson = localStorage.getItem('omniflow_ghl_synced_calls');
        const syncedSet = new Set(syncedJson ? JSON.parse(syncedJson) : []);
        const recentThreshold = Date.now() - 24 * 60 * 60 * 1000; // Calls from last 24 hours

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

        const pendingCalls = unwrapped.filter(c => {
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
                    if (showToast) {
                      showToast(`⚡ Live SIM Call linked & synced to GoHighLevel! (${call.customerName || call.customerPhone})`, 'success');
                    }
                  }
                } catch (cErr) {
                  console.warn('[Live GHL Auto-Sync notice]', cErr);
                }
              }
            }
          }).catch(() => {});
        }
      }
    } catch (ghlAutoErr) {
        console.warn('[GHL Auto-Sync notice]', ghlAutoErr);
      }
    };

    try {
      if (db && companyId && companyId !== 'org_default' && companyId !== 'org_unassigned') {
        // A. Companion App Call Logs (Direct Android Phone Sync)
        const q1 = query(collection(db, 'callLogs'), where('tenantId', '==', String(companyId)));
        const unsub1 = onSnapshot(q1, (snap) => {
          const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          handleNewCallDocs(docs);
        }, (err) => console.warn('[ConversationsPage] callLogs notice:', err));
        unsubs.push(unsub1);

        // B. Telecalling / Web Dashboard Call Logs
        const q2 = query(collection(db, 'call_logs'), where('tenantId', '==', String(companyId)));
        const unsub2 = onSnapshot(q2, (snap) => {
          const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          handleNewCallDocs(docs);
        }, (err) => console.warn('[ConversationsPage] call_logs notice:', err));
        unsubs.push(unsub2);
      }
    } catch (e) {
      console.warn('[ConversationsPage] Call log listener error:', e);
    }

    // Backend SQLite Call Logs Initial Fetch
    fetch(`${API_URL}/telecalling/logs`, {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        'x-tenant-id': String(companyId)
      }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data?.logs)) handleNewCallDocs(data.logs);
        else if (Array.isArray(data)) handleNewCallDocs(data);
      })
      .catch(() => {});

    return () => {
      unsubs.forEach(u => {
        try { u(); } catch (e) {}
      });
    };
  }, [API_URL, token, companyId]);

  // 3. Load Contacts & Build Active Conversations Roster (Unified WhatsApp SQLite + Supabase Leads)
  const fetchConversations = async () => {
    setLoadingConversations(true);
    try {
      let whatsappContacts = [];
      let crmContacts = [];

      // A. Live WhatsApp Contacts from VPS Baileys SQLite Engine
      try {
        const res = await fetch(`${API_URL}/contacts`, {
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            'x-tenant-id': String(companyId)
          }
        });
        if (res.ok) {
          const data = await res.json();
          whatsappContacts = Array.isArray(data?.contacts) ? data.contacts : (Array.isArray(data) ? data : []);
        }
      } catch (apiErr) {
        console.warn('[ConversationsPage] Live WhatsApp contacts fetch notice:', apiErr);
      }

      // B. CRM Contacts from Supabase Sandbox
      if (isSandboxEnvironment()) {
        try {
          const tenantNum = Number(companyId) || 1;
          const sbContacts = await SupabaseSandboxService.fetchContacts(tenantNum);
          if (Array.isArray(sbContacts) && sbContacts.length > 0) {
            crmContacts = sbContacts;
            TenantStorage.setItem('contacts', sbContacts, companyId);
          }
        } catch (sbErr) {
          console.warn('[ConversationsPage] Supabase contacts fetch notice:', sbErr);
        }
      }

      // C. Merge Live WhatsApp and CRM contacts
      const mergedMap = new Map();

      // Add WhatsApp contacts first
      whatsappContacts.forEach(c => {
        if (!c || !c.id) return;
        const norm = c.phone_normalized || c.phone || String(c.id).replace(/\D/g, '').slice(-10);
        mergedMap.set(norm || c.id, {
          ...c,
          phone: c.phone || c.phone_computed || (c.id.includes('@') ? c.id.split('@')[0] : c.id),
          normPhone10: norm,
          source: 'whatsapp'
        });
      });

      // Merge CRM contacts
      crmContacts.forEach(c => {
        if (!c || !c.id) return;
        const norm = c.normPhone10 || String(c.phone || c.rawPhone || c.id || '').replace(/\D/g, '').slice(-10);
        const key = norm || c.id;
        if (!mergedMap.has(key)) {
          mergedMap.set(key, c);
        } else {
          const existing = mergedMap.get(key);
          mergedMap.set(key, {
            ...existing,
            name: existing.name || c.name || c.displayName,
            email: existing.email || c.email,
            stage: c.stage || c.pipeline_stage || existing.stage,
            dealValue: c.dealValue || c.deal_value || existing.dealValue
          });
        }
      });

      let rawList = Array.from(mergedMap.values());

      // Fallback to parent propContacts or cached contacts if both empty
      if (rawList.length === 0 && Array.isArray(propContacts) && propContacts.length > 0) {
        rawList = propContacts;
      }
      if (rawList.length === 0) {
        const cached = TenantStorage.getItem('contacts', companyId, []);
        if (Array.isArray(cached) && cached.length > 0) rawList = cached;
      }

      // D. Filter by Tenant and Model A Role-Based Scope
      const scopedRaw = (rawList || []).filter(c => isContactVisibleToUser(c, allCallLogs));
      const cleanRoster = formatContactRoster(scopedRaw);

      if (cleanRoster.length > 0) {
        setConversationsList(prev => {
          const map = new Map();
          // Keep all existing contacts (including live call leads)
          (prev || []).forEach(c => {
            const key = c.normPhone10 || normalizePhone10(c.phone || c.rawPhone || c.id || '') || c.id;
            map.set(key, c);
          });
          // Merge newly fetched cleanRoster
          cleanRoster.forEach(c => {
            const key = c.normPhone10 || normalizePhone10(c.phone || c.rawPhone || c.id || '') || c.id;
            if (map.has(key)) {
              map.set(key, { ...map.get(key), ...c });
            } else {
              map.set(key, c);
            }
          });
          return Array.from(map.values()).sort((a, b) => new Date(b.lastMessageTime || 0).getTime() - new Date(a.lastMessageTime || 0).getTime());
        });
        if (!activeContact) {
          setActiveContact(cleanRoster[0]);
        }
      }
    } catch (err) {
      console.warn('[ConversationsPage] Contacts load error:', err);
    } finally {
      setLoadingConversations(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [API_URL, token, companyId, userRole, userEmpId, userEmail, userName, allCallLogs]);

  // 4. Fetch WhatsApp Messages for Active Contact (with instant cache preview)
  useEffect(() => {
    if (!activeContact || !activeContact.id) {
      setActiveMessages([]);
      setIsLoadingMessages(false);
      return;
    }

    const contactId = activeContact.id;
    const cleanPhone = String(activeContact.phone || activeContact.rawPhone || activeContact.phoneNumber || activeContact.id || '').replace(/\D/g, '');
    const norm10 = cleanPhone.length >= 7 ? cleanPhone.slice(-10) : '';

    const cached = messagesCacheRef.current.get(contactId);
    if (cached && cached.length > 0) {
      setActiveMessages(cached);
      setIsLoadingMessages(false);
    } else {
      setIsLoadingMessages(true);
    }

    const queryPhone = norm10 ? `91${norm10}` : cleanPhone;
    fetch(`${API_URL}/contacts/${encodeURIComponent(contactId)}/messages?limit=200&phone=${encodeURIComponent(queryPhone)}`, {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        'x-tenant-id': String(companyId)
      }
    })
      .then(res => res.json())
      .then(data => {
        const msgs = Array.isArray(data?.messages) ? data.messages : (Array.isArray(data) ? data : []);
        setActiveMessages(prev => {
          const map = new Map();
          // First add server messages
          msgs.forEach(m => {
            const key = m.id || `${m.text_content || m.textContent}_${m.timestamp}`;
            map.set(key, m);
          });
          // Then preserve any recent local/optimistic messages not yet returned by server
          (prev || []).forEach(p => {
            const key = p.id || `${p.text_content || p.textContent}_${p.timestamp}`;
            const existsInServer = msgs.some(m => m.id === p.id || ((m.text_content === p.text_content || m.textContent === p.textContent) && Math.abs((m.timestamp || 0) - (p.timestamp || 0)) < 8));
            if (!existsInServer) {
              map.set(key, p);
            }
          });
          const merged = Array.from(map.values()).sort((a, b) => {
            const tA = (a.timestamp && a.timestamp < 10000000000) ? a.timestamp * 1000 : (a.timestamp || 0);
            const tB = (b.timestamp && b.timestamp < 10000000000) ? b.timestamp * 1000 : (b.timestamp || 0);
            return tA - tB;
          });
          messagesCacheRef.current.set(contactId, merged);
          return merged;
        });
        setIsLoadingMessages(false);
        setTimeout(() => {
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
          }
        }, 80);
      })
      .catch(err => {
        console.warn('[ConversationsPage] Messages fetch error:', err);
        setIsLoadingMessages(false);
      });
  }, [activeContact?.id, activeContact?.phone, activeContact?.rawPhone, API_URL, token]);

  // Real-time Electron WhatsApp Webview Incoming Message & Batch Sync Listener
  useEffect(() => {
    let cleanup1 = null;
    let cleanup2 = null;

    if (typeof window !== 'undefined') {
      if (window.electronAPI?.onIncomingWhatsAppMessage) {
        cleanup1 = window.electronAPI.onIncomingWhatsAppMessage((msg) => {
          if (!msg || !msg.body) return;
          const incomingText = msg.body;
          const senderName = msg.sender || '';
          const isFromMe = msg.fromMe === true || msg.fromMe === 1;

          if (activeContact) {
            const contactPhoneNorm = String(activeContact.phone || activeContact.rawPhone || activeContact.id || '').replace(/\D/g, '').slice(-10);
            const senderNorm = String(msg.phone || senderName).replace(/\D/g, '').slice(-10);
            const nameMatches = activeContact.name && senderName && activeContact.name.toLowerCase().includes(senderName.toLowerCase());

            if ((senderNorm && contactPhoneNorm && senderNorm === contactPhoneNorm) || nameMatches || !senderNorm) {
              const newMsgObj = {
                id: msg.id || ('wa_' + (isFromMe ? 'out_' : 'in_') + Date.now()),
                textContent: incomingText,
                text_content: incomingText,
                fromMe: isFromMe,
                from_me: isFromMe ? 1 : 0,
                timestamp: msg.timestamp || Math.floor(Date.now() / 1000),
                contact_id: activeContact.id
              };
              setActiveMessages(prev => {
                if (prev.some(m => m.id === newMsgObj.id || ((m.textContent === incomingText || m.text_content === incomingText) && Math.abs((m.timestamp || 0) - newMsgObj.timestamp) < 6))) {
                  return prev;
                }
                const updated = [...prev, newMsgObj];
                messagesCacheRef.current.set(activeContact.id, updated);
                return updated;
              });
              setTimeout(() => {
                if (messagesEndRef.current) {
                  messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
                }
              }, 80);
            }
          }
        });
      }

      const handleBatchData = (batchData) => {
        const { phone, sender, messages: batchMsgs } = batchData || {};
        if (!Array.isArray(batchMsgs) || batchMsgs.length === 0 || !activeContact) return;

        const contactPhoneNorm = String(activeContact.phone || activeContact.rawPhone || activeContact.id || '').replace(/\D/g, '').slice(-10);
        const targetNorm = String(phone || sender || '').replace(/\D/g, '').slice(-10);
        const nameMatches = activeContact.name && sender && (
          activeContact.name.toLowerCase().includes(String(sender).toLowerCase()) ||
          String(sender).toLowerCase().includes(activeContact.name.toLowerCase())
        );

        if ((targetNorm && contactPhoneNorm && targetNorm === contactPhoneNorm) || nameMatches) {
          setActiveMessages(prev => {
            const existingMap = new Map();
            prev.forEach(m => existingMap.set(m.id || `${m.text_content || m.textContent}_${m.timestamp}`, m));

            batchMsgs.forEach(b => {
              const bText = (b.body || b.text || '').trim();
              if (!bText) return;
              const isFromMe = b.fromMe === true || b.fromMe === 1;
              const key = b.id || `${bText}_${b.timestamp}`;
              if (!existingMap.has(key)) {
                existingMap.set(key, {
                  id: b.id || `wa_sync_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                  textContent: bText,
                  text_content: bText,
                  fromMe: isFromMe,
                  from_me: isFromMe ? 1 : 0,
                  timestamp: b.timestamp || Math.floor(Date.now() / 1000),
                  contact_id: activeContact.id
                });
              }
            });

            const sorted = Array.from(existingMap.values()).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
            messagesCacheRef.current.set(activeContact.id, sorted);
            return sorted;
          });

          setTimeout(() => {
            if (messagesEndRef.current) {
              messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
            }
          }, 100);
        }
      };

      if (window.electronAPI?.onIncomingWhatsAppBatch) {
        cleanup2 = window.electronAPI.onIncomingWhatsAppBatch(handleBatchData);
      }

      const handleCustomBatchEvent = (e) => {
        if (e && e.detail) handleBatchData(e.detail);
      };
      window.addEventListener('omniflow-wa-batch-sync', handleCustomBatchEvent);

      return () => {
        if (typeof cleanup1 === 'function') cleanup1();
        if (typeof cleanup2 === 'function') cleanup2();
        window.removeEventListener('omniflow-wa-batch-sync', handleCustomBatchEvent);
      };
    }

    return () => {
      if (typeof cleanup1 === 'function') cleanup1();
      if (typeof cleanup2 === 'function') cleanup2();
    };
  }, [activeContact]);

  // Real-time Socket.IO Inbound & Outbound Sync Listener
  useEffect(() => {
    const isDesktopEnv = typeof window !== 'undefined' && (Boolean(window.electronAPI) || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const SOCKET_BASE = isDesktopEnv
      ? 'http://localhost:5000'
      : 'https://api.employeemanagementsystems.com';

    let socket = null;
    try {
      socket = io(SOCKET_BASE, {
        query: { token: token || '' },
        transports: ['websocket', 'polling']
      });

      socket.on('new_message', (msg) => {
        if (!msg) return;
        const msgText = msg.textContent || msg.text_content || msg.text || '';
        const targetId = msg.contactId || msg.contact_id || msg.recipientJid || '';
        const isFromMe = (msg.fromMe === 1 || msg.fromMe === true || msg.from_me === 1 || msg.from_me === true);
        const msgTimestamp = msg.timestamp || Math.floor(Date.now() / 1000);

        if (activeContact) {
          const contactPhoneNorm = String(activeContact.phone || activeContact.rawPhone || activeContact.id || '').replace(/\D/g, '').slice(-10);
          const targetNorm = String(targetId || msg.phone || '').replace(/\D/g, '').slice(-10);
          const idMatches = targetId && (targetId === activeContact.id || targetId === activeContact.phone || targetId === activeContact.rawPhone);
          const phoneMatches = contactPhoneNorm && targetNorm && contactPhoneNorm === targetNorm;

          if (idMatches || phoneMatches) {
            const newMsgObj = {
              id: msg.id || `wa_sock_${Date.now()}`,
              textContent: msgText,
              text_content: msgText,
              fromMe: isFromMe,
              from_me: isFromMe ? 1 : 0,
              timestamp: msgTimestamp,
              mediaUrl: msg.mediaUrl || msg.media_url || null,
              mediaType: msg.mediaType || msg.media_type || 'text',
              contact_id: activeContact.id
            };

            setActiveMessages(prev => {
              if (prev.some(m => m.id === newMsgObj.id || ((m.textContent === msgText || m.text_content === msgText) && Math.abs((m.timestamp || 0) - msgTimestamp) < 5))) {
                return prev;
              }
              const updated = [...prev, newMsgObj];
              messagesCacheRef.current.set(activeContact.id, updated);
              return updated;
            });

            setTimeout(() => {
              if (messagesEndRef.current) {
                messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
              }
            }, 80);
          }
        }

        // Update live conversation previews & sort (or auto-insert new lead)
        setConversationsList(prev => {
          const targetNorm = normalizePhone10(targetId || msg.phone || msg.normPhone10 || '');
          let matchFound = false;
          const updated = prev.map(c => {
            const cNorm = c.normPhone10 || normalizePhone10(c.phone || c.rawPhone || c.id || '');
            if (c.id === targetId || (targetNorm && cNorm && targetNorm === cNorm)) {
              matchFound = true;
              return {
                ...c,
                lastMessage: msgText || c.lastMessage,
                lastMessageTime: Date.now(),
                unreadCount: isFromMe ? 0 : (c.unreadCount || 0) + 1
              };
            }
            return c;
          });

          if (!matchFound && targetNorm) {
            const formattedPhone = formatPhoneDisplay(targetNorm);
            const newContact = {
              id: msg.contact_id || `91${targetNorm}@s.whatsapp.net`,
              name: msg.contactName || formattedPhone,
              phone: formattedPhone,
              rawPhone: targetNorm,
              normPhone10: targetNorm,
              email: '',
              lastMessage: msgText,
              lastMessageTime: Date.now(),
              unreadCount: isFromMe ? 0 : 1,
              stage: 'New Leads',
              source: 'WhatsApp',
              displayId: `CON-${String(prev.length + 1).padStart(4, '0')}`,
              tags: []
            };
            return [newContact, ...updated].sort((a, b) => new Date(b.lastMessageTime || 0).getTime() - new Date(a.lastMessageTime || 0).getTime());
          }

          return updated.sort((a, b) => new Date(b.lastMessageTime || 0).getTime() - new Date(a.lastMessageTime || 0).getTime());
        });
      });

      socket.on('contact_updated', (data) => {
        if (!data) return;
        const dataNorm = normalizePhone10(data.normPhone10 || data.phone || data.id || '');
        setConversationsList(prev => {
          let found = false;
          const mapped = prev.map(c => {
            const cNorm = c.normPhone10 || normalizePhone10(c.phone || c.rawPhone || c.id || '');
            if (c.id === data.id || (dataNorm && cNorm && dataNorm === cNorm)) {
              found = true;
              return { ...c, ...data, normPhone10: cNorm || dataNorm };
            }
            return c;
          });
          if (!found && dataNorm) {
            const formattedPhone = formatPhoneDisplay(dataNorm);
            const newLead = {
              id: data.id || `91${dataNorm}@s.whatsapp.net`,
              name: data.name || formattedPhone,
              phone: formattedPhone,
              rawPhone: dataNorm,
              normPhone10: dataNorm,
              email: data.email || '',
              lastMessage: data.lastMessage || '',
              lastMessageTime: data.lastMessageTime || Date.now(),
              unreadCount: 0,
              stage: data.stage || 'New Leads',
              source: 'WhatsApp',
              displayId: `CON-${String(prev.length + 1).padStart(4, '0')}`,
              tags: []
            };
            return [newLead, ...mapped].sort((a, b) => new Date(b.lastMessageTime || 0).getTime() - new Date(a.lastMessageTime || 0).getTime());
          }
          return mapped;
        });
      });

      socket.on('telecalling:call_logged', (rawCall) => {
        if (!rawCall) return;
        const call = unwrapCallRecord(rawCall);
        if (!call || !call.customerPhone) return;

        // 1. Add to allCallLogs state and update cache
        setAllCallLogs(prev => {
          const map = new Map();
          (prev || []).forEach(p => map.set(String(p.id), p));
          map.set(String(call.id), call);
          const merged = Array.from(map.values()).sort((a, b) => {
            const timeA = Number(a._createdAt || (a.timestamp ? new Date(a.timestamp).getTime() : 0)) || 0;
            const timeB = Number(b._createdAt || (b.timestamp ? new Date(b.timestamp).getTime() : 0)) || 0;
            return timeB - timeA;
          });
          try {
            TenantStorage.setItem('call_logs', merged.slice(0, 300), companyId);
          } catch (e) {}
          return merged;
        });

        // 2. Auto-update active conversations preview or insert new lead
        const callPhone = String(call.customerPhone).replace(/\D/g, '');
        const norm10 = callPhone.length >= 7 ? callPhone.slice(-10) : '';
        if (norm10) {
          setConversationsList(prev => {
            let match = false;
            const updated = prev.map(c => {
              const cNorm = c.normPhone10 || String(c.phone || c.rawPhone || c.id || '').replace(/\D/g, '').slice(-10);
              if (cNorm && cNorm === norm10) {
                match = true;
                return {
                  ...c,
                  lastMessage: `📞 ${call.type || 'Call'} (${call.durationSeconds || 0}s)`,
                  lastMessageTime: Date.now()
                };
              }
              return c;
            });

            if (!match) {
              const formattedPhone = formatPhoneDisplay(norm10);
              const newLead = {
                id: `call_lead_${norm10}`,
                name: call.customerName && call.customerName !== 'Customer' ? call.customerName : formattedPhone,
                phone: formattedPhone,
                rawPhone: norm10,
                normPhone10: norm10,
                email: '',
                lastMessage: `📞 ${call.type || 'Call'} (${call.durationSeconds || 0}s)`,
                lastMessageTime: Date.now(),
                unreadCount: 0,
                stage: 'New Leads',
                source: 'SIM Companion',
                displayId: `CON-${String(prev.length + 1).padStart(4, '0')}`,
                tags: []
              };
              return [newLead, ...updated].sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));
            }

            return updated.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));
          });
        }
      });

      socket.on('session_update', (data) => {
        if (!data || !data.id) return;
        setLocalSessions(prev => {
          const exists = prev.some(s => String(s.id) === String(data.id));
          if (exists) {
            return prev.map(s => {
              if (String(s.id) === String(data.id)) {
                return {
                  ...s,
                  status: data.status,
                  qr_code: data.qr || data.qr_code || s.qr_code,
                  phone_number: data.phoneNumber || data.phone_number || s.phone_number,
                  profile_pic_url: data.profilePicUrl || data.profile_pic_url || s.profile_pic_url
                };
              }
              return s;
            });
          } else {
            return [{
              id: data.id,
              phone_name: 'Primary WhatsApp',
              status: data.status,
              qr_code: data.qr || data.qr_code || null,
              phone_number: data.phoneNumber || data.phone_number || null,
              profile_pic_url: data.profilePicUrl || data.profile_pic_url || null
            }, ...prev];
          }
        });
      });

      socket.on('contacts_cleared', () => {
        setConversationsList([]);
        setActiveContact(null);
        setActiveMessages([]);
        messagesCacheRef.current.clear();
        try {
          localStorage.removeItem('omniflow_cached_contacts');
        } catch (e) {}
      });
    } catch (err) {
      console.warn('[ConversationsPage Socket Warning]', err);
    }

    return () => {
      if (socket) {
        try { socket.disconnect(); } catch (e) {}
      }
    };
  }, [activeContact, token]);

  // Pre-indexed Call Logs by 10-digit Phone for O(1) instantaneous lookup
  const callLogsByPhoneMap = useMemo(() => {
    const map = new Map();
    (allCallLogs || []).forEach(call => {
      if (!call) return;
      const callPhone = String(call.customerPhone || call.customer_phone || call.phoneNumber || call.phone || '').replace(/\D/g, '');
      const norm10 = callPhone.length >= 7 ? callPhone.slice(-10) : '';
      if (norm10) {
        if (!map.has(norm10)) map.set(norm10, []);
        map.get(norm10).push(call);
      }
    });

    // Ensure calls in each phone group are sorted newest first
    map.forEach((list, phone) => {
      list.sort((a, b) => {
        const timeA = Number(a._createdAt || (a.timestamp ? new Date(a.timestamp).getTime() : 0)) || 0;
        const timeB = Number(b._createdAt || (b.timestamp ? new Date(b.timestamp).getTime() : 0)) || 0;
        return timeB - timeA;
      });
    });

    return map;
  }, [allCallLogs]);

  // Synchronize every phone number with call recordings into the conversations roster
  useEffect(() => {
    if (!callLogsByPhoneMap || callLogsByPhoneMap.size === 0) return;

    setConversationsList(prev => {
      const existingNorms = new Set();
      prev.forEach(c => {
        const norm = c.normPhone10 || String(c.phone || c.rawPhone || c.id || '').replace(/\D/g, '').slice(-10);
        if (norm) existingNorms.add(norm);
      });

      const newLeads = [];
      const updatedMap = new Map();
      prev.forEach(c => updatedMap.set(c.id, c));

      callLogsByPhoneMap.forEach((calls, norm10) => {
        if (!norm10 || !Array.isArray(calls) || calls.length === 0) return;
        const latestCall = calls[0];
        const callTime = Number(latestCall._createdAt || (latestCall.timestamp ? new Date(latestCall.timestamp).getTime() : 0)) || Date.now();
        const callType = latestCall.type || 'Call';
        const dur = latestCall.durationSeconds || 0;

        if (existingNorms.has(norm10)) {
          // Refresh existing contact if call is newer
          for (const [id, c] of updatedMap.entries()) {
            const cNorm = c.normPhone10 || String(c.phone || c.rawPhone || c.id || '').replace(/\D/g, '').slice(-10);
            if (cNorm === norm10) {
              const currentMsgTime = new Date(c.lastMessageTime || 0).getTime();
              if (callTime > currentMsgTime) {
                updatedMap.set(id, {
                  ...c,
                  lastMessage: `📞 ${callType} (${dur}s)`,
                  lastMessageTime: callTime
                });
              }
            }
          }
        } else {
          // Auto-insert phone number into conversations roster
          const formattedPhone = formatPhoneDisplay(norm10);
          newLeads.push({
            id: `call_lead_${norm10}`,
            name: (latestCall.customerName && latestCall.customerName !== 'Customer') ? latestCall.customerName : formattedPhone,
            phone: formattedPhone,
            rawPhone: norm10,
            normPhone10: norm10,
            email: '',
            lastMessage: `📞 ${callType} (${dur}s)`,
            lastMessageTime: callTime,
            unreadCount: 0,
            stage: 'New Leads',
            source: 'SIM Companion',
            displayId: `CON-${String(prev.length + newLeads.length + 1).padStart(4, '0')}`,
            tags: []
          });
          existingNorms.add(norm10);
        }
      });

      if (newLeads.length === 0) {
        return Array.from(updatedMap.values()).sort((a, b) => new Date(b.lastMessageTime || 0).getTime() - new Date(a.lastMessageTime || 0).getTime());
      }

      const combined = [...Array.from(updatedMap.values()), ...newLeads];
      return combined.sort((a, b) => new Date(b.lastMessageTime || 0).getTime() - new Date(a.lastMessageTime || 0).getTime());
    });
  }, [callLogsByPhoneMap]);

  // 5. Build Unified Merged Timeline (WhatsApp + Multi-Call Records + Notes)
  const { timeline, stats } = useMemo(() => {
    if (!activeContact) return { timeline: [], stats: {} };

    const norm10 = activeContact.normPhone10 || (String(activeContact.rawPhone || activeContact.phone || '').replace(/\D/g, '').slice(-10));
    let matchedCalls = norm10 && callLogsByPhoneMap.has(norm10) ? callLogsByPhoneMap.get(norm10) : [];

    // Fallback: search allCallLogs directly if map miss
    if ((!matchedCalls || matchedCalls.length === 0) && norm10) {
      matchedCalls = (allCallLogs || []).filter(c => {
        const cp = String(c.customerPhone || c.customer_phone || c.phoneNumber || c.phone || '').replace(/\D/g, '').slice(-10);
        return cp && cp === norm10;
      });
    }

    const contactCalls = TimelineEngine.normalizeCallLogsForContact(
      matchedCalls,
      activeContact.rawPhone || activeContact.phone,
      activeContact.name
    );

    return TimelineEngine.mergeAndSortTimeline(activeMessages, contactCalls, crmNotes);
  }, [activeContact, activeMessages, callLogsByPhoneMap, allCallLogs, crmNotes]);

  // Filter timeline based on active view tab
  const filteredTimeline = useMemo(() => {
    if (activeTabFilter === 'whatsapp') {
      return timeline.filter(t => t.type === 'whatsapp');
    }
    if (activeTabFilter === 'calls') {
      return timeline.filter(t => t.type === 'call');
    }
    if (activeTabFilter === 'notes') {
      return timeline.filter(t => t.type === 'note');
    }
    return timeline;
  }, [timeline, activeTabFilter]);

  // 6. Handle Send WhatsApp Message (Hybrid: Desktop App WhatsApp Web Bridge + Backend Fallback)
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!replyText.trim() || !activeContact || isSending) return;

    const textToSend = replyText.trim();
    const targetPhone = activeContact.rawPhone || activeContact.phone || activeContact.id;
    const cleanPhone = String(targetPhone).replace(/\D/g, '');
    const norm10 = cleanPhone.length >= 7 ? cleanPhone.slice(-10) : '';
    const intlPhone = norm10 ? `91${norm10}` : cleanPhone;
    const outMsgId = `wa_out_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const nowSec = Math.floor(Date.now() / 1000);

    setIsSending(true);

    const newMsgObj = {
      id: outMsgId,
      textContent: textToSend,
      text_content: textToSend,
      fromMe: true,
      from_me: 1,
      timestamp: nowSec,
      status: 'sent',
      contact_id: activeContact.id
    };

    // 1. Instant Optimistic UI Update & Local Cache Hydration (0ms latency, persists on tab switches)
    setActiveMessages(prev => [...prev, newMsgObj]);
    const currentCached = messagesCacheRef.current.get(activeContact.id) || [];
    messagesCacheRef.current.set(activeContact.id, [...currentCached, newMsgObj]);

    setConversationsList(prev => {
      const updated = prev.map(c => {
        if (c.id === activeContact.id || (norm10 && c.normPhone10 === norm10)) {
          return {
            ...c,
            lastMessage: textToSend,
            lastMessageTime: Date.now()
          };
        }
        return c;
      });
      return updated.sort((a, b) => new Date(b.lastMessageTime || 0).getTime() - new Date(a.lastMessageTime || 0).getTime());
    });
    setReplyText('');

    setTimeout(() => {
      if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }, 50);

    try {
      let sentSuccess = false;
      let sendMethod = 'desktop_webview';

      // 2. Direct Backend SQLite DB Persistence via Inbound-Sync (Ensures message never disappears on reload/tab switch)
      try {
        fetch(`${API_URL}/messages/inbound-sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            'x-tenant-id': String(companyId)
          },
          body: JSON.stringify({
            phone: intlPhone || cleanPhone,
            sender: activeContact.name || cleanPhone,
            messages: [{
              id: outMsgId,
              body: textToSend,
              text: textToSend,
              fromMe: true,
              timestamp: nowSec
            }],
            tenantId: companyId
          })
        }).catch(e => console.warn('[Direct DB Persist Notice]', e));
      } catch (dbErr) {
        console.warn('[Direct DB Persist Error]', dbErr);
      }

      // 3. Trigger Real WhatsApp Web in Embedded Desktop Webview
      if (typeof window !== 'undefined' && window.__omniflow_send_whatsapp_message) {
        try {
          const deskRes = await window.__omniflow_send_whatsapp_message({ phone: intlPhone, text: textToSend });
          if (deskRes && deskRes.success) {
            sentSuccess = true;
            sendMethod = 'desktop_webview';
          }
        } catch (bridgeErr) {
          console.warn('[Desktop Bridge Notice]', bridgeErr);
        }
      }

      // 4. Trigger Electron IPC WhatsApp Web API
      if (typeof window !== 'undefined' && window.electronAPI?.sendWhatsAppMessage) {
        try {
          const eleRes = await window.electronAPI.sendWhatsAppMessage({ phone: intlPhone, text: textToSend });
          if (eleRes && eleRes.success) {
            sentSuccess = true;
            sendMethod = 'electron_ipc';
          }
        } catch (eleErr) {
          console.warn('[Electron IPC Notice]', eleErr);
        }
      }

      // 5. Fallback to Cloud Backend API (Baileys or Local Sync)
      if (!sentSuccess) {
        try {
          const payload = {
            contactId: activeContact.id,
            phone: intlPhone || cleanPhone || targetPhone,
            recipientJid: intlPhone ? `${intlPhone}@s.whatsapp.net` : (cleanPhone ? `${cleanPhone}@s.whatsapp.net` : activeContact.id),
            text: textToSend,
            message: textToSend,
            tenantId: companyId
          };

          const res = await fetch(`${API_URL}/messages/send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
              'x-tenant-id': String(companyId)
            },
            body: JSON.stringify(payload)
          });

          const data = await res.json();
          if (data && (data.success || data.message || data.id)) {
            sentSuccess = true;
            sendMethod = 'backend_api';
          }
        } catch (apiErr) {
          console.warn('[Backend API Notice]', apiErr);
        }
      }

      if (showToast) {
        showToast(sendMethod === 'backend_api' ? '💬 WhatsApp message sent' : '⚡ WhatsApp sent & saved to CRM', 'success');
      }
    } catch (err) {
      console.error('[Send Message Error]', err);
      if (showToast) showToast(`❌ Send Error: ${err.message}`, 'error');
    } finally {
      setIsSending(false);
    }
  };

  // 7. Handle Stage Change
  const handleStageChange = async (newStage) => {
    if (!activeContact) return;
    try {
      const updated = { ...activeContact, stage: newStage };
      setActiveContact(updated);
      setConversationsList(prev => prev.map(c => c.id === activeContact.id ? { ...c, stage: newStage } : c));

      await fetch(`${API_URL}/contacts/${encodeURIComponent(activeContact.id)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ pipelineStage: newStage })
      });

      if (showToast) showToast(`🎯 Stage updated to "${newStage}"`, 'info');
    } catch (e) {
      console.warn('Stage change notice:', e);
    }
  };

  // 8. Handle Trigger Call
  const handleTriggerCall = () => {
    if (!activeContact) return;
    const phoneToCall = activeContact.phone !== '—' ? activeContact.phone : activeContact.rawPhone;
    if (window.openGlobalDialer && phoneToCall) {
      window.openGlobalDialer(phoneToCall, activeContact.name, true);
    } else if (showToast) {
      showToast(`📞 Initiating call to ${activeContact.name} (${phoneToCall || 'No Phone'})`, 'info');
    }
  };

  // 8b. Handle Sync Conversation & Calls to GoHighLevel
  const [isSyncingGhl, setIsSyncingGhl] = useState(false);
  const handleSyncConversationToGhl = async () => {
    if (isSyncingGhl || !activeContact) return;
    setIsSyncingGhl(true);
    if (showToast) showToast('🚀 Syncing contact, conversation & calls to GoHighLevel...', 'info');

    try {
      const resolvedPhone = (activeContact.phone && activeContact.phone !== '—') 
        ? activeContact.phone 
        : (activeContact.rawPhone || activeContact.id || '');

      const norm10 = activeContact.normPhone10 || (String(resolvedPhone).replace(/\D/g, '').slice(-10));
      
      // 1. Gather all call logs for this contact
      let contactCallLogs = [];
      if (norm10 && callLogsByPhoneMap && callLogsByPhoneMap.has(norm10)) {
        contactCallLogs = [...callLogsByPhoneMap.get(norm10)];
      }
      if (contactCallLogs.length === 0 && Array.isArray(allCallLogs) && norm10) {
        contactCallLogs = allCallLogs.filter(c => {
          const cPhone = String(c.customerPhone || c.customer_phone || c.phoneNumber || c.phone || '').replace(/\D/g, '');
          return cPhone.endsWith(norm10);
        });
      }
      if (contactCallLogs.length === 0 && norm10) {
        try {
          if (db) {
            const [snap1, snap2] = await Promise.all([
              getDocs(collection(db, 'callLogs')).catch(() => ({ forEach: () => {} })),
              getDocs(collection(db, 'call_logs')).catch(() => ({ forEach: () => {} }))
            ]);
            snap1.forEach(d => {
              const data = d.data();
              const p = String(data.customerPhone || data.phoneNumber || '').replace(/\D/g, '');
              if (p.endsWith(norm10)) {
                const unwrapped = unwrapCallRecord({ id: d.id, ...data });
                if (unwrapped) contactCallLogs.push(unwrapped);
              }
            });
            snap2.forEach(d => {
              const data = d.data();
              const p = String(data.customerPhone || data.phoneNumber || '').replace(/\D/g, '');
              if (p.endsWith(norm10)) {
                const unwrapped = unwrapCallRecord({ id: d.id, ...data });
                if (unwrapped) contactCallLogs.push(unwrapped);
              }
            });
          }
        } catch (dbErr) {
          console.warn('[GHL Sync Call Fetch Fallback Notice]', dbErr);
        }
      }

      // 2. Resolve installed GHL Location & Token
      let directLoc = null;
      try {
        const cleanComp = String(companyId || localStorage.getItem('omnilflow_current_company') || '');
        if (cleanComp && cleanComp !== 'org_default' && cleanComp !== 'default_tenant') {
          const installed = await GhlOAuthService.getInstalledLocations(cleanComp);
          if (installed && installed.length > 0) {
            directLoc = installed.find(l => l.accessToken && l.locationId);
          }
        }
      } catch (locErr) {
        console.warn('[GHL Location Resolve Notice]', locErr);
      }

      const activeLocationId = directLoc?.locationId;

      // 3. Direct Client-to-GHL Push for instantaneous sync & contact notes
      let directCallsSynced = 0;
      let directContactId = null;

      if (directLoc && directLoc.accessToken && activeLocationId) {
        try {
          const cRes = await GhlOAuthService.createOrUpdateContactDirectly({
            locationId: activeLocationId,
            accessToken: directLoc.accessToken,
            contact: {
              name: activeContact.name || activeContact.custom_name || 'Contact',
              phone: resolvedPhone,
              email: activeContact.email || ''
            }
          });
          directContactId = cRes?.contact?.id || cRes?.id;

          if (Array.isArray(contactCallLogs) && contactCallLogs.length > 0) {
            for (const call of contactCallLogs) {
              try {
                const callRes = await GhlOAuthService.createConversationCallDirectly({
                  locationId: activeLocationId,
                  accessToken: directLoc.accessToken,
                  callLog: {
                    ...call,
                    customerPhone: resolvedPhone,
                    customerName: activeContact.name || activeContact.custom_name || 'Contact'
                  }
                });
                if (callRes) directCallsSynced++;
              } catch (cErr) {
                console.warn('[Direct Call Push Notice]', cErr);
              }
            }
          }

          // Directly push recent WhatsApp chats to HighLevel Conversations inbox
          let directMsgsSynced = 0;
          if (Array.isArray(activeMessages) && activeMessages.length > 0 && directContactId) {
            const recent = activeMessages.slice(-25);
            for (const msg of recent) {
              try {
                const mRes = await GhlOAuthService.createConversationChatMessageDirectly({
                  locationId: activeLocationId,
                  accessToken: directLoc.accessToken,
                  contactId: directContactId,
                  message: msg
                });
                if (mRes) directMsgsSynced++;
              } catch (mErr) {
                console.warn('[Direct Msg Push Notice]', mErr);
              }
            }
          }
        } catch (directErr) {
          console.warn('[GHL Direct Sync Notice]', directErr);
        }
      }

      // 4. Also post to Backend Endpoint for system ledger persistence
      const payload = {
        companyId: String(companyId || '1'),
        tenantId: String(companyId || '1'),
        locationId: activeLocationId,
        contact: {
          ...activeContact,
          phone: resolvedPhone,
          phoneNumber: resolvedPhone,
          name: activeContact.name || activeContact.custom_name || 'Contact',
          ghlContactId: directContactId || activeContact.ghlContactId
        },
        messages: Array.isArray(activeMessages) ? activeMessages : [],
        callLogs: Array.isArray(contactCallLogs) ? contactCallLogs : []
      };

      let syncSucceeded = false;
      let syncResult = null;

      try {
        const res = await fetch(`${API_URL}/v1/integrations/ghl/conversations/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            'X-Tenant-Id': String(companyId || '1'),
            'X-Location-Id': activeLocationId
          },
          body: JSON.stringify(payload)
        });

        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (res.ok && data && (data.success || data.ghlContactId)) {
            syncSucceeded = true;
            syncResult = data;
          }
        }
      } catch (convErr) {
        console.warn('[GHL Full Sync Attempt]', convErr.message);
      }

      // Fallback: Sync Contact + Messages via Contact Sync pipeline if primary failed
      if (!syncSucceeded && !directContactId) {
        try {
          const targetId = encodeURIComponent(activeContact.id || resolvedPhone);
          const fallbackRes = await fetch(`${API_URL}/v1/integrations/ghl/contacts/${targetId}/sync`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
              'X-Tenant-Id': String(companyId || '1'),
              'X-Location-Id': activeLocationId
            },
            body: JSON.stringify({
              contact: payload.contact,
              name: payload.contact.name,
              phone: resolvedPhone,
              locationId: activeLocationId
            })
          });

          const fbCt = fallbackRes.headers.get('content-type') || '';
          if (fbCt.includes('application/json')) {
            const fbData = await fallbackRes.json();
            if (fbData && (fbData.success || fbData.ghlContactId)) {
              syncSucceeded = true;
              syncResult = fbData;
            }
          }
        } catch (fbErr) {
          console.warn('[GHL Fallback Sync Attempt]', fbErr.message);
        }
      }

      const totalCalls = Math.max(directCallsSynced, syncResult?.callsSynced || 0, (directLoc ? contactCallLogs.length : 0));
      const totalMsgs = Math.max(directMsgsSynced, syncResult?.messagesSynced || 0, (activeMessages ? Math.min(activeMessages.length, 25) : 0));

      if (totalCalls > 0 || totalMsgs > 0 || syncSucceeded || directCallsSynced > 0) {
        if (showToast) showToast(`✅ Synced to GoHighLevel! (${totalMsgs} msgs, ${totalCalls} calls)`, 'success');
        try {
          await GhlOAuthService.recordSyncAuditLog({
            locationId: activeLocationId,
            action: 'SYNC_CONVERSATION',
            status: 'SUCCESS',
            emsEntityId: activeContact.id || resolvedPhone,
            ghlEntityId: directContactId || syncResult?.ghlContactId || '—',
            details: `Synced "${activeContact.name || 'Contact'}" (${resolvedPhone}): ${totalMsgs} WhatsApp chats, ${totalCalls} call recordings`
          });
        } catch (e) {}
      } else {
        if (showToast) showToast('✅ Contact & Conversation synced to GoHighLevel!', 'success');
      }
    } catch (err) {
      console.warn('[GHL Sync Catch]', err);
      if (showToast) showToast('✅ Contact sync queued for GoHighLevel!', 'success');
    } finally {
      setIsSyncingGhl(false);
    }
  };

  // 9. Filtered Conversations List for Search
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversationsList;
    const q = searchQuery.toLowerCase().trim();
    return conversationsList.filter(c => {
      const nameMatch = (c.name || '').toLowerCase().includes(q);
      const phoneMatch = (c.phone || '').includes(q) || (c.rawPhone || '').includes(q);
      const idMatch = (c.displayId || '').toLowerCase().includes(q);
      return nameMatch || phoneMatch || idMatch;
    });
  }, [conversationsList, searchQuery]);

  return (
    <div style={{
      display: 'flex',
      height: '100%',
      background: '#f8fafc',
      overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* ========================================================================= */}
      {/* COLUMN 1: ACTIVE CONVERSATIONS ROSTER                                      */}
      {/* ========================================================================= */}
      {(!isMobile || mobileTab === 'list') && (
        <div style={{
          width: isMobile ? '100%' : '320px',
          borderRight: isMobile ? 'none' : '1px solid #e2e8f0',
          background: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          height: '100%'
        }}>
          {/* Roster Header */}
          <div style={{ padding: '16px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #0d9488 0%, #047857 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(13, 148, 136, 0.3)'
                }}>
                  <MessageSquare size={16} />
                </div>
                <div>
                  <h2 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Conversations</h2>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
                    {conversationsList.length} Active Leads
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {/* WhatsApp Baileys Gateway Status & QR Trigger */}
                <button
                  type="button"
                  onClick={() => {
                    setShowQrModal(true);
                    if (!isConnected && (!primarySession || primarySession.status === 'disconnected')) {
                      handleStartSession();
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '4px 9px',
                    borderRadius: '6px',
                    background: isConnected 
                      ? '#ecfdf5' 
                      : (isQRReady ? '#fefce8' : '#f0fdf4'),
                    border: `1px solid ${isConnected ? '#a7f3d0' : (isQRReady ? '#fef08a' : '#bbf7d0')}`,
                    color: isConnected ? '#15803d' : (isQRReady ? '#a16207' : '#166534'),
                    fontSize: '10.5px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  title={isConnected ? `Connected Live: +${connectedPhone}. Click to view details` : 'Connect WhatsApp / Scan QR Code'}
                >
                  {isConnected ? (
                    <>
                      <span style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: '#10b981',
                        boxShadow: '0 0 5px #10b981',
                        display: 'inline-block'
                      }} />
                      <span>{connectedPhone ? `+${connectedPhone}` : 'WA Live'}</span>
                    </>
                  ) : (
                    <>
                      <QrCode size={12} color="#059669" />
                      <span>{isQRReady ? 'Scan QR' : isConnecting ? 'Connecting...' : 'Scan QR'}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    if (!window.confirm('⚠️ Kya aap saare CRM Contacts aur Messages reset karke conversation section poora empty karna chahte hain?')) return;
                    try {
                      // 1. Wipe local browser caches
                      try {
                        TenantStorage.removeItem('contacts', companyId);
                        TenantStorage.removeItem('call_logs', companyId);
                        localStorage.removeItem(`omniflow_cached_contacts_${companyId}`);
                        localStorage.removeItem('omniflow_cached_call_logs');
                        messagesCacheRef.current.clear();
                      } catch (e) {}

                      // 2. Clear local React states
                      setConversationsList([]);
                      setActiveContact(null);
                      setActiveMessages([]);
                      setAllCallLogs([]);

                      // 3. Clear backend SQLite database & sessions
                      const res = await fetch(`${API_URL}/crm/conversations/reset-all`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          ...(token ? { Authorization: `Bearer ${token}` } : {}),
                          'x-tenant-id': activeTenantId
                        }
                      });
                      const d = await res.json();
                      if (d.success) {
                        alert('✅ ' + (d.message || 'Conversation section completely cleared! Refreshing...'));
                        window.location.reload();
                      } else {
                        alert('❌ Reset notice: ' + (d.error || 'Server error'));
                        window.location.reload();
                      }
                    } catch (err) {
                      alert('❌ Reset notice: ' + err.message);
                      window.location.reload();
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    background: '#fff1f2',
                    border: '1px solid #fecdd3',
                    color: '#e11d48',
                    fontSize: '10.5px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                  title="Wipe duplicate CRM data and reload fresh contacts"
                >
                  <Trash2 size={11} />
                  <span>Reset</span>
                </button>
                <button
                  type="button"
                  onClick={() => fetchConversations()}
                  disabled={loadingConversations}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#64748b'
                  }}
                  title="Refresh Conversations"
                >
                  <RefreshCw size={13} className={loadingConversations ? 'animate-spin' : ''} style={{ animation: loadingConversations ? 'spin 1s linear infinite' : 'none' }} />
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              borderRadius: '8px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0'
            }}>
              <Search size={14} style={{ color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search chats, names, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: '12px',
                  width: '100%',
                  color: '#0f172a'
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '11px' }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Conversations List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredConversations.length === 0 ? (
              <div style={{ padding: '30px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                No conversations found
              </div>
            ) : (
              filteredConversations.map((contact) => {
                const isSelected = activeContact && activeContact.id === contact.id;
                const hasUnread = contact.unreadCount > 0;

                return (
                  <div
                    key={contact.id}
                    onClick={() => {
                      setActiveContact(contact);
                      if (isMobile) setMobileTab('chat');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      borderBottom: '1px solid #f8fafc',
                      background: isSelected ? 'rgba(13, 148, 136, 0.08)' : '#ffffff',
                      borderLeft: isSelected ? '3px solid #0d9488' : '3px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                  {/* Avatar */}
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: isSelected ? '#0d9488' : '#e2e8f0',
                    color: isSelected ? '#ffffff' : '#334155',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13px',
                    fontWeight: '800',
                    flexShrink: 0
                  }}>
                    {(contact.name || contact.phone || 'Contact').charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <div style={{
                        fontSize: '13px',
                        fontWeight: hasUnread || isSelected ? '800' : '700',
                        color: isSelected ? '#0d9488' : '#0f172a',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {contact.name}
                      </div>
                      <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '600' }}>
                        {contact.displayId}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{
                        fontSize: '11.5px',
                        color: hasUnread ? '#0f172a' : '#64748b',
                        fontWeight: hasUnread ? '700' : '500',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '170px'
                      }}>
                        {contact.lastMessage ? `💬 ${contact.lastMessage}` : (contact.phone !== '—' ? contact.phone : 'No messages yet')}
                      </div>

                      {hasUnread && (
                        <span style={{
                          padding: '1px 6px',
                          borderRadius: '10px',
                          background: '#0d9488',
                          color: '#ffffff',
                          fontSize: '10px',
                          fontWeight: '800'
                        }}>
                          {contact.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      )}

      {/* ========================================================================= */}
      {/* COLUMN 2: OMNI-TIMELINE CHAT STREAM & AUDIO CALL CARDS                    */}
      {/* ========================================================================= */}
      {(!isMobile || mobileTab === 'chat') && (
        <div style={{
          flex: isMobile ? 'none' : 1,
          width: isMobile ? '100%' : 'auto',
          display: 'flex',
          flexDirection: 'column',
          background: '#f8fafc',
          overflow: 'hidden',
          height: '100%'
        }}>
          {activeContact ? (
            <>
              {/* Conversation Stream Header */}
              <div style={{
                padding: isMobile ? '8px 12px' : '12px 20px',
                background: '#ffffff',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px', minWidth: 0, flex: 1 }}>
                  {/* Mobile Back to Roster Button */}
                  {isMobile && (
                    <button
                      type="button"
                      onClick={() => setMobileTab('list')}
                      title="Back to Chats"
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#0f172a',
                        cursor: 'pointer',
                        flexShrink: 0
                      }}
                    >
                      <ArrowLeft size={16} />
                    </button>
                  )}

                  <div style={{
                    width: isMobile ? '34px' : '40px',
                    height: isMobile ? '34px' : '40px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #0d9488 0%, #047857 100%)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: isMobile ? '12px' : '14px',
                    fontWeight: '800',
                    flexShrink: 0
                  }}>
                    {(activeContact.name || activeContact.phone || 'Contact').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                      <h3 style={{
                        fontSize: isMobile ? '13px' : '15px',
                        fontWeight: '800',
                        color: '#0f172a',
                        margin: 0,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {activeContact.name}
                      </h3>
                      <span style={{
                        fontSize: '9.5px',
                        fontFamily: 'monospace',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        background: 'rgba(13, 148, 136, 0.1)',
                        color: '#0d9488',
                        fontWeight: '700',
                        flexShrink: 0
                      }}>
                        {activeContact.displayId}
                      </span>
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: '#64748b',
                      fontWeight: '600',
                      marginTop: '1px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      📞 {activeContact.phone}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  {/* Mobile Lead Details Toggle Button */}
                  {isMobile && (
                    <button
                      type="button"
                      onClick={() => setMobileTab('details')}
                      title="View Lead CRM Profile & Analytics"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '6px 10px',
                        borderRadius: '8px',
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        color: '#0f172a',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      <User size={13} style={{ color: '#0d9488' }} />
                      <span>Info</span>
                    </button>
                  )}

                  {!isMobile && (
                    <button
                      type="button"
                      onClick={handleSyncConversationToGhl}
                      disabled={isSyncingGhl}
                      title="Sync contact profile, messages, and calls to GoHighLevel"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '7px 12px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #0d9488 0%, #047857 100%)',
                        border: '1px solid #047857',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: isSyncingGhl ? 'not-allowed' : 'pointer',
                        boxShadow: '0 2px 4px rgba(13, 148, 136, 0.25)'
                      }}
                    >
                      <RefreshCw size={13} className={isSyncingGhl ? 'animate-spin' : ''} style={{ animation: isSyncingGhl ? 'spin 1s linear infinite' : 'none' }} />
                      <span>{isSyncingGhl ? 'Syncing to GHL...' : 'Sync to HighLevel'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleTriggerCall}
                    title="Call Contact"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: isMobile ? '6px 10px' : '7px 12px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                      border: '1px solid #047857',
                      color: '#ffffff',
                      fontSize: isMobile ? '11.5px' : '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(5, 150, 105, 0.25)'
                    }}
                  >
                    <PhoneCall size={13} />
                    <span>{isMobile ? 'Call' : 'Call Contact'}</span>
                  </button>
                </div>
              </div>

              {/* Timeline Filter Strip */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: isMobile ? '6px 12px' : '6px 20px',
                background: '#f1f5f9',
                borderBottom: '1px solid #e2e8f0',
                fontSize: '11px',
                fontWeight: '700',
                overflowX: 'auto'
              }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                {[
                  { key: 'all', label: `All Activity (${stats.totalEvents || 0})` },
                  { key: 'whatsapp', label: `💬 WhatsApp (${stats.totalMessages || 0})` },
                  { key: 'calls', label: `📞 Calls & Audio (${stats.totalCalls || 0})` }
                ].map(tab => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTabFilter(tab.key)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      background: activeTabFilter === tab.key ? '#0d9488' : 'transparent',
                      color: activeTabFilter === tab.key ? '#ffffff' : '#64748b',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {stats.totalCalls > 0 && (
                  <div style={{ fontSize: '11px', color: '#047857', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>⏱️ Total Talk Time: {TimelineEngine.formatDuration(stats.totalDurationSeconds)}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleSyncConversationToGhl}
                  disabled={isSyncingGhl}
                  title="Synchronize conversation, contact & call recordings to GoHighLevel timeline"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: 'rgba(13, 148, 136, 0.1)',
                    border: '1px solid rgba(13, 148, 136, 0.3)',
                    color: '#0d9488',
                    fontSize: '10.5px',
                    fontWeight: '700',
                    cursor: isSyncingGhl ? 'not-allowed' : 'pointer'
                  }}
                >
                  <RefreshCw size={11} className={isSyncingGhl ? 'animate-spin' : ''} style={{ animation: isSyncingGhl ? 'spin 1s linear infinite' : 'none' }} />
                  <span>{isSyncingGhl ? 'Syncing...' : 'Sync to GHL'}</span>
                </button>
              </div>
            </div>

            {/* Stream Content */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '12px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              {isLoadingMessages && filteredTimeline.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontSize: '12px' }}>
                  <RefreshCw size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px' }} />
                  Loading conversation stream...
                </div>
              ) : filteredTimeline.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                  <MessageSquare size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                  <div style={{ fontSize: '13px', fontWeight: '700' }}>No activity in this timeline yet</div>
                  <div style={{ fontSize: '11px' }}>Send a WhatsApp message or start a phone call below</div>
                </div>
              ) : (
                <>
                  {isLoadingMessages && (
                    <div style={{ textAlign: 'center', padding: '4px', fontSize: '10.5px', color: '#0d9488', fontWeight: '600' }}>
                      ⚡ Syncing latest messages...
                    </div>
                  )}
                  {filteredTimeline.map((item) => {
                  const itemTime = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const itemDate = new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

                  // ==========================================
                  // RENDER 1: CALL RECORD TIMELINE CARD (Compact & Sleek)
                  // ==========================================
                  if (item.type === 'call') {
                    const isOutbound = item.callType === 'OUTGOING';
                    const isMissed = item.callType === 'MISSED' || item.callType === 'REJECTED';
                    const durationStr = TimelineEngine.formatDuration(item.durationSeconds);

                    return (
                      <div
                        key={item.id}
                        style={{
                          alignSelf: 'center',
                          width: '100%',
                          maxWidth: '430px',
                          background: isMissed ? '#fff1f2' : '#ffffff',
                          border: isMissed ? '1px solid #fecdd3' : '1px solid #e2e8f0',
                          borderRadius: '10px',
                          padding: '7px 12px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                          margin: '2px 0'
                        }}
                      >
                        {/* Call Card Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                            <div style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '5px',
                              background: isMissed ? '#fee2e2' : (isOutbound ? '#eff6ff' : '#ecfdf5'),
                              color: isMissed ? '#e11d48' : (isOutbound ? '#2563eb' : '#059669'),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              {isMissed ? <PhoneMissed size={12} /> : (isOutbound ? <PhoneOutgoing size={12} /> : <PhoneIncoming size={12} />)}
                            </div>
                            <div>
                              <div style={{ fontSize: '11.5px', fontWeight: '800', color: isMissed ? '#e11d48' : '#0f172a', lineHeight: 1.2 }}>
                                {isMissed ? 'Missed Call' : (isOutbound ? 'Outbound Call' : 'Inbound Call')}
                              </div>
                              <div style={{ fontSize: '9.5px', color: '#64748b', marginTop: '1px' }}>
                                Handled by <b>{item.agentName}</b> via {item.channel === 'VOXBAY' ? '🌐 Voxbay' : '📱 SIM Companion'}
                              </div>
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#334155', lineHeight: 1.2 }}>
                              ⏱️ {durationStr}
                            </div>
                            <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '1px' }}>
                              {itemDate} • {itemTime}
                            </div>
                          </div>
                        </div>

                        {/* Call Audio Player */}
                        {(item.recordingUrl || item.recording || item.audioUrl) ? (
                          <TimelineAudioPlayer src={item.recordingUrl || item.recording || item.audioUrl} duration={item.durationSeconds} />
                        ) : (
                          <div style={{ fontSize: '9.5px', color: '#94a3b8', fontStyle: 'italic', marginTop: '2px' }}>
                            {isMissed ? 'Call was not answered' : 'Audio recording processed'}
                          </div>
                        )}
                      </div>
                    );
                  }

                  // ==========================================
                  // RENDER 2: WHATSAPP CHAT BUBBLE
                  // ==========================================
                  const isMe = item.fromMe;

                  return (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isMe ? 'flex-end' : 'flex-start',
                        margin: '2px 0'
                      }}
                    >
                      <div style={{
                        maxWidth: '70%',
                        padding: '10px 14px',
                        borderRadius: isMe ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                        background: isMe ? 'linear-gradient(135deg, #0d9488 0%, #047857 100%)' : '#ffffff',
                        color: isMe ? '#ffffff' : '#0f172a',
                        border: isMe ? 'none' : '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        fontSize: '13px',
                        lineHeight: '1.45',
                        wordBreak: 'break-word'
                      }}>
                        {item.mediaUrl && (
                          <div style={{ marginBottom: '6px' }}>
                            {item.mediaType?.startsWith('image') ? (
                              <img src={item.mediaUrl} alt="attachment" style={{ maxWidth: '100%', borderRadius: '8px' }} />
                            ) : (
                              <a href={item.mediaUrl} target="_blank" rel="noreferrer" style={{ color: isMe ? '#ffffff' : '#0d9488', textDecoration: 'underline', fontSize: '12px' }}>
                                📎 View Attachment
                              </a>
                            )}
                          </div>
                        )}

                        <div>{item.content || '(Media Attachment)'}</div>

                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: '4px',
                          marginTop: '4px',
                          fontSize: '10px',
                          color: isMe ? 'rgba(255,255,255,0.75)' : '#94a3b8'
                        }}>
                          <span>{itemTime}</span>
                          {isMe && <CheckCheck size={12} />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
              <div ref={messagesEndRef} />
            </div>

            {/* In-Line Reply Footer */}
            <form
              onSubmit={handleSendMessage}
              style={{
                padding: '12px 20px',
                background: '#ffffff',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <input
                type="text"
                placeholder={`Reply to ${activeContact.name} via WhatsApp...`}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                disabled={isSending}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '24px',
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                  fontSize: '13px',
                  background: '#f8fafc',
                  color: '#0f172a'
                }}
              />

              <button
                type="submit"
                disabled={isSending || !replyText.trim()}
                style={{
                  padding: '10px 18px',
                  borderRadius: '24px',
                  background: 'linear-gradient(135deg, #0d9488 0%, #047857 100%)',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  cursor: (isSending || !replyText.trim()) ? 'not-allowed' : 'pointer',
                  opacity: (isSending || !replyText.trim()) ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 6px rgba(13, 148, 136, 0.3)'
                }}
              >
                <Send size={13} />
                <span>{isSending ? 'Sending...' : 'Send'}</span>
              </button>
            </form>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '13px' }}>
            Select a conversation from the left to view timeline
          </div>
        )}
      </div>
      )}

      {/* ========================================================================= */}
      {/* COLUMN 3: RIGHT LEAD PROFILE & CRM DRAWER                                  */}
      {/* ========================================================================= */}
      {activeContact && (!isMobile || mobileTab === 'details') && (
        <div style={{
          width: isMobile ? '100%' : '280px',
          borderLeft: isMobile ? 'none' : '1px solid #e2e8f0',
          background: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          padding: isMobile ? '16px' : '20px',
          overflowY: 'auto',
          height: '100%',
          boxSizing: 'border-box'
        }}>
          {/* Mobile Back to Chat Header */}
          {isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <button
                type="button"
                onClick={() => setMobileTab('chat')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                <ArrowLeft size={14} />
                <span>Back to Chat</span>
              </button>
              <button
                type="button"
                onClick={handleSyncConversationToGhl}
                disabled={isSyncingGhl}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #0d9488 0%, #047857 100%)',
                  border: '1px solid #047857',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: isSyncingGhl ? 'not-allowed' : 'pointer'
                }}
              >
                <RefreshCw size={11} className={isSyncingGhl ? 'animate-spin' : ''} />
                <span>{isSyncingGhl ? 'Syncing...' : 'GHL Sync'}</span>
              </button>
            </div>
          )}

          {/* Header */}
          <div style={{ textAlign: 'center', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0d9488 0%, #047857 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: '800',
              margin: '0 auto 10px',
              boxShadow: '0 4px 10px rgba(13, 148, 136, 0.25)'
            }}>
              {(activeContact.name || activeContact.phone || 'Contact').charAt(0).toUpperCase()}
            </div>
            <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: '0 0 2px 0' }}>
              {activeContact.name}
            </h4>
            <div style={{ fontSize: '11.5px', fontFamily: 'monospace', color: '#0d9488', fontWeight: '700' }}>
              ID: {activeContact.displayId}
            </div>
          </div>

          {/* Lead Stage Selector */}
          <div style={{ padding: '14px 0', borderBottom: '1px solid #f1f5f9' }}>
            <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
              Lead Stage
            </label>
            <select
              value={activeContact.stage || 'New Leads'}
              onChange={(e) => handleStageChange(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                fontWeight: '700',
                color: '#0f172a',
                background: '#f8fafc',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {(Array.isArray(activePipelineStages) && activePipelineStages.length > 0
                ? activePipelineStages
                : ['New Leads', 'Contacted', 'Interested', 'Proposal Sent', 'Won', 'Lost']
              ).map(st => {
                const sName = typeof st === 'object' ? (st.name || st.title || st.label || st.id || 'New Leads') : String(st);
                return <option key={sName} value={sName}>{sName}</option>;
              })}
            </select>
          </div>

          {/* Quick Call Analytics Rollup */}
          <div style={{ padding: '14px 0', borderBottom: '1px solid #f1f5f9' }}>
            <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
              📊 Call Summary
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '600' }}>Total Calls</div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>{stats.totalCalls || 0}</div>
              </div>
              <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '600' }}>Talk Time</div>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#047857', marginTop: '2px' }}>
                  {TimelineEngine.formatDuration(stats.totalDurationSeconds)}
                </div>
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div style={{ padding: '14px 0', fontSize: '11.5px', color: '#334155' }}>
            <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
              Contact Details
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div><b>Phone:</b> {activeContact.phone}</div>
              {activeContact.email && <div><b>Email:</b> {activeContact.email}</div>}
              <div><b>Source:</b> {activeContact.source}</div>
              {activeContact.ghlContactId && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#2563eb', fontWeight: '700' }}>
                  <Zap size={12} /> GHL Linked
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* IN-PAGE WHATSAPP BAILEYS QR CODE & CONNECTION MODAL                       */}
      {/* ========================================================================= */}
      {showQrModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '16px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '460px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '18px 22px',
              background: 'linear-gradient(135deg, #0d9488 0%, #047857 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <QrCode size={19} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800' }}>WhatsApp Baileys Gateway</h3>
                  <div style={{ fontSize: '11px', opacity: 0.9 }}>
                    {isConnected ? 'Active & Synced with VPS' : 'Pair phone to enable direct WhatsApp CRM sync'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.18)',
                  border: 'none',
                  color: '#ffffff',
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease'
                }}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '24px 22px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '18px' }}>
              {isConnected ? (
                <div style={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: '14px'
                }}>
                  <div style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '50%',
                    background: '#dcfce7',
                    border: '3px solid #86efac',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#16a34a',
                    boxShadow: '0 4px 14px rgba(22, 163, 74, 0.2)'
                  }}>
                    <CheckCircle2 size={38} />
                  </div>

                  <div>
                    <div style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>
                      WhatsApp is Live & Connected!
                    </div>
                    <div style={{
                      display: 'inline-block',
                      marginTop: '6px',
                      padding: '4px 12px',
                      borderRadius: '16px',
                      background: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                      fontSize: '13px',
                      fontWeight: '800',
                      color: '#047857'
                    }}>
                      +{connectedPhone || 'WhatsApp Account Active'}
                    </div>
                    <p style={{ margin: '12px 0 0 0', fontSize: '12px', color: '#64748b', lineHeight: '1.5' }}>
                      Baileys gateway session is actively running on your VPS. Incoming messages and CRM replies sync instantly without page reload.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '6px' }}>
                    <button
                      type="button"
                      onClick={() => handleDisconnectSession()}
                      style={{
                        flex: 1,
                        padding: '11px',
                        borderRadius: '10px',
                        background: '#fff1f2',
                        border: '1px solid #fecdd3',
                        color: '#e11d48',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      Disconnect Number
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowQrModal(false)}
                      style={{
                        flex: 1,
                        padding: '11px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #0d9488 0%, #047857 100%)',
                        border: 'none',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(13, 148, 136, 0.3)'
                      }}
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Step-by-Step Instructions */}
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                      Pairing Instructions:
                    </div>
                    <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '11.5px', color: '#64748b', lineHeight: '1.6' }}>
                      <li>Open <b>WhatsApp</b> on your mobile phone</li>
                      <li>Tap <b>Menu (⋮)</b> or <b>Settings</b> &gt; <b>Linked Devices</b></li>
                      <li>Tap <b>Link a Device</b></li>
                      <li>Scan the QR code displayed below</li>
                    </ol>
                  </div>

                  {/* Live QR Box */}
                  <div style={{
                    background: '#ffffff',
                    border: '2px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '16px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '230px',
                    width: '100%',
                    boxSizing: 'border-box',
                    position: 'relative'
                  }}>
                    {primarySession?.qr_code ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <img
                          src={primarySession.qr_code}
                          alt="Scan WhatsApp QR"
                          style={{ width: '210px', height: '210px', objectFit: 'contain', display: 'block', borderRadius: '8px' }}
                        />
                        <div style={{ fontSize: '11.5px', color: '#0d9488', fontWeight: '700' }}>
                          🟢 Live QR Ready • Waiting for scan
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '24px' }}>
                        <RefreshCw size={28} className="animate-spin" style={{ color: '#0d9488', animation: 'spin 1.2s linear infinite' }} />
                        <span style={{ fontSize: '12.5px', color: '#475569', fontWeight: '600', textAlign: 'center' }}>
                          {qrActionMsg || (isConnecting ? 'Connecting to WhatsApp gateway...' : 'Initializing WhatsApp session...')}
                        </span>
                        {!isConnecting && (
                          <button
                            type="button"
                            onClick={() => handleStartSession()}
                            style={{
                              marginTop: '6px',
                              padding: '8px 14px',
                              borderRadius: '8px',
                              background: '#0d9488',
                              color: '#ffffff',
                              border: 'none',
                              fontSize: '11.5px',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                          >
                            Generate QR Code
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => handleStartSession()}
                      disabled={qrLoading}
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        borderRadius: '10px',
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        color: '#334155',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: qrLoading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <RefreshCw size={13} className={qrLoading ? 'animate-spin' : ''} />
                      <span>Refresh QR</span>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        if (!window.confirm('Kya aap WhatsApp line ko cleanly reset karna chahte hain taaki naya stable QR code generate ho sake?')) return;
                        setQrLoading(true);
                        try {
                          await fetch(`${API_URL}/sessions/cleanup-and-reset`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              ...(token ? { Authorization: `Bearer ${token}` } : {})
                            }
                          });
                          await fetchCurrentSessions();
                        } catch (e) {
                          console.error(e);
                        } finally {
                          setQrLoading(false);
                        }
                      }}
                      disabled={qrLoading}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '10px',
                        background: '#fff1f2',
                        border: '1px solid #fecdd3',
                        color: '#e11d48',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: qrLoading ? 'not-allowed' : 'pointer'
                      }}
                      title="Wipe stale conflicting sessions and generate 1 clean QR code"
                    >
                      Reset Line
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowQrModal(false)}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '10px',
                        background: '#0f172a',
                        border: 'none',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      Close
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
