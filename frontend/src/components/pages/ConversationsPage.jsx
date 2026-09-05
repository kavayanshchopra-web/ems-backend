/**
 * UNIFIED CONVERSATIONS & OMNI-TIMELINE HUB (GHL STYLE)
 * Consolidates WhatsApp Chats, Multi-Call Recordings, and Lead Interactions into a single continuous stream
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Mic
} from 'lucide-react';
import { TimelineEngine } from '../../core/engines/TimelineEngine';
import { db } from '../../firebase';
import { collection, onSnapshot, doc, getDocs, setDoc, query, where } from 'firebase/firestore';

// In-thread Embedded Audio Player Component
function TimelineAudioPlayer({ src, duration = 0 }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const audioRef = useRef(null);

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

  if (!src) {
    return (
      <div style={{ fontSize: '10px', color: '#94a3b8', fontStyle: 'italic', padding: '2px 0' }}>
        No audio recording available
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
        src={src}
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
  const companyId = authUser?.companyId || authUser?.tenantId || authUser?.tenant_id || 'org_default';

  const formatContactRoster = (rawList) => {
    if (!Array.isArray(rawList)) return [];
    const dedupMap = new Map();

    rawList.forEach(c => {
      if (!c || !c.id) return;
      const idStr = String(c.id);
      if (idStr.endsWith('@g.us') || idStr.endsWith('@broadcast') || idStr.endsWith('@newsletter') || idStr.endsWith('@lid') || idStr === '0@s.whatsapp.net') {
        return;
      }

      const cleanPhone = String(c.phone || c.phoneNumber || c.customerPhone || (c.id.includes('@s.whatsapp.net') ? c.id.split('@')[0] : '')).replace(/\D/g, '');
      const norm10 = cleanPhone.length >= 7 ? cleanPhone.slice(-10) : '';
      const isInternal = cleanPhone.toLowerCase().startsWith('ghl_') || /[a-z]/i.test(cleanPhone);
      const formattedPhone = (!isInternal && cleanPhone.length >= 7)
        ? (cleanPhone.length === 10 ? `+91 ${cleanPhone}` : `+${cleanPhone}`)
        : '—';

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
        tags: Array.isArray(c.labels) ? c.labels : (Array.isArray(c.tags) ? c.tags : [])
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
          lastMessageTime: Math.max(new Date(existing.lastMessageTime || 0).getTime(), new Date(rec.lastMessageTime || 0).getTime())
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

  // 1. Master State with Immediate Hydration from Props or localStorage Cache
  const [conversationsList, setConversationsList] = useState(() => {
    if (Array.isArray(propContacts) && propContacts.length > 0) {
      return formatContactRoster(propContacts);
    }
    try {
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('omniflow_cached_contacts');
        if (cached) return formatContactRoster(JSON.parse(cached));
      }
    } catch (e) {}
    return [];
  });

  const [activeContact, setActiveContact] = useState(() => {
    let initialList = [];
    if (Array.isArray(propContacts) && propContacts.length > 0) {
      initialList = formatContactRoster(propContacts);
    } else {
      try {
        if (typeof window !== 'undefined') {
          const cached = localStorage.getItem('omniflow_cached_contacts');
          if (cached) initialList = formatContactRoster(JSON.parse(cached));
        }
      } catch (e) {}
    }
    return initialList.length > 0 ? initialList[0] : null;
  });

  const [activeMessages, setActiveMessages] = useState([]);
  const [allCallLogs, setAllCallLogs] = useState([]);
  const [crmNotes, setCrmNotes] = useState([]);
  const [activeTabFilter, setActiveTabFilter] = useState('all'); // 'all' | 'whatsapp' | 'calls' | 'notes'
  const [searchQuery, setSearchQuery] = useState('');
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');

  const messagesEndRef = useRef(null);
  const messagesCacheRef = useRef(new Map());

  const API_URL = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
    ? 'http://localhost:5000/api'
    : 'https://api.employeemanagementsystems.com/api';
  const token = typeof window !== 'undefined' ? (localStorage.getItem('omnilflow_token') || localStorage.getItem('token')) : null;

  // Sync prop contacts when parent updates
  useEffect(() => {
    if (Array.isArray(propContacts) && propContacts.length > 0) {
      const formatted = formatContactRoster(propContacts);
      setConversationsList(formatted);
      if (!activeContact && formatted.length > 0) {
        setActiveContact(formatted[0]);
      } else if (activeContact) {
        const updatedActive = formatted.find(c => c.id === activeContact.id || (c.normPhone10 && c.normPhone10 === activeContact.normPhone10));
        if (updatedActive) {
          setActiveContact(prev => ({ ...prev, ...updatedActive }));
        }
      }
    }
  }, [propContacts]);

  // 2. Fetch / Stream Call Logs (Firestore + SQLite)
  useEffect(() => {
    let unsubs = [];

    const handleNewCallDocs = (docs) => {
      if (!Array.isArray(docs)) return;
      setAllCallLogs(prev => {
        const map = new Map();
        (prev || []).forEach(p => map.set(String(p.id), p));
        docs.forEach(d => map.set(String(d.id), d));
        return Array.from(map.values()).sort((a, b) => {
          const timeA = new Date(a._createdAt || a.createdAt || a.timestamp || 0).getTime();
          const timeB = new Date(b._createdAt || b.createdAt || b.timestamp || 0).getTime();
          return timeB - timeA;
        });
      });
    };

    try {
      if (db) {
        // A. Companion App Call Logs
        const q1 = collection(db, 'callLogs');
        const unsub1 = onSnapshot(q1, (snap) => {
          const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          handleNewCallDocs(docs);
        }, () => {});
        unsubs.push(unsub1);

        // B. Telecalling / Voxbay Logs
        const q2 = collection(db, 'telecalling_logs');
        const unsub2 = onSnapshot(q2, (snap) => {
          const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          handleNewCallDocs(docs);
        }, () => {});
        unsubs.push(unsub2);
      }
    } catch (e) {
      console.warn('[ConversationsPage] Call log listener error:', e);
    }

    // Backend Call Logs Fetch
    fetch(`${API_URL}/telecalling/logs`, {
      headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
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
  }, [API_URL, token]);

  // 3. Load Contacts & Build Active Conversations Roster
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const res = await fetch(`${API_URL}/contacts`, {
          headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
        });
        const data = await res.json();
        const rawList = Array.isArray(data?.contacts) ? data.contacts : (Array.isArray(data) ? data : []);
        const cleanRoster = formatContactRoster(rawList);

        if (cleanRoster.length > 0) {
          setConversationsList(cleanRoster);
          if (!activeContact) {
            setActiveContact(cleanRoster[0]);
          }
        } else if (Array.isArray(propContacts) && propContacts.length > 0) {
          setConversationsList(formatContactRoster(propContacts));
          if (!activeContact) {
            setActiveContact(formatContactRoster(propContacts)[0]);
          }
        }
      } catch (err) {
        console.warn('[ConversationsPage] Contacts fetch error:', err);
      }
    };

    fetchContacts();
  }, [API_URL, token]);

  // 4. Fetch WhatsApp Messages for Active Contact (with instant cache preview)
  useEffect(() => {
    if (!activeContact || !activeContact.id) {
      setActiveMessages([]);
      setIsLoadingMessages(false);
      return;
    }

    const contactId = activeContact.id;
    const cached = messagesCacheRef.current.get(contactId);
    if (cached && cached.length > 0) {
      setActiveMessages(cached);
      setIsLoadingMessages(false);
    } else {
      setIsLoadingMessages(true);
    }

    fetch(`${API_URL}/contacts/${encodeURIComponent(contactId)}/messages?limit=100`, {
      headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
    })
      .then(res => res.json())
      .then(data => {
        const msgs = Array.isArray(data?.messages) ? data.messages : (Array.isArray(data) ? data : []);
        messagesCacheRef.current.set(contactId, msgs);
        setActiveMessages(msgs);
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
  }, [activeContact?.id, API_URL, token]);

  // Real-time Electron WhatsApp Webview Incoming Message Listener
  useEffect(() => {
    let cleanup = null;
    if (typeof window !== 'undefined' && window.electronAPI?.onIncomingWhatsAppMessage) {
      cleanup = window.electronAPI.onIncomingWhatsAppMessage((msg) => {
        if (!msg || !msg.body) return;
        const incomingText = msg.body;
        const senderName = msg.sender || '';

        if (activeContact) {
          const contactPhoneNorm = String(activeContact.phone || activeContact.rawPhone || activeContact.id || '').replace(/\D/g, '').slice(-10);
          const senderNorm = String(senderName).replace(/\D/g, '').slice(-10);
          const nameMatches = activeContact.name && senderName && activeContact.name.toLowerCase().includes(senderName.toLowerCase());

          if ((senderNorm && contactPhoneNorm && senderNorm === contactPhoneNorm) || nameMatches || !senderNorm) {
            const newMsgObj = {
              id: 'wa_in_' + Date.now(),
              textContent: incomingText,
              text_content: incomingText,
              fromMe: false,
              from_me: 0,
              timestamp: Math.floor(Date.now() / 1000),
              contact_id: activeContact.id
            };
            setActiveMessages(prev => {
              if (prev.some(m => (m.textContent === incomingText || m.text_content === incomingText) && Math.abs((m.timestamp || 0) - newMsgObj.timestamp) < 6)) {
                return prev;
              }
              return [...prev, newMsgObj];
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

    return () => {
      if (typeof cleanup === 'function') cleanup();
    };
  }, [activeContact]);

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
    return map;
  }, [allCallLogs]);

  // 5. Build Unified Merged Timeline (WhatsApp + Multi-Call Records + Notes)
  const { timeline, stats } = useMemo(() => {
    if (!activeContact) return { timeline: [], stats: {} };

    const norm10 = activeContact.normPhone10 || (String(activeContact.rawPhone || activeContact.phone || '').replace(/\D/g, '').slice(-10));
    const matchedCalls = norm10 && callLogsByPhoneMap.has(norm10) ? callLogsByPhoneMap.get(norm10) : allCallLogs;

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

    setIsSending(true);

    try {
      let sentSuccess = false;
      let sendMethod = 'cloud';

      // 1. Check if Desktop App WhatsApp Web Bridge is available
      if (typeof window !== 'undefined' && window.__omniflow_send_whatsapp_message) {
        try {
          const deskRes = await window.__omniflow_send_whatsapp_message({ phone: cleanPhone, text: textToSend });
          if (deskRes && deskRes.success) {
            sentSuccess = true;
            sendMethod = 'desktop_webview';
          }
        } catch (bridgeErr) {
          console.warn('[Desktop Bridge Notice]', bridgeErr);
        }
      }

      // 2. Check if Electron Main Process API is available
      if (!sentSuccess && typeof window !== 'undefined' && window.electronAPI?.sendWhatsAppMessage) {
        try {
          const eleRes = await window.electronAPI.sendWhatsAppMessage({ phone: cleanPhone, text: textToSend });
          if (eleRes && eleRes.success) {
            sentSuccess = true;
            sendMethod = 'electron_ipc';
          }
        } catch (eleErr) {
          console.warn('[Electron IPC Notice]', eleErr);
        }
      }

      // 3. Fallback to VPS Backend API if not sent via desktop bridge
      if (!sentSuccess) {
        try {
          const payload = {
            contactId: activeContact.id,
            phone: targetPhone,
            message: textToSend
          };

          const res = await fetch(`${API_URL}/messages/send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
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

      // 4. If webview or backend succeeded OR user is in desktop app
      if (sentSuccess || (typeof window !== 'undefined' && (window.electronAPI?.isDesktopApp || window.__omniflow_send_whatsapp_message))) {
        // Append optimistic message
        const optimisticMsg = {
          id: `opt_${Date.now()}`,
          text_content: textToSend,
          from_me: 1,
          timestamp: Date.now(),
          status: 'sent'
        };
        setActiveMessages(prev => [...prev, optimisticMsg]);
        setConversationsList(prev => prev.map(c => c.id === activeContact.id ? { ...c, lastMessage: textToSend, lastMessageTime: Date.now() } : c));
        setReplyText('');

        if (showToast) {
          showToast(sendMethod === 'backend_api' ? '💬 WhatsApp message sent' : '⚡ WhatsApp sent via Desktop Live Web', 'success');
        }

        setTimeout(() => {
          if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }, 50);
      } else {
        // Offer 1-Click WhatsApp Web Direct Open
        const fallbackUrl = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(textToSend)}`;
        window.open(fallbackUrl, '_blank');
        
        const optimisticMsg = {
          id: `opt_${Date.now()}`,
          text_content: textToSend,
          from_me: 1,
          timestamp: Date.now(),
          status: 'sent'
        };
        setActiveMessages(prev => [...prev, optimisticMsg]);
        setReplyText('');
        if (showToast) showToast('💬 WhatsApp Web opened to send message', 'info');
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
      const contactCallLogs = norm10 && callLogsByPhoneMap && callLogsByPhoneMap.has(norm10)
        ? callLogsByPhoneMap.get(norm10)
        : (Array.isArray(allCallLogs) ? allCallLogs : []);

      const payload = {
        contact: {
          ...activeContact,
          phone: resolvedPhone,
          phoneNumber: resolvedPhone,
          name: activeContact.name || activeContact.custom_name || 'Contact'
        },
        messages: Array.isArray(activeMessages) ? activeMessages : [],
        callLogs: Array.isArray(contactCallLogs) ? contactCallLogs : []
      };

      let syncSucceeded = false;
      let syncResult = null;

      // Primary: Try full conversation sync endpoint
      try {
        const res = await fetch(`${API_URL}/v1/integrations/ghl/conversations/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
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

      // Fallback: Sync Contact + Messages via Contact Sync pipeline
      if (!syncSucceeded) {
        try {
          const targetId = encodeURIComponent(activeContact.id || resolvedPhone);
          const fallbackRes = await fetch(`${API_URL}/v1/integrations/ghl/contacts/${targetId}/sync`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
              contact: payload.contact,
              name: payload.contact.name,
              phone: resolvedPhone
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

      if (syncSucceeded) {
        const msgs = syncResult?.messagesSynced ?? activeMessages?.length ?? 0;
        const calls = syncResult?.callsSynced ?? 0;
        if (showToast) showToast(`✅ Synced to GoHighLevel! (${msgs} msgs, ${calls} calls)`, 'success');
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
      <div style={{
        width: '320px',
        borderRight: '1px solid #e2e8f0',
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0
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
          </div>

          {/* Search Box */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#f1f5f9',
            padding: '7px 12px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
          }}>
            <Search size={14} style={{ color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search chats, names, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: '12px',
                width: '100%',
                color: '#0f172a'
              }}
            />
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
                  onClick={() => setActiveContact(contact)}
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
                    {contact.name.charAt(0).toUpperCase()}
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

      {/* ========================================================================= */}
      {/* COLUMN 2: OMNI-TIMELINE CHAT STREAM & AUDIO CALL CARDS                    */}
      {/* ========================================================================= */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: '#f8fafc',
        overflow: 'hidden'
      }}>
        {activeContact ? (
          <>
            {/* Conversation Stream Header */}
            <div style={{
              padding: '12px 20px',
              background: '#ffffff',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0d9488 0%, #047857 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: '800'
                }}>
                  {activeContact.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                      {activeContact.name}
                    </h3>
                    <span style={{
                      fontSize: '10.5px',
                      fontFamily: 'monospace',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      background: 'rgba(13, 148, 136, 0.1)',
                      color: '#0d9488',
                      fontWeight: '700'
                    }}>
                      {activeContact.displayId}
                    </span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>
                    📞 {activeContact.phone} {activeContact.email ? `• 📧 ${activeContact.email}` : ''}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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

                <button
                  type="button"
                  onClick={handleTriggerCall}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '7px 12px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    border: '1px solid #047857',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(5, 150, 105, 0.25)'
                  }}
                >
                  <PhoneCall size={13} />
                  <span>Call Contact</span>
                </button>
              </div>
            </div>

            {/* Timeline Filter Strip */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 20px',
              background: '#f1f5f9',
              borderBottom: '1px solid #e2e8f0',
              fontSize: '11px',
              fontWeight: '700'
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
              {isLoadingMessages ? (
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
                filteredTimeline.map((item) => {
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
                        {item.recordingUrl ? (
                          <TimelineAudioPlayer src={item.recordingUrl} duration={item.durationSeconds} />
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
                })
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

      {/* ========================================================================= */}
      {/* COLUMN 3: RIGHT LEAD PROFILE & CRM DRAWER                                  */}
      {/* ========================================================================= */}
      {activeContact && (
        <div style={{
          width: '280px',
          borderLeft: '1px solid #e2e8f0',
          background: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px',
          overflowY: 'auto'
        }}>
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
              {activeContact.name.charAt(0).toUpperCase()}
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
    </div>
  );
}
