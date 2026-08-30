import React, { useState, useEffect, useMemo } from 'react';
import { Search, CheckCircle2, XCircle, Sliders, Shield, Zap, Sparkles, Building2, RefreshCw, Eye, EyeOff, Save } from 'lucide-react';
import FeatureProvisioningEngine from '../../core/engines/FeatureProvisioningEngine';
import { PermissionEngine } from '../../core/engines/PermissionEngine/permissionEngine';

export default function SuperAdminModuleProvisioningHub({
  superadminCompanies = [],
  showToast = () => {}
}) {
  const [provisioningState, setProvisioningState] = useState(() => FeatureProvisioningEngine.getState());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedCompanyForModal, setSelectedCompanyForModal] = useState(null);
  const [companyModalState, setCompanyModalState] = useState({ disabled: [], enabled: [] });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    FeatureProvisioningEngine.syncFromCloud().then(st => {
      if (st) setProvisioningState(st);
    });

    const handleUpdate = (e) => {
      if (e.detail) setProvisioningState(e.detail);
    };

    window.addEventListener('omnilflow_provisioning_updated', handleUpdate);
    return () => window.removeEventListener('omnilflow_provisioning_updated', handleUpdate);
  }, []);

  const allModules = useMemo(() => {
    return [
      // DASHBOARDS
      { id: 'admin_dashboard', label: 'Company Overview', icon: '📊', category: 'DASHBOARDS', desc: 'Executive KPI metrics, staff statistics, and live company overview dashboard.' },
      { id: 'manager_dashboard', label: 'Task Analytics', icon: '📈', category: 'DASHBOARDS', desc: 'Department-level productivity tracking and workload metrics.' },
      { id: 'gps_attendance', label: 'Live Tracking Map', icon: '🌐', category: 'DASHBOARDS', desc: 'Real-time GPS route tracking & live geo-location pin map.' },

      // HR MANAGEMENT
      { id: 'employees', label: 'All Employees', icon: '👥', category: 'HR MANAGEMENT', desc: 'Staff directory, dynamic employee profiles, salary, and status.' },
      { id: 'recruitment_ats', label: 'Recruitment & ATS', icon: '🎯', category: 'HR MANAGEMENT', desc: 'Candidate pipeline, resume management, hiring stages, and job postings.' },
      { id: 'asset_management', label: 'Asset Management', icon: '💻', category: 'HR MANAGEMENT', desc: 'Company hardware, laptops, SIM cards, serial tags, and allocations.' },
      { id: 'verify_documents', label: 'Verify Documents', icon: '📋', category: 'HR MANAGEMENT', desc: 'Employee KYC verification, ID cards, education proofs, and approvals.' },
      { id: 'offboarding', label: 'Offboarding Exit', icon: '🚪', category: 'HR MANAGEMENT', desc: 'Employee resignation, clearance checklists, handover, and exit surveys.' },

      // PAYROLL & FINANCE
      { id: 'payroll', label: 'Payroll & Salary', icon: '💰', category: 'PAYROLL & FINANCE', desc: 'Monthly salary generation, deductions, bonuses, and pay slip downloads.' },
      { id: 'taxes_compliance', label: 'Taxes & Compliance', icon: '📄', category: 'PAYROLL & FINANCE', desc: 'Tax slabs, PF/ESI deductions, compliance records, and certificates.' },
      { id: 'ff_settlements', label: 'F&F Settlements', icon: '✅', category: 'PAYROLL & FINANCE', desc: 'Full & Final settlement calculations for relieved employees.' },
      { id: 'advances_loans', label: 'Advances & Loans', icon: '💳', category: 'PAYROLL & FINANCE', desc: 'Staff salary advance requests, EMI tracking, and approval workflow.' },
      { id: 'expenses', label: 'Expenses Claim', icon: '🧾', category: 'PAYROLL & FINANCE', desc: 'Travel & daily expense reimbursements with receipt upload and approval.' },

      // CRM & SALES
      { id: 'channels', label: 'WA Channels', icon: '📱', category: 'CRM & SALES', desc: 'Multi-device WhatsApp QR code bridge and session connectivity.' },
      { id: 'wa_live_web', label: 'Staff WhatsApp Live', icon: '💻', category: 'CRM & SALES', desc: 'Embedded WhatsApp Web interface for direct customer conversations.' },
      { id: 'kanban', label: 'CRM Pipeline Board', icon: '📈', category: 'CRM & SALES', desc: 'Drag-and-drop sales lead stages, deal values, and customer notes.' },
      { id: 'telecalling', label: 'Call Recordings & SIM Sync', icon: '📞', category: 'CRM & SALES', desc: 'Telecalling call logs, audio playback, dispositions, and SIM bridge.' },

      // OPERATIONS
      { id: 'tasks', label: 'Tasks Board', icon: '📋', category: 'OPERATIONS', desc: 'Team task delegation, priorities, due dates, and completion status.' },
      { id: 'office_kiosk', label: 'Office Kiosk Mode', icon: '🏢', category: 'OPERATIONS', desc: 'Tablet / Kiosk face-scan attendance mode for office entry gates.' },
      { id: 'notice_board', label: 'Notice Board', icon: '🔔', category: 'OPERATIONS', desc: 'Company announcements, circulars, and broadcast notices.' },
      { id: 'holidays', label: 'Holidays List', icon: '🏖️', category: 'OPERATIONS', desc: 'Annual festival calendar, national holidays, and regional day-offs.' },

      // MY PORTAL
      { id: 'my_attendance', label: 'Shift Attendance', icon: '⏱️', category: 'MY PORTAL', desc: 'Employee self check-in / check-out with selfie and geolocation.' },
      { id: 'leaves', label: 'Leaves Requests', icon: '🏖️', category: 'MY PORTAL', desc: 'Casual, sick, and earned leave balance application and manager approvals.' },
      { id: 'shifts', label: 'Work Roster', icon: '📅', category: 'MY PORTAL', desc: 'Monthly work shifts, weekly off schedules, and roster planner.' },

      // SETTINGS
      { id: 'settings', label: 'General Settings', icon: '👤', category: 'SETTINGS', desc: 'Company branding, logos, timezone, and general workspace configurations.' },
      { id: 'integrations', label: 'Integrations & Webhooks', icon: '🔌', category: 'SETTINGS', desc: 'Third-party API keys, webhook URLs, and GoHighLevel sync.' },
      { id: 'roles_permissions', label: 'Roles & Permissions', icon: '🔐', category: 'SETTINGS', desc: 'Granular RBAC matrix for Admin, Manager, HR, and Employee roles.' },
      { id: 'recycle_bin', label: 'Trash & Recycle Bin', icon: '🗑️', category: 'SETTINGS', desc: 'Trash vault for restoring soft-deleted records or permanent purge.' },
      { id: 'system_dropdowns', label: 'System Master Dropdowns', icon: '🏷️', category: 'SETTINGS', desc: 'Master dropdown values for departments, designations, and tags.' },
      { id: 'module_configuration', label: 'Module Configuration', icon: '🎛️', category: 'SETTINGS', desc: 'Custom fields, dynamic forms builder, and table column customizer.' },
      { id: 'billing', label: 'Subscription Billing', icon: '💳', category: 'SETTINGS', desc: 'SaaS plan upgrades, seat quotas, invoices, and payment gateways.' }
    ];
  }, []);

  const categories = useMemo(() => {
    return ['ALL', 'DASHBOARDS', 'HR MANAGEMENT', 'PAYROLL & FINANCE', 'CRM & SALES', 'OPERATIONS', 'MY PORTAL', 'SETTINGS'];
  }, []);

  const filteredModules = useMemo(() => {
    return allModules.filter(mod => {
      const matchCat = selectedCategory === 'ALL' || mod.category === selectedCategory;
      const matchSearch = !searchQuery.trim() ||
        mod.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mod.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mod.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [allModules, selectedCategory, searchQuery]);

  const globalDisabled = provisioningState.globalDisabledModules || [];

  const handleToggleGlobalModule = async (moduleId) => {
    const isCurrentlyDisabled = globalDisabled.includes(moduleId);
    const updated = await FeatureProvisioningEngine.setGlobalModuleStatus(moduleId, isCurrentlyDisabled);
    setProvisioningState({ ...updated });
    showToast(
      isCurrentlyDisabled
        ? `🟢 "${moduleId}" is now ACTIVE for all Companies!`
        : `🚫 "${moduleId}" is now GLOBALLY HIDDEN from all Companies!`,
      isCurrentlyDisabled ? 'success' : 'info'
    );
  };

  const handleEnableAll = async () => {
    const updated = await FeatureProvisioningEngine.saveFullProvisioningState({
      ...provisioningState,
      globalDisabledModules: []
    });
    setProvisioningState({ ...updated });
    showToast('🟢 All 24 Platform Modules are now ACTIVE globally!', 'success');
  };

  const handleLaunchPreset = async () => {
    // Keeps Essential Core active, hides experimental/advanced modules for a clean launch
    const launchPresetHidden = ['office_kiosk', 'telecalling', 'taxes_compliance', 'ff_settlements'];
    const updated = await FeatureProvisioningEngine.saveFullProvisioningState({
      ...provisioningState,
      globalDisabledModules: launchPresetHidden
    });
    setProvisioningState({ ...updated });
    showToast('🚀 Clean Launch Preset applied! (Experimental modules hidden globally)', 'success');
  };

  const openCompanyModal = (company) => {
    const tenantKey = String(company.tenant_id || company.id || '').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    const overrides = FeatureProvisioningEngine.getTenantOverrides(tenantKey);
    setSelectedCompanyForModal(company);
    setCompanyModalState({ ...overrides });
  };

  const handleToggleCompanyModule = (moduleId) => {
    if (!selectedCompanyForModal) return;
    const isExplicitlyDisabled = companyModalState.disabled.includes(moduleId);
    const isExplicitlyEnabled = companyModalState.enabled.includes(moduleId);
    const isGloballyDisabled = globalDisabled.includes(moduleId);

    let newDisabled = [...(companyModalState.disabled || [])];
    let newEnabled = [...(companyModalState.enabled || [])];

    // Determine current effective state
    const isCurrentlyActive = isExplicitlyEnabled || (!isGloballyDisabled && !isExplicitlyDisabled);

    if (isCurrentlyActive) {
      // Turn OFF for this company
      newEnabled = newEnabled.filter(id => id !== moduleId);
      if (!newDisabled.includes(moduleId)) newDisabled.push(moduleId);
    } else {
      // Turn ON for this company
      newDisabled = newDisabled.filter(id => id !== moduleId);
      if (!newEnabled.includes(moduleId)) newEnabled.push(moduleId);
    }

    setCompanyModalState({ disabled: newDisabled, enabled: newEnabled });
  };

  const handleSaveCompanyProvisioning = async () => {
    if (!selectedCompanyForModal) return;
    setIsSaving(true);
    const tenantKey = String(selectedCompanyForModal.tenant_id || selectedCompanyForModal.id || '').trim().replace(/[^a-zA-Z0-9_-]/g, '_');

    const updatedState = {
      ...provisioningState,
      tenantOverrides: {
        ...(provisioningState.tenantOverrides || {}),
        [tenantKey]: companyModalState
      }
    };

    const saved = await FeatureProvisioningEngine.saveFullProvisioningState(updatedState);
    setProvisioningState({ ...saved });
    setIsSaving(false);
    showToast(`✅ Custom module permissions saved for "${selectedCompanyForModal.company_name}"!`, 'success');
    setSelectedCompanyForModal(null);
  };

  return (
    <div className="superadmin-panel-container" style={{ padding: '24px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid #f1f5f9' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '20px' }}>🎛️</span>
            <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#0f2b26', margin: 0 }}>
              SuperAdmin Module & Page Visibility Provisioning
            </h3>
            <span style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', fontSize: '11px', fontWeight: '800', padding: '2px 8px', borderRadius: '99px' }}>
              CLOUD SYNCHRONIZED
            </span>
          </div>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            Master centralized switchboard to enable/disable platform pages for all companies globally or customize per organization.
          </p>
        </div>

        {/* Global Quick Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleLaunchPreset}
            type="button"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, rgba(20, 210, 203, 0.15), rgba(13, 148, 136, 0.2))',
              border: '1px solid #14d2cb',
              color: '#0d9488',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            <Sparkles size={14} />
            <span>🚀 Clean Launch Preset</span>
          </button>

          <button
            onClick={handleEnableAll}
            type="button"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              background: '#0d9488',
              border: '1px solid #0f766e',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            <CheckCircle2 size={14} />
            <span>🟢 Enable All 24 Modules</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', paddingBottom: '4px', maxWidth: '100%' }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: selectedCategory === cat ? '800' : '600',
                background: selectedCategory === cat ? '#0f2b26' : '#f1f5f9',
                color: selectedCategory === cat ? '#ffffff' : '#64748b',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: '260px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search module or page..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 34px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '12.5px',
              outline: 'none',
              background: '#ffffff'
            }}
          />
        </div>
      </div>

      {/* Module Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
        {filteredModules.map(mod => {
          const isGloballyDisabled = globalDisabled.includes(mod.id);
          return (
            <div
              key={mod.id}
              style={{
                borderRadius: '12px',
                padding: '16px',
                border: isGloballyDisabled ? '1.5px dashed #fca5a5' : '1px solid #e2e8f0',
                background: isGloballyDisabled ? '#fffdfd' : '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '12px',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>{mod.icon}</span>
                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: '800', color: isGloballyDisabled ? '#991b1b' : '#0f2b26', margin: 0 }}>
                        {mod.label}
                      </h4>
                      <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '600' }}>
                        {mod.category}
                      </span>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    type="button"
                    onClick={() => handleToggleGlobalModule(mod.id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      border: isGloballyDisabled ? '1px solid #f87171' : '1px solid #10b981',
                      background: isGloballyDisabled ? '#fee2e2' : '#ecfdf5',
                      color: isGloballyDisabled ? '#b91c1c' : '#047857',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {isGloballyDisabled ? (
                      <>
                        <EyeOff size={12} />
                        <span>HIDDEN</span>
                      </>
                    ) : (
                      <>
                        <Eye size={12} />
                        <span>ACTIVE</span>
                      </>
                    )}
                  </button>
                </div>

                <p style={{ fontSize: '11.5px', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                  {mod.desc}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid rgba(0,0,0,0.05)', fontSize: '11px' }}>
                <span style={{ fontFamily: 'monospace', color: '#94a3b8', fontSize: '10.5px' }}>
                  ID: {mod.id}
                </span>
                <span style={{ fontWeight: '700', color: isGloballyDisabled ? '#ef4444' : '#10b981' }}>
                  {isGloballyDisabled ? '🚫 Hidden from All Tenants' : '🟢 Live for All Tenants'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Per-Company Provisioning Quick Access Drawer */}
      <div style={{ marginTop: '36px', paddingTop: '24px', borderTop: '1px solid #e2e8f0' }}>
        <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#0f2b26', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Building2 size={18} color="#0d9488" />
          <span>🏢 Per-Company Feature Provisioning</span>
        </h4>
        <p style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '16px' }}>
          Customize specific module overrides for individual organizations. Click on any company to configure.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
          {(superadminCompanies || []).map(comp => {
            const tenantKey = String(comp.tenant_id || comp.id || '').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
            const overrides = provisioningState.tenantOverrides?.[tenantKey] || { disabled: [], enabled: [] };
            const hasCustom = (overrides.disabled?.length > 0) || (overrides.enabled?.length > 0);

            return (
              <div
                key={tenantKey}
                onClick={() => openCompanyModal(comp)}
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: hasCustom ? '1px solid #3b82f6' : '1px solid #cbd5e1',
                  background: hasCustom ? '#eff6ff' : '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div>
                  <h5 style={{ fontSize: '13px', fontWeight: '800', color: '#0f2b26', margin: '0 0 2px 0' }}>
                    {comp.company_name || `Tenant #${comp.tenant_id}`}
                  </h5>
                  <span style={{ fontSize: '11px', color: hasCustom ? '#2563eb' : '#64748b', fontWeight: '600' }}>
                    {hasCustom ? `⚙️ Custom: ${overrides.disabled.length} Hidden, ${overrides.enabled.length} Forced ON` : '🌐 Follows Global Settings'}
                  </span>
                </div>
                <Sliders size={14} color="#0d9488" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Per-Company Configuration Modal */}
      {selectedCompanyForModal && (
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
          zIndex: 99999,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            maxWidth: '650px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#0f2b26', margin: 0 }}>
                  🎛️ Configure Modules for "{selectedCompanyForModal.company_name}"
                </h3>
                <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                  Tenant ID: #{selectedCompanyForModal.tenant_id}
                </span>
              </div>
              <button
                onClick={() => setSelectedCompanyForModal(null)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', flexGrow: 1 }}>
              <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
                Toggle which specific modules are accessible for this company. Disabled modules will not appear in this company's sidebar or in their Roles & Permissions matrix.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                {allModules.map(mod => {
                  const isExplicitlyDisabled = companyModalState.disabled?.includes(mod.id);
                  const isExplicitlyEnabled = companyModalState.enabled?.includes(mod.id);
                  const isGloballyDisabled = globalDisabled.includes(mod.id);
                  const isEffectivelyActive = isExplicitlyEnabled || (!isGloballyDisabled && !isExplicitlyDisabled);

                  return (
                    <div
                      key={mod.id}
                      onClick={() => handleToggleCompanyModule(mod.id)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: isEffectivelyActive ? '1px solid #a7f3d0' : '1px solid #fecaca',
                        background: isEffectivelyActive ? '#f0fdf4' : '#fff5f5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '18px' }}>{mod.icon}</span>
                        <div>
                          <span style={{ fontSize: '13px', fontWeight: '800', color: isEffectivelyActive ? '#065f46' : '#991b1b' }}>
                            {mod.label}
                          </span>
                          <span style={{ display: 'block', fontSize: '11px', color: '#64748b' }}>
                            {mod.category}
                          </span>
                        </div>
                      </div>

                      <span style={{
                        fontSize: '11px',
                        fontWeight: '800',
                        padding: '3px 8px',
                        borderRadius: '99px',
                        background: isEffectivelyActive ? '#10b981' : '#ef4444',
                        color: '#ffffff'
                      }}>
                        {isEffectivelyActive ? 'ENABLED' : 'DISABLED'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc' }}>
              <button
                type="button"
                onClick={() => setCompanyModalState({ disabled: [], enabled: [] })}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Reset to Global Defaults
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedCompanyForModal(null)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#64748b',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCompanyProvisioning}
                  disabled={isSaving}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: '#0d9488',
                    border: '1px solid #0f766e',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: '800',
                    cursor: 'pointer'
                  }}
                >
                  <Save size={14} />
                  <span>{isSaving ? 'Saving...' : 'Save Company Access'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
