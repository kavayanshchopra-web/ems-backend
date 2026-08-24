import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  RefreshCw, 
  Eye, 
  Trash2, 
  Calendar, 
  Building2, 
  Layers, 
  User, 
  Activity, 
  PhoneCall, 
  MessageSquare, 
  FileText, 
  Lock, 
  AlertTriangle,
  X,
  CheckCircle2,
  Download
} from 'lucide-react';
import AuditEngine from '../../core/engines/AuditEngine/AuditEngine';

export default function SystemAuditLogsPage({
  authUser,
  superadminCompanies = [],
  showToast = () => {}
}) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState('all');
  const [selectedModule, setSelectedModule] = useState('all');
  const [selectedAction, setSelectedAction] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLogForDiff, setSelectedLogForDiff] = useState(null);
  
  // Super Admin Purge Modal State
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [purgeConfirmationText, setPurgeConfirmationText] = useState('');
  const [purging, setPurging] = useState(false);

  const isSuperAdmin = authUser?.role === 'superadmin';

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedTenantId !== 'all') params.append('tenantId', selectedTenantId);
      if (selectedModule !== 'all') params.append('module', selectedModule);
      if (searchQuery) params.append('search', searchQuery);
      params.append('limit', '200');

      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.logs)) {
          setLogs(data.logs);
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Backend audit fetch error:', err.message);
    }

    // Fallback to local queue if backend offline
    try {
      const localQueue = JSON.parse(localStorage.getItem('omniflow_audit_queue') || '[]');
      setLogs(localQueue);
    } catch (e) {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const unsubscribe = AuditEngine.subscribe((newLog) => {
      setLogs(prev => [newLog, ...prev]);
    });
    return unsubscribe;
  }, [selectedTenantId, selectedModule]);

  const handlePurgeLogs = async () => {
    if (purgeConfirmationText.trim().toUpperCase() !== 'PURGE') {
      showToast('Please type "PURGE" to confirm log deletion.', 'error');
      return;
    }

    setPurging(true);
    try {
      const res = await fetch('/api/audit-logs/purge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: selectedTenantId })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Audit logs purged successfully.', 'success');
        setShowPurgeModal(false);
        setPurgeConfirmationText('');
        fetchLogs();
      } else {
        showToast(data.error || 'Failed to purge audit logs.', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setPurging(false);
    }
  };

  // Filter logs locally by action and search
  const filteredLogs = logs.filter(log => {
    if (selectedAction !== 'all') {
      if (!log.action.toLowerCase().includes(selectedAction.toLowerCase())) return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchActor = (log.user_name || log.userName || '').toLowerCase().includes(q) || (log.user_email || log.userEmail || '').toLowerCase().includes(q);
      const matchResource = (log.resource_name || log.resourceName || '').toLowerCase().includes(q);
      const matchDetails = (log.details || '').toLowerCase().includes(q);
      const matchAction = (log.action || '').toLowerCase().includes(q);
      if (!matchActor && !matchResource && !matchDetails && !matchAction) return false;
    }
    return true;
  });

  const getActionBadgeColor = (action = '') => {
    const act = action.toUpperCase();
    if (act.includes('CREATE') || act.includes('ADD')) return { bg: 'rgba(16, 185, 129, 0.12)', color: '#059669', border: 'rgba(16, 185, 129, 0.25)' };
    if (act.includes('UPDATE') || act.includes('EDIT') || act.includes('CHANGE')) return { bg: 'rgba(59, 130, 246, 0.12)', color: '#2563eb', border: 'rgba(59, 130, 246, 0.25)' };
    if (act.includes('DELETE') || act.includes('ARCHIVE') || act.includes('PURGE')) return { bg: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', border: 'rgba(239, 68, 68, 0.25)' };
    if (act.includes('CALL') || act.includes('VOXBAY')) return { bg: 'rgba(13, 148, 136, 0.12)', color: '#0d9488', border: 'rgba(13, 148, 136, 0.25)' };
    if (act.includes('WA_') || act.includes('WHATSAPP')) return { bg: 'rgba(37, 211, 102, 0.15)', color: '#128c7e', border: 'rgba(37, 211, 102, 0.3)' };
    if (act.includes('SECURITY') || act.includes('AUTH')) return { bg: 'rgba(139, 92, 246, 0.12)', color: '#7c3aed', border: 'rgba(139, 92, 246, 0.25)' };
    return { bg: 'rgba(100, 116, 139, 0.12)', color: '#475569', border: 'rgba(100, 116, 139, 0.25)' };
  };

  const getSelectedCompanyName = () => {
    if (selectedTenantId === 'all') return 'All Registered Companies';
    const match = (superadminCompanies || []).find(c => String(c.tenant_id || c.id) === String(selectedTenantId));
    return match ? (match.company_name || match.name) : `Company #${selectedTenantId}`;
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
      
      {/* Header Banner */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #064e43 0%, #0d9488 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 4px 10px rgba(13, 148, 136, 0.25)'
          }}>
            <ShieldCheck size={26} />
          </div>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
              System Audit Logs & Forensic Trail
            </h2>
            <p style={{ fontSize: '12.5px', color: '#64748b', margin: '4px 0 0 0' }}>
              Autonomous event engine recording all system mutations, call events, CRM updates, and security logs.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={fetchLogs}
            disabled={loading}
            style={{
              padding: '9px 16px',
              borderRadius: '9px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#0f172a',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RefreshCw size={15} className={loading ? 'spin-animation' : ''} />
            Refresh
          </button>

          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => setShowPurgeModal(true)}
              style={{
                padding: '9px 16px',
                borderRadius: '9px',
                border: '1px solid #fca5a5',
                background: 'rgba(239, 68, 68, 0.08)',
                color: '#dc2626',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Trash2 size={15} />
              Purge Company Logs
            </button>
          )}
        </div>
      </div>

      {/* Filter & Control Bar */}
      <div style={{
        background: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        padding: '16px 20px',
        marginBottom: '20px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px',
        alignItems: 'center'
      }}>
        
        {/* SuperAdmin Company Switcher */}
        {isSuperAdmin && (
          <div>
            <label style={{ fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
              🏢 Filter Company
            </label>
            <select
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '12.5px',
                fontWeight: '700',
                color: '#0f172a',
                outline: 'none',
                background: '#f8fafc'
              }}
            >
              <option value="all">🌐 All Companies (Global View)</option>
              {(superadminCompanies || []).map((c) => (
                <option key={c.tenant_id || c.id} value={c.tenant_id || c.id}>
                  🏢 {c.company_name || c.name || `Company #${c.tenant_id || c.id}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Module Filter */}
        <div>
          <label style={{ fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
            📦 Filter Module
          </label>
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '12.5px',
              fontWeight: '700',
              color: '#0f172a',
              outline: 'none',
              background: '#f8fafc'
            }}
          >
            <option value="all">All Modules</option>
            <option value="crm_pipeline">CRM Pipeline & Deals</option>
            <option value="telecalling">Telecalling & Calls</option>
            <option value="whatsapp">WhatsApp Web</option>
            <option value="employees">Employees & HR</option>
            <option value="tasks">Tasks & Projects</option>
            <option value="expenses">Expenses & Finance</option>
            <option value="security">Security & Auth</option>
            <option value="settings">System Settings</option>
          </select>
        </div>

        {/* Action Type Filter */}
        <div>
          <label style={{ fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
            ⚡ Action Type
          </label>
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '12.5px',
              fontWeight: '700',
              color: '#0f172a',
              outline: 'none',
              background: '#f8fafc'
            }}
          >
            <option value="all">All Action Types</option>
            <option value="created">Record Created</option>
            <option value="updated">Record Updated</option>
            <option value="deleted">Record Deleted</option>
            <option value="stage">Stage Changed</option>
            <option value="call">Call Placed</option>
            <option value="wa_">WhatsApp Event</option>
            <option value="security">Security Event</option>
          </select>
        </div>

        {/* Search Query */}
        <div>
          <label style={{ fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
            🔍 Search Keyword
          </label>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search actor, lead, IP, action..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 32px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '12.5px',
                fontWeight: '600',
                color: '#0f172a',
                outline: 'none',
                background: '#f8fafc',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>
      </div>

      {/* Logs Table Card */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f8fafc'
        }}>
          <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
            Activity Log Records ({filteredLogs.length} events found)
          </div>
          <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '600' }}>
            Scope: <strong style={{ color: '#0d9488' }}>{getSelectedCompanyName()}</strong>
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '11.5px', fontWeight: '800', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 16px' }}>Timestamp</th>
                {isSuperAdmin && <th style={{ padding: '12px 16px' }}>Tenant</th>}
                <th style={{ padding: '12px 16px' }}>Actor</th>
                <th style={{ padding: '12px 16px' }}>Module</th>
                <th style={{ padding: '12px 16px' }}>Action</th>
                <th style={{ padding: '12px 16px' }}>Resource</th>
                <th style={{ padding: '12px 16px' }}>Details</th>
                <th style={{ padding: '12px 16px' }}>IP / Device</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Diff</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log, idx) => {
                  const badgeStyle = getActionBadgeColor(log.action);
                  const hasDiff = Boolean(log.old_value || log.oldValue || log.new_value || log.newValue);

                  return (
                    <tr key={log.id || idx} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '12.5px' }}>
                      <td style={{ padding: '12px 16px', color: '#64748b', whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: '11.5px' }}>
                        {new Date(log.created_at || Date.now()).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                      </td>

                      {isSuperAdmin && (
                        <td style={{ padding: '12px 16px', fontWeight: '700', color: '#0f766e' }}>
                          #{log.tenant_id || log.tenantId || '1'}
                        </td>
                      )}

                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: '700', color: '#0f172a' }}>{log.user_name || log.userName || 'System'}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{log.user_email || log.userEmail || (log.user_role || log.userRole || 'staff')}</div>
                      </td>

                      <td style={{ padding: '12px 16px', textTransform: 'capitalize', fontWeight: '600', color: '#334155' }}>
                        {log.module || 'General'}
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '800',
                          background: badgeStyle.bg,
                          color: badgeStyle.color,
                          border: `1px solid ${badgeStyle.border}`,
                          display: 'inline-block'
                        }}>
                          {log.action}
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px', fontWeight: '700', color: '#0f172a' }}>
                        {log.resource_name || log.resourceName || '-'}
                      </td>

                      <td style={{ padding: '12px 16px', color: '#475569', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.details || '-'}
                      </td>

                      <td style={{ padding: '12px 16px', fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                        {log.ip_address || log.ipAddress || '127.0.0.1'}
                      </td>

                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        {hasDiff ? (
                          <button
                            type="button"
                            onClick={() => setSelectedLogForDiff(log)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              background: '#f8fafc',
                              color: '#0d9488',
                              fontSize: '11px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Eye size={12} />
                            Diff
                          </button>
                        ) : (
                          <span style={{ color: '#cbd5e1' }}>-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={isSuperAdmin ? 9 : 8} style={{ padding: '48px 16px', textAlign: 'center', color: '#64748b' }}>
                    <Activity size={36} style={{ color: '#cbd5e1', margin: '0 auto 12px auto' }} />
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>No audit events found</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                      Perform any action (lead update, call, or edit) to see automatic real-time audit logging.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visual Diff Inspector Modal */}
      {selectedLogForDiff && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
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
            overflowY: 'auto',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Eye size={18} style={{ color: '#0d9488' }} />
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                  Visual Forensic Diff: {selectedLogForDiff.action}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLogForDiff(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              <div style={{ fontSize: '13px', color: '#334155', marginBottom: '16px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <strong>Target:</strong> {selectedLogForDiff.resource_name || selectedLogForDiff.resourceName || '-'} <br />
                <strong>Details:</strong> {selectedLogForDiff.details}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Old Value */}
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '10px',
                  padding: '14px'
                }}>
                  <div style={{ fontSize: '11.5px', fontWeight: '800', color: '#991b1b', textTransform: 'uppercase', marginBottom: '8px' }}>
                    🔴 Previous Value (Before)
                  </div>
                  <pre style={{ margin: 0, fontSize: '11px', color: '#7f1d1d', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace' }}>
                    {typeof (selectedLogForDiff.old_value || selectedLogForDiff.oldValue) === 'object'
                      ? JSON.stringify(selectedLogForDiff.old_value || selectedLogForDiff.oldValue, null, 2)
                      : String(selectedLogForDiff.old_value || selectedLogForDiff.oldValue || 'None')}
                  </pre>
                </div>

                {/* New Value */}
                <div style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '10px',
                  padding: '14px'
                }}>
                  <div style={{ fontSize: '11.5px', fontWeight: '800', color: '#166534', textTransform: 'uppercase', marginBottom: '8px' }}>
                    🟢 New Value (After)
                  </div>
                  <pre style={{ margin: 0, fontSize: '11px', color: '#14532d', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace' }}>
                    {typeof (selectedLogForDiff.new_value || selectedLogForDiff.newValue) === 'object'
                      ? JSON.stringify(selectedLogForDiff.new_value || selectedLogForDiff.newValue, null, 2)
                      : String(selectedLogForDiff.new_value || selectedLogForDiff.newValue || 'None')}
                  </pre>
                </div>
              </div>
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9', background: '#f8fafc', textAlign: 'right' }}>
              <button
                type="button"
                onClick={() => setSelectedLogForDiff(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: '#0f172a',
                  color: '#ffffff',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Super Admin Company Purge Confirmation Modal */}
      {showPurgeModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
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
            maxWidth: '520px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            border: '1px solid #fee2e2'
          }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #fee2e2', display: 'flex', alignItems: 'center', gap: '12px', background: '#fff1f2' }}>
              <AlertTriangle size={24} style={{ color: '#e11d48' }} />
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#9f1239', margin: 0 }}>
                  Purge Audit Logs Confirmation
                </h3>
                <span style={{ fontSize: '11.5px', color: '#be123c' }}>
                  Target Company: <strong>{getSelectedCompanyName()}</strong>
                </span>
              </div>
            </div>

            <div style={{ padding: '20px' }}>
              <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.5', margin: '0 0 14px 0' }}>
                You are about to permanently delete audit log history for <strong>{getSelectedCompanyName()}</strong>.
                {selectedTenantId === 'all' 
                  ? ' ⚠️ This will delete logs for ALL companies!' 
                  : ' ✅ All other companies\' logs will remain 100% untouched and safe.'}
              </p>

              <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '6px' }}>
                Type <strong style={{ color: '#e11d48' }}>PURGE</strong> to confirm:
              </label>
              <input
                type="text"
                placeholder="PURGE"
                value={purgeConfirmationText}
                onChange={(e) => setPurgeConfirmationText(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  fontWeight: '700',
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ padding: '14px 20px', borderTop: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => { setShowPurgeModal(false); setPurgeConfirmationText(''); }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePurgeLogs}
                disabled={purging || purgeConfirmationText.trim().toUpperCase() !== 'PURGE'}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  background: purgeConfirmationText.trim().toUpperCase() === 'PURGE' ? '#e11d48' : '#cbd5e1',
                  color: '#ffffff',
                  fontSize: '12.5px',
                  fontWeight: '800',
                  cursor: purgeConfirmationText.trim().toUpperCase() === 'PURGE' ? 'pointer' : 'not-allowed'
                }}
              >
                {purging ? 'Purging...' : 'Confirm Purge'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}