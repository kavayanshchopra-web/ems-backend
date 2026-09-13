import React, { useState, useEffect, useMemo } from 'react';
import {
  Home,
  Clock,
  Phone,
  PhoneCall,
  Users,
  Grid,
  Search,
  Settings,
  Bell,
  Sparkles,
  RotateCw,
  Edit2,
  Check,
  Plus,
  MessageSquare,
  MessageCircle,
  Briefcase,
  CreditCard,
  FileText,
  Trash2,
  Calendar,
  Layers,
  ClipboardList,
  CheckCircle,
  DollarSign,
  HardDrive,
  Globe,
  Tag,
  Sliders,
  HelpCircle,
  MessageSquareHeart,
  UserCheck,
  Share2,
  Receipt,
  X
} from 'lucide-react';

// Master list of all platform modules for the All Apps directory
const SYSTEM_MODULES = [
  {
    category: 'CRM & Sales',
    items: [
      { id: 'contacts', label: 'Contacts', icon: Users, desc: 'Clients & Leads Database' },
      { id: 'conversations', label: 'Conversations', icon: MessageSquare, desc: 'Omnichannel Inbox' },
      { id: 'wa_live_web', label: 'WhatsApp', icon: MessageCircle, desc: 'Live WhatsApp Web' },
      { id: 'kanban', label: 'Deals CRM', icon: Layers, desc: 'Visual Sales Pipeline' },
      { id: 'telecalling', label: 'Phone System', icon: PhoneCall, desc: 'SIM & Cloud Dialer' },
    ]
  },
  {
    category: 'Insights & Productivity',
    items: [
      { id: 'admin_dashboard', label: 'Dashboard', icon: Grid, desc: 'Executive Analytics' },
      { id: 'manager_dashboard', label: 'Task Analytics', icon: ClipboardList, desc: 'Team Performance' },
      { id: 'gps_attendance', label: 'Live Tracking', icon: Globe, desc: 'Field Team GPS' },
      { id: 'audit_logs', label: 'Audit Logs', icon: FileText, desc: 'Security Trail' },
      { id: 'media_storage', label: 'Media Vault', icon: HardDrive, desc: 'Cloud Storage' }
    ]
  },
  {
    category: 'HR & Workforce',
    items: [
      { id: 'employees', label: 'Employees', icon: Users, desc: 'Staff Directory' },
      { id: 'recruitment_ats', label: 'Recruitment ATS', icon: Briefcase, desc: 'Candidate Pipeline' },
      { id: 'asset_management', label: 'Asset Vault', icon: HardDrive, desc: 'Company Equipment' },
      { id: 'verify_documents', label: 'Verify Docs', icon: FileText, desc: 'KYC & Verification' },
      { id: 'offboarding', label: 'Offboarding', icon: Trash2, desc: 'Exit Clearance' }
    ]
  },
  {
    category: 'Payroll & Finance',
    items: [
      { id: 'payroll', label: 'Payroll & Salary', icon: CreditCard, desc: 'Monthly Salary' },
      { id: 'taxes_compliance', label: 'Taxes & PF', icon: FileText, desc: 'Statutory Returns' },
      { id: 'ff_settlements', label: 'F&F Settlements', icon: CheckCircle, desc: 'Full & Final' },
      { id: 'advances_loans', label: 'Advances & Loans', icon: DollarSign, desc: 'Staff Advances' },
      { id: 'expenses', label: 'Expenses Claim', icon: Receipt, desc: 'Reimbursements' }
    ]
  },
  {
    category: 'Operations',
    items: [
      { id: 'tasks', label: 'Tasks', icon: ClipboardList, desc: 'Kanban Tasks' },
      { id: 'office_kiosk', label: 'Attendance Kiosk', icon: Clock, desc: 'Self Punch Kiosk' },
      { id: 'my_attendance', label: 'Shift Attendance', icon: Clock, desc: 'Daily Duty In/Out' },
      { id: 'leaves', label: 'Leaves', icon: Calendar, desc: 'Time Off Requests' },
      { id: 'shifts', label: 'Work Roster', icon: Calendar, desc: 'Weekly Shifts' },
      { id: 'notice_board', label: 'Notice Board', icon: Bell, desc: 'Company Bulletins' },
      { id: 'holidays', label: 'Holidays List', icon: Calendar, desc: 'Calendar Holidays' }
    ]
  },
  {
    category: 'Settings & Portal',
    items: [
      { id: 'settings', label: 'Settings', icon: Settings, desc: 'General Preferences' },
      { id: 'roles_permissions', label: 'Roles & Security', icon: UserCheck, desc: 'Access Matrix' },
      { id: 'integrations', label: 'Integrations', icon: Share2, desc: 'Webhooks & APIs' },
      { id: 'system_dropdowns', label: 'Dropdowns', icon: Tag, desc: 'Custom Lists' },
      { id: 'module_configuration', label: 'Module Config', icon: Sliders, desc: 'Field Customizer' },
      { id: 'billing', label: 'Billing & Plans', icon: CreditCard, desc: 'SaaS Subscriptions' },
      { id: 'app_guide', label: 'App Guide', icon: HelpCircle, desc: 'System Tour' },
      { id: 'feedback', label: 'Feedback', icon: MessageSquareHeart, desc: 'Suggestions' }
    ]
  }
];

