import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  X,
  Star,
  Zap,
  TrendingUp,
  Shield,
  Activity,
  ArrowRight
} from 'lucide-react';

// Master list of all platform modules for the All Apps directory
// Categorized cleanly, strictly checked against user role & permissions
export const SYSTEM_MODULES = [
  {
    category: 'CRM & Sales',
    items: [
      { id: 'contacts', label: 'Contacts', icon: Users, desc: 'Clients & Leads Database', color: '#0d9488' },
      { id: 'conversations', label: 'Conversations', icon: MessageSquare, desc: 'Omnichannel Inbox', color: '#10b981' },
      { id: 'wa_live_web', label: 'WhatsApp', icon: MessageCircle, desc: 'Live WhatsApp Web', color: '#22c55e' },
      { id: 'kanban', label: 'Deals CRM', icon: Layers, desc: 'Visual Sales Pipeline', color: '#8b5cf6' },
      { id: 'telecalling', label: 'Phone System', icon: PhoneCall, desc: 'SIM & Cloud Dialer', color: '#06b6d4' },
      { id: 'automations_sandbox', label: 'Automations', icon: Zap, desc: 'Event Workflows & Triggers', color: '#f59e0b' },
      { id: 'reports_crm', label: 'Sales Reports', icon: TrendingUp, desc: 'Revenue & Deal Funnels', color: '#ec4899' }
    ]
  },
  {
    category: 'Insights & Productivity',
    items: [
      { id: 'admin_dashboard', label: 'Dashboard', icon: Grid, desc: 'Executive Analytics', color: '#10b981' },
      { id: 'manager_dashboard', label: 'Task Analytics', icon: ClipboardList, desc: 'Team Performance', color: '#0d9488' },
      { id: 'reports_telephony', label: 'Call Reports', icon: PhoneCall, desc: 'Telephony & Audios', color: '#06b6d4' },
      { id: 'reports_cross', label: 'Cross Analytics', icon: Share2, desc: 'Unified Intelligence', color: '#8b5cf6' },
      { id: 'reports_builder', label: 'Report Builder', icon: Sliders, desc: 'Custom Ad-hoc Reports', color: '#6366f1' },
      { id: 'gps_attendance', label: 'Live Tracking', icon: Globe, desc: 'Field Team Radar & GPS', color: '#3b82f6' },
      { id: 'audit_logs', label: 'Audit Logs', icon: FileText, desc: 'Security Trail & Timestamps', color: '#64748b' },
      { id: 'media_storage', label: 'Media Vault', icon: HardDrive, desc: 'Cloud Asset Storage', color: '#14b8a6' }
    ]
  },
  {
    category: 'Operations',
    items: [
      { id: 'my_attendance', label: 'Attendance', icon: Clock, desc: 'Daily Duty In/Out Punch', color: '#10b981' },
      { id: 'tasks', label: 'Tasks Board', icon: ClipboardList, desc: 'Kanban Tasks & To-Dos', color: '#0d9488' },
      { id: 'office_kiosk', label: 'Kiosk Mode', icon: Clock, desc: 'Self Punch Kiosk Mode', color: '#06b6d4' },
      { id: 'leaves', label: 'Leave Portal', icon: Calendar, desc: 'Time Off Requests', color: '#f59e0b' },
      { id: 'shifts', label: 'Work Shifts', icon: Calendar, desc: 'Weekly Roster Schedule', color: '#8b5cf6' },
      { id: 'notice_board', label: 'Notice Board', icon: Bell, desc: 'Company Bulletins', color: '#ec4899' },
      { id: 'holidays', label: 'Holidays List', icon: Calendar, desc: 'Calendar Holidays', color: '#3b82f6' }
    ]
  },
  {
    category: 'HR & Workforce',
    items: [
      { id: 'employees', label: 'Employees', icon: Users, desc: 'Staff Directory', color: '#0d9488' },
      { id: 'recruitment_ats', label: 'Recruitment ATS', icon: Briefcase, desc: 'Candidate Pipeline', color: '#10b981' },
      { id: 'asset_management', label: 'Asset Vault', icon: HardDrive, desc: 'Company Equipment', color: '#f59e0b' },
      { id: 'verify_documents', label: 'Verify Docs', icon: FileText, desc: 'KYC & Verification', color: '#6366f1' },
      { id: 'offboarding', label: 'Offboarding', icon: Trash2, desc: 'Exit Clearance', color: '#ef4444' }
    ]
  },
  {
    category: 'Payroll & Finance',
    items: [
      { id: 'payroll', label: 'Payroll & Salary', icon: CreditCard, desc: 'Monthly Salary & Slips', color: '#10b981' },
      { id: 'taxes_compliance', label: 'Taxes & PF', icon: FileText, desc: 'Statutory Returns', color: '#0d9488' },
      { id: 'ff_settlements', label: 'F&F Settlements', icon: CheckCircle, desc: 'Full & Final Clearances', color: '#06b6d4' },
      { id: 'advances_loans', label: 'Loans & Advance', icon: DollarSign, desc: 'Staff Advances & EMIs', color: '#f59e0b' },
      { id: 'expenses', label: 'Expense Claim', icon: Receipt, desc: 'Reimbursements', color: '#8b5cf6' }
    ]
  },
  {
    category: 'Settings & Portal',
    items: [
      { id: 'settings', label: 'Settings', icon: Settings, desc: 'General Preferences', color: '#064e43' },
      { id: 'roles_permissions', label: 'Roles & Security', icon: UserCheck, desc: 'Access Matrix', color: '#0d9488' },
      { id: 'integrations', label: 'Integrations', icon: Share2, desc: 'Webhooks & APIs', color: '#3b82f6' },
      { id: 'recycle_bin', label: 'Trash Bin', icon: Trash2, desc: 'Deleted Records Recovery', color: '#ef4444' },
      { id: 'system_dropdowns', label: 'Dropdowns', icon: Tag, desc: 'Custom System Lists', color: '#f59e0b' },
      { id: 'module_configuration', label: 'Module Config', icon: Sliders, desc: 'Field Customizer', color: '#8b5cf6' },
      { id: 'billing', label: 'Billing & Plans', icon: CreditCard, desc: 'SaaS Subscriptions', color: '#10b981' },
      { id: 'app_guide', label: 'App Guide', icon: HelpCircle, desc: 'System Tour', color: '#06b6d4' },
      { id: 'feedback', label: 'Feedback', icon: MessageSquareHeart, desc: 'Suggestions & Support', color: '#ec4899' },
      { id: 'superadmin_plans', label: 'Super Admin', icon: Shield, desc: 'Platform Telemetry', color: '#14d2cb' }
    ]
  }
];

