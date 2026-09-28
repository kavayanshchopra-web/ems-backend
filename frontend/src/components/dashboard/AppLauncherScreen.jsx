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
        subLabel: 'Super Admin',
        category: 'Administration',
        icon: Shield,
        color: '#14d2cb',
        accentBg: 'rgba(20, 210, 203, 0.12)',
        borderColor: 'rgba(20, 210, 203, 0.35)',
        visible: authUser?.role === 'superadmin',
        desc: 'Multi-tenant provisioning, plans, pricing & telemetry'
      },
      {
        id: 'dashboards',
        tab: 'admin_dashboard',
        label: t('dashboardsCat') || 'DASHBOARDS',
        subLabel: 'Overview',
        category: 'Analytics',
        icon: BarChart3,
        color: '#10b981',
        accentBg: 'rgba(16, 185, 129, 0.12)',
        borderColor: 'rgba(16, 185, 129, 0.35)',
        visible: typeof canNav === 'function' ? canNav('admin_dashboard') : true,
        desc: 'Company KPIs, staff statistics & revenue overview'
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
        desc: 'Customer database, contact tags & pipeline segments'
      },
      {
        id: 'conversations',
        tab: 'conversations',
        label: t('conversations') || 'CONVERSATIONS',
        subLabel: 'Omni Inbox',
        category: 'Communications',
        icon: MessageSquare,
        color: '#10b981',
        accentBg: 'rgba(16, 185, 129, 0.12)',
        borderColor: 'rgba(16, 185, 129, 0.35)',
        visible: typeof canNav === 'function' ? canNav('conversations') : true,
        desc: 'Unified omnichannel chat inbox with live messaging'
      },
      {
        id: 'telecalling',
        tab: 'telecalling',
        label: t('phoneSystem') || 'PHONE SYSTEM',
        subLabel: 'Dialer & Audio',
        category: 'Communications',
        icon: PhoneCall,
        color: '#06b6d4',
        accentBg: 'rgba(6, 182, 212, 0.12)',
        borderColor: 'rgba(6, 182, 212, 0.35)',
        visible: typeof canNav === 'function' ? canNav('telecalling') : true,
        desc: 'SIM recording bridge, Voxbay cloud dialer & audio vault'
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
        desc: 'Visual sales pipeline stages, deal values & drag-and-drop'
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
        desc: 'Native WhatsApp Web pairing & connected device sync'
      },
      {
        id: 'automations_sandbox',
        tab: 'automations_sandbox',
        label: 'AUTOMATIONS',
        subLabel: 'Workflows',
        category: 'Workflows',
        icon: Zap,
        color: '#a855f7',
        accentBg: 'rgba(168, 85, 247, 0.12)',
        borderColor: 'rgba(168, 85, 247, 0.35)',
        badge: 'SANDBOX',
        visible: typeof canNav === 'function' ? canNav('automations_sandbox') : true,
        desc: 'Event triggers, webhooks & automated multi-step actions'
      },
      {
        id: 'tasks',
        tab: 'tasks',
        label: 'TASK MANAGEMENT',
        subLabel: 'Team Roster',
        category: 'Operations',
        icon: ClipboardList,
        color: '#f59e0b',
        accentBg: 'rgba(245, 158, 11, 0.12)',
        borderColor: 'rgba(245, 158, 11, 0.35)',
        visible: typeof canNav === 'function' ? (canNav('tasks') || canNav('manager_dashboard')) : true,
        desc: 'Team task board, priority queues & employee workload'
      },
      {
        id: 'gps_attendance',
        tab: 'gps_attendance',
        label: 'LIVE TRACKING MAP',
        subLabel: 'Field Radar',
        category: 'Operations',
        icon: Globe,
        color: '#3b82f6',
        accentBg: 'rgba(59, 130, 246, 0.12)',
        borderColor: 'rgba(59, 130, 246, 0.35)',
        visible: typeof canNav === 'function' ? canNav('gps_attendance') : true,
        desc: 'Real-time GPS pinpoints, field worker routes & visits'
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
        desc: 'Immutable security audit trail, IP tracking & timestamps'
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
        desc: 'Secure cloud asset storage & document library'
      },
      {
        id: 'hr_management',
        tab: 'employees',
        label: t('hrCat') || 'HR MANAGEMENT',
        subLabel: 'Staff & ATS',
        category: 'Human Resources',
        icon: Users,
        color: '#3b82f6',
        accentBg: 'rgba(59, 130, 246, 0.12)',
        borderColor: 'rgba(59, 130, 246, 0.35)',
        visible: typeof canNav === 'function' ? (canNav('employees') || canNav('recruitment_ats') || canNav('asset_management') || canNav('verify_documents') || canNav('offboarding')) : true,
        desc: 'Employee directory, recruitment ATS & offboarding'
      },
      {
        id: 'payroll_finance',
        tab: 'payroll',
        label: t('payrollCat') || 'PAYROLL & FINANCE',
        subLabel: 'Salaries & Taxes',
        category: 'Finance',
        icon: CreditCard,
        color: '#10b981',
        accentBg: 'rgba(16, 185, 129, 0.12)',
        borderColor: 'rgba(16, 185, 129, 0.35)',
        visible: typeof canNav === 'function' ? (canNav('payroll') || canNav('taxes_compliance') || canNav('ff_settlements') || canNav('advances_loans') || canNav('expenses')) : true,
        desc: 'Monthly payroll calculations, payslips & tax deductions'
      },
      {
        id: 'reporting',
        tab: 'reports_telephony',
        label: 'REPORTS & ANALYTICS',
        subLabel: 'Analytics',
        category: 'Analytics',
        icon: BarChart2,
        color: '#8b5cf6',
        accentBg: 'rgba(139, 92, 246, 0.12)',
        borderColor: 'rgba(139, 92, 246, 0.35)',
        visible: typeof canNav === 'function' ? (canNav('reports_telephony') || canNav('reports_crm') || canNav('reports_cross') || canNav('reports_builder') || canNav('reports')) : true,
        desc: 'Telephony reports, sales metrics & custom builder'
      },
      {
        id: 'operations',
        tab: 'office_kiosk',
        label: t('opsCat') || 'OPERATIONS',
        subLabel: 'Kiosk & Notices',
        category: 'Operations',
        icon: Briefcase,
        color: '#f59e0b',
        accentBg: 'rgba(245, 158, 11, 0.12)',
        borderColor: 'rgba(245, 158, 11, 0.35)',
        visible: typeof canNav === 'function' ? (canNav('office_kiosk') || canNav('notice_board') || canNav('holidays')) : true,
        desc: 'Attendance kiosk punch mode, notices & holidays'
      },
      {
        id: 'my_portal',
        tab: 'my_attendance',
        label: t('myPortalCat') || 'MY PORTAL',
        subLabel: 'Self-Service',
        category: 'Personal Portal',
        icon: User,
        color: '#14d2cb',
        accentBg: 'rgba(20, 210, 203, 0.12)',
        borderColor: 'rgba(20, 210, 203, 0.35)',
        visible: typeof canNav === 'function' ? (canNav('my_attendance') || canNav('leaves') || canNav('shifts')) : true,
        desc: 'Self-service shift clock-in/out & leave requests'
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
        desc: 'Interactive guided application tour & tutorials'
      },
      {
        id: 'settings',
        tab: 'settings',
        label: t('settingsCat') || 'SETTINGS',
        subLabel: 'Control Center',
        category: 'Administration',
        icon: Settings,
        color: '#14d2cb',
        accentBg: 'rgba(20, 210, 203, 0.12)',
        borderColor: 'rgba(20, 210, 203, 0.35)',
        visible: typeof canNav === 'function' ? (canNav('settings') || canNav('integrations') || canNav('roles_permissions') || canNav('recycle_bin') || canNav('system_dropdowns') || canNav('module_configuration') || canNav('billing')) : true,
        desc: 'Role permissions matrix, APIs, trash vault & billing'
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
      background: 'radial-gradient(circle at 12% 15%, rgba(20, 210, 203, 0.11) 0%, transparent 45%), radial-gradient(circle at 88% 22%, rgba(16, 185, 129, 0.10) 0%, transparent 45%), radial-gradient(circle at 50% 90%, rgba(15, 43, 38, 0.06) 0%, transparent 55%), linear-gradient(135deg, #edf6f5 0%, #f2f8f7 50%, #eaf4f2 100%)',
      padding: '20px 20px 36px 20px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      position: 'relative'
    }}>
      {/* Top Search Bar Hub - Compact & Sleek */}
      <div style={{
        width: '100%',
        maxWidth: '1140px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: '18px'
      }}>
        {/* Sleek Search Input */}
        <div style={{
          width: '100%',
          maxWidth: '420px',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            left: '13px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#14d2cb',
            display: 'flex',
            alignItems: 'center',
            pointerEvents: 'none'
          }}>
            <Search size={15} />
          </div>

          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search applications (Ctrl + K)..."
            style={{
              width: '100%',
              height: '38px',
              padding: '0 38px 0 38px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.96)',
              backdropFilter: 'blur(12px)',
              border: '1.2px solid rgba(20, 210, 203, 0.35)',
              boxShadow: '0 4px 14px -2px rgba(15, 43, 38, 0.06), 0 1px 3px rgba(0,0,0,0.02)',
              fontSize: '13px',
              fontWeight: '600',
              color: '#0f2b26',
              outline: 'none',
              transition: 'all 0.2s ease',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#14d2cb';
              e.target.style.boxShadow = '0 6px 18px -2px rgba(20, 210, 203, 0.22), 0 0 0 2px rgba(20, 210, 203, 0.20)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(20, 210, 203, 0.35)';
              e.target.style.boxShadow = '0 4px 14px -2px rgba(15, 43, 38, 0.06), 0 1px 3px rgba(0,0,0,0.02)';
            }}
          />

          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '9px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(100, 116, 139, 0.15)',
                border: 'none',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b'
              }}
            >
              <X size={11} />
            </button>
          ) : (
            <div style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              padding: '2px 6px',
              background: '#f1f5f9',
              borderRadius: '5px',
              border: '1px solid #e2e8f0',
              fontSize: '9.5px',
              fontWeight: '700',
              color: '#94a3b8',
              pointerEvents: 'none'
            }}>
              Ctrl K
            </div>
          )}
        </div>
      </div>

      {/* App Grid Container - Sleek, Compact & Well-Spaced for Scaling */}
      <div style={{
        width: '100%',
        maxWidth: '1140px'
      }}>
        {filteredModules.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            background: 'rgba(255, 255, 255, 0.85)',
            borderRadius: '16px',
            border: '1px dashed #cbd5e1',
            maxWidth: '380px',
            margin: '0 auto'
          }}>
            <Search size={26} style={{ color: '#94a3b8', marginBottom: '8px' }} />
            <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>
              No matching applications
            </h4>
            <p style={{ margin: 0, fontSize: '11.5px', color: '#64748b' }}>
              No apps found for "{searchQuery}". Try searching for another keyword.
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
            gap: '12px 14px',
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
                    maxWidth: '120px',
                    minHeight: '112px',
                    background: isHovered ? '#ffffff' : 'rgba(255, 255, 255, 0.94)',
                    backdropFilter: 'blur(14px)',
                    border: isHovered ? `1.4px solid ${app.color}` : '1px solid rgba(20, 210, 203, 0.20)',
                    borderRadius: '14px',
                    padding: '10px 6px 8px 6px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    transform: isHovered ? 'translateY(-4px) scale(1.03)' : 'translateY(0) scale(1)',
                    boxShadow: isHovered
                      ? `0 10px 22px -3px rgba(20, 210, 203, 0.22), 0 0 0 1px ${app.color}`
                      : '0 2px 8px -2px rgba(15, 43, 38, 0.05), 0 1px 2px rgba(0,0,0,0.02)',
                    boxSizing: 'border-box',
                    userSelect: 'none'
                  }}
                >
                  {/* Optional Sandbox Badge */}
                  {app.badge && (
                    <span style={{
                      position: 'absolute',
                      top: '5px',
                      right: '5px',
                      fontSize: '7px',
                      fontWeight: '800',
                      padding: '1px 4px',
                      borderRadius: '3px',
                      background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                      color: '#ffffff',
                      letterSpacing: '0.2px',
                      boxShadow: '0 2px 4px rgba(139, 92, 246, 0.22)'
                    }}>
                      {app.badge}
                    </span>
                  )}

                  {/* Compact Icon Box - Retaining clear & crisp icon */}
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '11px',
                    background: app.accentBg,
                    border: `1px solid ${app.borderColor}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: app.color,
                    boxShadow: isHovered ? `0 4px 10px ${app.accentBg}` : 'none',
                    transition: 'all 0.2s ease',
                    transform: isHovered ? 'scale(1.06)' : 'scale(1)',
                    marginBottom: '6px'
                  }}>
                    <IconComp size={22} strokeWidth={2.2} />
                  </div>

                  {/* Module Name - Neatly Wrapped (No Ellipsis Cut-Off) */}
                  <span style={{
                    fontSize: '10px',
                    fontWeight: '800',
                    color: isHovered ? '#0f2b26' : '#1e293b',
                    textAlign: 'center',
                    textTransform: 'uppercase',
                    letterSpacing: '0.2px',
                    lineHeight: '1.2',
                    marginBottom: '2px',
                    width: '100%',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    minHeight: '24px'
                  }}>
                    {app.label}
                  </span>

                  {/* Subtitle / Category */}
                  <span style={{
                    fontSize: '8.5px',
                    fontWeight: '600',
                    color: '#64748b',
                    textAlign: 'center',
                    lineHeight: '1.1',
                    width: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
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
