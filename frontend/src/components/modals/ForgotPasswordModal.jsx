import React from 'react';
import { X, Mail, Lock, Eye, EyeOff } from 'lucide-react';

export default function ForgotPasswordModal({
  showForgotPasswordModal,
  setShowForgotPasswordModal,
  forgotPasswordForm,
  setForgotPasswordForm,
  forgotPasswordError,
  forgotPasswordLoading,
  handleForgotPassword,
  showPassword,
  setShowPassword
}) {
  if (!showForgotPasswordModal) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal-content glass-panel" style={{ maxWidth: '420px', color: '#0f2b26', padding: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0, fontFamily: 'var(--font-header)' }}>Reset Account Password</h3>
          <X size={18} style={{ cursor: 'pointer', color: '#64748b' }} onClick={() => setShowForgotPasswordModal(false)} />
        </div>

        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
          Enter your registered account email and your new password to reset it instantly.
        </p>

        {forgotPasswordError && (
          <div style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: '#ef4444', fontSize: '12px', marginBottom: '16px' }}>
            {forgotPasswordError}
          </div>
        )}

        <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ textAlign: 'left' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Account Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#94a3b8' }} />
              <input
                type="email"
                required
                placeholder="name@company.com"
                value={forgotPasswordForm.email}
                onChange={(e) => setForgotPasswordForm({ ...forgotPasswordForm, email: e.target.value })}
                style={{ width: '100%', padding: '10px 12px 10px 38px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>
          </div>

          <div style={{ textAlign: 'left' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>New Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#94a3b8' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Enter new password"
                value={forgotPasswordForm.newPassword}
                onChange={(e) => setForgotPasswordForm({ ...forgotPasswordForm, newPassword: e.target.value })}
                style={{ width: '100%', padding: '10px 38px 10px 38px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
              <div
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '12px', top: '12px', cursor: 'pointer', color: '#94a3b8' }}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ flex: 1, padding: '10px' }}
              onClick={() => setShowForgotPasswordModal(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={forgotPasswordLoading}
              className="btn btn-primary"
              style={{ flex: 1.2, padding: '10px' }}
            >
              {forgotPasswordLoading ? 'Updating...' : 'Update Password →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
