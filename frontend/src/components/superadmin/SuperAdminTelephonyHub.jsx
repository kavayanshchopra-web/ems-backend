import React, { useState, useEffect } from 'react';
import { Phone, Users, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw, Edit3, Settings, Play, Power, ExternalLink, Search, X, Save } from 'lucide-react';

export default function SuperAdminTelephonyHub({ showToast }) {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Edit Modal State
  const [editForm, setEditForm] = useState({
    tenant_id: 1,
    company_name: '',
    provider: 'voxbay',
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

  const openConfigModal = (tenant) => {
    setSelectedTenant(tenant);
    setEditForm({
      tenant_id: tenant.tenant_id,
      company_name: tenant.company_name || `Company #${tenant.tenant_id}`,
      provider: tenant.provider || 'voxbay',
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
            <span>Multi-Tenant Cloud PBX & Extension Allocator</span>
          </h3>
          <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
            Allocate 5-user PBX extension pools, configure agent mobile legs, and manage tenant telephony quotas.
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

      {/* METRIC CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #0d9488', borderRadius: '10px', padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Active Companies</div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f2b26', marginTop: '4px' }}>{tenants.length}</div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #10b981', borderRadius: '10px', padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '11.5px', color: '#059669', fontWeight: '700', textTransform: 'uppercase' }}>Telephony Enabled</div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#059669', marginTop: '4px' }}>
            {tenants.filter((t) => t.is_enabled === 1).length}
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #2563eb', borderRadius: '10px', padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '11.5px', color: '#1d4ed8', fontWeight: '700', textTransform: 'uppercase' }}>Available Extensions</div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#1d4ed8', marginTop: '4px' }}>
            5 / Company
          </div>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search company, tenant ID, agent mobile..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              padding: '7px 12px 7px 34px',
              borderRadius: '8px',
              color: '#0f2b26',
              fontSize: '13px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {/* TENANTS TELEPHONY TABLE */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '12px 16px', fontSize: '12px', color: '#475569', fontWeight: '700' }}>Company & Tenant</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', color: '#475569', fontWeight: '700' }}>Allocated Extensions</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', color: '#475569', fontWeight: '700' }}>Calling Mode</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', color: '#475569', fontWeight: '700' }}>Virtual DID</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', color: '#475569', fontWeight: '700' }}>Telephony Status</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', color: '#475569', fontWeight: '700', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTenants.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                  No companies found matching criteria.
                </td>
              </tr>
            ) : (
              filteredTenants.map((item) => (
                <tr key={item.tenant_id} style={{ borderBottom: '1px solid #f1f5f9', background: '#ffffff' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#0f2b26' }}>
                      {item.company_name || `Company #${item.tenant_id}`}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                      Tenant #{item.tenant_id} • Default Agent: {item.default_agent_mobile || '6283513686'}
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {(item.allowed_extensions || '101,102,103,104,105').split(',').map((ext, idx) => (
                        <span key={idx} style={{ background: 'rgba(13, 148, 136, 0.1)', color: '#0d9488', border: '1px solid rgba(13, 148, 136, 0.2)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', fontFamily: 'monospace' }}>
                          Ext {ext.trim()}
                        </span>
                      ))}
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#334155' }}>
                      {item.calling_mode === 'mobile_to_mobile' ? '📱 Agent Mobile' : '💻 Softphone (Ext)'}
                    </span>
                  </td>

                  <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: '12.5px', color: '#0d9488', fontWeight: '700' }}>
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
                  Tenant #{editForm.tenant_id} • Allocate PBX extensions and master telephony credentials.
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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
                    Virtual DID Number (Caller ID)
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

                {/* Default Agent Mobile */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Default Agent Mobile (Leg 1)
                  </label>
                  <input
                    type="text"
                    value={editForm.default_agent_mobile}
                    onChange={(e) => setEditForm({ ...editForm, default_agent_mobile: e.target.value })}
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
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Allocated Extensions (Comma separated)
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

                {/* Calling Mode */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Default Calling Mode
                  </label>
                  <select
                    value={editForm.calling_mode}
                    onChange={(e) => setEditForm({ ...editForm, calling_mode: e.target.value })}
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
                    <option value="mobile_to_mobile">📱 Agent Mobile (2-Leg Cloud)</option>
                    <option value="extension_to_mobile">💻 Desktop Softphone (SIP Extension)</option>
                  </select>
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
                  <span>{testing ? 'Testing...' : 'Test Gateway API'}</span>
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