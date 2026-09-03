import React, { useState, useEffect } from 'react';
import { Phone, Users, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw, Edit3, Settings, Play, Power, ExternalLink, Search, X, Save, Smartphone, Cloud, Info } from 'lucide-react';

export default function SuperAdminTelephonyHub({ showToast }) {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Global Active Telephony Mode: 'sim_runo' (Default/Active) vs 'voxbay' (Standby)
  const [globalTelephonyMode, setGlobalTelephonyMode] = useState(() => {
    return localStorage.getItem('active_telephony_provider') || 'sim_runo';
  });

  // Edit Modal State
  const [editForm, setEditForm] = useState({
    tenant_id: 1,
    company_name: '',
    provider: 'sim_runo',
    voxbay_uid: 'x97x4zzfz1',
    voxbay_upin: '8uqctamkgf',
    voxbay_did: '918031496345',
    allowed_extensions: '101,102,103,104,105',
    calling_mode: 'mobile_to_mobile',
    default_agent_mobile: '6283513686',
    default_extension: '111',
    is_enabled: 1,
    monthly_quota_minutes: 500,
    notes: ''
  });

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/superadmin/telephony/tenants');
      const data = await res.json();
      if (data.success && data.tenants) {
        setTenants(data.tenants);
      }
    } catch (err) {
      if (showToast) showToast('Failed to fetch telephony tenants', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleGlobalProviderSwitch = (newProvider) => {
    setGlobalTelephonyMode(newProvider);
    localStorage.setItem('active_telephony_provider', newProvider);
    window.dispatchEvent(new CustomEvent('omniflow:telephony_provider_changed', { detail: { provider: newProvider } }));
    if (showToast) {
      if (newProvider === 'sim_runo') {
        showToast('📱 Active Telephony set to SIM Card & Runo Mobile Companion (Live)', 'success');
      } else {
        showToast('☁️ Active Telephony switched to Voxbay Cloud PBX (Active)', 'info');
      }
    }
  };

  const openConfigModal = (tenant) => {
    setSelectedTenant(tenant);
    setEditForm({
      tenant_id: tenant.tenant_id,
      company_name: tenant.company_name || `Company #${tenant.tenant_id}`,
      provider: tenant.provider || globalTelephonyMode || 'sim_runo',
      voxbay_uid: tenant.voxbay_uid || 'x97x4zzfz1',
      voxbay_upin: tenant.voxbay_upin || '8uqctamkgf',
      voxbay_did: tenant.voxbay_did || '918031496345',
      allowed_extensions: tenant.allowed_extensions || '101,102,103,104,105',
      calling_mode: tenant.calling_mode || 'mobile_to_mobile',
      default_agent_mobile: tenant.default_agent_mobile || '6283513686',
      default_extension: tenant.default_extension || '111',
      is_enabled: tenant.is_enabled !== undefined ? tenant.is_enabled : 1,
      monthly_quota_minutes: tenant.monthly_quota_minutes || 500,
      notes: tenant.notes || ''
    });
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch('/api/superadmin/telephony/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (data.success) {
        if (showToast) showToast(`Telephony allocation updated for ${editForm.company_name}!`, 'success');
        setSelectedTenant(null);
        fetchTenants();
      } else {
        if (showToast) showToast(data.error || 'Failed to save settings', 'error');
      }
    } catch (err) {
      if (showToast) showToast(`Save error: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const res = await fetch('/api/superadmin/telephony/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: editForm.voxbay_uid,
          upin: editForm.voxbay_upin,
          user_no: editForm.default_extension,
          did: editForm.voxbay_did
        })
      });
      const data = await res.json();
      if (data.success) {
        if (showToast) showToast(`Voxbay PBX Gateway Online (HTTP ${data.statusCode})!`, 'success');
      } else {
        if (showToast) showToast(`Test failed: ${data.message || data.error}`, 'error');
      }
    } catch (err) {
      if (showToast) showToast(`Gateway connection error: ${err.message}`, 'error');
    } finally {
      setTesting(false);
    }
  };

  const filteredTenants = tenants.filter((t) =>
    (t.company_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(t.tenant_id).includes(searchTerm) ||
    (t.default_agent_mobile || '').includes(searchTerm)
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f2b26', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Phone size={20} style={{ color: '#0d9488' }} />
            <span>Telephony Architecture & Provider Provisioning Hub</span>
          </h3>
          <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
            Manage Active Calling Infrastructure (SIM Card / Runo Companion vs Voxbay Cloud PBX), manage tenant allocations, and test gateways.
          </p>
        </div>

        <button
          onClick={fetchTenants}
          disabled={loading}
          style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            padding: '7px 14px',
            borderRadius: '8px',
            color: '#334155',
            fontSize: '12.5px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}
        >
          <RefreshCw size={13} className={loading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* GLOBAL TELEPHONY STATUS & SWITCHER BANNER */}
      <div style={{
        background: globalTelephonyMode === 'sim_runo'
          ? 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)'
          : 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
        border: globalTelephonyMode === 'sim_runo' ? '1.5px solid #86efac' : '1.5px solid #7dd3fc',
        borderRadius: '12px',
        padding: '18px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', maxWidth: '680px' }}>
          <div style={{
            background: globalTelephonyMode === 'sim_runo' ? '#16a34a' : '#0284c7',
            color: '#ffffff',
            borderRadius: '10px',
            padding: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {globalTelephonyMode === 'sim_runo' ? <Smartphone size={22} /> : <Cloud size={22} />}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: '800', color: '#0f2b26' }}>
                Active Telephony Provider: {globalTelephonyMode === 'sim_runo' ? '📱 SIM Card & Runo Companion (LIVE)' : '☁️ Voxbay Cloud PBX (ACTIVE)'}
              </span>
              <span style={{
                background: globalTelephonyMode === 'sim_runo' ? '#dcfce7' : '#e0f2fe',
                color: globalTelephonyMode === 'sim_runo' ? '#15803d' : '#0369a1',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '800'
              }}>
                PRIMARY
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#475569', margin: '4px 0 0 0', lineHeight: 1.4 }}>
              {globalTelephonyMode === 'sim_runo'
                ? 'Direct SIM dialer, Android Companion auto-recording sync, and Runo-style call flow are active. Voxbay Cloud Telephony is safely on standby (hidden from agents/front views).'
                : 'Voxbay Cloud PBX 2-leg dialer is active. Agents dial through Voxbay DID gateway.'}
            </p>
          </div>
        </div>

        {/* SuperAdmin Quick Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ffffff', padding: '6px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
          <button
            type="button"
            onClick={() => handleGlobalProviderSwitch('sim_runo')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              background: globalTelephonyMode === 'sim_runo' ? '#16a34a' : 'transparent',
              color: globalTelephonyMode === 'sim_runo' ? '#ffffff' : '#64748b',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            <Smartphone size={13} />
            <span>SIM / Runo (Live)</span>
          </button>

          <button
            type="button"
            onClick={() => handleGlobalProviderSwitch('voxbay')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              background: globalTelephonyMode === 'voxbay' ? '#0284c7' : 'transparent',
              color: globalTelephonyMode === 'voxbay' ? '#ffffff' : '#64748b',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            <Cloud size={13} />
            <span>Voxbay (Standby)</span>
          </button>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ position: 'relative', width: '320px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search tenant or DID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 34px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '12.5px',
              color: '#0f2b26',
              outline: 'none',
              background: '#ffffff',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {/* TENANT TELEPHONY TABLE */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '11.5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <th style={{ padding: '12px 16px' }}>Tenant / Company</th>
              <th style={{ padding: '12px 16px' }}>Active Calling Provider</th>
              <th style={{ padding: '12px 16px' }}>Leg 1 Agent Mobile</th>
              <th style={{ padding: '12px 16px' }}>Voxbay DID (Standby)</th>
              <th style={{ padding: '12px 16px' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTenants.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                  {loading ? 'Loading telephony tenant allocations...' : 'No tenant records found matching your search.'}
                </td>
              </tr>
            ) : (
              filteredTenants.map((item) => (
                <tr key={item.tenant_id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: '700', color: '#0f2b26', fontSize: '13px' }}>
                      {item.company_name || `Company #${item.tenant_id}`}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      Tenant ID: #{item.tenant_id}
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    {globalTelephonyMode === 'sim_runo' ? (
                      <span style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', padding: '4px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <Smartphone size={12} /> SIM Card / Runo (Active)
                      </span>
                    ) : (
                      <span style={{ background: '#f0f9ff', color: '#0284c7', border: '1px solid #bae6fd', padding: '4px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <Cloud size={12} /> Voxbay PBX (Active)
                      </span>
                    )}
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontFamily: 'monospace', fontSize: '12.5px', color: '#334155', fontWeight: '600' }}>
                      {item.default_agent_mobile || '6283513686'}
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: '12.5px', color: '#64748b' }}>
                    {item.voxbay_did || '918031496345'}
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    {item.is_enabled === 1 ? (
                      <span style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '3px 10px', borderRadius: '6px', fontSize: '11.5px', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={12} /> Active
                      </span>
                    ) : (
                      <span style={{ background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0', padding: '3px 10px', borderRadius: '6px', fontSize: '11.5px', fontWeight: '700' }}>
                        Disabled
                      </span>
                    )}
                  </td>

                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <button
                      onClick={() => openConfigModal(item)}
                      style={{
                        background: 'linear-gradient(135deg, #0d9488 0%, #10b981 100%)',
                        border: 'none',
                        color: '#ffffff',
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 6px rgba(13, 148, 136, 0.25)'
                      }}
                    >
                      <Settings size={13} />
                      <span>Configure</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* CONFIGURE & ALLOCATE MODAL */}
      {selectedTenant && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            width: '680px',
            maxWidth: '95vw',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '28px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.15)'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f2b26', margin: 0 }}>
                  Telephony & PBX Allocation: {editForm.company_name}
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                  Tenant #{editForm.tenant_id} • Configure SIM / Runo companion and Voxbay credentials.
                </p>
              </div>

              <button
                onClick={() => setSelectedTenant(null)}
                style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveConfig}>
              {/* Telephony Provider Selection */}
              <div style={{ marginBottom: '18px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#1e293b', marginBottom: '8px' }}>
                  Active Telephony Provider for this Tenant:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: editForm.provider === 'sim_runo' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                    background: editForm.provider === 'sim_runo' ? '#f0fdf4' : '#ffffff',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="radio"
                      name="provider"
                      value="sim_runo"
                      checked={editForm.provider === 'sim_runo'}
                      onChange={(e) => setEditForm({ ...editForm, provider: e.target.value })}
                    />
                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#0f2b26' }}>📱 SIM / Runo Companion</div>
                      <div style={{ fontSize: '11px', color: '#15803d' }}>Live & Active Default</div>
                    </div>
                  </label>

                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: editForm.provider === 'voxbay' ? '2px solid #0284c7' : '1px solid #cbd5e1',
                    background: editForm.provider === 'voxbay' ? '#f0f9ff' : '#ffffff',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="radio"
                      name="provider"
                      value="voxbay"
                      checked={editForm.provider === 'voxbay'}
                      onChange={(e) => setEditForm({ ...editForm, provider: e.target.value })}
                    />
                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#0f2b26' }}>☁️ Voxbay Cloud Telephony</div>
                      <div style={{ fontSize: '11px', color: '#0369a1' }}>On Hold / Standby</div>
                    </div>
                  </label>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Default Agent Mobile */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Agent Mobile (SIM / Companion Sync)
                  </label>
                  <input
                    type="text"
                    value={editForm.default_agent_mobile}
                    onChange={(e) => setEditForm({ ...editForm, default_agent_mobile: e.target.value })}
                    required
                    placeholder="e.g. 9876543210"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '13px',
                      color: '#0f2b26',
                      background: '#f8fafc',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Enabled Toggle */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Telephony Access Status
                  </label>
                  <select
                    value={editForm.is_enabled}
                    onChange={(e) => setEditForm({ ...editForm, is_enabled: parseInt(e.target.value, 10) })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '13px',
                      color: '#0f2b26',
                      background: '#f8fafc',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value={1}>🟢 Enabled (Active)</option>
                    <option value={0}>🔴 Disabled (Paused)</option>
                  </select>
                </div>

                {/* Voxbay Preserved Section Header */}
                <div style={{ gridColumn: 'span 2', marginTop: '10px', paddingTop: '12px', borderTop: '1px dashed #cbd5e1' }}>
                  <div style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Cloud size={14} />
                    <span>Voxbay Cloud PBX Gateway Credentials (Preserved in Standby)</span>
                  </div>
                </div>

                {/* Voxbay UID */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Voxbay UID
                  </label>
                  <input
                    type="text"
                    value={editForm.voxbay_uid}
                    onChange={(e) => setEditForm({ ...editForm, voxbay_uid: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '13px',
                      color: '#0f2b26',
                      background: '#f8fafc',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Voxbay UPIN */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Voxbay UPIN
                  </label>
                  <input
                    type="password"
                    value={editForm.voxbay_upin}
                    onChange={(e) => setEditForm({ ...editForm, voxbay_upin: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '13px',
                      color: '#0f2b26',
                      background: '#f8fafc',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Virtual DID */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Virtual DID Caller ID
                  </label>
                  <input
                    type="text"
                    value={editForm.voxbay_did}
                    onChange={(e) => setEditForm({ ...editForm, voxbay_did: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '13px',
                      color: '#0f2b26',
                      background: '#f8fafc',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Allowed Extensions */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Allocated Extensions
                  </label>
                  <input
                    type="text"
                    value={editForm.allowed_extensions}
                    onChange={(e) => setEditForm({ ...editForm, allowed_extensions: e.target.value })}
                    placeholder="101,102,103,104,105"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '13px',
                      color: '#0f2b26',
                      background: '#f8fafc',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '24px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                <button
                  type="button"
                  disabled={testing}
                  onClick={handleTestConnection}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    color: '#0d9488',
                    fontSize: '12.5px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Play size={14} />
                  <span>{testing ? 'Testing...' : 'Test Voxbay Gateway API'}</span>
                </button>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedTenant(null)}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      color: '#64748b',
                      fontSize: '12.5px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      background: 'linear-gradient(135deg, #0d9488 0%, #10b981 100%)',
                      border: 'none',
                      padding: '8px 22px',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '12.5px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      boxShadow: '0 3px 10px rgba(13, 148, 136, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Save size={15} />
                    <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}