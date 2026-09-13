import React, { useState, useMemo } from 'react';
import {
  Home,
  Clock,
  Phone,
  BookOpen,
  Grid,
  Users,
  MessageSquare,
  Briefcase,
  FileText,
  CreditCard,
  Calendar,
  ClipboardList,
  Search,
  Bell,
  CheckCircle2,
  AlertCircle,
  Plus,
  Edit2,
  DollarSign,
  Receipt,
  UserPlus,
  Sparkles,
  ChevronDown,
  X,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  ArrowRight,
  ShieldAlert,
  Send,
  Trash2,
  Settings,
  HardDrive
} from 'lucide-react';
import { MasterModuleRegistry } from '../../core/registry/MasterModuleRegistry';

// Category Definitions matching OmniFlow EMS
const CATEGORIES = [
  { id: 'hr_management', label: 'HR & Workforce', icon: Users, color: '#2dd4bf', bg: 'rgba(45, 212, 191, 0.12)' },
  { id: 'payroll_finance', label: 'Payroll & Finance', icon: CreditCard, color: '#34d399', bg: 'rgba(52, 211, 153, 0.12)' },
  { id: 'crm_sales', label: 'CRM & WhatsApp Sales', icon: MessageSquare, color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  { id: 'operations', label: 'Operations & Attendance', icon: Briefcase, color: '#2dd4bf', bg: 'rgba(45, 212, 191, 0.12)' },
  { id: 'dashboards', label: 'Insights & Dashboards', icon: FileText, color: '#14d2cb', bg: 'rgba(20, 210, 203, 0.12)' },
  { id: 'saas_portal', label: 'Administration & Settings', icon: Settings, color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' }
];

// System Module Icon & Route Fallback Mapping
const MODULE_ICON_MAP = {
  my_attendance: { icon: Clock, label: 'Shift Attendance', category: 'operations' },
  leaves: { icon: Calendar, label: 'Leave Requests', category: 'operations' },
  shifts: { icon: Calendar, label: 'Work Roster', category: 'operations' },
  tasks: { icon: ClipboardList, label: 'Tasks Board', category: 'operations' },
  office_kiosk: { icon: Clock, label: 'Office Kiosk', category: 'operations' },
  notice_board: { icon: Bell, label: 'Notice Board', category: 'operations' },
  holidays: { icon: Calendar, label: 'Holidays List', category: 'operations' },
  conversations: { icon: MessageSquare, label: 'WhatsApp Chats', category: 'crm_sales' },
  telecalling: { icon: Phone, label: 'Phone Dialer', category: 'crm_sales' },
  contacts: { icon: Users, label: 'Contacts', category: 'crm_sales' },
  kanban: { icon: Briefcase, label: 'Deals Pipeline', category: 'crm_sales' },
  wa_live_web: { icon: MessageSquare, label: 'WhatsApp Web', category: 'crm_sales' },
  employees: { icon: Users, label: 'All Employees', category: 'hr_management' },
  recruitment_ats: { icon: Briefcase, label: 'Recruitment ATS', category: 'hr_management' },
  verify_documents: { icon: FileText, label: 'Verify Docs', category: 'hr_management' },
  asset_management: { icon: FileText, label: 'Assets', category: 'hr_management' },
  offboarding: { icon: Trash2, label: 'Offboarding Exit', category: 'hr_management' },
  payroll: { icon: CreditCard, label: 'Salary Payroll', category: 'payroll_finance' },
  expenses: { icon: Receipt, label: 'Expense Claims', category: 'payroll_finance' },
  advances_loans: { icon: CreditCard, label: 'Advances & Loans', category: 'payroll_finance' },
  taxes_compliance: { icon: FileText, label: 'Taxes Compliance', category: 'payroll_finance' },
  ff_settlements: { icon: CheckCircle2, label: 'F&F Settlement', category: 'payroll_finance' },
  admin_dashboard: { icon: FileText, label: 'Company Overview', category: 'dashboards' },
  manager_dashboard: { icon: FileText, label: 'Task Analytics', category: 'dashboards' },
  gps_attendance: { icon: Clock, label: 'Live GPS Tracking', category: 'dashboards' },
  audit_logs: { icon: FileText, label: 'System Audit Logs', category: 'dashboards' },
  media_storage: { icon: HardDrive, label: 'Media Vault', category: 'dashboards' },
  settings: { icon: Settings, label: 'General Settings', category: 'saas_portal' },
  roles_permissions: { icon: Users, label: 'Roles & RBAC', category: 'saas_portal' },
  integrations: { icon: FileText, label: 'Integrations', category: 'saas_portal' },
  recycle_bin: { icon: Trash2, label: 'Recycle Bin', category: 'saas_portal' },
  billing: { icon: CreditCard, label: 'Billing & Plans', category: 'saas_portal' },
  superadmin_plans: { icon: Settings, label: 'Super Admin HQ', category: 'saas_portal' }
};

export default function MobileLeadConnectorView({
  authUser,
  canNav = () => true,
  onNavigateTab,
  onOpenModal,
  callLogs = [],
  contacts = [],
  unreadMessageCount = 14,
  pipelineValue = '₹4,85,000',
  onRequireAuth
}) {
  const [activeFooterTab, setActiveFooterTab] = useState('home'); // 'home' | 'recent' | 'dialer' | 'contact' | 'apps'
  const [appSearchQuery, setAppSearchQuery] = useState('');
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);
  const [bookmarkSearchQuery, setBookmarkSearchQuery] = useState('');
  const [dialerInput, setDialerInput] = useState('');
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [gatedActionItem, setGatedActionItem] = useState(null); // When unauthenticated user taps protected module

  const userId = authUser?.id || authUser?.uid || 'guest';
  const companyName = authUser?.companyName || authUser?.company_name || 'Reliable Solutions';
  const displayName = authUser?.name || authUser?.displayName || authUser?.fullName || (authUser ? 'Rahul' : 'Guest');

  // Load User Pinned Apps from Storage
  const [pinnedAppKeys, setPinnedAppKeys] = useState(() => {
    try {
      const saved = localStorage.getItem(`omniflow_pinned_apps_${userId}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return ['my_attendance', 'conversations', 'telecalling', 'employees'];
  });

  const savePinnedApps = (newKeys) => {
    setPinnedAppKeys(newKeys);
    try {
      localStorage.setItem(`omniflow_pinned_apps_${userId}`, JSON.stringify(newKeys));
    } catch (e) {}
  };

  // Toggle Pinned App in Bookmark Modal
  const handleTogglePin = (modKey) => {
    setPinnedAppKeys(prev => {
      let updated;
      if (prev.includes(modKey)) {
        updated = prev.filter(k => k !== modKey);
      } else {
        if (prev.length >= 8) return prev; // Max 8
        updated = [...prev, modKey];
      }
      try {
        localStorage.setItem(`omniflow_pinned_apps_${userId}`, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // All registered system modules filtered by 3-Tier Security Engine (canNav)
  const allAuthorizedModules = useMemo(() => {
    const list = [];
    Object.entries(MODULE_ICON_MAP).forEach(([key, config]) => {
      // If user is guest/unauth, still show all valid modules in catalog for browseability
      const isAllowed = authUser ? canNav(key) : true;
      if (isAllowed) {
        list.push({
          id: key,
          ...config
        });
      }
    });
    return list;
  }, [authUser, canNav]);

  // Filtered by Category
  const categorizedModules = useMemo(() => {
    const q = appSearchQuery.trim().toLowerCase();
    const map = {};
    CATEGORIES.forEach(c => { map[c.id] = []; });

    allAuthorizedModules.forEach(mod => {
      if (q && !mod.label.toLowerCase().includes(q)) return;
      const cat = mod.category || 'operations';
      if (map[cat]) {
        map[cat].push(mod);
      } else {
        if (!map['operations']) map['operations'] = [];
        map['operations'].push(mod);
      }
    });

    return map;
  }, [allAuthorizedModules, appSearchQuery]);

  // Effective Call Logs (Real SIM Synced Logs with Mock Fallback for Zero-State/Guest)
  const effectiveCallLogs = useMemo(() => {
    if (callLogs && callLogs.length > 0) return callLogs;
    try {
      const saved = localStorage.getItem('omniflow_guest_call_logs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [
      { id: 'call_1', customerName: 'Rohan Sharma', customerPhone: '+91 98234 56789', type: 'INCOMING', durationSeconds: 145, timestamp: 'Today, 11:20 AM', disposition: 'Interested' },
      { id: 'call_2', customerName: 'Priya Verma', customerPhone: '+91 98765 43210', type: 'OUTGOING', durationSeconds: 82, timestamp: 'Today, 10:15 AM', disposition: 'Follow Up' },
      { id: 'call_3', customerName: 'Amit Patel', customerPhone: '+91 99887 66554', type: 'MISSED', durationSeconds: 0, timestamp: 'Yesterday, 04:45 PM', disposition: 'Callback' },
      { id: 'call_4', customerName: 'Vikram Malhotra', customerPhone: '+91 98111 22334', type: 'OUTGOING', durationSeconds: 210, timestamp: 'Yesterday, 02:10 PM', disposition: 'Won' }
    ];
  }, [callLogs]);

  // Effective Contacts (Real CRM Contacts with Mock Fallback for Guest)
  const effectiveContacts = useMemo(() => {
    if (contacts && contacts.length > 0) return contacts;
    try {
      const saved = localStorage.getItem('omniflow_guest_contacts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [
      { id: 'cnt_1', name: 'Rohan Sharma', phone: '+91 98234 56789' },
      { id: 'cnt_2', name: 'Priya Verma', phone: '+91 98765 43210' },
      { id: 'cnt_3', name: 'Amit Patel', phone: '+91 99887 66554' },
      { id: 'cnt_4', name: 'Vikram Malhotra', phone: '+91 98111 22334' },
      { id: 'cnt_5', name: 'Kavita Singh', phone: '+91 91234 56780' }
    ];
  }, [contacts]);

  // Click handler on any module / quick action
  const handleModuleClick = (modKey, actionModalName = null) => {
    if (!authUser) {
      // Unauthenticated Guest -> Prompt Sign In Sheet
      const modConfig = MODULE_ICON_MAP[modKey] || { label: modKey.replace(/_/g, ' ') };
      setGatedActionItem(modConfig.label);
      return;
    }

    if (actionModalName && typeof onOpenModal === 'function') {
      onOpenModal(actionModalName);
      return;
    }

    if (typeof onNavigateTab === 'function') {
      onNavigateTab(modKey);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100%',
      maxWidth: '520px',
      margin: '0 auto',
      background: '#f8fafc',
      color: '#0f172a',
      fontFamily: "'Inter', sans-serif",
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 0 30px rgba(0,0,0,0.08)'
    }}>

      {/* TOP HEADER (Deep Pine Teal #064e43) */}
      <header style={{
        background: 'linear-gradient(135deg, #064e43 0%, #0d9488 100%)',
        color: '#ffffff',
        padding: '12px 18px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
        boxShadow: '0 2px 10px rgba(6, 78, 67, 0.25)',
        zIndex: 20
      }}>
        {/* Short Company Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <span style={{ fontSize: '15px', fontWeight: '800', letterSpacing: '-0.2px' }}>
            {companyName}
          </span>
          <ChevronDown size={14} style={{ color: '#5eead4' }} />
        </div>

        {/* Header Action Icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {!authUser ? (
            <button
              onClick={() => { if (typeof onRequireAuth === 'function') onRequireAuth(); }}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.4)',
                color: '#ffffff',
                padding: '4px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'background 0.15s ease'
              }}
            >
              Sign In
            </button>
          ) : (
            <>
              <div style={{ position: 'relative', cursor: 'pointer' }} title="Notifications">
                <Bell size={19} />
                <span style={{
                  position: 'absolute',
                  top: '-3px',
                  right: '-3px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#ef4444',
                  border: '2px solid #064e43'
                }}></span>
              </div>

              {/* User Profile Avatar */}
              <div
                onClick={() => {
                  if (typeof onNavigateTab === 'function') onNavigateTab('settings');
                }}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #10b981 0%, #0d9488 100%)',
                  border: '1.5px solid rgba(255,255,255,0.8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  fontWeight: '800',
                  color: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
              </div>
            </>
          )}
        </div>
      </header>

      {/* Guest Mode Pre-Auth Alert Bar */}
      {!authUser && (
        <div
          onClick={() => { if (typeof onRequireAuth === 'function') onRequireAuth(); }}
          style={{
            background: 'linear-gradient(90deg, #0f766e 0%, #0d9488 100%)',
            color: '#ecfdf5',
            padding: '6px 16px',
            fontSize: '11.5px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            borderBottom: '1px solid rgba(255,255,255,0.12)'
          }}
        >
          <span>⚡ Guest Mode: Recent Calls, Dialer & Contacts active</span>
          <span style={{ textDecoration: 'underline', fontWeight: '800', color: '#5eead4' }}>Sign In →</span>
        </div>
      )}

      {/* SCROLLABLE MAIN CONTENT BODY */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '14px 16px 85px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}>

        {/* ==================================================== */}
        {/* TAB 1: HOME SCREEN                                   */}
        {/* ==================================================== */}
        {activeFooterTab === 'home' && (
          <>
            {/* Welcome Greeting (Clean, NO refresh button!) */}
            <div style={{ padding: '2px 2px 4px 2px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.4px' }}>
                Welcome, {displayName}
              </h2>
            </div>

            {/* 4 Real EMS Metric Cards (2x2 Grid) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {/* Card 1: Attendance */}
              <div
                onClick={() => handleModuleClick('my_attendance')}
                style={{
                  background: '#ffffff',
                  borderRadius: '14px',
                  padding: '12px 14px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: '600', color: '#475569' }}>Attendance</span>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: '800',
                    color: '#065f46',
                    background: '#d1fae5',
                    padding: '2px 6px',
                    borderRadius: '999px'
                  }}>
                    On Duty
                  </span>
                </div>
                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span>
                  <span style={{ fontSize: '12.5px', fontWeight: '700', color: '#0f172a' }}>Checked In: 09:15 AM</span>
                </div>
              </div>

              {/* Card 2: Deals Pipeline */}
              <div
                onClick={() => handleModuleClick('kanban')}
                style={{
                  background: '#ffffff',
                  borderRadius: '14px',
                  padding: '12px 14px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: '600', color: '#475569' }}>Deals Pipeline</span>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '800',
                    color: '#047857',
                    background: '#ecfdf5',
                    padding: '2px 6px',
                    borderRadius: '6px'
                  }}>₹</span>
                </div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginTop: '6px', letterSpacing: '-0.3px' }}>
                  {pipelineValue}
                </div>
              </div>

              {/* Card 3: WhatsApp Leads */}
              <div
                onClick={() => handleModuleClick('conversations')}
                style={{
                  background: '#ffffff',
                  borderRadius: '14px',
                  padding: '12px 14px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: '600', color: '#475569' }}>WhatsApp Leads</span>
                  <MessageSquare size={14} style={{ color: '#10b981' }} />
                </div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginTop: '6px', letterSpacing: '-0.3px' }}>
                  {unreadMessageCount} Unread
                </div>
              </div>

              {/* Card 4: Pending Tasks */}
              <div
                onClick={() => handleModuleClick('tasks')}
                style={{
                  background: '#ffffff',
                  borderRadius: '14px',
                  padding: '12px 14px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: '600', color: '#475569' }}>Pending Tasks</span>
                  <ClipboardList size={14} style={{ color: '#0d9488' }} />
                </div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginTop: '6px', letterSpacing: '-0.3px' }}>
                  3 Due Today
                </div>
              </div>
            </div>

            {/* Pinned Apps Section (Bookmark System) */}
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '14px 16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>Pinned Apps</h3>
                <div
                  onClick={() => setShowBookmarkModal(true)}
                  style={{
                    color: '#064e43',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    fontWeight: '700'
                  }}
                  title="Customize Pinned Apps"
                >
                  <Edit2 size={15} />
                  <span>Edit</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '4px' }}>
                {pinnedAppKeys.map(key => {
                  const mod = MODULE_ICON_MAP[key] || { icon: Grid, label: key.replace(/_/g, ' ') };
                  const IconComp = mod.icon;
                  return (
                    <div
                      key={key}
                      onClick={() => handleModuleClick(key)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        minWidth: '64px'
                      }}
                    >
                      <div style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '50%',
                        background: '#f0fdfa',
                        border: '1.2px solid #ccfbf1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#064e43',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                      }}>
                        <IconComp size={22} strokeWidth={1.8} />
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: '600', color: '#334155', textAlign: 'center', maxWidth: '64px', lineHeight: '1.2' }}>
                        {mod.label}
                      </span>
                    </div>
                  );
                })}

                {/* Add Bookmark Button */}
                <div
                  onClick={() => setShowBookmarkModal(true)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    minWidth: '64px'
                  }}
                >
                  <div style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    background: '#ffffff',
                    border: '1.5px dashed #94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748b'
                  }}>
                    <Plus size={22} strokeWidth={1.8} />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', textAlign: 'center' }}>
                    Bookmark
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions Grid (8 Circular Buttons) */}
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '14px 16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginBottom: '14px' }}>
                Quick Actions
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', rowGap: '16px', columnGap: '8px', textAlign: 'center' }}>
                {/* 1. Punch In/Out */}
                <div onClick={() => handleModuleClick('my_attendance', 'punch')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#ffffff', border: '1.2px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#064e43', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                    <Clock size={22} strokeWidth={1.8} />
                  </div>
                  <span style={{ fontSize: '10.5px', fontWeight: '600', color: '#475569', lineHeight: '1.2' }}>Punch In/Out</span>
                </div>

                {/* 2. Add Contact */}
                <div onClick={() => handleModuleClick('contacts', 'add_contact')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#ffffff', border: '1.2px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#064e43', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                    <UserPlus size={22} strokeWidth={1.8} />
                  </div>
                  <span style={{ fontSize: '10.5px', fontWeight: '600', color: '#475569', lineHeight: '1.2' }}>Add Contact</span>
                </div>

                {/* 3. Make Call */}
                <div onClick={() => setActiveFooterTab('dialer')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#ffffff', border: '1.2px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#064e43', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                    <Phone size={22} strokeWidth={1.8} />
                  </div>
                  <span style={{ fontSize: '10.5px', fontWeight: '600', color: '#475569', lineHeight: '1.2' }}>Make Call</span>
                </div>

                {/* 4. New Chat */}
                <div onClick={() => handleModuleClick('conversations', 'new_chat')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#ffffff', border: '1.2px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#064e43', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                    <MessageSquare size={22} strokeWidth={1.8} />
                  </div>
                  <span style={{ fontSize: '10.5px', fontWeight: '600', color: '#475569', lineHeight: '1.2' }}>New Chat</span>
                </div>

                {/* 5. Apply Leave */}
                <div onClick={() => handleModuleClick('leaves', 'add_leave')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#ffffff', border: '1.2px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#064e43', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                    <Calendar size={22} strokeWidth={1.8} />
                  </div>
                  <span style={{ fontSize: '10.5px', fontWeight: '600', color: '#475569', lineHeight: '1.2' }}>Apply Leave</span>
                </div>

                {/* 6. Add Task */}
                <div onClick={() => handleModuleClick('tasks', 'add_task')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#ffffff', border: '1.2px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#064e43', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                    <ClipboardList size={22} strokeWidth={1.8} />
                  </div>
                  <span style={{ fontSize: '10.5px', fontWeight: '600', color: '#475569', lineHeight: '1.2' }}>Add Task</span>
                </div>

                {/* 7. New Deal */}
                <div onClick={() => handleModuleClick('kanban', 'add_deal')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#ffffff', border: '1.2px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#064e43', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                    <Briefcase size={22} strokeWidth={1.8} />
                  </div>
                  <span style={{ fontSize: '10.5px', fontWeight: '600', color: '#475569', lineHeight: '1.2' }}>New Deal</span>
                </div>

                {/* 8. Add Expense */}
                <div onClick={() => handleModuleClick('expenses', 'add_expense')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#ffffff', border: '1.2px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#064e43', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                    <Receipt size={22} strokeWidth={1.8} />
                  </div>
                  <span style={{ fontSize: '10.5px', fontWeight: '600', color: '#475569', lineHeight: '1.2' }}>Add Expense</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ==================================================== */}
        {/* TAB 2: RECENT CALL LOGS (Native Runo SIM Sync)       */}
        {/* ==================================================== */}
        {activeFooterTab === 'recent' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 2px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>Recent Calls</h2>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#0d9488', background: '#ccfbf1', padding: '2px 8px', borderRadius: '999px' }}>
                Runo SIM Sync Live
              </span>
            </div>

            {effectiveCallLogs.length === 0 ? (
              <div style={{ background: '#ffffff', borderRadius: '16px', padding: '36px 20px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                <PhoneCall size={36} style={{ color: '#94a3b8', margin: '0 auto 10px auto' }} />
                <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#334155' }}>No Calls Recorded Yet</h4>
                <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Incoming & outgoing SIM calls automatically log here and sync to CRM leads.</p>
              </div>
            ) : (
              effectiveCallLogs.slice(0, 30).map((log, idx) => {
                const isMissed = log.type === 'MISSED' || log.call_type === 'MISSED';
                const isIncoming = log.type === 'INCOMING' || log.call_type === 'INCOMING';
                return (
                  <div
                    key={log.id || idx}
                    style={{
                      background: '#ffffff',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: isMissed ? '#fef2f2' : '#ecfdf5',
                        color: isMissed ? '#ef4444' : '#10b981',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {isMissed ? <PhoneMissed size={18} /> : (isIncoming ? <PhoneIncoming size={18} /> : <PhoneOutgoing size={18} />)}
                      </div>
                      <div>
                        <div style={{ fontSize: '13.5px', fontWeight: '700', color: isMissed ? '#ef4444' : '#0f172a' }}>
                          {log.customerName || log.customer_name || log.name || 'Unknown Contact'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          {log.customerPhone || log.customer_phone || log.phone} • {log.durationSeconds ? `${Math.floor(log.durationSeconds / 60)}m ${log.durationSeconds % 60}s` : '0s'}
                        </div>
                      </div>
                    </div>
                    {/* Audio recording player if available */}
                    {log.recordingUrl && (
                      <audio controls src={log.recordingUrl} style={{ width: '100px', height: '28px' }} />
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 3: DIALER (Numeric Dialpad)                     */}
        {/* ==================================================== */}
        {activeFooterTab === 'dialer' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', paddingTop: '10px' }}>
            <div style={{ width: '100%', maxWidth: '320px', textAlign: 'center' }}>
              <input
                type="text"
                readOnly
                placeholder="Enter Phone Number"
                value={dialerInput}
                style={{
                  width: '100%',
                  height: '52px',
                  borderRadius: '12px',
                  border: '1.5px solid #e2e8f0',
                  background: '#ffffff',
                  fontSize: '22px',
                  fontWeight: '800',
                  textAlign: 'center',
                  color: '#0f172a',
                  letterSpacing: '1px',
                  outline: 'none'
                }}
              />
            </div>

            {/* Dialpad Keys 1-9, *, 0, # */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', width: '100%', maxWidth: '280px' }}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map(digit => (
                <button
                  key={digit}
                  onClick={() => setDialerInput(prev => prev + digit)}
                  style={{
                    height: '62px',
                    borderRadius: '50%',
                    background: '#ffffff',
                    border: '1.2px solid #e2e8f0',
                    fontSize: '22px',
                    fontWeight: '700',
                    color: '#0f172a',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                    transition: 'all 0.1s ease'
                  }}
                >
                  {digit}
                </button>
              ))}
            </div>

            {/* Action Row (Call + Backspace) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', marginTop: '8px' }}>
              <button
                onClick={() => {
                  if (!dialerInput) return;
                  // Persist in local recent calls history
                  try {
                    const newLog = {
                      id: `call_${Date.now()}`,
                      customerName: 'Direct Dial',
                      customerPhone: dialerInput,
                      type: 'OUTGOING',
                      durationSeconds: 0,
                      timestamp: 'Just now',
                      disposition: 'Dialed'
                    };
                    const existing = JSON.parse(localStorage.getItem('omniflow_guest_call_logs') || '[]');
                    localStorage.setItem('omniflow_guest_call_logs', JSON.stringify([newLog, ...existing]));
                  } catch (e) {}

                  if (typeof onOpenModal === 'function') {
                    onOpenModal('click_to_call', { phone: dialerInput });
                  } else {
                    window.open(`tel:${dialerInput}`, '_self');
                  }
                }}
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #064e43 0%, #10b981 100%)',
                  color: '#ffffff',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 6px 16px rgba(6, 78, 67, 0.35)'
                }}
                title="Call via SIM / Companion"
              >
                <Phone size={26} fill="currentColor" />
              </button>

              {dialerInput && (
                <button
                  onClick={() => setDialerInput(prev => prev.slice(0, -1))}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '700'
                  }}
                >
                  Delete ⌫
                </button>
              )}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 4: CONTACTS DIRECTORY                            */}
        {/* ==================================================== */}
        {activeFooterTab === 'contact' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={17} style={{ position: 'absolute', left: '12px', top: '13px', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search phone & CRM contacts..."
                value={contactSearchQuery}
                onChange={(e) => setContactSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  height: '42px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  paddingLeft: '38px',
                  fontSize: '13px',
                  background: '#ffffff',
                  outline: 'none'
                }}
              />
            </div>

            {effectiveContacts
              .filter(c => !contactSearchQuery || (c.name || '').toLowerCase().includes(contactSearchQuery.toLowerCase()) || (c.phone || '').includes(contactSearchQuery))
              .slice(0, 40)
              .map((contact, idx) => (
                <div
                  key={contact.id || idx}
                  style={{
                    background: '#ffffff',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#0f172a' }}>{contact.name || 'Unnamed Contact'}</div>
                    <div style={{ fontSize: '11.5px', color: '#64748b' }}>{contact.phone || 'No phone'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => window.open(`tel:${contact.phone}`, '_self')}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: '#ecfdf5',
                        color: '#047857',
                        border: '1px solid #a7f3d0',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Call"
                    >
                      <Phone size={15} />
                    </button>
                    <button
                      onClick={() => handleModuleClick('conversations', 'new_chat')}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: '#f0fdfa',
                        color: '#0d9488',
                        border: '1px solid #99f6e4',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="WhatsApp Chat"
                    >
                      <MessageSquare size={15} />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 5: ALL APPS CATALOG (Categorized 37 Modules)      */}
        {/* ==================================================== */}
        {activeFooterTab === 'apps' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Real-time Search Bar */}
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '14px', top: '13px', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search 37 Apps & Modules..."
                value={appSearchQuery}
                onChange={(e) => setAppSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  height: '44px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  paddingLeft: '42px',
                  fontSize: '13.5px',
                  background: '#ffffff',
                  outline: 'none',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                }}
              />
            </div>

            {/* Categorized Groups */}
            {CATEGORIES.map(category => {
              const items = categorizedModules[category.id] || [];
              if (items.length === 0) return null;
              return (
                <div
                  key={category.id}
                  style={{
                    background: '#ffffff',
                    borderRadius: '16px',
                    padding: '14px 16px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '13.5px', fontWeight: '700', color: '#0f172a' }}>{category.label}</h3>
                    <span style={{ fontSize: '10px', fontWeight: '800', background: category.bg, color: category.color, padding: '2px 7px', borderRadius: '999px' }}>
                      {items.length}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', rowGap: '16px', columnGap: '8px', textAlign: 'center' }}>
                    {items.map(mod => {
                      const IconComp = mod.icon || Grid;
                      return (
                        <div
                          key={mod.id}
                          onClick={() => handleModuleClick(mod.id)}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          <div style={{
                            width: '52px',
                            height: '52px',
                            borderRadius: '50%',
                            background: '#ffffff',
                            border: '1.2px solid #e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#334155',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                          }}>
                            <IconComp size={22} strokeWidth={1.8} />
                          </div>
                          <span style={{ fontSize: '10.5px', fontWeight: '600', color: '#475569', lineHeight: '1.2', maxWidth: '68px' }}>
                            {mod.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* ==================================================== */}
      {/* 5-TAB FIXED FOOTER NAVIGATION                        */}
      {/* ==================================================== */}
      <nav style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '66px',
        background: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '0 8px',
        zIndex: 30,
        boxShadow: '0 -2px 10px rgba(0,0,0,0.03)'
      }}>
        {/* 1. Home */}
        <div
          onClick={() => setActiveFooterTab('home')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px',
            cursor: 'pointer',
            padding: '4px 8px',
            color: activeFooterTab === 'home' ? '#064e43' : '#64748b'
          }}
        >
          <div style={{
            background: activeFooterTab === 'home' ? '#d1fae5' : 'transparent',
            borderRadius: '16px',
            padding: '3px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Home size={19} strokeWidth={activeFooterTab === 'home' ? 2.4 : 1.8} />
          </div>
          <span style={{ fontSize: '10px', fontWeight: activeFooterTab === 'home' ? '800' : '600' }}>Home</span>
        </div>

        {/* 2. Recent */}
        <div
          onClick={() => setActiveFooterTab('recent')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px',
            cursor: 'pointer',
            padding: '4px 8px',
            color: activeFooterTab === 'recent' ? '#064e43' : '#64748b'
          }}
        >
          <div style={{
            background: activeFooterTab === 'recent' ? '#d1fae5' : 'transparent',
            borderRadius: '16px',
            padding: '3px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Clock size={19} strokeWidth={activeFooterTab === 'recent' ? 2.4 : 1.8} />
          </div>
          <span style={{ fontSize: '10px', fontWeight: activeFooterTab === 'recent' ? '800' : '600' }}>Recent</span>
        </div>

        {/* 3. Dialer */}
        <div
          onClick={() => setActiveFooterTab('dialer')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px',
            cursor: 'pointer',
            padding: '4px 8px',
            color: activeFooterTab === 'dialer' ? '#064e43' : '#64748b'
          }}
        >
          <div style={{
            background: activeFooterTab === 'dialer' ? '#d1fae5' : 'transparent',
            borderRadius: '16px',
            padding: '3px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Phone size={19} strokeWidth={activeFooterTab === 'dialer' ? 2.4 : 1.8} />
          </div>
          <span style={{ fontSize: '10px', fontWeight: activeFooterTab === 'dialer' ? '800' : '600' }}>Dialer</span>
        </div>

        {/* 4. Contact */}
        <div
          onClick={() => setActiveFooterTab('contact')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px',
            cursor: 'pointer',
            padding: '4px 8px',
            color: activeFooterTab === 'contact' ? '#064e43' : '#64748b'
          }}
        >
          <div style={{
            background: activeFooterTab === 'contact' ? '#d1fae5' : 'transparent',
            borderRadius: '16px',
            padding: '3px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <BookOpen size={19} strokeWidth={activeFooterTab === 'contact' ? 2.4 : 1.8} />
          </div>
          <span style={{ fontSize: '10px', fontWeight: activeFooterTab === 'contact' ? '800' : '600' }}>Contact</span>
        </div>

        {/* 5. All Apps */}
        <div
          onClick={() => setActiveFooterTab('apps')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px',
            cursor: 'pointer',
            padding: '4px 8px',
            color: activeFooterTab === 'apps' ? '#064e43' : '#64748b'
          }}
        >
          <div style={{
            background: activeFooterTab === 'apps' ? '#d1fae5' : 'transparent',
            borderRadius: '16px',
            padding: '3px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Grid size={19} strokeWidth={activeFooterTab === 'apps' ? 2.4 : 1.8} />
          </div>
          <span style={{ fontSize: '10px', fontWeight: activeFooterTab === 'apps' ? '800' : '600' }}>All Apps</span>
        </div>
      </nav>

      {/* ==================================================== */}
      {/* BOOKMARK / PIN APPS MODAL (Bottom Sheet)            */}
      {/* ==================================================== */}
      {showBookmarkModal && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.65)',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end'
        }}>
          <div style={{
            background: '#ffffff',
            borderTopLeftRadius: '24px',
            borderTopRightRadius: '24px',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 -10px 25px rgba(0,0,0,0.2)'
          }}>
            {/* Sheet Handle & Header */}
            <div style={{ padding: '12px 18px 8px 18px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ width: '40px', height: '4px', background: '#cbd5e1', borderRadius: '4px', margin: '0 auto 10px auto' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ textAlign: 'left' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>Customize Pinned Apps</h3>
                  <p style={{ fontSize: '11px', color: '#64748b' }}>Select up to 8 apps to bookmark on Home Screen</p>
                </div>
                <button
                  onClick={() => setShowBookmarkModal(false)}
                  style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal App Search */}
            <div style={{ padding: '10px 18px' }}>
              <input
                type="text"
                placeholder="Search apps to pin..."
                value={bookmarkSearchQuery}
                onChange={(e) => setBookmarkSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  height: '38px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  padding: '0 12px',
                  fontSize: '12.5px',
                  background: '#f8fafc',
                  outline: 'none'
                }}
              />
            </div>

            {/* App Toggle Rows */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 18px 12px 18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {allAuthorizedModules
                .filter(m => !bookmarkSearchQuery || m.label.toLowerCase().includes(bookmarkSearchQuery.toLowerCase()))
                .map(mod => {
                  const isPinned = pinnedAppKeys.includes(mod.id);
                  const IconComp = mod.icon || Grid;
                  return (
                    <div
                      key={mod.id}
                      onClick={() => handleTogglePin(mod.id)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '12px',
                        border: isPinned ? '1.5px solid #10b981' : '1px solid #e2e8f0',
                        background: isPinned ? '#f0fdf4' : '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          background: isPinned ? '#d1fae5' : '#f1f5f9',
                          color: isPinned ? '#065f46' : '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <IconComp size={18} />
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{mod.label}</span>
                      </div>

                      {/* Toggle indicator */}
                      <div style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        background: isPinned ? '#10b981' : '#e2e8f0',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px'
                      }}>
                        {isPinned ? '✓' : ''}
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Modal Bottom Sticky CTA */}
            <div style={{ padding: '12px 18px', borderTop: '1px solid #f1f5f9', background: '#ffffff' }}>
              <button
                onClick={() => setShowBookmarkModal(false)}
                style={{
                  width: '100%',
                  height: '44px',
                  borderRadius: '12px',
                  background: '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '13.5px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                }}
              >
                Save Pinned Apps ({pinnedAppKeys.length}/8)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* SIGN IN REQUIRED SHEET (Pre-Auth Gated Action Prompt) */}
      {/* ==================================================== */}
      {gatedActionItem && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.65)',
          zIndex: 60,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end'
        }}>
          <div style={{
            background: '#ffffff',
            borderTopLeftRadius: '24px',
            borderTopRightRadius: '24px',
            padding: '24px 20px',
            boxShadow: '0 -10px 25px rgba(0,0,0,0.2)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: '#ecfdf5',
              color: '#064e43',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px auto'
            }}>
              <ShieldAlert size={28} />
            </div>

            <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>
              Sign In Required
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '6px', lineHeight: '1.4' }}>
              Please sign in or create an account to access <strong>{gatedActionItem}</strong> and sync your live company data.
            </p>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={() => setGatedActionItem(null)}
                style={{
                  flex: 1,
                  height: '44px',
                  borderRadius: '12px',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setGatedActionItem(null);
                  if (typeof onRequireAuth === 'function') onRequireAuth();
                }}
                style={{
                  flex: 1,
                  height: '44px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #064e43 0%, #10b981 100%)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(6, 78, 67, 0.25)'
                }}
              >
                Sign In / Sign Up
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
