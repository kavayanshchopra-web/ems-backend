/**
 * OMNIFLOW LOGIN PAGE CONFIGURATION SERVICE
 * Centralized dynamic content manager for the OmniFlow Login Screen.
 * Governed strictly by Super Admin via Firestore [system_config/login_page].
 */

import { db, doc, getDoc, setDoc } from '../../firebase';

export const DEFAULT_LOGIN_CONFIG = {
  heroTagline: 'WELCOME TO OMNIFLOW',
  heroHeading: 'Streamline Your Business, Effortlessly.',
  heroHighlightWord: 'Effortlessly.',
  heroDescription: 'An all-in-one platform to manage your team, automate processes and drive growth — beautifully simple.',
  features: [
    {
      id: 'f1',
      title: 'Unify Your Teams',
      description: 'Work together in one place',
      icon: 'Users',
      enabled: true
    },
    {
      id: 'f2',
      title: 'Track What Matters',
      description: 'Real-time insights',
      icon: 'TrendingUp',
      enabled: true
    },
    {
      id: 'f3',
      title: 'Automate Workflows',
      description: 'Save time, do more',
      icon: 'Settings',
      enabled: true
    },
    {
      id: 'f4',
      title: 'Scale Your Business',
      description: 'Built for growth',
      icon: 'BarChart3',
      enabled: true
    }
  ],
  loginHeading: 'Welcome Back',
  loginSubtitle: 'Sign in to your account to continue',
  signInButtonText: 'Sign In →',
  forgotPasswordText: 'Forgot password?',
  signUpPromptText: "Don't have an account?",
  signUpLinkText: 'Sign Up',
  googleButtonText: 'Continue with Google',
  showGoogleAuth: true,
  showLaptopVisual: true,
  workSmarterBadgeText: 'Work Smarter Together',
  footerText: 'Simple  |  Secure  |  Scalable',
  brandName: 'OmniFlow',
  brandTagline: 'Manage · Automate · Grow'
};

const STORAGE_KEY = 'omniflow_login_page_config';

export const loginConfigService = {
  /**
   * Load active login configuration (Cached Local -> Cloud Firestore fallback)
   */
  async getLoginConfig() {
    // 1. Check local cache first for zero-latency render
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Async background sync with cloud
        this.fetchCloudConfigBackground();
        return { ...DEFAULT_LOGIN_CONFIG, ...parsed };
      }
    } catch (e) {
      console.warn('Local login config read note:', e);
    }

    // 2. Fetch from Firestore if available
    try {
      if (db) {
        const docRef = doc(db, 'system_config', 'login_page');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          const merged = { ...DEFAULT_LOGIN_CONFIG, ...data };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          return merged;
        }
      }
    } catch (e) {
      console.warn('Firestore login config fetch note:', e);
    }

    return DEFAULT_LOGIN_CONFIG;
  },

  /**
   * Background sync to keep cache fresh
   */
  async fetchCloudConfigBackground() {
    try {
      if (db) {
        const docRef = doc(db, 'system_config', 'login_page');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const merged = { ...DEFAULT_LOGIN_CONFIG, ...snap.data() };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        }
      }
    } catch (e) {}
  },

  /**
   * Super Admin Exclusive: Save Login Page configuration
   */
  async saveLoginConfig(configUpdates, authUser) {
    if (!authUser || authUser.role !== 'superadmin') {
      throw new Error('Unauthorized: Only Super Admin can modify global Login Page configuration.');
    }

    const merged = {
      ...DEFAULT_LOGIN_CONFIG,
      ...configUpdates,
      updatedAt: new Date().toISOString(),
      updatedBy: authUser.email || 'superadmin'
    };

    // Save to Firestore
    if (db) {
      const docRef = doc(db, 'system_config', 'login_page');
      await setDoc(docRef, merged, { merge: true });
    }

    // Save locally
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
  }
};

export default loginConfigService;
