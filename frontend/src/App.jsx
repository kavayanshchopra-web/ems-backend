import React, { useState, useEffect, Suspense, lazy } from 'react';
import {
  auth,
  db,
  doc,
  getDoc,
  setDoc,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from './firebase.js';
import FirebaseCloudEngine from './core/engines/FirebaseCloudEngine';
import TenantStorage from './core/services/TenantStorage';

import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Users
} from 'lucide-react';

const DashboardShell = lazy(() => import('./components/DashboardShell'));
import CompanyRegistrationWizard from './components/CompanyRegistrationWizard';
import PaymentGateScreen from './components/PaymentGateScreen';
import OmniFlowLoginPage from './components/auth/OmniFlowLoginPage';
import SubscriptionEngine from './core/engines/SubscriptionEngine';
import { isSandboxEnvironment, SupabaseSandboxService, detectDeviceType } from './core/services/supabaseSandboxService';

const IS_DEV = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const LIVE_BACKEND = 'https://api.employeemanagementsystems.com';
const API_URL = IS_DEV ? 'http://localhost:5000/api' : `${LIVE_BACKEND}/api`;

export const getGhlContext = () => {
  if (typeof window === 'undefined') return { locationId: '', locationName: '', isEmbedded: false };
  const urlParams = new URLSearchParams(window.location.search);
  let locationId = urlParams.get('location_id') || urlParams.get('locationId') || urlParams.get('loc_id') || urlParams.get('location') || '';
  let locationName = urlParams.get('location_name') || urlParams.get('locationName') || urlParams.get('company_name') || urlParams.get('name') || '';

  if (!locationId && typeof document !== 'undefined' && document.referrer) {
    const match = document.referrer.match(/\/location\/([a-zA-Z0-9_-]+)/);
    if (match && match[1] && match[1] !== 'undefined') {
      locationId = match[1];
    }
  }

  const isEmbedded = window.self !== window.top || urlParams.has('iframe') || !!locationId;
  return { locationId: locationId.trim(), locationName: locationName.trim(), isEmbedded };
};

