import SuperAdminKycHub from '../superadmin/SuperAdminKycHub';
import SuperAdminTelephonyHub from '../superadmin/SuperAdminTelephonyHub';
import SuperAdminModuleProvisioningHub from '../superadmin/SuperAdminModuleProvisioningHub';
import SuperAdminFeedbackHub from '../superadmin/SuperAdminFeedbackHub';
import SuperAdminSubscriptionHub from '../superadmin/SuperAdminSubscriptionHub';
import SuperAdminModelStudio from '../superadmin/SuperAdminModelStudio';
import SuperAdminLoginStudio from '../superadmin/SuperAdminLoginStudio';
import SuperAdminMasterPlansHub from '../superadmin/SuperAdminMasterPlansHub';
import React, { useState, useMemo, useEffect } from 'react';
import { Briefcase, Globe, UserCheck, Users, Shield, ShieldCheck, Award, Search, Trash2, Clock, Sliders, Sparkles, Layers, MessageSquare, Check, CheckSquare, Square, Lock, AlertCircle, Info, Filter, DollarSign, TrendingUp, TrendingDown, Plus, X, Settings as SettingsIcon, CheckCircle2, Calendar } from 'lucide-react';
import DataTable from '../DataTable';
import { dynamicDashboardEngine } from '../../core/engines/DynamicDashboardEngine';
import MasterModuleRegistry from '../../core/registry/MasterModuleRegistry';
import FeatureProvisioningEngine from '../../core/engines/FeatureProvisioningEngine';
import SubscriptionEngine, { DEFAULT_PLANS } from '../../core/engines/SubscriptionEngine';
import { SUPER_ADMIN_MANIFEST } from '../../core/registry/manifests/superAdmin.manifest';
import superAdminService from '../../services/superAdminService';

