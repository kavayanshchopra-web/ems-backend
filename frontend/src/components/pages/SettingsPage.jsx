import React, { useState } from 'react';
import { Settings, Globe, ShieldCheck, CheckCircle2, Sliders, Database, Layers, ExternalLink, ArrowRight } from 'lucide-react';
import CompanyKycSettingsTab from '../settings/CompanyKycSettingsTab';

export default function SettingsPage({
  settingsError,
  language,
  setLanguage,
  showToast,
  authUser,
  openModuleConfigModal,
  systemDropdowns,
  onNavigateTab
}) {
  const [activeTab, setActiveTab] = useState('kyc_settings');

  return (
    <div className="settings-panel glass-panel" style={{ padding: '32px', margin: '16px', overflowY: 'auto', flexGrow: 1, borderRadius: '16px', background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(12px)', border: '1px solid rgba(226, 232, 240, 0.8)', color: '#0f2b26' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.15), rgba(16, 185, 129, 0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(13, 148, 136, 0.25)', color: '#0d9488' }}>
            <Settings size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#0f2b26', margin: 0 }}>General Settings & Workspace Control</h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0, marginTop: '2px', fontWeight: '500' }}>
              Manage business KYC verification, global form engines, custom fields, and workspace defaults.
            </p>
          </div>
        </div>

        {/* GLOBAL ENGINE ACTIONS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {openModuleConfigModal && (
            <button
              onClick={() => openModuleConfigModal('settings')}
              style={{
                background: '#ffffff',
                border: '1.5px solid #0d9488',
                color: '#0d9488',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(13, 148, 136, 0.08)'
              }}
            >
              <Sliders size={14} />
              <span>Configure Form Fields</span>
            </button>
          )}

          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('dropdowns')}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#334155',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Database size={14} style={{ color: '#0d9488' }} />
              <span>Global Dropdowns</span>
            </button>
          )}
        </div>
      </div>

      {/* SUB-TABS NAVIGATION IN APP NATIVE EMERALD THEME */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        borderBottom: '2px solid #e2e8f0',
        margin: '20px 0 24px',
        paddingBottom: '0'
      }}>
        {[
          { id: 'kyc_settings', label: '🛡️ KYC & Compliance' },
          { id: 'module_engines', label: '⚙️ Global Engines & Custom Fields' },
          { id: 'general_lang', label: '🌐 General & Language' },
          { id: 'documents', label: '📄 Documents & Agreement' }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: activeTab === tab.id ? 'rgba(13, 148, 136, 0.1)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '3px solid #0d9488' : '3px solid transparent',
              color: activeTab === tab.id ? '#0d9488' : '#64748b',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: activeTab === tab.id ? '800' : '600',
              cursor: 'pointer',
              borderRadius: '8px 8px 0 0',
              marginBottom: '-2px',
              transition: 'all 0.2s ease'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {settingsError && (
        <div style={{ padding: '14px 18px', background: 'rgba(239, 68, 68, 0.08)', color: '#dc2626', borderRadius: '10px', marginBottom: '20px', fontSize: '13px', fontWeight: '600', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>⚠️</span> {settingsError}
        </div>
      )}

      {/* TAB 1: KYC SETTINGS FORM */}
      {activeTab === 'kyc_settings' && (
        <CompanyKycSettingsTab authUser={authUser} showToast={showToast} />
      )}

      {/* TAB 2: GLOBAL ENGINES & CUSTOM FIELDS */}
      {activeTab === 'module_engines' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
          {/* Card 1: Module Config Center */}
          <div style={{ background: '#ffffff', border: '1px solid rgba(13, 148, 136, 0.2)', borderRadius: '14px', padding: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(13, 148, 136, 0.1)', color: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sliders size={20} />
              </div>
              <div>
                <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#0f2b26', margin: 0 }}>Module Config Center</h4>
                <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Add custom inputs, mandatory fields, and toggle module rules.</p>
              </div>
            </div>
            <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.5' }}>
              Control dynamic schema, required validation rules, and custom custom fields across all CRM & HRMS pages in real-time.
            </p>
            <button
              onClick={() => openModuleConfigModal && openModuleConfigModal('settings')}
              style={{
                marginTop: '12px',
                background: 'linear-gradient(135deg, #0d9488 0%, #10b981 100%)',
                border: 'none',
                color: '#ffffff',
                padding: '9px 18px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>Open Module Config</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Card 2: Global Dropdown Manager */}
          <div style={{ background: '#ffffff', border: '1px solid rgba(13, 148, 136, 0.2)', borderRadius: '14px', padding: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Database size={20} />
              </div>
              <div>
                <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#0f2b26', margin: 0 }}>Global Dropdowns Engine</h4>
                <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Manage options, lead stages, designations & departments.</p>
              </div>
            </div>
            <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.5' }}>
              Add, edit, or re-order dropdown choices globally without changing backend code.
            </p>
            <button
              onClick={() => onNavigateTab && onNavigateTab('dropdowns')}
              style={{
                marginTop: '12px',
                background: '#ffffff',
                border: '1.5px solid #2563eb',
                color: '#2563eb',
                padding: '9px 18px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>Manage Dropdowns</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: GENERAL & LANGUAGE TAB */}
      {activeTab === 'general_lang' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '680px' }}>
          <div style={{ background: '#ffffff', padding: '26px', borderRadius: '14px', border: '1px solid rgba(13, 148, 136, 0.2)', boxShadow: '0 4px 20px -2px rgba(13, 148, 136, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '18px' }}>
              <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(13, 148, 136, 0.1)', color: '#0d9488', border: '1px solid rgba(13, 148, 136, 0.2)' }}>
                <Globe size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f2b26', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  System Language & Regional Localization
                  <span style={{ fontSize: '10px', fontWeight: '800', background: 'rgba(13, 148, 136, 0.12)', color: '#0d9488', padding: '2px 8px', borderRadius: '12px', textTransform: 'uppercase' }}>Live Sync</span>
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: 0, marginTop: '4px', lineHeight: '1.4' }}>
                  Choose application interface language. Changes apply immediately across all modules and user sessions.
                </p>
              </div>
            </div>

            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Select Primary Language:
              </label>
              <select
                value={language}
                onChange={(e) => {
                  const newLang = e.target.value;
                  if (setLanguage) setLanguage(newLang);
                  localStorage.setItem('ems_language', newLang);
                  if (showToast) showToast('Language updated successfully!', 'success');
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '14px',
                  fontWeight: '700',
                  color: '#0f2b26',
                  background: '#f8fafc',
                  outline: 'none'
                }}
              >
                <option value="en">English (US / UK / Global)</option>
                <option value="hi">हिंदी (Hindi)</option>
                <option value="pa">ਪੰਜਾਬੀ (Punjabi)</option>
                <option value="es">Español (Spanish)</option>
                <option value="fr">Français (French)</option>
                <option value="de">Deutsch (German)</option>
                <option value="ar">العربية (Arabic)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: DOCUMENTS & AGREEMENT */}
      {activeTab === 'documents' && (
        <div style={{ background: '#ffffff', padding: '28px', borderRadius: '14px', border: '1px solid rgba(13, 148, 136, 0.2)', boxShadow: '0 4px 20px -2px rgba(13, 148, 136, 0.06)' }}>
          <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f2b26', margin: 0, marginBottom: '8px' }}>
            Commercial Telephony Service Agreement
          </h3>
          <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.6' }}>
            By using this commercial cloud telephony platform, your organization agrees to comply with National Telecom Regulations (TRAI / DoT), Do Not Disturb (DND) filtering, and fair usage policies.
          </p>
          <div style={{ marginTop: '16px', padding: '16px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <div style={{ fontSize: '13px', color: '#047857', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={16} />
              <span>Standard Terms & Master Service Agreement Active</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}