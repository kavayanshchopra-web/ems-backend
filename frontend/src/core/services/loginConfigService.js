/**
 * OMNIFLOW LOGIN PAGE CONFIGURATION SERVICE
 * Centralized dynamic content manager for the OmniFlow Login Screen.
 * Governed strictly by Super Admin via Firestore [system_config/login_page].
 */

import { db, doc, getDoc, setDoc } from '../../firebase';
import { isSandboxEnvironment, SupabaseSandboxService } from './supabaseSandboxService';

export const DEFAULT_LOGIN_CONFIG = {
  heroTagline: 'ENTERPRISE WORKFORCE & SIM TELECALLER',
  heroHeading: 'Manage Your Workforce, Smartly & Effortlessly.',
  heroHighlightWord: 'Smartly & Effortlessly.',
  heroDescription: 'Unified HR, SIM Telecalling, WhatsApp CRM & Payroll — crafted for high-performing teams.',
  features: [
    {
      id: 'f1',
      title: 'Unified Workforce',
      description: 'Attendance, shifts & payroll in one place',
      icon: 'Users',
      enabled: true
    },
    {
      id: 'f2',
      title: 'SIM Telecalling',
      description: 'Native call recording & instant CRM sync',
      icon: 'PhoneCall',
      enabled: true
    },
    {
      id: 'f3',
      title: 'WhatsApp Automation',
      description: 'Live shared inbox & smart workflows',
      icon: 'MessageSquare',
      enabled: true
    },
    {
      id: 'f4',
      title: 'Real-Time Insights',
      description: 'Live team tracking & business growth analytics',
      icon: 'TrendingUp',
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
  brandName: 'EMS',
  brandTagline: 'Manage · Automate · Grow'
};

const STORAGE_KEY = 'omniflow_login_page_config';

export const loginConfigService = {
  /**
   * Load active login configuration (Cached Local -> Cloud Firestore fallback)
   */
  async getLoginConfig() {
    // 0. Sandbox Supabase fallback
    if (isSandboxEnvironment()) {
      try {
        const records = await SupabaseSandboxService.fetchUniversalRecords('system_config', 1);
        const found = Array.isArray(records) ? records.find(r => r.id === 'login_page') : null;
        if (found) {
          return { ...DEFAULT_LOGIN_CONFIG, ...found };
        }
      } catch (sbErr) {}
    }

    // 1. Check local cache first for zero-latency render
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
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

    // Save to Sandbox Supabase
    if (isSandboxEnvironment()) {
      try {
        await SupabaseSandboxService.saveUniversalRecord('system_config', { id: 'login_page', ...merged }, 1, 'login_page');
      } catch (sbErr) {}
    }

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