export default function SuperAdminPage({
  API_URL = '',
  authUser = null,
  superadminMetrics = {},
  superadminSubTab,
  setSuperadminSubTab,
  superadminUsersQuery,
  setSuperadminUsersQuery,
  fetchSuperadminUsers,
  superadminUsers = [],
  handleElevateUserRole,
  handleDeleteUserAccount,
  superadminCompanies = [],
  superadminCompaniesQuery,
  setSuperadminCompaniesQuery,
  fetchSuperadminCompanies,
  handleDeleteCompany,
  handleEnterCompany,
  adminPlansError,
  adminPlanForm,
  setAdminPlanForm,
  handleSavePlan,
  superadminPlans = [],
  adminSelectedPlanId,
  setAdminSelectedPlanId,
  handleDeletePlanPrice,
  adminNewPriceForm,
  setAdminNewPriceForm,
  handleSavePlanPrice,
  auditLogsQuery,
  setAuditLogsQuery,
  auditLogs = [],
  setAuditLogs,
  showToast
}) {
  const superAdminStats = useMemo(() => {
    return dynamicDashboardEngine.getSuperAdminDashboardMetrics(superadminCompanies, superadminUsers);
  }, [superadminCompanies, superadminUsers]);

  // All 22 platform modules with global provisioning status
  const allPlatformModules = useMemo(() => {
    let manifests = [];
    try {
      if (MasterModuleRegistry && typeof MasterModuleRegistry.getAllManifests === 'function') {
        manifests = MasterModuleRegistry.getAllManifests();
      } else if (MasterModuleRegistry && typeof MasterModuleRegistry.getAllSystemManifests === 'function') {
        manifests = MasterModuleRegistry.getAllSystemManifests();
      }
    } catch (e) {
      console.warn('MasterModuleRegistry load notice:', e);
    }

    if (!Array.isArray(manifests) || manifests.length === 0) {
      manifests = [
        { moduleId: 'employees', name: 'Employees Directory', category: 'HR & Workforce', icon: '👥' },
        { moduleId: 'recruitment_ats', name: 'Recruitment & ATS', category: 'HR & Workforce', icon: '💼' },
        { moduleId: 'asset_management', name: 'Asset Management', category: 'HR & Workforce', icon: '💻' },
        { moduleId: 'verify_documents', name: 'Verify Documents', category: 'HR & Workforce', icon: '📄' },
        { moduleId: 'offboarding', name: 'Offboarding Exit', category: 'HR & Workforce', icon: '🚪' },
        { moduleId: 'payroll', name: 'Payroll & Salary Slips', category: 'Finance & Payroll', icon: '💰' },
        { moduleId: 'taxes_compliance', name: 'Taxes & Compliance', category: 'Finance & Payroll', icon: '⚖️' },
        { moduleId: 'ff_settlements', name: 'F&F Settlements', category: 'Finance & Payroll', icon: '🧾' },
        { moduleId: 'advances_loans', name: 'Advances & Loans', category: 'Finance & Payroll', icon: '💳' },
        { moduleId: 'expenses', name: 'Expenses Claim', category: 'Finance & Payroll', icon: '📊' },
        { moduleId: 'contacts', name: 'Contacts & Leads', category: 'CRM & Sales', icon: '👥' },
        { moduleId: 'conversations', name: 'WhatsApp Conversations', category: 'CRM & Sales', icon: '💬' },
        { moduleId: 'wa_live_web', name: 'WhatsApp Web Live Hub', category: 'CRM & Sales', icon: '📱' },
        { moduleId: 'kanban', name: 'CRM Deals Pipeline', category: 'CRM & Sales', icon: '📊' },
        { moduleId: 'telecalling', name: 'SIM Calls & Cloud PBX', category: 'Field & Telephony', icon: '📞' },
        { moduleId: 'gps_attendance', name: 'Live GPS Field Tracking', category: 'Field & Telephony', icon: '📍' },
        { moduleId: 'tasks', name: 'Tasks Board', category: 'Platform Operations', icon: '📋' },
        { moduleId: 'office_kiosk', name: 'Office Kiosk Terminal', category: 'Platform Operations', icon: '⏱️' },
        { moduleId: 'notice_board', name: 'Notice Board', category: 'Platform Operations', icon: '📢' },
        { moduleId: 'holidays', name: 'Holidays Calendar', category: 'Platform Operations', icon: '📅' },
        { moduleId: 'audit_logs', name: 'System Audit Logs', category: 'Platform Operations', icon: '🛡️' },
        { moduleId: 'media_storage', name: 'Media Storage Vault', category: 'Platform Operations', icon: '🗄️' },
        { moduleId: 'feedback', name: 'Feedback & Suggestions', category: 'Platform Operations', icon: '💌' }
      ];
    }

    return manifests.map(m => {
      const mid = m.moduleId || m.id;
      return {
        id: mid,
        name: m.name || m.title || mid,
        category: m.category || 'Platform Modules',
        icon: m.icon || '📦',
        description: m.description || '',
        isGloballyDisabled: FeatureProvisioningEngine.isModuleGloballyDisabled ? FeatureProvisioningEngine.isModuleGloballyDisabled(mid) : false
      };
    });
  }, []);

  // Group modules by system category
  const categorizedModules = useMemo(() => {
    const groups = {};
    allPlatformModules.forEach(m => {
      const cat = m.category || 'GENERAL';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(m);
    });
    return groups;
  }, [allPlatformModules]);

  const togglePlanModule = (moduleId) => {
    if (!setAdminPlanForm) return;
    const current = Array.isArray(adminPlanForm?.includedModules) ? adminPlanForm.includedModules : [];
    const updated = current.includes(moduleId)
      ? current.filter(id => id !== moduleId)
      : [...current, moduleId];
    setAdminPlanForm({ ...adminPlanForm, includedModules: updated });
  };

  const selectAllActiveModules = () => {
    if (!setAdminPlanForm) return;
    const activeIds = allPlatformModules
      .filter(m => !m.isGloballyDisabled)
      .map(m => m.id);
    setAdminPlanForm({ ...adminPlanForm, includedModules: activeIds });
  };

  const deselectAllModules = () => {
    if (!setAdminPlanForm) return;
    setAdminPlanForm({ ...adminPlanForm, includedModules: [] });
  };

  // ── Dynamic Super Admin Telemetry & Custom Metric Cards ──
  const [allCards, setAllCards] = useState(() => superAdminService.getAllAvailableCards());
  const [activeCardIds, setActiveCardIds] = useState(() => superAdminService.getActiveCardIds());
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);
  const [customModalTab, setCustomModalTab] = useState('visibility'); // 'visibility' | 'add_card'
  const [companySourceFilter, setCompanySourceFilter] = useState('ALL'); // 'ALL' | 'GHL' | 'DIRECT'

  const [newCardForm, setNewCardForm] = useState({
    label: '',
    customValue: '',
    category: 'Custom',
    icon: 'Sparkles',
    color: '#0d9488',
    targetTab: 'system_users'
  });

  // Manage & Extend Validity Modal States
  const [selectedCompanyForExtend, setSelectedCompanyForExtend] = useState(null);
  const [extendDaysInput, setExtendDaysInput] = useState(7);
  const [extendCustomDate, setExtendCustomDate] = useState('');
  const [extendStatus, setExtendStatus] = useState('trial');
  const [isExtending, setIsExtending] = useState(false);

  const handleExtendCompanyValidity = async () => {
    if (!selectedCompanyForExtend) return;
    setIsExtending(true);
    try {
      const tenantId = selectedCompanyForExtend.tenant_id || selectedCompanyForExtend.id;
      const res = await SubscriptionEngine.extendSubscription({
        tenantId,
        additionalDays: extendDaysInput,
        newExpiryDate: extendCustomDate ? new Date(extendCustomDate).toISOString() : null,
        status: extendStatus
      });

      if (res.success) {
        if (typeof showToast === 'function') {
          showToast(`Validity extended until ${new Date(res.newExpiryDate).toLocaleDateString('en-IN')} for ${selectedCompanyForExtend.company_name}!`, 'success');
        }
        selectedCompanyForExtend.subscription_expiry = res.newExpiryDate;
        selectedCompanyForExtend.subscription_status = res.status;
        if (typeof fetchSuperadminCompanies === 'function') {
          fetchSuperadminCompanies();
        }
        setSelectedCompanyForExtend(null);
      } else {
        if (typeof showToast === 'function') showToast(res.error || 'Failed to extend validity', 'error');
      }
    } catch (e) {
      if (typeof showToast === 'function') showToast(e.message || 'Extension error', 'error');
    } finally {
      setIsExtending(false);
    }
  };

  const [telemetry, setTelemetry] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    pendingApprovalsCount: 0,
    paidSubsCount: 0,
    companiesCount: superadminCompanies?.length || 0,
    totalUsersCount: superadminUsers?.length || 0,
    modulesCount: 22,
    adminsCount: superadminMetrics?.admins || 0,
    employeesCount: superadminMetrics?.employees || 0,
    branchesCount: superadminMetrics?.branches || 0
  });

  useEffect(() => {
    let isMounted = true;
    const fetchTelemetry = async () => {
      try {
        const [invoices, pending] = await Promise.all([
          SubscriptionEngine.fetchAllInvoices().catch(() => []),
          SubscriptionEngine.fetchPendingApprovals().catch(() => [])
        ]);

        let revSum = 0;
        let paidCount = 0;
        (invoices || []).forEach(inv => {
          if (inv.status === 'paid' || inv.status === 'verified') {
            revSum += Number(inv.grand_total || inv.grandTotal || inv.amount_paid || 0);
            paidCount++;
          }
        });

        let expSum = 0;
        try {
          const res = await fetch(`${API_URL || ''}/api/expenses`).catch(() => null);
          if (res && res.ok) {
            const data = await res.json();
            const list = Array.isArray(data) ? data : (data.expenses || []);
            list.forEach(e => {
              if (e.status === 'approved' || e.status === 'paid') {
                expSum += Number(e.amount || 0);
              }
            });
          }
        } catch (_) {}

        if (isMounted) {
          setTelemetry(prev => ({
            ...prev,
            totalRevenue: revSum,
            totalExpenses: expSum,
            pendingApprovalsCount: (pending || []).length,
            paidSubsCount: paidCount,
            companiesCount: superadminCompanies?.length || prev.companiesCount,
            totalUsersCount: superadminUsers?.length || prev.totalUsersCount
          }));
        }
      } catch (e) {
        console.warn('Telemetry load failed:', e);
      }
    };

    fetchTelemetry();
    return () => { isMounted = false; };
  }, [superadminCompanies, superadminUsers, API_URL]);

  const handleToggleCard = (cardId) => {
    let updated;
    if (activeCardIds.includes(cardId)) {
      if (activeCardIds.length <= 1) {
        showToast && showToast('At least 1 metric card must remain active.', 'warning');
        return;
      }
      updated = activeCardIds.filter(id => id !== cardId);
    } else {
      updated = [...activeCardIds, cardId];
    }
    setActiveCardIds(updated);
    superAdminService.setActiveCardIds(updated);
  };

  const handleCreateCustomCard = (e) => {
    e.preventDefault();
    if (!newCardForm.label.trim()) {
      showToast && showToast('Please enter a card title.', 'warning');
      return;
    }
    const created = superAdminService.addCustomCard(newCardForm);
    if (created) {
      setAllCards(superAdminService.getAllAvailableCards());
      setActiveCardIds(superAdminService.getActiveCardIds());
      setNewCardForm({
        label: '',
        customValue: '',
        category: 'Custom',
        icon: 'Sparkles',
        color: '#0d9488',
        targetTab: 'system_users'
      });
      showToast && showToast(`Card "${created.label}" created and added!`, 'success');
      setCustomModalTab('visibility');
    }
  };

  const handleResetCards = () => {
    const defaults = superAdminService.resetToDefaults();
    setActiveCardIds(defaults);
    setAllCards(superAdminService.getAllAvailableCards());
    showToast && showToast('Metric cards reset to system defaults!', 'info');
  };

  const renderCardIcon = (iconName, size = 18, color = '#0d9488') => {
    switch (iconName) {
      case 'DollarSign': return <DollarSign size={size} style={{ color }} />;
      case 'TrendingDown': return <TrendingDown size={size} style={{ color }} />;
      case 'TrendingUp': return <TrendingUp size={size} style={{ color }} />;
      case 'Clock': return <Clock size={size} style={{ color }} />;
      case 'Briefcase': return <Briefcase size={size} style={{ color }} />;
      case 'Users': return <Users size={size} style={{ color }} />;
      case 'ShieldCheck': return <ShieldCheck size={size} style={{ color }} />;
      case 'Layers': return <Layers size={size} style={{ color }} />;
      case 'Shield': return <Shield size={size} style={{ color }} />;
      case 'UserCheck': return <UserCheck size={size} style={{ color }} />;
      case 'Globe': return <Globe size={size} style={{ color }} />;
      default: return <Sparkles size={size} style={{ color }} />;
    }
  };

  return (
    <div className="superadmin-plans-panel glass-panel">

      {/* Dynamic Telemetry Header Bar with Customize Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f2b26', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            👑 Platform Telemetry &amp; Financial Overview
          </span>
          <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px', background: '#f0fdfa', color: '#0d9488', border: '1px solid #ccfbf1' }}>
            {activeCardIds.length} Active Metrics
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsCustomizeModalOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            color: '#334155',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            transition: 'all 0.15s ease'
          }}
          title="Customize visible KPI metric cards or add a custom card"
        >
          <SettingsIcon size={14} style={{ color: '#0d9488' }} />
          <span>⚙️ Customize Cards</span>
        </button>
      </div>

      {/* Dynamic Metric KPI Cards Row */}
      <div className="superadmin-metrics-row">
        {allCards
          .filter(c => activeCardIds.includes(c.id))
          .map(card => {
            const cardValue = superAdminService.computeCardValue(card, telemetry);
            return (
              <div
                key={card.id}
                className="superadmin-metric-card"
                onClick={() => {
                  if (card.targetTab && setSuperadminSubTab) {
                    setSuperadminSubTab(card.targetTab);
                  }
                }}
                style={{
                  '--card-accent': card.color || '#0d9488',
                  cursor: card.targetTab ? 'pointer' : 'default'
                }}
                title={card.description || `Click to view ${card.label}`}
              >
                <div className="superadmin-metric-info">
                  <span className="superadmin-metric-title">{card.label}</span>
                  <span className="superadmin-metric-value" style={{ color: card.color }}>
                    {cardValue}
                  </span>
                </div>
                <div
                  className="superadmin-metric-icon-box"
                  style={{
                    background: card.bgLight || 'rgba(13, 148, 136, 0.15)',
                    color: card.color || '#0d9488'
                  }}
                >
                  {renderCardIcon(card.icon, 18, card.color || '#0d9488')}
                </div>
              </div>
            );
          })}
      </div>

      {/* Sub-Tabs Bar with Smooth Mouse Wheel & Drag Scrolling */}
      <div 
        className="superadmin-subtabs-row"
        onWheel={(e) => {
          if (e.deltaY !== 0) {
            e.currentTarget.scrollLeft += e.deltaY;
          }
        }}
        onMouseDown={(e) => {
          const slider = e.currentTarget;
          slider.isMouseDown = true;
          slider.startX = e.pageX - slider.offsetLeft;
          slider.scrollLeftStart = slider.scrollLeft;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.isMouseDown = false;
        }}
        onMouseUp={(e) => {
          e.currentTarget.isMouseDown = false;
        }}
        onMouseMove={(e) => {
          const slider = e.currentTarget;
          if (!slider.isMouseDown) return;
          e.preventDefault();
          const x = e.pageX - slider.offsetLeft;
          const walk = (x - slider.startX) * 1.5;
          slider.scrollLeft = slider.scrollLeftStart - walk;
        }}
        style={{
          cursor: 'grab',
          userSelect: 'none'
        }}
      >
        <button
          onClick={() => setSuperadminSubTab && setSuperadminSubTab('system_users')}
          className={`superadmin-tab-btn ${superadminSubTab === 'system_users' ? 'active' : ''}`}
        >
          System Users
        </button>
        <button
          onClick={() => setSuperadminSubTab && setSuperadminSubTab('manage_companies')}
          className={`superadmin-tab-btn ${superadminSubTab === 'manage_companies' ? 'active' : ''}`}
        >
          Manage Companies
        </button>
        <button
          onClick={() => setSuperadminSubTab && setSuperadminSubTab('module_provisioning')}
          className={`superadmin-tab-btn ${superadminSubTab === 'module_provisioning' ? 'active' : ''}`}
        >
          🎛️ Module Provisioning
        </button>
        <button
          onClick={() => setSuperadminSubTab && setSuperadminSubTab('model_studio')}
          className={`superadmin-tab-btn ${superadminSubTab === 'model_studio' ? 'active' : ''}`}
        >
          🎛️ Model Studio
        </button>
        <button
          onClick={() => setSuperadminSubTab && setSuperadminSubTab('manage_plans')}
          className={`superadmin-tab-btn ${superadminSubTab === 'manage_plans' ? 'active' : ''}`}
        >
          💎 Manage Plans & Pricing
        </button>
        <button
          onClick={() => setSuperadminSubTab && setSuperadminSubTab('audit_logs')}
          className={`superadmin-tab-btn ${superadminSubTab === 'audit_logs' ? 'active' : ''}`}
        >
          Audit Logs
        </button>
        <button
          onClick={() => setSuperadminSubTab && setSuperadminSubTab('kyc_compliance')}
          className={`superadmin-tab-btn ${superadminSubTab === 'kyc_compliance' ? 'active' : ''}`}
        >
          📋 KYC & Compliance
        </button>
        <button
          onClick={() => setSuperadminSubTab && setSuperadminSubTab('telephony_pbx')}
          className={`superadmin-tab-btn ${superadminSubTab === 'telephony_pbx' ? 'active' : ''}`}
        >
          📞 Cloud PBX & Telephony
        </button>
        <button
          onClick={() => setSuperadminSubTab && setSuperadminSubTab('subscription_hub')}
          className={`superadmin-tab-btn ${superadminSubTab === 'subscription_hub' ? 'active' : ''}`}
        >
          💳 Subscription Approvals & Billing
        </button>
        <button
          onClick={() => setSuperadminSubTab && setSuperadminSubTab('feedback_hub')}
          className={`superadmin-tab-btn ${superadminSubTab === 'feedback_hub' ? 'active' : ''}`}
        >
          💬 Company & User Feedback
        </button>
        <button
          onClick={() => setSuperadminSubTab && setSuperadminSubTab('login_branding')}
          className={`superadmin-tab-btn ${superadminSubTab === 'login_branding' ? 'active' : ''}`}
        >
          🎨 Login Page Studio
        </button>
      </div>

      {/* Sub-Tab 1: System Users */}
      {superadminSubTab === 'system_users' && (
        <div className="superadmin-panel-container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f2b26', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={20} style={{ color: '#0d9488' }} /> System Users
              </h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                Manage all users across the system. You can elevate anyone to Super Admin.
              </p>
            </div>
            <div className="superadmin-search-wrapper" style={{ position: 'relative', width: '250px' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search..."
                value={superadminUsersQuery}
                onChange={(e) => {
                  if (setSuperadminUsersQuery) setSuperadminUsersQuery(e.target.value);
                  if (fetchSuperadminUsers) fetchSuperadminUsers(e.target.value);
                }}
                style={{ width: '100%', padding: '7px 55px 7px 34px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
              />
              <span className="mobile-hide-shortcut" style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', fontWeight: '700', color: '#94a3b8', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '1px 5px', pointerEvents: 'none' }}>Ctrl+K</span>
            </div>
          </div>

          {/* System Users Table */}
          <DataTable
            columns={[
              {
                header: 'Name ⇅',
                accessor: 'name',
                render: (u) => {
                  const initials = (u.name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #0d9488, #0f766e)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: '700',
                        flexShrink: 0,
                        boxShadow: '0 2px 4px rgba(13, 148, 136, 0.2)'
                      }}>
                        {initials}
                      </div>
                      <span style={{ fontWeight: '600', color: '#0f2b26', fontSize: '13px' }}>{u.name}</span>
                    </div>
                  );
                }
              },
              {
                header: 'Email ⇅',
                accessor: 'email',
                render: (u) => <span style={{ color: '#64748b', fontSize: '13px' }}>{u.email}</span>
              },
              {
                header: 'Role ⇅',
                accessor: 'role',
                render: (u) => {
                  const isSuper = u.role === 'superadmin';
                  const isOwner = u.role === 'owner';
                  const isManager = u.role === 'manager';
                  
                  let bg = '#f8fafc';
                  let border = '#cbd5e1';
                  let text = '#475569';

                  if (isSuper) {
                    bg = '#ccfbf1';
                    border = '#99f6e4';
                    text = '#0f766e';
                  } else if (isOwner) {
                    bg = '#eff6ff';
                    border = '#bfdbfe';
                    text = '#1d4ed8';
                  } else if (isManager) {
                    bg = '#fffbeb';
                    border = '#fde68a';
                    text = '#b45309';
                  }

                  return (
                    <select
                      value={u.role}
                      onChange={(e) => handleElevateUserRole && handleElevateUserRole(u.id, e.target.value)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '99px',
                        border: `1px solid ${border}`,
                        background: bg,
                        color: text,
                        fontWeight: '600',
                        fontSize: '12px',
                        cursor: 'pointer',
                        outline: 'none'
                      }}
                    >
                      <option value="superadmin">Super Admin</option>
                      <option value="owner">Company Owner</option>
                      <option value="manager">Operations Manager</option>
                      <option value="employee">Employee / Agent</option>
                    </select>
                  );
                }
              },
              {
                header: 'Actions ⇅',
                accessor: 'id',
                headerStyle: { textAlign: 'right' },
                cellStyle: { textAlign: 'right' },
                render: (u) => (
                  <button
                    onClick={() => handleDeleteUserAccount && handleDeleteUserAccount(u.id)}
                    style={{
                      background: '#fef2f2',
                      border: '1px solid #fee2e2',
                      color: '#ef4444',
                      cursor: 'pointer',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease'
                    }}
                    title="Delete User Account"
                  >
                    <Trash2 size={15} />
                  </button>
                )
              }
            ]}
            data={superadminUsers}
            emptyMessage="No system users found."
          />

        </div>
      )}

      {/* Sub-Tab 2: Manage Companies */}
      {superadminSubTab === 'manage_companies' && (
        <div className="superadmin-panel-container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f2b26', marginBottom: '4px' }}>
                🏢 Registered Tenant Companies
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                Overview of all registered organizations, user seats, and subscription statuses.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <select
                value={companySourceFilter}
                onChange={(e) => setCompanySourceFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  color: '#334155',
                  background: '#ffffff',
                  cursor: 'pointer',
                  outline: 'none',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                }}
              >
                <option value="ALL">🌐 All Sources ({superadminCompanies?.length || 0})</option>
                <option value="GHL">⚡ GoHighLevel Only ({superadminCompanies?.filter(c => c.source === 'gohighlevel' || c.locationId || c.tenant_id?.startsWith('ghl_') || c.tenant_id?.startsWith('org_loc_')).length || 0})</option>
                <option value="DIRECT">🏢 Direct Signups ({superadminCompanies?.filter(c => c.source !== 'gohighlevel' && !c.locationId && !c.tenant_id?.startsWith('ghl_') && !c.tenant_id?.startsWith('org_loc_')).length || 0})</option>
              </select>

              <div className="superadmin-search-wrapper" style={{ position: 'relative', width: '250px' }}>
                <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search company, ID or GHL..."
                  value={superadminCompaniesQuery}
                  onChange={(e) => setSuperadminCompaniesQuery && setSuperadminCompaniesQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                    background: '#ffffff',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                  }}
                />
              </div>
            </div>
          </div>

          <DataTable
            columns={[
              {
                header: 'Tenant ID ⇅',
                accessor: 'tenant_id',
                render: (c) => {
                  let displayCode = c.tenant_slug || c.formattedTenantId;
                  if (!displayCode) {
                    if (c.tenant_id === 'org_rahulchopra_Fe5RYKkj' || c.tenant_id === '1' || c.tenant_id === 1) {
                      displayCode = 'TEN-0001-RAHUL-CHOPRA';
                    } else if (c.tenant_id === 'org_rahulchopra_TWxOVrAM' || c.tenant_id === '2' || c.tenant_id === 2) {
                      displayCode = 'TEN-0002-RAHUL-CHOPRA';
                    } else if (c.tenant_id === '999' || c.tenant_id === 999) {
                      displayCode = 'TEN-0999-SANDBOX-DEMO';
                    } else if (typeof c.tenant_id === 'string' && c.tenant_id.startsWith('TEN-')) {
                      displayCode = c.tenant_id;
                    } else {
                      const cleanName = String(c.company_name || 'ORG').toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 18);
                      displayCode = `TEN-${String(c.tenant_id || '0001').padStart(4, '0').slice(-4)}-${cleanName}`;
                    }
                  }
                  return (
                    <span style={{ fontFamily: 'monospace', background: 'rgba(13, 148, 136, 0.08)', border: '1px solid rgba(13, 148, 136, 0.25)', padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: '800', color: '#0f766e', letterSpacing: '0.3px', whiteSpace: 'nowrap' }}>
                      #{displayCode}
                    </span>
                  );
                }
              },
              {
                header: 'Company Name ⇅',
                accessor: 'company_name',
                render: (c) => {
                  const initials = c.company_name ? c.company_name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase() : 'CO';
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #0d9488, #0f766e)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: '700',
                        flexShrink: 0
                      }}>
                        {initials}
                      </div>
                      <span style={{ fontWeight: '700', color: '#0d9488', fontSize: '13px' }}>{c.company_name}</span>
                    </div>
                  );
                }
              },
              {
                header: 'Source / Platform ⇅',
                accessor: 'source',
                render: (c) => {
                  const isGhl = c.source === 'gohighlevel' || Boolean(c.locationId) || c.tenant_id?.startsWith('ghl_') || c.tenant_id?.startsWith('org_loc_');
                  if (isGhl) {
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '3px 10px',
                          borderRadius: '12px',
                          background: 'rgba(6, 182, 212, 0.12)',
                          border: '1px solid rgba(6, 182, 212, 0.35)',
                          color: '#0891b2',
                          fontWeight: '800',
                          fontSize: '11px',
                          width: 'fit-content'
                        }}>
                          <span>⚡ GoHighLevel</span>
                        </span>
                        {c.locationId && (
                          <span style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>
                            Loc: {c.locationId.length > 14 ? `${c.locationId.substring(0, 12)}...` : c.locationId}
                          </span>
                        )}
                      </div>
                    );
                  }
                  return (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      color: '#475569',
                      fontWeight: '700',
                      fontSize: '11px',
                      width: 'fit-content'
                    }}>
                      <span>🌐 Direct / Portal</span>
                    </span>
                  );
                }
              },
              {
                header: 'Total Users ⇅',
                accessor: 'user_count',
                render: (c) => <span style={{ fontWeight: '600', color: '#334155' }}>{c.user_count}</span>
              },
              {
                header: 'Employees ⇅',
                accessor: 'emp_count',
                render: (c) => <span style={{ fontWeight: '600', color: '#334155' }}>{c.emp_count}</span>
              },
              {
                header: 'Plan & Expiry ⇅',
                accessor: 'subscription_expiry',
                render: (c) => {
                  const now = Date.now();
                  const expiry = c.subscription_expiry ? new Date(c.subscription_expiry).getTime() : null;
                  const isTrial = Boolean(c.is_trial || c.plan_id === 'trial' || c.subscription_status === 'trial' || c.plan_name?.toLowerCase().includes('trial'));
                  const isExpired = c.subscription_status === 'expired' || (expiry && expiry < now);

                  let daysLeft = null;
                  if (expiry) {
                    daysLeft = Math.ceil((expiry - now) / 86400000);
                  }

                  const planTitle = c.plan_name || (isTrial ? `Free Trial (${c.trial_days || 7}d)` : (c.plan_id ? c.plan_id.toUpperCase() : 'Standard'));

                  if (isExpired) {
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: '#fef2f2',
                          border: '1px solid #fecaca',
                          color: '#dc2626',
                          fontWeight: '800',
                          fontSize: '11px',
                          width: 'fit-content'
                        }}>
                          <span>⛔ Expired</span>
                          <span>•</span>
                          <span style={{ fontWeight: '600' }}>{planTitle}</span>
                        </span>
                        {expiry && (
                          <span style={{ fontSize: '10.5px', color: '#ef4444', fontWeight: '600' }}>
                            Ended {new Date(expiry).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                    );
                  }

                  if (isTrial) {
                    const isUrgent = daysLeft !== null && daysLeft <= 2;
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: isUrgent ? '#fffbeb' : '#f0fdf4',
                          border: isUrgent ? '1px solid #fde68a' : '1px solid #bbf7d0',
                          color: isUrgent ? '#b45309' : '#15803d',
                          fontWeight: '800',
                          fontSize: '11px',
                          width: 'fit-content'
                        }}>
                          <span>⏳ {planTitle}</span>
                          {daysLeft !== null && (
                            <>
                              <span>•</span>
                              <span style={{ fontWeight: '800' }}>
                                {daysLeft > 0 ? `${daysLeft}d left` : 'Last day!'}
                              </span>
                            </>
                          )}
                        </span>
                        {expiry && (
                          <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '500' }}>
                            Till {new Date(expiry).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                    );
                  }

                  if (expiry) {
                    const isExpiringSoon = daysLeft !== null && daysLeft <= 5;
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: isExpiringSoon ? '#fffbeb' : 'rgba(20, 210, 203, 0.12)',
                          border: isExpiringSoon ? '1px solid #fde68a' : '1px solid rgba(20, 210, 203, 0.4)',
                          color: isExpiringSoon ? '#b45309' : '#0f766e',
                          fontWeight: '800',
                          fontSize: '11px',
                          width: 'fit-content'
                        }}>
                          <span>💎 {planTitle}</span>
                          {daysLeft !== null && (
                            <>
                              <span>•</span>
                              <span style={{ fontWeight: '800' }}>
                                {daysLeft > 0 ? `${daysLeft}d left` : 'Expiring today'}
                              </span>
                            </>
                          )}
                        </span>
                        <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '500' }}>
                          Till {new Date(expiry).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        color: '#475569',
                        fontWeight: '700',
                        fontSize: '11px',
                        width: 'fit-content'
                      }}>
                        <span>♾️ {planTitle || 'Lifetime Access'}</span>
                      </span>
                      <span style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: '500' }}>
                        No Expiry Set
                      </span>
                    </div>
                  );
                }
              },
              {
                header: 'Status ⇅',
                accessor: 'status',
                render: (c) => {
                  const now = Date.now();
                  const expiry = c.subscription_expiry ? new Date(c.subscription_expiry).getTime() : null;
                  const isExpired = c.subscription_status === 'expired' || (expiry && expiry < now);
                  const isTrial = Boolean(c.is_trial || c.plan_id === 'trial' || c.subscription_status === 'trial');

                  if (isExpired) {
                    return (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '99px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontWeight: '700', fontSize: '11px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 6px #ef4444' }}></span>
                        Expired / Locked
                      </span>
                    );
                  }

                  if (isTrial) {
                    return (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '99px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', fontWeight: '700', fontSize: '11px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 6px #3b82f6' }}></span>
                        Active Trial
                      </span>
                    );
                  }

                  return (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '99px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', fontWeight: '700', fontSize: '11px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }}></span>
                      Active Paid
                    </span>
                  );
                }
              },
              {
                header: 'Actions ⇅',
                accessor: 'actions',
                render: (c) => (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setSuperadminSubTab && setSuperadminSubTab('module_provisioning')}
                      title={`Provision Modules for ${c.company_name || c.tenant_id}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '5px 10px',
                        borderRadius: '6px',
                        background: 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid rgba(59, 130, 246, 0.25)',
                        color: '#2563eb',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.background = '#2563eb'; e.currentTarget.style.color = '#ffffff'; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'; e.currentTarget.style.color = '#2563eb'; }}
                    >
                      <Sliders size={12} />
                      <span>🎛️ Modules</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCompanyForExtend(c);
                        setExtendStatus(c.subscription_status === 'trial' ? 'trial' : 'active');
                        setExtendDaysInput(7);
                        setExtendCustomDate('');
                      }}
                      title={`Extend Validity / Subscription for ${c.company_name || c.tenant_id}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '5px 10px',
                        borderRadius: '6px',
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        color: '#059669',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.background = '#059669'; e.currentTarget.style.color = '#ffffff'; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'; e.currentTarget.style.color = '#059669'; }}
                    >
                      <Calendar size={12} />
                      <span>📅 Extend Plan</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleEnterCompany && handleEnterCompany(c)}
                      title={`Switch to ${c.company_name || c.tenant_id} Workspace (GHL Impersonation)`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '5px 12px',
                        borderRadius: '6px',
                        background: 'linear-gradient(135deg, rgba(20, 210, 203, 0.15) 0%, rgba(13, 148, 136, 0.2) 100%)',
                        border: '1px solid #14d2cb',
                        color: '#0d9488',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.background = '#0d9488'; e.currentTarget.style.color = '#ffffff'; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(20, 210, 203, 0.15) 0%, rgba(13, 148, 136, 0.2) 100%)'; e.currentTarget.style.color = '#0d9488'; }}
                    >
                      <span>🚀 Enter Workspace</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteCompany && handleDeleteCompany(c.tenant_id || c.id)}
                      title="Delete Company & Move to Recycle Bin"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '30px',
                        height: '30px',
                        borderRadius: '6px',
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        color: '#ef4444',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#ffffff'; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'; e.currentTarget.style.color = '#ef4444'; }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )
              }
            ]}
            data={(superadminCompanies || []).filter(c => {
              const isGhl = c.source === 'gohighlevel' || Boolean(c.locationId) || c.tenant_id?.startsWith('ghl_') || c.tenant_id?.startsWith('org_loc_');
              if (companySourceFilter === 'GHL' && !isGhl) return false;
              if (companySourceFilter === 'DIRECT' && isGhl) return false;

              if (!superadminCompaniesQuery || !superadminCompaniesQuery.trim()) return true;
              const q = superadminCompaniesQuery.toLowerCase();
              return (
                (c.company_name && c.company_name.toLowerCase().includes(q)) ||
                (c.tenant_id && String(c.tenant_id).toLowerCase().includes(q)) ||
                (c.formattedTenantId && String(c.formattedTenantId).toLowerCase().includes(q)) ||
                (c.locationId && String(c.locationId).toLowerCase().includes(q)) ||
                (c.plan_name && String(c.plan_name).toLowerCase().includes(q)) ||
                (c.plan_id && String(c.plan_id).toLowerCase().includes(q)) ||
                (c.subscription_status && String(c.subscription_status).toLowerCase().includes(q))
              );
            })}
            emptyMessage="No registered tenant companies found."
          />

          {/* Extend / Manage Validity Modal */}
          {selectedCompanyForExtend && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(6px)',
              zIndex: 99999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px'
            }}>
              <div style={{
                background: '#ffffff',
                borderRadius: '16px',
                maxWidth: '520px',
                width: '100%',
                padding: '24px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
                border: '1px solid #e2e8f0',
                position: 'relative'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669', fontSize: '18px' }}>
                      📅
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f2b26' }}>
                        Extend Validity & Access
                      </h4>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>
                        {selectedCompanyForExtend.company_name} (#{selectedCompanyForExtend.tenant_id})
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCompanyForExtend(null)}
                    style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
                  >
                    ✕
                  </button>
                </div>

                {/* Current Status Info */}
                <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block' }}>Current Status:</span>
                    <strong style={{ color: selectedCompanyForExtend.subscription_status === 'expired' ? '#ef4444' : '#059669', textTransform: 'uppercase' }}>
                      {selectedCompanyForExtend.subscription_status || 'Active'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block' }}>Current Expiry:</span>
                    <strong style={{ color: '#0f172a' }}>
                      {selectedCompanyForExtend.subscription_expiry ? new Date(selectedCompanyForExtend.subscription_expiry).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not set'}
                    </strong>
                  </div>
                </div>

                {/* Quick Extension Presets */}
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
                  ⚡ Quick Extension Presets:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '16px' }}>
                  {[
                    { label: '+7 Days (Free Trial)', days: 7, status: 'trial' },
                    { label: '+14 Days (Extended Trial)', days: 14, status: 'trial' },
                    { label: '+30 Days (1 Month Active)', days: 30, status: 'active' },
                    { label: '+365 Days (1 Year Active)', days: 365, status: 'active' }
                  ].map(preset => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setExtendDaysInput(preset.days);
                        setExtendStatus(preset.status);
                        setExtendCustomDate('');
                      }}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: extendDaysInput === preset.days && !extendCustomDate ? '2px solid #0d9488' : '1px solid #cbd5e1',
                        background: extendDaysInput === preset.days && !extendCustomDate ? '#f0fdfa' : '#ffffff',
                        color: extendDaysInput === preset.days && !extendCustomDate ? '#0f766e' : '#334155',
                        fontWeight: '700',
                        fontSize: '12px',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Custom Expiry Date */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    📅 Or Set Specific Custom Expiry Date:
                  </label>
                  <input
                    type="date"
                    value={extendCustomDate}
                    onChange={(e) => {
                      setExtendCustomDate(e.target.value);
                      setExtendDaysInput(null);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Target Status Selector */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Workspace Status after Update:
                  </label>
                  <select
                    value={extendStatus}
                    onChange={(e) => setExtendStatus(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none',
                      background: '#ffffff',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="trial">⏳ Free Trial (7-Day Rules Apply)</option>
                    <option value="active">✅ Active Paid Subscription</option>
                  </select>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedCompanyForExtend(null)}
                    style={{
                      padding: '9px 16px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#475569',
                      fontSize: '13px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExtendCompanyValidity}
                    disabled={isExtending}
                    style={{
                      padding: '9px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)'
                    }}
                  >
                    {isExtending ? 'Saving...' : '💾 Save & Extend Validity'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sub-Tab 3: Unified Master Plans & Modular Pricing Studio */}
      {superadminSubTab === 'manage_plans' && (
        <div className="superadmin-panel-container">
          <SuperAdminMasterPlansHub showToast={showToast} />
        </div>
      )}

      {/* Sub-Tab 4: Audit Logs */}
      {superadminSubTab === 'audit_logs' && (
        <div className="superadmin-panel-container">
          <div className="superadmin-tab-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px', gap: '16px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f2b26', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={20} style={{ color: '#0d9488' }} /> System Audit Logs Registry
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                Chronological security logs tracking user role elevations, plan modifications, and authentication events.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', width: '100%', maxWidth: '400px' }}>
              <div className="superadmin-search-wrapper" style={{ position: 'relative', flex: '1 1 180px' }}>
                <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search audit logs..."
                  value={auditLogsQuery}
                  onChange={(e) => setAuditLogsQuery && setAuditLogsQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                    background: '#ffffff',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                  }}
                />
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  if (setAuditLogs) setAuditLogs([]);
                  if (showToast) showToast('Audit registry logs cleared successfully.', 'success');
                }}
                style={{ padding: '8px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
              >
                🧹 Clear Log Registry
              </button>
            </div>
          </div>

          <DataTable
            columns={[
              {
                header: 'Timestamp ⇅',
                accessor: 'time',
                render: (log) => <span style={{ fontWeight: '700', color: '#64748b', fontFamily: 'monospace', fontSize: '12px' }}>{log.time}</span>
              },
              {
                header: 'User / Account ⇅',
                accessor: 'user',
                render: (log) => <span style={{ fontWeight: '600', color: '#0f2b26' }}>{log.user}</span>
              },
              {
                header: 'System Activity Event ⇅',
                accessor: 'action',
                render: (log) => <span style={{ color: '#334155' }}>{log.action}</span>
              },
              {
                header: 'Security Role ⇅',
                accessor: 'role',
                render: (log) => (
                  <span style={{
                    fontSize: '10px',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontWeight: '800',
                    background: log.role === 'superadmin' ? '#fef2f2' : log.role === 'owner' ? '#def7ec' : '#e0f2fe',
                    color: log.role === 'superadmin' ? '#ef4444' : log.role === 'owner' ? '#03543f' : '#0369a1'
                  }}>
                    {(log.role || '').toUpperCase()}
                  </span>
                )
              }
            ]}
            data={(auditLogs || []).filter(log => {
              if (!auditLogsQuery || !auditLogsQuery.trim()) return true;
              const q = auditLogsQuery.toLowerCase();
              return (
                (log.time && log.time.toLowerCase().includes(q)) ||
                (log.user && log.user.toLowerCase().includes(q)) ||
                (log.action && log.action.toLowerCase().includes(q)) ||
                (log.role && log.role.toLowerCase().includes(q))
              );
            })}
            emptyMessage="No security audit events recorded in this active session."
          />
        </div>
      )}

      {/* Sub-Tab: Module Provisioning Hub */}
      {superadminSubTab === 'module_provisioning' && (
        <SuperAdminModuleProvisioningHub
          superadminCompanies={superadminCompanies}
          showToast={showToast}
        />
      )}

      {/* Sub-Tab: Master Model Configuration Studio */}
      {superadminSubTab === 'model_studio' && (
        <SuperAdminModelStudio
          showToast={showToast}
          authUser={authUser}
        />
      )}

      {/* Sub-Tab 7: KYC & Compliance Hub */}
      {superadminSubTab === 'kyc_compliance' && (
        <div className="superadmin-panel-container">
          <SuperAdminKycHub showToast={showToast} />
        </div>
      )}

      {/* Sub-Tab 6: Cloud PBX & Telephony Control */}
      {superadminSubTab === 'telephony_pbx' && (
        <div className="superadmin-panel-container">
          <SuperAdminTelephonyHub showToast={showToast} />
        </div>
      )}

      {/* Sub-Tab: Multi-Tenant Subscription & Billing Hub */}
      {superadminSubTab === 'subscription_hub' && (
        <div className="superadmin-panel-container">
          <SuperAdminSubscriptionHub showToast={showToast} />
        </div>
      )}

      {/* Sub-Tab 8: Multi-Company Feedback & Suggestions Hub */}
      {superadminSubTab === 'feedback_hub' && (
        <div className="superadmin-panel-container">
          <SuperAdminFeedbackHub
            API_URL={API_URL}
            authUser={authUser}
            superadminCompanies={superadminCompanies}
            showToast={showToast}
          />
        </div>
      )}

      {/* Sub-Tab 9: OmniFlow Login Page Studio */}
      {superadminSubTab === 'login_branding' && (
        <div className="superadmin-panel-container">
          <SuperAdminLoginStudio
            authUser={authUser}
            showToast={showToast}
          />
        </div>
      )}

      {/* ── CUSTOMIZE KPI CARDS & ADD CUSTOM METRIC MODAL ── */}
      {isCustomizeModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #0d9488, #064e43)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff'
                }}>
                  <SettingsIcon size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0f2b26' }}>
                    Customize Super Admin Metric Cards
                  </h3>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Select visible cards, reorder them, or add new dynamic reporting cards.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomizeModalOpen(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '8px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Sub-Tabs */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid #e2e8f0',
              background: '#ffffff',
              padding: '0 24px'
            }}>
              <button
                type="button"
                onClick={() => setCustomModalTab('visibility')}
                style={{
                  padding: '12px 18px',
                  border: 'none',
                  background: 'transparent',
                  fontWeight: '700',
                  fontSize: '13px',
                  color: customModalTab === 'visibility' ? '#0d9488' : '#64748b',
                  borderBottom: customModalTab === 'visibility' ? '2px solid #0d9488' : '2px solid transparent',
                  cursor: 'pointer'
                }}
              >
                Active Cards ({activeCardIds.length})
              </button>
              <button
                type="button"
                onClick={() => setCustomModalTab('add_card')}
                style={{
                  padding: '12px 18px',
                  border: 'none',
                  background: 'transparent',
                  fontWeight: '700',
                  fontSize: '13px',
                  color: customModalTab === 'add_card' ? '#0d9488' : '#64748b',
                  borderBottom: customModalTab === 'add_card' ? '2px solid #0d9488' : '2px solid transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Plus size={14} />
                <span>Add Custom Metric Card</span>
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
              {customModalTab === 'visibility' ? (
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px' }}>
                    Toggle cards ON or OFF to control what appears in your top telemetry bar.
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {allCards.map(card => {
                      const isChecked = activeCardIds.includes(card.id);
                      return (
                        <div
                          key={card.id}
                          onClick={() => handleToggleCard(card.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 14px',
                            borderRadius: '10px',
                            border: isChecked ? '2px solid #0d9488' : '1px solid #e2e8f0',
                            background: isChecked ? '#f0fdfa' : '#ffffff',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              background: card.bgLight || 'rgba(13,148,136,0.1)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              {renderCardIcon(card.icon, 16, card.color)}
                            </div>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f2b26' }}>
                                {card.label}
                              </div>
                              <div style={{ fontSize: '11px', color: '#64748b' }}>
                                {card.category} • {card.isCustom ? 'Custom' : 'System'}
                              </div>
                            </div>
                          </div>

                          <div style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '6px',
                            background: isChecked ? '#0d9488' : '#e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff'
                          }}>
                            {isChecked && <Check size={14} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreateCustomCard}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                        Metric Card Title *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Server Uptime, Active Trials, VIP Clients"
                        value={newCardForm.label}
                        onChange={(e) => setNewCardForm({ ...newCardForm, label: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                          Display Value / Initial Number *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 99.9% or 15 or ₹12,500"
                          value={newCardForm.customValue}
                          onChange={(e) => setNewCardForm({ ...newCardForm, customValue: e.target.value })}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                          Accent Color Theme
                        </label>
                        <select
                          value={newCardForm.color}
                          onChange={(e) => setNewCardForm({
                            ...newCardForm,
                            color: e.target.value,
                            bgLight: e.target.value === '#0d9488' ? 'rgba(13,148,136,0.12)' :
                                     e.target.value === '#0284c7' ? 'rgba(2,132,199,0.12)' :
                                     e.target.value === '#8b5cf6' ? 'rgba(139,92,246,0.12)' :
                                     e.target.value === '#f59e0b' ? 'rgba(245,158,11,0.12)' :
                                     e.target.value === '#ef4444' ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)'
                          })}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#ffffff', boxSizing: 'border-box' }}
                        >
                          <option value="#0d9488">Teal (Primary)</option>
                          <option value="#0284c7">Sky Blue (Finance)</option>
                          <option value="#8b5cf6">Purple (Intelligence)</option>
                          <option value="#10b981">Green (Success)</option>
                          <option value="#f59e0b">Amber (Alert)</option>
                          <option value="#ef4444">Rose Red (Warning)</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                          Icon Symbol
                        </label>
                        <select
                          value={newCardForm.icon}
                          onChange={(e) => setNewCardForm({ ...newCardForm, icon: e.target.value })}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#ffffff', boxSizing: 'border-box' }}
                        >
                          <option value="Sparkles">✨ Sparkles</option>
                          <option value="DollarSign">💰 Dollar / Currency</option>
                          <option value="TrendingUp">📈 Growth Trend</option>
                          <option value="ShieldCheck">🛡️ Verified Shield</option>
                          <option value="Briefcase">💼 Briefcase</option>
                          <option value="Users">👥 Users</option>
                          <option value="Globe">🌐 Global</option>
                          <option value="Layers">📦 Modules</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                          Target Tab to Open on Click
                        </label>
                        <select
                          value={newCardForm.targetTab}
                          onChange={(e) => setNewCardForm({ ...newCardForm, targetTab: e.target.value })}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#ffffff', boxSizing: 'border-box' }}
                        >
                          <option value="subscription_hub">Subscription &amp; Billing</option>
                          <option value="manage_companies">Manage Companies</option>
                          <option value="system_users">System Users</option>
                          <option value="module_provisioning">Module Provisioning</option>
                          <option value="manage_plans">Manage Plans</option>
                          <option value="audit_logs">Audit Logs</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                      <button
                        type="submit"
                        style={{
                          padding: '10px 22px',
                          borderRadius: '8px',
                          border: 'none',
                          background: 'linear-gradient(135deg, #0d9488 0%, #064e43 100%)',
                          color: '#ffffff',
                          fontWeight: '700',
                          fontSize: '13px',
                          cursor: 'pointer'
                        }}
                      >
                        + Create &amp; Add Card
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <button
                type="button"
                onClick={handleResetCards}
                style={{
                  background: 'transparent',
                  border: '1px solid #cbd5e1',
                  color: '#64748b',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Reset to Factory Defaults
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsCustomizeModalOpen(false);
                  showToast && showToast('Metric cards preference saved!', 'success');
                }}
                style={{
                  background: '#0d9488',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 22px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
