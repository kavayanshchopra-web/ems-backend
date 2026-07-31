import React, { useState, useEffect, Suspense, lazy } from 'react';
import {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from './firebase.js';

import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Users
} from 'lucide-react';

const DashboardShell = lazy(() => import('./components/DashboardShell'));

const IS_DEV = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const LIVE_BACKEND = 'https://ems-backend-9hig.onrender.com';
const API_URL = IS_DEV ? 'http://localhost:5000/api' : `${LIVE_BACKEND}/api`;

export default function App() {
  const [activeTab, setActiveTab] = useState('login'); // 'login' or 'register'
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [authError, setAuthError] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Forgot password modal state
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotPasswordForm, setForgotPasswordForm] = useState({ email: '', newPassword: '' });
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordError, setForgotPasswordError] = useState(null);

  // Global Toast Notification state
  const [toast, setToast] = useState({ message: '', type: 'success', visible: false });

  const showToast = (message, type = 'success') => {
    setToast({ message, type, visible: true });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 3000);
  };

  // Auth state
  const [authUser, setAuthUser] = useState(() => {
    try {
      const saved = localStorage.getItem('omnilflow_user');
      return saved ? JSON.parse(saved) : null;
    } catch (err) {
      return null;
    }
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    const cleanEmail = (email || '').toLowerCase().trim();

    // 1. Superadmin Fallback
    if ((cleanEmail === 'admin@omniflow.com' || cleanEmail === 'kavayanshchopra@gmail.com') && password === 'admin123') {
      const mockSuperUser = {
        id: 1,
        email: cleanEmail,
        role: 'superadmin',
        tenantId: 1
      };
      const mockToken = 'superadmin_master_token_override';
      localStorage.setItem('omnilflow_token', mockToken);
      localStorage.setItem('omnilflow_user', JSON.stringify(mockSuperUser));
      setAuthUser(mockSuperUser);
      showToast('Welcome Superadmin! Master Access Granted.', 'success');
      setAuthLoading(false);
      return;
    }

    // 2. Firebase Cloud Auth Login
    try {
      if (auth) {
        const userCred = await signInWithEmailAndPassword(auth, cleanEmail, password);
        const fbUser = userCred.user;
        const userRole = (cleanEmail === 'admin@omniflow.com' || cleanEmail === 'kavayanshchopra@gmail.com') ? 'superadmin' : 'owner';
        const userData = {
          id: fbUser.uid,
          email: fbUser.email,
          role: userRole,
          tenantId: 1
        };
        localStorage.setItem('omnilflow_token', fbUser.accessToken || 'firebase_token');
        localStorage.setItem('omnilflow_user', JSON.stringify(userData));
        setAuthUser(userData);
        showToast('Signed in with Firebase Cloud Auth!', 'success');
        return;
      }
    } catch (fbErr) {
      console.warn('Firebase login attempt fallback to backend API:', fbErr.message);
    }

    // 3. Backend REST API Fallback Login
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to login');

      localStorage.setItem('omnilflow_token', data.token);
      localStorage.setItem('omnilflow_user', JSON.stringify(data.user));
      setAuthUser(data.user);
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotPasswordLoading(true);
    setForgotPasswordError(null);
    const targetEmail = (forgotPasswordForm.email || email || '').toLowerCase().trim();

    try {
      if (auth && targetEmail) {
        await sendPasswordResetEmail(auth, targetEmail);
        showToast(`Password reset email sent to ${targetEmail}!`, 'success');
        setShowForgotPasswordModal(false);
        setForgotPasswordLoading(false);
        return;
      }
    } catch (fbErr) {
      console.warn('Firebase reset password fallback to backend API:', fbErr.message);
    }

    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          newPassword: forgotPasswordForm.newPassword
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');

      showToast('Password updated successfully! Please sign in with your new password.', 'success');
      setShowForgotPasswordModal(false);
      setEmail(targetEmail);
      setPassword(forgotPasswordForm.newPassword);
    } catch (err) {
      setForgotPasswordError(err.message);
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    const cleanEmail = (email || '').toLowerCase().trim();

    try {
      if (auth) {
        const userCred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        const fbUser = userCred.user;
        const userRole = (cleanEmail === 'admin@omniflow.com' || cleanEmail === 'kavayanshchopra@gmail.com') ? 'superadmin' : 'owner';
        const userData = {
          id: fbUser.uid,
          email: fbUser.email,
          role: userRole,
          companyName: companyName || 'My Workspace',
          tenantId: 1
        };
        localStorage.setItem('omnilflow_token', fbUser.accessToken || 'firebase_token');
        localStorage.setItem('omnilflow_user', JSON.stringify(userData));
        setAuthUser(userData);
        showToast('Registered successfully with Firebase Cloud Auth!', 'success');
        return;
      }
    } catch (fbErr) {
      console.warn('Firebase register fallback to backend API:', fbErr.message);
    }

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password, companyName })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to register');

      localStorage.setItem('omnilflow_token', data.token);
      localStorage.setItem('omnilflow_user', JSON.stringify(data.user));
      setAuthUser(data.user);
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  if (!authUser) {
    return (
      <div className="auth-page" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        width: '100vw',
        background: '#f4f6f8',
        fontFamily: 'var(--font-body)',
        padding: '20px'
      }}>
        {toast.visible && (
          <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 24px',
            borderRadius: '8px',
            color: 'white',
            background: toast.type === 'success' ? '#0db49e' : '#ef4444',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 10000,
            fontSize: '14px',
            fontWeight: '600'
          }}>
            {toast.message}
          </div>
        )}

        <div style={{
          width: '100%',
          maxWidth: '420px',
          padding: '40px',
          background: '#ffffff',
          borderRadius: '24px',
          boxShadow: '0 15px 35px rgba(0, 0, 0, 0.03), 0 5px 15px rgba(0, 0, 0, 0.01)',
          border: '1px solid #eef2f6',
          color: '#0f2b26',
          textAlign: 'center'
        }}>
          <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a', lineHeight: '42px', fontFamily: 'var(--font-header)', marginBottom: '4px' }}>
            {activeTab === 'register' ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '28px' }}>
            {activeTab === 'register' ? 'Register your account to get started' : 'Sign in to your account to continue'}
          </p>

          {authError && (
            <div style={{
              padding: '12px',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '8px',
              color: '#ef4444',
              fontSize: '12px',
              marginBottom: '20px',
              textAlign: 'center',
              fontWeight: '500'
            }}>
              {authError}
            </div>
          )}

          {activeTab === 'register' ? (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ textAlign: 'left' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#0f2b26', marginBottom: '6px' }}>Company Name</label>
                <div style={{ position: 'relative' }}>
                  <Users size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: '#94a3b8' }} />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Corporation"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 40px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      outline: 'none',
                      fontSize: '13px',
                      fontFamily: 'var(--font-body)'
                    }}
                  />
                </div>
              </div>
              <div style={{ textAlign: 'left' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#0f2b26', marginBottom: '6px' }}>Work Email</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: '#94a3b8' }} />
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 40px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      outline: 'none',
                      fontSize: '13px',
                      fontFamily: 'var(--font-body)'
                    }}
                  />
                </div>
              </div>
              <div style={{ textAlign: 'left' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#0f2b26', marginBottom: '6px' }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: '#94a3b8' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 40px 12px 40px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      outline: 'none',
                      fontSize: '13px',
                      fontFamily: 'var(--font-body)'
                    }}
                  />
                </div>
              </div>
              <button type="submit" disabled={authLoading} className="btn" style={{
                background: '#0db49e',
                color: 'white',
                padding: '12px',
                borderRadius: '8px',
                fontWeight: '700',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(13, 180, 158, 0.2)',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '10px'
              }}>
                {authLoading ? 'Creating Workspace...' : 'Register Workspace →'}
              </button>
              <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '13px', color: '#64748b' }}>
                Already have an account?{' '}
                <span onClick={() => { setActiveTab('login'); setAuthError(null); }} style={{ color: '#0db49e', fontWeight: '700', cursor: 'pointer' }}>
                  Sign In
                </span>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ textAlign: 'left' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#0f2b26', marginBottom: '6px' }}>Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: '#94a3b8' }} />
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 40px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      outline: 'none',
                      fontSize: '13px',
                      fontFamily: 'var(--font-body)'
                    }}
                  />
                </div>
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#0f2b26' }}>Password</label>
                  <span
                    onClick={() => {
                      setForgotPasswordForm({ email: email || '', newPassword: '' });
                      setForgotPasswordError(null);
                      setShowForgotPasswordModal(true);
                    }}
                    style={{ fontSize: '11px', color: '#0db49e', fontWeight: '600', cursor: 'pointer' }}>
                    Forgot password?
                  </span>
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: '#94a3b8' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 40px 12px 40px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      outline: 'none',
                      fontSize: '13px',
                      fontFamily: 'var(--font-body)'
                    }}
                  />
                  <div
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '12px', top: '13px', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}
                    title={showPassword ? "Hide Password" : "Show Password"}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', textAlign: 'left' }}>
                <input type="checkbox" id="rememberMe" style={{ accentColor: '#0db49e', cursor: 'pointer' }} />
                <label htmlFor="rememberMe" style={{ fontSize: '12px', color: '#64748b', cursor: 'pointer', userSelect: 'none' }}>Remember me</label>
              </div>
              <button type="submit" disabled={authLoading} className="btn" style={{
                background: '#0db49e',
                color: 'white',
                padding: '12px',
                borderRadius: '8px',
                fontWeight: '700',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(13, 180, 158, 0.2)',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}>
                {authLoading ? 'Logging in...' : 'Sign In →'}
              </button>
              <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '13px', color: '#64748b' }}>
                Don't have an account?{' '}
                <span onClick={() => { setActiveTab('register'); setAuthError(null); }} style={{ color: '#0db49e', fontWeight: '700', cursor: 'pointer' }}>
                  Sign Up
                </span>
              </div>
            </form>
          )}
        </div>

        {showForgotPasswordModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '32px',
              width: '100%',
              maxWidth: '400px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)'
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>Reset Password</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
                Enter your email and new password to update your login credentials.
              </p>
              {forgotPasswordError && (
                <div style={{
                  padding: '10px',
                  background: 'rgba(239, 68, 68, 0.08)',
                  borderRadius: '6px',
                  color: '#ef4444',
                  fontSize: '12px',
                  marginBottom: '16px',
                  fontWeight: '500'
                }}>
                  {forgotPasswordError}
                </div>
              )}
              <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ textAlign: 'left' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#0f2b26', marginBottom: '6px' }}>Work Email</label>
                  <input
                    type="email"
                    required
                    value={forgotPasswordForm.email}
                    onChange={(e) => setForgotPasswordForm(prev => ({ ...prev, email: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      outline: 'none',
                      fontSize: '13px'
                    }}
                  />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#0f2b26', marginBottom: '6px' }}>New Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={forgotPasswordForm.newPassword}
                    onChange={(e) => setForgotPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      outline: 'none',
                      fontSize: '13px'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setShowForgotPasswordModal(false)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      background: 'white',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#64748b'
                    }}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotPasswordLoading}
                    style={{
                      flex: 1,
                      padding: '10px',
                      border: 'none',
                      borderRadius: '8px',
                      background: '#0db49e',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600'
                    }}>
                    {forgotPasswordLoading ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        width: '100vw',
        background: '#f4f6f8',
        color: '#0f2b26',
        fontSize: '16px',
        fontWeight: '600',
        fontFamily: 'var(--font-body)'
      }}>
        Loading OmniFlow CRM...
      </div>
    }>
      <DashboardShell authUser={authUser} setAuthUser={setAuthUser} />
    </Suspense>
  );
}
