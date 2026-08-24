import React, { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, AlertCircle, Clock, Search, Eye, Check, X, FileText, Building, User, Phone, Mail, MapPin, ExternalLink, RefreshCw } from 'lucide-react';

export default function SuperAdminKycHub({ showToast }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedKyc, setSelectedKyc] = useState(null);
  const [adminRemarks, setAdminRemarks] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/superadmin/kyc/all');
      const data = await res.json();
      if (data.success && data.submissions) {
        setSubmissions(data.submissions);
      }
    } catch (err) {
      if (showToast) showToast('Failed to fetch KYC submissions', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const handleReviewAction = async (status) => {
    if (!selectedKyc) return;
    setProcessing(true);

    try {
      const res = await fetch('/api/superadmin/kyc/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: selectedKyc.tenant_id,
          status,
          remarks: adminRemarks
        })
      });
      const data = await res.json();
      if (data.success) {
        if (showToast) showToast(`KYC submission ${status === 'verified' ? 'Approved & Verified' : 'Rejected'}!`, 'success');
        setSelectedKyc(null);
        setAdminRemarks('');
        fetchSubmissions();
      } else {
        if (showToast) showToast(data.error || 'Failed to update KYC status', 'error');
      }
    } catch (err) {
      if (showToast) showToast(`Review error: ${err.message}`, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const filtered = submissions.filter((item) => {
    const matchesSearch =
      (item.company_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.auth_person_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.gst_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(item.tenant_id).includes(searchTerm);

    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalCount = submissions.length;
  const pendingCount = submissions.filter((s) => s.status === 'pending').length;
  const verifiedCount = submissions.filter((s) => s.status === 'verified').length;
  const rejectedCount = submissions.filter((s) => s.status === 'rejected').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f2b26', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={20} style={{ color: '#0d9488' }} />
            <span>KYC & Business Compliance Verification Hub</span>
          </h3>
          <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
            Review company registration proofs, GST certificates, Aadhaar IDs, and authorize tenant calling access.
          </p>
        </div>

        <button
          onClick={fetchSubmissions}
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
          <span>Refresh List</span>
        </button>
      </div>

      {/* METRIC CARDS IN NATIVE APP THEME */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #0d9488', borderRadius: '10px', padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Total Submissions</div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f2b26', marginTop: '4px' }}>{totalCount}</div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #f59e0b', borderRadius: '10px', padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '11.5px', color: '#d97706', fontWeight: '700', textTransform: 'uppercase' }}>Pending Review</div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#d97706', marginTop: '4px' }}>{pendingCount}</div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #10b981', borderRadius: '10px', padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '11.5px', color: '#059669', fontWeight: '700', textTransform: 'uppercase' }}>Verified & Approved</div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#059669', marginTop: '4px' }}>{verifiedCount}</div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #ef4444', borderRadius: '10px', padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '11.5px', color: '#dc2626', fontWeight: '700', textTransform: 'uppercase' }}>Action Required</div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#dc2626', marginTop: '4px' }}>{rejectedCount}</div>
        </div>
      </div>

      {/* FILTER BUTTONS & SEARCH BAR */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {[
            { id: 'all', label: 'All Submissions' },
            { id: 'pending', label: '⚡ Pending Review' },
            { id: 'verified', label: '🟢 Verified' },
            { id: 'rejected', label: '🔴 Action Required' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              style={{
                background: statusFilter === tab.id ? 'rgba(13, 148, 136, 0.12)' : '#ffffff',
                border: statusFilter === tab.id ? '1.5px solid #0d9488' : '1px solid #cbd5e1',
                color: statusFilter === tab.id ? '#0d9488' : '#475569',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Box */}
        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search company, owner, GST..."
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

      {/* SUBMISSIONS TABLE IN NATIVE CLEAN LIGHT THEME */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '12px 16px', fontSize: '12px', color: '#475569', fontWeight: '700' }}>Tenant & Company</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', color: '#475569', fontWeight: '700' }}>Authorized Signatory</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', color: '#475569', fontWeight: '700' }}>GST / Business ID</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', color: '#475569', fontWeight: '700' }}>Submitted On</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', color: '#475569', fontWeight: '700' }}>KYC Status</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', color: '#475569', fontWeight: '700', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                  No KYC submissions found matching criteria.
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.id || item.tenant_id} style={{ borderBottom: '1px solid #f1f5f9', background: '#ffffff' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#0f2b26' }}>
                      {item.company_name || `Company #${item.tenant_id}`}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                      Tenant #{item.tenant_id} • {item.state || 'Punjab'}, {item.country || 'India'}
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                      {item.auth_person_name || 'N/A'}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                      {item.auth_person_phone || item.auth_person_email}
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: '12.5px', fontFamily: 'monospace', color: '#0d9488', fontWeight: '700' }}>
                      {item.gst_number || 'Not Provided'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      {item.company_proof_url ? '📄 Proof Attached' : '⚠️ No Doc'}
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px', fontSize: '12.5px', color: '#64748b' }}>
                    {item.submitted_at ? new Date(item.submitted_at).toLocaleDateString() : 'N/A'}
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    {item.status === 'verified' && (
                      <span style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '4px 10px', borderRadius: '6px', fontSize: '11.5px', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={13} /> Verified
                      </span>
                    )}
                    {item.status === 'pending' && (
                      <span style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#d97706', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '4px 10px', borderRadius: '6px', fontSize: '11.5px', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={13} /> Pending Review
                      </span>
                    )}
                    {item.status === 'rejected' && (
                      <span style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '4px 10px', borderRadius: '6px', fontSize: '11.5px', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <AlertCircle size={13} /> Action Required
                      </span>
                    )}
                    {(!item.status || item.status === 'not_submitted') && (
                      <span style={{ background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0', padding: '4px 10px', borderRadius: '6px', fontSize: '11.5px', fontWeight: '600' }}>
                        Not Submitted
                      </span>
                    )}
                  </td>

                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <button
                      onClick={() => {
                        setSelectedKyc(item);
                        setAdminRemarks(item.admin_remarks || '');
                      }}
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
                      <Eye size={13} />
                      <span>Review</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* REVIEW & INSPECTION MODAL IN NATIVE CLEAN THEME */}
      {selectedKyc && (
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
            width: '780px',
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
                  Review KYC: {selectedKyc.company_name || `Company #${selectedKyc.tenant_id}`}
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                  Tenant ID: #{selectedKyc.tenant_id} • Current Status: <strong style={{ color: '#0d9488' }}>{selectedKyc.status?.toUpperCase()}</strong>
                </p>
              </div>

              <button
                onClick={() => setSelectedKyc(null)}
                style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Side-by-Side Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* COMPANY DETAILS */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
                <h4 style={{ fontSize: '13.5px', fontWeight: '800', color: '#0d9488', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building size={16} />
                  <span>Company Information</span>
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
                  <div><span style={{ color: '#64748b' }}>Company Name:</span> <strong style={{ color: '#0f2b26' }}>{selectedKyc.company_name}</strong></div>
                  <div><span style={{ color: '#64748b' }}>GST Number:</span> <strong style={{ color: '#0d9488', fontFamily: 'monospace' }}>{selectedKyc.gst_number || 'N/A'}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Address:</span> <span style={{ color: '#334155' }}>{selectedKyc.address || 'N/A'}</span></div>
                  <div><span style={{ color: '#64748b' }}>State & PIN:</span> <span style={{ color: '#334155' }}>{selectedKyc.state}, {selectedKyc.pincode}</span></div>
                  <div><span style={{ color: '#64748b' }}>Country:</span> <span style={{ color: '#334155' }}>{selectedKyc.country || 'India'}</span></div>
                </div>

                <div style={{ marginTop: '14px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px', fontWeight: '700' }}>Company Proof Document:</div>
                  {selectedKyc.company_proof_url ? (
                    <a
                      href={selectedKyc.company_proof_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        background: 'rgba(13, 148, 136, 0.1)',
                        color: '#0d9488',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '700',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        textDecoration: 'none',
                        border: '1px solid rgba(13, 148, 136, 0.2)'
                      }}
                    >
                      <ExternalLink size={13} />
                      <span>View Uploaded GST Certificate</span>
                    </a>
                  ) : (
                    <span style={{ color: '#dc2626', fontSize: '12px' }}>⚠️ No document uploaded</span>
                  )}
                </div>
              </div>

              {/* AUTHORIZED SIGNATORY */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
                <h4 style={{ fontSize: '13.5px', fontWeight: '800', color: '#0d9488', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={16} />
                  <span>Authorized Signatory</span>
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
                  <div><span style={{ color: '#64748b' }}>Signatory Name:</span> <strong style={{ color: '#0f2b26' }}>{selectedKyc.auth_person_name}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Phone:</span> <strong style={{ color: '#0f2b26' }}>{selectedKyc.auth_person_phone}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Email:</span> <span style={{ color: '#334155' }}>{selectedKyc.auth_person_email}</span></div>
                  <div><span style={{ color: '#64748b' }}>Address:</span> <span style={{ color: '#334155' }}>{selectedKyc.auth_person_address}</span></div>
                  <div><span style={{ color: '#64748b' }}>ID Proof:</span> <span style={{ color: '#334155' }}>{selectedKyc.id_proof_type || 'Aadhaar'}</span></div>
                </div>

                <div style={{ marginTop: '14px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px', fontWeight: '700' }}>Signatory ID Document:</div>
                  {selectedKyc.id_proof_url ? (
                    <a
                      href={selectedKyc.id_proof_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        background: 'rgba(13, 148, 136, 0.1)',
                        color: '#0d9488',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '700',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        textDecoration: 'none',
                        border: '1px solid rgba(13, 148, 136, 0.2)'
                      }}
                    >
                      <ExternalLink size={13} />
                      <span>View Uploaded Aadhaar / ID</span>
                    </a>
                  ) : (
                    <span style={{ color: '#dc2626', fontSize: '12px' }}>⚠️ No ID uploaded</span>
                  )}
                </div>
              </div>
            </div>

            {/* Admin Remarks Input */}
            <div style={{ marginTop: '20px' }}>
              <label style={{ fontSize: '12px', color: '#334155', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                Admin Compliance Remarks (Visible to Tenant if Rejected):
              </label>
              <textarea
                value={adminRemarks}
                onChange={(e) => setAdminRemarks(e.target.value)}
                placeholder="e.g. GST Certificate verified successfully OR Aadhaar photo is blur, please re-upload..."
                rows={3}
                style={{
                  width: '100%',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  color: '#0f2b26',
                  fontSize: '13px',
                  outline: 'none',
                  resize: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Decision Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
              <button
                type="button"
                onClick={() => setSelectedKyc(null)}
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
                Close
              </button>

              <button
                type="button"
                disabled={processing}
                onClick={() => handleReviewAction('rejected')}
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  padding: '8px 18px',
                  borderRadius: '8px',
                  color: '#dc2626',
                  fontSize: '12.5px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <X size={15} />
                <span>Reject with Remarks</span>
              </button>

              <button
                type="button"
                disabled={processing}
                onClick={() => handleReviewAction('verified')}
                style={{
                  background: 'linear-gradient(135deg, #0d9488 0%, #10b981 100%)',
                  border: 'none',
                  padding: '8px 24px',
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
                <Check size={15} />
                <span>Approve & Verify KYC</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}