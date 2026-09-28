import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Shield,
  BarChart3,
  Users,
  MessageSquare,
  PhoneCall,
  Layers,
  Smartphone,
  Zap,
  ClipboardList,
  Globe,
  FileText,
  HardDrive,
  CreditCard,
  BarChart2,
  Briefcase,
  User,
  HelpCircle,
  Settings,
  Search,
  X
} from 'lucide-react';

export default function AppLauncherScreen({
  authUser,
  canNav,
  setActiveTab,
  t = (k) => k
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredAppId, setHoveredAppId] = useState(null);
  const searchInputRef = useRef(null);

  // Keyboard shortcut Ctrl+K to focus search, Esc to clear
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape' && searchQuery) {
        setSearchQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery]);

  // Master list of all actual modules from the sidebar (strict 1-to-1 match)
  const allModules = useMemo(() => {
    const list = [
      {
        id: 'system',
        tab: 'superadmin_plans',
        label: t('systemCat') || 'SYSTEM',
        subLabel: 'Super Admin Panel',
        category: 'Administration',
        icon: Shield,
        color: '#14d2cb',
        accentBg: 'rgba(20, 210, 203, 0.12)',
        borderColor: 'rgba(20, 210, 203, 0.35)',
        visible: authUser?.role === 'superadmin',
        desc: 'Multi-tenant provisioning, subscription plans, pricing & telemetry'
      },
      {
        id: 'dashboards',
        tab: 'admin_dashboard',
        label: t('dashboardsCat') || 'DASHBOARDS',
        subLabel: 'Executive Overview',
        category: 'Analytics',
        icon: BarChart3,
        color: '#10b981',
        accentBg: 'rgba(16, 185, 129, 0.12)',
        borderColor: 'rgba(16, 185, 129, 0.35)',
        visible: typeof canNav === 'function' ? canNav('admin_dashboard') : true,
        desc: 'Company KPIs, staff statistics, revenue overview & performance metrics'
      },
      {
        id: 'contacts',
        tab: 'contacts',
        label: t('contacts') || 'CONTACTS',
        subLabel: 'Clients & Leads',
        category: 'CRM & Sales',
        icon: Users,
        color: '#14d2cb',
        accentBg: 'rgba(20, 210, 203, 0.12)',
        borderColor: 'rgba(20, 210, 203, 0.35)',
        visible: typeof canNav === 'function' ? canNav('contacts') : true,
        desc: 'Omnichannel customer database, contact tags, pipeline segments & sync'
      },
      {
        id: 'conversations',
        tab: 'conversations',
        label: t('conversations') || 'CONVERSATIONS',
        subLabel: 'Omnichannel Inbox',
        category: 'Communications',
        icon: MessageSquare,
        color: '#10b981',
        accentBg: 'rgba(16, 185, 129, 0.12)',
        borderColor: 'rgba(16, 185, 129, 0.35)',
        visible: typeof canNav === 'function' ? canNav('conversations') : true,
        desc: 'Unified omnichannel chat inbox with live customer messaging'
      },
      {
        id: 'telecalling',
        tab: 'telecalling',
        label: t('phoneSystem') || 'PHONE SYSTEM',
        subLabel: 'SIM & Cloud Dialer',
        category: 'Communications',
        icon: PhoneCall,
        color: '#06b6d4',
        accentBg: 'rgba(6, 182, 212, 0.12)',
        borderColor: 'rgba(6, 182, 212, 0.35)',
        visible: typeof canNav === 'function' ? canNav('telecalling') : true,
        desc: 'SIM recording bridge, Voxbay cloud dialer, call disposition & audio vault'
      },
      {
        id: 'kanban',
        tab: 'kanban',
        label: 'CRM',
        subLabel: 'Deals Pipeline',
        category: 'CRM & Sales',
        icon: Layers,
        color: '#8b5cf6',
        accentBg: 'rgba(139, 92, 246, 0.12)',
        borderColor: 'rgba(139, 92, 246, 0.35)',
        visible: typeof canNav === 'function' ? canNav('kanban') : true,
        desc: 'Visual sales pipeline stages, deal values, lead stages & drag-and-drop'
      },
      {
        id: 'wa_live_web',
        tab: 'wa_live_web',
        label: 'WHATSAPP',
        subLabel: 'Live QR Web',
        category: 'Communications',
        icon: Smartphone,
        color: '#22c55e',
        accentBg: 'rgba(34, 197, 94, 0.12)',
        borderColor: 'rgba(34, 197, 94, 0.35)',
        visible: typeof canNav === 'function' ? canNav('wa_live_web') : true,
        desc: 'Native WhatsApp Web pairing, connected device sync & quick broadcast'
      },
      {
        id: 'automations_sandbox',
        tab: 'automations_sandbox',
        label: 'AUTOMATIONS',
        subLabel: 'Triggers & Webhooks',
        category: 'Workflows',
        icon: Zap,
        color: '#a855f7',
        accentBg: 'rgba(168, 85, 247, 0.12)',
        borderColor: 'rgba(168, 85, 247, 0.35)',
        badge: 'SANDBOX',
        visible: typeof canNav === 'function' ? canNav('automations_sandbox') : true,
        desc: 'Event triggers, webhooks, multi-step actions & automated workflows'
      },
      {
        id: 'tasks',
        tab: 'tasks',
        label: 'TASK MANAGEMENT',
        subLabel: 'Team Tasks & Roster',
        category: 'Operations',
        icon: ClipboardList,
        color: '#f59e0b',
        accentBg: 'rgba(245, 158, 11, 0.12)',
        borderColor: 'rgba(245, 158, 11, 0.35)',
        visible: typeof canNav === 'function' ? (canNav('tasks') || canNav('manager_dashboard')) : true,
        desc: 'Team task board, priority queues, deadlines & employee workload tracking'
      },
      {
        id: 'gps_attendance',
        tab: 'gps_attendance',
        label: 'LIVE TRACKING MAP',
        subLabel: 'Field Team Radar',
        category: 'Operations',
        icon: Globe,
        color: '#3b82f6',
        accentBg: 'rgba(59, 130, 246, 0.12)',
        borderColor: 'rgba(59, 130, 246, 0.35)',
        visible: typeof canNav === 'function' ? canNav('gps_attendance') : true,
        desc: 'Real-time GPS pinpoints, field worker routes, breadcrumbs & client visits'
      },
      {
        id: 'audit_logs',
        tab: 'audit_logs',
        label: 'SYSTEM AUDIT LOGS',
        subLabel: 'Security Trail',
        category: 'Administration',
        icon: FileText,
        color: '#ec4899',
        accentBg: 'rgba(236, 72, 153, 0.12)',
        borderColor: 'rgba(236, 72, 153, 0.35)',
        visible: typeof canNav === 'function' ? canNav('audit_logs') : true,
        desc: 'Immutable security audit trail, IP tracking, timestamps & user events'
      },
      {
        id: 'media_storage',
        tab: 'media_storage',
        label: 'MEDIA & STORAGE',
        subLabel: 'Cloud Vault',
        category: 'Administration',
        icon: HardDrive,
        color: '#14b8a6',
        accentBg: 'rgba(20, 184, 166, 0.12)',
        borderColor: 'rgba(20, 184, 166, 0.35)',
        visible: typeof canNav === 'function' ? canNav('media_storage') : true,
        desc: 'Secure cloud asset storage, company document library & storage quotas'
      },
      {
        id: 'hr_management',
        tab: 'employees',
        label: t('hrCat') || 'HR MANAGEMENT',
        subLabel: 'Staff & Recruitment',
        category: 'Human Resources',
        icon: Users,
        color: '#3b82f6',
        accentBg: 'rgba(59, 130, 246, 0.12)',
        borderColor: 'rgba(59, 130, 246, 0.35)',
        visible: typeof canNav === 'function' ? (canNav('employees') || canNav('recruitment_ats') || canNav('asset_management') || canNav('verify_documents') || canNav('offboarding')) : true,
        desc: 'Employee directory, recruitment ATS, company equipment & offboarding'
      },
      {
        id: 'payroll_finance',
        tab: 'payroll',
        label: t('payrollCat') || 'PAYROLL & FINANCE',
        subLabel: 'Salaries & Tax Compliance',
        category: 'Finance',
        icon: CreditCard,
        color: '#10b981',
        accentBg: 'rgba(16, 185, 129, 0.12)',
        borderColor: 'rgba(16, 185, 129, 0.35)',
        visible: typeof canNav === 'function' ? (canNav('payroll') || canNav('taxes_compliance') || canNav('ff_settlements') || canNav('advances_loans') || canNav('expenses')) : true,
        desc: 'Automatic monthly payroll calculations, payslips, tax deductions & loan advances'
      },
      {
        id: 'reporting',
        tab: 'reports_telephony',
        label: 'REPORTS & ANALYTICS',
        subLabel: 'Business Intelligence',
        category: 'Analytics',
        icon: BarChart2,
        color: '#8b5cf6',
        accentBg: 'rgba(139, 92, 246, 0.12)',
        borderColor: 'rgba(139, 92, 246, 0.35)',
        visible: typeof canNav === 'function' ? (canNav('reports_telephony') || canNav('reports_crm') || canNav('reports_cross') || canNav('reports_builder') || canNav('reports')) : true,
        desc: 'Telephony reports, sales conversion metrics & custom dynamic report builder'
      },
      {
        id: 'operations',
        tab: 'office_kiosk',
        label: t('opsCat') || 'OPERATIONS',
        subLabel: 'Kiosk & Bulletins',
        category: 'Operations',
        icon: Briefcase,
        color: '#f59e0b',
        accentBg: 'rgba(245, 158, 11, 0.12)',
        borderColor: 'rgba(245, 158, 11, 0.35)',
        visible: typeof canNav === 'function' ? (canNav('office_kiosk') || canNav('notice_board') || canNav('holidays')) : true,
        desc: 'Office attendance kiosk punch mode, company notice board & holiday list'
      },
      {
        id: 'my_portal',
        tab: 'my_attendance',
        label: t('myPortalCat') || 'MY PORTAL',
        subLabel: 'Self-Service Desk',
        category: 'Personal Portal',
        icon: User,
        color: '#14d2cb',
        accentBg: 'rgba(20, 210, 203, 0.12)',
        borderColor: 'rgba(20, 210, 203, 0.35)',
        visible: typeof canNav === 'function' ? (canNav('my_attendance') || canNav('leaves') || canNav('shifts')) : true,
        desc: 'Self-service shift clock-in/out, leave requests & weekly duty roster'
      },
      {
        id: 'help_support',
        tab: 'app_guide',
        label: t('helpSupportCat') || 'HELP & SUPPORT',
        subLabel: 'Guides & Tours',
        category: 'Support',
        icon: HelpCircle,
        color: '#06b6d4',
        accentBg: 'rgba(6, 182, 212, 0.12)',
        borderColor: 'rgba(6, 182, 212, 0.35)',
        visible: typeof canNav === 'function' ? (canNav('app_guide') || canNav('feedback')) : true,
        desc: 'Interactive guided application tour, step-by-step guides & feature suggestions'
      },
      {
        id: 'settings',
        tab: 'settings',
        label: t('settingsCat') || 'SETTINGS',
        subLabel: 'Workspace Control',
        category: 'Administration',
        icon: Settings,
        color: '#14d2cb',
        accentBg: 'rgba(20, 210, 203, 0.12)',
        borderColor: 'rgba(20, 210, 203, 0.35)',
        visible: typeof canNav === 'function' ? (canNav('settings') || canNav('integrations') || canNav('roles_permissions') || canNav('recycle_bin') || canNav('system_dropdowns') || canNav('module_configuration') || canNav('billing')) : true,
        desc: 'Role permissions matrix, API integrations, trash vault & subscription billing'
      }
    ].filter(item => item.visible);

    return list;
  }, [authUser, canNav, t]);

  // Filter modules based on search query
  const filteredModules = useMemo(() => {
    if (!searchQuery.trim()) return allModules;
    const q = searchQuery.toLowerCase().trim();
    return allModules.filter(m =>
      m.label.toLowerCase().includes(q) ||
      m.subLabel.toLowerCase().includes(q) ||
      m.desc.toLowerCase().includes(q) ||
      m.category.toLowerCase().includes(q)
    );
  }, [allModules, searchQuery]);

  return (
    <div style={{
      minHeight: '100%',
      width: '100%',
      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, rgba(20, 210, 203, 0.05) 100%)',
      padding: '36px 24px 60px 24px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      {/* Top Header / Search Hub */}
      <div style={{
        width: '100%',
        maxWidth: '1240px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: '36px'
      }}>
        {/* Welcome Tag & Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '10px'
        }}>
          <span style={{
            fontSize: '11px',
            fontWeight: '800',
            textTransform: 'uppercase',
            letterSpacing: '1.2px',
            color: '#0d9488',
            background: 'rgba(20, 210, 203, 0.12)',
            border: '1px solid rgba(20, 210, 203, 0.3)',
            padding: '4px 12px',
            borderRadius: '20px'
          }}>
            ⚡ OmniFlow EMS Apps Directory
          </span>
          <span style={{
            fontSize: '11px',
            fontWeight: '700',
            color: '#64748b'
          }}>
            {allModules.length} Active Modules
          </span>
        </div>

        {/* Big Search Input with Option 5 Glassmorphism Styling */}
        <div style={{
          width: '100%',
          maxWidth: '560px',
          position: 'relative',
          marginTop: '6px'
        }}>
          <div style={{
            position: 'absolute',
            left: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#14d2cb',
            display: 'flex',
            alignItems: 'center',
            pointerEvents: 'none'
          }}>
            <Search size={18} />
          </div>

          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search applications (or press Ctrl + K)..."
            style={{
              width: '100%',
              height: '48px',
              padding: '0 48px 0 44px',
              borderRadius: '16px',
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(12px)',
              border: '1.5px solid rgba(20, 210, 203, 0.35)',
              boxShadow: '0 8px 24px -4px rgba(15, 43, 38, 0.08), 0 2px 6px rgba(0,0,0,0.03)',
              fontSize: '14px',
              fontWeight: '600',
              color: '#0f2b26',
              outline: 'none',
              transition: 'all 0.2s ease',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#14d2cb';
              e.target.style.boxShadow = '0 12px 28px -4px rgba(20, 210, 203, 0.25), 0 0 0 2px rgba(20, 210, 203, 0.3)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(20, 210, 203, 0.35)';
              e.target.style.boxShadow = '0 8px 24px -4px rgba(15, 43, 38, 0.08), 0 2px 6px rgba(0,0,0,0.03)';
            }}
          />

          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(100, 116, 139, 0.15)',
                border: 'none',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b'
              }}
            >
              <X size={14} />
            </button>
          ) : (
            <div style={{
              position: 'absolute',
              right: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              padding: '2px 7px',
              background: '#f1f5f9',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              fontSize: '11px',
              fontWeight: '700',
              color: '#94a3b8',
              pointerEvents: 'none'
            }}>
              Ctrl K
            </div>
          )}
        </div>
      </div>

      {/* App Grid Container */}
      <div style={{
        width: '100%',
        maxWidth: '1240px'
      }}>
        {filteredModules.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: 'rgba(255, 255, 255, 0.7)',
            borderRadius: '20px',
            border: '1px dashed #cbd5e1',
            maxWidth: '450px',
            margin: '0 auto'
          }}>
            <Search size={32} style={{ color: '#94a3b8', marginBottom: '12px' }} />
            <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: '800', color: '#1e293b' }}>
              No matching applications
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              No apps found for "{searchQuery}". Try searching for another keyword.
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
            gap: '22px',
            justifyItems: 'center'
          }}>
            {filteredModules.map((app) => {
              const IconComp = app.icon;
              const isHovered = hoveredAppId === app.id;

              return (
                <div
                  key={app.id}
                  onClick={() => {
                    if (typeof setActiveTab === 'function') {
                      setActiveTab(app.tab);
                    }
                  }}
                  onMouseEnter={() => setHoveredAppId(app.id)}
                  onMouseLeave={() => setHoveredAppId(null)}
                  title={`${app.label} — ${app.desc}`}
                  style={{
                    width: '100%',
                    maxWidth: '185px',
                    minHeight: '165px',
                    background: isHovered ? 'rgba(255, 255, 255, 0.98)' : 'rgba(255, 255, 255, 0.82)',
                    backdropFilter: 'blur(16px)',
                    border: isHovered ? `1.5px solid ${app.color}` : '1.5px solid rgba(226, 232, 240, 0.9)',
                    borderRadius: '22px',
                    padding: '20px 14px 16px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
                    transform: isHovered ? 'translateY(-8px) scale(1.03)' : 'translateY(0) scale(1)',
                    boxShadow: isHovered
                      ? `0 20px 32px -4px rgba(15, 43, 38, 0.14), 0 0 0 1.5px ${app.color}, 0 8px 16px -2px ${app.accentBg}`
                      : '0 4px 16px -2px rgba(15, 43, 38, 0.05), 0 1px 3px rgba(0,0,0,0.02)',
                    boxSizing: 'border-box',
                    userSelect: 'none'
                  }}
                >
                  {/* Optional Sandbox Badge */}
                  {app.badge && (
                    <span style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      fontSize: '9px',
                      fontWeight: '800',
                      padding: '2px 6px',
                      borderRadius: '5px',
                      background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                      color: '#ffffff',
                      letterSpacing: '0.4px',
                      boxShadow: '0 2px 4px rgba(139, 92, 246, 0.3)'
                    }}>
                      {app.badge}
                    </span>
                  )}

                  {/* Icon Card Box (Option 5 Theme: Pure White + Glowing Border Accent) */}
                  <div style={{
                    width: '66px',
                    height: '66px',
                    borderRadius: '18px',
                    background: app.accentBg,
                    border: `1.5px solid ${app.borderColor}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: app.color,
                    boxShadow: isHovered ? `0 8px 18px ${app.accentBg}` : 'none',
                    transition: 'all 0.22s ease',
                    transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                    marginBottom: '12px'
                  }}>
                    <IconComp size={30} strokeWidth={2.2} />
                  </div>

                  {/* Module Name */}
                  <span style={{
                    fontSize: '12px',
                    fontWeight: '800',
                    color: isHovered ? '#0f2b26' : '#1e293b',
                    textAlign: 'center',
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px',
                    lineHeight: '1.25',
                    marginBottom: '3px'
                  }}>
                    {app.label}
                  </span>

                  {/* Subtitle / Category */}
                  <span style={{
                    fontSize: '10.5px',
                    fontWeight: '600',
                    color: '#64748b',
                    textAlign: 'center',
                    lineHeight: '1.2'
                  }}>
                    {app.subLabel}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
