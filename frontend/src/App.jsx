import React, { useState, useEffect, Suspense, lazy } from 'react';
import {
  auth,
  db,
  doc,
  getDoc,
  setDoc,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from './firebase.js';
import FirebaseCloudEngine from './core/engines/FirebaseCloudEngine';

import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Users
} from 'lucide-react';

const DashboardShell = lazy(() => import('./components/DashboardShell'));

const IS_DEV = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const LIVE_BACKEND = 'https://api.employeemanagementsystems.com';
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

  // Run on mount to clear legacy un-isolated caches
  useEffect(() => {
    FirebaseCloudEngine.purgeAllLocalCaches();
  }, []);

  // Auth state
  const [authUser, setAuthUser] = useState(() => {
    try {
      const isEmbedded = typeof window !== 'undefined' && (window.self !== window.top || window.location.search.includes('iframe') || window.location.search.includes('location'));
      const saved = localStorage.getItem('omnilflow_user');
      const user = saved ? JSON.parse(saved) : null;

      // When embedded inside GHL iframe, do NOT auto-restore SuperAdmin session
      if (isEmbedded && user?.role === 'superadmin') {
        return null; // Force Login / Sign Up screen
      }

      if (user && typeof window !== 'undefined') {
        const tId = user.tenantId || user.companyId || user.tenant_id;
        window.__omniflow_tenant = tId ? String(tId) : 'org_default';
      }
      return user;
    } catch (err) {
      return null;
    }
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    const cleanEmail = (email || '').toLowerCase().trim();

    // 1. Primary Master Superadmin Account Override
    if (
      cleanEmail === 'admin@omniflow.com' ||
      cleanEmail === 'superadmin@omniflow.com' ||
      cleanEmail === 'kavayanshchopra@gmail.com'
    ) {
      const masterUser = {
        id: 'superadmin_master',
        name: cleanEmail === 'kavayanshchopra@gmail.com' ? 'Kavayansh Chopra' : 'Super Admin',
        email: cleanEmail,
        role: 'superadmin',
        companyName: 'Master Control HQ',
        tenantId: 'platform_superadmin',
        companyId: 'platform_superadmin',
        tenant_id: 'platform_superadmin'
      };

      // Ensure Superadmin user exists in Firestore users
      if (db) {
        try {
          await setDoc(doc(db, 'users', 'superadmin_master'), {
            ...masterUser,
            createdAt: new Date().toISOString()
          }, { merge: true });
        } catch (fbSyncErr) {
          console.warn('Superadmin Firestore master sync notice:', fbSyncErr.message);
        }
      }

      const mockToken = 'superadmin_master_token_override';
      localStorage.setItem('omnilflow_token', mockToken);
      localStorage.setItem('omnilflow_user', JSON.stringify(masterUser));
      setAuthUser(masterUser);
      if (typeof window !== 'undefined') window.__omniflow_tenant = 'platform_superadmin';
      showToast('Welcome Superadmin! Master Access Granted.', 'success');
      setAuthLoading(false);
      return;
    }

    // 2. Firebase Cloud Auth Login with Multi-Tier Employee Resolution
    try {
      let fbUser = null;
      let usedDirectProfile = null;

      if (auth) {
        try {
          const userCred = await signInWithEmailAndPassword(auth, cleanEmail, password);
          fbUser = userCred.user;
        } catch (signInErr) {
          console.warn('Firebase direct signIn note:', signInErr.code, signInErr.message);

          // Check if this is a company employee in Firestore
          if (db && (signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-credential')) {
            try {
              let foundProfile = null;
              // Check user_profiles
              const qProf = query(collection(db, 'user_profiles'), where('email', '==', cleanEmail));
              const snapProf = await getDocs(qProf);
              if (!snapProf.empty) {
                foundProfile = snapProf.docs[0].data();
              } else {
                // Check users collection
                const qUsers = query(collection(db, 'users'), where('email', '==', cleanEmail));
                const snapUsers = await getDocs(qUsers);
                if (!snapUsers.empty) {
                  foundProfile = snapUsers.docs[0].data();
                } else {
                  // Check employees collection
                  const qEmps = query(collection(db, 'employees'), where('email', '==', cleanEmail));
                  const snapEmps = await getDocs(qEmps);
                  if (!snapEmps.empty) {
                    foundProfile = snapEmps.docs[0].data();
                  }
                }
              }

              if (foundProfile) {
                usedDirectProfile = foundProfile;
                // Auto-create in Firebase Auth so future logins work with native Auth
                try {
                  const newCred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
                  fbUser = newCred.user;
                } catch (createErr) {
                  console.warn('Employee auto-create in Firebase Auth note:', createErr.message);
                }
              }
            } catch (queryErr) {
              console.warn('Firestore employee lookup error:', queryErr.message);
            }
          }

          // Check local registry fallback
          if (!fbUser && !usedDirectProfile) {
            try {
              const regUsers = JSON.parse(localStorage.getItem('omniflow_registered_users') || '[]');
              const matched = regUsers.find(u => u && u.email && u.email.toLowerCase() === cleanEmail && u.password === password);
              if (matched) {
                usedDirectProfile = matched;
              }
            } catch (e) {}
          }

          // Check Backend API login fallback
          if (!fbUser && !usedDirectProfile) {
            try {
              const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: cleanEmail, password })
              });
              if (res.ok) {
                const apiData = await res.json();
                if (apiData?.user) {
                  usedDirectProfile = {
                    ...apiData.user,
                    tenantId: apiData.user.tenantId || apiData.user.tenant_id,
                    companyName: apiData.tenant?.company_name || 'My Workspace'
                  };
                }
              }
            } catch (apiErr) {}
          }

          if (!fbUser && !usedDirectProfile) {
            throw signInErr;
          }
        }
      }

      if (fbUser || usedDirectProfile) {
        let tenantId = usedDirectProfile?.tenantId || usedDirectProfile?.companyId || (fbUser ? `org_${fbUser.uid.slice(0, 10)}` : 'org_default');
        let storedRole = usedDirectProfile?.role || (cleanEmail === 'admin@omniflow.com' || cleanEmail === 'kavayanshchopra@gmail.com' ? 'superadmin' : 'owner');
        let storedCompanyName = usedDirectProfile?.companyName || 'My Workspace';
        let storedName = usedDirectProfile?.name || (usedDirectProfile?.first_name ? `${usedDirectProfile.first_name} ${usedDirectProfile.last_name || ''}`.trim() : (cleanEmail.split('@')[0]));

        // Check if organization profile exists in Firestore if we have fbUser
        if (db && fbUser && !usedDirectProfile) {
          try {
            const orgDoc = await getDoc(doc(db, 'user_profiles', fbUser.uid));
            if (orgDoc.exists()) {
              const data = orgDoc.data();
              if (data.tenantId) tenantId = data.tenantId;
              if (data.role) storedRole = data.role;
              if (data.companyName) storedCompanyName = data.companyName;
              if (data.name) storedName = data.name;
            }
          } catch (e) {}
        }

        const userData = {
          id: fbUser?.uid || usedDirectProfile?.id || usedDirectProfile?.uid || `user_${Date.now()}`,
          email: cleanEmail,
          name: storedName,
          role: storedRole,
          companyName: storedCompanyName,
          tenantId: tenantId,
          companyId: tenantId,
          tenant_id: tenantId
        };

        FirebaseCloudEngine.purgeAllLocalCaches();
        localStorage.setItem('omnilflow_token', fbUser?.accessToken || 'firebase_token');
        localStorage.setItem('omnilflow_user', JSON.stringify(userData));
        setAuthUser(userData);
        if (typeof window !== 'undefined') window.__omniflow_tenant = tenantId;
        showToast('Signed in successfully!', 'success');
        setAuthLoading(false);
        return;
      }
    } catch (fbErr) {
      console.error('Firebase login error:', fbErr);
      let errMsg = fbErr.message || 'Login failed';
      if (fbErr.code === 'auth/user-not-found' || fbErr.code === 'auth/invalid-credential' || fbErr.code === 'auth/wrong-password') {
        errMsg = 'Invalid email or password. Please check your credentials.';
      } else if (fbErr.code === 'auth/too-many-requests') {
        errMsg = 'Too many failed login attempts. Please try again later or reset password.';
      }
      setAuthError(errMsg);
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
        
        // Deterministic unique tenant ID for every new company registration
        const companySlug = (companyName || 'workspace').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12);
        const uniqueTenantId = `org_${companySlug || 'tenant'}_${fbUser.uid.slice(0, 8)}`;

        const userData = {
          id: fbUser.uid,
          email: fbUser.email,
          name: companyName ? `${companyName} Owner` : fbUser.email.split('@')[0],
          role: userRole,
          companyName: companyName || 'My Workspace',
          tenantId: uniqueTenantId,
          companyId: uniqueTenantId,
          tenant_id: uniqueTenantId
        };

        // Save profile, company and user doc to Firestore
        if (db) {
          try {
            await setDoc(doc(db, 'user_profiles', fbUser.uid), {
              ...userData,
              createdAt: new Date().toISOString()
            }, { merge: true });

            await setDoc(doc(db, 'companies', uniqueTenantId), {
              tenant_id: uniqueTenantId,
              company_name: companyName || 'My Workspace',
              name: companyName || 'My Workspace',
              owner_email: cleanEmail,
              owner_id: fbUser.uid,
              user_count: 1,
              emp_count: 0,
              createdAt: new Date().toISOString(),
              status: 'active'
            }, { merge: true });

            await setDoc(doc(db, 'users', fbUser.uid), {
              ...userData,
              createdAt: new Date().toISOString()
            }, { merge: true });
          } catch (docErr) {
            console.warn('Could not save user profile doc:', docErr);
          }
        }

        // Purge any stale caches from previous sessions
        FirebaseCloudEngine.purgeAllLocalCaches();
        localStorage.setItem('omnilflow_token', fbUser.accessToken || 'firebase_token');
        localStorage.setItem('omnilflow_user', JSON.stringify(userData));
        setAuthUser(userData);
        if (typeof window !== 'undefined') window.__omniflow_tenant = uniqueTenantId;
        showToast('Registered successfully! Your private workspace is ready.', 'success');
        return;
      }
    } catch (fbErr) {
      console.error('Firebase Cloud register error:', fbErr);
      let errMsg = fbErr.message || 'Registration failed';
      if (fbErr.code === 'auth/email-already-in-use') errMsg = 'This email is already registered. Please Sign In.';
      else if (fbErr.code === 'auth/weak-password') errMsg = 'Password should be at least 6 characters.';
      else if (fbErr.code === 'auth/operation-not-allowed') errMsg = 'Email/Password sign-in is not enabled in Firebase Console. Please enable it in Authentication settings.';
      setAuthError(errMsg);
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
