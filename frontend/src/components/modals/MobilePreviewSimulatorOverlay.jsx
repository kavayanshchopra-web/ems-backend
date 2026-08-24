import React, { useState } from 'react';
import {
  Smartphone,
  Shield,
  Trash2,
  BarChart3,
  Globe,
  FileText,
  Users,
  Briefcase,
  CreditCard,
  Award,
  Check,
  MessageSquare,
  Layers,
  Bot,
  ClipboardList,
  Clock,
  Bell,
  Calendar,
  UserCheck,
  Tag,
  Megaphone
} from 'lucide-react';

export default function MobilePreviewSimulatorOverlay({
  isMobilePreview,
  setIsMobilePreview,
  activeTab,
  setActiveTab,
  authUser,
  callLogs = [],
  superadminMetrics = {},
  AccordionCategory
}) {
  const [simViewMode, setSimViewMode] = useState('app');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [superadminSubTab, setSuperadminSubTab] = useState('system_users');
  const [superadminUsersQuery, setSuperadminUsersQuery] = useState('');
  const [simPermissions, setSimPermissions] = useState({
    calendar: false,
    location: false,
    notifications: false,
    battery: false,
    phone: false,
    overlay: false,
    folder: false
  });

  if (!isMobilePreview) return null;

  return (
    <div className="mobile-simulator-overlay">
      <div className="mobile-simulator-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: '700' }}>
          <Smartphone size={18} style={{ color: '#38bdf8' }} />
          <span>OmniFlow Live Mobile Simulator (390px)</span>
        </div>

        {/* Mode Switcher: App View vs Permissions Onboarding */}
        <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.1)', padding: '3px', borderRadius: '8px' }}>
          <button
            onClick={() => setSimViewMode('app')}
            style={{
              background: simViewMode === 'app' ? '#0d9488' : 'transparent',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            📱 Main App View
          </button>
          <button
            onClick={() => setSimViewMode('permissions')}
            style={{
              background: simViewMode === 'permissions' ? '#0d9488' : 'transparent',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            🔐 Onboarding Permissions
          </button>
        </div>

        <button
          onClick={() => setIsMobilePreview(false)}
          style={{
            background: 'rgba(239, 68, 68, 0.2)',
            color: '#ef4444',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '4px 10px',
            fontSize: '12px',
            cursor: 'pointer',
            fontWeight: '700'
          }}
        >
          Close ✕
        </button>
      </div>
      <div className="mobile-simulator-frame">
        <div className="mobile-simulator-notch">
          <div className="mobile-simulator-camera" />
          <div className="mobile-simulator-speaker" />
        </div>
        <div className="mobile-simulator-screen telecalling-page-mobile" style={{ paddingTop: '28px' }}>
          {/* RENDER ONBOARDING PERMISSIONS VIEW IN SIMULATOR */}
          {simViewMode === 'permissions' ? (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 50,
              background: '#f8fafc',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}>
              {/* Centered Header */}
              <div style={{ background: 'linear-gradient(135deg, #0f2b26 0%, #0d9488 100%)', padding: '16px 14px', color: 'white', textAlign: 'center', flexShrink: 0 }}>
                <div style={{ fontSize: '17px', fontWeight: '800', letterSpacing: '-0.3px', textAlign: 'center', width: '100%' }}>App Permissions</div>
              </div>

              {/* Generic Basic Subtitle for All App Features */}
              <div style={{ padding: '10px 14px', fontSize: '11px', color: '#475569', lineHeight: '1.4', fontWeight: '500', textAlign: 'center', flexShrink: 0 }}>
                Please grant the required permissions below to ensure seamless operation of all app features.
              </div>

              {/* Scrollable Permission List Rows */}
              <div style={{ padding: '0 12px 12px 12px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto' }}>

                {/* Row 1: Calendar */}
                <div
                  onClick={() => setSimPermissions(prev => ({ ...prev, calendar: !prev.calendar }))}
                  style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '10px 12px',
                    border: simPermissions.calendar ? '1.5px solid #10b981' : '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                  }}
                >
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(13, 148, 136, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                    📅
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: '#0f2b26' }}>Calendar</div>
                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '1px', lineHeight: '1.2' }}>To sync followup events and show timely notifications</div>
                  </div>
                  <div style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: simPermissions.calendar ? '#10b981' : 'rgba(245, 158, 11, 0.15)',
                    color: simPermissions.calendar ? 'white' : '#f59e0b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: '800',
                    flexShrink: 0
                  }}>
                    {simPermissions.calendar ? '✓' : '!'}
                  </div>
                </div>

                {/* Row 2: Location */}
                <div
                  onClick={() => setSimPermissions(prev => ({ ...prev, location: !prev.location }))}
                  style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '10px 12px',
                    border: simPermissions.location ? '1.5px solid #10b981' : '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                  }}
                >
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(13, 148, 136, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                    📍
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: '#0f2b26' }}>Location</div>
                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '1px', lineHeight: '1.2' }}>To tag location data with call interactions and field visits</div>
                  </div>
                  <div style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: simPermissions.location ? '#10b981' : 'rgba(245, 158, 11, 0.15)',
                    color: simPermissions.location ? 'white' : '#f59e0b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: '800',
                    flexShrink: 0
                  }}>
                    {simPermissions.location ? '✓' : '!'}
                  </div>
                </div>

                {/* Row 3: Notifications */}
                <div
                  onClick={() => setSimPermissions(prev => ({ ...prev, notifications: !prev.notifications }))}
                  style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '10px 12px',
                    border: simPermissions.notifications ? '1.5px solid #10b981' : '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                  }}
                >
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(13, 148, 136, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                    🔔
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: '#0f2b26' }}>Notifications</div>
                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '1px', lineHeight: '1.2' }}>To show real-time app and service status alerts</div>
                  </div>
                  <div style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: simPermissions.notifications ? '#10b981' : 'rgba(245, 158, 11, 0.15)',
                    color: simPermissions.notifications ? 'white' : '#f59e0b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: '800',
                    flexShrink: 0
                  }}>
                    {simPermissions.notifications ? '✓' : '!'}
                  </div>
                </div>

                {/* Row 4: Battery */}
                <div
                  onClick={() => setSimPermissions(prev => ({ ...prev, battery: !prev.battery }))}
                  style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '10px 12px',
                    border: simPermissions.battery ? '1.5px solid #10b981' : '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                  }}
                >
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(13, 148, 136, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                    🔋
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: '#0f2b26' }}>Battery Exemption</div>
                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '1px', lineHeight: '1.2' }}>To help app run seamlessly in background</div>
                  </div>
                  <div style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: simPermissions.battery ? '#10b981' : 'rgba(245, 158, 11, 0.15)',
                    color: simPermissions.battery ? 'white' : '#f59e0b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: '800',
                    flexShrink: 0
                  }}>
                    {simPermissions.battery ? '✓' : '!'}
                  </div>
                </div>

                {/* Row 5: Phone */}
                <div
                  onClick={() => setSimPermissions(prev => ({ ...prev, phone: !prev.phone }))}
                  style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '10px 12px',
                    border: simPermissions.phone ? '1.5px solid #10b981' : '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                  }}
                >
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(13, 148, 136, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                    📞
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: '#0f2b26' }}>Phone & Call Log</div>
                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '1px', lineHeight: '1.2' }}>To track and update your call logs in CRM</div>
                  </div>
                  <div style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: simPermissions.phone ? '#10b981' : 'rgba(245, 158, 11, 0.15)',
                    color: simPermissions.phone ? 'white' : '#f59e0b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: '800',
                    flexShrink: 0
                  }}>
                    {simPermissions.phone ? '✓' : '!'}
                  </div>
                </div>

                {/* Row 6: Overlay */}
                <div
                  onClick={() => setSimPermissions(prev => ({ ...prev, overlay: !prev.overlay }))}
                  style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '10px 12px',
                    border: simPermissions.overlay ? '1.5px solid #10b981' : '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                  }}
                >
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(13, 148, 136, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                    🪟
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: '#0f2b26' }}>Display Overlay</div>
                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '1px', lineHeight: '1.2' }}>To show caller ID & call widgets for active calls</div>
                  </div>
                  <div style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: simPermissions.overlay ? '#10b981' : 'rgba(245, 158, 11, 0.15)',
                    color: simPermissions.overlay ? 'white' : '#f59e0b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: '800',
                    flexShrink: 0
                  }}>
                    {simPermissions.overlay ? '✓' : '!'}
                  </div>
                </div>

                {/* Row 7: Call Recording Storage Folder */}
                <div
                  onClick={() => setSimPermissions(prev => ({ ...prev, folder: !prev.folder }))}
                  style={{
                    background: 'linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%)',
                    borderRadius: '12px',
                    padding: '12px',
                    border: simPermissions.folder ? '1.5px solid #10b981' : '1.5px solid #3b82f6',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.08)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                      📁
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', fontWeight: '800', color: '#0f2b26' }}>Call Recording Storage Folder</div>
                      <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#3b82f6', marginTop: '1px' }}>SAF Folder Access Required</div>
                    </div>
                    <div style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      background: simPermissions.folder ? '#10b981' : '#3b82f6',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: '800',
                      flexShrink: 0
                    }}>
                      {simPermissions.folder ? '✓' : '📁'}
                    </div>
                  </div>
                  <div style={{ fontSize: '10px', color: '#334155', lineHeight: '1.35', background: 'rgba(255,255,255,0.85)', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                    💡 <strong>Instruction:</strong> Select your phone's native Call Recordings folder (e.g. <code>Recordings/Call/</code> or <code>MIUI/sound_recorder/call_rec/</code>) to enable automatic HD audio sync to OmniFlow CRM.
                  </div>
                </div>

              </div>

              {/* STICKY BOTTOM ACTION BUTTON */}
              <div style={{ padding: '10px 12px 14px 12px', background: 'white', borderTop: '1px solid #e2e8f0', flexShrink: 0 }}>
                <button
                  onClick={() => {
                    const all = Object.values(simPermissions).every(Boolean);
                    if (all) {
                      setActiveTab('admin_dashboard');
                      setSimViewMode('app');
                    } else {
                      setSimPermissions({ calendar: true, location: true, notifications: true, battery: true, phone: true, overlay: true, folder: true });
                    }
                  }}
                  style={{
                    width: '100%',
                    background: Object.values(simPermissions).every(Boolean) ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #0d9488 0%, #0f2b26 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '12px',
                    fontWeight: '800',
                    fontSize: '13px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(13, 148, 136, 0.3)'
                  }}
                >
                  {Object.values(simPermissions).every(Boolean) ? '✓ All Setup Complete — Launch App' : 'Grant Permissions & Link Folder'}
                </button>
              </div>
            </div>
          ) : null}

          {/* RENDER MAIN MOBILE APP VIEW WITH NAVIGATION DRAWER & DOCK */}
          {simViewMode === 'app' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden', background: '#f8fafc' }}>

              {/* 1. TOP MOBILE NAVBAR */}
              <div style={{
                background: 'var(--sidebar-bg, #064e43)',
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: 'white',
                boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                flexShrink: 0,
                zIndex: 10,
                borderBottom: '1px solid rgba(255,255,255,0.08)'
              }}>
                <button
                  onClick={() => setMobileSidebarOpen(prev => !prev)}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: 'none',
                    color: '#14d2cb',
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '15px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  ☰
                </button>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: '900', color: '#14d2cb', letterSpacing: '0.8px', textTransform: 'uppercase', lineHeight: '1.2' }}>
                    {(activeTab || '').replace(/_/g, ' ')}
                  </div>
                </div>

                <div style={{ width: '28px' }} />
              </div>

              {/* 2. MOBILE SLIDING NAVIGATION DRAWER OVERLAY */}
              {mobileSidebarOpen && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(15, 23, 42, 0.65)',
                  backdropFilter: 'blur(4px)',
                  zIndex: 60,
                  display: 'flex'
                }}>
                  <div style={{
                    width: '270px',
                    background: 'var(--sidebar-bg, #064e43)',
                    height: '100%',
                    color: 'white',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '16px 12px',
                    boxShadow: '4px 0 20px rgba(0,0,0,0.4)',
                    overflowY: 'auto'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
                      <span style={{ fontSize: '16px', fontWeight: '900', color: '#14d2cb', letterSpacing: '1.2px', textTransform: 'uppercase' }}>
                        OMNIFLOW
                      </span>
                      <button
                        onClick={() => setMobileSidebarOpen(false)}
                        style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        ✕
                      </button>
                    </div>

                    <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {/* SYSTEM */}
                      {(authUser?.role === 'superadmin' || authUser?.role === 'owner' || authUser?.role === 'admin') && AccordionCategory && (
                        <AccordionCategory id="system" label="SYSTEM">
                          {authUser?.role === 'superadmin' && (
                            <div className={`nav-item ${activeTab === 'superadmin_plans' ? 'active' : ''}`} onClick={() => { setActiveTab('superadmin_plans'); setMobileSidebarOpen(false); }}>
                              <Shield size={15} />
                              <span style={{ fontSize: '13px' }}>Super Admin Panel</span>
                            </div>
                          )}
                          <div className={`nav-item ${activeTab === 'recycle_bin' ? 'active' : ''}`} onClick={() => { setActiveTab('recycle_bin'); setMobileSidebarOpen(false); }}>
                            <Trash2 size={15} />
                            <span style={{ fontSize: '13px' }}>🛡️ Recycle Bin (DLP Vault)</span>
                          </div>
                        </AccordionCategory>
                      )}

                      {/* DASHBOARDS */}
                      {AccordionCategory && (
                        <AccordionCategory id="dashboards" label="DASHBOARDS">
                          <div className={`nav-item ${activeTab === 'admin_dashboard' ? 'active' : ''}`} onClick={() => { setActiveTab('admin_dashboard'); setMobileSidebarOpen(false); }}>
                            <BarChart3 size={15} />
                            <span style={{ fontSize: '13px' }}>Company Overview</span>
                          </div>
                          <div className={`nav-item ${activeTab === 'manager_dashboard' ? 'active' : ''}`} onClick={() => { setActiveTab('manager_dashboard'); setMobileSidebarOpen(false); }}>
                            <BarChart3 size={15} />
                            <span style={{ fontSize: '13px' }}>Task Analytics</span>
                          </div>
                          <div className={`nav-item ${activeTab === 'gps_attendance' ? 'active' : ''}`} onClick={() => { setActiveTab('gps_attendance'); setMobileSidebarOpen(false); }}>
                            <Globe size={15} />
                            <span style={{ fontSize: '13px' }}>Live Tracking</span>
                          </div>
                          <div className={`nav-item ${activeTab === 'audit_logs' ? 'active' : ''}`} onClick={() => { setActiveTab('audit_logs'); setMobileSidebarOpen(false); }}>
                            <FileText size={15} />
                            <span style={{ fontSize: '13px' }}>Audit Logs</span>
                          </div>
                        </AccordionCategory>
                      )}

                      {/* HR MANAGEMENT */}
                      {AccordionCategory && (
                        <AccordionCategory id="hr_management" label="HR MANAGEMENT">
                          <div className={`nav-item ${activeTab === 'employees' ? 'active' : ''}`} onClick={() => { setActiveTab('employees'); setMobileSidebarOpen(false); }}>
                            <Users size={15} />
                            <span style={{ fontSize: '13px' }}>All Employees</span>
                          </div>
                          <div className={`nav-item ${activeTab === 'recruitment_ats' ? 'active' : ''}`} onClick={() => { setActiveTab('recruitment_ats'); setMobileSidebarOpen(false); }}>
                            <Briefcase size={15} />
                            <span style={{ fontSize: '13px' }}>Recruitment ATS</span>
                          </div>
                          <div className={`nav-item ${activeTab === 'asset_management' ? 'active' : ''}`} onClick={() => { setActiveTab('asset_management'); setMobileSidebarOpen(false); }}>
                            <FileText size={15} />
                            <span style={{ fontSize: '13px' }}>Asset Management</span>
                          </div>
                          <div className={`nav-item ${activeTab === 'verify_documents' ? 'active' : ''}`} onClick={() => { setActiveTab('verify_documents'); setMobileSidebarOpen(false); }}>
                            <FileText size={15} />
                            <span style={{ fontSize: '13px' }}>Verify Documents</span>
                          </div>
                          <div className={`nav-item ${activeTab === 'offboarding' ? 'active' : ''}`} onClick={() => { setActiveTab('offboarding'); setMobileSidebarOpen(false); }}>
                            <Trash2 size={15} />
                            <span style={{ fontSize: '13px' }}>Offboarding Exit</span>
                          </div>
                        </AccordionCategory>
                      )}

                      {/* PAYROLL & FINANCE */}
                      {AccordionCategory && (
                        <AccordionCategory id="payroll_finance" label="PAYROLL & FINANCE">
                          <div className={`nav-item ${activeTab === 'payroll' ? 'active' : ''}`} onClick={() => { setActiveTab('payroll'); setMobileSidebarOpen(false); }}>
                            <CreditCard size={15} />
                            <span style={{ fontSize: '13px' }}>Payroll Salary</span>
                          </div>
                          <div className={`nav-item ${activeTab === 'taxes_compliance' ? 'active' : ''}`} onClick={() => { setActiveTab('taxes_compliance'); setMobileSidebarOpen(false); }}>
                            <FileText size={15} />
                            <span style={{ fontSize: '13px' }}>Taxes Compliance</span>
                          </div>
                          <div className={`nav-item ${activeTab === 'ff_settlements' ? 'active' : ''}`} onClick={() => { setActiveTab('ff_settlements'); setMobileSidebarOpen(false); }}>
                            <Check size={15} />
                            <span style={{ fontSize: '13px' }}>F&F Settlements</span>
                          </div>
                          <div className={`nav-item ${activeTab === 'advances_loans' ? 'active' : ''}`} onClick={() => { setActiveTab('advances_loans'); setMobileSidebarOpen(false); }}>
                            <CreditCard size={15} />
                            <span style={{ fontSize: '13px' }}>Advances Loans</span>
                          </div>
                          <div className={`nav-item ${activeTab === 'expenses' ? 'active' : ''}`} onClick={() => { setActiveTab('expenses'); setMobileSidebarOpen(false); }}>
                            <CreditCard size={15} />
                            <span style={{ fontSize: '13px' }}>Expenses Claim</span>
                          </div>
                        </AccordionCategory>
                      )}

                      {/* CRM & SALES */}
                      {AccordionCategory && (
                        <AccordionCategory id="crm_sales" label="CRM & SALES">
                          <div className={`nav-item ${activeTab === 'channels' ? 'active' : ''}`} onClick={() => { setActiveTab('channels'); setMobileSidebarOpen(false); }}>
                            <Smartphone size={15} />
                            <span style={{ fontSize: '13px' }}>WA Channels</span>
                          </div>
                          <div className={`nav-item ${activeTab === 'kanban' ? 'active' : ''}`} onClick={() => { setActiveTab('kanban'); setMobileSidebarOpen(false); }}>
                            <Layers size={15} />
                            <span style={{ fontSize: '13px' }}>CRM Pipeline</span>
                          </div>
                          <div className={`nav-item ${activeTab === 'telecalling' ? 'active' : ''}`} onClick={() => { setActiveTab('telecalling'); setMobileSidebarOpen(false); }}>
                            <span style={{ fontSize: '14px' }}>📞</span>
                            <span style={{ fontSize: '13px' }}>Call Recordings & SIM Sync</span>
                          </div>
                        </AccordionCategory>
                      )}

                      {/* OPERATIONS */}
                      {AccordionCategory && (
                        <AccordionCategory id="operations" label="OPERATIONS">
                          <div className={`nav-item ${activeTab === 'tasks' ? 'active' : ''}`} onClick={() => { setActiveTab('tasks'); setMobileSidebarOpen(false); }}>
                            <ClipboardList size={15} />
                            <span style={{ fontSize: '13px' }}>Tasks Board</span>
                          </div>
                          <div className={`nav-item ${activeTab === 'office_kiosk' ? 'active' : ''}`} onClick={() => { setActiveTab('office_kiosk'); setMobileSidebarOpen(false); }}>
                            <Clock size={15} />
                            <span style={{ fontSize: '13px' }}>Office Kiosk</span>
                          </div>
                          <div className={`nav-item ${activeTab === 'notice_board' ? 'active' : ''}`} onClick={() => { setActiveTab('notice_board'); setMobileSidebarOpen(false); }}>
                            <Bell size={15} />
                            <span style={{ fontSize: '13px' }}>Notice Board</span>
                          </div>
                          <div className={`nav-item ${activeTab === 'holidays' ? 'active' : ''}`} onClick={() => { setActiveTab('holidays'); setMobileSidebarOpen(false); }}>
                            <Calendar size={15} />
                            <span style={{ fontSize: '13px' }}>Holidays List</span>
                          </div>
                        </AccordionCategory>
                      )}

                      {/* MY PORTAL */}
                      {AccordionCategory && (
                        <AccordionCategory id="my_portal" label="My Portal">
                          <div className={`nav-item ${activeTab === 'my_attendance' ? 'active' : ''}`} onClick={() => { setActiveTab('my_attendance'); setMobileSidebarOpen(false); }}>
                            <Clock size={15} />
                            <span style={{ fontSize: '13px' }}>Shift Attendance</span>
                          </div>
                          <div className={`nav-item ${activeTab === 'leaves' ? 'active' : ''}`} onClick={() => { setActiveTab('leaves'); setMobileSidebarOpen(false); }}>
                            <Calendar size={15} />
                            <span style={{ fontSize: '13px' }}>Leaves Requests</span>
                          </div>
                          <div className={`nav-item ${activeTab === 'shifts' ? 'active' : ''}`} onClick={() => { setActiveTab('shifts'); setMobileSidebarOpen(false); }}>
                            <Calendar size={15} />
                            <span style={{ fontSize: '13px' }}>Work Shift Roster</span>
                          </div>
                        </AccordionCategory>
                      )}

                      {/* HELP & SUPPORT */}
                      {AccordionCategory && (
                        <AccordionCategory id="help_support" label="Help & Support">
                          <div className={`nav-item ${activeTab === 'app_guide' ? 'active' : ''}`} onClick={() => { setActiveTab('app_guide'); setMobileSidebarOpen(false); }}>
                            <Globe size={15} />
                            <span style={{ fontSize: '13px' }}>App Guide & Tour</span>
                          </div>
                        </AccordionCategory>
                      )}

                      {/* SETTINGS */}
                      {AccordionCategory && (
                        <AccordionCategory id="saas_portal" label="SETTINGS">
                          <div className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => { setActiveTab('settings'); setMobileSidebarOpen(false); }}>
                            <UserCheck size={15} />
                            <span style={{ fontSize: '13px' }}>General Settings</span>
                          </div>
                          <div className={`nav-item ${activeTab === 'roles_permissions' ? 'active' : ''}`} onClick={() => { setActiveTab('roles_permissions'); setMobileSidebarOpen(false); }}>
                            <UserCheck size={15} />
                            <span style={{ fontSize: '13px' }}>Roles & Permissions</span>
                          </div>
                          <div className={`nav-item ${activeTab === 'system_dropdowns' ? 'active' : ''}`} onClick={() => { setActiveTab('system_dropdowns'); setMobileSidebarOpen(false); }}>
                            <Tag size={15} />
                            <span style={{ fontSize: '13px' }}>System Dropdowns</span>
                          </div>
                          <div className={`nav-item ${activeTab === 'billing' ? 'active' : ''}`} onClick={() => { setActiveTab('billing'); setMobileSidebarOpen(false); }}>
                            <Megaphone size={15} style={{ transform: 'rotate(-20deg)' }} />
                            <span style={{ fontSize: '13px' }}>Subscription Billing</span>
                          </div>
                        </AccordionCategory>
                      )}
                    </nav>
                  </div>
                  <div style={{ flex: 1 }} onClick={() => setMobileSidebarOpen(false)} />
                </div>
              )}

              {/* 3. MAIN PAGE CONTENT CONTAINER */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '14px', fontFamily: 'var(--font-body, system-ui, sans-serif)' }}>
                {(activeTab === 'admin_dashboard' || activeTab === 'dashboard') && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div style={{ background: 'var(--sidebar-bg, #064e43)', color: 'white', padding: '12px', borderRadius: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
                        <div style={{ fontSize: '10px', opacity: 0.8, textTransform: 'uppercase', fontWeight: '700' }}>Total Staff</div>
                        <div style={{ fontSize: '22px', fontWeight: '900', marginTop: '2px' }}>24</div>
                        <div style={{ fontSize: '9px', color: '#99f6e4', marginTop: '2px' }}>🟢 21 Present Today</div>
                      </div>
                      <div style={{ background: '#0d9488', color: 'white', padding: '12px', borderRadius: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
                        <div style={{ fontSize: '10px', opacity: 0.8, textTransform: 'uppercase', fontWeight: '700' }}>Today's SIM Calls</div>
                        <div style={{ fontSize: '22px', fontWeight: '900', marginTop: '2px' }}>{callLogs.length || 48}</div>
                        <div style={{ fontSize: '9px', color: '#ccfbf1', marginTop: '2px' }}>🎧 100% Synced to Cloud</div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div style={{ background: 'white', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700' }}>INBOX CHATS</div>
                        <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f2b26', marginTop: '2px' }}>14 Active</div>
                      </div>
                      <div style={{ background: 'white', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700' }}>ACTIVE TASKS</div>
                        <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f2b26', marginTop: '2px' }}>8 Pending</div>
                      </div>
                    </div>

                    <div style={{ background: 'white', borderRadius: '14px', padding: '14px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '12px', fontWeight: '800', color: '#0f2b26', marginBottom: '8px' }}>⚡ Quick Operations</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <button onClick={() => setActiveTab('kanban')} style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '8px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
                          📊 CRM Pipeline
                        </button>
                        <button onClick={() => setActiveTab('telecalling')} style={{ background: '#f0fdfa', color: '#115e59', border: '1px solid #99f6e4', padding: '8px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
                          📞 SIM Call Logs
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'telecalling' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div style={{ background: 'var(--sidebar-bg, #064e43)', color: 'white', padding: '12px', borderRadius: '12px' }}>
                        <div style={{ fontSize: '10px', opacity: 0.8 }}>TOTAL SIM CALLS</div>
                        <div style={{ fontSize: '22px', fontWeight: '800' }}>{callLogs.length || 12}</div>
                      </div>
                      <div style={{ background: '#0d9488', color: 'white', padding: '12px', borderRadius: '12px' }}>
                        <div style={{ fontSize: '10px', opacity: 0.8 }}>CLOUD SYNCED</div>
                        <div style={{ fontSize: '22px', fontWeight: '800' }}>100%</div>
                      </div>
                    </div>

                    <div style={{ background: 'white', borderRadius: '12px', padding: '12px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px', color: '#0f2b26' }}>🎧 Recent Call Logs</div>
                      {(callLogs.length > 0 ? callLogs : [
                        { id: 1, customerPhone: '+91 98765 43210', type: 'OUTGOING', durationSeconds: 64, agentName: 'Senior Agent' },
                        { id: 2, customerPhone: '+91 91234 56789', type: 'INCOMING', durationSeconds: 120, agentName: 'Sales Lead' }
                      ]).slice(0, 4).map((log, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: '11px' }}>
                          <div>
                            <div style={{ fontWeight: '700', color: '#1e293b' }}>{log.customerPhone}</div>
                            <div style={{ fontSize: '10px', color: '#64748b' }}>{log.type} | {log.agentName}</div>
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#0d9488' }}>{log.durationSeconds || 45}s</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'gps_attendance' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ background: 'white', borderRadius: '12px', padding: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>CURRENT GEOFENCE LOCATION</div>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f2b26', marginTop: '2px' }}>🏢 Connaught Place Office Zone</div>
                      <div style={{ fontSize: '10px', color: '#059669', marginTop: '4px', fontWeight: '600' }}>✓ Verified Inside Authorized Perimeter (Radius: 200m)</div>
                      
                      <button style={{ width: '100%', marginTop: '12px', background: 'linear-gradient(135deg, #0d9488 0%, #064e43 100%)', color: 'white', border: 'none', borderRadius: '10px', padding: '10px', fontWeight: '800', fontSize: '12px', cursor: 'pointer', boxShadow: '0 3px 10px rgba(13,148,136,0.3)' }}>
                        ⏱️ Clock-In GPS Shift Attendance
                      </button>
                    </div>

                    <div style={{ background: 'white', borderRadius: '12px', padding: '12px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f2b26', marginBottom: '8px' }}>📡 Live Field Staff Locations</div>
                      {[
                        { name: 'Rahul Sharma (Field Agent)', status: 'In Field (Rohini)', time: '2 mins ago' },
                        { name: 'Priya Verma (Sales Exec)', status: 'Office HQ (CP)', time: 'Just now' },
                        { name: 'Amit Kumar (Telecaller)', status: 'On-Call (Noida)', time: '10 mins ago' }
                      ].map((staff, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: idx < 2 ? '1px solid #f1f5f9' : 'none', fontSize: '11px' }}>
                          <div>
                            <div style={{ fontWeight: '700', color: '#1e293b' }}>{staff.name}</div>
                            <div style={{ fontSize: '10px', color: '#0d9488', fontWeight: '600' }}>📍 {staff.status}</div>
                          </div>
                          <span style={{ fontSize: '10px', color: '#94a3b8' }}>{staff.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'employees' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[
                      { name: 'Rahul Sharma', role: 'Field Telecaller', dept: 'Sales', status: 'Active' },
                      { name: 'Priya Verma', role: 'CRM Manager', dept: 'Operations', status: 'Active' },
                      { name: 'Amit Kumar', role: 'Support Lead', dept: 'Customer Success', status: 'Active' }
                    ].map((emp, i) => (
                      <div key={i} style={{ background: 'white', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#064e43', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '13px' }}>
                            {emp.name[0]}
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f2b26' }}>{emp.name}</div>
                            <div style={{ fontSize: '10px', color: '#64748b' }}>{emp.role} • {emp.dept}</div>
                          </div>
                        </div>
                        <span style={{ background: '#ecfdf5', color: '#059669', fontSize: '10px', padding: '3px 8px', borderRadius: '6px', fontWeight: 'bold' }}>{emp.status}</span>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'tasks' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[
                      { title: 'Follow-up with Delhi Client leads', priority: 'High', due: 'Today, 5:00 PM' },
                      { title: 'Sync SIM call recording logs to CRM', priority: 'Urgent', due: 'Completed' },
                      { title: 'Weekly sales target review report', priority: 'Normal', due: 'Tomorrow' }
                    ].map((t, idx) => (
                      <div key={idx} style={{ background: 'white', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f2b26' }}>{t.title}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '10px' }}>
                          <span style={{ color: t.priority === 'Urgent' ? '#ef4444' : '#0d9488', fontWeight: 'bold' }}>🔥 {t.priority}</span>
                          <span style={{ color: '#64748b' }}>⏰ {t.due}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {(activeTab === 'superadmin_plans' || activeTab === 'super_admin') && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                        <div style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)', padding: '8px 4px', borderRadius: '10px', border: '1px solid #7dd3fc', textAlign: 'center' }}>
                          <div style={{ fontSize: '9px', fontWeight: '800', color: '#0369a1' }}>Companies</div>
                          <div style={{ fontSize: '18px', fontWeight: '900', color: '#0284c7', marginTop: '2px' }}>{superadminMetrics.companies || 1}</div>
                        </div>
                        <div style={{ background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)', padding: '8px 4px', borderRadius: '10px', border: '1px solid #86efac', textAlign: 'center' }}>
                          <div style={{ fontSize: '9px', fontWeight: '800', color: '#15803d' }}>Branches</div>
                          <div style={{ fontSize: '18px', fontWeight: '900', color: '#16a34a', marginTop: '2px' }}>{superadminMetrics.branches || 1}</div>
                        </div>
                        <div style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', padding: '8px 4px', borderRadius: '10px', border: '1px solid #fcd34d', textAlign: 'center' }}>
                          <div style={{ fontSize: '9px', fontWeight: '800', color: '#b45309' }}>Managers</div>
                          <div style={{ fontSize: '18px', fontWeight: '900', color: '#d97706', marginTop: '2px' }}>{superadminMetrics.managers || 1}</div>
                        </div>
                        <div style={{ background: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)', padding: '8px 4px', borderRadius: '10px', border: '1px solid #d8b4fe', textAlign: 'center' }}>
                          <div style={{ fontSize: '9px', fontWeight: '800', color: '#6b21a8' }}>Employees</div>
                          <div style={{ fontSize: '18px', fontWeight: '900', color: '#9333ea', marginTop: '2px' }}>{superadminMetrics.employees || 5}</div>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                        <div style={{ background: 'linear-gradient(135deg, #fae8ff 0%, #f5d0fe 100%)', padding: '8px 4px', borderRadius: '10px', border: '1px solid #f0abfc', textAlign: 'center' }}>
                          <div style={{ fontSize: '9px', fontWeight: '800', color: '#86198f' }}>Admins</div>
                          <div style={{ fontSize: '18px', fontWeight: '900', color: '#c026d3', marginTop: '2px' }}>{superadminMetrics.admins || 1}</div>
                        </div>
                        <div style={{ background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)', padding: '8px 4px', borderRadius: '10px', border: '1px solid #fca5a5', textAlign: 'center' }}>
                          <div style={{ fontSize: '9px', fontWeight: '800', color: '#b91c1c' }}>Super Admins</div>
                          <div style={{ fontSize: '18px', fontWeight: '900', color: '#ef4444', marginTop: '2px' }}>{superadminMetrics.superAdmins || 2}</div>
                        </div>
                        <div style={{ background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)', padding: '8px 4px', borderRadius: '10px', border: '1px solid #6ee7b7', textAlign: 'center' }}>
                          <div style={{ fontSize: '9px', fontWeight: '800', color: '#047857' }}>Total Users</div>
                          <div style={{ fontSize: '18px', fontWeight: '900', color: '#059669', marginTop: '2px' }}>{superadminMetrics.totalUsers || 8}</div>
                        </div>
                      </div>
                    </div>

                    <div 
                      className="mobile-subtabs-scroll-container no-scrollbar"
                      onMouseDown={(e) => {
                        const el = e.currentTarget;
                        el.isDown = true;
                        el.startX = e.pageX - el.offsetLeft;
                        el.scrollLeftPos = el.scrollLeft;
                      }}
                      onMouseLeave={(e) => { e.currentTarget.isDown = false; }}
                      onMouseUp={(e) => { e.currentTarget.isDown = false; }}
                      onMouseMove={(e) => {
                        const el = e.currentTarget;
                        if (!el.isDown) return;
                        e.preventDefault();
                        const x = e.pageX - el.offsetLeft;
                        const walk = (x - el.startX) * 1.5;
                        el.scrollLeft = el.scrollLeftPos - walk;
                      }}
                      style={{ 
                        display: 'flex', 
                        flexWrap: 'nowrap', 
                        gap: '8px', 
                        overflowX: 'auto', 
                        WebkitOverflowScrolling: 'touch',
                        padding: '4px 2px 6px 2px',
                        msOverflowStyle: 'none',
                        scrollbarWidth: 'none',
                        cursor: 'grab'
                      }}
                    >
                      {[
                        { id: 'system_users', label: 'System Users' },
                        { id: 'manage_companies', label: 'Manage Companies' },
                        { id: 'manage_plans', label: 'Manage Plans' },
                        { id: 'audit_logs', label: 'Audit Logs' },
                        { id: 'system_tools', label: 'System Tools' }
                      ].map((tabObj) => {
                        const isActive = (superadminSubTab || 'system_users') === tabObj.id;
                        return (
                          <button
                            key={tabObj.id}
                            type="button"
                            onClick={() => setSuperadminSubTab(tabObj.id)}
                            style={{
                              flexShrink: 0,
                              whiteSpace: 'nowrap',
                              padding: '7px 14px',
                              borderRadius: '20px',
                              fontSize: '11px',
                              fontWeight: '700',
                              border: isActive ? 'none' : '1px solid #cbd5e1',
                              background: isActive ? 'linear-gradient(135deg, #0d9488 0%, #064e43 100%)' : '#ffffff',
                              color: isActive ? '#ffffff' : '#475569',
                              boxShadow: isActive ? '0 2px 6px rgba(13, 148, 136, 0.3)' : 'none',
                              cursor: 'pointer'
                            }}
                          >
                            {tabObj.label}
                          </button>
                        );
                      })}
                    </div>

                    {(superadminSubTab === 'system_users' || !superadminSubTab) && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="text"
                            placeholder="🔍 Search system users..."
                            value={superadminUsersQuery}
                            onChange={(e) => setSuperadminUsersQuery(e.target.value)}
                            style={{ flex: 1, padding: '8px 12px', fontSize: '11px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#ffffff' }}
                          />
                          <button style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            + Add User
                          </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {[
                            { name: 'Kavayansh Chopra', email: 'kavayanshchopra@gmail.com', role: 'Super Admin', color: '#ef4444', bg: '#fef2f2', border: '#fecaca' },
                            { name: 'OmniFlow Global Admin', email: 'admin@omniflow.com', role: 'Super Admin', color: '#ef4444', bg: '#fef2f2', border: '#fecaca' }
                          ].map((user, idx) => (
                            <div key={idx} style={{ background: '#ffffff', borderRadius: '12px', padding: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f2b26' }}>👤 {user.name}</div>
                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>✉️ {user.email}</div>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                <span style={{ background: user.bg, color: user.color, border: `1px solid ${user.border}`, fontSize: '10px', padding: '3px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                                  👑 {user.role}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {superadminSubTab === 'manage_companies' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="text"
                            placeholder="🔍 Search companies..."
                            style={{ flex: 1, padding: '8px 12px', fontSize: '11px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#ffffff' }}
                          />
                          <button style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            + Add Company
                          </button>
                        </div>
                        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
                          <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f2b26' }}>🏢 OmniFlow Global HQ</div>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>📍 Delhi NCR, India | 👥 8 Active Users</div>
                          <span style={{ background: '#dcfce7', color: '#16a34a', border: '1px solid #86efac', fontSize: '10px', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold', display: 'inline-block', marginTop: '8px' }}>Active Enterprise</span>
                        </div>
                      </div>
                    )}

                    {superadminSubTab === 'manage_plans' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '14px', border: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f2b26' }}>⚡ Enterprise Growth Plan</div>
                          <div style={{ fontSize: '18px', fontWeight: '900', color: '#0d9488', marginTop: '4px' }}>₹4,999 / mo</div>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Unlimited Users • WhatsApp API • Cloud Telephony</div>
                        </div>
                      </div>
                    )}

                    {superadminSubTab === 'audit_logs' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '12px', border: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f2b26' }}>📜 Superadmin Login Verified</div>
                          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>Kavayansh Chopra • Today, 12:05 AM</div>
                        </div>
                      </div>
                    )}

                    {superadminSubTab === 'system_tools' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f2b26' }}>🛠️ Diagnostic & Maintenance Tools</div>
                        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f2b26' }}>🧹 Clear System Cache</div>
                            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>Purge active session cache & force sync</div>
                          </div>
                          <button style={{ background: 'linear-gradient(135deg, #0d9488, #064e43)', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>Flush Cache</button>
                        </div>
                        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f2b26' }}>🔌 Test WebSocket Server</div>
                            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>Ping realtime Baileys & WhatsApp Socket</div>
                          </div>
                          <button style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#334155', padding: '6px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>Test Socket</button>
                        </div>
                        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f2b26' }}>🔥 Firebase Health</div>
                            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>Verify connection to ems-ag Firestore</div>
                          </div>
                          <button style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#334155', padding: '6px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>Check Health</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab !== 'telecalling' && activeTab !== 'kanban' && activeTab !== 'admin_dashboard' && activeTab !== 'dashboard' && activeTab !== 'gps_attendance' && activeTab !== 'employees' && activeTab !== 'tasks' && activeTab !== 'superadmin_plans' && activeTab !== 'super_admin' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ background: 'white', borderRadius: '12px', padding: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f2b26', marginBottom: '6px' }}>
                        Module Overview & Settings
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.4' }}>
                        Active configuration and operational records for {(activeTab || '').replace(/_/g, ' ')} are synced in real time across web and mobile views.
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 4. MOBILE BOTTOM NAVIGATION DOCK */}
              <div style={{
                background: '#ffffff',
                borderTop: '1px solid #e2e8f0',
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                padding: '6px 0 8px 0',
                flexShrink: 0,
                boxShadow: '0 -2px 10px rgba(0,0,0,0.04)',
                zIndex: 10
              }}>
                <button
                  onClick={() => setActiveTab('admin_dashboard')}
                  style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', color: activeTab === 'admin_dashboard' ? '#0d9488' : '#64748b', cursor: 'pointer' }}
                >
                  <span style={{ fontSize: '16px' }}>📊</span>
                  <span style={{ fontSize: '9px', fontWeight: '700' }}>Home</span>
                </button>
                <button
                  onClick={() => setActiveTab('employees')}
                  style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', color: activeTab === 'employees' ? '#0d9488' : '#64748b', cursor: 'pointer' }}
                >
                  <span style={{ fontSize: '16px' }}>👥</span>
                  <span style={{ fontSize: '9px', fontWeight: '700' }}>Staff</span>
                </button>
                <button
                  onClick={() => setActiveTab('kanban')}
                  style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', color: activeTab === 'kanban' ? '#0d9488' : '#64748b', cursor: 'pointer' }}
                >
                  <span style={{ fontSize: '16px' }}>📊</span>
                  <span style={{ fontSize: '9px', fontWeight: '700' }}>Pipeline</span>
                </button>
                <button
                  onClick={() => setActiveTab('telecalling')}
                  style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', color: activeTab === 'telecalling' ? '#0d9488' : '#64748b', cursor: 'pointer' }}
                >
                  <span style={{ fontSize: '16px' }}>📞</span>
                  <span style={{ fontSize: '9px', fontWeight: '700' }}>Calls</span>
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  style={{ background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', color: activeTab === 'settings' ? '#0d9488' : '#64748b', cursor: 'pointer' }}
                >
                  <span style={{ fontSize: '16px' }}>⚙️</span>
                  <span style={{ fontSize: '9px', fontWeight: '700' }}>Settings</span>
                </button>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
