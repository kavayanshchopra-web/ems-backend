import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Save,
  RotateCcw,
  Eye,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Users,
  TrendingUp,
  Settings,
  BarChart3,
  Globe,
  Lock,
  Layers
} from 'lucide-react';
import loginConfigService, { DEFAULT_LOGIN_CONFIG } from '../../core/services/loginConfigService';

export default function SuperAdminLoginStudio({ authUser = null, showToast = () => {} }) {
  const [config, setConfig] = useState(DEFAULT_LOGIN_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeStudioTab, setActiveStudioTab] = useState('hero'); // 'hero' | 'features' | 'card' | 'preview'

  useEffect(() => {
    async function load() {
      try {
        const loaded = await loginConfigService.getLoginConfig();
        setConfig(loaded);
      } catch (e) {
        console.warn('Failed to load login config in studio:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async () => {
    if (!authUser || authUser.role !== 'superadmin') {
      showToast('Unauthorized: Only Super Admin can modify global Login Page configuration.', 'error');
      return;
    }
    setSaving(true);
    try {
      await loginConfigService.saveLoginConfig(config, authUser);
      showToast('Login Page configuration published successfully!', 'success');
    } catch (err) {
      console.error('Error saving login config:', err);
      showToast(err.message || 'Failed to save configuration', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset all Login Page copy and configuration to original defaults?')) {
      setConfig({ ...DEFAULT_LOGIN_CONFIG });
      showToast('Reset to system defaults. Click Save to publish.', 'info');
    }
  };

  const updateFeature = (index, field, value) => {
    const updatedFeatures = [...(config.features || [])];
    updatedFeatures[index] = {
      ...updatedFeatures[index],
      [field]: value
    };
    setConfig(prev => ({ ...prev, features: updatedFeatures }));
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        <div style={{ fontSize: '14px', fontWeight: '600' }}>Loading Login Page Studio...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 28px', background: '#f8fafc', minHeight: '80vh', fontFamily: 'var(--font-body)' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#ffffff',
        padding: '20px 24px',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #064e43 0%, #0db49e 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 4px 12px rgba(13, 180, 158, 0.25)'
          }}>
            <Sparkles size={22} />
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
              OmniFlow Login Page Studio
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
              Configure marketing headlines, feature points, auth labels, and laptop visual for the public login screen.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={handleResetDefaults}
            disabled={saving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              borderRadius: '8px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#475569',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <RotateCcw size={14} /> Reset Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #064e43 0%, #0db49e 100%)',
              border: 'none',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(13, 180, 158, 0.25)'
            }}
          >
            {saving ? <Sliders size={15} className="spin" /> : <Save size={15} />}
            {saving ? 'Saving...' : 'Publish Changes'}
          </button>
        </div>
      </div>

      {/* Navigation Subtabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {[
          { id: 'hero', label: '📢 Hero & Headlines' },
          { id: 'features', label: '✨ 4 Feature Points' },
          { id: 'card', label: '🔐 Login Card & Actions' },
          { id: 'visuals', label: '💻 Visuals & Toggles' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveStudioTab(tab.id)}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              border: activeStudioTab === tab.id ? '1px solid #0db49e' : '1px solid #e2e8f0',
              background: activeStudioTab === tab.id ? '#f0fdf4' : '#ffffff',
              color: activeStudioTab === tab.id ? '#064e43' : '#64748b',
              fontWeight: activeStudioTab === tab.id ? '700' : '600',
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Hero & Headlines */}
      {activeStudioTab === 'hero' && (
        <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
            Hero Marketing Header
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Eyebrow Tagline
              </label>
              <input
                type="text"
                value={config.heroTagline || ''}
                onChange={e => setConfig({ ...config, heroTagline: e.target.value })}
                placeholder="e.g. WELCOME TO OMNIFLOW"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Brand Sub-tagline
              </label>
              <input
                type="text"
                value={config.brandTagline || ''}
                onChange={e => setConfig({ ...config, brandTagline: e.target.value })}
                placeholder="e.g. Manage · Automate · Grow"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
              Main Headline
            </label>
            <input
              type="text"
              value={config.heroHeading || ''}
              onChange={e => setConfig({ ...config, heroHeading: e.target.value })}
              placeholder="e.g. Streamline Your Business, Effortlessly."
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
              Accent Highlight Word (styled in Teal Green)
            </label>
            <input
              type="text"
              value={config.heroHighlightWord || ''}
              onChange={e => setConfig({ ...config, heroHighlightWord: e.target.value })}
              placeholder="e.g. Effortlessly."
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
              Supporting Description
            </label>
            <textarea
              rows={3}
              value={config.heroDescription || ''}
              onChange={e => setConfig({ ...config, heroDescription: e.target.value })}
              placeholder="An all-in-one platform to manage your team..."
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Handwritten Doodle Text
              </label>
              <input
                type="text"
                value={config.workSmarterBadgeText || ''}
                onChange={e => setConfig({ ...config, workSmarterBadgeText: e.target.value })}
                placeholder="e.g. Work Smarter Together"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Footer Badge Text
              </label>
              <input
                type="text"
                value={config.footerText || ''}
                onChange={e => setConfig({ ...config, footerText: e.target.value })}
                placeholder="e.g. Simple | Secure | Scalable"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: 4 Feature Points */}
      {activeStudioTab === 'features' && (
        <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
            4 Value Proposition Features (Desktop Hero)
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {(config.features || []).map((feat, idx) => (
              <div
                key={feat.id || idx}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  background: feat.enabled ? '#ffffff' : '#f8fafc',
                  opacity: feat.enabled ? 1 : 0.7
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: '#064e43' }}>Feature #{idx + 1}</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', color: '#475569' }}>
                    <input
                      type="checkbox"
                      checked={feat.enabled}
                      onChange={e => updateFeature(idx, 'enabled', e.target.checked)}
                      style={{ accentColor: '#0db49e' }}
                    />
                    Enabled
                  </label>
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>
                    Title
                  </label>
                  <input
                    type="text"
                    value={feat.title || ''}
                    onChange={e => updateFeature(idx, 'title', e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>
                    Description
                  </label>
                  <input
                    type="text"
                    value={feat.description || ''}
                    onChange={e => updateFeature(idx, 'description', e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Login Card & Actions */}
      {activeStudioTab === 'card' && (
        <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
            Login Card Copy & Form Actions
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Card Heading
              </label>
              <input
                type="text"
                value={config.loginHeading || ''}
                onChange={e => setConfig({ ...config, loginHeading: e.target.value })}
                placeholder="e.g. Welcome Back"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Card Subtitle
              </label>
              <input
                type="text"
                value={config.loginSubtitle || ''}
                onChange={e => setConfig({ ...config, loginSubtitle: e.target.value })}
                placeholder="e.g. Sign in to your account to continue"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Sign In Button Label
              </label>
              <input
                type="text"
                value={config.signInButtonText || ''}
                onChange={e => setConfig({ ...config, signInButtonText: e.target.value })}
                placeholder="e.g. Sign In →"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Forgot Password Link Label
              </label>
              <input
                type="text"
                value={config.forgotPasswordText || ''}
                onChange={e => setConfig({ ...config, forgotPasswordText: e.target.value })}
                placeholder="e.g. Forgot password?"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Sign Up Prompt Text
              </label>
              <input
                type="text"
                value={config.signUpPromptText || ''}
                onChange={e => setConfig({ ...config, signUpPromptText: e.target.value })}
                placeholder="e.g. Don't have an account?"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Sign Up Link Action
              </label>
              <input
                type="text"
                value={config.signUpLinkText || ''}
                onChange={e => setConfig({ ...config, signUpLinkText: e.target.value })}
                placeholder="e.g. Sign Up"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
              Google Sign-In Button Text
            </label>
            <input
              type="text"
              value={config.googleButtonText || ''}
              onChange={e => setConfig({ ...config, googleButtonText: e.target.value })}
              placeholder="e.g. Continue with Google"
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            />
          </div>
        </div>
      )}

      {/* Tab 4: Visuals & Toggles */}
      {activeStudioTab === 'visuals' && (
        <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
            Visual Components & Feature Toggles
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>Show Real Product Dashboard Laptop Visual</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Renders the authentic OmniFlow dark teal dashboard mockup inside a MacBook frame on desktop.</div>
              </div>
              <input
                type="checkbox"
                checked={config.showLaptopVisual !== false}
                onChange={e => setConfig({ ...config, showLaptopVisual: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: '#0db49e', cursor: 'pointer' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>Enable "Continue with Google" Option</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Displays the standard Google OAuth login button below the credentials divider.</div>
              </div>
              <input
                type="checkbox"
                checked={config.showGoogleAuth !== false}
                onChange={e => setConfig({ ...config, showGoogleAuth: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: '#0db49e', cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
