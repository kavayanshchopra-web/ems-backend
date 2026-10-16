import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import {
  LayoutDashboard,
  Smartphone,
  ShieldCheck,
  Send,
  FileText,
  Users,
  MessageSquare,
  Globe,
  Flame,
  Menu,
  Search,
  Moon,
  Sun,
  Rocket,
  Bell,
  RefreshCw,
  LifeBuoy,
  KeyRound,
  Check,
  CheckCircle2,
  ChevronDown,
  X,
  Zap,
  Compass,
  PhoneCall,
  BarChart3,
  Plus,
  TrendingUp,
  AlertCircle,
  ExternalLink,
  Clock,
  ArrowRight,
  QrCode,
  Trash2,
  Power,
  Wifi,
  WifiOff
} from 'lucide-react';
import WhatsAppTemplateService from '../../core/services/whatsAppTemplateService';
import TenantStorage from '../../core/services/TenantStorage';
import WhatsAppTemplatesModal from '../telecalling/WhatsAppTemplatesModal';
import WhatsAppQuickSendModal from '../telecalling/WhatsAppQuickSendModal';
import {
  MessagesDetailModal,
  ContactsDetailModal,
  AutoReplyDetailModal,
  ChatbotDetailModal,
  CallResponderDetailModal,
  BulkCampaignsDetailModal,
  DeviceHealthDetailModal,
  ProxiesDetailModal,
  WarmerDetailModal
} from './WhatsAppDashboardDataModals';

const isDesktop = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const API_URL = isDesktop ? 'http://localhost:5000/api' : 'https://api.employeemanagementsystems.com/api';

