import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, CheckCircle2, AlertCircle, Clock, Upload, FileText, User, Building, Phone, Mail, MapPin, Save, ExternalLink, Camera, ArrowRight, Sliders } from 'lucide-react';
import { moduleConfigService } from '../../services/moduleConfigService';

export default function CompanyKycSettingsTab({ authUser, showToast, onOpenModuleConfig }) {
  const [kycData, setKycData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const companyId = authUser?.companyId || 'default_tenant';

  // Dynamic Module Configuration
  const [moduleConfig, setModuleConfig] = useState(() =>
    moduleConfigService.getModuleConfig(companyId, 'workspace_kyc')
  );

  const [formData, setFormData] = useState({
    company_name: '',
    country: 'India',
    state: '',
    pincode: '',
    address: '',
    gst_number: '',
    company_proof_type: 'GST Registration Certificate',
    company_proof_url: '',
    auth_person_name: '',
    auth_person_email: '',
    auth_person_phone: '',
    auth_person_country: 'India',
    auth_person_address: '',
    auth_person_pincode: '',
    id_proof_type: 'Aadhaar Card',
    id_proof_url: '',
    profile_photo_url: ''
  });

  const fileInputRefs = useRef({});

  const reloadModuleConfig = () => {
    const cfg = moduleConfigService.getModuleConfig(companyId, 'workspace_kyc');
    setModuleConfig(cfg);
  };

  useEffect(() => {
    reloadModuleConfig();
    const handleConfigUpdate = (e) => {
      if (e.detail?.moduleId === 'workspace_kyc' || !e.detail?.moduleId) {
        reloadModuleConfig();
      }
    };
    window.addEventListener('omnilflow_config_updated', handleConfigUpdate);
    return () => window.removeEventListener('omnilflow_config_updated', handleConfigUpdate);
  }, [companyId]);

  const fetchKycProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/kyc/profile');
      const data = await res.json();
      if (data.success && data.kyc) {
        setKycData(data.kyc);
        if (data.kyc.submitted_at || data.kyc.status !== 'not_submitted') {
          setFormData({
            company_name: data.kyc.company_name || '',
            country: data.kyc.country || 'India',
            state: data.kyc.state || '',
            pincode: data.kyc.pincode || '',
            address: data.kyc.address || '',
            gst_number: data.kyc.gst_number || '',
            company_proof_type: data.kyc.company_proof_type || 'GST Registration Certificate',
            company_proof_url: data.kyc.company_proof_url || '',
            auth_person_name: data.kyc.auth_person_name || '',
            auth_person_email: data.kyc.auth_person_email || '',
            auth_person_phone: data.kyc.auth_person_phone || '',
            auth_person_country: data.kyc.auth_person_country || 'India',
            auth_person_address: data.kyc.auth_person_address || '',
            auth_person_pincode: data.kyc.auth_person_pincode || '',
            id_proof_type: data.kyc.id_proof_type || 'Aadhaar Card',
            id_proof_url: data.kyc.id_proof_url || '',
            profile_photo_url: data.kyc.profile_photo_url || '',
            ...data.kyc.custom_data // preserve dynamic custom fields
          });
        }
      }
    } catch (err) {
      if (showToast) showToast('Failed to load KYC status', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKycProfile();
  }, []);

  const handleFileUpload = (e, fieldKey) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({ ...prev, [fieldKey]: reader.result }));
      if (showToast) showToast(`${file.name} attached successfully!`, 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch('/api/kyc/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        setKycData(data.kyc);
        if (showToast) showToast('KYC details submitted successfully for Super Admin verification!', 'success');
      } else {
        if (showToast) showToast(data.error || 'Failed to submit KYC', 'error');
      }
    } catch (err) {
      if (showToast) showToast(`Submission error: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        Loading KYC Verification Form...
      </div>
    );
  }

  const status = kycData?.status || 'not_submitted';
  const fields = moduleConfig?.fields || [];

  // Group fields into Sections
  const companyFields = fields.filter((f) => f.section === 'company' || (!f.section && ['company_name', 'country', 'state', 'pincode', 'address', 'gst_number', 'company_proof_url'].includes(f.key)));
  const signatoryFields = fields.filter((f) => f.section === 'signatory' || (!f.section && ['auth_person_name', 'auth_person_email', 'auth_person_phone', 'auth_person_address', 'profile_photo_url', 'id_proof_url'].includes(f.key)));
  const customFields = fields.filter((f) => !companyFields.includes(f) && !signatoryFields.includes(f));

  const renderField = (f) => {
    const isRequired = f.required !== false;
    const label = f.label || f.key;
    const placeholder = f.placeholder || `Enter ${label}`;
    const value = formData[f.key] !== undefined ? formData[f.key] : (f.defaultValue || '');

    if (f.type === 'file' || f.type === 'image') {
      const isAttached = Boolean(formData[f.key]);
      return (
        <div key={f.id || f.key}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
            {label} {isRequired && <span style={{ color: '#ef4444' }}>*</span>}
          </label>
          <input
            type="file"
            ref={(el) => (fileInputRefs.current[f.key] = el)}
            onChange={(e) => handleFileUpload(e, f.key)}
            accept={f.type === 'image' ? 'image/*' : 'image/*,application/pdf'}
            style={{ display: 'none' }}
          />
          <div
            onClick={() => fileInputRefs.current[f.key] && fileInputRefs.current[f.key].click()}
            style={{
              border: '1.5px dashed #0d9488',
              borderRadius: '8px',
              padding: '10px 14px',
              textAlign: 'center',
              cursor: 'pointer',
              background: 'rgba(13, 148, 136, 0.04)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {f.type === 'image' ? <Camera size={16} style={{ color: '#0d9488' }} /> : <Upload size={16} style={{ color: '#0d9488' }} />}
            <span style={{ fontSize: '12.5px', color: '#0d9488', fontWeight: '700' }}>
              {isAttached ? `📄 ${label} Attached (Click to Change)` : placeholder}
            </span>
          </div>
        </div>
      );
    }

    if (f.type === 'textarea') {
      return (
        <div key={f.id || f.key} style={{ gridColumn: 'span 2' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
            {label} {isRequired && <span style={{ color: '#ef4444' }}>*</span>}
          </label>
          <textarea
            placeholder={placeholder}
            value={value}
            onChange={(e) => setFormData({ ...formData, [f.key]: e.target.value })}
            required={isRequired}
            rows={2}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1.5px solid #cbd5e1',
              fontSize: '13px',
              color: '#0f2b26',
              background: '#f8fafc',
              outline: 'none',
              resize: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>
      );
    }

    return (
      <div key={f.id || f.key}>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
          {label} {isRequired && <span style={{ color: '#ef4444' }}>*</span>}
        </label>
        <input
          type={f.type === 'email' ? 'email' : f.type === 'number' ? 'number' : 'text'}
          placeholder={placeholder}
          value={value}
          onChange={(e) => setFormData({ ...formData, [f.key]: e.target.value })}
          required={isRequired}
          style={{
            width: '100%',
            padding: '10px 14px',
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
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* STATUS BANNERS */}
      {status === 'verified' && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(13, 148, 136, 0.08))',
          border: '1.5px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#10b981', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={22} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f2b26' }}>
                KYC Verification Completed & Approved
              </div>
              <div style={{ fontSize: '12px', color: '#047857', marginTop: '2px' }}>
                Your business KYC is verified. Commercial cloud telephony and outbound calling are fully active.
              </div>
            </div>
          </div>
          <span style={{ background: '#10b981', color: '#ffffff', fontSize: '11px', fontWeight: '800', padding: '4px 12px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Verified
          </span>
        </div>
      )}

      {status === 'pending' && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(217, 119, 6, 0.08))',
          border: '1.5px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f59e0b', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={22} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#78350f' }}>
                KYC Submission Under Review
              </div>
              <div style={{ fontSize: '12px', color: '#92400e', marginTop: '2px' }}>
                Your business documents have been submitted and are currently being reviewed by the Super Admin compliance team.
              </div>
            </div>
          </div>
          <span style={{ background: '#f59e0b', color: '#ffffff', fontSize: '11px', fontWeight: '800', padding: '4px 12px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Pending Review
          </span>
        </div>
      )}

      {status === 'rejected' && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(220, 38, 38, 0.08))',
          border: '1.5px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#ef4444', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertCircle size={22} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#7f1d1d' }}>
                KYC Action Required: Submission Rejected
              </div>
              <div style={{ fontSize: '12px', color: '#991b1b', marginTop: '2px' }}>
                Remarks: <strong>{kycData?.admin_remarks || 'Document unreadable, please re-upload.'}</strong>
              </div>
            </div>
          </div>
          <span style={{ background: '#ef4444', color: '#ffffff', fontSize: '11px', fontWeight: '800', padding: '4px 12px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Action Required
          </span>
        </div>
      )}

      {/* DYNAMIC KYC FORM (DRIVEN BY MASTER MODULE REGISTRY) */}
      <form onSubmit={handleFormSubmit} style={{
        background: '#ffffff',
        border: '1px solid rgba(13, 148, 136, 0.2)',
        borderRadius: '14px',
        padding: '28px',
        boxShadow: '0 4px 20px -2px rgba(13, 148, 136, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.03)'
      }}>
        {/* SECTION 1: COMPANY INFORMATION */}
        {companyFields.length > 0 && (
          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(13, 148, 136, 0.1)', color: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Building size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f2b26', margin: 0 }}>
                  1. Company & Business Information
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: 0, marginTop: '2px' }}>
                  Registered company name, tax credentials, and business proof documents.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              {companyFields.map((f) => renderField(f))}
            </div>
          </div>
        )}

        {/* SECTION 2: AUTHORIZED SIGNATORY */}
        {signatoryFields.length > 0 && (
          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(13, 148, 136, 0.1)', color: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f2b26', margin: 0 }}>
                  2. Authorized Person & Signatory Details
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: 0, marginTop: '2px' }}>
                  Information of business owner or designated telecom compliance officer.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              {signatoryFields.map((f) => renderField(f))}
            </div>
          </div>
        )}

        {/* SECTION 3: CUSTOM FIELDS (IF ANY CONFIGURED VIA MODULE CONFIG) */}
        {customFields.length > 0 && (
          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sliders size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f2b26', margin: 0 }}>
                  3. Additional Custom KYC Fields
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: 0, marginTop: '2px' }}>
                  Custom compliance parameters configured via Module Configuration Center.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              {customFields.map((f) => renderField(f))}
            </div>
          </div>
        )}

        {/* SUBMIT BUTTON */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', paddingTop: '18px', borderTop: '1px solid #f1f5f9' }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              background: 'linear-gradient(135deg, #0d9488 0%, #10b981 100%)',
              border: 'none',
              padding: '12px 28px',
              borderRadius: '10px',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '800',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(13, 148, 136, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Save size={16} />
            <span>{saving ? 'Submitting KYC...' : 'Submit KYC for Verification'}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}