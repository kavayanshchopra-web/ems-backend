/**
 * OMNIFLOW EMS — ONBOARDING & PRICING CONFIGURATION SERVICE
 * Central dynamic service managing plans, limits, add-on pricing, and marketing copy.
 * Persists to Firestore (`system_config/onboarding_plans`) with fallback to DEFAULT_PLANS.
 */

import { db } from '../../firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import FirebaseCloudEngine from '../engines/FirebaseCloudEngine';
import { DEFAULT_PLANS, DEFAULT_PRICING_CONFIG, DEFAULT_MODULE_PRICING } from '../engines/SubscriptionEngine';

const LOCAL_STORAGE_KEY = 'omniflow_onboarding_config_cache';

class OnboardingConfigService {
  constructor() {
    this._cachedConfig = null;
    this._listeners = new Set();
    this._hasRealtimeListener = false;
    this._unsubRealtime = null;
  }

  getDefaultConfig() {
    return {
      brandName: 'OmniFlow EMS',
      brandTagline: 'Enterprise Cloud Provisioning & Dynamic Subscription Engine',
      steps: [
        { id: 1, label: 'Company Profile', short: 'Profile' },
        { id: 2, label: 'Plan & Modules', short: 'Plans' },
        { id: 3, label: 'Billing & GST', short: 'Payment' }
      ],
      plans: DEFAULT_PLANS,
      pricing: DEFAULT_PRICING_CONFIG,
      modulePricing: DEFAULT_MODULE_PRICING,
      billingCycleToggle: {
        monthlyLabel: 'Monthly',
        yearlyLabel: 'Yearly',
        discountBadgeText: '2 Mo Free',
        discountPercent: 16.6
      },
      capacityControls: {
        seatsHeading: 'Employee Seats',
        seatsSubtext: '+₹199/seat/mo',
        channelsHeading: 'WhatsApp Channels',
        channelsSubtext: '+₹499/channel/mo'
      },
      ctaLabels: {
        step1Next: 'Continue to Plan Customizer →',
        step2Next: 'Proceed to Payment →',
        step2Trial: 'Start Free Trial →',
        step3Submit: 'Verify & Activate Workspace →',
        signInPrompt: 'Already have a workspace?',
        signInLink: 'Sign In →'
      }
    };
  }

  initRealtimeSync() {
    if (this._hasRealtimeListener || !db) return;
    try {
      const docRef = doc(db, 'system_config', 'onboarding_plans');
      this._unsubRealtime = onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data && data.config) {
            this._cachedConfig = {
              ...this.getDefaultConfig(),
              ...data.config
            };
            try {
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this._cachedConfig));
            } catch (e) {}
            this._notifyListeners();
          }
        }
      }, (err) => {
        console.warn('[OnboardingConfigService] Realtime listener notice:', err.message);
      });
      this._hasRealtimeListener = true;
    } catch (e) {
      console.warn('[OnboardingConfigService] Init realtime sync error:', e);
    }
  }

  async getOnboardingConfig(forceRefresh = false) {
    if (!forceRefresh && this._cachedConfig) {
      return this._cachedConfig;
    }

    // 1. Try LocalStorage cache for instant 0ms startup
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        this._cachedConfig = JSON.parse(cached);
      }
    } catch (e) {}

    // 2. Direct Firestore document fetch
    if (db) {
      try {
        const docRef = doc(db, 'system_config', 'onboarding_plans');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data && data.config) {
            this._cachedConfig = {
              ...this.getDefaultConfig(),
              ...data.config
            };
            try {
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this._cachedConfig));
            } catch (e) {}
            this._notifyListeners();
            return this._cachedConfig;
          }
        }
      } catch (err) {
        console.warn('[OnboardingConfigService] Direct Firestore getDoc notice:', err);
      }
    }

    // 3. Fallback to FirebaseCloudEngine collection fetch
    try {
      const records = await FirebaseCloudEngine.fetchRecords('system_config', 'platform_superadmin');
      const docData = Array.isArray(records) ? records.find(r => r.id === 'onboarding_plans' || r._id === 'onboarding_plans') : null;

      if (docData && docData.config) {
        this._cachedConfig = {
          ...this.getDefaultConfig(),
          ...docData.config
        };
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this._cachedConfig));
        } catch (e) {}
        this._notifyListeners();
        return this._cachedConfig;
      }
    } catch (e) {
      console.warn('[OnboardingConfigService] Firestore load notice, using local/defaults:', e);
    }

    if (!this._cachedConfig) {
      this._cachedConfig = this.getDefaultConfig();
    }
    return this._cachedConfig;
  }

  async saveOnboardingConfig(newConfig) {
    this._cachedConfig = { ...this._cachedConfig, ...newConfig };
    
    // Save to LocalStorage immediately
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this._cachedConfig));
    } catch (e) {}

    // Direct Firestore document set
    if (db) {
      try {
        const docRef = doc(db, 'system_config', 'onboarding_plans');
        await setDoc(docRef, {
          id: 'onboarding_plans',
          config: this._cachedConfig,
          tenantId: 'platform_superadmin',
          updatedAt: new Date().toISOString()
        }, { merge: true });
        console.log('☁️ [OnboardingConfigService] Saved directly to Firestore system_config/onboarding_plans');
      } catch (e) {
        console.warn('[OnboardingConfigService] Direct Firestore setDoc notice:', e);
      }
    }

    // Also persist through FirebaseCloudEngine adapter
    try {
      await FirebaseCloudEngine.saveRecord(
        'system_config',
        {
          id: 'onboarding_plans',
          config: this._cachedConfig,
          updatedAt: new Date().toISOString()
        },
        'platform_superadmin'
      );
    } catch (e) {
      console.warn('[OnboardingConfigService] Firestore save notice:', e);
    }

    this._notifyListeners();
    return { success: true, config: this._cachedConfig };
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  _notifyListeners() {
    for (const listener of this._listeners) {
      try {
        listener(this._cachedConfig);
      } catch (e) {}
    }
  }
}

const onboardingConfigService = new OnboardingConfigService();
export default onboardingConfigService;
