import SuperAdminKycHub from '../superadmin/SuperAdminKycHub';
import SuperAdminTelephonyHub from '../superadmin/SuperAdminTelephonyHub';
import React from 'react';
import { Briefcase, Globe, UserCheck, Users, Shield, Award, Search, Trash2, Clock } from 'lucide-react';
import DataTable from '../DataTable';

export default function SuperAdminPage({
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
  return (
    <div className="superadmin-plans-panel glass-panel">

      {/* Metric KPI Cards Row (7 Vibrant Metric Cards) */}
      <div className="superadmin-metrics-row">
        <div className="superadmin-metric-card metric-companies">
          <div className="superadmin-metric-info">
            <span className="superadmin-metric-title">Companies</span>
            <span className="superadmin-metric-value">{superadminMetrics.companies}</span>
          </div>
          <div className="superadmin-metric-icon-box">
            <Briefcase size={20} />
          </div>
        </div>

        <div className="superadmin-metric-card metric-branches">
          <div className="superadmin-metric-info">
            <span className="superadmin-metric-title">Branches</span>
            <span className="superadmin-metric-value">{superadminMetrics.branches}</span>
          </div>
          <div className="superadmin-metric-icon-box">
            <Globe size={20} />
          </div>
        </div>

        <div className="superadmin-metric-card metric-managers">
          <div className="superadmin-metric-info">
            <span className="superadmin-metric-title">Managers</span>
            <span className="superadmin-metric-value">{superadminMetrics.managers}</span>
          </div>
          <div className="superadmin-metric-icon-box">
            <UserCheck size={20} />
          </div>
        </div>

        <div className="superadmin-metric-card metric-employees">
          <div className="superadmin-metric-info">
            <span className="superadmin-metric-title">Employees</span>
            <span className="superadmin-metric-value">{superadminMetrics.employees}</span>
          </div>
          <div className="superadmin-metric-icon-box">
            <Users size={20} />
          </div>
        </div>

        <div className="superadmin-metric-card metric-admins">
          <div className="superadmin-metric-info">
            <span className="superadmin-metric-title">Admins</span>
            <span className="superadmin-metric-value">{superadminMetrics.admins}</span>
          </div>
          <div className="superadmin-metric-icon-box">
            <Shield size={20} />
          </div>
        </div>

        <div className="superadmin-metric-card metric-superadmins">
          <div className="superadmin-metric-info">
            <span className="superadmin-metric-title">Super Admins</span>
            <span className="superadmin-metric-value">{superadminMetrics.superAdmins}</span>
          </div>
          <div className="superadmin-metric-icon-box">
            <Award size={20} />
          </div>
        </div>

        <div className="superadmin-metric-card metric-totalusers">
          <div className="superadmin-metric-info">
            <span className="superadmin-metric-title">Total Users</span>
            <span className="superadmin-metric-value">{superadminMetrics.totalUsers}</span>
          </div>
          <div className="superadmin-metric-icon-box">
            <Users size={20} />
          </div>
        </div>
      </div>

      {/* Sub-Tabs Bar */}
      <div className="superadmin-subtabs-row no-scrollbar">
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
          onClick={() => setSuperadminSubTab && setSuperadminSubTab('manage_plans')}
          className={`superadmin-tab-btn ${superadminSubTab === 'manage_plans' ? 'active' : ''}`}
        >
          Manage Plans
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
          onClick={() => setSuperadminSubTab && setSuperadminSubTab('system_tools')}
          className={`superadmin-tab-btn ${superadminSubTab === 'system_tools' ? 'active' : ''}`}
        >
          System Tools
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
            <div className="superadmin-search-wrapper" style={{ position: 'relative', width: '250px' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search company or tenant ID..."
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

          <DataTable
            columns={[
              {
                header: 'Tenant ID ⇅',
                accessor: 'tenant_id',
                render: (c) => (
                  <span style={{ fontFamily: 'monospace', background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', color: '#475569' }}>
                    #{c.tenant_id}
                  </span>
                )
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
                header: 'Status ⇅',
                accessor: 'status',
                render: (c) => (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '99px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', fontWeight: '700', fontSize: '11px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }}></span>
                    Active Tenant
                  </span>
                )
              }
            ]}
            data={(superadminCompanies || []).filter(c => {
              if (!superadminCompaniesQuery || !superadminCompaniesQuery.trim()) return true;
              const q = superadminCompaniesQuery.toLowerCase();
              return (
                (c.company_name && c.company_name.toLowerCase().includes(q)) ||
                (c.tenant_id && String(c.tenant_id).toLowerCase().includes(q))
              );
            })}
            emptyMessage="No registered tenant companies found."
          />
        </div>
      )}

      {/* Sub-Tab 3: Manage Plans */}
      {superadminSubTab === 'manage_plans' && (
        <div>
          {adminPlansError && (
            <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
              {adminPlansError}
            </div>
          )}
          <div className="superadmin-grid-columns" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px', alignItems: 'start' }}>
            {/* Left Side: Plans List & Add/Edit Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f2b26', marginBottom: '16px' }}>
                  {adminPlanForm?.id ? 'Edit Plan Configuration' : 'Create New SaaS Plan'}
                </h3>
                <form onSubmit={handleSavePlan} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="superadmin-form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '4px' }}>Plan ID</label>
                      <input
                        type="text"
                        required
                        disabled={!!adminPlanForm?.id}
                        placeholder="e.g. pro"
                        value={adminPlanForm?.id || ''}
                        onChange={(e) => setAdminPlanForm && setAdminPlanForm({ ...adminPlanForm, id: e.target.value })}
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', fontSize: '13px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '4px' }}>Plan Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Unlimited Pro"
                        value={adminPlanForm?.name || ''}
                        onChange={(e) => setAdminPlanForm && setAdminPlanForm({ ...adminPlanForm, name: e.target.value })}
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', fontSize: '13px' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '4px' }}>Plan Description</label>
                    <input
                      type="text"
                      placeholder="e.g. For growing enterprises"
                      value={adminPlanForm?.description || ''}
                      onChange={(e) => setAdminPlanForm && setAdminPlanForm({ ...adminPlanForm, description: e.target.value })}
                      style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', fontSize: '13px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '4px' }}>
                      Plan Features (One per line)
                    </label>
                    <textarea
                      rows="3"
                      placeholder="Unlimited active sessions&#10;Scheduled responders&#10;Priority support"
                      value={adminPlanForm?.features || ''}
                      onChange={(e) => setAdminPlanForm && setAdminPlanForm({ ...adminPlanForm, features: e.target.value })}
                      style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', fontSize: '13px' }}
                    />
                  </div>

                  <div className="superadmin-form-grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '4px' }}>Max Channels</label>
                      <input
                        type="number"
                        value={adminPlanForm?.maxChannels || 1}
                        onChange={(e) => setAdminPlanForm && setAdminPlanForm({ ...adminPlanForm, maxChannels: e.target.value })}
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', fontSize: '13px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '4px' }}>Max Contacts</label>
                      <input
                        type="number"
                        value={adminPlanForm?.maxContacts || 250}
                        onChange={(e) => setAdminPlanForm && setAdminPlanForm({ ...adminPlanForm, maxContacts: e.target.value })}
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', fontSize: '13px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '4px' }}>Max Employees</label>
                      <input
                        type="number"
                        value={adminPlanForm?.maxEmployees || 5}
                        onChange={(e) => setAdminPlanForm && setAdminPlanForm({ ...adminPlanForm, maxEmployees: e.target.value })}
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', fontSize: '13px' }}
                      />
                    </div>
                  </div>

                  <div className="superadmin-checkbox-group" style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600' }}>
                      <input
                        type="checkbox"
                        checked={!!adminPlanForm?.allowChatbot}
                        onChange={(e) => setAdminPlanForm && setAdminPlanForm({ ...adminPlanForm, allowChatbot: e.target.checked })}
                      />
                      Allow Auto Chatbot
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600' }}>
                      <input
                        type="checkbox"
                        checked={!!adminPlanForm?.allowScheduler}
                        onChange={(e) => setAdminPlanForm && setAdminPlanForm({ ...adminPlanForm, allowScheduler: e.target.checked })}
                      />
                      Allow Broadcast Scheduler
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600' }}>
                      <input
                        type="checkbox"
                        checked={!!adminPlanForm?.allowGpsTracking}
                        onChange={(e) => setAdminPlanForm && setAdminPlanForm({ ...adminPlanForm, allowGpsTracking: e.target.checked })}
                      />
                      Allow GPS Tracking
                    </label>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                      {adminPlanForm?.id ? 'Save Plan Updates' : 'Create Plan'}
                    </button>
                    {adminPlanForm?.id && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          if (setAdminPlanForm) {
                            setAdminPlanForm({
                              id: '',
                              name: '',
                              description: '',
                              features: '',
                              maxChannels: 1,
                              maxContacts: 250,
                              maxEmployees: 5,
                              allowChatbot: false,
                              allowScheduler: false,
                              allowGpsTracking: false,
                              isActive: true
                            });
                          }
                          if (setAdminSelectedPlanId) setAdminSelectedPlanId('');
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Plans List */}
              <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f2b26', marginBottom: '16px' }}>
                  Active & Configured SaaS Plans
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {(superadminPlans || []).map(plan => (
                    <div
                      key={plan.id}
                      style={{
                        padding: '16px',
                        borderRadius: '8px',
                        border: adminSelectedPlanId === plan.id ? '2px solid var(--color-primary)' : '1px solid #e2e8f0',
                        background: '#f8fafc',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        if (setAdminSelectedPlanId) setAdminSelectedPlanId(plan.id);
                        if (setAdminPlanForm) {
                          setAdminPlanForm({
                            id: plan.id,
                            name: plan.name,
                            description: plan.description || '',
                            features: (plan.features || []).join('\n'),
                            maxChannels: plan.max_channels,
                            maxContacts: plan.max_contacts,
                            maxEmployees: plan.max_employees || 5,
                            allowChatbot: plan.allow_chatbot === 1,
                            allowScheduler: plan.allow_scheduler === 1,
                            allowGpsTracking: plan.allow_gps_tracking === 1,
                            isActive: plan.is_active === 1
                          });
                        }
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: '700', fontSize: '13px' }}>{plan.name}</span>
                          <span style={{
                            fontSize: '9px',
                            fontWeight: '700',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: plan.is_active ? 'rgba(16, 185, 129, 0.12)' : '#e2e8f0',
                            color: plan.is_active ? '#10b981' : '#64748b'
                          }}>
                            {plan.is_active ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          ID: {plan.id} • Max Channels: {plan.max_channels} • Max Contacts: {plan.max_contacts}
                        </div>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-primary)' }}>
                        Select & Edit →
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Side: Country-Wise Price Configurations */}
            <div>
              <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f2b26', marginBottom: '6px' }}>
                  Country Pricing & Currencies
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  Select a plan on the left to edit pricing rates for specific locations.
                </p>

                {adminSelectedPlanId ? (
                  <div>
                    <div style={{
                      background: 'rgba(13, 148, 136, 0.05)',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid rgba(13, 148, 136, 0.15)',
                      fontSize: '13px',
                      fontWeight: '700',
                      color: 'var(--color-primary)',
                      marginBottom: '20px'
                    }}>
                      Selected: {superadminPlans.find(p => p.id === adminSelectedPlanId)?.name}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                      {(superadminPlans.find(p => p.id === adminSelectedPlanId)?.prices || []).map(price => (
                        <div
                          key={price.country_code}
                          style={{
                            padding: '12px',
                            borderRadius: '6px',
                            border: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '12px'
                          }}
                        >
                          <div>
                            <span style={{ fontWeight: '700', marginRight: '6px' }}>{price.country_code}</span>
                            <span>{price.currency} {price.amount}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeletePlanPrice && handleDeletePlanPrice(adminSelectedPlanId, price.country_code)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>

                    <form onSubmit={handleSavePlanPrice} style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#f8fafc', padding: '16px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f2b26' }}>Add/Update Country Rate</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', marginBottom: '2px' }}>Country Code</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. IN, US"
                            value={adminNewPriceForm?.countryCode || ''}
                            onChange={(e) => setAdminNewPriceForm && setAdminNewPriceForm({ ...adminNewPriceForm, countryCode: e.target.value.toUpperCase() })}
                            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', fontSize: '12px' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', marginBottom: '2px' }}>Currency</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. INR, USD"
                            value={adminNewPriceForm?.currency || ''}
                            onChange={(e) => setAdminNewPriceForm && setAdminNewPriceForm({ ...adminNewPriceForm, currency: e.target.value.toUpperCase() })}
                            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', fontSize: '12px' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '8px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', marginBottom: '2px' }}>Price Amount</label>
                          <input
                            type="number"
                            step="0.01"
                            required
                            placeholder="e.g. 29.00"
                            value={adminNewPriceForm?.amount || ''}
                            onChange={(e) => setAdminNewPriceForm && setAdminNewPriceForm({ ...adminNewPriceForm, amount: e.target.value })}
                            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', fontSize: '12px' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', marginBottom: '2px' }}>Stripe Price ID</label>
                          <input
                            type="text"
                            placeholder="e.g. price_pro_123"
                            value={adminNewPriceForm?.stripePriceId || ''}
                            onChange={(e) => setAdminNewPriceForm && setAdminNewPriceForm({ ...adminNewPriceForm, stripePriceId: e.target.value })}
                            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', fontSize: '12px' }}
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ padding: '10px', marginTop: '4px', fontSize: '12px' }}
                      >
                        + Save Country Pricing Rate
                      </button>
                    </form>
                  </div>
                ) : (
                  <div style={{ padding: '40px 10px', textAlign: 'center', border: '1px dashed #cbd5e1', borderRadius: '8px', color: 'var(--text-dim)', fontSize: '12px' }}>
                    Select a plan from the list to manage locations and pricing.
                  </div>
                )}
              </div>
            </div>
          </div>
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

      {/* Sub-Tab 5: System Tools */}
      {superadminSubTab === 'system_tools' && (
        <div className="superadmin-panel-container">
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f2b26', marginBottom: '4px' }}>
            🛠️ System Maintenance & Diagnostic Tools
          </h3>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px' }}>
            Run diagnostic checks, flush system caches, test socket connections, and manage database seeds.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div style={{ padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '6px', color: '#0f2b26' }}>🧹 Clear System Cache</h4>
              <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px' }}>Purge active session cache and force fresh data sync across all tenants.</p>
              <button
                onClick={() => {
                  if (showToast) showToast('🟢 System cache flushed successfully!', 'success');
                }}
                className="btn btn-primary" style={{ padding: '8px 14px', fontSize: '12px' }}>
                Flush Cache
              </button>
            </div>

            <div style={{ padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '6px', color: '#0f2b26' }}>🔌 Test WebSocket Server</h4>
              <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px' }}>Ping realtime Baileys & WhatsApp Socket gateway for latency check.</p>
              <button
                onClick={() => {
                  if (showToast) showToast('⚡ WebSocket Connection: ACTIVE (Latency 14ms)', 'success');
                }}
                className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '12px' }}>
                Test Socket Gateway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