export default function App() {
  const ghlContext = getGhlContext();
  const [activeTab, setActiveTab] = useState('login'); // 'login' or 'register'
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [companyName, setCompanyName] = useState(ghlContext.locationName || '');
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

  // Auth state with strict Sub-Account location and iframe isolation
  const [authUser, setAuthUser] = useState(() => {
    try {
      const ghlCtx = getGhlContext();

      // CASE 1: Running inside an iframe (GHL / WebGearz Custom Menu Link or App)
      if (ghlCtx.isEmbedded) {
        // If a specific locationId is known:
        if (ghlCtx.locationId) {
          const savedLocUser = localStorage.getItem(`omnilflow_user_ghl_${ghlCtx.locationId}`);
          if (savedLocUser) {
            try {
              const user = JSON.parse(savedLocUser);
              if (user && typeof window !== 'undefined') {
                const tId = user.tenantId || user.companyId || user.tenant_id;
                window.__omniflow_tenant = tId ? String(tId) : 'org_default';
              }
              return user;
            } catch (e) {}
          }
          // Strict isolation: When installing in a new GHL sub-account, DO NOT borrow any old or global session.
          // Return null so the clean Sign-In / Sign-Up (Registration) screen is presented.
          return null;
        }

        // Generic embedded fallback only when no specific locationId is available (persists across tab reloads)
        const savedIframeUser = localStorage.getItem('omnilflow_iframe_user') || sessionStorage.getItem('omnilflow_iframe_user') || localStorage.getItem('omnilflow_user');
        if (savedIframeUser) {
          try {
            const user = JSON.parse(savedIframeUser);
            if (user && typeof window !== 'undefined') {
              const tId = user.tenantId || user.companyId || user.tenant_id;
              window.__omniflow_tenant = tId ? String(tId) : 'org_default';
            }
            return user;
          } catch (e) {}
        }

        return null;
      }

      // CASE 2: Standalone browser access (outside iframe)
      const saved = localStorage.getItem('omnilflow_user');
      const user = saved ? JSON.parse(saved) : null;
      if (typeof window !== 'undefined' && isSandboxEnvironment()) {
        // Auto-purge old dummy caches from localStorage in Sandbox
        const staleTenants = ['999', '1002', 'sandbox_test_org'];
        staleTenants.forEach(st => {
          try {
            for (let i = localStorage.length - 1; i >= 0; i--) {
              const k = localStorage.key(i);
              if (k && (k.includes(`_${st}_`) || k.endsWith(`_${st}`))) {
                localStorage.removeItem(k);
              }
            }
          } catch (e) {}
        });
        // Clear old un-isolated legacy caches
        ['contacts', 'employees', 'call_logs', 'crm_contacts', 'omni_1_contacts', 'omni_1_call_logs'].forEach(k => {
          try { localStorage.removeItem(k); } catch (e) {}
        });

        // Ensure user defaults to Tenant 1 if on old deleted dummy tenant
        if (user) {
          const existingTid = String(user.tenantId || user.companyId || user.tenant_id || '');
          if (!existingTid || staleTenants.includes(existingTid)) {
            user.tenantId = 1;
            user.companyId = 1;
            user.tenant_id = 1;
            user.companyName = '#TEN-0001-KAVYANSH-CHOPRA';
            user.email = user.email || 'kavyanshchopra@gmail.com';
            localStorage.setItem('omnilflow_user', JSON.stringify(user));
          }
        }
      }
      if (user && typeof window !== 'undefined') {
        const tId = user.tenantId || user.companyId || user.tenant_id || (isSandboxEnvironment() ? 1 : 'org_default');
        window.__omniflow_tenant = String(tId);
      }
      return user;
    } catch (err) {
      console.warn('Could not parse stored user:', err);
      return null;
    }
  });

  // Real-Time Subscription & Expiry Monitor (Auto-Lock upon 7-day trial or paid expiry)
  useEffect(() => {
    if (!authUser || authUser.role === 'superadmin' || authUser.email === 'admin@omniflow.com') return;

    let isMounted = true;
    const checkSubscription = async () => {
      try {
        const tenantId = authUser.tenant_id || authUser.tenantId || authUser.companyId || 1;
        const sub = await SubscriptionEngine.fetchTenantSubscription(tenantId);
        if (!isMounted || !sub) return;

        const expiry = sub.expiry_date || sub.expires_at || sub.trial_ends_at;
        const isTimeExpired = Boolean(expiry && new Date(expiry).getTime() < Date.now());
        const effectiveStatus = isTimeExpired ? 'expired' : sub.status;

        if (
          effectiveStatus !== authUser.subscription_status ||
          expiry !== authUser.subscription_expiry
        ) {
          setAuthUser(prev => {
            if (!prev) return null;
            const updated = {
              ...prev,
              subscription_status: effectiveStatus,
              subscription_expiry: expiry,
              expiry_date: expiry,
              is_trial: sub.is_trial
            };
            localStorage.setItem('omnilflow_user', JSON.stringify(updated));
            return updated;
          });
        }
      } catch (e) {
        console.warn('Subscription monitor check notice:', e);
      }
    };

    checkSubscription();
    const interval = setInterval(checkSubscription, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [authUser?.tenant_id, authUser?.tenantId]);

  // Proactively sync active user session to Native Android Bridge (on login or page reload)
  useEffect(() => {
    if (authUser && typeof window !== 'undefined') {
      const bridge = window.AndroidApp || window.OmniFlowNative;
      if (bridge && typeof bridge.syncUserProfile === 'function') {
        try {
          const rawT = authUser.tenantId || authUser.companyId || authUser.tenant_id;
          let numT = Number(rawT);
          if (isNaN(numT) || numT <= 0) numT = 1;
          bridge.syncUserProfile(JSON.stringify({
            tenantId: numT,
            tenantSlug: String(authUser.tenantSlug || rawT || ''),
            employeeId: authUser.employeeId || authUser.id || '',
            name: authUser.name || authUser.fullName || '',
            email: authUser.email || '',
            role: authUser.role || 'employee',
            department: authUser.department || ''
          }));
        } catch (e) {}
      }
    }
  }, [authUser]);

  // Listen for dynamic HighLevel context messages
  useEffect(() => {
    const handleGhlMessage = (event) => {
      try {
        const data = event.data;
        if (data && typeof data === 'object') {
          const locId = data.locationId || data.location_id || (data.location && data.location.id);
          const locName = data.locationName || data.location_name || (data.location && data.location.name);
          if (locName && !companyName) setCompanyName(locName);
        }
      } catch (e) {}
    };
    window.addEventListener('message', handleGhlMessage);
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'REQUEST_USER_DATA' }, '*');
      }
    } catch (e) {}
    return () => window.removeEventListener('message', handleGhlMessage);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    const cleanEmail = (email || '').toLowerCase().trim();

    // Universal Supabase PostgreSQL Auth (Pure SQL + JWT, Zero Firebase Everywhere)
    try {
      const sbRes = await SupabaseSandboxService.loginWithEmailPassword(cleanEmail, password);
      if (sbRes && sbRes.success && sbRes.user) {
        const user = sbRes.user;
        const token = sbRes.token || 'jwt_auth_token';
        const isMasterSuperAdmin = (user.role === 'superadmin' || cleanEmail === 'kavayanshchopra@gmail.com');

        const userData = {
          id: user.id,
          email: user.email,
          name: user.name || (user.email.split('@')[0]),
          role: isMasterSuperAdmin ? 'superadmin' : (user.role || 'owner'),
          companyName: isMasterSuperAdmin ? 'OmniFlow HQ' : (user.company_name || `Tenant #${user.tenant_id}`),
          tenantId: isMasterSuperAdmin ? 1 : Number(user.tenant_id),
          companyId: isMasterSuperAdmin ? 1 : Number(user.tenant_id),
          tenant_id: isMasterSuperAdmin ? 1 : Number(user.tenant_id),
          tenantSlug: user.tenant_slug || (isMasterSuperAdmin ? 'TEN-0001-KAVAYANSH-CHOPRA' : `TEN-${user.tenant_id}`),
          employeeId: String(user.id)
        };

        try {
          FirebaseCloudEngine.purgeAllLocalCaches();
        } catch (e) {}

        localStorage.setItem('omnilflow_token', token);
        localStorage.setItem('token', token);
        localStorage.setItem('omnilflow_user', JSON.stringify(userData));
        localStorage.setItem('omnilflow_current_company', String(userData.tenantId));

        // Save GHL Location-Specific Session so navigating GHL sub-account pages never logs out
        const gCtx = getGhlContext();
        if (gCtx.locationId) {
          localStorage.setItem(`omnilflow_user_ghl_${gCtx.locationId}`, JSON.stringify(userData));
          localStorage.setItem(`omnilflow_token_ghl_${gCtx.locationId}`, token);
        }
        if (gCtx.isEmbedded) {
          sessionStorage.setItem('omnilflow_iframe_user', JSON.stringify(userData));
          sessionStorage.setItem('omnilflow_iframe_token', token);
          localStorage.setItem('omnilflow_iframe_user', JSON.stringify(userData));
          localStorage.setItem('omnilflow_iframe_token', token);
        }

        // Pillar 2: Dual-Device Session Registration (1 Phone + 1 Laptop Rule)
        try {
          const isAndroidApp = !!(window.AndroidApp || window.OmniFlowNative || window.location.search.includes('app=android'));
          const detectedDeviceType = detectDeviceType();

          let currentDeviceId = localStorage.getItem('omnilflow_device_id');
          if (!currentDeviceId) {
            currentDeviceId = 'dev_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now();
            localStorage.setItem('omnilflow_device_id', currentDeviceId);
          }

          const currentSessionToken = 'sess_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now();
          localStorage.setItem('omnilflow_active_session_token', currentSessionToken);
          localStorage.setItem('omnilflow_device_type', detectedDeviceType);

          const devName = detectedDeviceType === 'mobile' 
            ? (isAndroidApp ? 'OmniFlow Android App' : 'Mobile Phone') 
            : 'Desktop Laptop / PC';

          await SupabaseSandboxService.registerDeviceSession(
            userData.tenantId,
            userData.id,
            detectedDeviceType,
            currentSessionToken,
            currentDeviceId,
            devName
          );
        } catch (devErr) {
          console.warn('[Pillar 2] Device session registration notice:', devErr);
        }

        try {
          const bridge = window.AndroidApp || window.OmniFlowNative;
          if (bridge && typeof bridge.syncUserProfile === 'function') {
            bridge.syncUserProfile(JSON.stringify({
              tenantId: userData.tenantId,
              employeeId: userData.id,
              name: userData.name,
              email: userData.email,
              role: userData.role,
              department: ''
            }));
          }
        } catch (e) {}

        setAuthUser(userData);
        setActiveTab('contacts');
        const loginToastMsg = (detectedDeviceType === 'mobile')
          ? '⚡ Mobile session active (Previous mobile session disconnected)'
          : '⚡ Signed in successfully!';
        showToast(loginToastMsg, 'success');
        setAuthLoading(false);
        return;
      } else {
        setAuthLoading(false);
        setAuthError(sbRes?.error || 'Invalid email or password');
        showToast(sbRes?.error || 'Invalid email or password', 'error');
        return;
      }
    } catch (err) {
      setAuthLoading(false);
      setAuthError(err.message || 'Login failed');
      showToast(err.message || 'Login failed', 'error');
      return;
    }
  };

  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      if (!auth) throw new Error('Authentication service is currently unavailable.');
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const fbUser = result.user;
      const ghlCtx = getGhlContext();

      // Look up existing tenant or user profile in Firestore
      let foundProfile = null;
      if (db) {
        try {
          const qProf = query(collection(db, 'user_profiles'), where('email', '==', (fbUser.email || '').toLowerCase()));
          const snapProf = await getDocs(qProf);
          if (!snapProf.empty) {
            foundProfile = snapProf.docs[0].data();
          }
        } catch (e) {}
      }

      const uniqueTenantId = foundProfile?.tenant_id || foundProfile?.companyId || `org_google_${fbUser.uid.slice(0, 8)}`;
      const appUser = {
        id: fbUser.uid,
        email: fbUser.email,
        name: fbUser.displayName || fbUser.email.split('@')[0],
        role: foundProfile?.role || 'owner',
        companyName: foundProfile?.companyName || ghlCtx.locationName || 'My Workspace',
        tenantId: uniqueTenantId,
        companyId: uniqueTenantId,
        tenant_id: uniqueTenantId,
        locationId: ghlCtx.locationId || null,
        subscription_status: 'active'
      };

      const token = await fbUser.getIdToken();
      localStorage.setItem('omnilflow_token', token);
      localStorage.setItem('omnilflow_user', JSON.stringify(appUser));
      if (ghlCtx.locationId) {
        localStorage.setItem(`omnilflow_user_ghl_${ghlCtx.locationId}`, JSON.stringify(appUser));
        localStorage.setItem(`omnilflow_token_ghl_${ghlCtx.locationId}`, token);
      }
      if (ghlCtx.isEmbedded) {
        sessionStorage.setItem('omnilflow_iframe_user', JSON.stringify(appUser));
        sessionStorage.setItem('omnilflow_iframe_token', token);
        localStorage.setItem('omnilflow_iframe_user', JSON.stringify(appUser));
        localStorage.setItem('omnilflow_iframe_token', token);
      }
      setAuthUser(appUser);
      if (typeof window !== 'undefined') window.__omniflow_tenant = String(uniqueTenantId);
      showToast(`Welcome ${appUser.name || appUser.email}!`, 'success');
    } catch (googleErr) {
      console.error('Google Sign-In note:', googleErr);
      if (googleErr.code !== 'auth/popup-closed-by-user') {
        setAuthError(googleErr.message || 'Google authentication failed.');
      }
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
        const ghlCtx = getGhlContext();
        const companySlug = (companyName || ghlCtx.locationName || 'workspace').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12);
        const uniqueTenantId = `org_${companySlug || 'tenant'}_${fbUser.uid.slice(0, 8)}`;

        let numericTenantId = 1;
        try {
          numericTenantId = await SupabaseSandboxService.ensureTenantForAccount({
            tenantSlug: uniqueTenantId,
            companyName: companyName || ghlCtx.locationName || 'My Workspace',
            ownerEmail: cleanEmail
          });
        } catch (tErr) {
          console.warn('[App Register] ensureTenantForAccount note:', tErr);
          numericTenantId = 1;
        }

        const userData = {
          id: fbUser.uid,
          email: fbUser.email,
          name: companyName ? `${companyName} Owner` : (ghlCtx.locationName || fbUser.email.split('@')[0]),
          role: userRole,
          companyName: companyName || ghlCtx.locationName || 'My Workspace',
          tenantId: numericTenantId,
          companyId: numericTenantId,
          tenant_id: numericTenantId,
          tenantSlug: uniqueTenantId,
          employeeId: fbUser.uid,
          department: '',
          locationId: ghlCtx.locationId || null
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
              company_name: companyName || ghlCtx.locationName || 'My Workspace',
              name: companyName || ghlCtx.locationName || 'My Workspace',
              owner_email: cleanEmail,
              owner_id: fbUser.uid,
              ghl_location_id: ghlCtx.locationId || null,
              user_count: 1,
              emp_count: 0,
              createdAt: new Date().toISOString(),
              status: 'active'
            }, { merge: true });

            await setDoc(doc(db, 'users', fbUser.uid), {
              ...userData,
              createdAt: new Date().toISOString()
            }, { merge: true });

            if (ghlCtx.locationId) {
              await setDoc(doc(db, 'integrations_ghl_oauth', `${uniqueTenantId}_${ghlCtx.locationId}`), {
                companyId: uniqueTenantId,
                locationId: ghlCtx.locationId,
                status: 'unlinked',
                installedAt: new Date().toISOString()
              }, { merge: true });
            }
          } catch (docErr) {
            console.warn('Could not save user profile doc:', docErr);
          }
        }

        // Purge any stale caches from previous sessions
        TenantStorage.clearAll();
        FirebaseCloudEngine.purgeAllLocalCaches();
        const userToken = fbUser.accessToken || 'firebase_token';
        localStorage.setItem('omnilflow_token', userToken);
        localStorage.setItem('omnilflow_user', JSON.stringify(userData));
        localStorage.setItem('omnilflow_current_company', uniqueTenantId);

        if (ghlCtx.isEmbedded) {
          sessionStorage.setItem('omnilflow_iframe_user', JSON.stringify(userData));
          sessionStorage.setItem('omnilflow_iframe_token', userToken);
          localStorage.setItem('omnilflow_iframe_user', JSON.stringify(userData));
          localStorage.setItem('omnilflow_iframe_token', userToken);
        }

        if (ghlCtx.locationId) {
          localStorage.setItem(`omnilflow_user_ghl_${ghlCtx.locationId}`, JSON.stringify(userData));
          localStorage.setItem(`omnilflow_token_ghl_${ghlCtx.locationId}`, userToken);

          fetch(`${API_URL}/v1/integrations/ghl/link-location`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': String(uniqueTenantId) },
            body: JSON.stringify({ companyId: uniqueTenantId, locationId: ghlCtx.locationId })
          }).catch(() => {});
        }

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
    if (activeTab === 'register') {
      return (
        <CompanyRegistrationWizard
          onComplete={(authData) => {
            // Clean slate: purge all previous session and cache data completely
            TenantStorage.clearAll();

            const rawTenantId = authData.tenant?.id || authData.tenant?.tenant_id || authData.user?.tenantId || authData.user?.tenant_id || authData.subscription?.tenant_id;
            const finalTenantId = rawTenantId ? String(rawTenantId).trim() : `org_signup_${Date.now()}`;

            const u = {
              id: authData.user?.id || `user_${Date.now()}`,
              email: authData.user?.email || email || '',
              name: authData.user?.name || (email ? email.split('@')[0] : 'Workspace Owner'),
              role: authData.user?.role || 'owner',
              tenantId: finalTenantId,
              tenant_id: finalTenantId,
              companyId: finalTenantId,
              companyName: authData.tenant?.company_name || authData.tenant?.name || 'My Workspace',
              subscription_status: authData.subscription?.status || (authData.subscription?.is_trial ? 'trial' : 'active'),
              subscription_expiry: authData.subscription?.expiry_date,
              expiry_date: authData.subscription?.expiry_date,
              is_trial: authData.subscription?.is_trial ? 1 : 0
            };

            setAuthUser(u);
            localStorage.setItem('omnilflow_user', JSON.stringify(u));
            localStorage.setItem('omnilflow_current_company', finalTenantId);
            if (authData.token) {
              localStorage.setItem('omnilflow_token', authData.token);
              localStorage.setItem('token', authData.token);
            }
            if (typeof window !== 'undefined') {
              window.__omniflow_tenant = finalTenantId;
            }

            // If inside an iframe / GHL sub-account, save iframe-specific session
            const gCtx = getGhlContext();
            if (gCtx.isEmbedded) {
              sessionStorage.setItem('omnilflow_iframe_user', JSON.stringify(u));
              if (authData.token) sessionStorage.setItem('omnilflow_iframe_token', authData.token);
              localStorage.setItem('omnilflow_iframe_user', JSON.stringify(u));
              if (authData.token) localStorage.setItem('omnilflow_iframe_token', authData.token);
            }
            if (gCtx.locationId) {
              localStorage.setItem(`omnilflow_user_ghl_${gCtx.locationId}`, JSON.stringify(u));
              if (authData.token) localStorage.setItem(`omnilflow_token_ghl_${gCtx.locationId}`, authData.token);
            }
          }}
          onSwitchToLogin={() => setActiveTab('login')}
        />
      );
    }

    return (
      <div className="auth-page" style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>
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

        <OmniFlowLoginPage
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
          rememberMe={rememberMe}
          setRememberMe={setRememberMe}
          authLoading={authLoading}
          authError={authError}
          handleLogin={handleLogin}
          handleGoogleLogin={handleGoogleLogin}
          onOpenForgotPassword={() => {
            setForgotPasswordForm({ email: email || '', newPassword: '' });
            setForgotPasswordError(null);
            setShowForgotPasswordModal(true);
          }}
          onSwitchToRegister={() => {
            setActiveTab('register');
            setAuthError(null);
          }}
          ghlContext={ghlContext}
        />

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

  // Strict Subscription & Payment Gate Verification (Zero Access Until Verified or Expired)
  const isSuperAdmin = authUser.role === 'superadmin' || authUser.email === 'admin@omniflow.com' || authUser.email === 'kavyanshchopra@gmail.com' || authUser.email === 'kavayanshchopra@gmail.com';
  const subStatus = authUser.subscription_status || authUser.subscriptionStatus;
  const expiryDate = authUser.subscription_expiry || authUser.expiry_date;
  const isTimeExpired = Boolean(expiryDate && new Date(expiryDate).getTime() < Date.now());
  const isLocked = !isSuperAdmin && (
    subStatus === 'pending_payment' || 
    subStatus === 'payment_under_review' || 
    subStatus === 'expired' || 
    isTimeExpired
  );

  if (isLocked) {
    return (
      <PaymentGateScreen
        user={authUser}
        onLogout={() => {
          localStorage.clear();
          sessionStorage.clear();
          setAuthUser(null);
          setActiveTab('login');
        }}
        onPaymentVerified={(sub) => {
          setAuthUser(prev => ({ ...prev, subscription_status: 'active' }));
        }}
      />
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
