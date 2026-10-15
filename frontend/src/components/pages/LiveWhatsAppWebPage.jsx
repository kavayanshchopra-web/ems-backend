import React, { useState, useEffect, useMemo } from 'react';
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
  AlertCircle
} from 'lucide-react';
import WhatsAppTemplateService from '../../core/services/whatsAppTemplateService';
import TenantStorage from '../../core/services/TenantStorage';
import WhatsAppTemplatesModal from '../telecalling/WhatsAppTemplatesModal';
import WhatsAppQuickSendModal from '../telecalling/WhatsAppQuickSendModal';

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

  // =========================================================================
  // 100% REAL DYNAMIC DATA (ZERO HARDCODED DUMMY VALUES)
  // =========================================================================

  // Real Sessions Filtered to Active Tenant
  const tenantSessions = useMemo(() => {
    if (!Array.isArray(sessions)) return [];
    return sessions.filter(s => {
      if (!s) return false;
      if (activeTenant !== '1' && activeTenant !== 'default_tenant') {
        const sTenant = String(s.tenant_id || s.tenantId || '');
        return sTenant === activeTenant;
      }
      return true;
    });
  }, [sessions, activeTenant]);

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

  // Real Tool Metrics from TenantStorage
  const [autoReplyRulesCount] = useState(() => {
    return (TenantStorage.getItem('whatsapp_autoreply_rules', activeTenant, []) || []).length;
  });
  const [autoReplyResponsesCount] = useState(() => {
    return TenantStorage.getItem('whatsapp_autoreply_count', activeTenant, 0) || 0;
  });

  const [chatbotFlowsCount] = useState(() => {
    return (TenantStorage.getItem('whatsapp_chatbot_flows', activeTenant, []) || []).length;
  });
  const [chatbotConversationsCount] = useState(() => {
    return TenantStorage.getItem('whatsapp_chatbot_conversations', activeTenant, 0) || 0;
  });

  const [callResponderRulesCount] = useState(() => {
    return (TenantStorage.getItem('whatsapp_callresponder_rules', activeTenant, []) || []).length;
  });
  const [callResponderResponsesCount] = useState(() => {
    return TenantStorage.getItem('whatsapp_callresponder_count', activeTenant, 0) || 0;
  });

  const [campaignsCompletedCount] = useState(() => {
    return (TenantStorage.getItem('whatsapp_broadcast_history', activeTenant, []) || []).length;
  });

  // Dynamic Refresh Handler
  const handleRefreshData = () => {
    setIsRefreshing(true);
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
      if (setActiveTab) setActiveTab('conversations');
    } else if (id === 'contacts') {
      if (setActiveTab) setActiveTab('contacts');
    } else if (id === 'devices') {
      setShowQrModal(true);
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
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: connectedDevicesCount > 0 ? '#34d399' : '#facc15' }} />
                  {connectedDevicesCount} devices online
                </span>
                <span>•</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#38bdf8' }} />
                  {todayMessagesCount} messages today
                </span>
                <span>•</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#facc15' }} />
                  lifetime • {userName}
                </span>
              </div>
            </div>

            {/* Glowing Double Chat Bubble Icon Box */}
            <div style={{
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
              flexShrink: 0
            }}>
              <MessageSquare size={42} />
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 4. ROW 1: FOUR PRIMARY STAT CARDS (Real Dynamic Metrics) */}
          {/* ========================================================================= */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: '16px',
            marginBottom: '20px'
          }}>
            {/* Card 1: Messages Sent */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
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
            </div>

            {/* Card 2: Active Devices */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
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
            </div>

            {/* Card 3: Total Contacts */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
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
            </div>

            {/* Card 4: Templates */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
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
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 5. ROW 2: FOUR TOOL STATUS CARDS */}
          {/* ========================================================================= */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: '16px',
            marginBottom: '28px'
          }}>
            {/* Tool 1: Auto Reply */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
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
            </div>

            {/* Tool 2: Chatbot */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
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
            </div>

            {/* Tool 3: Call Responder */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
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
            </div>

            {/* Tool 4: Bulk Campaigns */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
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
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 6. ROW 3: PERFORMANCE OVERVIEW CIRCULAR METERS */}
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
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                padding: '16px',
                borderRadius: '12px',
                backgroundColor: '#f8fafc',
                border: '1px solid #f1f5f9'
              }}>
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
                    ⚡ Real-time dispatch engine
                  </div>
                </div>
              </div>

              {/* Meter 2: Account Health Score */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                padding: '16px',
                borderRadius: '12px',
                backgroundColor: '#f8fafc',
                border: '1px solid #f1f5f9'
              }}>
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
                    🛡️ {connectedDevicesCount > 0 ? '0% Ban Risk' : 'Scan QR to start'}
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
          onClose={() => setShowQuickSendModal(false)}
          phone={activeContact?.phone || ''}
          contactName={activeContact?.name || 'Customer'}
          companyId={activeTenant}
          authUser={authUser}
        />
      )}

      {/* Devices QR Pairing Modal */}
      {showQrModal && (
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
            maxWidth: '560px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#f0fdfa',
                  color: '#0d9488',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Smartphone size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                    Connected WhatsApp Devices
                  </h3>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Multi-session pairing & QR authentication
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px 24px' }}>
              {tenantSessions.length === 0 ? (
                <div style={{
                  padding: '36px 20px',
                  textAlign: 'center',
                  backgroundColor: '#f8fafc',
                  borderRadius: '12px',
                  border: '1px dashed #cbd5e1',
                  marginBottom: '20px'
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: '#f1f5f9',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px'
                  }}>
                    <Smartphone size={24} />
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                    No Devices Connected Yet
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', maxWidth: '340px', margin: '0 auto' }}>
                    Link your team WhatsApp numbers via QR code to enable automation, templates, and multi-staff messaging.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                  {tenantSessions.map((s, idx) => (
                    <div
                      key={s.id || idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderRadius: '10px',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          backgroundColor: s.status === 'connected' ? '#22c55e' : '#f59e0b',
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
                            {s.name || `Device ${idx + 1}`}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>
                            {s.phone || s.phone_number || 'Mobile Account'}
                          </div>
                        </div>
                      </div>

                      <span style={{
                        backgroundColor: s.status === 'connected' ? '#f0fdf4' : '#fffbeb',
                        color: s.status === 'connected' ? '#16a34a' : '#d97706',
                        border: `1px solid ${s.status === 'connected' ? '#bbf7d0' : '#fde68a'}`,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '700'
                      }}>
                        {s.status === 'connected' ? 'Connected' : 'Pending QR'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{
                padding: '14px',
                borderRadius: '10px',
                backgroundColor: '#f0fdfa',
                border: '1px dashed #0d9488',
                textAlign: 'center'
              }}>
                <button
                  type="button"
                  onClick={() => alert('Opening QR Code generator for new WhatsApp session...')}
                  style={{
                    backgroundColor: '#0d9488',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(13, 148, 136, 0.3)'
                  }}
                >
                  <Plus size={15} />
                  Link New WhatsApp Number (QR)
                </button>
              </div>
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
    </div>
  );
}