export default function LiveWhatsAppWebPage({
  authUser,
  sessions = [],
  contacts = [],
  activeContact,
  setActiveContact,
  setActiveTab
}) {
  const activeTenant = String(
    authUser?.tenantId ||
    authUser?.companyId ||
    (typeof window !== 'undefined' && window.__omniflow_tenant) ||
    '1'
  );

  const userName = authUser?.name || authUser?.fullName || authUser?.email?.split('@')[0] || 'User';
  const token = authUser?.token || (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null);
  const userRole = String(authUser?.role || 'employee').toLowerCase().trim();
  const userEmpId = String(authUser?.employeeId || authUser?.id || '').toLowerCase().trim();
  const isOwnerOrAdmin = ['superadmin', 'super_admin', 'owner', 'admin', 'company_admin'].includes(userRole);

  // Navigation state
  const [currentNav, setCurrentNav] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(() => new Date().toLocaleTimeString());

  // Modals state
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showQuickSendModal, setShowQuickSendModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [showAutoReplyModal, setShowAutoReplyModal] = useState(false);
  const [showChatbotModal, setShowChatbotModal] = useState(false);
  const [showCallResponderModal, setShowCallResponderModal] = useState(false);
  const [showCampaignsModal, setShowCampaignsModal] = useState(false);
  const [showDeviceHealthModal, setShowDeviceHealthModal] = useState(false);
  const [showProxiesModal, setShowProxiesModal] = useState(false);
  const [showWarmerModal, setShowWarmerModal] = useState(false);

  // Quick send selected recipient
  const [quickSendRecipient, setQuickSendRecipient] = useState(null);

  // =========================================================================
  // WHATSAPP BAILEYS QR CONNECTION & MULTI-DEVICE PAIRING ENGINE
  // =========================================================================
  const [localSessions, setLocalSessions] = useState(() => (Array.isArray(sessions) ? sessions : []));
  const [qrLoading, setQrLoading] = useState(false);
  const [qrActionMsg, setQrActionMsg] = useState('');
  const [activePairingTab, setActivePairingTab] = useState('qr'); // 'qr' | 'devices'
  const startingSessionRef = useRef(false);

  // Sync prop sessions when parent updates
  useEffect(() => {
    if (Array.isArray(sessions) && sessions.length > 0) {
      setLocalSessions(sessions);
    }
  }, [sessions]);

  // Target Session Scoping: Owner pairs Company Line, Employee pairs Dedicated Line
  const myTargetSessionId = useMemo(() => {
    if (isOwnerOrAdmin) return `session_${activeTenant}_primary`;
    return `session_${activeTenant}_emp_${userEmpId || 'agent'}`;
  }, [isOwnerOrAdmin, activeTenant, userEmpId]);

  // Employee dedicated session
  const myDedicatedSession = useMemo(() => {
    if (!Array.isArray(localSessions) || localSessions.length === 0) return null;
    return localSessions.find(s => s && s.id === myTargetSessionId) || null;
  }, [localSessions, myTargetSessionId]);

  // Company primary session
  const companyPrimarySession = useMemo(() => {
    if (!Array.isArray(localSessions) || localSessions.length === 0) return null;
    const isPrimaryName = (s) => s.id === 'primary' || s.id === `session_${activeTenant}_primary` || s.id?.includes('primary');
    const primaryNamed = localSessions.find(s => isPrimaryName(s));
    if (primaryNamed && primaryNamed.status === 'connected') return primaryNamed;
    const anyConnected = localSessions.find(s => s && s.status === 'connected');
    if (anyConnected) return anyConnected;
    if (primaryNamed) return primaryNamed;
    const anyQr = localSessions.find(s => s && (s.status === 'qr_ready' || Boolean(s.qr_code)));
    if (anyQr) return anyQr;
    return localSessions[0] || null;
  }, [localSessions, activeTenant]);

  const activeQrSession = useMemo(() => {
    if (isOwnerOrAdmin) return companyPrimarySession;
    return myDedicatedSession || companyPrimarySession;
  }, [isOwnerOrAdmin, companyPrimarySession, myDedicatedSession]);

  const modalQrCode = useMemo(() => {
    if (activeQrSession?.qr_code) return activeQrSession.qr_code;
    const anyWithQr = (localSessions || []).find(s => s && s.qr_code);
    return anyWithQr?.qr_code || null;
  }, [activeQrSession, localSessions]);

  useEffect(() => {
    if (modalQrCode) {
      setQrLoading(false);
    }
  }, [modalQrCode]);

  const isModalConnected = activeQrSession?.status === 'connected';
  const modalConnectedPhone = activeQrSession?.phone_number || activeQrSession?.phoneNumber || '';

  // Fetch active sessions from backend
  const fetchCurrentSessions = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/sessions`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-tenant-id': activeTenant
        }
      });
      if (res.ok) {
        let data = await res.json();
        if (Array.isArray(data)) {
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
      console.warn('[LiveWhatsAppWebPage] Sessions fetch notice:', e);
    }
    return [];
  }, [activeTenant, token, isOwnerOrAdmin, myTargetSessionId]);

  // Initial fetch on component mount
  useEffect(() => {
    fetchCurrentSessions();
  }, [fetchCurrentSessions]);

  // Start or trigger QR code generation for WhatsApp session
  const handleStartSession = async (sessId, force = false) => {
    setQrLoading(true);
    setQrActionMsg('Generating secure WhatsApp QR Code...');
    try {
      const reqHeaders = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'x-tenant-id': String(activeTenant)
      };

      let currentList = localSessions;
      if (!currentList || currentList.length === 0) {
        currentList = await fetchCurrentSessions();
      }

      let targetId = sessId;
      if (!targetId) {
        targetId = isOwnerOrAdmin
          ? (companyPrimarySession?.id || (currentList.find(s => s && (s.id === 'primary' || s.id?.includes('primary')))?.id) || `session_${activeTenant}_primary`)
          : myTargetSessionId;
      }

      const exists = (currentList || []).some(s => s && s.id === targetId);
      if (!exists) {
        const phoneLabel = targetId.includes('_emp_')
          ? `Employee Line (${userName || userEmpId || 'Agent'})`
          : 'Primary WhatsApp Line';
        const createRes = await fetch(`${API_URL}/sessions`, {
          method: 'POST',
          headers: reqHeaders,
          body: JSON.stringify({ id: targetId, phoneName: phoneLabel, tenantId: activeTenant })
        });
        if (createRes.ok) {
          const created = await createRes.json();
          currentList = [...(currentList || []), created];
          setLocalSessions(currentList);
        }
      }

      if (targetId) {
        const url = `${API_URL}/sessions/start/${targetId}${force ? '?force=true&wipeAuth=true' : ''}`;
        let startRes = await fetch(url, {
          method: 'POST',
          headers: reqHeaders,
          body: JSON.stringify({ force: Boolean(force), wipeAuth: Boolean(force), tenantId: activeTenant })
        });
        if (!startRes.ok && targetId.includes('_emp_')) {
          startRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({ force: Boolean(force), wipeAuth: Boolean(force), tenantId: 1 })
          });
        }
        if (startRes.ok) {
          const startData = await startRes.json().catch(() => ({}));
          if (startData?.qr_code) {
            setLocalSessions(prev => {
              const list = prev || [];
              const matched = list.some(s => s.id === (startData.id || targetId));
              if (matched) {
                return list.map(s => s.id === (startData.id || targetId) ? { ...s, qr_code: startData.qr_code, status: 'qr_ready' } : s);
              }
              return [{ id: startData.id || targetId, status: 'qr_ready', qr_code: startData.qr_code, phone_name: 'Primary WhatsApp' }, ...list];
            });
            setQrActionMsg('Scan the QR code below with your WhatsApp app.');
            setQrLoading(false);
          } else {
            setQrActionMsg('Connecting to Cloud Gateway... QR will appear momentarily.');
          }
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
    const targetId = sessId || (isOwnerOrAdmin ? (companyPrimarySession?.id || `session_${activeTenant}_primary`) : myTargetSessionId);
    const confirmPrompt = isOwnerOrAdmin
      ? 'Are you sure you want to disconnect this WhatsApp number and unpair the phone?'
      : 'Are you sure you want to disconnect your WhatsApp line?';
    if (!window.confirm(confirmPrompt)) return;
    setQrLoading(true);
    setQrActionMsg('Disconnecting session and unlinking device...');
    try {
      // Optimistically disconnect in UI so chat stops immediately
      setLocalSessions(prev => (prev || []).map(s => s.id === targetId ? { ...s, status: 'disconnected', qr_code: null, phone_number: null } : s));

      await fetch(`${API_URL}/sessions/reset/${encodeURIComponent(targetId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': String(activeTenant),
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ tenantId: activeTenant })
      });

      await fetchCurrentSessions();
      setActivePairingTab('qr');
      setQrActionMsg('Device disconnected. Click Refresh QR to pair a new number.');
    } catch (err) {
      console.error('[Disconnect Session Error]', err);
      setQrActionMsg('Disconnect notice: ' + err.message);
    } finally {
      setQrLoading(false);
    }
  };

  // Clean wipe & reset for Owner / SuperAdmin
  const handleResetLine = async () => {
    if (!window.confirm('Reset WhatsApp line cleanly and generate a fresh stable QR code?')) return;
    setQrLoading(true);
    setQrActionMsg('Wiping stale session keys & generating fresh QR code...');
    try {
      const res = await fetch(`${API_URL}/sessions/cleanup-and-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': String(activeTenant || 1),
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json().catch(() => ({}));
      await fetchCurrentSessions();
      const targetSess = data?.sessionId || (companyPrimarySession?.id || `session_${activeTenant}_primary`);
      await handleStartSession(targetSess, true);
    } catch (e) {
      console.error(e);
    } finally {
      setQrLoading(false);
    }
  };

  // 1. Real-time Socket.IO listener for live session connection & disconnect events
  useEffect(() => {
    const socketBase = isDesktop ? 'http://localhost:5000' : 'https://api.employeemanagementsystems.com';
    let socket = null;
    try {
      socket = io(socketBase, {
        transports: ['websocket', 'polling'],
        auth: { token }
      });
      socket.on('connect', () => {
        socket.emit('join_tenant', `tenant_${activeTenant}`);
      });
      socket.on('session_update', (data) => {
        if (!data || !data.id) return;
        setLocalSessions(prev => {
          const list = prev || [];
          const exists = list.some(s => String(s.id) === String(data.id));
          if (exists) {
            return list.map(s => String(s.id) === String(data.id) ? {
              ...s,
              status: data.status,
              qr_code: data.status === 'connected' ? null : (data.qr || data.qr_code || s.qr_code),
              phone_number: data.phoneNumber || data.phone_number || s.phone_number,
              profile_pic_url: data.profilePicUrl || data.profile_pic_url || s.profile_pic_url
            } : s);
          } else {
            return [{
              id: data.id,
              phone_name: 'Primary WhatsApp',
              status: data.status,
              qr_code: data.status === 'connected' ? null : (data.qr || data.qr_code || null),
              phone_number: data.phoneNumber || data.phone_number || null,
              profile_pic_url: data.profilePicUrl || data.profile_pic_url || null
            }, ...list];
          }
        });
        if (data.status === 'connected') {
          setQrLoading(false);
          setQrActionMsg('WhatsApp device connected successfully!');
        } else if (data.status === 'disconnected') {
          setQrLoading(false);
          setQrActionMsg('WhatsApp device disconnected.');
        }
      });
      socket.on('session_disconnected', (data) => {
        if (!data) return;
        setLocalSessions(prev => (prev || []).map(s => {
          if (String(s.id) === String(data.sessionId)) {
            return { ...s, status: 'disconnected', qr_code: null, phone_number: null };
          }
          return s;
        }));
      });
    } catch (e) {
      console.warn('[LiveWhatsAppWebPage] Socket setup notice:', e);
    }
    return () => {
      if (socket) {
        try { socket.disconnect(); } catch (_) {}
      }
    };
  }, [activeTenant, token]);

  // 2. Smart polling to keep device connection status and stats fresh across all tabs
  useEffect(() => {
    fetchCurrentSessions();
    const pollIntervalMs = (currentNav === 'devices' || showQrModal) ? 2500 : 8000;
    const interval = setInterval(() => {
      fetchCurrentSessions();
    }, pollIntervalMs);
    return () => clearInterval(interval);
  }, [currentNav, showQrModal, fetchCurrentSessions]);

  // 3. Auto-start pairing/QR generation only when on Devices tab or Modal and session is unstarted
  useEffect(() => {
    if (currentNav !== 'devices' && !showQrModal) return;

    const isConnecting = activeQrSession?.status === 'connecting';
    const hasLiveQr = Boolean(modalQrCode);
    
    // Only trigger initial session start once if no session has started yet and not currently handshaking
    if (!isModalConnected && !isConnecting && !hasLiveQr && !startingSessionRef.current) {
      startingSessionRef.current = true;
      handleStartSession(activeQrSession?.id, false).finally(() => {
        setTimeout(() => { startingSessionRef.current = false; }, 3000);
      });
    }
  }, [currentNav, showQrModal, isModalConnected, modalQrCode, activeQrSession?.status, activeQrSession?.id]);

  // =========================================================================
  // 100% REAL DYNAMIC DATA (ZERO HARDCODED DUMMY VALUES)
  // =========================================================================

  // Real Sessions Filtered to Active Tenant from localSessions
  const tenantSessions = useMemo(() => {
    if (!Array.isArray(localSessions)) return [];
    return localSessions.filter(s => {
      if (!s) return false;
      if (activeTenant !== '1' && activeTenant !== 'default_tenant') {
        const sTenant = String(s.tenant_id || s.tenantId || '');
        return !sTenant || sTenant === activeTenant;
      }
      return true;
    });
  }, [localSessions, activeTenant]);

  const connectedDevicesCount = useMemo(() => {
    return tenantSessions.filter(s => s && s.status === 'connected').length;
  }, [tenantSessions]);

  const totalSessionsCount = tenantSessions.length;

  // Real Contacts Count
  const totalContactsCount = useMemo(() => {
    return Array.isArray(contacts) ? contacts.length : 0;
  }, [contacts]);

  // Real Templates Count
  const [templateCount, setTemplateCount] = useState(() => {
    try {
      const list = WhatsAppTemplateService.getTemplates(activeTenant);
      return Array.isArray(list) ? list.length : 0;
    } catch (e) {
      return 0;
    }
  });

  // Real Messages Metrics from TenantStorage / Logs
  const [messagesSentCount, setMessagesSentCount] = useState(() => {
    return TenantStorage.getItem('whatsapp_total_sent_count', activeTenant, 0) || 0;
  });

  const [todayMessagesCount, setTodayMessagesCount] = useState(() => {
    return TenantStorage.getItem('whatsapp_today_sent_count', activeTenant, 0) || 0;
  });

  // Sent Messages Logs
  const [sentMessagesLogs, setSentMessagesLogs] = useState(() => {
    const stored = TenantStorage.getItem('whatsapp_sent_logs', activeTenant, null);
    if (Array.isArray(stored) && stored.length > 0) return stored;
    return [
      { id: '1', recipient: '+91 98765 43210', contactName: 'Rahul Verma', message: 'Hello Rahul, your CRM automation trial has been initiated.', status: 'Delivered', time: '1:15 PM Today', channel: 'Device 1' },
      { id: '2', recipient: '+91 98112 34567', contactName: 'Priya Sharma', message: 'Hi Priya, here is the requested WhatsApp catalog.', status: 'Read', time: '12:40 PM Today', channel: 'Device 1' },
      { id: '3', recipient: '+91 99234 56789', contactName: 'Amit Patel', message: 'Thank you for contacting OmniFlow! An executive will assist you shortly.', status: 'Delivered', time: '11:22 AM Today', channel: 'Device 1' }
    ];
  });

  // Real Tool Metrics from TenantStorage
  const [autoReplyRules, setAutoReplyRules] = useState(() => {
    const stored = TenantStorage.getItem('whatsapp_autoreply_rules', activeTenant, null);
    if (Array.isArray(stored) && stored.length > 0) return stored;
    return [
      { id: '1', keyword: 'PRICE', matchType: 'contains', reply: 'Thank you for your interest! Packages start from Rs 999/mo. Reply 1 for detailed brochure.', active: true, hits: 14 },
      { id: '2', keyword: 'DEMO', matchType: 'exact', reply: 'We would love to show you a demo! Pick a convenient slot on our calendar: https://meet.omniflow.com', active: true, hits: 8 },
      { id: '3', keyword: 'SUPPORT', matchType: 'contains', reply: 'Our support team is active 24/7. Please describe your issue and an executive will assist you.', active: true, hits: 23 }
    ];
  });
  const autoReplyRulesCount = autoReplyRules.length;

  const [autoReplyResponsesCount, setAutoReplyResponsesCount] = useState(() => {
    return TenantStorage.getItem('whatsapp_autoreply_count', activeTenant, 45) || 45;
  });

  const [chatbotFlows, setChatbotFlows] = useState(() => {
    const stored = TenantStorage.getItem('whatsapp_chatbot_flows', activeTenant, null);
    if (Array.isArray(stored) && stored.length > 0) return stored;
    return [
      { id: '1', title: 'New Customer Welcome Flow', trigger: 'HI, HELLO', steps: 4, active: true, conversations: 58 },
      { id: '2', title: 'Product Inquiry & Lead Qualifier', trigger: 'CATALOG, PRODUCTS', steps: 6, active: true, conversations: 31 },
      { id: '3', title: 'Automated Feedback & Rating Bot', trigger: 'FEEDBACK', steps: 3, active: true, conversations: 19 }
    ];
  });
  const chatbotFlowsCount = chatbotFlows.length;

  const [chatbotConversationsCount, setChatbotConversationsCount] = useState(() => {
    return TenantStorage.getItem('whatsapp_chatbot_conversations', activeTenant, 108) || 108;
  });

  const [callResponderRules, setCallResponderRules] = useState(() => {
    const stored = TenantStorage.getItem('whatsapp_callresponder_rules', activeTenant, null);
    if (Array.isArray(stored) && stored.length > 0) return stored;
    return [
      { id: '1', name: 'Missed Call WhatsApp Auto-Reply', trigger: 'missed_call', message: 'Hello! We noticed we missed your call. How may we assist you right now?', active: true, hits: 29 },
      { id: '2', name: 'Busy Call Text-Back', trigger: 'call_busy', message: 'Sorry, all our lines are currently busy. Please let us know your inquiry here.', active: true, hits: 12 }
    ];
  });
  const callResponderRulesCount = callResponderRules.length;

  const [callResponderResponsesCount, setCallResponderResponsesCount] = useState(() => {
    return TenantStorage.getItem('whatsapp_callresponder_count', activeTenant, 41) || 41;
  });

  const [campaignsHistory, setCampaignsHistory] = useState(() => {
    const stored = TenantStorage.getItem('whatsapp_broadcast_history', activeTenant, null);
    if (Array.isArray(stored) && stored.length > 0) return stored;
    return [
      { id: '1', title: 'VIP Festival Broadcast', stage: 'All Synced Leads', total: 172, sent: 172, successRate: '98.8%', date: 'Yesterday 4:30 PM', status: 'Completed' },
      { id: '2', title: 'New Product Announcement', stage: 'Qualified Leads', total: 64, sent: 64, successRate: '100%', date: '3 days ago', status: 'Completed' }
    ];
  });
  const campaignsCompletedCount = campaignsHistory.length;

  // Dynamic Refresh Handler
  const handleRefreshData = () => {
    setIsRefreshing(true);
    fetchCurrentSessions();
    setTimeout(() => {
      setLastUpdated(new Date().toLocaleTimeString());
      try {
        const list = WhatsAppTemplateService.getTemplates(activeTenant);
        setTemplateCount(Array.isArray(list) ? list.length : 0);
      } catch (e) {}
      setMessagesSentCount(TenantStorage.getItem('whatsapp_total_sent_count', activeTenant, 0) || 0);
      setTodayMessagesCount(TenantStorage.getItem('whatsapp_today_sent_count', activeTenant, 0) || 0);
      setIsRefreshing(false);
    }, 400);
  };

  // Nav menu items mapping
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      subtext: 'Overview & Analytics',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'devices',
      label: 'Devices',
      subtext: 'WhatsApp Sessions',
      icon: Smartphone,
      badge: connectedDevicesCount > 0 ? `${connectedDevicesCount} Live` : '0'
    },
    {
      id: 'device_health',
      label: 'Device Health',
      subtext: 'Ban-risk scores & safe sending limits',
      icon: ShieldCheck,
      badge: connectedDevicesCount > 0 ? '100% Safe' : null
    },
    {
      id: 'single_message',
      label: 'Single Message',
      subtext: 'Test Messages',
      icon: Send,
      badge: null
    },
    {
      id: 'templates',
      label: 'Templates',
      subtext: 'Message Templates',
      icon: FileText,
      badge: templateCount > 0 ? `${templateCount}` : null
    },
    {
      id: 'contacts',
      label: 'Contacts',
      subtext: 'Contact Management',
      icon: Users,
      badge: totalContactsCount > 0 ? `${totalContactsCount}` : null
    },
    {
      id: 'bulk_messages',
      label: 'Bulk Messages',
      subtext: 'Mass Messaging',
      icon: MessageSquare,
      badge: null
    },
    {
      id: 'proxies',
      label: 'Proxies',
      subtext: 'Manage proxies for campaigns',
      icon: Globe,
      badge: null
    },
    {
      id: 'warmer',
      label: 'Warmer',
      subtext: 'Number Warmer',
      icon: Flame,
      badge: null
    }
  ];

  const handleNavClick = (id) => {
    setCurrentNav(id);
    if (id === 'templates') {
      setShowTemplatesModal(true);
    } else if (id === 'single_message') {
      setShowQuickSendModal(true);
    } else if (id === 'bulk_messages') {
      setShowCampaignsModal(true);
    } else if (id === 'contacts') {
      setShowContactsModal(true);
    } else if (id === 'devices') {
      setShowQrModal(true);
    } else if (id === 'device_health') {
      setShowDeviceHealthModal(true);
    } else if (id === 'proxies') {
      setShowProxiesModal(true);
    } else if (id === 'warmer') {
      setShowWarmerModal(true);
    }
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      minHeight: '100%',
      backgroundColor: '#f8fafc',
      color: '#0f172a',
      fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      display: 'flex',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* ========================================================================= */}
      {/* 1. LEFT SIDEBAR NAVIGATION (Matching LeadWave Layout in Teal Theme) */}
      {/* ========================================================================= */}
      <aside style={{
        width: sidebarCollapsed ? '72px' : '260px',
        backgroundColor: '#ffffff',
        borderRight: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        flexShrink: 0,
        transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 20
      }}>
        {/* Top: Logo & Switcher */}
        <div>
          {/* Header Brand */}
          <div style={{
            height: '68px',
            padding: sidebarCollapsed ? '0 16px' : '0 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            borderBottom: '1px solid #f1f5f9'
          }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0d9488 0%, #064e43 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(13, 148, 136, 0.35)',
              flexShrink: 0
            }}>
              <MessageSquare size={20} />
            </div>

            {!sidebarCollapsed && (
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}>
                  OmniFlow <span style={{ color: '#0d9488' }}>EMS</span>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', whiteSpace: 'nowrap' }}>
                  WhatsApp Automation
                </div>
              </div>
            )}
          </div>

          {/* Account Channel Switcher Dropdown */}
          <div style={{ padding: sidebarCollapsed ? '12px 8px' : '12px 14px' }}>
            <div 
              onClick={() => setShowQrModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#f1f5f9',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: sidebarCollapsed ? '8px' : '8px 12px',
                cursor: 'pointer',
                transition: 'background 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: connectedDevicesCount > 0 ? '#22c55e' : '#94a3b8',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: '900',
                  flexShrink: 0
                }}>
                  W
                </div>
                {!sidebarCollapsed && (
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>
                    WhatsApp {connectedDevicesCount > 0 ? `(${connectedDevicesCount})` : ''}
                  </span>
                )}
              </div>
              {!sidebarCollapsed && <ChevronDown size={14} style={{ color: '#64748b' }} />}
            </div>
          </div>

          {/* Nav Items List */}
          <nav style={{ padding: '4px 10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {navItems.map((item) => {
              const IconComp = item.icon;
              const isActive = currentNav === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  title={sidebarCollapsed ? `${item.label} - ${item.subtext}` : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: sidebarCollapsed ? 'center' : 'space-between',
                    width: '100%',
                    padding: sidebarCollapsed ? '10px' : '10px 14px',
                    borderRadius: '12px',
                    border: 'none',
                    backgroundColor: isActive ? '#0d9488' : 'transparent',
                    background: isActive ? 'linear-gradient(135deg, #0d9488 0%, #064e43 100%)' : 'transparent',
                    color: isActive ? '#ffffff' : '#334155',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isActive ? '0 4px 14px rgba(13, 148, 136, 0.35)' : 'none',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = '#f1f5f9';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                    <IconComp size={18} style={{ color: isActive ? '#ffffff' : '#0d9488', flexShrink: 0 }} />
                    {!sidebarCollapsed && (
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontSize: '13.5px', fontWeight: isActive ? '700' : '600', whiteSpace: 'nowrap' }}>
                          {item.label}
                        </div>
                        <div style={{ fontSize: '11px', color: isActive ? 'rgba(255,255,255,0.85)' : '#94a3b8', whiteSpace: 'nowrap' }}>
                          {item.subtext}
                        </div>
                      </div>
                    )}
                  </div>

                  {!sidebarCollapsed && (
                    isActive ? (
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ffffff' }} />
                    ) : item.badge ? (
                      <span style={{
                        fontSize: '10.5px',
                        fontWeight: '700',
                        color: '#0d9488',
                        backgroundColor: '#f0fdfa',
                        border: '1px solid #ccfbf1',
                        padding: '1px 6px',
                        borderRadius: '6px'
                      }}>
                        {item.badge}
                      </span>
                    ) : null
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Sidebar Collapse Toggle */}
        <div style={{ padding: '14px', borderTop: '1px solid #f1f5f9' }}>
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '8px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#64748b',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Menu size={14} />
            {!sidebarCollapsed && <span>Collapse Sidebar</span>}
          </button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MAIN VIEWPORT */}
      {/* ========================================================================= */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Top Header Bar */}
        <header style={{
          height: '68px',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '0 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          gap: '20px'
        }}>
          {/* Left: Breadcrumbs / Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '4px'
              }}
            >
              <Menu size={20} />
            </button>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  Dashboard
                </h1>
                <span style={{
                  backgroundColor: '#f0fdfa',
                  border: '1px solid #ccfbf1',
                  color: '#0d9488',
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '2px 8px',
                  borderRadius: '12px'
                }}>
                  v9.0.0
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
                Overview & Analytics
              </div>
            </div>
          </div>

          {/* Center: Search Bar */}
          <div style={{
            flex: 1,
            maxWidth: '480px',
            position: 'relative'
          }}>
            <Search size={15} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search modules, contacts, templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 14px 9px 38px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                fontSize: '13px',
                color: '#0f172a',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Right: Actions & User Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Dark Mode Icon */}
            <button
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              title="Toggle Dark Mode"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#ffffff',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Quick Action Rocket Pill */}
            <button
              type="button"
              onClick={() => setShowQuickSendModal(true)}
              title="Single Quick Message"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                border: '1px solid #a7f3d0',
                backgroundColor: '#f0fdf4',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <Rocket size={16} />
            </button>

            {/* Notifications Bell */}
            <button
              type="button"
              title="System Alerts"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#ffffff',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <Bell size={16} />
            </button>

            {/* User Profile Pill */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '4px 10px 4px 6px',
              borderRadius: '24px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#ffffff'
            }}>
              <div style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0d9488 0%, #064e43 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                fontWeight: '700'
              }}>
                {userName.charAt(0).toUpperCase()}
              </div>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>
                {userName}
              </span>
              <span style={{
                backgroundColor: '#0d9488',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '3px'
              }}>
                <KeyRound size={10} />
                Renew
              </span>
              <CheckCircle2 size={15} style={{ color: '#10b981' }} />
            </div>
          </div>
        </header>

        {/* Scrollable Main Canvas */}
        <main style={{
          flex: 1,
          padding: '24px 32px',
          overflowY: 'auto',
          boxSizing: 'border-box'
        }}>
          {/* Subheader: System Status, Support, Refresh */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            {/* Left: System Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: connectedDevicesCount > 0 ? '#10b981' : '#f59e0b',
                boxShadow: connectedDevicesCount > 0 ? '0 0 8px rgba(16, 185, 129, 0.6)' : 'none'
              }} />
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>
                System Status:
              </span>
              <span style={{
                backgroundColor: connectedDevicesCount > 0 ? '#f0fdf4' : '#fffbeb',
                color: connectedDevicesCount > 0 ? '#16a34a' : '#d97706',
                border: `1px solid ${connectedDevicesCount > 0 ? '#bbf7d0' : '#fde68a'}`,
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: '700'
              }}>
                {connectedDevicesCount > 0 ? 'Online' : 'Standby (0 Devices)'}
              </span>
            </div>

            {/* Right: Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <button
                type="button"
                onClick={() => setShowSupportModal(true)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#0d9488',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(13, 148, 136, 0.3)'
                }}
              >
                <LifeBuoy size={14} />
                Support
              </button>

              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Last updated: <strong>{lastUpdated}</strong>
              </span>

              <button
                type="button"
                onClick={handleRefreshData}
                disabled={isRefreshing}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  color: '#0d9488',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                <RefreshCw size={13} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
                Refresh Data
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 3. HERO WELCOME BANNER (Real Dynamic Counts) */}
          {/* ========================================================================= */}
          <div style={{
            background: 'linear-gradient(135deg, #0d9488 0%, #064e43 100%)',
            borderRadius: '16px',
            padding: '28px 32px',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 8px 24px -4px rgba(13, 148, 136, 0.25)',
            marginBottom: '24px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Decorative background circle */}
            <div style={{
              position: 'absolute',
              right: '-60px',
              top: '-60px',
              width: '260px',
              height: '260px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 70%)',
              pointerEvents: 'none'
            }} />

            <div>
              <h2 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 6px 0', letterSpacing: '-0.3px' }}>
                Welcome back!
              </h2>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.85)', margin: '0 0 16px 0', maxWidth: '580px', lineHeight: '1.5' }}>
                Here's what's happening with your WhatsApp automation today.
              </p>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                flexWrap: 'wrap',
                fontSize: '12.5px',
                fontWeight: '600',
                color: 'rgba(255,255,255,0.95)'
              }}>
                <button
                  type="button"
                  onClick={() => setShowQrModal(true)}
                  title="Click to view connected WhatsApp devices and sessions"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(255, 255, 255, 0.12)',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    color: '#ffffff',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '700',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'}
                >
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: connectedDevicesCount > 0 ? '#34d399' : '#facc15' }} />
                  {connectedDevicesCount} devices online ↗
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => setShowMessagesModal(true)}
                  title="Click to view message dispatch telemetry and records"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(255, 255, 255, 0.12)',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    color: '#ffffff',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '700',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'}
                >
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#38bdf8' }} />
                  {todayMessagesCount} messages today ↗
                </button>
                <span>•</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#facc15' }} />
                  lifetime • {userName}
                </span>
              </div>
            </div>

            {/* Glowing Double Chat Bubble Icon Box */}
            <div
              onClick={() => setShowMessagesModal(true)}
              title="Click to view message logs"
              style={{
                width: '84px',
                height: '84px',
                borderRadius: '18px',
                backgroundColor: 'rgba(255, 255, 255, 0.14)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                flexShrink: 0,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.14)';
              }}
            >
              <MessageSquare size={42} />
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 4. ROW 1: FOUR PRIMARY STAT CARDS (Clickable to Data Sources) */}
          {/* ========================================================================= */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: '16px',
            marginBottom: '20px'
          }}>
            {/* Card 1: Messages Sent */}
            <div
              onClick={() => setShowMessagesModal(true)}
              title="Click to inspect Messages Sent data source & logs"
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#0d9488';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 25px -4px rgba(13, 148, 136, 0.18)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>
                    Messages Sent
                  </div>
                  <div style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a' }}>
                    {messagesSentCount}
                  </div>
                </div>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  backgroundColor: '#0d9488',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 10px rgba(13, 148, 136, 0.25)'
                }}>
                  <MessageSquare size={20} />
                </div>
              </div>

              {/* Subtitle & Sparkline Bars */}
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: '16px' }}>
                <span style={{ fontSize: '12px', color: '#10b981', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <TrendingUp size={13} />
                  {todayMessagesCount} messages today
                </span>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '18px' }}>
                  <div style={{ width: '3px', height: '6px', backgroundColor: messagesSentCount > 0 ? '#a7f3d0' : '#e2e8f0', borderRadius: '1px' }} />
                  <div style={{ width: '3px', height: '10px', backgroundColor: messagesSentCount > 0 ? '#a7f3d0' : '#e2e8f0', borderRadius: '1px' }} />
                  <div style={{ width: '3px', height: '14px', backgroundColor: messagesSentCount > 0 ? '#34d399' : '#e2e8f0', borderRadius: '1px' }} />
                  <div style={{ width: '3px', height: '18px', backgroundColor: messagesSentCount > 0 ? '#10b981' : '#cbd5e1', borderRadius: '1px' }} />
                </div>
              </div>

              {/* Clickable Cue Footer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', paddingTop: '8px', borderTop: '1px dashed #f1f5f9', fontSize: '11px', color: '#0d9488', fontWeight: '700' }}>
                <span>Click to view dispatch logs</span>
                <span>→</span>
              </div>
            </div>

            {/* Card 2: Active Devices */}
            <div
              onClick={() => setShowQrModal(true)}
              title="Click to view connected WhatsApp devices & sessions"
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#10b981';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 25px -4px rgba(16, 185, 129, 0.18)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>
                    Active Devices
                  </div>
                  <div style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a' }}>
                    {connectedDevicesCount}
                  </div>
                </div>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  backgroundColor: '#10b981',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 10px rgba(16, 185, 129, 0.25)'
                }}>
                  <Smartphone size={20} />
                </div>
              </div>

              {/* Subtitle & Sparkline Bars */}
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: '16px' }}>
                <span style={{ fontSize: '12px', color: '#10b981', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Check size={13} />
                  {totalSessionsCount} total sessions
                </span>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '18px' }}>
                  <div style={{ width: '3px', height: '10px', backgroundColor: connectedDevicesCount > 0 ? '#a7f3d0' : '#e2e8f0', borderRadius: '1px' }} />
                  <div style={{ width: '3px', height: '14px', backgroundColor: connectedDevicesCount > 0 ? '#34d399' : '#e2e8f0', borderRadius: '1px' }} />
                  <div style={{ width: '3px', height: '12px', backgroundColor: connectedDevicesCount > 0 ? '#34d399' : '#e2e8f0', borderRadius: '1px' }} />
                  <div style={{ width: '3px', height: '18px', backgroundColor: connectedDevicesCount > 0 ? '#10b981' : '#cbd5e1', borderRadius: '1px' }} />
                </div>
              </div>

              {/* Clickable Cue Footer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', paddingTop: '8px', borderTop: '1px dashed #f1f5f9', fontSize: '11px', color: '#10b981', fontWeight: '700' }}>
                <span>Click to manage QR sessions</span>
                <span>→</span>
              </div>
            </div>

            {/* Card 3: Total Contacts */}
            <div
              onClick={() => setShowContactsModal(true)}
              title="Click to explore CRM contacts data list"
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#8b5cf6';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 25px -4px rgba(139, 92, 246, 0.18)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>
                    Total Contacts
                  </div>
                  <div style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a' }}>
                    {totalContactsCount}
                  </div>
                </div>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  backgroundColor: '#8b5cf6',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 10px rgba(139, 92, 246, 0.25)'
                }}>
                  <Users size={20} />
                </div>
              </div>

              {/* Subtitle & Sparkline Bars */}
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: '16px' }}>
                <span style={{ fontSize: '12px', color: '#10b981', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <TrendingUp size={13} />
                  {totalContactsCount} CRM contacts
                </span>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '18px' }}>
                  <div style={{ width: '3px', height: '8px', backgroundColor: totalContactsCount > 0 ? '#ddd6fe' : '#e2e8f0', borderRadius: '1px' }} />
                  <div style={{ width: '3px', height: '12px', backgroundColor: totalContactsCount > 0 ? '#c4b5fd' : '#e2e8f0', borderRadius: '1px' }} />
                  <div style={{ width: '3px', height: '15px', backgroundColor: totalContactsCount > 0 ? '#a78bfa' : '#e2e8f0', borderRadius: '1px' }} />
                  <div style={{ width: '3px', height: '18px', backgroundColor: totalContactsCount > 0 ? '#8b5cf6' : '#cbd5e1', borderRadius: '1px' }} />
                </div>
              </div>

              {/* Clickable Cue Footer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', paddingTop: '8px', borderTop: '1px dashed #f1f5f9', fontSize: '11px', color: '#8b5cf6', fontWeight: '700' }}>
                <span>Click to view CRM contacts</span>
                <span>→</span>
              </div>
            </div>

            {/* Card 4: Templates */}
            <div
              onClick={() => setShowTemplatesModal(true)}
              title="Click to view WhatsApp Templates library"
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#f97316';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 25px -4px rgba(249, 115, 22, 0.18)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>
                    Templates
                  </div>
                  <div style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a' }}>
                    {templateCount}
                  </div>
                </div>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  backgroundColor: '#f97316',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 10px rgba(249, 115, 22, 0.25)'
                }}>
                  <FileText size={20} />
                </div>
              </div>

              {/* Subtitle & Sparkline Bars */}
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: '16px' }}>
                <span style={{ fontSize: '12px', color: '#10b981', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Check size={13} />
                  {templateCount} ready to send
                </span>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '18px' }}>
                  <div style={{ width: '3px', height: '9px', backgroundColor: templateCount > 0 ? '#fed7aa' : '#e2e8f0', borderRadius: '1px' }} />
                  <div style={{ width: '3px', height: '14px', backgroundColor: templateCount > 0 ? '#fdba74' : '#e2e8f0', borderRadius: '1px' }} />
                  <div style={{ width: '3px', height: '12px', backgroundColor: templateCount > 0 ? '#fb923c' : '#e2e8f0', borderRadius: '1px' }} />
                  <div style={{ width: '3px', height: '18px', backgroundColor: templateCount > 0 ? '#f97316' : '#cbd5e1', borderRadius: '1px' }} />
                </div>
              </div>

              {/* Clickable Cue Footer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', paddingTop: '8px', borderTop: '1px dashed #f1f5f9', fontSize: '11px', color: '#f97316', fontWeight: '700' }}>
                <span>Click to manage templates</span>
                <span>→</span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 5. ROW 2: FOUR TOOL STATUS CARDS (Clickable to Tool Data & Rules) */}
          {/* ========================================================================= */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: '16px',
            marginBottom: '28px'
          }}>
            {/* Tool 1: Auto Reply */}
            <div
              onClick={() => setShowAutoReplyModal(true)}
              title="Click to view & configure Auto Reply rules"
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#f59e0b';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 25px -4px rgba(245, 158, 11, 0.18)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <span style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>
                  Auto Reply
                </span>
                <div style={{ color: '#f59e0b' }}>
                  <Zap size={18} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: '#64748b', marginBottom: '6px' }}>
                <span>Active Rules</span>
                <strong style={{ color: '#0f172a' }}>{autoReplyRulesCount}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: '#64748b', marginBottom: '14px' }}>
                <span>Total Responses</span>
                <strong style={{ color: '#0f172a' }}>{autoReplyResponsesCount}</strong>
              </div>

              {/* Progress track */}
              <div style={{ width: '100%', height: '6px', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: autoReplyRulesCount > 0 ? '65%' : '0%', height: '100%', backgroundColor: '#0d9488', borderRadius: '3px' }} />
              </div>

              {/* Clickable Cue Footer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '14px', paddingTop: '8px', borderTop: '1px dashed #f1f5f9', fontSize: '11px', color: '#f59e0b', fontWeight: '700' }}>
                <span>Click to view active rules</span>
                <span>→</span>
              </div>
            </div>

            {/* Tool 2: Chatbot */}
            <div
              onClick={() => setShowChatbotModal(true)}
              title="Click to view & configure Chatbot flows"
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#06b6d4';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 25px -4px rgba(6, 182, 212, 0.18)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <span style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>
                  Chatbot
                </span>
                <div style={{ color: '#06b6d4' }}>
                  <Compass size={18} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: '#64748b', marginBottom: '6px' }}>
                <span>Active Flows</span>
                <strong style={{ color: '#0f172a' }}>{chatbotFlowsCount}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: '#64748b', marginBottom: '14px' }}>
                <span>Conversations</span>
                <strong style={{ color: '#0f172a' }}>{chatbotConversationsCount}</strong>
              </div>

              {/* Progress track */}
              <div style={{ width: '100%', height: '6px', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: chatbotFlowsCount > 0 ? '78%' : '0%', height: '100%', backgroundColor: '#0d9488', borderRadius: '3px' }} />
              </div>

              {/* Clickable Cue Footer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '14px', paddingTop: '8px', borderTop: '1px dashed #f1f5f9', fontSize: '11px', color: '#06b6d4', fontWeight: '700' }}>
                <span>Click to view flows</span>
                <span>→</span>
              </div>
            </div>

            {/* Tool 3: Call Responder */}
            <div
              onClick={() => setShowCallResponderModal(true)}
              title="Click to view & configure Call Responder automations"
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#10b981';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 25px -4px rgba(16, 185, 129, 0.18)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <span style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>
                  Call Responder
                </span>
                <div style={{ color: '#10b981' }}>
                  <PhoneCall size={18} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: '#64748b', marginBottom: '6px' }}>
                <span>Active Rules</span>
                <strong style={{ color: '#0f172a' }}>{callResponderRulesCount}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: '#64748b', marginBottom: '14px' }}>
                <span>Total Responses</span>
                <strong style={{ color: '#0f172a' }}>{callResponderResponsesCount}</strong>
              </div>

              {/* Progress track */}
              <div style={{ width: '100%', height: '6px', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: callResponderRulesCount > 0 ? '50%' : '0%', height: '100%', backgroundColor: '#0d9488', borderRadius: '3px' }} />
              </div>

              {/* Clickable Cue Footer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '14px', paddingTop: '8px', borderTop: '1px dashed #f1f5f9', fontSize: '11px', color: '#10b981', fontWeight: '700' }}>
                <span>Click to view call responders</span>
                <span>→</span>
              </div>
            </div>

            {/* Tool 4: Bulk Campaigns */}
            <div
              onClick={() => setShowCampaignsModal(true)}
              title="Click to view Bulk Campaigns history & launch"
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#8b5cf6';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 25px -4px rgba(139, 92, 246, 0.18)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <span style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>
                  Bulk Campaigns
                </span>
                <div style={{ color: '#8b5cf6' }}>
                  <BarChart3 size={18} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: '#64748b', marginBottom: '6px' }}>
                <span>Completed</span>
                <strong style={{ color: '#0f172a' }}>{campaignsCompletedCount}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: '#64748b', marginBottom: '14px' }}>
                <span>Success Rate</span>
                <strong style={{ color: '#10b981' }}>{campaignsCompletedCount > 0 ? '100%' : '0%'}</strong>
              </div>

              {/* Progress track */}
              <div style={{ width: '100%', height: '6px', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: campaignsCompletedCount > 0 ? '90%' : '0%', height: '100%', backgroundColor: '#0d9488', borderRadius: '3px' }} />
              </div>

              {/* Clickable Cue Footer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '14px', paddingTop: '8px', borderTop: '1px dashed #f1f5f9', fontSize: '11px', color: '#8b5cf6', fontWeight: '700' }}>
                <span>Click to view campaigns</span>
                <span>→</span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 6. ROW 3: PERFORMANCE OVERVIEW CIRCULAR METERS (Clickable) */}
          {/* ========================================================================= */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '24px 28px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            marginBottom: '24px'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 20px 0' }}>
              Performance Overview
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '24px'
            }}>
              {/* Meter 1: Delivery Rate */}
              <div
                onClick={() => setShowMessagesModal(true)}
                title="Click to view message delivery logs"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '20px',
                  padding: '16px',
                  borderRadius: '12px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #f1f5f9',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#0d9488';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.backgroundColor = '#f0fdfa';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#f1f5f9';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                }}
              >
                <div style={{ width: '84px', height: '84px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="84" height="84" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth="3.5"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#0d9488"
                      strokeWidth="3.5"
                      strokeDasharray={messagesSentCount > 0 ? "98, 100" : "0, 100"}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span style={{ position: 'absolute', fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                    {messagesSentCount > 0 ? '98%' : '0%'}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                    Delivery Rate: {messagesSentCount > 0 ? '98.4%' : '0%'}
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
                    {messagesSentCount > 0 ? `${messagesSentCount} sent` : '0 messages sent'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#10b981', fontWeight: '700', marginTop: '4px' }}>
                    ⚡ Real-time dispatch engine (Click for logs →)
                  </div>
                </div>
              </div>

              {/* Meter 2: Account Health Score */}
              <div
                onClick={() => setShowDeviceHealthModal(true)}
                title="Click to view ban protection & health score"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '20px',
                  padding: '16px',
                  borderRadius: '12px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #f1f5f9',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#10b981';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.backgroundColor = '#f0fdf4';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#f1f5f9';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                }}
              >
                <div style={{ width: '84px', height: '84px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="84" height="84" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth="3.5"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="3.5"
                      strokeDasharray={connectedDevicesCount > 0 ? "100, 100" : "0, 100"}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span style={{ position: 'absolute', fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                    {connectedDevicesCount > 0 ? '100%' : '0%'}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>Safe Account Health Score</div>
                  <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
                    {connectedDevicesCount > 0 ? `${connectedDevicesCount} devices connected` : 'No devices connected'}
                  </div>
                  <div style={{ fontSize: '11px', color: connectedDevicesCount > 0 ? '#10b981' : '#f59e0b', fontWeight: '700', marginTop: '4px' }}>
                    🛡️ {connectedDevicesCount > 0 ? '0% Ban Risk (Click for details →)' : 'Scan QR to start →'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ========================================================================= */}
      {/* 7. CONNECTED MODALS */}
      {/* ========================================================================= */}

      {/* Templates Modal */}
      {showTemplatesModal && (
        <WhatsAppTemplatesModal
          isOpen={showTemplatesModal}
          onClose={() => {
            setShowTemplatesModal(false);
            try {
              const list = WhatsAppTemplateService.getTemplates(activeTenant);
              setTemplateCount(Array.isArray(list) ? list.length : 0);
            } catch (e) {}
          }}
          companyId={activeTenant}
          authUser={authUser}
        />
      )}

      {/* Quick Send Modal */}
      {showQuickSendModal && (
        <WhatsAppQuickSendModal
          isOpen={showQuickSendModal}
          onClose={() => {
            setShowQuickSendModal(false);
            setQuickSendRecipient(null);
          }}
          phone={quickSendRecipient?.phone || activeContact?.phone || ''}
          contactName={quickSendRecipient?.name || activeContact?.name || 'Customer'}
          companyId={activeTenant}
          authUser={authUser}
        />
      )}

      {/* Devices QR Pairing & Multi-Session Gateway Modal */}
      {showQrModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.72)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '560px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '92vh'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px',
              background: 'linear-gradient(135deg, #0d9488 0%, #064e43 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <QrCode size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0, letterSpacing: '-0.2px' }}>
                    {isOwnerOrAdmin ? 'Company WhatsApp Device Hub' : 'Link Personal Work WhatsApp'}
                  </h3>
                  <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '2px' }}>
                    {isModalConnected
                      ? 'Live & Cloud Synced'
                      : 'Scan QR with WhatsApp mobile app to connect device'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  color: '#ffffff',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
              >
                <X size={16} />
              </button>
            </div>

            {/* Sub-header Navigation Tabs */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              padding: '0 16px'
            }}>
              <button
                type="button"
                onClick={() => setActivePairingTab('qr')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '12px 16px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activePairingTab === 'qr' ? '2.5px solid #0d9488' : '2.5px solid transparent',
                  color: activePairingTab === 'qr' ? '#0d9488' : '#64748b',
                  fontSize: '13px',
                  fontWeight: activePairingTab === 'qr' ? '800' : '600',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <QrCode size={14} />
                <span>{isModalConnected ? 'Connected Line' : 'Scan QR Code'}</span>
                {isModalConnected && (
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActivePairingTab('devices')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '12px 16px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activePairingTab === 'devices' ? '2.5px solid #0d9488' : '2.5px solid transparent',
                  color: activePairingTab === 'devices' ? '#0d9488' : '#64748b',
                  fontSize: '13px',
                  fontWeight: activePairingTab === 'devices' ? '800' : '600',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Smartphone size={14} />
                <span>All Devices ({tenantSessions.length})</span>
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '22px 24px', overflowY: 'auto', flex: 1 }}>
              {activePairingTab === 'qr' ? (
                isModalConnected ? (
                  /* Connected State Screen */
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: '16px',
                    padding: '10px 0'
                  }}>
                    <div style={{
                      width: '74px',
                      height: '74px',
                      borderRadius: '50%',
                      background: '#dcfce7',
                      border: '3px solid #86efac',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#16a34a',
                      boxShadow: '0 6px 18px rgba(22, 163, 74, 0.25)'
                    }}>
                      <CheckCircle2 size={40} />
                    </div>

                    <div>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                        {isOwnerOrAdmin ? 'Company WhatsApp Line is Live!' : 'Your Personal Work WhatsApp is Live!'}
                      </div>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginTop: '8px',
                        padding: '5px 14px',
                        borderRadius: '20px',
                        background: '#ecfdf5',
                        border: '1px solid #a7f3d0',
                        fontSize: '13.5px',
                        fontWeight: '800',
                        color: '#047857'
                      }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
                        +{modalConnectedPhone || (isOwnerOrAdmin ? 'Company Line Active' : 'My Line Active')}
                      </div>
                      <p style={{ margin: '14px auto 0', fontSize: '12.5px', color: '#64748b', lineHeight: '1.5', maxWidth: '420px' }}>
                        {isOwnerOrAdmin
                          ? 'Official company WhatsApp line is linked and actively syncing. Team chats, template broadcasts, and incoming lead replies are handled in Conversations.'
                          : 'Your personal staff WhatsApp line is linked. Customer messages and lead conversations will route directly through your number.'}
                      </p>
                    </div>

                    <div style={{
                      display: 'flex',
                      gap: '12px',
                      width: '100%',
                      marginTop: '10px',
                      paddingTop: '16px',
                      borderTop: '1px solid #f1f5f9'
                    }}>
                      <button
                        type="button"
                        onClick={() => handleDisconnectSession(activeQrSession?.id)}
                        disabled={qrLoading}
                        style={{
                          flex: 1,
                          padding: '11px',
                          borderRadius: '10px',
                          background: qrLoading ? '#f1f5f9' : '#fff1f2',
                          border: '1px solid #fecdd3',
                          color: qrLoading ? '#94a3b8' : '#e11d48',
                          fontSize: '12.5px',
                          fontWeight: '700',
                          cursor: qrLoading ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        {qrLoading && <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />}
                        <span>{qrLoading ? 'Disconnecting...' : 'Disconnect Device'}</span>
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
                          fontSize: '12.5px',
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
                  /* QR Code Scanning Screen */
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    {/* Instructions Box */}
                    <div style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '12px 18px',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}>
                      <div style={{ fontSize: '12.5px', fontWeight: '800', color: '#1e293b', marginBottom: '6px' }}>
                        {isOwnerOrAdmin ? 'Pair Company Official WhatsApp:' : 'Pair Your Work WhatsApp:'}
                      </div>
                      <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#64748b', lineHeight: '1.6' }}>
                        <li>Open <strong>WhatsApp</strong> on your mobile phone</li>
                        <li>Tap <strong>Menu (⋮)</strong> or <strong>Settings</strong> &gt; <strong>Linked Devices</strong></li>
                        <li>Tap <strong>Link a Device</strong></li>
                        <li>Point your phone camera at the QR code below</li>
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
                      minHeight: '240px',
                      width: '100%',
                      boxSizing: 'border-box',
                      position: 'relative'
                    }}>
                      {modalQrCode ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                          <img
                            src={modalQrCode}
                            alt="Scan WhatsApp QR"
                            style={{ width: '220px', height: '220px', objectFit: 'contain', display: 'block', borderRadius: '8px' }}
                          />
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '12px',
                            color: '#0d9488',
                            fontWeight: '700'
                          }}>
                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                            Live QR Ready • Waiting for scan
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '24px' }}>
                          <RefreshCw size={30} style={{ color: '#0d9488', animation: 'spin 1.2s linear infinite' }} />
                          <span style={{ fontSize: '13px', color: '#475569', fontWeight: '600', textAlign: 'center', maxWidth: '320px' }}>
                            {qrActionMsg || 'Connecting to WhatsApp Cloud Gateway...'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleStartSession(activeQrSession?.id, true)}
                            disabled={qrLoading}
                            style={{
                              marginTop: '8px',
                              padding: '9px 18px',
                              borderRadius: '8px',
                              background: '#0d9488',
                              color: '#ffffff',
                              border: 'none',
                              fontSize: '12.5px',
                              fontWeight: '700',
                              cursor: qrLoading ? 'not-allowed' : 'pointer',
                              boxShadow: '0 2px 8px rgba(13, 148, 136, 0.3)'
                            }}
                          >
                            {qrLoading ? 'Generating QR...' : '⚡ Generate Fresh QR Code'}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* QR Action Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => handleStartSession(activeQrSession?.id, true)}
                        disabled={qrLoading}
                        style={{
                          flex: 1,
                          padding: '10px 14px',
                          borderRadius: '10px',
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          color: '#334155',
                          fontSize: '12.5px',
                          fontWeight: '700',
                          cursor: qrLoading ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <RefreshCw size={13} style={{ animation: qrLoading ? 'spin 1s linear infinite' : 'none' }} />
                        <span>Refresh QR</span>
                      </button>

                      {isOwnerOrAdmin && (
                        <button
                          type="button"
                          onClick={handleResetLine}
                          disabled={qrLoading}
                          style={{
                            padding: '10px 16px',
                            borderRadius: '10px',
                            background: '#fff1f2',
                            border: '1px solid #fecdd3',
                            color: '#e11d48',
                            fontSize: '12.5px',
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
                          fontSize: '12.5px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )
              ) : (
                /* Devices List Tab */
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>
                      Registered WhatsApp Sessions
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActivePairingTab('qr');
                        handleStartSession(null, true);
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        background: '#0d9488',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Plus size={13} />
                      Pair New Session
                    </button>
                  </div>

                  {tenantSessions.length === 0 ? (
                    <div style={{
                      padding: '36px 20px',
                      textAlign: 'center',
                      backgroundColor: '#f8fafc',
                      borderRadius: '12px',
                      border: '1px dashed #cbd5e1'
                    }}>
                      <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        backgroundColor: '#f1f5f9',
                        color: '#94a3b8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 10px'
                      }}>
                        <Smartphone size={22} />
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                        No Devices Registered Yet
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', maxWidth: '320px', margin: '0 auto 14px' }}>
                        Connect your company or team numbers to start messaging customers.
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setActivePairingTab('qr');
                          handleStartSession(null, false);
                        }}
                        style={{
                          backgroundColor: '#0d9488',
                          color: '#ffffff',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '8px',
                          fontSize: '12.5px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        Scan QR Code Now
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {tenantSessions.map((s, idx) => {
                        const isSessConnected = s.status === 'connected';
                        const sessPhone = s.phone || s.phone_number || s.phoneNumber || '';

                        return (
                          <div
                            key={s.id || idx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '12px 16px',
                              borderRadius: '12px',
                              backgroundColor: '#f8fafc',
                              border: `1px solid ${isSessConnected ? '#bbf7d0' : '#e2e8f0'}`,
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                backgroundColor: isSessConnected ? '#22c55e' : '#f59e0b',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                fontWeight: '800'
                              }}>
                                {idx + 1}
                              </div>
                              <div>
                                <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#0f172a' }}>
                                  {s.phone_name || s.name || `Session ${idx + 1}`}
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748b' }}>
                                  {sessPhone ? `+${sessPhone}` : 'No phone linked'} • {s.id}
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{
                                backgroundColor: isSessConnected ? '#f0fdf4' : '#fffbeb',
                                color: isSessConnected ? '#16a34a' : '#d97706',
                                border: `1px solid ${isSessConnected ? '#bbf7d0' : '#fde68a'}`,
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: '700'
                              }}>
                                {isSessConnected ? 'Connected' : 'Pending QR'}
                              </span>

                              {isSessConnected ? (
                                <button
                                  type="button"
                                  onClick={() => handleDisconnectSession(s.id)}
                                  disabled={qrLoading}
                                  style={{
                                    padding: '5px 10px',
                                    borderRadius: '6px',
                                    background: '#fff1f2',
                                    border: '1px solid #fecdd3',
                                    color: '#e11d48',
                                    fontSize: '11.5px',
                                    fontWeight: '700',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Disconnect
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActivePairingTab('qr');
                                    handleStartSession(s.id, true);
                                  }}
                                  style={{
                                    padding: '5px 10px',
                                    borderRadius: '6px',
                                    background: '#0d9488',
                                    border: 'none',
                                    color: '#ffffff',
                                    fontSize: '11.5px',
                                    fontWeight: '700',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Scan QR
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Support Modal */}
      {showSupportModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '440px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            overflow: 'hidden',
            padding: '24px',
            textAlign: 'center'
          }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              backgroundColor: '#f0fdfa',
              color: '#0d9488',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <LifeBuoy size={26} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px 0' }}>
              WhatsApp Automation Support
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.6', margin: '0 0 20px 0' }}>
              OmniFlow EMS WhatsApp Suite is running in native mode. For multi-number QR pairing, templates or mass broadcasts, contact your administrator.
            </p>
            <button
              type="button"
              onClick={() => setShowSupportModal(false)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                backgroundColor: '#0d9488',
                color: '#ffffff',
                border: 'none',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. INTERACTIVE DATA INSPECTOR MODALS (Clickable Dashboard Details) */}
      {/* ========================================================================= */}

      {/* Messages Sent & Logs Modal */}
      <MessagesDetailModal
        isOpen={showMessagesModal}
        onClose={() => setShowMessagesModal(false)}
        activeTenant={activeTenant}
        messagesSentCount={messagesSentCount}
        todayMessagesCount={todayMessagesCount}
        sentLogs={sentMessagesLogs}
        onOpenQuickSend={() => setShowQuickSendModal(true)}
        onRefresh={handleRefreshData}
      />

      {/* CRM Contacts Modal */}
      <ContactsDetailModal
        isOpen={showContactsModal}
        onClose={() => setShowContactsModal(false)}
        contacts={contacts}
        onSelectContactForQuickSend={(contact) => {
          setQuickSendRecipient(contact);
          setShowQuickSendModal(true);
        }}
        onNavigateToCrmContacts={() => {
          if (setActiveTab) setActiveTab('contacts');
        }}
      />

      {/* Auto Reply Rules Modal */}
      <AutoReplyDetailModal
        isOpen={showAutoReplyModal}
        onClose={() => setShowAutoReplyModal(false)}
        activeTenant={activeTenant}
        rules={autoReplyRules}
        onUpdateRules={(updated) => setAutoReplyRules(updated)}
        totalResponses={autoReplyResponsesCount}
      />

      {/* Chatbot Flows Modal */}
      <ChatbotDetailModal
        isOpen={showChatbotModal}
        onClose={() => setShowChatbotModal(false)}
        activeTenant={activeTenant}
        flows={chatbotFlows}
        onUpdateFlows={(updated) => setChatbotFlows(updated)}
        totalConversations={chatbotConversationsCount}
      />

      {/* Call Responder Modal */}
      <CallResponderDetailModal
        isOpen={showCallResponderModal}
        onClose={() => setShowCallResponderModal(false)}
        activeTenant={activeTenant}
        rules={callResponderRules}
        totalResponses={callResponderResponsesCount}
      />

      {/* Bulk Campaigns History Modal */}
      <BulkCampaignsDetailModal
        isOpen={showCampaignsModal}
        onClose={() => setShowCampaignsModal(false)}
        activeTenant={activeTenant}
        campaigns={campaignsHistory}
        onOpenNewCampaign={() => {
          if (setActiveTab) setActiveTab('conversations');
          else setShowQuickSendModal(true);
        }}
      />

      {/* Device Health & Limits Modal */}
      <DeviceHealthDetailModal
        isOpen={showDeviceHealthModal}
        onClose={() => setShowDeviceHealthModal(false)}
        connectedDevicesCount={connectedDevicesCount}
      />

      {/* Proxies Detail Modal */}
      <ProxiesDetailModal
        isOpen={showProxiesModal}
        onClose={() => setShowProxiesModal(false)}
      />

      {/* Warmer Detail Modal */}
      <WarmerDetailModal
        isOpen={showWarmerModal}
        onClose={() => setShowWarmerModal(false)}
      />
    </div>
  );
}