const DEFAULT_PINNED_IDS = ['contacts', 'kanban', 'telecalling', 'wa_live_web', 'my_attendance', 'tasks'];

export default function MobileAppLauncher({
  currentView = 'home', // 'home' | 'all_apps'
  onNavigate,
  canNav = () => true,
  isModuleSubscribed = () => true,
  authUser,
  tenantSubscription,
  metrics = {},
  dutyStatus = null,
  upNext = null,
  followUps = [],
  customModules = []
}) {
  const [internalView, setInternalView] = useState(currentView);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isBookmarkModalOpen, setIsBookmarkModalOpen] = useState(false);
  const [bookmarkSearch, setBookmarkSearch] = useState('');

  // Keep internal view in sync with prop updates
  useEffect(() => {
    if (currentView) {
      setInternalView(currentView);
    }
  }, [currentView]);

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

  // Dynamic Company & User Branding
  const companyName = useMemo(() => {
    if (authUser?.companyName && authUser.companyName.trim()) return authUser.companyName.trim();
    if (authUser?.company_name && authUser.company_name.trim()) return authUser.company_name.trim();
    if (authUser?.company && typeof authUser.company === 'string' && authUser.company.trim()) return authUser.company.trim();
    if (authUser?.tenant?.company_name && authUser.tenant.company_name.trim()) return authUser.tenant.company_name.trim();
    if (authUser?.tenantName && authUser.tenantName.trim()) return authUser.tenantName.trim();
    if (tenantSubscription?.company_name && tenantSubscription.company_name.trim()) return tenantSubscription.company_name.trim();
    if (tenantSubscription?.companyName && tenantSubscription.companyName.trim()) return tenantSubscription.companyName.trim();

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
    return 'EMS HQ';
  }, [authUser, tenantSubscription]);

  const userGreetingName = useMemo(() => {
    if (authUser?.name && typeof authUser.name === 'string' && authUser.name.trim()) return authUser.name.trim();
    if (authUser?.displayName && typeof authUser.displayName === 'string' && authUser.displayName.trim()) return authUser.displayName.trim();
    if (authUser?.fullName && typeof authUser.fullName === 'string' && authUser.fullName.trim()) return authUser.fullName.trim();
    if (authUser?.email && typeof authUser.email === 'string') {
      const prefix = authUser.email.split('@')[0].replace(/[._-]+/g, ' ');
      return prefix.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
    return 'Partner';
  }, [authUser]);

  const userInitials = useMemo(() => {
    const name = userGreetingName || '';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    if (parts.length === 1 && parts[0].length >= 1) return parts[0].slice(0, 2).toUpperCase();
    return 'KC';
  }, [userGreetingName]);

  const userAvatarUrl = authUser?.avatar || authUser?.photoURL || authUser?.profile_image || authUser?.photo || null;

  const resolvedFollowUps = useMemo(() => {
    if (Array.isArray(followUps) && followUps.length > 0) return followUps;
    if (upNext) return [upNext];
    return [];
  }, [followUps, upNext]);

  // Master Access Control Check:
  // Evaluates both Role & Permission engine (canNav) and Tenant Subscription (isModuleSubscribed)
  const hasAccess = (modId) => {
    if (!modId) return false;
    // SuperAdmin bypass
    if (authUser?.role === 'superadmin' || authUser?.role === 'super_admin' || authUser?.isSuperAdmin) {
      return true;
    }
    if (typeof canNav === 'function' && !canNav(modId)) {
      return false;
    }
    if (typeof isModuleSubscribed === 'function' && !isModuleSubscribed(modId)) {
      return false;
    }
    return true;
  };

  // Merged modules list with optional dynamic extensions
  const activeModuleRegistry = useMemo(() => {
    const registry = [...SYSTEM_MODULES];
    if (Array.isArray(customModules) && customModules.length > 0) {
      customModules.forEach(cMod => {
        const existingCat = registry.find(r => r.category === cMod.category);
        if (existingCat) {
          existingCat.items.push(cMod);
        } else {
          registry.push({ category: cMod.category || 'Custom Apps', items: [cMod] });
        }
      });
    }
    return registry;
  }, [customModules]);

  // Flatten available apps and filter STRICTLY by role & permissions
  const allAvailableApps = useMemo(() => {
    const list = [];
    activeModuleRegistry.forEach(cat => {
      cat.items.forEach(item => {
        if (hasAccess(item.id)) {
          list.push({ ...item, category: cat.category });
        }
      });
    });
    return list;
  }, [activeModuleRegistry, canNav, isModuleSubscribed, authUser]);

  // Categories list with count of accessible apps
  const categoryStats = useMemo(() => {
    const stats = [{ name: 'All', count: allAvailableApps.length }];
    activeModuleRegistry.forEach(cat => {
      const allowedCount = cat.items.filter(item => hasAccess(item.id)).length;
      if (allowedCount > 0) {
        stats.push({ name: cat.category, count: allowedCount });
      }
    });
    return stats;
  }, [activeModuleRegistry, allAvailableApps]);

  // Filtered categories for All Apps directory
  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return activeModuleRegistry.map(cat => {
      // If a specific category tab is selected, ignore others
      if (selectedCategory !== 'All' && cat.category !== selectedCategory) {
        return { ...cat, items: [] };
      }
      const visibleItems = cat.items.filter(item => {
        if (!hasAccess(item.id)) return false;
        if (!q) return true;
        return (
          item.label.toLowerCase().includes(q) ||
          item.desc?.toLowerCase().includes(q) ||
          cat.category.toLowerCase().includes(q)
        );
      });
      return { ...cat, items: visibleItems };
    }).filter(cat => cat.items.length > 0);
  }, [activeModuleRegistry, searchQuery, selectedCategory, canNav, isModuleSubscribed, authUser]);

  // Pinned items resolved from accessible apps list
  const pinnedItems = useMemo(() => {
    const map = new Map(allAvailableApps.map(app => [app.id, app]));
    return pinnedAppIds.map(id => map.get(id)).filter(Boolean);
  }, [pinnedAppIds, allAvailableApps]);

  // Toggle app in pinned state
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

  // Safe navigation handler
  const handleNavigate = (targetId) => {
    if (targetId === '__home__') {
      setInternalView('home');
      if (typeof onNavigate === 'function') onNavigate('__home__');
      return;
    }
    if (targetId === '__all_apps__') {
      setInternalView('all_apps');
      if (typeof onNavigate === 'function') onNavigate('__all_apps__');
      return;
    }
    if (typeof onNavigate === 'function') {
      onNavigate(targetId);
    }
  };

  const activeView = internalView || currentView || 'home';

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      background: '#f8fafc',
      color: '#0f172a',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      paddingBottom: isAndroidApp ? '24px' : '90px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* ── TOP HERO HEADER: Dark Emerald Gradient with Brand Identity ── */}
      <header style={{
        background: activeView === 'home'
          ? 'linear-gradient(180deg, #022c22 0%, #064e43 100%)'
          : '#ffffff',
        padding: activeView === 'home' ? '16px 16px 46px 16px' : '14px 16px 16px 16px',
        color: activeView === 'home' ? '#ffffff' : '#0f172a',
        boxShadow: activeView === 'home'
          ? '0 6px 20px rgba(2, 44, 34, 0.28)'
          : '0 1px 4px rgba(0, 0, 0, 0.04)',
        borderBottom: activeView === 'home' ? 'none' : '1px solid #e2e8f0',
        borderBottomLeftRadius: activeView === 'home' ? '28px' : '0px',
        borderBottomRightRadius: activeView === 'home' ? '28px' : '0px',
        position: 'relative',
        zIndex: 10
      }}>
        {/* Top Control Bar: Logo & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Brand Logo & Title */}
          <div
            onClick={() => handleNavigate('__home__')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
          >
            <img
              src="/assets/ems-logo.png"
              alt="EMS Logo"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                objectFit: 'contain',
                flexShrink: 0,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
              }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '19px',
                fontWeight: '900',
                color: activeView === 'home' ? '#ffffff' : '#064e43',
                letterSpacing: '-0.3px',
                lineHeight: 1
              }}>
                EMS
              </span>
              {activeView === 'all_apps' && (
                <span style={{
                  fontSize: '10.5px',
                  fontWeight: '800',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: 'rgba(13, 148, 136, 0.12)',
                  color: '#0d9488',
                  letterSpacing: '0.4px'
                }}>
                  ALL APPS
                </span>
              )}
            </div>
          </div>

          {/* Top Actions: Refresh, Notification Bell & User Profile Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => window.location.reload()}
              title="Refresh Data"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: activeView === 'home' ? 'rgba(255, 255, 255, 0.12)' : '#f1f5f9',
                border: activeView === 'home' ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid #cbd5e1',
                color: activeView === 'home' ? '#ffffff' : '#475569',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: 0,
                flexShrink: 0
              }}
            >
              <RotateCw size={16} />
            </button>

            {/* Notification Bell with Red Dot */}
            <button
              type="button"
              onClick={() => handleNavigate('notice_board')}
              title="Notice Board & Bulletins"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: activeView === 'home' ? 'rgba(255, 255, 255, 0.12)' : '#f1f5f9',
                border: activeView === 'home' ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid #cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: activeView === 'home' ? '#ffffff' : '#475569',
                position: 'relative',
                padding: 0,
                flexShrink: 0
              }}
            >
              <Bell size={18} />
              <span style={{
                position: 'absolute',
                top: '7px',
                right: '7px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#ef4444',
                border: activeView === 'home' ? '1.5px solid #064e43' : '1.5px solid #ffffff'
              }} />
            </button>

            {/* User Profile Avatar with Initials / Photo */}
            <div
              onClick={() => handleNavigate('settings')}
              title={`Profile: ${userGreetingName}`}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
                border: activeView === 'home' ? '2px solid rgba(255, 255, 255, 0.45)' : '2px solid #0d9488',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: '800',
                fontSize: '13px',
                cursor: 'pointer',
                overflow: 'hidden',
                boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
                flexShrink: 0
              }}
            >
              {userAvatarUrl ? (
                <img
                  src={userAvatarUrl}
                  alt={userGreetingName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span>{userInitials}</span>
              )}
            </div>
          </div>
        </div>

        {/* Home Screen Greeting Row & Top 2 Metric Cards */}
        {activeView === 'home' && (
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h1 style={{
              fontSize: '22px',
              fontWeight: '900',
              color: '#ffffff',
              margin: 0,
              letterSpacing: '-0.3px',
              lineHeight: 1.2
            }}>
              Welcome, {userGreetingName}
            </h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {dutyStatus?.isOnDuty ? (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  background: 'rgba(16, 185, 129, 0.22)',
                  border: '1px solid rgba(16, 185, 129, 0.45)',
                  color: '#a7f3d0',
                  fontSize: '11.5px',
                  fontWeight: '700'
                }}>
                  <span style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: '#10b981',
                    boxShadow: '0 0 6px #10b981'
                  }} />
                  <span>{dutyStatus.text || 'On Duty'}</span>
                </div>
              ) : (
                <div
                  onClick={() => handleNavigate('my_attendance')}
                  title="Tap to Punch In"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    background: 'rgba(255, 255, 255, 0.12)',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    color: '#e2e8f0',
                    fontSize: '11.5px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: '#94a3b8'
                  }} />
                  <span>Off Duty • Tap to Punch In</span>
                </div>
              )}
            </div>

          </div>
        )}

        {/* All Apps Screen Subtitle */}
        {activeView === 'all_apps' && (
          <div style={{ marginTop: '8px' }}>
            <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: '500' }}>
              {allAvailableApps.length} active apps & modules available
            </span>
          </div>
        )}
      </header>

      {/* ── VIEW 1: HOME DASHBOARD ── */}
      {activeView === 'home' && (
        <div style={{ padding: '0 16px 16px 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Row 1 Metric Cards: Floating Overlap (Half on Green Header, Half on Light Canvas) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            marginTop: '-34px',
            position: 'relative',
            zIndex: 20
          }}>
            {/* Metric 1: Tasks */}
            <div
              onClick={() => handleNavigate('tasks')}
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                border: '1px solid rgba(226, 232, 240, 0.95)',
                padding: '14px',
                boxShadow: '0 8px 22px rgba(2, 44, 34, 0.12), 0 2px 6px rgba(0, 0, 0, 0.04)',
                cursor: 'pointer',
                color: '#0f172a'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '600' }}>🕒 Today</span>
                <div style={{
                  width: '28px',
                  height: '28px',
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
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#0d9488', marginTop: '4px' }}>
                {metrics.pendingTasksCount !== undefined && metrics.pendingTasksCount > 0
                  ? `${metrics.pendingTasksCount} Pending`
                  : 'All caught up'}
              </div>
              <div style={{ fontSize: '11px', color: '#0d9488', fontWeight: '700', marginTop: '6px' }}>
                + Add a task
              </div>
            </div>

            {/* Metric 2: Pipeline Value */}
            <div
              onClick={() => handleNavigate('kanban')}
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                border: '1px solid rgba(226, 232, 240, 0.95)',
                padding: '14px',
                boxShadow: '0 8px 22px rgba(2, 44, 34, 0.12), 0 2px 6px rgba(0, 0, 0, 0.04)',
                cursor: 'pointer',
                color: '#0f172a'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '600' }}>🕒 Last 30 days</span>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <TrendingUp size={14} color="#10b981" />
                </div>
              </div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>Pipeline Value</div>
              <div style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', marginTop: '4px' }}>
                {metrics.pipelineValue || '₹0'}
              </div>
              <div style={{ fontSize: '11px', color: '#10b981', fontWeight: '700', marginTop: '6px' }}>
                View Pipeline ↗
              </div>
            </div>
          </div>

          {/* Row 2 Metric Cards: Unread Messages & Today Calls */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px'
          }}>

            {/* Metric 3: Unread Messages */}
            <div
              onClick={() => handleNavigate('conversations')}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '14px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '600' }}>🕒 Live CRM</span>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'rgba(6, 182, 212, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <MessageSquare size={14} color="#06b6d4" />
                </div>
              </div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>Unread Messages</div>
              <div style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', marginTop: '4px' }}>
                {metrics.unreadMessagesCount !== undefined ? `${metrics.unreadMessagesCount} New` : (metrics.unreadMessages || '0 New')}
              </div>
              <div style={{ fontSize: '11px', color: '#06b6d4', fontWeight: '700', marginTop: '6px' }}>
                Open Inbox ↗
              </div>
            </div>

            {/* Metric 4: Today Calls */}
            <div
              onClick={() => handleNavigate('telecalling')}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '14px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '600' }}>🕒 Today Shift</span>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'rgba(245, 158, 11, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <PhoneCall size={14} color="#f59e0b" />
                </div>
              </div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>Today Calls</div>
              <div style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', marginTop: '4px' }}>
                {metrics.todayCallsCount !== undefined ? `${metrics.todayCallsCount} Made` : '0 Made'}
              </div>
              <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: '700', marginTop: '6px' }}>
                Dialer Log ↗
              </div>
            </div>
          </div>

          {/* ── PIPELINE FOLLOW-UPS QUEUE (Overdue -> Today -> Upcoming -> Active) ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: 'rgba(13, 148, 136, 0.1)',
                  color: '#0d9488',
                  fontSize: '11.5px',
                  fontWeight: '800',
                  letterSpacing: '0.4px'
                }}>
                  ⚡ UP NEXT & FOLLOW-UPS
                </span>
                {resolvedFollowUps.length > 0 && (
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    color: '#0d9488',
                    background: 'rgba(13, 148, 136, 0.15)',
                    padding: '2px 7px',
                    borderRadius: '10px'
                  }}>
                    {resolvedFollowUps.length}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleNavigate('kanban')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0d9488',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  padding: '4px 6px'
                }}
              >
                View Pipeline ↗
              </button>
            </div>

            {resolvedFollowUps.length === 0 ? (
              <div style={{
                background: '#ffffff',
                borderRadius: '18px',
                border: '1px solid #e2e8f0',
                padding: '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <div style={{ fontSize: '13.5px', fontWeight: '600', color: '#64748b' }}>
                  No upcoming follow-ups scheduled
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '2px' }}>
                  <button
                    type="button"
                    onClick={() => handleNavigate('contacts')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      minHeight: '44px',
                      padding: '9px 12px',
                      borderRadius: '12px',
                      background: '#f8fafc',
                      color: '#064e43',
                      border: '1px solid #cbd5e1',
                      fontSize: '12.5px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    <Plus size={15} />
                    <span>Add Contact</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavigate('kanban')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      minHeight: '44px',
                      padding: '9px 12px',
                      borderRadius: '12px',
                      background: '#f8fafc',
                      color: '#064e43',
                      border: '1px solid #cbd5e1',
                      fontSize: '12.5px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    <Layers size={15} />
                    <span>New Deal</span>
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {resolvedFollowUps.map((item, idx) => {
                  const isOverdue = item.category === 'overdue';
                  const isToday = item.category === 'today';
                  const badgeBg = isOverdue ? '#fef2f2' : isToday ? '#ecfdf5' : '#eff6ff';
                  const badgeColor = isOverdue ? '#b91c1c' : isToday ? '#047857' : '#1d4ed8';
                  const badgeBorder = isOverdue ? '1px solid #fecaca' : isToday ? '1px solid #a7f3d0' : '1px solid #bfdbfe';

                  return (
                    <div
                      key={item.id || idx}
                      style={{
                        background: '#ffffff',
                        borderRadius: '16px',
                        border: isOverdue ? '1px solid #fca5a5' : '1px solid #e2e8f0',
                        padding: '14px 16px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '800',
                          padding: '3px 8px',
                          borderRadius: '8px',
                          background: badgeBg,
                          color: badgeColor,
                          border: badgeBorder
                        }}>
                          {item.timeLabel || (isOverdue ? '⚠️ Overdue' : isToday ? '🕒 Today' : '📅 Upcoming')}
                        </span>
                        {item.priority && (
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            background: item.priority === 'High Priority' ? '#fef3c7' : '#f1f5f9',
                            color: item.priority === 'High Priority' ? '#b45309' : '#475569'
                          }}>
                            {item.priority}
                          </span>
                        )}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                            {item.name}
                          </span>
                          {item.dealText && (
                            <span style={{ fontSize: '13px', fontWeight: '800', color: '#0d9488' }}>
                              {item.dealText}
                            </span>
                          )}
                        </div>
                        {item.subtitle && (
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                            {item.subtitle}
                          </div>
                        )}
                      </div>

                      {/* Direct 1-tap actionable triggers for real lead (>= 44px) */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '2px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            if (item.phone) {
                              if (window.AndroidApp && typeof window.AndroidApp.makeDirectCall === 'function') {
                                window.AndroidApp.makeDirectCall(item.phone);
                              } else if (window.AndroidApp && typeof window.AndroidApp.switchNativeTab === 'function') {
                                window.AndroidApp.switchNativeTab(2);
                              } else {
                                handleNavigate('telecalling');
                              }
                            } else {
                              handleNavigate('telecalling');
                            }
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            minHeight: '44px',
                            padding: '10px 14px',
                            borderRadius: '12px',
                            background: '#064e43',
                            color: '#ffffff',
                            border: 'none',
                            fontSize: '13px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(6, 78, 67, 0.25)'
                          }}
                        >
                          <PhoneCall size={16} />
                          <span>Call Now</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleNavigate('wa_live_web')}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            minHeight: '44px',
                            padding: '10px 14px',
                            borderRadius: '12px',
                            background: '#22c55e',
                            color: '#ffffff',
                            border: 'none',
                            fontSize: '13px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(34, 197, 94, 0.25)'
                          }}
                        >
                          <MessageCircle size={16} />
                          <span>WhatsApp</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 📌 PINNED APPS CARD */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '20px',
            padding: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
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
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  fontWeight: '700'
                }}
              >
                <Edit2 size={16} />
                <span>Edit</span>
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
                    onClick={() => handleNavigate(item.id)}
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
                      color: item.color || '#064e43',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.04)',
                      transition: 'transform 0.15s ease',
                      flexShrink: 0
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

          {/* ⚡ QUICK ACTIONS CARD */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '20px',
            padding: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
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
              {hasAccess('contacts') && (
                <div
                  onClick={() => handleNavigate('contacts')}
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
                    color: '#0d9488'
                  }}>
                    <Plus size={22} strokeWidth={2} />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: '#334155' }}>Add Contact</span>
                </div>
              )}

              {hasAccess('telecalling') && (
                <div
                  onClick={() => {
                    if (window.AndroidApp && typeof window.AndroidApp.switchNativeTab === 'function') {
                      window.AndroidApp.switchNativeTab(2);
                    } else {
                      handleNavigate('telecalling');
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
                    color: '#06b6d4'
                  }}>
                    <Phone size={22} strokeWidth={1.8} />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: '#334155' }}>Make a Call</span>
                </div>
              )}

              {hasAccess('wa_live_web') && (
                <div
                  onClick={() => handleNavigate('wa_live_web')}
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
                    color: '#22c55e'
                  }}>
                    <MessageSquare size={22} strokeWidth={1.8} />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: '#334155' }}>New Message</span>
                </div>
              )}

              {hasAccess('kanban') && (
                <div
                  onClick={() => handleNavigate('kanban')}
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
                    color: '#8b5cf6'
                  }}>
                    <Layers size={22} strokeWidth={1.8} />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: '#334155' }}>New Deal</span>
                </div>
              )}

              {hasAccess('my_attendance') && (
                <div
                  onClick={() => handleNavigate('my_attendance')}
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
                    color: '#10b981'
                  }}>
                    <Clock size={22} strokeWidth={1.8} />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: '#334155' }}>Punch In</span>
                </div>
              )}

              {hasAccess('tasks') && (
                <div
                  onClick={() => handleNavigate('tasks')}
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
                    color: '#f59e0b'
                  }}>
                    <ClipboardList size={22} strokeWidth={1.8} />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: '#334155' }}>New Task</span>
                </div>
              )}

              {hasAccess('leaves') && (
                <div
                  onClick={() => handleNavigate('leaves')}
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
                    color: '#ec4899'
                  }}>
                    <Calendar size={22} strokeWidth={1.8} />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: '#334155' }}>Apply Leave</span>
                </div>
              )}

              {hasAccess('payroll') && (
                <div
                  onClick={() => handleNavigate('payroll')}
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
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW 2: ALL APPS DIRECTORY ── */}
      {activeView === 'all_apps' && (
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
            boxShadow: '0 1px 4px rgba(0,0,0,0.02)'
          }}>
            <Search size={18} color="#64748b" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search 28+ apps, tools & modules..."
              style={{
                border: 'none',
                outline: 'none',
                width: '100%',
                fontSize: '14.5px',
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

          {/* Horizontal Category Filter Chips */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '4px',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}>
            {categoryStats.map(cat => {
              const isSelected = selectedCategory === cat.name;
              return (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => setSelectedCategory(cat.name)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '20px',
                    background: isSelected ? '#064e43' : '#ffffff',
                    color: isSelected ? '#ffffff' : '#475569',
                    border: isSelected ? '1px solid #064e43' : '1px solid #e2e8f0',
                    fontSize: '12px',
                    fontWeight: isSelected ? '800' : '600',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    boxShadow: isSelected ? '0 2px 6px rgba(6, 78, 67, 0.25)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>{cat.name}</span>
                  <span style={{
                    fontSize: '10.5px',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    background: isSelected ? 'rgba(255,255,255,0.2)' : '#f1f5f9',
                    color: isSelected ? '#ffffff' : '#64748b',
                    fontWeight: '700'
                  }}>
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Categorized Cards with Circular Icons & Star / Pin toggle */}
          {filteredCategories.map(cat => (
            <div
              key={cat.category}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '20px',
                padding: '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                    {cat.category}
                  </span>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: '#f1f5f9',
                    color: '#64748b'
                  }}>
                    {cat.items.length}
                  </span>
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '16px 10px',
                textAlign: 'center'
              }}>
                {cat.items.map(item => {
                  const IconComp = item.icon || Grid;
                  const isPinned = pinnedAppIds.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px',
                        position: 'relative'
                      }}
                    >
                      {/* Interactive Circular Shortcut Button */}
                      <div
                        onClick={() => handleNavigate(item.id)}
                        style={{
                          width: '56px',
                          height: '56px',
                          borderRadius: '50%',
                          border: '1.5px solid #e2e8f0',
                          background: item.color ? `${item.color}14` : '#f0fdfa',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: item.color || '#064e43',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          flexShrink: 0
                        }}
                      >
                        <IconComp size={24} strokeWidth={1.8} />
                      </div>

                      {/* App Label */}
                      <span
                        onClick={() => handleNavigate(item.id)}
                        style={{
                          fontSize: '11px',
                          fontWeight: '600',
                          color: '#334155',
                          lineHeight: '1.2',
                          maxWidth: '72px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          cursor: 'pointer'
                        }}
                      >
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
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div>No apps found matching "{searchQuery}".</div>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  background: '#064e43',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Clear Search & Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── FLOATING AI ACTION BUTTON (Emerald Teal Sparkle) ── */}
      <button
        type="button"
        onClick={() => handleNavigate('conversations')}
        title="EMS AI Assistant"
        style={{
          position: 'fixed',
          bottom: isAndroidApp ? '20px' : '82px',
          right: '18px',
          width: '52px',
          height: '52px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #064e43 0%, #0d9488 100%)',
          color: '#ffffff',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(6, 78, 67, 0.4)',
          cursor: 'pointer',
          zIndex: 60
        }}
      >
        <Sparkles size={24} />
      </button>

      {/* ── FIXED BOTTOM NAVIGATION BAR: Active for web preview / non-Android ── */}
      {!isAndroidApp && (
        <nav style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '66px',
          background: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          padding: '4px 8px',
          zIndex: 70,
          boxShadow: '0 -2px 12px rgba(0,0,0,0.04)'
        }}>
          {/* 1. Home Tab */}
          <div
            onClick={() => handleNavigate('__home__')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: '6px 14px',
              borderRadius: '20px',
              background: activeView === 'home' ? 'rgba(13, 148, 136, 0.14)' : 'transparent',
              color: activeView === 'home' ? '#064e43' : '#64748b'
            }}
          >
            <Home size={20} strokeWidth={activeView === 'home' ? 2.2 : 1.8} />
            <span style={{ fontSize: '11px', fontWeight: activeView === 'home' ? '800' : '600', marginTop: '2px' }}>
              Home
            </span>
          </div>

          {/* 2. Recent Tab (Untouched Telecalling) */}
          <div
            onClick={() => handleNavigate('telecalling')}
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
            onClick={() => handleNavigate('telecalling')}
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
            onClick={() => handleNavigate('contacts')}
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
            onClick={() => handleNavigate('__all_apps__')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: '6px 14px',
              borderRadius: '20px',
              background: activeView === 'all_apps' ? 'rgba(13, 148, 136, 0.14)' : 'transparent',
              color: activeView === 'all_apps' ? '#064e43' : '#64748b'
            }}
          >
            <Grid size={20} strokeWidth={activeView === 'all_apps' ? 2.2 : 1.8} />
            <span style={{ fontSize: '11px', fontWeight: activeView === 'all_apps' ? '800' : '600', marginTop: '2px' }}>
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
            maxHeight: '82vh',
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
                  Select apps to pin on your Home screen ({pinnedItems.length} pinned)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBookmarkModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
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
                          color: app.color || '#064e43'
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
              Done ({pinnedItems.length} Pinned)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
