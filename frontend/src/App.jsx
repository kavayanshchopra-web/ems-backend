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
            const user = JSON.parse(savedLocUser);
            if (user && typeof window !== 'undefined') {
              const tId = user.tenantId || user.companyId || user.tenant_id;
              window.__omniflow_tenant = tId ? String(tId) : 'org_default';
            }
            return user;
          }
        }

        // Check per-tab/per-iframe session storage
        const savedIframeUser = sessionStorage.getItem('omnilflow_iframe_user');
        if (savedIframeUser) {
          const user = JSON.parse(savedIframeUser);
          if (user && typeof window !== 'undefined') {
            const tId = user.tenantId || user.companyId || user.tenant_id;
            window.__omniflow_tenant = tId ? String(tId) : 'org_default';
          }
          return user;
        }

        // Inside an iframe, NEVER fall back to global localStorage (prevents old account leakage across sub-accounts!)
        return null;
      }

      // CASE 2: Standalone browser access (outside iframe)
      const saved = localStorage.getItem('omnilflow_user');
      const user = saved ? JSON.parse(saved) : null;
      if (user && typeof window !== 'undefined') {
        const tId = user.tenantId || user.companyId || user.tenant_id;
        window.__omniflow_tenant = tId ? String(tId) : 'org_default';
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

        const ghlCtx = getGhlContext();
        const finalTenantId = tenantId;
        const userData = {
          id: fbUser?.uid || usedDirectProfile?.id || usedDirectProfile?.uid || `user_${Date.now()}`,
          email: cleanEmail,
          name: storedName,
          role: storedRole,
          companyName: storedCompanyName,
          tenantId: finalTenantId,
          companyId: finalTenantId,
          tenant_id: finalTenantId,
          locationId: ghlCtx.locationId || usedDirectProfile?.locationId || null
        };

        FirebaseCloudEngine.purgeAllLocalCaches();
        const userToken = fbUser?.accessToken || 'firebase_token';
        localStorage.setItem('omnilflow_token', userToken);
        localStorage.setItem('omnilflow_user', JSON.stringify(userData));
        localStorage.setItem('omnilflow_current_company', finalTenantId);

        // If inside an iframe / GHL sub-account, save iframe-specific session & bind to sub-account
        if (ghlCtx.isEmbedded) {
          sessionStorage.setItem('omnilflow_iframe_user', JSON.stringify(userData));
          sessionStorage.setItem('omnilflow_iframe_token', userToken);
        }

        if (ghlCtx.locationId) {
          localStorage.setItem(`omnilflow_user_ghl_${ghlCtx.locationId}`, JSON.stringify(userData));
          localStorage.setItem(`omnilflow_token_ghl_${ghlCtx.locationId}`, userToken);

          if (db) {
            try {
              await setDoc(doc(db, 'companies', finalTenantId), {
                ghl_location_id: ghlCtx.locationId,
                updatedAt: new Date().toISOString()
              }, { merge: true });
              await setDoc(doc(db, 'user_profiles', userData.id), {
                locationId: ghlCtx.locationId,
                updatedAt: new Date().toISOString()
              }, { merge: true });
            } catch (e) {}
          }

          // Also notify backend to link location
          fetch(`${API_URL}/v1/integrations/ghl/link-location`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': String(finalTenantId) },
            body: JSON.stringify({ companyId: finalTenantId, locationId: ghlCtx.locationId })
          }).catch(() => {});
        }

        setAuthUser(userData);
        if (typeof window !== 'undefined') window.__omniflow_tenant = finalTenantId;
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

        const userData = {
          id: fbUser.uid,
          email: fbUser.email,
          name: companyName ? `${companyName} Owner` : (ghlCtx.locationName || fbUser.email.split('@')[0]),
          role: userRole,
          companyName: companyName || ghlCtx.locationName || 'My Workspace',
          tenantId: uniqueTenantId,
          companyId: uniqueTenantId,
          tenant_id: uniqueTenantId,
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
        FirebaseCloudEngine.purgeAllLocalCaches();
        const userToken = fbUser.accessToken || 'firebase_token';
        localStorage.setItem('omnilflow_token', userToken);
        localStorage.setItem('omnilflow_user', JSON.stringify(userData));
        localStorage.setItem('omnilflow_current_company', uniqueTenantId);

        if (ghlCtx.isEmbedded) {
          sessionStorage.setItem('omnilflow_iframe_user', JSON.stringify(userData));
          sessionStorage.setItem('omnilflow_iframe_token', userToken);
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
            const u = authData.user || {
              id: 1,
              email: email,
              role: 'owner',
              tenant_id: authData.tenant?.id || authData.subscription?.tenant_id || 1,
              subscription_status: authData.subscription?.status || (authData.subscription?.is_trial ? 'trial' : 'pending_payment'),
              subscription_expiry: authData.subscription?.expiry_date,
              expiry_date: authData.subscription?.expiry_date,
              is_trial: authData.subscription?.is_trial ? 1 : 0
            };
            setAuthUser(u);
            localStorage.setItem('omnilflow_user', JSON.stringify(u));
            if (authData.token) {
              localStorage.setItem('omnilflow_token', authData.token);
              localStorage.setItem('token', authData.token);
            }
            if (typeof window !== 'undefined') {
              window.__omniflow_tenant = String(u.tenant_id || u.tenantId || 1);
            }
          }}
          onSwitchToLogin={() => setActiveTab('login')}
        />
      );
    }

    return (
      <div className="auth-page" style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
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
  const isSuperAdmin = authUser.role === 'superadmin' || authUser.email === 'admin@omniflow.com';
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
