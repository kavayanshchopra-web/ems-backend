/**
 * UNIFIED CONVERSATIONS & OMNI-TIMELINE HUB (GHL STYLE)
 * Consolidates WhatsApp Chats, Multi-Call Recordings, and Lead Interactions into a single continuous stream
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  AlertCircle,
  AlertTriangle,
  Pin,
  Archive,
  MoreVertical,
  CornerUpLeft,
  Copy,
  Star,
  Ban,
  Wallet
} from 'lucide-react';
import { TimelineEngine } from '../../core/engines/TimelineEngine';
import { normalizePhone10, formatPhoneDisplay, toE164Phone, isSamePhone } from '../../core/utils/phoneUtils';
import { db } from '../../firebase';
import { collection, onSnapshot, doc, getDocs, setDoc, query, where, deleteDoc } from 'firebase/firestore';
import GhlOAuthService from '../../core/services/ghlOAuthService';
import { isSandboxEnvironment, SupabaseSandboxService } from '../../core/services/supabaseSandboxService';
import TenantStorage from '../../core/services/TenantStorage';
import WhatsAppTemplateService, { DEFAULT_WHATSAPP_TEMPLATES } from '../../core/services/whatsAppTemplateService';
import frontendWalletService from '../../core/services/universalWalletService';

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

// Native WhatsApp-style crisp incoming message chime
function playWhatsAppChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(1400, now + 0.08);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.start(now);
    osc.stop(now + 0.3);
  } catch (e) {}
}

// WhatsApp-style relative time formatter for roster
function formatWhatsAppTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date((timestamp < 10000000000) ? timestamp * 1000 : timestamp);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
}

// Robust timestamp normalizer ensuring seconds or milliseconds are uniform
function normalizeTs(t) {
  if (!t) return Math.floor(Date.now() / 1000);
  if (typeof t === 'object' && t !== null) {
    return t.low ?? t.toNumber?.() ?? Math.floor(Date.now() / 1000);
  }
  const n = Number(t);
  if (isNaN(n) || n === 0) return Math.floor(Date.now() / 1000);
  return n > 10000000000 ? Math.floor(n / 1000) : n;
}

// WhatsApp Business Color-Coded Labels
const WHATSAPP_LABELS = {
  new_lead: { id: 'new_lead', name: 'New Lead', color: '#0284c7', bg: '#e0f2fe' },
  contacted: { id: 'contacted', name: 'Contacted', color: '#6366f1', bg: '#e0e7ff' },
  qualified: { id: 'qualified', name: 'Qualified', color: '#16a34a', bg: '#dcfce7' },
  pending_payment: { id: 'pending_payment', name: 'Pending Payment', color: '#ea580c', bg: '#ffedd5' },
  customer: { id: 'customer', name: 'Customer', color: '#0d9488', bg: '#ccfbf1' },
  archived: { id: 'archived', name: 'Archived', color: '#64748b', bg: '#f1f5f9' }
};

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
    if (!secs || isNaN(secs) || !isFinite(secs)) return '0:00';
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
    if (audioRef.current && isFinite(audioRef.current.currentTime)) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current && audioRef.current.duration && !isNaN(audioRef.current.duration) && isFinite(audioRef.current.duration)) {
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
  let numericCompanyId = Number(authUser?.tenant_id || authUser?.company_id);
  if (isNaN(numericCompanyId) || numericCompanyId <= 0) {
    numericCompanyId = Number(authUser?.companyId);
  }
  if (isNaN(numericCompanyId) || numericCompanyId <= 0) {
    numericCompanyId = Number(authUser?.tenantId);
  }
  if (isNaN(numericCompanyId) || numericCompanyId <= 0) {
    try {
      const storedComp = localStorage.getItem('omnilflow_current_company');
      if (storedComp && !isNaN(Number(storedComp)) && Number(storedComp) > 0) {
        numericCompanyId = Number(storedComp);
      }
    } catch (e) {}
  }
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
        profile_pic_url: c.profile_pic_url || c.profilePic || c.photoUrl || null,
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
        const mergedUnread = Math.max(existing.unreadCount || 0, rec.unreadCount || 0);

        dedupMap.set(key, {
          ...existing,
          ...rec,
          name: betterName,
          phone: (existing.phone && existing.phone !== '—') ? existing.phone : formattedPhone,
          profile_pic_url: rec.profile_pic_url || existing.profile_pic_url || null,
          lastMessage: rec.lastMessage || existing.lastMessage,
          lastMessageTime: Math.max(new Date(existing.lastMessageTime || 0).getTime(), new Date(rec.lastMessageTime || 0).getTime()),
          unreadCount: mergedUnread,
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

  // 1. Master State strictly scoped to companyId and Model A role (with 0ms instant cached load)
  const rosterCacheKey = isOwnerOrAdmin 
    ? 'cached_conversations_roster' 
    : `cached_conversations_roster_${userEmpId || userEmail || 'emp'}`;

  const [conversationsList, setConversationsList] = useState(() => {
    try {
      const cachedRoster = TenantStorage.getItem(rosterCacheKey, companyId, null);
      if (Array.isArray(cachedRoster) && cachedRoster.length > 0) {
        const scoped = isOwnerOrAdmin ? cachedRoster : cachedRoster.filter(c => isContactVisibleToUser(c));
        return scoped;
      }
      const cached = TenantStorage.getItem('contacts', companyId, null);
      if (Array.isArray(cached) && cached.length > 0) {
        const scoped = cached.filter(c => isContactVisibleToUser(c));
        const formatted = formatContactRoster(scoped);
        if (formatted.length > 0) return formatted;
      }
      if (Array.isArray(propContacts) && propContacts.length > 0) {
        const scoped = propContacts.filter(c => isContactVisibleToUser(c));
        return formatContactRoster(scoped);
      }
    } catch (e) {}
    return [];
  });

  const [activeContact, setActiveContact] = useState(() => {
    try {
      const cachedRoster = TenantStorage.getItem(rosterCacheKey, companyId, null);
      if (Array.isArray(cachedRoster) && cachedRoster.length > 0) {
        const scoped = isOwnerOrAdmin ? cachedRoster : cachedRoster.filter(c => isContactVisibleToUser(c));
        if (scoped.length > 0) return scoped[0];
      }
      let source = [];
      if (Array.isArray(propContacts) && propContacts.length > 0) {
        source = propContacts;
      } else {
        source = TenantStorage.getItem('contacts', companyId, []) || [];
      }
      const scoped = (source || []).filter(c => isContactVisibleToUser(c));
      const roster = formatContactRoster(scoped);
      return roster.length > 0 ? roster[0] : null;
    } catch (e) {}
    return null;
  });

  const [activeMessages, setActiveMessages] = useState(() => {
    try {
      const cachedRoster = TenantStorage.getItem(rosterCacheKey, companyId, null);
      const scoped = isOwnerOrAdmin ? (cachedRoster || []) : (cachedRoster || []).filter(c => isContactVisibleToUser(c));
      const initialContactId = scoped?.[0]?.id;
      if (initialContactId) {
        const stored = TenantStorage.getItem('cached_chat_msgs_' + initialContactId, companyId);
        if (Array.isArray(stored) && stored.length > 0) return stored;
      }
    } catch (e) {}
    return [];
  });
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
  const [rosterTab, setRosterTab] = useState('all'); // 'all' | 'unread' | 'archived'
  const [pinnedContacts, setPinnedContacts] = useState(() => {
    try {
      return TenantStorage.getItem('pinned_contacts', companyId, []) || [];
    } catch (e) {
      return [];
    }
  });
  const [activeContactMenuId, setActiveContactMenuId] = useState(null);
  const [replyingToMessage, setReplyingToMessage] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [hoveredMsgId, setHoveredMsgId] = useState(null);
  const [activeReactionPickerId, setActiveReactionPickerId] = useState(null);
  const [typingStatus, setTypingStatus] = useState({});
  const typingTimerRef = useRef(null);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);
  const [mobileTab, setMobileTab] = useState('list'); // 'list' | 'chat' | 'details'

  // Auto-expire typing presence after 4.5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingStatus(prev => {
        let changed = false;
        const next = { ...prev };
        for (const k in next) {
          if (now - (next[k]?.timestamp || 0) > 4500) {
            delete next[k];
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const getContactTyping = (c) => {
    if (!c) return null;
    const cNorm = c.normPhone10 || normalizePhone10(c.phone || c.rawPhone || c.id || '');
    return typingStatus[c.id]?.status || 
      (cNorm && typingStatus[cNorm]?.status) || 
      (c.phone && typingStatus[c.phone]?.status) || 
      (c.rawPhone && typingStatus[c.rawPhone]?.status) || null;
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(typeof window !== 'undefined' && window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle mobile browser/hardware back button navigation seamlessly
  useEffect(() => {
    if (!isMobile) return;
    const handlePopState = () => {
      setMobileTab(prev => {
        if (prev === 'details') return 'chat';
        if (prev === 'chat') return 'list';
        return prev;
      });
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isMobile]);

  const switchMobileTab = useCallback((tab) => {
    if (isMobile && tab !== mobileTab) {
      if (tab !== 'list') {
        window.history.pushState({ emsMobileTab: tab }, '');
      }
    }
    setMobileTab(tab);
  }, [isMobile, mobileTab]);
  const [searchQuery, setSearchQuery] = useState('');
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');

  // Category A: Chat Bar / Composer State
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioRecordingTime, setAudioRecordingTime] = useState(0);
  const audioRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioTimerRef = useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showTemplatesPicker, setShowTemplatesPicker] = useState(false);
  const [templatesSearch, setTemplatesSearch] = useState('');
  const [availableTemplates, setAvailableTemplates] = useState(DEFAULT_WHATSAPP_TEMPLATES || []);
  const [rosterLimit, setRosterLimit] = useState(60);
  const fileInputRef = useRef(null);
  const composerInputRef = useRef(null);

  // Live Wallet & Threshold State
  const [walletInfo, setWalletInfo] = useState({
    balance: null,
    minThreshold: 1000,
    isBelowThreshold: false,
    isDepleted: false,
    status: 'ACTIVE'
  });
  const [isTemplateSelected, setIsTemplateSelected] = useState(false);

  // Load WhatsApp templates for active company
  useEffect(() => {
    try {
      const tpls = WhatsAppTemplateService.getTemplates(companyId);
      setAvailableTemplates(Array.isArray(tpls) && tpls.length > 0 ? tpls : (DEFAULT_WHATSAPP_TEMPLATES || []));
    } catch (e) {
      setAvailableTemplates(DEFAULT_WHATSAPP_TEMPLATES || []);
    }
  }, [companyId]);

  // Sync Live Wallet Status and listen for real-time deductions / top-ups
  useEffect(() => {
    let isMounted = true;
    const loadWallet = async () => {
      try {
        const res = await frontendWalletService.fetchWalletStatus(companyId);
        if (isMounted && res?.wallet) {
          setWalletInfo({
            balance: res.wallet.balance,
            minThreshold: res.wallet.min_threshold,
            isBelowThreshold: res.wallet.is_below_threshold,
            isDepleted: res.wallet.is_depleted,
            status: res.wallet.status
          });
        }
      } catch (e) {
        console.warn('[ConversationsPage] Wallet check notice:', e.message);
      }
    };
    loadWallet();

    const onWalletUpdated = (e) => {
      if (e?.detail) {
        const b = parseFloat(e.detail.balance ?? 0);
        setWalletInfo(prev => ({
          ...prev,
          balance: b,
          isBelowThreshold: b <= prev.minThreshold,
          isDepleted: b <= 0,
          status: e.detail.status || (b <= 0 ? 'DEPLETED' : prev.status)
        }));
      }
    };
    window.addEventListener('ems:wallet_updated', onWalletUpdated);
    return () => {
      isMounted = false;
      window.removeEventListener('ems:wallet_updated', onWalletUpdated);
    };
  }, [companyId]);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const messagesCacheRef = useRef(new Map());
  const activeContactRef = useRef(activeContact);
  useEffect(() => {
    activeContactRef.current = activeContact;
  }, [activeContact]);

  // Instant or smooth scroll to bottom helper
  const scrollToBottom = useCallback((instant = true) => {
    const el = messagesContainerRef.current;
    if (el) {
      if (instant) {
        el.scrollTop = el.scrollHeight;
      } else {
        el.scrollTo({
          top: el.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
    if (messagesEndRef.current) {
      try {
        messagesEndRef.current.scrollIntoView({ behavior: instant ? 'auto' : 'smooth' });
      } catch (e) {}
    }
  }, []);
 
  // Fast local caching helpers for 0ms instant conversation loading & switching
  const getCachedMessages = useCallback((targetContactId) => {
    if (!targetContactId) return null;
    let cached = messagesCacheRef.current.get(targetContactId);
    if (!cached || cached.length === 0) {
      try {
        const stored = TenantStorage.getItem('cached_chat_msgs_' + targetContactId, companyId);
        if (stored && Array.isArray(stored) && stored.length > 0) {
          cached = stored;
          messagesCacheRef.current.set(targetContactId, stored);
        }
      } catch (e) {}
    }
    return (cached && cached.length > 0) ? cached : null;
  }, [companyId]);

  const saveCachedMessages = useCallback((targetContactId, msgs) => {
    if (!targetContactId || !Array.isArray(msgs)) return;
    messagesCacheRef.current.set(targetContactId, msgs);
    try {
      TenantStorage.setItem('cached_chat_msgs_' + targetContactId, msgs.slice(-60), companyId);
    } catch (e) {}
  }, [companyId]);

  // Request native browser desktop notification permissions on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  const isDesktop = typeof window !== 'undefined' && (Boolean(window.electronAPI) || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const customApiBase = typeof window !== 'undefined' ? (import.meta.env.VITE_API_URL || localStorage.getItem('ems_custom_api_url') || '') : '';
  const API_URL = customApiBase 
    ? (customApiBase.endsWith('/api') ? customApiBase : `${customApiBase}/api`)
    : (isDesktop ? 'http://localhost:5000/api' : 'https://api.employeemanagementsystems.com/api');
  const token = typeof window !== 'undefined' ? (localStorage.getItem('omnilflow_token') || localStorage.getItem('token')) : null;

  // Resolve media URLs to full VPS backend endpoints if relative
  const resolveMediaUrl = useCallback((url) => {
    if (!url || typeof url !== 'string') return '';
    if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    const cleanPath = url.startsWith('/') ? url : `/${url}`;
    const base = API_URL.replace(/\/api\/?$/, '');
    return `${base}${cleanPath}`;
  }, [API_URL]);

  // On-demand fetch real WhatsApp profile picture when active contact lacks one
  useEffect(() => {
    if (!activeContact?.id || activeContact.profile_pic_url) return;
    const targetId = activeContact.id;
    let isCurrent = true;

    fetch(`${API_URL}/contacts/${encodeURIComponent(targetId)}/profile-pic`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'x-tenant-id': String(companyId)
      }
    })
      .then(res => res.json())
      .then(data => {
        if (!isCurrent) return;
        if (data?.success && data?.profile_pic_url) {
          const pic = data.profile_pic_url;
          setActiveContact(prev => (prev && prev.id === targetId ? { ...prev, profile_pic_url: pic } : prev));
          setConversationsList(prev => prev.map(c => c.id === targetId ? { ...c, profile_pic_url: pic } : c));
        }
      })
      .catch(() => {});

    return () => { isCurrent = false; };
  }, [activeContact?.id, API_URL, token, companyId]);


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

  // Multi-Agent & Employee WhatsApp Session Scoping
  const myTargetSessionId = useMemo(() => {
    if (isOwnerOrAdmin) return `session_${companyId}_primary`;
    return `session_${companyId}_emp_${userEmpId || 'agent'}`;
  }, [isOwnerOrAdmin, companyId, userEmpId]);

  // Employee's own dedicated personal work session
  const myDedicatedSession = useMemo(() => {
    if (!Array.isArray(localSessions) || localSessions.length === 0) return null;
    return localSessions.find(s => s.id === myTargetSessionId) || null;
  }, [localSessions, myTargetSessionId]);

  // Company primary session (official company line)
  const companyPrimarySession = useMemo(() => {
    if (!Array.isArray(localSessions) || localSessions.length === 0) return null;
    // 1. Primary session that is actually connected
    const connectedPrimary = localSessions.find(s => (s.id === `session_${companyId}_primary` || s.id?.includes('_primary')) && s.status === 'connected');
    if (connectedPrimary) return connectedPrimary;
    // 2. Any company session that is connected
    const anyConnected = localSessions.find(s => s.status === 'connected');
    if (anyConnected) return anyConnected;
    // 3. Fallbacks if nothing is currently connected
    return localSessions.find(s => s.id === `session_${companyId}_primary`)
      || localSessions.find(s => s.id?.includes('_primary'))
      || localSessions[0] || null;
  }, [localSessions, companyId]);

  // primarySession: The active session used for outbound messaging
  // - If employee has linked their own dedicated session: use employee's dedicated session!
  // - If employee has NOT linked their own phone yet: gracefully fallback to company's connected line!
  // - If owner/admin: always use company official primary line or any live connected session.
  const primarySession = useMemo(() => {
    if (isOwnerOrAdmin) {
      if (companyPrimarySession && companyPrimarySession.status === 'connected') return companyPrimarySession;
      const anyConnected = localSessions.find(s => s.status === 'connected');
      if (anyConnected) return anyConnected;
      return companyPrimarySession || localSessions[0] || null;
    }
    // Employee logic:
    if (myDedicatedSession && myDedicatedSession.status === 'connected') {
      return myDedicatedSession;
    }
    if (companyPrimarySession && companyPrimarySession.status === 'connected') {
      return companyPrimarySession;
    }
    const anyConnected = localSessions.find(s => s.status === 'connected');
    if (anyConnected) return anyConnected;
    return myDedicatedSession || companyPrimarySession || localSessions[0] || null;
  }, [isOwnerOrAdmin, myDedicatedSession, companyPrimarySession, localSessions]);

  // activeQrSession: The session targeted in the QR pairing modal
  // - Owner pairs Company Official WhatsApp Line
  // - Employee pairs their dedicated personal work WhatsApp Line
  const activeQrSession = useMemo(() => {
    if (isOwnerOrAdmin) return companyPrimarySession;
    return myDedicatedSession;
  }, [isOwnerOrAdmin, companyPrimarySession, myDedicatedSession]);

  const isConnected = primarySession?.status === 'connected';
  const isDedicatedConnected = myDedicatedSession?.status === 'connected';
  const isCompanyConnected = companyPrimarySession?.status === 'connected';

  const isModalConnected = activeQrSession?.status === 'connected';
  const isModalQRReady = (activeQrSession?.status === 'qr_ready' || Boolean(activeQrSession?.qr_code)) && Boolean(activeQrSession?.qr_code);
  const isModalConnecting = activeQrSession?.status === 'connecting' || qrLoading;

  const connectedPhone = primarySession?.phone_number || primarySession?.phoneNumber || '';
  const myDedicatedPhone = myDedicatedSession?.phone_number || myDedicatedSession?.phoneNumber || '';
  const companyPhone = companyPrimarySession?.phone_number || companyPrimarySession?.phoneNumber || '';
  const modalConnectedPhone = activeQrSession?.phone_number || activeQrSession?.phoneNumber || '';
  const isQRReady = (primarySession?.status === 'qr_ready' || Boolean(primarySession?.qr_code)) && Boolean(primarySession?.qr_code);
  const isConnecting = primarySession?.status === 'connecting' || qrLoading;

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
        let data = await res.json();
        if (Array.isArray(data)) {
          // If employee dedicated session is not found under tenant query, fallback to global list to pick up active employee line
          if (!isOwnerOrAdmin && myTargetSessionId && !data.some(s => s.id === myTargetSessionId)) {
            try {
              const fallbackRes = await fetch(`${API_URL}/sessions`, {
                headers: {
                  'Content-Type': 'application/json',
                  ...(token ? { Authorization: `Bearer ${token}` } : {})
                }
              });
              if (fallbackRes.ok) {
                const allData = await fallbackRes.json();
                const mySess = (allData || []).find(s => s.id === myTargetSessionId);
                if (mySess) {
                  data = [...data, mySess];
                }
              }
            } catch (e) {}
          }
          setLocalSessions(data);
          return data;
        }
      }
    } catch (e) {
      console.warn('[ConversationsPage] Sessions fetch notice:', e);
    }
    return [];
  };

  const startingSessionRef = useRef(false);

  // Poll sessions while QR modal is open and auto-request QR once safely
  useEffect(() => {
    if (!showQrModal) return;

    fetchCurrentSessions();

    // Auto-request QR code if not already connected and no live QR code ready
    const isBusy = isConnected || isQRReady || isConnecting;
    if (!isBusy && !startingSessionRef.current) {
      startingSessionRef.current = true;
      handleStartSession(null, false).finally(() => {
        setTimeout(() => { startingSessionRef.current = false; }, 4000);
      });
    }

    const interval = setInterval(() => {
      fetchCurrentSessions();
    }, 2500);

    return () => clearInterval(interval);
  }, [showQrModal, isConnected, isQRReady, isConnecting]);

  // Start or trigger QR code generation for WhatsApp session
  const handleStartSession = async (sessId, force = false) => {
    setQrLoading(true);
    setQrActionMsg('Generating secure WhatsApp QR Code...');
    try {
      const tenantToUse = String(companyId || activeTenantId || '1');
      const reqHeaders = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'x-tenant-id': tenantToUse
      };

      let currentList = localSessions;
      if (!currentList || currentList.length === 0) {
        currentList = await fetchCurrentSessions();
      }

      let targetId = sessId;
      if (!targetId) {
        targetId = isOwnerOrAdmin
          ? (companyPrimarySession?.id || `session_${companyId}_primary`)
          : myTargetSessionId;
      }

      const exists = (currentList || []).some(s => s.id === targetId);
      if (!exists) {
        // Create session in backend if not yet in database
        const phoneLabel = targetId.includes('_emp_')
          ? `Employee Line (${userName || userEmpId || 'Agent'})`
          : 'Primary WhatsApp Line';
        const createRes = await fetch(`${API_URL}/sessions`, {
          method: 'POST',
          headers: reqHeaders,
          body: JSON.stringify({ id: targetId, phoneName: phoneLabel, tenantId: companyId })
        });
        if (createRes.ok) {
          const created = await createRes.json();
          currentList = [...(currentList || []), created];
          setLocalSessions(currentList);
        }
      }

      if (targetId) {
        const url = `${API_URL}/sessions/start/${targetId}${force ? '?force=true' : ''}`;
        let startRes = await fetch(url, {
          method: 'POST',
          headers: reqHeaders,
          body: JSON.stringify({ force: Boolean(force), tenantId: companyId })
        });
        if (!startRes.ok && targetId.includes('_emp_')) {
          // Fallback retry without tenant restriction header in case session was registered under default tenant
          startRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({ force: Boolean(force), tenantId: 1 })
          });
        }
        if (startRes.ok) {
          setQrActionMsg('Connecting to Cloud Gateway... QR will appear momentarily.');
        }
      }
      setTimeout(fetchCurrentSessions, 600);
      setTimeout(fetchCurrentSessions, 1400);
      setTimeout(fetchCurrentSessions, 2600);
    } catch (err) {
      console.error('[Start Session Error]', err);
      setQrActionMsg('Connection notice: ' + err.message);
    } finally {
      setQrLoading(false);
    }
  };

  // Disconnect / Reset active WhatsApp session
  const handleDisconnectSession = async (sessId) => {
    const targetId = sessId || (isOwnerOrAdmin ? (companyPrimarySession?.id || `session_${companyId}_primary`) : myTargetSessionId);
    const confirmPrompt = isOwnerOrAdmin
      ? 'Kya aap Company WhatsApp number ko disconnect karke naya QR code scan karna chahte hain?'
      : 'Kya aap apna WhatsApp number disconnect karke naya QR code scan karna chahte hain?';
    if (!window.confirm(confirmPrompt)) return;
    setQrLoading(true);
    setQrActionMsg('Disconnecting WhatsApp session...');
    try {
      // Optimistically update UI so modal immediately shows connecting state
      setLocalSessions(prev => (prev || []).map(s => s.id === targetId ? { ...s, status: 'connecting', qr_code: null } : s));

      const res = await fetch(`${API_URL}/sessions/reset/${encodeURIComponent(targetId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': String(companyId),
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ tenantId: companyId })
      });

      const data = await res.json().catch(() => ({}));
      const newId = data.newSessionId || targetId;

      await fetchCurrentSessions();
      handleStartSession(newId);

      if (showToast) {
        showToast('WhatsApp number disconnected. Generating fresh QR code...', 'success');
      }
    } catch (err) {
      console.error('[Disconnect Session Error]', err);
      if (showToast) {
        showToast('Disconnect notice: ' + (err.message || 'Server error'), 'error');
      }
      setQrActionMsg('Disconnect failed: ' + err.message);
    } finally {
      setQrLoading(false);
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
          const validPrev = isOwnerOrAdmin ? (prev || []) : (prev || []).filter(c => isContactVisibleToUser(c, allCallLogs));
          validPrev.forEach(c => {
            const key = c.normPhone10 || normalizePhone10(c.phone || c.rawPhone || c.id || '') || c.id;
            map.set(key, c);
          });
          formatted.forEach(c => {
            const key = c.normPhone10 || normalizePhone10(c.phone || c.rawPhone || c.id || '') || c.id;
            if (map.has(key)) {
              const existing = map.get(key);
              map.set(key, {
                ...existing,
                ...c,
                unreadCount: Math.max(existing.unreadCount || 0, c.unreadCount || 0)
              });
            } else {
              map.set(key, c);
            }
          });
          const merged = Array.from(map.values()).sort((a, b) => new Date(b.lastMessageTime || 0).getTime() - new Date(a.lastMessageTime || 0).getTime());
          try {
            TenantStorage.setItem(rosterCacheKey, merged.slice(0, 500), companyId);
          } catch (e) {}
          return merged;
        });
        if (!activeContact) {
          setActiveContact(formatted[0]);
        }
      }
    }
  }, [propContacts, companyId, userRole, userEmpId, userEmail, userName, rosterCacheKey]);

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
                      showToast(`⚡ Live SIM Call linked & synced to CRM! (${call.customerName || call.customerPhone})`, 'success');
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
          profile_pic_url: c.profile_pic_url || c.profilePic || null,
          normPhone10: norm,
          unreadCount: c.unread_count || c.unreadCount || 0,
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
            dealValue: c.dealValue || c.deal_value || existing.dealValue,
            unreadCount: Math.max(existing.unreadCount || 0, c.unread_count || c.unreadCount || 0)
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

      setConversationsList(prev => {
        const map = new Map();
        // If employee, strictly only keep contacts from prev that are actually visible/assigned to this user!
        const validPrev = isOwnerOrAdmin ? (prev || []) : (prev || []).filter(c => isContactVisibleToUser(c, allCallLogs));
        validPrev.forEach(c => {
          const key = c.normPhone10 || normalizePhone10(c.phone || c.rawPhone || c.id || '') || c.id;
          map.set(key, c);
        });
        // Merge newly fetched cleanRoster
        cleanRoster.forEach(c => {
          const key = c.normPhone10 || normalizePhone10(c.phone || c.rawPhone || c.id || '') || c.id;
          if (map.has(key)) {
            const existing = map.get(key);
            map.set(key, {
              ...existing,
              ...c,
              unreadCount: Math.max(existing.unreadCount || 0, c.unreadCount || 0)
            });
          } else {
            map.set(key, c);
          }
        });
        const sorted = Array.from(map.values()).sort((a, b) => new Date(b.lastMessageTime || 0).getTime() - new Date(a.lastMessageTime || 0).getTime());
        try {
          TenantStorage.setItem(rosterCacheKey, sorted.slice(0, 500), companyId);
        } catch (e) {}
        return sorted;
      });

      if (!isOwnerOrAdmin) {
        setActiveContact(prevActive => {
          if (prevActive && isContactVisibleToUser(prevActive, allCallLogs)) return prevActive;
          return cleanRoster.length > 0 ? cleanRoster[0] : null;
        });
      } else if (!activeContact && cleanRoster.length > 0) {
        setActiveContact(cleanRoster[0]);
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

  // 4. Fetch WhatsApp Messages for Active Contact (with instant cache preview or force-fresh reload)
  const fetchMessagesForContact = useCallback((targetContact, forceFresh = false) => {
    if (!targetContact || !targetContact.id) {
      setActiveMessages([]);
      setIsLoadingMessages(false);
      return;
    }

    const contactId = targetContact.id;
    const cleanPhone = String(targetContact.phone || targetContact.rawPhone || targetContact.phoneNumber || targetContact.id || '').replace(/\D/g, '');
    const norm10 = cleanPhone.length >= 7 ? cleanPhone.slice(-10) : '';

    if (!forceFresh) {
      const cached = getCachedMessages(contactId);
      if (cached && cached.length > 0) {
        setActiveMessages(cached);
        setIsLoadingMessages(false);
        setTimeout(() => scrollToBottom(true), 15);
      } else {
        setActiveMessages([]);
        setIsLoadingMessages(true);
      }
    } else {
      setIsLoadingMessages(true);
    }

    const queryPhone = norm10 ? `91${norm10}` : cleanPhone;
    const abortCtrl = new AbortController();

    // Safety timeout: Ensure loading spinner is NEVER stuck past 3 seconds
    const safetyTimer = setTimeout(() => {
      setIsLoadingMessages(false);
    }, 3000);

    fetch(`${API_URL}/contacts/${encodeURIComponent(contactId)}/messages?limit=100&phone=${encodeURIComponent(queryPhone)}&tenantId=${encodeURIComponent(companyId)}`, {
      signal: abortCtrl.signal,
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        'x-tenant-id': String(companyId),
        'Accept': 'application/json'
      }
    })
      .then(async (res) => {
        if (!res.ok) {
          return { messages: [] };
        }
        return res.json().catch(() => ({ messages: [] }));
      })
      .then(data => {
        clearTimeout(safetyTimer);
        // Ensure this response is still for the currently active contact
        if (activeContactRef.current?.id !== contactId) return;

        const msgs = Array.isArray(data?.messages) ? data.messages : (Array.isArray(data) ? data : []);
        
        setActiveMessages(prev => {
          const map = new Map();
          // First add server messages
          msgs.forEach(m => {
            if (!m) return;
            const key = m.id || `${m.text_content || m.textContent}_${m.timestamp}`;
            map.set(key, m);
          });
          // ONLY preserve recent optimistic messages sent specifically for THIS active contact
          (prev || []).forEach(p => {
            if (!p) return;
            const pContact = String(p.contact_id || p.contactId || '');
            const pPhone = String(p.phone || p.recipient || p.to || '').replace(/\D/g, '').slice(-10);
            const isOptimisticOutbound = Boolean(p.id && (String(p.id).startsWith('wa_out_') || String(p.id).startsWith('temp_')));
            const belongsToThisContact = isOptimisticOutbound ||
              pContact === String(contactId) || 
              (norm10 && pPhone && pPhone === norm10) ||
              (pContact && String(contactId).includes(pContact)) ||
              (contactId && pContact.includes(String(contactId)));
            if (!belongsToThisContact) return;

            const key = p.id || `${p.text_content || p.textContent}_${p.timestamp}`;
            const pTs = normalizeTs(p.timestamp);
            const pText = (p.text_content || p.textContent || '').trim();
            const existsInServer = msgs.some(m => {
              if (!m) return false;
              if (m.id && p.id && m.id === p.id) return true;
              const mText = (m.text_content || m.textContent || '').trim();
              const mTs = normalizeTs(m.timestamp);
              return mText && pText && mText === pText && Math.abs(mTs - pTs) <= 20;
            });
            if (!existsInServer) {
              map.set(key, p);
            }
          });
          const merged = Array.from(map.values()).sort((a, b) => {
            const tA = (a.timestamp && a.timestamp < 10000000000) ? a.timestamp * 1000 : (a.timestamp || 0);
            const tB = (b.timestamp && b.timestamp < 10000000000) ? b.timestamp * 1000 : (b.timestamp || 0);
            return tA - tB;
          });
          saveCachedMessages(contactId, merged);
          return merged;
        });
        setIsLoadingMessages(false);
        setTimeout(() => {
          scrollToBottom(true);
        }, 30);
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.warn('[ConversationsPage] Messages fetch notice:', err.message);
        }
      })
      .finally(() => {
        clearTimeout(safetyTimer);
        setIsLoadingMessages(false);
      });

    return () => {
      clearTimeout(safetyTimer);
      abortCtrl.abort();
    };
  }, [API_URL, token, companyId]);

  useEffect(() => {
    const cleanup = fetchMessagesForContact(activeContact, false);
    return () => {
      if (typeof cleanup === 'function') cleanup();
    };
  }, [activeContact?.id, activeContact?.phone, activeContact?.rawPhone, fetchMessagesForContact]);

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
                saveCachedMessages(activeContact.id, updated);
                return updated;
              });
              setTimeout(() => {
                scrollToBottom(true);
              }, 30);
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
            saveCachedMessages(activeContact.id, sorted);
            return sorted;
          });

          setTimeout(() => {
            scrollToBottom(true);
          }, 30);
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
    const customSocketBase = typeof window !== 'undefined' ? (import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || localStorage.getItem('ems_custom_api_url') || '') : '';
    const SOCKET_BASE = customSocketBase
      ? customSocketBase.replace(/\/api\/?$/, '')
      : (isDesktopEnv ? 'http://localhost:5000' : 'https://api.employeemanagementsystems.com');

    let socket = null;
    try {
      socket = io(SOCKET_BASE, {
        auth: {
          token: token || '',
          tenantId: companyId,
          tenant_id: companyId
        },
        query: {
          token: token || '',
          tenantId: companyId,
          tenant_id: companyId
        },
        transports: ['websocket', 'polling']
      });

      socket.on('connect', () => {
        socket.emit('join_tenant', companyId);
      });

      socket.on('history_synced', (data) => {
        if (data?.tenantId && String(data.tenantId) !== String(companyId) && data.tenantId !== 'default') {
          return;
        }
        fetchConversations();
        if (activeContactRef.current?.id) {
          fetchMessagesForContact(activeContactRef.current, true);
        }
      });

      socket.on('new_message', (msg) => {
        if (!msg) return;
        if (msg.tenantId && String(msg.tenantId) !== String(companyId) && msg.tenantId !== 'default') {
          return;
        }

        // Handle System & WhatsApp History Sync notifications from backend
        if (msg.system_sync) {
          fetchConversations();
          if (activeContactRef.current?.id) {
            fetchMessagesForContact(activeContactRef.current, true);
          }
          return;
        }

        const msgText = (msg.textContent || msg.text_content || msg.text || '').trim();
        const targetId = msg.contactId || msg.contact_id || msg.recipientJid || '';
        const isFromMe = (msg.fromMe === 1 || msg.fromMe === true || msg.from_me === 1 || msg.from_me === true);
        const msgTimestamp = normalizeTs(msg.timestamp || msg.messageTimestamp);
        const curActive = activeContactRef.current;

        // Play crisp native WhatsApp chime on inbound messages
        if (!isFromMe) {
          playWhatsAppChime();

          // Native Desktop / OS Notification if window/tab is hidden or inactive
          if (typeof window !== 'undefined' && document.hidden && 'Notification' in window && Notification.permission === 'granted') {
            try {
              const notifTitle = msg.contactName || (targetId ? `WhatsApp (${String(targetId).slice(-10)})` : 'New WhatsApp Message');
              const notif = new Notification(notifTitle, {
                body: msgText || 'New message received',
                icon: '/favicon.ico'
              });
              notif.onclick = () => {
                window.focus();
                notif.close();
              };
            } catch (e) {}
          }
        }

        if (curActive) {
          const contactPhoneNorm = String(curActive.phone || curActive.rawPhone || curActive.id || '').replace(/\D/g, '').slice(-10);
          const targetNorm = String(targetId || msg.phone || '').replace(/\D/g, '').slice(-10);
          const idMatches = targetId && (targetId === curActive.id || targetId === curActive.phone || targetId === curActive.rawPhone);
          const phoneMatches = contactPhoneNorm && targetNorm && contactPhoneNorm === targetNorm;

          if (idMatches || phoneMatches) {
            const newMsgObj = {
              id: msg.id || `wa_sock_${Date.now()}`,
              textContent: msgText,
              text_content: msgText,
              fromMe: isFromMe,
              from_me: isFromMe ? 1 : 0,
              timestamp: msgTimestamp,
              status: msg.status !== undefined ? msg.status : (isFromMe ? 1 : 0),
              mediaUrl: msg.mediaUrl || msg.media_url || null,
              mediaType: msg.mediaType || msg.media_type || 'text',
              contact_id: curActive.id
            };

            setActiveMessages(prev => {
              const incomingTs = msgTimestamp;
              const existsIndex = prev.findIndex(m => {
                if (m.id && newMsgObj.id && m.id === newMsgObj.id) return true;
                const mTs = normalizeTs(m.timestamp);
                const isSameDirection = (Boolean(m.fromMe) === Boolean(newMsgObj.fromMe) || (m.from_me ? 1 : 0) === (newMsgObj.from_me ? 1 : 0));
                if (!isSameDirection) return false;

                const mText = (m.textContent || m.text_content || '').trim();
                const mIsMedia = Boolean(m.mediaUrl || m.media_url || (m.mediaType && m.mediaType !== 'text'));
                const newIsMedia = Boolean(newMsgObj.mediaUrl || newMsgObj.media_url || (newMsgObj.mediaType && newMsgObj.mediaType !== 'text'));

                // Outbound media deduplication (match temporary wa_out_med_... with confirmed Baileys message)
                if (mIsMedia && newIsMedia && Math.abs(mTs - incomingTs) <= 30) {
                  return true;
                }

                return mText && msgText && mText === msgText && Math.abs(mTs - incomingTs) <= 20;
              });

              if (existsIndex !== -1) {
                const copy = [...prev];
                copy[existsIndex] = {
                  ...copy[existsIndex],
                  ...newMsgObj,
                  id: newMsgObj.id || copy[existsIndex].id
                };
                saveCachedMessages(curActive.id, copy);
                return copy;
              }

              const updated = [...prev, newMsgObj];
              saveCachedMessages(curActive.id, updated);
              return updated;
            });

            setTimeout(() => {
              scrollToBottom(true);
            }, 30);
          }
        }

        // Update live conversation previews, unread count & sort to top
        const isDocFocused = typeof document !== 'undefined' && !document.hidden;

        setConversationsList(prev => {
          const targetNorm = normalizePhone10(targetId || msg.phone || msg.normPhone10 || '');
          let matchFound = false;
          const updated = prev.map(c => {
            const cNorm = c.normPhone10 || normalizePhone10(c.phone || c.rawPhone || c.id || '');
            if (c.id === targetId || (targetNorm && cNorm && targetNorm === cNorm)) {
              matchFound = true;
              const isViewingActiveChat = curActive && (curActive.id === c.id || (cNorm && curActive.normPhone10 === cNorm)) && isDocFocused;
              const newUnread = isFromMe 
                ? (c.unreadCount || 0)
                : (isViewingActiveChat ? 0 : (Number(c.unreadCount) || 0) + 1);

              return {
                ...c,
                lastMessage: msgText || c.lastMessage,
                lastMessageTime: Date.now(),
                unreadCount: newUnread
              };
            }
            return c;
          });

          let resultList = updated;
          if (!matchFound && targetNorm) {
            const candidate = {
              id: msg.contact_id || `91${targetNorm}@s.whatsapp.net`,
              phone: targetNorm,
              rawPhone: targetNorm,
              assigned_to: msg.assigned_to || '',
              tenant_id: companyId
            };
            if (isOwnerOrAdmin || isContactVisibleToUser(candidate, allCallLogs)) {
              const formattedPhone = formatPhoneDisplay(targetNorm);
              const isViewingActiveChat = curActive && (curActive.normPhone10 === targetNorm) && isDocFocused;
              const newContact = {
                id: msg.contact_id || `91${targetNorm}@s.whatsapp.net`,
                name: msg.contactName || formattedPhone,
                phone: formattedPhone,
                rawPhone: targetNorm,
                normPhone10: targetNorm,
                email: '',
                lastMessage: msgText,
                lastMessageTime: Date.now(),
                unreadCount: (isFromMe || isViewingActiveChat) ? 0 : 1,
                stage: 'New Leads',
                source: 'WhatsApp',
                displayId: `CON-${String(prev.length + 1).padStart(4, '0')}`,
                tags: []
              };
              resultList = [newContact, ...updated];
            }
          }

          const sorted = resultList.sort((a, b) => new Date(b.lastMessageTime || 0).getTime() - new Date(a.lastMessageTime || 0).getTime());
          try {
            TenantStorage.setItem(rosterCacheKey, sorted.slice(0, 500), companyId);
          } catch (e) {}
          return sorted;
        });
      });

      socket.on('message_status_update', (data) => {
        if (!data || !data.id) return;
        const curActive = activeContactRef.current;
        setActiveMessages(prev => {
          const mapped = prev.map(m => {
            if (m.id === data.id) {
              return { ...m, status: data.status };
            }
            return m;
          });
          if (curActive?.id) {
            messagesCacheRef.current.set(curActive.id, mapped);
          }
          return mapped;
        });
      });

      socket.on('messages_marked_read', (data) => {
        if (!data || !data.contactId) return;
        const norm = normalizePhone10(data.contactId);
        setConversationsList(prev => prev.map(c => {
          const cNorm = c.normPhone10 || normalizePhone10(c.phone || c.rawPhone || c.id || '');
          if (c.id === data.contactId || (norm && cNorm && norm === cNorm)) {
            return { ...c, unreadCount: 0 };
          }
          return c;
        }));
      });

      socket.on('media_downloaded', (data) => {
        if (!data || !data.id) return;
        const targetMediaUrl = data.mediaUrl || data.media_url;
        if (!targetMediaUrl) return;

        const curActive = activeContactRef.current;
        setActiveMessages(prev => {
          const updated = prev.map(m => {
            if (m.id === data.id) {
              return {
                ...m,
                mediaUrl: targetMediaUrl,
                media_url: targetMediaUrl
              };
            }
            return m;
          });
          if (curActive?.id) {
            messagesCacheRef.current.set(curActive.id, updated);
          }
          return updated;
        });
      });

      socket.on('message_reaction', (data) => {
        if (!data) return;
        const targetId = data.messageId || data.id;
        if (!targetId) return;
        const curActive = activeContactRef.current;
        setActiveMessages(prev => {
          const mapped = prev.map(m => {
            if (m.id === targetId) {
              return { ...m, reactions: data.emoji || data.reaction || null };
            }
            return m;
          });
          if (curActive?.id) {
            messagesCacheRef.current.set(curActive.id, mapped);
          }
          return mapped;
        });
      });

      socket.on('message_deleted', (data) => {
        if (!data || !data.id) return;
        const curActive = activeContactRef.current;
        setActiveMessages(prev => {
          const mapped = prev.map(m => {
            if (m.id === data.id) {
              return {
                ...m,
                is_deleted: 1,
                isDeleted: true,
                textContent: data.text || '🚫 This message was deleted',
                text_content: data.text || '🚫 This message was deleted',
                mediaUrl: null,
                media_url: null
              };
            }
            return m;
          });
          if (curActive?.id) {
            messagesCacheRef.current.set(curActive.id, mapped);
          }
          return mapped;
        });
      });

      socket.on('presence_update', (data) => {
        if (!data || !data.contactId) return;
        const cId = data.contactId;
        const presence = data.presence; // 'composing' | 'recording' | 'paused' | 'available'
        const norm = normalizePhone10(cId);
        setTypingStatus(prev => {
          const next = { ...prev };
          if (presence === 'composing' || presence === 'recording') {
            next[cId] = { status: presence, timestamp: Date.now() };
            if (norm) next[norm] = { status: presence, timestamp: Date.now() };
          } else {
            delete next[cId];
            if (norm) delete next[norm];
          }
          return next;
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
        if (data.status === 'connected') {
          fetchCurrentSessions();
          fetchConversations();
        }
        setLocalSessions(prev => {
          const exists = prev.some(s => String(s.id) === String(data.id));
          if (exists) {
            return prev.map(s => {
              if (String(s.id) === String(data.id)) {
                return {
                  ...s,
                  status: data.status,
                  qr_code: data.status === 'connected' ? null : (data.qr || data.qr_code || s.qr_code),
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
              qr_code: data.status === 'connected' ? null : (data.qr || data.qr_code || null),
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
          TenantStorage.removeItem(rosterCacheKey, companyId);
          TenantStorage.removeItem('cached_conversations_roster', companyId);
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
  }, [token, companyId]);

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

  // Guarantee chat always opens scrolled down to latest message at bottom
  useEffect(() => {
    scrollToBottom(true);
    const t1 = setTimeout(() => scrollToBottom(true), 40);
    const t2 = setTimeout(() => scrollToBottom(true), 120);
    const t3 = setTimeout(() => scrollToBottom(true), 300);
    const t4 = setTimeout(() => scrollToBottom(true), 600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [activeContact?.id, filteredTimeline?.length, scrollToBottom]);

  // Helper to dispatch media attachment or voice note to backend & Baileys
  const sendMediaDirect = async ({ name, type, mediaType, base64, caption = '' }) => {
    if (!activeContact || isSending) return;
    if (walletInfo.balance !== null && walletInfo.balance <= 0) {
      if (showToast) showToast('Wallet balance is empty (₹0.00). Please recharge your wallet to send media.', 'error');
      return;
    }
    const targetPhone = activeContact.rawPhone || activeContact.phone || activeContact.id;
    const cleanPhone = String(targetPhone).replace(/\D/g, '');
    const norm10 = cleanPhone.length >= 7 ? cleanPhone.slice(-10) : '';
    const intlPhone = norm10 ? `91${norm10}` : cleanPhone;
    const outMsgId = `wa_out_med_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const nowSec = Math.floor(Date.now() / 1000);

    setIsSending(true);

    const newMsgObj = {
      id: outMsgId,
      textContent: caption || '',
      text_content: caption || '',
      mediaUrl: base64,
      media_url: base64,
      mediaType: mediaType,
      media_type: mediaType,
      fromMe: true,
      from_me: 1,
      timestamp: nowSec,
      status: 0,
      contact_id: activeContact.id,
      contactId: activeContact.id,
      phone: cleanPhone || targetPhone,
      normPhone10: norm10,
      recipient: intlPhone || cleanPhone
    };

    // Instant Optimistic UI Update
    setActiveMessages(prev => [...prev, newMsgObj]);
    const currentCached = messagesCacheRef.current.get(activeContact.id) || [];
    messagesCacheRef.current.set(activeContact.id, [...currentCached, newMsgObj]);

    setConversationsList(prev => {
      const updated = prev.map(c => {
        if (c.id === activeContact.id || (norm10 && c.normPhone10 === norm10)) {
          return {
            ...c,
            lastMessage: caption || (mediaType === 'audio' ? '🎤 Voice Note' : `📎 ${name}`),
            lastMessageTime: Date.now()
          };
        }
        return c;
      });
      const sorted = updated.sort((a, b) => new Date(b.lastMessageTime || 0).getTime() - new Date(a.lastMessageTime || 0).getTime());
      try {
        TenantStorage.setItem('cached_conversations_roster', sorted.slice(0, 500), companyId);
      } catch (e) {}
      return sorted;
    });

    setTimeout(() => scrollToBottom(false), 30);

    try {
      const payload = {
        sessionId: primarySession?.id || null,
        recipientJid: intlPhone ? `${intlPhone}@s.whatsapp.net` : (cleanPhone ? `${cleanPhone}@s.whatsapp.net` : activeContact.id),
        phone: intlPhone || cleanPhone,
        contactId: activeContact.id,
        mediaType,
        fileName: name,
        fileMimeType: type,
        fileData: base64,
        caption,
        tenantId: companyId
      };

      const res = await fetch(`${API_URL}/messages/send-media`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'x-tenant-id': String(companyId)
        },
        body: JSON.stringify(payload)
      });

      let data = null;
      const resText = await res.text();
      try {
        data = JSON.parse(resText);
      } catch (parseErr) {
        data = { error: resText.includes('Payload Too Large') ? 'File size too large for server. Please upload smaller file.' : (resText.slice(0, 100) || 'Server error') };
      }

      if (res.ok && (data?.success || data?.data)) {
        setActiveMessages(prev => prev.map(m => m.id === outMsgId ? { ...m, status: 1 } : m));
        const senderAttribution = userName ? ` (by: ${userName})` : (userEmail ? ` (by: ${userEmail})` : '');
        frontendWalletService.deductForMessage({
          tenantId: companyId,
          messageType: 'whatsapp_normal_chat',
          count: 1,
          recipientPhone: intlPhone || cleanPhone || targetPhone,
          description: `WhatsApp media attachment to ${activeContact.name || cleanPhone || targetPhone}${senderAttribution}`
        }).then(res => {
          if (res?.success) console.log('[Wallet Deduct Success - Media]:', res);
        }).catch(wErr => console.warn('[Frontend Wallet Deduct Notice]:', wErr.message));
        if (showToast) showToast(mediaType === 'audio' ? '🎤 Voice note sent' : '📎 Attachment sent via WhatsApp', 'success');
      } else {
        setActiveMessages(prev => prev.map(m => m.id === outMsgId ? { ...m, status: 'error' } : m));
        if (showToast) showToast(`❌ ${data?.error || 'Failed to send media'}`, 'error');
      }
    } catch (err) {
      console.error('[Send Media Error]', err);
      setActiveMessages(prev => prev.map(m => m.id === outMsgId ? { ...m, status: 'error' } : m));
      if (showToast) showToast(`❌ Media Send Error: ${err.message}`, 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      if (showToast) showToast('File size must be under 25MB', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    let mediaType = 'document';
    if (file.type.startsWith('image/')) mediaType = 'image';
    else if (file.type.startsWith('video/')) mediaType = 'video';
    else if (file.type.startsWith('audio/')) mediaType = 'audio';

    // Fast image optimization: Compress images client-side before base64 for blazing fast sub-second sends
    if (mediaType === 'image' && file.type !== 'image/gif') {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const maxDimension = 1600;
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.84);

        setSelectedAttachment({
          file,
          name: file.name.replace(/\.[^/.]+$/, "") + ".jpg",
          size: Math.round(compressedBase64.length * 0.75),
          type: 'image/jpeg',
          previewUrl: compressedBase64,
          base64: compressedBase64,
          mediaType: 'image'
        });
        composerInputRef.current?.focus();
      };
      img.onerror = () => {
        const reader = new FileReader();
        reader.onload = () => {
          setSelectedAttachment({
            file,
            name: file.name,
            size: file.size,
            type: file.type || 'image/jpeg',
            previewUrl: reader.result,
            base64: reader.result,
            mediaType: 'image'
          });
          composerInputRef.current?.focus();
        };
        reader.readAsDataURL(file);
      };
      img.src = objectUrl;
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedAttachment({
        file,
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        previewUrl: file.type.startsWith('image/') ? reader.result : null,
        base64: reader.result,
        mediaType
      });
      composerInputRef.current?.focus();
    };
    reader.readAsDataURL(file);
  };

  const clearAttachment = () => {
    setSelectedAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleStartAudioRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (showToast) showToast('Microphone access is not supported on this browser', 'error');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      
      let mimeType = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/ogg; codecs=opus')) {
          mimeType = 'audio/ogg; codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm; codecs=opus')) {
          mimeType = 'audio/webm; codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        }
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start(100);
      audioRecorderRef.current = recorder;
      setIsRecordingAudio(true);
      setAudioRecordingTime(0);

      if (audioTimerRef.current) clearInterval(audioTimerRef.current);
      audioTimerRef.current = setInterval(() => {
        setAudioRecordingTime(t => t + 1);
      }, 1000);
    } catch (err) {
      console.error('[Audio Record Error]', err);
      if (showToast) showToast('Could not access microphone: ' + err.message, 'error');
    }
  };

  const handleCancelAudioRecording = () => {
    if (audioTimerRef.current) clearInterval(audioTimerRef.current);
    if (audioRecorderRef.current) {
      try {
        if (audioRecorderRef.current.state !== 'inactive') {
          audioRecorderRef.current.stop();
        }
        audioRecorderRef.current.stream?.getTracks().forEach(track => track.stop());
      } catch (e) {}
      audioRecorderRef.current = null;
    }
    audioChunksRef.current = [];
    setIsRecordingAudio(false);
    setAudioRecordingTime(0);
  };

  const handleSendAudioRecording = async () => {
    if (!audioRecorderRef.current || !activeContact) return;
    if (audioTimerRef.current) clearInterval(audioTimerRef.current);

    const recorder = audioRecorderRef.current;
    const finalMime = recorder.mimeType || 'audio/webm';

    recorder.onstop = async () => {
      try {
        recorder.stream?.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: finalMime });
        if (audioBlob.size < 100) {
          if (showToast) showToast('Recording too short', 'error');
          return;
        }

        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Data = reader.result;
          await sendMediaDirect({
            file: null,
            name: `voice_note_${Date.now()}.ogg`,
            type: finalMime,
            mediaType: 'audio',
            base64: base64Data,
            caption: ''
          });
        };
        reader.readAsDataURL(audioBlob);
      } catch (e) {
        console.error('Failed to process voice note', e);
        if (showToast) showToast('Failed to process voice note: ' + e.message, 'error');
      } finally {
        audioRecorderRef.current = null;
        audioChunksRef.current = [];
        setIsRecordingAudio(false);
        setAudioRecordingTime(0);
      }
    };

    try {
      recorder.stop();
    } catch (e) {
      handleCancelAudioRecording();
    }
  };

  const handleSelectEmoji = (emojiChar) => {
    setReplyText(prev => prev + emojiChar);
    composerInputRef.current?.focus();
  };

  const handleSelectTemplate = (tpl) => {
    try {
      setIsTemplateSelected(true);
      const rawText = tpl.content || tpl.body || tpl.text || '';
      const contactName = activeContact?.name || activeContact?.contactName || activeContact?.customerName || 'Friend';
      const params = {
        name: contactName,
        customerName: contactName,
        customer_name: contactName,
        phone: activeContact?.phone || '',
        companyName: 'EMS',
        company_name: 'EMS',
        agentName: userName || 'Executive',
        agent_name: userName || 'Executive'
      };
      const interpolated = WhatsAppTemplateService.personalizeText(rawText, params);
      setReplyText(interpolated || rawText);
      setShowTemplatesPicker(false);
      composerInputRef.current?.focus();
    } catch (e) {
      setReplyText(tpl.content || tpl.body || tpl.text || '');
      setShowTemplatesPicker(false);
      composerInputRef.current?.focus();
    }
  };

  const handleComposerChange = (e) => {
    const val = e.target.value;
    setReplyText(val);

    // Throttled presence update to WhatsApp
    const targetPhone = activeContact?.rawPhone || activeContact?.phone || activeContact?.id;
    if (targetPhone) {
      if (!typingTimerRef.current && val.trim().length > 0) {
        fetch(`${API_URL}/whatsapp/presence`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            'x-tenant-id': String(companyId)
          },
          body: JSON.stringify({
            contactId: activeContact.id,
            phone: targetPhone,
            presence: 'composing',
            sessionId: primarySession?.id || null
          })
        }).catch(() => {});
      }

      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        typingTimerRef.current = null;
        fetch(`${API_URL}/whatsapp/presence`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            'x-tenant-id': String(companyId)
          },
          body: JSON.stringify({
            contactId: activeContact.id,
            phone: targetPhone,
            presence: 'paused',
            sessionId: primarySession?.id || null
          })
        }).catch(() => {});
      }, 2500);
    }
  };

  const handleSendReaction = async (messageId, emoji) => {
    if (!messageId || !activeContact) return;
    const curMsg = activeMessages.find(m => m.id === messageId);
    const newEmoji = curMsg?.reactions === emoji ? '' : emoji; // toggle off if same emoji clicked
    const isMsgFromMe = curMsg?.from_me === 1 || curMsg?.fromMe || curMsg?.is_me;

    // Optimistic UI update
    setActiveMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions: newEmoji || null } : m));
    setActiveReactionPickerId(null);

    const contactPhone = activeContact.rawPhone || activeContact.phone || activeContact.id;

    try {
      await fetch(`${API_URL}/messages/${encodeURIComponent(messageId)}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'x-tenant-id': String(companyId)
        },
        body: JSON.stringify({
          emoji: newEmoji,
          contactId: activeContact.id,
          phone: contactPhone,
          fromMe: Boolean(isMsgFromMe),
          sessionId: primarySession?.id || null,
          tenantId: companyId
        })
      });
    } catch (err) {
      console.warn('[Reaction Error]', err.message);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!messageId || !activeContact) return;
    const ok = window.confirm('Delete this message for everyone on WhatsApp?');
    if (!ok) return;

    // Optimistic UI update
    setActiveMessages(prev => prev.map(m => m.id === messageId ? {
      ...m,
      is_deleted: 1,
      isDeleted: true,
      text_content: '🚫 You deleted this message',
      textContent: '🚫 You deleted this message',
      mediaUrl: null,
      media_url: null
    } : m));

    const contactPhone = activeContact.rawPhone || activeContact.phone || activeContact.id;

    try {
      await fetch(`${API_URL}/messages/${encodeURIComponent(messageId)}/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'x-tenant-id': String(companyId)
        },
        body: JSON.stringify({
          contactId: activeContact.id,
          phone: contactPhone,
          sessionId: primarySession?.id || null,
          tenantId: companyId
        })
      });
      if (showToast) showToast('Message deleted for everyone', 'success');
    } catch (err) {
      console.error('[Delete Message Error]', err);
      if (showToast) showToast('Failed to delete message', 'error');
    }
  };

  // 6. Handle Send WhatsApp Message (Hybrid: Desktop App WhatsApp Web Bridge + Backend Fallback)
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if ((!replyText.trim() && !selectedAttachment) || !activeContact) return;

    if (walletInfo.balance !== null && walletInfo.balance <= 0) {
      if (showToast) showToast('Wallet balance is empty (₹0.00). Please recharge your wallet to send messages.', 'error');
      return;
    }

    if (selectedAttachment) {
      const att = selectedAttachment;
      const cap = replyText.trim();
      clearAttachment();
      setReplyText('');
      await sendMediaDirect({
        file: att.file,
        name: att.name,
        type: att.type,
        mediaType: att.mediaType,
        base64: att.base64,
        caption: cap
      });
      return;
    }

    const textToSend = replyText.trim();
    const activeMsgType = isTemplateSelected ? 'whatsapp_template_msg' : 'whatsapp_normal_chat';
    const wasTemplate = isTemplateSelected;
    setIsTemplateSelected(false);
    const targetPhone = activeContact.rawPhone || activeContact.phone || activeContact.id;
    const cleanPhone = String(targetPhone).replace(/\D/g, '');
    let intlPhone = cleanPhone;
    if (cleanPhone.length === 10) {
      intlPhone = `91${cleanPhone}`;
    } else if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
      intlPhone = `91${cleanPhone.slice(1)}`;
    }
    const norm10 = cleanPhone.length >= 7 ? cleanPhone.slice(-10) : '';
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
      status: 0, // 0 = pending (clock)
      contact_id: activeContact.id,
      contactId: activeContact.id,
      phone: cleanPhone || targetPhone,
      normPhone10: norm10,
      recipient: intlPhone || cleanPhone
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
      const sorted = updated.sort((a, b) => new Date(b.lastMessageTime || 0).getTime() - new Date(a.lastMessageTime || 0).getTime());
      try {
        TenantStorage.setItem('cached_conversations_roster', sorted.slice(0, 500), companyId);
      } catch (e) {}
      return sorted;
    });
    setReplyText('');

    setTimeout(() => {
      scrollToBottom(false);
    }, 30);

    try {
      let sentSuccess = false;
      let sendMethod = 'desktop_webview';
      let errorMsg = null;



      // 3. Trigger Real WhatsApp Web in Embedded Desktop Webview
      if (typeof window !== 'undefined' && window.__omniflow_send_whatsapp_message) {
        try {
          const deskRes = await window.__omniflow_send_whatsapp_message({ phone: intlPhone, text: textToSend });
          if (deskRes && deskRes.success) {
            sentSuccess = true;
            sendMethod = 'desktop_webview';
          }
        } catch (bridgeErr) {}
      }

      // 4. Trigger Electron IPC WhatsApp Web API
      if (typeof window !== 'undefined' && window.electronAPI?.sendWhatsAppMessage) {
        try {
          const eleRes = await window.electronAPI.sendWhatsAppMessage({ phone: intlPhone, text: textToSend });
          if (eleRes && eleRes.success) {
            sentSuccess = true;
            sendMethod = 'electron_ipc';
          }
        } catch (eleErr) {}
      }

      // 5. Cloud Backend API (Baileys WhatsApp line)
      if (!sentSuccess) {
        try {
          const payload = {
            sessionId: primarySession?.id || null,
            contactId: activeContact.id,
            phone: intlPhone || cleanPhone || targetPhone,
            recipientJid: intlPhone ? `${intlPhone}@s.whatsapp.net` : (cleanPhone ? `${cleanPhone}@s.whatsapp.net` : activeContact.id),
            text: textToSend,
            message: textToSend,
            messageType: activeMsgType,
            isTemplate: wasTemplate,
            tenantId: companyId
          };

          const abortCtrl = new AbortController();
          const abortTimer = setTimeout(() => abortCtrl.abort(), 12000);

          try {
            const res = await fetch(`${API_URL}/messages/send`, {
              signal: abortCtrl.signal,
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                'x-tenant-id': String(companyId)
              },
              body: JSON.stringify(payload)
            });
            clearTimeout(abortTimer);

            const data = await res.json();
            if (res.ok && data && (data.success || data.message || data.id)) {
              sentSuccess = true;
              sendMethod = 'backend_api';
              // Update message status to 1 (sent / server_ack)
              setActiveMessages(prev => prev.map(m => m.id === outMsgId ? { ...m, status: 1 } : m));
            } else {
              errorMsg = data?.error || 'Failed to send WhatsApp message';
            }
          } catch (fetchErr) {
            clearTimeout(abortTimer);
            if (fetchErr.name === 'AbortError') {
              errorMsg = 'Message send timed out (12s). Check WhatsApp connection.';
            } else {
              errorMsg = fetchErr.message;
            }
          }
        } catch (apiErr) {
          errorMsg = apiErr.message;
        }
      }

      if (sentSuccess) {
        const senderAttribution = userName ? ` (by: ${userName})` : (userEmail ? ` (by: ${userEmail})` : '');
        frontendWalletService.deductForMessage({
          tenantId: companyId,
          messageType: activeMsgType,
          count: 1,
          recipientPhone: intlPhone || cleanPhone || targetPhone,
          description: wasTemplate 
            ? `WhatsApp business template to ${activeContact.name || cleanPhone || targetPhone}${senderAttribution}`
            : `1-to-1 WhatsApp chat to ${activeContact.name || cleanPhone || targetPhone}${senderAttribution}`
        }).then(res => {
          if (res?.success) {
            console.log('[Wallet Deduct Success - Text]:', res);
            if (res.balance !== undefined) {
              setWalletInfo(prev => ({
                ...prev,
                balance: res.balance,
                isBelowThreshold: res.balance <= prev.minThreshold,
                isDepleted: res.balance <= 0
              }));
              if (showToast && isOwnerOrAdmin) {
                showToast(`💬 Sent (-₹${(res.deducted || (wasTemplate ? 0.20 : 0.10)).toFixed(2)} debited) | Bal: ₹${res.balance.toFixed(2)}`, 'success');
              }
            }
          }
        }).catch(wErr => console.warn('[Frontend Wallet Deduct Notice]:', wErr.message));

        if (showToast && !window.__walletToastShown) {
          showToast(sendMethod === 'backend_api' ? '💬 WhatsApp message sent' : '⚡ WhatsApp sent & saved to CRM', 'success');
        }
      } else {
        // Mark message status as error
        setActiveMessages(prev => prev.map(m => m.id === outMsgId ? { ...m, status: 'error' } : m));
        if (showToast) {
          showToast(`❌ ${errorMsg || 'WhatsApp not connected. Scan QR in sidebar.'}`, 'error');
        }
      }
    } catch (err) {
      console.error('[Send Message Error]', err);
      setActiveMessages(prev => prev.map(m => m.id === outMsgId ? { ...m, status: 'error' } : m));
      if (showToast) showToast(`❌ Send Error: ${err.message}`, 'error');
    } finally {
      setIsSending(false);
    }
  };

  // Handle contact selection & mark as read
  const handleSelectContact = (contact) => {
    if (!contact) return;
    if (activeContact?.id !== contact.id) {
      const cached = getCachedMessages(contact.id);
      if (cached && cached.length > 0) {
        setActiveMessages(cached);
        setIsLoadingMessages(false);
      } else {
        setIsLoadingMessages(true);
      }
      setTimeout(() => {
        scrollToBottom(true);
      }, 10);
    }
    setActiveContact(contact);

    if (contact.unreadCount > 0) {
      setConversationsList(prev => {
        const updated = prev.map(c => {
          if (c.id === contact.id || (contact.normPhone10 && c.normPhone10 === contact.normPhone10)) {
            return { ...c, unreadCount: 0 };
          }
          return c;
        });
        try {
          TenantStorage.setItem('cached_conversations_roster', updated.slice(0, 500), companyId);
        } catch (e) {}
        return updated;
      });

      // Mark read in DB and trigger WhatsApp blue ticks
      fetch(`${API_URL}/contacts/${encodeURIComponent(contact.id)}/read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'x-tenant-id': String(companyId || '1')
        },
        body: JSON.stringify({ tenantId: companyId })
      }).catch(() => {});
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
    if (showToast) showToast('🚀 Syncing contact, conversation & calls to CRM...', 'info');

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
        if (showToast) showToast(`✅ Synced to CRM! (${totalMsgs} msgs, ${totalCalls} calls)`, 'success');
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
        if (showToast) showToast('✅ Contact & Conversation synced to CRM!', 'success');
      }
    } catch (err) {
      console.warn('[GHL Sync Catch]', err);
      if (showToast) showToast('✅ Contact sync queued for CRM!', 'success');
    } finally {
      setIsSyncingGhl(false);
    }
  };

  // Calculate total unread messages count across all active conversations
  const totalUnreadCount = useMemo(() => {
    return (conversationsList || []).reduce((acc, c) => acc + (Number(c.unreadCount) || 0), 0);
  }, [conversationsList]);

  // Counts for sidebar filter pills
  const unreadChatsCount = useMemo(() => {
    return (conversationsList || []).filter(c => (Number(c.unreadCount) || 0) > 0).length;
  }, [conversationsList]);

  const archivedChatsCount = useMemo(() => {
    return (conversationsList || []).filter(c => Boolean(c.is_archived)).length;
  }, [conversationsList]);

  const allChatsCount = useMemo(() => {
    return (conversationsList || []).filter(c => !c.is_archived).length;
  }, [conversationsList]);

  // Dynamically update browser tab title with unread badge (WhatsApp Web standard)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (totalUnreadCount > 0) {
      document.title = `(${totalUnreadCount}) Conversations • EMS WhatsApp`;
    } else {
      document.title = 'Conversations • EMS WhatsApp CRM';
    }
  }, [totalUnreadCount]);

  // Toggle Pin Contact
  const handleTogglePinContact = (contactId) => {
    setPinnedContacts(prev => {
      const next = prev.includes(contactId) ? prev.filter(id => id !== contactId) : [...prev, contactId];
      try {
        TenantStorage.setItem('pinned_contacts', next, companyId);
      } catch (e) {}
      return next;
    });
    setActiveContactMenuId(null);
  };

  // Toggle Archive Contact
  const handleToggleArchiveContact = (contactId) => {
    setConversationsList(prev => prev.map(c => {
      if (c.id === contactId) {
        return { ...c, is_archived: !c.is_archived };
      }
      return c;
    }));
    setActiveContactMenuId(null);
  };

  // Assign WhatsApp Business Label
  const handleAssignLabel = (contactId, labelKey) => {
    setConversationsList(prev => prev.map(c => {
      if (c.id === contactId) {
        return { ...c, label: labelKey };
      }
      return c;
    }));
    setActiveContactMenuId(null);
  };

  // 9. Filtered Conversations List for Search, Tabs & Pinning
  const filteredConversations = useMemo(() => {
    let list = conversationsList || [];

    // Filter by Tab: 'all' | 'unread' | 'archived'
    if (rosterTab === 'unread') {
      list = list.filter(c => (c.unreadCount || 0) > 0);
    } else if (rosterTab === 'archived') {
      list = list.filter(c => Boolean(c.is_archived));
    } else {
      // 'all' shows non-archived
      list = list.filter(c => !c.is_archived);
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(c => {
        const nameMatch = (c.name || '').toLowerCase().includes(q);
        const phoneMatch = (c.phone || '').includes(q) || (c.rawPhone || '').includes(q);
        const idMatch = (c.displayId || '').toLowerCase().includes(q);
        const msgMatch = (c.lastMessage || '').toLowerCase().includes(q);
        return nameMatch || phoneMatch || idMatch || msgMatch;
      });
    }

    // Sort: Pinned contacts stay on TOP, then by latest message time
    return [...list].sort((a, b) => {
      const aPinned = pinnedContacts.includes(a.id) || a.is_pinned;
      const bPinned = pinnedContacts.includes(b.id) || b.is_pinned;
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return new Date(b.lastMessageTime || 0).getTime() - new Date(a.lastMessageTime || 0).getTime();
    });
  }, [conversationsList, rosterTab, searchQuery, pinnedContacts]);

  // Reset lazy roster window on filter/tab changes
  useEffect(() => {
    setRosterLimit(60);
  }, [searchQuery, rosterTab]);

  // Progressive slicing for silky smooth 60fps rendering without lag
  const displayedConversations = useMemo(() => {
    return filteredConversations.slice(0, rosterLimit);
  }, [filteredConversations, rosterLimit]);

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
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
            {/* Row 1: Title & Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '7px',
                  background: 'linear-gradient(135deg, #0d9488 0%, #047857 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 2px 5px rgba(13, 148, 136, 0.25)'
                }}>
                  <MessageSquare size={14} />
                </div>
                <h2 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Conversations</h2>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => {
                    fetchConversations();
                    if (activeContact?.id) {
                      fetchMessagesForContact(activeContact, true);
                    }
                  }}
                  disabled={loadingConversations}
                  style={{
                    minWidth: '34px',
                    height: '34px',
                    padding: '0 8px',
                    borderRadius: '8px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    color: '#0d9488',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    flexShrink: 0
                  }}
                  title="Refresh Conversations & Messages"
                >
                  <RefreshCw size={13} className={loadingConversations ? 'animate-spin' : ''} style={{ animation: loadingConversations ? 'spin 1s linear infinite' : 'none' }} />
                  {!isMobile && <span>Refresh</span>}
                </button>
              </div>
            </div>

            {/* Row 2: Active Leads count, Live Wallet Balance & WhatsApp Status Pill */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
                {conversationsList.length} Active Leads
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                {/* Live Wallet Telemetry Pill (Visible ONLY to Owner/Admin, Hidden for Employees) */}
                {isOwnerOrAdmin && (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 7px',
                      borderRadius: '6px',
                      background: walletInfo.isBelowThreshold ? '#fff1f2' : '#ecfdf5',
                      border: `1px solid ${walletInfo.isBelowThreshold ? '#fecdd3' : '#a7f3d0'}`,
                      color: walletInfo.isBelowThreshold ? '#be123c' : '#047857',
                      fontSize: '10px',
                      fontWeight: '700',
                      whiteSpace: 'nowrap'
                    }}
                    title={`Universal CRM Wallet: ₹${parseFloat(walletInfo.balance || 0).toFixed(2)} (Auto-deducts per sent message)`}
                  >
                    <Wallet size={10} style={{ color: walletInfo.isBelowThreshold ? '#e11d48' : '#059669' }} />
                    <span>₹{parseFloat(walletInfo.balance || 0).toFixed(2)}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowQrModal(true);
                    const targetToStart = isOwnerOrAdmin ? (companyPrimarySession?.id || `session_${companyId}_primary`) : myTargetSessionId;
                    const curr = (localSessions || []).find(s => s.id === targetToStart);
                    if (!curr || curr.status === 'disconnected') {
                      handleStartSession(targetToStart);
                    }
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 7px',
                    borderRadius: '6px',
                    background: (isOwnerOrAdmin ? isCompanyConnected : isDedicatedConnected)
                      ? '#ecfdf5' 
                      : (isCompanyConnected ? '#f0fdf4' : (isQRReady ? '#fefce8' : '#f0fdf4')),
                    border: `1px solid ${(isOwnerOrAdmin ? isCompanyConnected : isDedicatedConnected) ? '#a7f3d0' : (isCompanyConnected ? '#86efac' : (isQRReady ? '#fef08a' : '#bbf7d0'))}`,
                    color: (isOwnerOrAdmin ? isCompanyConnected : isDedicatedConnected) ? '#15803d' : (isCompanyConnected ? '#166534' : (isQRReady ? '#a16207' : '#166534')),
                    fontSize: '10px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    transition: 'all 0.15s ease'
                  }}
                  title={
                    isOwnerOrAdmin
                      ? (isCompanyConnected ? `Company Official Line Connected: +${companyPhone}. Click to view` : 'Connect Company Official WhatsApp')
                      : (isDedicatedConnected 
                          ? `My Dedicated Work WA Connected: +${myDedicatedPhone}. Click to view` 
                          : (isCompanyConnected 
                              ? `Company Line (+${companyPhone}) Active as Fallback. Click to Link Your Own WhatsApp Line` 
                              : 'Link Work WhatsApp / Scan QR'))
                  }
                >
                  {isOwnerOrAdmin ? (
                    isCompanyConnected ? (
                      <>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 4px #10b981', display: 'inline-block' }} />
                        <span>{companyPhone ? `+${companyPhone}` : 'WA Live'}</span>
                      </>
                    ) : (
                      <>
                        <QrCode size={11} color="#059669" />
                        <span>{isQRReady ? 'Scan QR' : isConnecting ? 'Connecting...' : 'Scan QR'}</span>
                      </>
                    )
                  ) : (
                    isDedicatedConnected ? (
                      <>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 4px #10b981', display: 'inline-block' }} />
                        <span>{myDedicatedPhone ? `My WA: +${myDedicatedPhone}` : 'My WA Live'}</span>
                      </>
                    ) : (
                      <>
                        <QrCode size={11} color={isCompanyConnected ? '#059669' : '#0d9488'} />
                        <span>{isQRReady ? 'Scan My QR' : isConnecting ? 'Connecting...' : 'Link My WA'}</span>
                      </>
                    )
                  )}
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

            {/* Native WhatsApp Filter Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', overflowX: 'auto', paddingBottom: '2px' }}>
              {[
                { id: 'all', label: 'All' },
                { id: 'unread', label: 'Unread', count: unreadChatsCount, isUnread: true },
                { id: 'archived', label: 'Archived', count: archivedChatsCount }
              ].map(f => {
                const isActive = rosterTab === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setRosterTab(f.id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 10px',
                      borderRadius: '16px',
                      fontSize: '11px',
                      fontWeight: '700',
                      border: 'none',
                      cursor: 'pointer',
                      background: isActive ? '#0d9488' : '#f1f5f9',
                      color: isActive ? '#ffffff' : '#64748b',
                      transition: 'all 0.15s ease',
                      flexShrink: 0
                    }}
                  >
                    <span>{f.label}</span>
                    {Boolean(f.count && f.count > 0) && (
                      <span style={{
                        padding: '1px 6px',
                        borderRadius: '10px',
                        fontSize: '9.5px',
                        fontWeight: '800',
                        background: isActive ? 'rgba(255,255,255,0.25)' : (f.isUnread ? '#25D366' : '#94a3b8'),
                        color: '#ffffff',
                        lineHeight: 1.2
                      }}>
                        {f.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conversations List */}
          <div 
            style={{ flex: 1, overflowY: 'auto' }}
            onScroll={(e) => {
              const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
              if (scrollTop + clientHeight >= scrollHeight - 350) {
                setRosterLimit(prev => Math.min(prev + 50, filteredConversations.length));
              }
            }}
          >
            {filteredConversations.length === 0 ? (
              <div style={{ padding: '30px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                No conversations found
              </div>
            ) : (
              displayedConversations.map((contact) => {
                const isSelected = activeContact && activeContact.id === contact.id;
                const hasUnread = contact.unreadCount > 0;
                const isPinned = pinnedContacts.includes(contact.id) || contact.is_pinned;
                const labelObj = contact.label ? WHATSAPP_LABELS[contact.label] : null;

                return (
                  <div
                    key={contact.id}
                    onClick={() => {
                      handleSelectContact(contact);
                      if (isMobile) switchMobileTab('chat');
                    }}
                    style={{
                      position: 'relative',
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
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: isSelected ? '#0d9488' : '#e2e8f0',
                    color: isSelected ? '#ffffff' : '#334155',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: '800',
                    flexShrink: 0,
                    overflow: 'hidden'
                  }}>
                    {contact.profile_pic_url && contact.profile_pic_url !== 'none' ? (
                      <img
                        src={contact.profile_pic_url}
                        alt={contact.name || ''}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      (contact.name || contact.phone || 'Contact').charAt(0).toUpperCase()
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, overflow: 'hidden' }}>
                        <span style={{
                          fontSize: '13px',
                          fontWeight: hasUnread ? '800' : (isSelected ? '700' : '600'),
                          color: isSelected ? '#0d9488' : '#0f172a',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {contact.name}
                        </span>
                        {labelObj && (
                          <span style={{
                            fontSize: '9.5px',
                            fontWeight: '700',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: labelObj.bg,
                            color: labelObj.color,
                            flexShrink: 0
                          }}>
                            {labelObj.name}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                        {isPinned && (
                          <Pin size={11} color="#0d9488" style={{ transform: 'rotate(45deg)' }} title="Pinned Chat" />
                        )}
                        <span style={{
                          fontSize: '11px',
                          color: hasUnread ? '#25D366' : '#94a3b8',
                          fontWeight: hasUnread ? '700' : '500',
                          marginLeft: '2px'
                        }}>
                          {formatWhatsAppTime(contact.lastMessageTime)}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '20px' }}>
                      <div style={{
                        fontSize: '12px',
                        color: hasUnread ? '#0f172a' : '#64748b',
                        fontWeight: hasUnread ? '700' : '400',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        paddingRight: '6px'
                      }}>
                        {getContactTyping(contact) === 'recording' ? (
                          <span style={{ color: '#25D366', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <Mic size={11} /> recording audio...
                          </span>
                        ) : getContactTyping(contact) === 'composing' ? (
                          <span style={{ color: '#25D366', fontWeight: '700' }}>
                            typing...
                          </span>
                        ) : contact.lastMessage 
                          ? (contact.lastMessage.startsWith('📞') ? contact.lastMessage : `💬 ${contact.lastMessage}`)
                          : (contact.phone !== '—' ? contact.phone : 'No messages yet')}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        {hasUnread && (
                          <span style={{
                            minWidth: '20px',
                            height: '20px',
                            padding: '0 5px',
                            borderRadius: '10px',
                            background: '#25D366',
                            color: '#ffffff',
                            fontSize: '11px',
                            fontWeight: '800',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 4px rgba(37, 211, 102, 0.4)',
                            lineHeight: 1
                          }}>
                            {contact.unreadCount > 99 ? '99+' : contact.unreadCount}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveContactMenuId(activeContactMenuId === contact.id ? null : contact.id);
                          }}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            padding: '2px',
                            color: '#94a3b8',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          title="Chat Options"
                        >
                          <MoreVertical size={13} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* WhatsApp Context Menu Dropdown */}
                  {activeContactMenuId === contact.id && (
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '40px',
                        zIndex: 99,
                        background: '#ffffff',
                        borderRadius: '8px',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                        border: '1px solid #e2e8f0',
                        padding: '6px 0',
                        minWidth: '150px'
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleTogglePinContact(contact.id)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '7px 12px',
                          background: 'none',
                          border: 'none',
                          fontSize: '12px',
                          color: '#334155',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <Pin size={12} />
                        <span>{isPinned ? 'Unpin Chat' : 'Pin Chat'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (contact.unreadCount > 0) {
                            handleSelectContact(contact);
                          } else {
                            setConversationsList(prev => prev.map(c => c.id === contact.id ? { ...c, unreadCount: 1 } : c));
                          }
                          setActiveContactMenuId(null);
                        }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '7px 12px',
                          background: 'none',
                          border: 'none',
                          fontSize: '12px',
                          color: '#334155',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <MessageSquare size={12} />
                        <span>{contact.unreadCount > 0 ? 'Mark as Read' : 'Mark as Unread'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleArchiveContact(contact.id)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '7px 12px',
                          background: 'none',
                          border: 'none',
                          fontSize: '12px',
                          color: '#334155',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <Archive size={12} />
                        <span>{contact.is_archived ? 'Unarchive Chat' : 'Archive Chat'}</span>
                      </button>

                      <div style={{ height: '1px', background: '#f1f5f9', margin: '4px 0' }} />

                      <div style={{ padding: '4px 12px', fontSize: '10px', fontWeight: '700', color: '#94a3b8' }}>
                        LABELS
                      </div>
                      {Object.values(WHATSAPP_LABELS).slice(0, 4).map(l => (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => handleAssignLabel(contact.id, contact.label === l.id ? null : l.id)}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            padding: '5px 12px',
                            background: contact.label === l.id ? l.bg : 'none',
                            border: 'none',
                            fontSize: '11px',
                            color: l.color,
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: l.color }} />
                          <span>{l.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
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
                      onClick={() => switchMobileTab('list')}
                      title="Back to Chats"
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
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
                      <ArrowLeft size={18} />
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
                    flexShrink: 0,
                    overflow: 'hidden'
                  }}>
                    {activeContact.profile_pic_url && activeContact.profile_pic_url !== 'none' ? (
                      <img
                        src={activeContact.profile_pic_url}
                        alt={activeContact.name || ''}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      (activeContact.name || activeContact.phone || 'Contact').charAt(0).toUpperCase()
                    )}
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
                    </div>
                    <div style={{
                      fontSize: '11px',
                      marginTop: '1px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {getContactTyping(activeContact) === 'recording' ? (
                        <span style={{ color: '#25D366', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <Mic size={11} /> recording audio...
                        </span>
                      ) : getContactTyping(activeContact) === 'composing' ? (
                        <span style={{ color: '#25D366', fontWeight: '700' }}>
                          typing...
                        </span>
                      ) : (
                        <span style={{ color: '#64748b', fontWeight: '600' }}>📞 {activeContact.phone}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  {/* Mobile Lead Details Toggle Button */}
                  {isMobile && (
                    <button
                      type="button"
                      onClick={() => switchMobileTab('details')}
                      title="View Lead CRM Profile & Analytics"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '6px 10px',
                        minHeight: '38px',
                        borderRadius: '8px',
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        color: '#0f172a',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      <User size={14} style={{ color: '#0d9488' }} />
                      <span>Info</span>
                    </button>
                  )}

                  {/* Universal Wallet Live Telemetry Badge (Visible ONLY to Owner/Admin, Hidden for Employees) */}
                  {isOwnerOrAdmin && (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: isMobile ? '5px 8px' : '6px 11px',
                        borderRadius: '8px',
                        background: walletInfo.isBelowThreshold ? '#fff1f2' : '#ecfdf5',
                        border: `1px solid ${walletInfo.isBelowThreshold ? '#fecdd3' : '#a7f3d0'}`,
                        color: walletInfo.isBelowThreshold ? '#be123c' : '#047857',
                        fontSize: isMobile ? '11px' : '12px',
                        fontWeight: '800',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                      }}
                      title={`Universal CRM Messaging Wallet: ₹${parseFloat(walletInfo.balance || 0).toFixed(2)} (Auto-deducts ₹0.10/chat, ₹0.20/template)`}
                    >
                      <Wallet size={13} style={{ color: walletInfo.isBelowThreshold ? '#e11d48' : '#059669' }} />
                      <span>₹{parseFloat(walletInfo.balance || 0).toFixed(2)}</span>
                    </div>
                  )}

                  {!isMobile && (
                    <button
                      type="button"
                      onClick={handleSyncConversationToGhl}
                      disabled={isSyncingGhl}
                      title="Sync contact profile, messages, and calls to central CRM"
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
                      <span>{isSyncingGhl ? 'Syncing to CRM...' : 'Sync to CRM'}</span>
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
                  title="Synchronize conversation, contact & call recordings to CRM timeline"
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
                  <span>{isSyncingGhl ? 'Syncing...' : 'Sync to CRM'}</span>
                </button>
              </div>
            </div>

            {/* Stream Content */}
            <div 
              ref={messagesContainerRef}
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '12px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '5px',
                background: '#efeae2',
                backgroundImage: 'radial-gradient(#dfd7cb 1.1px, transparent 1.1px)',
                backgroundSize: '18px 18px'
              }}
            >
              {isLoadingMessages && filteredTimeline.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(255,255,255,0.9)', borderRadius: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    <RefreshCw size={15} className="animate-spin" style={{ animation: 'spin 0.8s linear infinite', color: '#0d9488' }} />
                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#334155' }}>Opening conversation...</span>
                  </div>
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
                  let safeMs = Date.now();
                  if (item.timestamp) {
                    const num = Number(item.timestamp);
                    if (!isNaN(num) && num > 0) {
                      safeMs = num < 10000000000 ? num * 1000 : num;
                    } else {
                      const parsed = new Date(item.timestamp).getTime();
                      if (!isNaN(parsed) && parsed > 0) safeMs = parsed;
                    }
                  } else if (item._createdAt) {
                    const num = Number(item._createdAt);
                    safeMs = (!isNaN(num) && num > 0) ? (num < 10000000000 ? num * 1000 : num) : Date.now();
                  }
                  const validDate = new Date(safeMs);
                  const itemTime = validDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                  const itemDate = validDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

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
                                Handled by <b>{item.agentName}</b> via {item.channel === 'CLOUD_DIALER' || item.channel === 'WEB_DIALER' ? '🌐 Cloud Dialer' : '📱 SIM Companion'}
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
                  const hasMedia = Boolean(item.mediaUrl || item.media_url);
                  const isImage = Boolean(item.mediaType?.startsWith('image') || (item.mediaUrl || item.media_url)?.match(/\.(png|jpe?g|webp|gif|svg)$/i));

                  const rawContent = (item.content || item.text_content || '').trim();
                  const isMediaPlaceholder = !rawContent || 
                    rawContent.startsWith('[Sent ') || 
                    rawContent === '(Media Attachment)' || 
                    rawContent === '[Media Attachment]' || 
                    rawContent.startsWith('🎤 Voice Note') ||
                    rawContent.startsWith('[Voice Note') ||
                    (hasMedia && (
                      /^WhatsApp (Image|Video|Audio|Ptt|Document)/i.test(rawContent) ||
                      /^IMG[-_\d]/i.test(rawContent) ||
                      /^VID[-_\d]/i.test(rawContent) ||
                      /^AUD[-_\d]/i.test(rawContent) ||
                      /\.(jpeg|jpg|png|webp|gif|svg|bmp|mp4|mov|avi|mkv|3gp|mp3|ogg|m4a|aac|opus|wav|pdf|docx?|xlsx?|zip)$/i.test(rawContent) ||
                      rawContent.startsWith('blob:') ||
                      rawContent.startsWith('http://') ||
                      rawContent.startsWith('https://')
                    ));
                  const captionText = isMediaPlaceholder ? '' : rawContent;

                  const renderStatusTicks = (s, defaultColor = '#8696a0', readColor = '#53bdeb') => {
                    if (s === 'pending' || s === 0) {
                      return <Clock size={11} color={defaultColor} title="Pending" />;
                    }
                    if (s === 1 || s === 2 || s === 'sent' || s === 'server_ack') {
                      return <Check size={13} color={defaultColor} title="Sent" />;
                    }
                    if (s === 3 || s === 'delivered' || s === 'delivery_ack') {
                      return <CheckCheck size={14} color={defaultColor} title="Delivered" />;
                    }
                    if (s === 4 || s === 5 || s === 'read' || s === 'played') {
                      return <CheckCheck size={14} color={readColor} title="Read" style={{ strokeWidth: 2.3 }} />;
                    }
                    if (s === 'error' || s === 'failed') {
                      return <AlertCircle size={12} color="#ea0038" title="Failed to deliver" />;
                    }
                    return <Check size={13} color={defaultColor} title="Sent" />;
                  };

                  const isDeleted = Boolean(
                    item.is_deleted === 1 || 
                    item.is_deleted === '1' || 
                    item.isDeleted || 
                    (rawContent && rawContent.includes('This message was deleted')) || 
                    (rawContent && rawContent.includes('You deleted this message'))
                  );

                  if (isDeleted) {
                    return (
                      <div
                        key={item.id}
                        style={{
                          display: 'flex',
                          justifyContent: isMe ? 'flex-end' : 'flex-start',
                          width: '100%',
                          margin: '2px 0',
                          padding: '0 8px'
                        }}
                      >
                        <div style={{
                          maxWidth: '75%',
                          padding: '6px 12px',
                          borderRadius: isMe ? '8px 8px 1px 8px' : '8px 8px 8px 1px',
                          background: isMe ? '#d9fdd3' : '#ffffff',
                          color: '#8696a0',
                          boxShadow: '0 1px 1px rgba(11,20,26,0.12)',
                          fontSize: '13px',
                          fontStyle: 'italic',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <Ban size={13} color="#8696a0" />
                          <span>{isMe ? '🚫 You deleted this message' : '🚫 This message was deleted'}</span>
                          <span style={{ fontSize: '10px', marginLeft: '6px', fontStyle: 'normal', color: '#8696a0' }}>{itemTime}</span>
                        </div>
                      </div>
                    );
                  }

                  const isHovered = hoveredMsgId === item.id;
                  const isPickerOpen = activeReactionPickerId === item.id;

                  const renderHoverToolbar = () => (
                    <div style={{
                      display: isHovered || isPickerOpen ? 'inline-flex' : 'none',
                      alignItems: 'center',
                      gap: '2px',
                      background: '#ffffff',
                      padding: '2px 4px',
                      borderRadius: '16px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.14)',
                      border: '1px solid #e2e8f0',
                      flexShrink: 0,
                      zIndex: 10
                    }}>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setActiveReactionPickerId(isPickerOpen ? null : item.id); }}
                        title="React with emoji"
                        style={{ border: 'none', background: isPickerOpen ? '#e0f2fe' : 'transparent', cursor: 'pointer', padding: '4px', borderRadius: '50%', display: 'flex', alignItems: 'center', color: '#64748b' }}
                      >
                        <Smile size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setReplyingToMessage({ id: item.id, senderName: isMe ? 'You' : (activeContact?.name || activeContact?.phone), content: captionText || (hasMedia ? 'Media Attachment' : '') }); }}
                        title="Reply"
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px', borderRadius: '50%', display: 'flex', alignItems: 'center', color: '#64748b' }}
                      >
                        <CornerUpLeft size={14} />
                      </button>
                      {isMe && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDeleteMessage(item.id); }}
                          title="Delete for everyone"
                          style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px', borderRadius: '50%', display: 'flex', alignItems: 'center', color: '#e11d48' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  );

                  const renderReactionPicker = () => isPickerOpen ? (
                    <div style={{
                      position: 'absolute',
                      top: '-42px',
                      [isMe ? 'right' : 'left']: '4px',
                      background: '#ffffff',
                      borderRadius: '24px',
                      padding: '4px 8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                      border: '1px solid #cbd5e1',
                      zIndex: 99
                    }}>
                      {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(em => (
                        <button
                          key={em}
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleSendReaction(item.id, em); }}
                          style={{
                            border: 'none',
                            background: item.reactions === em ? '#ecfdf5' : 'transparent',
                            fontSize: '18px',
                            cursor: 'pointer',
                            padding: '2px 4px',
                            borderRadius: '50%',
                            transition: 'transform 0.12s ease',
                            lineHeight: 1
                          }}
                          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.25)'}
                          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  ) : null;

                  const renderReactionBadge = () => item.reactions ? (
                    <div
                      onClick={(e) => { e.stopPropagation(); handleSendReaction(item.id, ''); }}
                      title="Click to remove reaction"
                      style={{
                        position: 'absolute',
                        bottom: '-9px',
                        [isMe ? 'right' : 'left']: '8px',
                        background: '#ffffff',
                        borderRadius: '12px',
                        padding: '1px 5px',
                        boxShadow: '0 1px 3px rgba(11,20,26,0.16)',
                        border: '1px solid #e2e8f0',
                        fontSize: '12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px',
                        zIndex: 4,
                        cursor: 'pointer',
                        lineHeight: '1.2'
                      }}
                    >
                      <span>{item.reactions}</span>
                    </div>
                  ) : null;

                  return (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        justifyContent: isMe ? 'flex-end' : 'flex-start',
                        width: '100%',
                        margin: '2px 0',
                        padding: '0 8px'
                      }}
                    >
                      <div
                        style={{
                          position: 'relative',
                          display: 'inline-flex',
                          flexDirection: isMe ? 'row-reverse' : 'row',
                          alignItems: 'center',
                          gap: '6px',
                          maxWidth: '85%'
                        }}
                        onMouseEnter={() => setHoveredMsgId(item.id)}
                        onMouseLeave={() => setHoveredMsgId(null)}
                      >
                        {/* Floating Emoji Picker Popover */}
                        {renderReactionPicker()}

                        {/* Floating Action Toolbar */}
                        {renderHoverToolbar()}

                        {isImage && !captionText ? (
                          /* Native Image Bubble with No Caption: Hugs image snugly, timestamp inside */
                          <div style={{
                            maxWidth: '320px',
                            width: 'fit-content',
                            borderRadius: isMe ? '8px 8px 1px 8px' : '8px 8px 8px 1px',
                            padding: '3px',
                            background: isMe ? '#d9fdd3' : '#ffffff',
                            boxShadow: '0 1px 1px rgba(11,20,26,0.12)',
                            position: 'relative',
                            display: 'inline-block'
                          }}>
                            <div style={{ position: 'relative', borderRadius: '6px', overflow: 'hidden', display: 'block' }}>
                              <img 
                                src={resolveMediaUrl(item.mediaUrl || item.media_url)} 
                                alt="photo" 
                                onClick={() => setLightboxImage(resolveMediaUrl(item.mediaUrl || item.media_url))}
                                onLoad={() => scrollToBottom(true)}
                                style={{ maxWidth: '100%', maxHeight: '320px', borderRadius: '6px', cursor: 'pointer', display: 'block', objectFit: 'contain' }} 
                                title="Click to view full size"
                              />
                              {/* Floating WhatsApp timestamp & status pill over image */}
                              <div style={{
                                position: 'absolute',
                                bottom: '6px',
                                right: '6px',
                                padding: '2px 6px',
                                borderRadius: '10px',
                                background: 'rgba(11, 20, 26, 0.52)',
                                backdropFilter: 'blur(4px)',
                                WebkitBackdropFilter: 'blur(4px)',
                                color: '#ffffff',
                                fontSize: '10px',
                                fontWeight: '600',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                lineHeight: 1
                              }}>
                                <span>{itemTime}</span>
                                {isMe && renderStatusTicks(item.status, '#ffffff', '#53bdeb')}
                              </div>
                            </div>
                            {renderReactionBadge()}
                          </div>
                        ) : isImage && captionText ? (
                          /* Native Image Bubble WITH Caption */
                          <div style={{
                            maxWidth: '320px',
                            minWidth: '220px',
                            width: 'fit-content',
                            borderRadius: isMe ? '8px 8px 1px 8px' : '8px 8px 8px 1px',
                            padding: '3px 3px 4px 3px',
                            background: isMe ? '#d9fdd3' : '#ffffff',
                            boxShadow: '0 1px 1px rgba(11,20,26,0.12)',
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column',
                            boxSizing: 'border-box'
                          }}>
                            <div style={{ borderRadius: '6px', overflow: 'hidden', width: '100%', background: 'rgba(0,0,0,0.03)' }}>
                              <img 
                                src={resolveMediaUrl(item.mediaUrl || item.media_url)} 
                                alt="photo" 
                                onClick={() => setLightboxImage(resolveMediaUrl(item.mediaUrl || item.media_url))}
                                onLoad={() => scrollToBottom(true)}
                                style={{ width: '100%', maxHeight: '320px', borderRadius: '6px', cursor: 'pointer', display: 'block', objectFit: 'contain' }} 
                                title="Click to view full size"
                              />
                            </div>
                            <div style={{
                              padding: '6px 6px 2px 6px',
                              fontSize: '13.5px',
                              lineHeight: '1.4',
                              color: '#111b21',
                              wordBreak: 'break-word',
                              overflowWrap: 'anywhere',
                              whiteSpace: 'pre-wrap',
                              maxWidth: '100%',
                              boxSizing: 'border-box'
                            }}>
                              {captionText}
                            </div>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              gap: '3px',
                              padding: '0 6px 2px 6px',
                              fontSize: '10.5px',
                              color: '#667781'
                            }}>
                              <span>{itemTime}</span>
                              {isMe && renderStatusTicks(item.status)}
                            </div>
                            {renderReactionBadge()}
                          </div>
                        ) : (
                          /* Standard Text, Audio or Document Bubble */
                          <div style={{
                            maxWidth: '70%',
                            minWidth: isMe ? '86px' : '68px',
                            width: 'fit-content',
                            padding: '6px 8px 6px 9px',
                            borderRadius: isMe ? '8px 8px 2px 8px' : '8px 8px 8px 2px',
                            background: isMe ? '#d9fdd3' : '#ffffff',
                            color: '#111b21',
                            border: 'none',
                            boxShadow: '0 1px 0.5px rgba(11,20,26,0.13)',
                            fontSize: '14.2px',
                            lineHeight: '19px',
                            position: 'relative',
                            boxSizing: 'border-box'
                          }}>
                            {hasMedia && (
                              <div style={{ marginBottom: '4px' }}>
                                {(item.mediaType === 'audio' || item.mediaType?.startsWith('audio')) ? (
                                  <TimelineAudioPlayer src={resolveMediaUrl(item.mediaUrl || item.media_url)} />
                                ) : (
                                  <a 
                                    href={resolveMediaUrl(item.mediaUrl || item.media_url)} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    style={{ 
                                      color: '#0d9488', 
                                      textDecoration: 'none', 
                                      fontSize: '12.5px', 
                                      fontWeight: '600',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      padding: '6px 10px',
                                      background: 'rgba(13, 148, 136, 0.08)',
                                      borderRadius: '6px',
                                      border: '1px solid rgba(13, 148, 136, 0.2)'
                                    }}
                                  >
                                    <FileText size={14} />
                                    <span>{captionText || 'Download Document'}</span>
                                    <Download size={12} style={{ marginLeft: '4px' }} />
                                  </a>
                                )}
                              </div>
                            )}

                            {Boolean(captionText) && (!hasMedia || (!item.mediaType?.startsWith('audio') && item.mediaType !== 'audio')) && (
                              <div style={{
                                wordBreak: 'break-word',
                                overflowWrap: 'break-word',
                                whiteSpace: 'pre-wrap',
                                display: 'inline',
                                fontSize: '14.2px',
                                lineHeight: '19px',
                                color: '#111b21'
                              }}>
                                {captionText}
                              </div>
                            )}

                            {/* WhatsApp Inline Floating Time & Status (No squishing, fits seamlessly) */}
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              float: 'right',
                              position: 'relative',
                              bottom: '-3px',
                              marginLeft: '8px',
                              paddingLeft: '4px',
                              fontSize: '11px',
                              color: '#667781',
                              whiteSpace: 'nowrap',
                              userSelect: 'none',
                              lineHeight: '15px'
                            }}>
                              <span>{itemTime}</span>
                              {isMe && renderStatusTicks(item.status)}
                            </span>
                            <div style={{ clear: 'both' }} />

                            {renderReactionBadge()}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quoted Message Preview Banner */}
            {replyingToMessage && (
              <div style={{
                padding: '8px 16px',
                background: '#f1f5f9',
                borderTop: '1px solid #e2e8f0',
                borderLeft: '4px solid #0d9488',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#0d9488' }}>
                    Replying to {replyingToMessage.senderName}
                  </div>
                  <div style={{ fontSize: '12px', color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {replyingToMessage.content || '(Attachment)'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyingToMessage(null)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: '#64748b',
                    cursor: 'pointer',
                    fontSize: '14px',
                    padding: '2px 6px'
                  }}
                  title="Cancel reply"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Attachment Preview Banner */}
            {selectedAttachment && (
              <div style={{
                padding: '8px 16px',
                background: '#f0fdfa',
                borderTop: '1px solid #ccfbf1',
                borderLeft: '4px solid #0d9488',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                  {selectedAttachment.previewUrl ? (
                    <img 
                      src={selectedAttachment.previewUrl} 
                      alt="preview" 
                      style={{ width: '42px', height: '42px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #99f6e4' }} 
                    />
                  ) : (
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '6px',
                      background: '#ccfbf1',
                      color: '#0d9488',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <FileText size={22} />
                    </div>
                  )}
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {selectedAttachment.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#0d9488', fontWeight: '600' }}>
                      {(selectedAttachment.size / 1024).toFixed(1)} KB • {selectedAttachment.mediaType.toUpperCase()} Ready to Send
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearAttachment}
                  style={{
                    border: 'none',
                    background: '#fee2e2',
                    color: '#e11d48',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                  title="Remove attachment"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* In-Line Reply Footer / Composer Container with Relative Positioning for Popups */}
            <div style={{ position: 'relative', background: '#ffffff', borderTop: '1px solid #e2e8f0' }}>

              {/* Floating Emoji Picker Popover */}
              {showEmojiPicker && (
                <div style={{
                  position: 'absolute',
                  bottom: isMobile ? '64px' : '68px',
                  left: isMobile ? '8px' : '14px',
                  background: '#ffffff',
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
                  padding: '12px',
                  width: isMobile ? 'calc(100vw - 24px)' : '310px',
                  maxWidth: '320px',
                  zIndex: 999
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11.5px', fontWeight: '800', color: '#334155' }}>Quick Emojis</span>
                    <button 
                      type="button" 
                      onClick={() => setShowEmojiPicker(false)}
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', fontSize: '14px' }}
                    >
                      ✕
                    </button>
                  </div>

                  <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Top Picked & Reactions
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '10px' }}>
                    {['👍', '🙏', '❤️', '🔥', '😊', '😂', '👏', '🎉', '🚀', '💯', '🎯', '🤝', '✅', '⭐'].map(e => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => handleSelectEmoji(e)}
                        style={{ border: 'none', background: 'transparent', fontSize: '20px', cursor: 'pointer', padding: '4px', borderRadius: '6px', transition: 'background 0.1s' }}
                        onMouseEnter={el => el.currentTarget.style.background = '#f1f5f9'}
                        onMouseLeave={el => el.currentTarget.style.background = 'transparent'}
                      >
                        {e}
                      </button>
                    ))}
                  </div>

                  <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Business & Chat
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                    {['💼', '📊', '📈', '💰', '💳', '📅', '⏰', '📞', '📱', '✉️', '📝', '📦', '💡', '⚡', '📍', '🔗', '🟢', '🔴', '⚠️', '❗', '❓'].map(e => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => handleSelectEmoji(e)}
                        style={{ border: 'none', background: 'transparent', fontSize: '20px', cursor: 'pointer', padding: '4px', borderRadius: '6px', transition: 'background 0.1s' }}
                        onMouseEnter={el => el.currentTarget.style.background = '#f1f5f9'}
                        onMouseLeave={el => el.currentTarget.style.background = 'transparent'}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Floating Quick Reply Templates Popover */}
              {showTemplatesPicker && (
                <div style={{
                  position: 'absolute',
                  bottom: isMobile ? '64px' : '68px',
                  left: isMobile ? '8px' : '60px',
                  background: '#ffffff',
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 14px 36px rgba(0,0,0,0.18)',
                  padding: '14px',
                  width: isMobile ? 'calc(100vw - 24px)' : '360px',
                  maxWidth: '380px',
                  maxHeight: '400px',
                  display: 'flex',
                  flexDirection: 'column',
                  zIndex: 999
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: '800', color: '#0d9488' }}>
                      <Sparkles size={14} />
                      <span>WhatsApp Message Templates</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setShowTemplatesPicker(false)}
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', fontSize: '14px' }}
                    >
                      ✕
                    </button>
                  </div>

                  <input
                    type="text"
                    placeholder="Search templates (e.g. pricing, welcome, follow-up)..."
                    value={templatesSearch}
                    onChange={e => setTemplatesSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '11.5px',
                      marginBottom: '10px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />

                  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '280px' }}>
                    {(availableTemplates || [])
                      .filter(t => {
                        if (!templatesSearch) return true;
                        const q = templatesSearch.toLowerCase();
                        return (t.title && t.title.toLowerCase().includes(q)) || 
                               (t.content && t.content.toLowerCase().includes(q)) || 
                               (t.body && t.body.toLowerCase().includes(q)) || 
                               (t.category && t.category.toLowerCase().includes(q));
                      })
                      .map((t, idx) => (
                        <div
                          key={t.id || idx}
                          onClick={() => handleSelectTemplate(t)}
                          style={{
                            padding: '9px 12px',
                            borderRadius: '10px',
                            border: '1px solid #e2e8f0',
                            background: '#f8fafc',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={el => {
                            el.currentTarget.style.background = '#f0fdfa';
                            el.currentTarget.style.borderColor = '#99f6e4';
                          }}
                          onMouseLeave={el => {
                            el.currentTarget.style.background = '#f8fafc';
                            el.currentTarget.style.borderColor = '#e2e8f0';
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                            <span style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>{t.title || 'Template'}</span>
                            <span style={{ fontSize: '9.5px', fontWeight: '700', color: '#0d9488', background: '#ccfbf1', padding: '2px 6px', borderRadius: '4px' }}>
                              {t.category || 'General'}
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.35 }}>
                            {t.content || t.body || t.text}
                          </div>
                        </div>
                      ))}

                    {availableTemplates.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '11.5px' }}>
                        No templates found
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Universal Wallet Warning Banner (Depleted / Below Threshold) */}
              {walletInfo.isDepleted && (
                <div style={{
                  background: '#fef2f2',
                  borderTop: '1px solid #fee2e2',
                  borderBottom: '1px solid #fecaca',
                  padding: '8px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  color: '#991b1b',
                  fontWeight: '600'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={15} color="#dc2626" />
                    <span>Wallet Balance Empty (₹0.00). Outbound WhatsApp messaging is paused.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => window.location.href = '/settings?tab=billing'}
                    style={{
                      background: '#dc2626',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    + Recharge Wallet
                  </button>
                </div>
              )}

              {!walletInfo.isDepleted && walletInfo.isBelowThreshold && walletInfo.balance !== null && (
                <div style={{
                  background: '#fffbeb',
                  borderTop: '1px solid #fef3c7',
                  borderBottom: '1px solid #fde68a',
                  padding: '6px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '11.5px',
                  color: '#92400e',
                  fontWeight: '500'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={14} color="#d97706" />
                    <span>Low Balance Alert: Current balance is ₹{walletInfo.balance.toFixed(2)} (Min threshold: ₹{walletInfo.minThreshold.toFixed(2)}).</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => window.location.href = '/settings?tab=billing'}
                    style={{
                      background: '#d97706',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '5px',
                      padding: '3px 8px',
                      fontSize: '10.5px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    + Top-up
                  </button>
                </div>
              )}

              {/* Mode A: In-Progress Audio Recording Bar */}
              {isRecordingAudio ? (
                <div style={{
                  padding: isMobile ? '8px 10px' : '12px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: isMobile ? '6px' : '12px',
                  background: '#fff1f2',
                  boxSizing: 'border-box'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '6px' : '10px', minWidth: 0 }}>
                    <span style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: '#e11d48',
                      boxShadow: '0 0 8px #e11d48',
                      display: 'inline-block',
                      flexShrink: 0
                    }} />
                    <span style={{ fontSize: isMobile ? '12px' : '13px', fontWeight: '800', color: '#e11d48', whiteSpace: 'nowrap' }}>
                      {isMobile ? 'Recording...' : 'Recording Voice Note...'}
                    </span>
                    <span style={{
                      fontSize: '12px',
                      fontWeight: '800',
                      color: '#0f172a',
                      fontVariantNumeric: 'tabular-nums',
                      background: '#ffffff',
                      border: '1px solid #fecdd3',
                      padding: '2px 6px',
                      borderRadius: '6px',
                      flexShrink: 0
                    }}>
                      {Math.floor(audioRecordingTime / 60)}:{String(audioRecordingTime % 60).padStart(2, '0')}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '5px' : '8px', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={handleCancelAudioRecording}
                      style={{
                        padding: isMobile ? '6px 10px' : '7px 12px',
                        borderRadius: '20px',
                        background: '#ffffff',
                        border: '1px solid #fecdd3',
                        color: '#e11d48',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Discard audio recording"
                    >
                      <Trash2 size={13} />
                      <span>{isMobile ? '' : 'Cancel'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSendAudioRecording}
                      style={{
                        padding: isMobile ? '6px 12px' : '7px 16px',
                        borderRadius: '20px',
                        background: 'linear-gradient(135deg, #0d9488 0%, #047857 100%)',
                        border: 'none',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        boxShadow: '0 2px 6px rgba(13, 148, 136, 0.3)'
                      }}
                    >
                      <Send size={13} />
                      <span>{isMobile ? 'Send' : 'Send Voice Note'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Mode B: Regular Full-Featured Interactive Composer Form */
                <form
                  onSubmit={handleSendMessage}
                  style={{
                    padding: isMobile ? '8px 8px' : '10px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: isMobile ? '5px' : '8px',
                    width: '100%',
                    boxSizing: 'border-box',
                    background: '#ffffff'
                  }}
                >
                  {/* Hidden File Input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                    accept="image/*,video/*,audio/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  />

                  {/* 1. Emoji Toggle Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowEmojiPicker(prev => !prev);
                      setShowTemplatesPicker(false);
                    }}
                    style={{
                      border: 'none',
                      background: showEmojiPicker ? '#f1f5f9' : 'transparent',
                      color: showEmojiPicker ? '#0d9488' : '#64748b',
                      borderRadius: '50%',
                      width: '34px',
                      height: '34px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      flexShrink: 0,
                      transition: 'all 0.15s ease'
                    }}
                    title="Insert Emoji"
                  >
                    <Smile size={isMobile ? 18 : 19} />
                  </button>

                  {/* 2. Paperclip Attachment Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: 'none',
                      background: selectedAttachment ? '#ecfdf5' : 'transparent',
                      color: selectedAttachment ? '#0d9488' : '#64748b',
                      borderRadius: '50%',
                      width: '34px',
                      height: '34px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      flexShrink: 0,
                      transition: 'all 0.15s ease'
                    }}
                    title="Attach Images, Documents, Videos"
                  >
                    <Paperclip size={isMobile ? 17 : 18} />
                  </button>

                  {/* 3. Quick Reply Templates Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowTemplatesPicker(prev => !prev);
                      setShowEmojiPicker(false);
                    }}
                    style={{
                      border: '1px solid #e2e8f0',
                      background: showTemplatesPicker ? '#ecfdf5' : '#f8fafc',
                      color: showTemplatesPicker ? '#0d9488' : '#475569',
                      borderRadius: isMobile ? '50%' : '16px',
                      padding: isMobile ? '0' : '4px 10px',
                      width: isMobile ? '34px' : 'auto',
                      height: isMobile ? '34px' : 'auto',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      fontSize: '11.5px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      flexShrink: 0,
                      transition: 'all 0.15s ease'
                    }}
                    title="Select a Quick Reply Template"
                  >
                    <Sparkles size={isMobile ? 15 : 12} color="#0d9488" />
                    {!isMobile && <span>Templates</span>}
                  </button>

                  {/* 4. Text Input Field - minWidth: 0 prevents flex overflow on mobile! */}
                  <input
                    ref={composerInputRef}
                    type="text"
                    placeholder={
                      walletInfo.isDepleted
                        ? (isMobile ? 'Wallet empty (₹0.00)' : 'Wallet Empty (₹0.00) — Please recharge your wallet')
                        : (selectedAttachment 
                            ? (isMobile ? `Caption for ${selectedAttachment.name}...` : `Add caption for ${selectedAttachment.name} (optional)...`) 
                            : (isMobile ? 'Type a WhatsApp message...' : `Reply to ${activeContact.name} via WhatsApp...`))
                    }
                    value={replyText}
                    onChange={handleComposerChange}
                    disabled={isSending || walletInfo.isDepleted}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      padding: isMobile ? '9px 12px' : '10px 16px',
                      borderRadius: '24px',
                      border: walletInfo.isDepleted ? '1px solid #fca5a5' : '1px solid #cbd5e1',
                      outline: 'none',
                      fontSize: '13px',
                      background: walletInfo.isDepleted ? '#fef2f2' : '#f8fafc',
                      color: walletInfo.isDepleted ? '#991b1b' : '#0f172a',
                      cursor: walletInfo.isDepleted ? 'not-allowed' : 'text',
                      boxSizing: 'border-box'
                    }}
                  />

                  {/* 5. Right Action: Send Button or Mic Button - Guaranteed visible on mobile */}
                  {(replyText.trim() || selectedAttachment) ? (
                    <button
                      type="submit"
                      disabled={isSending || walletInfo.isDepleted}
                      aria-label="Send WhatsApp message"
                      title="Send WhatsApp message"
                      style={{
                        padding: isMobile ? '0' : '10px 18px',
                        width: isMobile ? '38px' : 'auto',
                        height: '38px',
                        borderRadius: isMobile ? '50%' : '24px',
                        background: walletInfo.isDepleted ? '#94a3b8' : 'linear-gradient(135deg, #0d9488 0%, #047857 100%)',
                        border: 'none',
                        color: '#ffffff',
                        fontSize: '12.5px',
                        fontWeight: '700',
                        cursor: (isSending || walletInfo.isDepleted) ? 'not-allowed' : 'pointer',
                        opacity: isSending ? 0.7 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: isMobile ? '0' : '6px',
                        boxShadow: walletInfo.isDepleted ? 'none' : '0 2px 6px rgba(13, 148, 136, 0.3)',
                        flexShrink: 0
                      }}
                    >
                      <Send size={isMobile ? 15 : 13} />
                      {!isMobile && <span>{isSending ? 'Sending...' : 'Send'}</span>}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStartAudioRecording}
                      disabled={isSending}
                      aria-label="Record WhatsApp Voice Note"
                      title="Record WhatsApp Voice Note"
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #0d9488 0%, #047857 100%)',
                        border: 'none',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(13, 148, 136, 0.3)',
                        flexShrink: 0
                      }}
                    >
                      <Mic size={18} />
                    </button>
                  )}
                </form>
              )}
            </div>
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
                onClick={() => switchMobileTab('chat')}
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
                <span>{isSyncingGhl ? 'Syncing...' : 'CRM Sync'}</span>
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
              boxShadow: '0 4px 10px rgba(13, 148, 136, 0.25)',
              overflow: 'hidden'
            }}>
              {activeContact.profile_pic_url && activeContact.profile_pic_url !== 'none' ? (
                <img
                  src={activeContact.profile_pic_url}
                  alt={activeContact.name || ''}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              ) : (
                (activeContact.name || activeContact.phone || 'Contact').charAt(0).toUpperCase()
              )}
            </div>
            <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: '0 0 2px 0' }}>
              {activeContact.name}
            </h4>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#0d9488', fontWeight: '700' }}>
                  <Zap size={12} /> CRM Synced
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
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800' }}>
                    {isOwnerOrAdmin ? 'Company WhatsApp Gateway' : 'Link Your Work WhatsApp'}
                  </h3>
                  <div style={{ fontSize: '11px', opacity: 0.9 }}>
                    {isModalConnected 
                      ? 'Active & Cloud Synced' 
                      : (isOwnerOrAdmin 
                          ? 'Pair official company phone for central CRM messaging' 
                          : 'Pair your WhatsApp to message your assigned leads directly')}
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
              {isModalConnected ? (
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
                      {isOwnerOrAdmin ? 'Company WhatsApp is Live & Connected!' : 'Your Work WhatsApp is Live & Connected!'}
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
                      +{modalConnectedPhone || (isOwnerOrAdmin ? 'Company Line Active' : 'My Line Active')}
                    </div>
                    <p style={{ margin: '12px 0 0 0', fontSize: '12px', color: '#64748b', lineHeight: '1.5' }}>
                      {isOwnerOrAdmin
                        ? 'Official company WhatsApp line is active on secure cloud. Incoming messages, website leads, and CRM replies sync in real time.'
                        : 'Your dedicated work WhatsApp session is active on secure cloud. All messages to your assigned leads will route directly through your number.'}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '6px' }}>
                    <button
                      type="button"
                      onClick={() => handleDisconnectSession(isOwnerOrAdmin ? (companyPrimarySession?.id || `session_${companyId}_primary`) : myTargetSessionId)}
                      disabled={qrLoading}
                      style={{
                        flex: 1,
                        padding: '11px',
                        borderRadius: '10px',
                        background: qrLoading ? '#f1f5f9' : '#fff1f2',
                        border: '1px solid #fecdd3',
                        color: qrLoading ? '#94a3b8' : '#e11d48',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: qrLoading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      {qrLoading && <RefreshCw size={13} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />}
                      <span>{qrLoading ? 'Disconnecting...' : 'Disconnect Number'}</span>
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
                      {isOwnerOrAdmin ? 'Pair Company WhatsApp:' : 'Pair Your Personal Work WhatsApp:'}
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
                    {activeQrSession?.qr_code ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <img
                          src={activeQrSession.qr_code}
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
                          {qrActionMsg || (isModalConnecting ? 'Connecting to WhatsApp gateway...' : 'Initializing WhatsApp session...')}
                        </span>
                        {!isModalConnecting && (
                          <button
                            type="button"
                            onClick={() => handleStartSession(isOwnerOrAdmin ? (companyPrimarySession?.id || `session_${companyId}_primary`) : myTargetSessionId, true)}
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
                      onClick={() => handleStartSession(isOwnerOrAdmin ? (companyPrimarySession?.id || `session_${companyId}_primary`) : myTargetSessionId, true)}
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

                    {isOwnerOrAdmin && (
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
                    )}

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

      {/* Fullscreen WhatsApp Image Lightbox Modal */}
      {lightboxImage && (
        <div 
          onClick={() => setLightboxImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.88)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
          }}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <img 
              src={lightboxImage} 
              alt="Fullscreen preview" 
              style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '10px', objectFit: 'contain', boxShadow: '0 12px 32px rgba(0,0,0,0.5)' }} 
            />
            <div style={{ position: 'absolute', top: '-45px', right: 0, display: 'flex', gap: '10px' }}>
              <a 
                href={lightboxImage} 
                download="whatsapp-image" 
                target="_blank" 
                rel="noreferrer" 
                style={{ 
                  color: '#ffffff', 
                  background: 'rgba(255,255,255,0.2)', 
                  padding: '6px 14px', 
                  borderRadius: '6px', 
                  textDecoration: 'none', 
                  fontSize: '12px',
                  fontWeight: '600',
                  backdropFilter: 'blur(4px)'
                }}
              >
                ⬇️ Download
              </a>
              <button 
                type="button" 
                onClick={() => setLightboxImage(null)} 
                style={{ 
                  color: '#ffffff', 
                  background: 'rgba(255,255,255,0.2)', 
                  border: 'none', 
                  padding: '6px 12px', 
                  borderRadius: '6px', 
                  cursor: 'pointer', 
                  fontSize: '14px',
                  fontWeight: '700',
                  backdropFilter: 'blur(4px)'
                }}
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
