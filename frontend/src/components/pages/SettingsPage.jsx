import React from 'react';
import { Settings, Globe } from 'lucide-react';

export default function SettingsPage({
  settingsError,
  language,
  setLanguage,
  showToast
}) {
  return (
    <div className="settings-panel glass-panel" style={{ padding: '32px', margin: '16px', overflowY: 'auto', flexGrow: 1, borderRadius: '16px', background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(12px)', border: '1px solid rgba(226, 232, 240, 0.8)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
        <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.15), rgba(16, 185, 129, 0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(13, 148, 136, 0.25)', color: '#0d9488' }}>
          <Settings size={22} />
        </div>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#0f2b26', margin: 0, tracking: '-0.02em' }}>General Workspace Settings</h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0, marginTop: '2px', fontWeight: '500' }}>
            Configure primary workspace localization, regional language preferences, and global interface defaults.
          </p>
        </div>
      </div>

      <div style={{ height: '1px', background: 'linear-gradient(90deg, #cbd5e1 0%, rgba(203, 213, 225, 0) 100%)', margin: '20px 0 28px' }} />

      {settingsError && (
        <div style={{ padding: '14px 18px', background: 'rgba(239, 68, 68, 0.08)', color: '#dc2626', borderRadius: '10px', marginBottom: '20px', fontSize: '13px', fontWeight: '600', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>⚠️</span> {settingsError}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '680px' }}>
        {/* GLOBAL LANGUAGE DROPDOWN CARD */}
        <div style={{ background: '#ffffff', padding: '26px', borderRadius: '14px', border: '1px solid rgba(13, 148, 136, 0.2)', boxShadow: '0 4px 20px -2px rgba(13, 148, 136, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '18px' }}>
            <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(13, 148, 136, 0.1)', color: '#0d9488', border: '1px solid rgba(13, 148, 136, 0.2)' }}>
              <Globe size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f2b26', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                System Language & Regional Localization
                <span style={{ fontSize: '10px', fontWeight: '800', background: 'rgba(13, 148, 136, 0.12)', color: '#0d9488', padding: '2px 8px', borderRadius: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Live Sync</span>
              </h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0, marginTop: '4px', lineHeight: '1.4' }}>
                Choose application interface language. Changes apply immediately across all modules and user sessions.
              </p>
            </div>
          </div>

          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              🌐 Select Primary Language / भाषा चुनें:
            </label>
            <select
              value={language}
              onChange={(e) => {
                const newLang = e.target.value;
                if (setLanguage) setLanguage(newLang);
                localStorage.setItem('ems_language', newLang);
                if (showToast) showToast(`Language updated successfully!`, 'success');
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
                outline: 'none',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                transition: 'all 0.2s ease'
              }}
            >
              <option value="en">🇬🇧 English (Default)</option>
              <option value="hi">🇮🇳 हिंदी (Hindi)</option>
              <option value="hinglish">🇮🇳 Hinglish (Roman Hindi)</option>
              <option value="es">🇪🇸 Español (Spanish)</option>
              <option value="fr">🇫🇷 Français (French)</option>
              <option value="de">🇩🇪 Deutsch (German)</option>
              <option value="ar">🇸🇦 العربية (Arabic - RTL Layout)</option>
              <option value="zh">🇨🇳 中文 (Chinese)</option>
              <option value="ja">🇯🇵 日本語 (Japanese)</option>
              <option value="pt">🇧🇷 Português (Portuguese)</option>
              <option value="ru">🇷🇺 Русский (Russian)</option>
            </select>
          </div>
        </div>

        {/* Save Settings Trigger */}
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '4px' }}>
          <button
            className="btn btn-primary"
            type="button"
            style={{
              padding: '12px 24px',
              fontSize: '13px',
              fontWeight: '800',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0d9488 0%, #059669 100%)',
              color: '#ffffff',
              border: 'none',
              boxShadow: '0 4px 14px rgba(13, 148, 136, 0.35)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onClick={() => showToast && showToast('General settings saved!', 'success')}
          >
            💾 Save General Settings
          </button>
        </div>
      </div>
    </div>
  );
}