const DEFAULT_PINNED_IDS = ['contacts', 'kanban', 'telecalling', 'wa_live_web', 'my_attendance', 'tasks'];

export default function MobileAppLauncher({
  currentView = 'home', // 'home' | 'all_apps'
  onNavigate,
  canNav = () => true,
  authUser,
  tenantSubscription,
  metrics = {}
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isBookmarkModalOpen, setIsBookmarkModalOpen] = useState(false);
  const [bookmarkSearch, setBookmarkSearch] = useState('');

  // Persisted pinned apps in localStorage
  const [pinnedAppIds, setPinnedAppIds] = useState(() => {
    try {
      const saved = localStorage.getItem('omniflow_pinned_apps');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_PINNED_IDS;
  });

  const isAndroidApp = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const urlParams = new URLSearchParams(window.location.search);
    return !!(
      window.AndroidApp ||
      window.OmniFlowNative ||
      (navigator.userAgent && navigator.userAgent.includes('OmniFlowAndroidApp')) ||
      urlParams.get('app') === 'android'
    );
  }, []);

  // Dynamic Company & User Branding (strictly dynamic based on logged in tenant/user)
  const companyName = useMemo(() => {
    if (authUser?.companyName && authUser.companyName.trim()) return authUser.companyName.trim();
    if (authUser?.company_name && authUser.company_name.trim()) return authUser.company_name.trim();
    if (authUser?.company && typeof authUser.company === 'string' && authUser.company.trim()) return authUser.company.trim();
    if (authUser?.tenant?.company_name && authUser.tenant.company_name.trim()) return authUser.tenant.company_name.trim();
    if (authUser?.tenantName && authUser.tenantName.trim()) return authUser.tenantName.trim();
    if (tenantSubscription?.company_name && tenantSubscription.company_name.trim()) return tenantSubscription.company_name.trim();
    if (tenantSubscription?.companyName && tenantSubscription.companyName.trim()) return tenantSubscription.companyName.trim();
    
    // Check localStorage saved user if available
    try {
      const savedUserStr = localStorage.getItem('omnilflow_user');
      if (savedUserStr) {
        const savedUser = JSON.parse(savedUserStr);
        const savedComp = savedUser?.companyName || savedUser?.company_name || savedUser?.company;
        if (savedComp && typeof savedComp === 'string' && savedComp.trim()) return savedComp.trim();
      }
    } catch (e) {}

    const tId = authUser?.tenantId || authUser?.companyId || authUser?.tenant_id;
    if (tId) return `Company #${tId}`;
    const uName = authUser?.displayName || authUser?.name || authUser?.email?.split('@')[0];
    if (uName) return `${uName}'s Workspace`;
    return 'My Workspace';
  }, [authUser, tenantSubscription]);

  const userGreetingName = useMemo(() => {
    if (authUser?.name && typeof authUser.name === 'string' && authUser.name.trim()) return authUser.name.trim();
    if (authUser?.displayName && typeof authUser.displayName === 'string' && authUser.displayName.trim()) return authUser.displayName.trim();
    if (authUser?.fullName && typeof authUser.fullName === 'string' && authUser.fullName.trim()) return authUser.fullName.trim();
    if (authUser?.email && typeof authUser.email === 'string') {
      const prefix = authUser.email.split('@')[0].replace(/[._-]+/g, ' ');
      return prefix.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
    return 'User';
  }, [authUser]);

  const companyLocation = authUser?.city || authUser?.location || authUser?.address || 'Corporate Office';

  // Flatten available apps and filter by canNav engine permissions
  const allAvailableApps = useMemo(() => {
    const list = [];
    SYSTEM_MODULES.forEach(cat => {
      cat.items.forEach(item => {
        if (canNav(item.id)) {
          list.push({ ...item, category: cat.category });
        }
      });
    });
    return list;
  }, [canNav]);

  // Filtered categories for All Apps view
  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return SYSTEM_MODULES.map(cat => {
      const visibleItems = cat.items.filter(item => {
        if (!canNav(item.id)) return false;
        if (!q) return true;
        return (
          item.label.toLowerCase().includes(q) ||
          item.desc?.toLowerCase().includes(q) ||
          cat.category.toLowerCase().includes(q)
        );
      });
      return { ...cat, items: visibleItems };
    }).filter(cat => cat.items.length > 0);
  }, [searchQuery, canNav]);

  // Pinned items resolved from list
  const pinnedItems = useMemo(() => {
    const map = new Map(allAvailableApps.map(app => [app.id, app]));
    return pinnedAppIds.map(id => map.get(id)).filter(Boolean);
  }, [pinnedAppIds, allAvailableApps]);

  // Toggle app in bookmark selector
  const togglePinnedApp = (id) => {
    setPinnedAppIds(prev => {
      let next;
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev; // At least 1 must remain
        next = prev.filter(x => x !== id);
      } else {
        next = [...prev, id];
      }
      try {
        localStorage.setItem('omniflow_pinned_apps', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      background: '#f8fafc',
      color: '#0f172a',
      fontFamily: "'Inter', -apple-system, sans-serif",
      paddingBottom: isAndroidApp ? '20px' : '85px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* ── TOP HEADER: Dynamic Company Name, Location, Bell, Settings ── */}
      <header style={{
        background: '#ffffff',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #e2e8f0',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #064e43 0%, #0d9488 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontWeight: '900',
            fontSize: '15px',
            boxShadow: '0 2px 6px rgba(6, 78, 67, 0.25)'
          }}>
            {companyName.replace(/[^A-Za-z0-9]/g, '').substring(0, 2).toUpperCase() || 'CO'}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
              <span>{companyName}</span>
              <span style={{ fontSize: '11px', color: '#64748b' }}>▾</span>
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
              {companyLocation}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => onNavigate('notice_board')}
            title="Notifications"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: '#f1f5f9',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative'
            }}
          >
            <Bell size={18} color="#0f172a" />
            <span style={{
              position: 'absolute',
              top: '6px',
              right: '6px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#ef4444',
              border: '1.5px solid #ffffff'
            }} />
          </button>
          <button
            type="button"
            onClick={() => onNavigate('settings')}
            title="Settings"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: '#f1f5f9',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <Settings size={18} color="#0f172a" />
          </button>
        </div>
      </header>

      {/* ── VIEW 1: HOME DASHBOARD ── */}
      {currentView === 'home' && (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Greeting Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Welcome, {userGreetingName}
            </h1>
            <button
              type="button"
              onClick={() => window.location.reload()}
              title="Refresh Data"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#0d9488',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <RotateCw size={18} />
            </button>
          </div>

          {/* 2x2 Metric Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px'
          }}>
            {/* Metric 1: Tasks */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '14px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>🕒 Today</span>
                <div style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: 'rgba(13, 148, 136, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <ClipboardList size={14} color="#0d9488" />
                </div>
              </div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>Tasks</div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#0d9488', marginTop: '4px' }}>
                {metrics.tasksText || 'All caught up'}
              </div>
              <div
                onClick={() => onNavigate('tasks')}
                style={{ fontSize: '11px', color: '#0d9488', fontWeight: '700', marginTop: '6px', cursor: 'pointer' }}
              >
                + Add a task
              </div>
            </div>

            {/* Metric 2: Pipeline Value */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '14px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>🕒 Last 30 days</span>
                <div style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <DollarSign size={14} color="#10b981" />
                </div>
              </div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>Pipeline Value</div>
              <div style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', marginTop: '4px' }}>
                {metrics.pipelineValue || '₹5K'}
              </div>
            </div>

            {/* Metric 3: Unread Messages */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '14px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>🕒 Last 30 days</span>
                <div style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: 'rgba(20, 210, 203, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <MessageSquare size={14} color="#0d9488" />
                </div>
              </div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>Unread Messages</div>
              <div style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', marginTop: '4px' }}>
                {metrics.unreadMessages || '5,287'}
              </div>
            </div>

            {/* Metric 4: Appointments */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '14px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>🕒 Today</span>
                <div style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: 'rgba(245, 158, 11, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Calendar size={14} color="#f59e0b" />
                </div>
              </div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>Appointments</div>
              <div style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', marginTop: '4px' }}>
                {metrics.appointmentsCount || '0'}
              </div>
            </div>
          </div>

          {/* Pinned Apps Card */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '20px',
            padding: '16px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>Pinned Apps</span>
              <button
                type="button"
                onClick={() => setIsBookmarkModalOpen(true)}
                title="Customize Pinned Apps"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#064e43',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <Edit2 size={18} />
              </button>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '14px 10px',
              textAlign: 'center'
            }}>
              {pinnedItems.map(item => {
                const IconComp = item.icon || Grid;
                return (
                  <div
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      border: '1.5px solid #cbd5e1',
                      background: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#064e43',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.04)',
                      transition: 'all 0.15s ease'
                    }}>
                      <IconComp size={24} strokeWidth={1.8} />
                    </div>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: '600',
                      color: '#334155',
                      lineHeight: '1.2',
                      maxWidth: '68px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {item.label}
                    </span>
                  </div>
                );
              })}

              {/* Add Bookmark shortcut button */}
              <div
                onClick={() => setIsBookmarkModalOpen(true)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}
              >
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  border: '1.5px dashed #0d9488',
                  background: 'rgba(13, 148, 136, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0d9488',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
                }}>
                  <Plus size={24} strokeWidth={2} />
                </div>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  color: '#0d9488',
                  lineHeight: '1.2'
                }}>
                  + Pin App
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '20px',
            padding: '16px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
          }}>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>
              Quick Actions
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '14px 10px',
              textAlign: 'center'
            }}>
              <div
                onClick={() => onNavigate('contacts')}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
              >
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  border: '1.5px solid #cbd5e1',
                  background: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#064e43'
                }}>
                  <Plus size={22} strokeWidth={2} />
                </div>
                <span style={{ fontSize: '11px', fontWeight: '600', color: '#334155' }}>Add Contact</span>
              </div>

              <div
                onClick={() => {
                  if (window.AndroidApp && typeof window.AndroidApp.switchNativeTab === 'function') {
                    window.AndroidApp.switchNativeTab(2);
                  } else {
                    onNavigate('telecalling');
                  }
                }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
              >
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  border: '1.5px solid #cbd5e1',
                  background: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#064e43'
                }}>
                  <Phone size={22} strokeWidth={1.8} />
                </div>
                <span style={{ fontSize: '11px', fontWeight: '600', color: '#334155' }}>Make a Call</span>
              </div>

              <div
                onClick={() => onNavigate('wa_live_web')}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
              >
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  border: '1.5px solid #cbd5e1',
                  background: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#064e43'
                }}>
                  <MessageSquare size={22} strokeWidth={1.8} />
                </div>
                <span style={{ fontSize: '11px', fontWeight: '600', color: '#334155' }}>New Message</span>
              </div>

              <div
                onClick={() => onNavigate('payroll')}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
              >
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  border: '1.5px solid #cbd5e1',
                  background: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#064e43'
                }}>
                  <CreditCard size={22} strokeWidth={1.8} />
                </div>
                <span style={{ fontSize: '11px', fontWeight: '600', color: '#334155' }}>New Payment</span>
              </div>

              <div
                onClick={() => onNavigate('kanban')}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
              >
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  border: '1.5px solid #cbd5e1',
                  background: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#064e43'
                }}>
                  <Layers size={22} strokeWidth={1.8} />
                </div>
                <span style={{ fontSize: '11px', fontWeight: '600', color: '#334155' }}>New Deal</span>
              </div>

              <div
                onClick={() => onNavigate('my_attendance')}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
              >
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  border: '1.5px solid #cbd5e1',
                  background: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#064e43'
                }}>
                  <Clock size={22} strokeWidth={1.8} />
                </div>
                <span style={{ fontSize: '11px', fontWeight: '600', color: '#334155' }}>Punch In</span>
              </div>

              <div
                onClick={() => onNavigate('tasks')}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
              >
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  border: '1.5px solid #cbd5e1',
                  background: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#064e43'
                }}>
                  <ClipboardList size={22} strokeWidth={1.8} />
                </div>
                <span style={{ fontSize: '11px', fontWeight: '600', color: '#334155' }}>New Task</span>
              </div>

              <div
                onClick={() => onNavigate('leaves')}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
              >
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  border: '1.5px solid #cbd5e1',
                  background: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#064e43'
                }}>
                  <Calendar size={22} strokeWidth={1.8} />
                </div>
                <span style={{ fontSize: '11px', fontWeight: '600', color: '#334155' }}>Apply Leave</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW 2: ALL APPS DIRECTORY ── */}
      {currentView === 'all_apps' && (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Search Input Box */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '14px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <Search size={18} color="#64748b" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Apps..."
              style={{
                border: 'none',
                outline: 'none',
                width: '100%',
                fontSize: '15px',
                color: '#0f172a',
                background: 'transparent'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Categorized Cards with Circular Outline Icons */}
          {filteredCategories.map(cat => (
            <div
              key={cat.category}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '20px',
                padding: '16px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
              }}
            >
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', marginBottom: '16px' }}>
                {cat.category}
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '16px 10px',
                textAlign: 'center'
              }}>
                {cat.items.map(item => {
                  const IconComp = item.icon || Grid;
                  return (
                    <div
                      key={item.id}
                      onClick={() => onNavigate(item.id)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        border: '1.5px solid #cbd5e1',
                        background: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#064e43',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.03)',
                        transition: 'all 0.15s ease'
                      }}>
                        <IconComp size={24} strokeWidth={1.8} />
                      </div>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '600',
                        color: '#334155',
                        lineHeight: '1.2',
                        maxWidth: '72px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}>
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {filteredCategories.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '40px 16px',
              color: '#64748b',
              fontSize: '14px',
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0'
            }}>
              No apps found matching "{searchQuery}".
            </div>
          )}
        </div>
      )}

      {/* ── FLOATING AI ACTION BUTTON (Teal Green Sparkle) ── */}
      <button
        type="button"
        onClick={() => onNavigate('conversations')}
        title="OmniFlow AI Assistant"
        style={{
          position: 'fixed',
          bottom: isAndroidApp ? '20px' : '80px',
          right: '18px',
          width: '50px',
          height: '50px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, #064e43 0%, #0d9488 100%)',
          color: '#ffffff',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(6, 78, 67, 0.4)',
          cursor: 'pointer',
          zIndex: 60
        }}
      >
        <Sparkles size={24} />
      </button>

      {/* ── FIXED BOTTOM NAVIGATION BAR: Only rendered for web preview; in Android Companion App the native bottom bar is used ── */}
      {!isAndroidApp && (
        <nav style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '64px',
          background: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          padding: '4px 8px',
          zIndex: 70,
          boxShadow: '0 -2px 10px rgba(0,0,0,0.03)'
        }}>
          {/* 1. Home Tab */}
          <div
            onClick={() => onNavigate('__home__')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: '6px 14px',
              borderRadius: '20px',
              background: currentView === 'home' ? 'rgba(13, 148, 136, 0.14)' : 'transparent',
              color: currentView === 'home' ? '#064e43' : '#64748b'
            }}
          >
            <Home size={20} strokeWidth={currentView === 'home' ? 2.2 : 1.8} />
            <span style={{ fontSize: '11px', fontWeight: currentView === 'home' ? '800' : '600', marginTop: '2px' }}>
              Home
            </span>
          </div>

          {/* 2. Recent Tab (Untouched Telecalling) */}
          <div
            onClick={() => onNavigate('telecalling')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: '6px 12px',
              borderRadius: '20px',
              background: 'transparent',
              color: '#64748b'
            }}
          >
            <Clock size={20} strokeWidth={1.8} />
            <span style={{ fontSize: '11px', fontWeight: '600', marginTop: '2px' }}>
              Recent
            </span>
          </div>

          {/* 3. Dialer Tab (Untouched Dialer) */}
          <div
            onClick={() => onNavigate('telecalling')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: '6px 12px',
              borderRadius: '20px',
              background: 'transparent',
              color: '#64748b'
            }}
          >
            <Phone size={20} strokeWidth={1.8} />
            <span style={{ fontSize: '11px', fontWeight: '600', marginTop: '2px' }}>
              Dialer
            </span>
          </div>

          {/* 4. Contact Tab (Untouched Contacts) */}
          <div
            onClick={() => onNavigate('contacts')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: '6px 12px',
              borderRadius: '20px',
              background: 'transparent',
              color: '#64748b'
            }}
          >
            <Users size={20} strokeWidth={1.8} />
            <span style={{ fontSize: '11px', fontWeight: '600', marginTop: '2px' }}>
              Contact
            </span>
          </div>

          {/* 5. All Apps Tab */}
          <div
            onClick={() => onNavigate('__all_apps__')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: '6px 14px',
              borderRadius: '20px',
              background: currentView === 'all_apps' ? 'rgba(13, 148, 136, 0.14)' : 'transparent',
              color: currentView === 'all_apps' ? '#064e43' : '#64748b'
            }}
          >
            <Grid size={20} strokeWidth={currentView === 'all_apps' ? 2.2 : 1.8} />
            <span style={{ fontSize: '11px', fontWeight: currentView === 'all_apps' ? '800' : '600', marginTop: '2px' }}>
              All Apps
            </span>
          </div>
        </nav>
      )}

      {/* ── MODAL: BOOKMARK / PIN APPS CUSTOMIZER SHEET ── */}
      {isBookmarkModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end'
        }}>
          <div style={{
            background: '#ffffff',
            borderTopLeftRadius: '24px',
            borderTopRightRadius: '24px',
            padding: '20px 16px',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.15)'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  Customize Pinned Apps
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>
                  Select apps to pin on your Home screen
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBookmarkModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Filter Search */}
            <div style={{
              background: '#f1f5f9',
              borderRadius: '12px',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Search size={16} color="#64748b" />
              <input
                type="text"
                value={bookmarkSearch}
                onChange={(e) => setBookmarkSearch(e.target.value)}
                placeholder="Search apps to pin..."
                style={{
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: '14px',
                  width: '100%',
                  color: '#0f172a'
                }}
              />
            </div>

            {/* List of Apps with Toggles */}
            <div style={{
              overflowY: 'auto',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              paddingRight: '4px'
            }}>
              {allAvailableApps
                .filter(app => {
                  const bq = bookmarkSearch.trim().toLowerCase();
                  if (!bq) return true;
                  return app.label.toLowerCase().includes(bq) || app.desc?.toLowerCase().includes(bq);
                })
                .map(app => {
                  const isPinned = pinnedAppIds.includes(app.id);
                  const IconComp = app.icon || Grid;
                  return (
                    <div
                      key={app.id}
                      onClick={() => togglePinnedApp(app.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: '12px',
                        background: isPinned ? 'rgba(13, 148, 136, 0.08)' : '#f8fafc',
                        border: isPinned ? '1px solid rgba(13, 148, 136, 0.3)' : '1px solid #e2e8f0',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          border: '1.5px solid #cbd5e1',
                          background: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#064e43'
                        }}>
                          <IconComp size={20} strokeWidth={1.8} />
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{app.label}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{app.desc || app.category}</div>
                        </div>
                      </div>

                      {/* Checkbox / Toggle */}
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        border: isPinned ? 'none' : '2px solid #cbd5e1',
                        background: isPinned ? '#0d9488' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff'
                      }}>
                        {isPinned && <Check size={16} strokeWidth={3} />}
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Save CTA */}
            <button
              type="button"
              onClick={() => setIsBookmarkModalOpen(false)}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #064e43 0%, #0d9488 100%)',
                color: '#ffffff',
                border: 'none',
                fontSize: '15px',
                fontWeight: '800',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(6, 78, 67, 0.3)',
                marginTop: '6px'
              }}
            >
              Save Pinned Apps ({pinnedItems.length})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
