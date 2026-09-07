import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Eye,
  EyeOff,
  MapPin, 
  Briefcase, 
  Users, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  QrCode, 
  Copy, 
  Check, 
  ExternalLink,
  Plus,
  Minus,
  Layers,
  FileText,
  CreditCard,
  Zap,
  Info,
  Building,
  CheckCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import SubscriptionEngine, { 
  DEFAULT_PLANS, 
  DEFAULT_PRICING_CONFIG, 
  DEFAULT_MODULE_PRICING,
  INDIAN_STATES, 
  formatINR, 
  amountInWords,
  generateUpiQrCodeUrl,
  generateUpiPaymentString
} from '../core/engines/SubscriptionEngine';
import MasterModuleRegistry from '../core/registry/MasterModuleRegistry';
import FeatureProvisioningEngine from '../core/engines/FeatureProvisioningEngine';
import onboardingConfigService from '../core/services/onboardingConfigService';

export default function CompanyRegistrationWizard({ onComplete, onSwitchToLogin }) {
  const [config, setConfig] = useState(onboardingConfigService.getDefaultConfig());
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showAddons, setShowAddons] = useState(false);
  const [showManualUpi, setShowManualUpi] = useState(false);
  const [gatewayConfig, setGatewayConfig] = useState({ enabled: true, mode: 'test', keyId: 'rzp_test_omniflow_gateway' });

  // Load Razorpay Checkout SDK dynamically on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Load dynamic onboarding configuration & payment gateway config
  useEffect(() => {
    let isMounted = true;
    onboardingConfigService.initRealtimeSync();

    async function loadConfig() {
      try {
        const loaded = await onboardingConfigService.getOnboardingConfig(true);
        if (isMounted && loaded) setConfig(loaded);
      } catch (e) {
        console.warn('Failed to load onboarding config:', e);
      }
    }
    loadConfig();

    SubscriptionEngine.fetchPaymentConfig().then((cfg) => {
      if (isMounted && cfg) setGatewayConfig(cfg);
    });

    const unsub = onboardingConfigService.subscribe((updated) => {
      if (isMounted && updated) setConfig(updated);
    });
    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  // Step 1: Legal Company & Admin Account Form
  const [companyName, setCompanyName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [industry, setIndustry] = useState('Real Estate & Property');
  const [teamSize, setTeamSize] = useState('5-15');
  const [state, setState] = useState('Haryana');
  const [country, setCountry] = useState('IN');
  const [gstin, setGstin] = useState('');

  // Step 2: Dynamic Plan & Customization
  const activePlans = useMemo(() => config.plans || DEFAULT_PLANS, [config]);
  const [selectedPlanId, setSelectedPlanId] = useState('starter');
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [seatCount, setSeatCount] = useState(5);
  const [channelCount, setChannelCount] = useState(1);
  const [selectedAddons, setSelectedAddons] = useState([]);

  // Step 3: Payment Mode
  const [paymentMode, setPaymentMode] = useState('upi');
  const [utrRef, setUtrRef] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');

  // System Modules
  const allSystemModules = useMemo(() => {
    let list = [];
    try {
      if (typeof MasterModuleRegistry.getAllSystemManifests === 'function') {
        list = MasterModuleRegistry.getAllSystemManifests();
      } else if (typeof MasterModuleRegistry.getAllManifests === 'function') {
        list = MasterModuleRegistry.getAllManifests();
      }
    } catch (e) {}

    return (list || []).map(m => ({
      ...m,
      id: m.moduleId || m.id,
      name: m.name || m.title || m.moduleId || m.id,
      category: m.category || 'Platform Modules',
      icon: m.icon || '📦'
    }));
  }, []);

  const selectedPlan = useMemo(() => {
    return activePlans.find(p => p.id === selectedPlanId) || activePlans[1] || activePlans[0];
  }, [activePlans, selectedPlanId]);

  const availableAddons = useMemo(() => {
    const included = new Set(selectedPlan?.includedModules || []);
    return allSystemModules
      .filter(m => {
        try {
          return FeatureProvisioningEngine?.isModuleGloballyDisabled ? !FeatureProvisioningEngine.isModuleGloballyDisabled(m.id) : true;
        } catch (e) {
          return true;
        }
      })
      .filter(m => !included.has(m.id));
  }, [allSystemModules, selectedPlan]);

  const modulePricing = useMemo(() => {
    return { ...DEFAULT_MODULE_PRICING, ...(config.modulePricing || {}) };
  }, [config.modulePricing]);

  // Robust Plan Price Resolver (Fixes ₹0 bug)
  const getPlanPrice = (plan, cycle) => {
    if (plan.isTrial) return 0;
    if (cycle === 'yearly') {
      return plan.basePriceYearly || (plan.basePriceMonthly ? plan.basePriceMonthly * 10 : 0) || plan.priceYearly || ((plan.price || 1999) * 10);
    }
    return plan.basePriceMonthly ?? plan.price ?? 1999;
  };

  const handlePlanSelect = (plan) => {
    setSelectedPlanId(plan.id);
    setSeatCount(Math.max(plan.includedSeats || 5, 1));
    setChannelCount(Math.max(plan.includedChannels || 1, 1));
    const newIncluded = new Set(plan.includedModules || []);
    setSelectedAddons(prev => prev.filter(addonId => !newIncluded.has(addonId)));
  };

  const toggleAddon = (moduleId) => {
    setSelectedAddons(prev => 
      prev.includes(moduleId) ? prev.filter(id => id !== moduleId) : [...prev, moduleId]
    );
  };

  // Compute Cart Calculations
  const pricingSummary = useMemo(() => {
    return SubscriptionEngine.calculateCartSummary({
      planId: selectedPlanId,
      plans: activePlans,
      billingCycle,
      seatCount,
      channelCount,
      selectedAddonIds: selectedAddons,
      buyerState: state,
      buyerCountry: country,
      pricingConfig: {
        ...DEFAULT_PRICING_CONFIG,
        ...(config.pricing || {}),
        modulePricing
      }
    });
  }, [selectedPlanId, activePlans, billingCycle, seatCount, channelCount, selectedAddons, state, country, config.pricing, modulePricing]);

  // UPI Configuration
  const pricingConfig = config.pricing || DEFAULT_PRICING_CONFIG;
  const upiId = pricingConfig?.upi?.vpa || pricingConfig?.upiId || 'omniflow.crm@icici';
  const payeeName = pricingConfig?.upi?.payeeName || pricingConfig?.upiMerchantName || 'OmniFlow Technologies';
  
  const upiIntentString = useMemo(() => {
    return generateUpiPaymentString({
      upiId,
      merchantName: payeeName,
      amount: pricingSummary.grandTotal,
      transactionNote: `EMS-${(companyName || 'SUB').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10)}`
    });
  }, [upiId, payeeName, pricingSummary.grandTotal, companyName]);

  const qrUrl = useMemo(() => {
    return generateUpiQrCodeUrl(upiIntentString);
  }, [upiIntentString]);

  const handleCopy = (text, key) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  // Step 1 Validation
  const validateStep1 = () => {
    if (!companyName.trim()) {
      setErrorMsg('Please enter your official Company / Organization Name.');
      return false;
    }
    if (!adminName.trim()) {
      setErrorMsg('Please enter the Admin Full Name.');
      return false;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid Admin Work Email.');
      return false;
    }
    if (!phone.trim() || phone.length < 8) {
      setErrorMsg('Please enter a valid WhatsApp / Mobile Phone Number.');
      return false;
    }
    if (!password || password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return false;
    }
    setErrorMsg('');
    return true;
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!validateStep1()) return;
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (currentStep === 2) {
      if (selectedPlan.isTrial) {
        handleFinalSubmit(true);
      } else {
        setCurrentStep(3);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handleFinalSubmit = async (isTrialDirect = false) => {
    setLoading(true);
    setErrorMsg('');

    try {
      const isTrial = isTrialDirect || selectedPlan.isTrial;
      const res = await SubscriptionEngine.registerWithPlan({
        companyName: companyName.trim(),
        adminName: adminName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
        industry,
        teamSize,
        country,
        state,
        gstin: gstin.trim().toUpperCase(),
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        billingCycle,
        seats: seatCount,
        channels: channelCount,
        selectedAddons: [...(selectedPlan.includedModules || []), ...selectedAddons],
        pricingSummary,
        paymentMode: isTrial ? 'trial' : paymentMode,
        utrRef: isTrial ? 'FREE_TRIAL_ACTIVATION' : utrRef.trim(),
        receiptUrl: receiptUrl.trim(),
        isTrial,
        trialDays: selectedPlan.trialDays || 7
      });

      if (res.success) {
        if (res.token) {
          localStorage.setItem('omnilflow_token', res.token);
          localStorage.setItem('token', res.token);
        }
        if (onComplete) {
          onComplete(res);
        }
      } else {
        setErrorMsg(res.error || 'Registration failed. Please verify your details.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // Launch Automated Razorpay Checkout Popup
  const handleRazorpayPayment = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      // 1. Fetch Gateway Config
      const gatewayCfg = await SubscriptionEngine.fetchPaymentConfig();
      const keyId = gatewayCfg.keyId || gatewayConfig.keyId || 'rzp_test_omniflow_gateway';

      // 2. Create Order on Backend
      const orderRes = await SubscriptionEngine.createPaymentOrder({
        amount: pricingSummary.grandTotal,
        currency: 'INR',
        receipt: `rcpt_${(companyName || 'org').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10)}_${Date.now()}`,
        notes: {
          companyName: companyName.trim(),
          planId: selectedPlan.id,
          billingCycle
        }
      });

      if (!orderRes || !orderRes.order) {
        throw new Error(orderRes?.error || 'Failed to initialize Razorpay payment order');
      }

      const order = orderRes.order;

      // 3. Setup Razorpay Checkout Options
      const options = {
        key: keyId,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'OmniFlow EMS',
        description: `${selectedPlan.name} (${billingCycle === 'yearly' ? 'Annual' : 'Monthly'} Subscription)`,
        image: 'https://cdn-icons-png.flaticon.com/512/906/906334.png',
        order_id: order.id,
        prefill: {
          name: adminName || companyName,
          email: email,
          contact: phone
        },
        notes: {
          companyName,
          planName: selectedPlan.name,
          billingCycle
        },
        theme: {
          color: '#0d9488'
        },
        handler: async function (response) {
          setLoading(true);
          try {
            // Auto-verify signature and instantly activate workspace!
            const verifyRes = await SubscriptionEngine.verifyAndActivateRazorpay({
              razorpay_order_id: response.razorpay_order_id || order.id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature || 'mock_sandbox_sig',
              companyName: companyName.trim(),
              adminName: adminName.trim(),
              email: email.trim().toLowerCase(),
              phone: phone.trim(),
              password,
              industry,
              teamSize,
              country,
              state,
              gstin: gstin.trim().toUpperCase(),
              planId: selectedPlan.id,
              planName: selectedPlan.name,
              billingCycle,
              seats: seatCount,
              channels: channelCount,
              selectedAddons: [...(selectedPlan.includedModules || []), ...selectedAddons],
              pricingSummary
            });

            if (verifyRes.success) {
              if (verifyRes.token) {
                localStorage.setItem('omnilflow_token', verifyRes.token);
                localStorage.setItem('token', verifyRes.token);
              }
              if (onComplete) {
                onComplete(verifyRes);
              }
            } else {
              setErrorMsg(verifyRes.error || 'Payment verification failed. Please contact support.');
            }
          } catch (verErr) {
            setErrorMsg(verErr.message || 'Payment verification failed');
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          }
        }
      };

      if (typeof window !== 'undefined' && window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response) {
          setErrorMsg(`Payment failed: ${response.error.description || response.error.reason || 'Transaction could not be completed'}`);
          setLoading(false);
        });
        rzp.open();
      } else {
        // Safe interactive fallback for development/sandbox environments
        const fakePaymentId = `pay_sim_${Date.now()}`;
        const verifyRes = await SubscriptionEngine.verifyAndActivateRazorpay({
          razorpay_order_id: order.id,
          razorpay_payment_id: fakePaymentId,
          razorpay_signature: 'simulated_signature_sandbox',
          companyName: companyName.trim(),
          adminName: adminName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          password,
          industry,
          teamSize,
          country,
          state,
          gstin: gstin.trim().toUpperCase(),
          planId: selectedPlan.id,
          planName: selectedPlan.name,
          billingCycle,
          seats: seatCount,
          channels: channelCount,
          selectedAddons: [...(selectedPlan.includedModules || []), ...selectedAddons],
          pricingSummary
        });

        if (verifyRes.success) {
          if (verifyRes.token) {
            localStorage.setItem('omnilflow_token', verifyRes.token);
            localStorage.setItem('token', verifyRes.token);
          }
          if (onComplete) onComplete(verifyRes);
        } else {
          setErrorMsg(verifyRes.error || 'Simulated verification failed');
        }
        setLoading(false);
      }
    } catch (err) {
      console.error('[Razorpay Checkout Error]:', err);
      setErrorMsg(err.message || 'Failed to launch Razorpay payment modal');
      setLoading(false);
    }
  };

  return (
    <div className="omniflow-wizard-saas-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Caveat:wght@600;700&display=swap');

        .omniflow-wizard-saas-root {
          min-height: 100vh;
          width: 100%;
          background: #f2faf7;
          background-image: 
            radial-gradient(900px circle at 85% 25%, rgba(45, 212, 191, 0.40) 0%, rgba(13, 180, 158, 0.20) 42%, transparent 75%),
            radial-gradient(850px circle at 15% 75%, rgba(13, 180, 158, 0.35) 0%, rgba(20, 184, 166, 0.16) 45%, transparent 75%),
            radial-gradient(700px circle at 50% 10%, rgba(94, 234, 212, 0.30) 0%, transparent 65%);
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #0f172a;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow-x: hidden;
        }

        /* Ambient Glowing Atmosphere Orbs */
        .omniflow-wiz-glow-orb {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          z-index: 0;
        }
        .omniflow-wiz-glow-right {
          top: 4%;
          right: 3%;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(45, 212, 191, 0.40) 0%, rgba(13, 180, 158, 0.22) 42%, transparent 72%);
          filter: blur(55px);
        }
        .omniflow-wiz-glow-left {
          bottom: 4%;
          left: 3%;
          width: 580px;
          height: 580px;
          background: radial-gradient(circle, rgba(13, 180, 158, 0.35) 0%, rgba(20, 184, 166, 0.16) 42%, transparent 70%);
          filter: blur(55px);
        }

        /* Compact Header (Height ~48px) */
        .omniflow-wiz-header {
          position: sticky;
          top: 0;
          z-index: 40;
          background: rgba(255, 255, 255, 0.94);
          backdrop-filter: blur(14px);
          border-bottom: 1px solid rgba(226, 232, 240, 0.8);
          padding: 8px clamp(16px, 3.5vw, 36px);
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-sizing: border-box;
          height: 50px;
        }

        .omniflow-wiz-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          user-select: none;
        }

        .omniflow-wiz-logo-clover {
          width: 30px;
          height: 30px;
          flex-shrink: 0;
        }

        .omniflow-wiz-name {
          font-size: 18px;
          font-weight: 800;
          letter-spacing: -0.5px;
          color: #064e43;
          line-height: 1;
        }

        .omniflow-wiz-brand-divider {
          width: 1px;
          height: 14px;
          background: #cbd5e1;
        }

        .omniflow-wiz-tagline {
          font-size: 10px;
          font-weight: 600;
          color: #64748b;
          letter-spacing: 0.8px;
          text-transform: uppercase;
        }

        .omniflow-wiz-signin-link {
          font-size: 12.5px;
          color: #64748b;
          font-weight: 500;
        }
        .omniflow-wiz-signin-action {
          color: #0db49e;
          font-weight: 700;
          cursor: pointer;
          margin-left: 4px;
          text-decoration: none;
          transition: color 0.15s ease;
        }
        .omniflow-wiz-signin-action:hover {
          color: #064e43;
          text-decoration: underline;
        }

        /* Viewport-Fitting Container */
        .omniflow-wiz-container {
          width: 100%;
          max-width: 1120px;
          margin: 0 auto;
          padding: 6px 16px 12px;
          flex: 1;
          box-sizing: border-box;
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        /* 3-Step Pill Progress Stepper (Compact & Elegant) */
        .omniflow-stepper-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 8px;
        }

        .omniflow-stepper-pill-bar {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(13, 180, 158, 0.28);
          box-shadow: 0 2px 10px -2px rgba(13, 180, 158, 0.16);
          padding: 3px 12px;
          border-radius: 9999px;
        }

        .omniflow-step-item {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 3.5px 10px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .omniflow-step-item.active {
          background: #007a68;
          color: #ffffff;
          box-shadow: 0 2px 6px rgba(0, 122, 104, 0.35);
        }
        .omniflow-step-item.completed {
          color: #064e43;
          background: #e6f7f4;
        }

        .omniflow-step-icon-circle {
          width: 15px;
          height: 15px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9.5px;
        }

        .omniflow-step-divider-line {
          width: 16px;
          height: 1.5px;
          background: #cbd5e1;
        }

        /* Error Notification */
        .omniflow-wiz-error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          padding: 6px 12px;
          color: #ef4444;
          font-size: 11.5px;
          font-weight: 600;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
          width: 100%;
          max-width: 820px;
          box-sizing: border-box;
        }

        /* STEP 1: Floating Centered Card */
        .omniflow-step1-card {
          width: 100%;
          max-width: 820px;
          background: #ffffff;
          border-radius: 18px;
          border: 1px solid rgba(226, 232, 240, 0.9);
          padding: 14px clamp(14px, 2.5vw, 24px);
          box-shadow: 
            0 16px 40px -10px rgba(6, 78, 67, 0.12),
            0 4px 12px -2px rgba(15, 23, 42, 0.04),
            0 0 0 1px rgba(226, 232, 240, 0.9);
          box-sizing: border-box;
          text-align: center;
        }

        .omniflow-card-heading-center {
          font-size: clamp(17px, 2vh, 19px);
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 2px 0;
          letter-spacing: -0.5px;
        }

        .omniflow-card-subtitle-center {
          font-size: 11px;
          color: #64748b;
          margin: 0 0 10px 0;
          font-weight: 500;
        }

        /* Step 1 Two-Column Input Grid */
        .omniflow-form-grid-compact {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 7px 14px;
          text-align: left;
        }
        .omniflow-grid-full {
          grid-column: 1 / -1;
        }

        .omniflow-field-group {
          display: flex;
          flex-direction: column;
          gap: 2.5px;
          text-align: left;
        }

        .omniflow-field-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 11.5px;
          font-weight: 700;
          color: #1e293b;
        }

        .omniflow-tax-credit-badge {
          font-size: 9.5px;
          font-weight: 700;
          background: #e6f7f4;
          color: #064e43;
          padding: 1px 5px;
          border-radius: 4px;
        }

        .omniflow-input-box {
          position: relative;
          display: flex;
          align-items: center;
        }

        .omniflow-input-icon {
          position: absolute;
          left: 10px;
          color: #94a3b8;
          pointer-events: none;
        }

        .omniflow-input-control {
          width: 100%;
          padding: 6.5px 10px 6.5px 32px;
          border-radius: 7px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #0f172a;
          font-size: 11.5px;
          font-family: inherit;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .omniflow-input-control:focus {
          border-color: #0db49e;
          box-shadow: 0 0 0 2.5px rgba(13, 180, 158, 0.18);
        }

        .omniflow-eye-toggle {
          position: absolute;
          right: 10px;
          cursor: pointer;
          color: #94a3b8;
          display: flex;
          align-items: center;
        }
        .omniflow-eye-toggle:hover {
          color: #064e43;
        }

        /* Buttons */
        .omniflow-btn-primary {
          background: linear-gradient(135deg, #008775 0%, #005a4e 100%);
          color: #ffffff;
          border: none;
          border-radius: 7px;
          padding: 8px 18px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          box-shadow: 0 3px 10px rgba(0, 90, 78, 0.3);
          transition: transform 0.15s, filter 0.15s;
        }
        .omniflow-btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          filter: brightness(1.06);
          box-shadow: 0 4px 14px rgba(0, 90, 78, 0.4);
        }
        .omniflow-btn-primary:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .omniflow-btn-secondary {
          background: #ffffff;
          color: #475569;
          border: 1px solid #cbd5e1;
          border-radius: 7px;
          padding: 7px 14px;
          font-size: 11.5px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          transition: background 0.15s, border-color 0.15s;
        }
        .omniflow-btn-secondary:hover {
          background: #f8fafc;
          border-color: #94a3b8;
        }

        /* STEP 2: Viewport-Fitting Layout (Height Under 440px) */
        .omniflow-step2-wrapper {
          width: 100%;
          max-width: 1080px;
          display: grid;
          grid-template-columns: 1fr 275px;
          gap: 16px;
          align-items: start;
        }

        .omniflow-step2-main {
          background: #ffffff;
          border-radius: 18px;
          border: 1px solid rgba(226, 232, 240, 0.9);
          padding: 14px 18px;
          box-shadow: 0 14px 35px -8px rgba(6, 78, 67, 0.10);
          box-sizing: border-box;
          text-align: left;
        }

        .omniflow-billing-toggle {
          display: inline-flex;
          align-items: center;
          background: #e2e8f0;
          padding: 2px;
          border-radius: 9999px;
          margin-bottom: 8px;
        }
        .omniflow-billing-toggle-btn {
          padding: 3px 10px;
          border-radius: 9999px;
          border: none;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          background: transparent;
          color: #64748b;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .omniflow-billing-toggle-btn.active {
          background: #007a68;
          color: #ffffff;
          box-shadow: 0 2px 5px rgba(0, 122, 104, 0.3);
        }
        .omniflow-discount-badge {
          background: #0db49e;
          color: #ffffff;
          font-size: 8.5px;
          font-weight: 800;
          padding: 1px 4px;
          border-radius: 3px;
        }

        /* 4 Plans in Compact Height Grid */
        .omniflow-plans-row-compact {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-bottom: 8px;
        }

        .omniflow-plan-box-compact {
          background: #ffffff;
          border-radius: 12px;
          border: 1.5px solid #e2e8f0;
          padding: 10px 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
          display: flex;
          flex-direction: column;
          justifyContent: space-between;
          text-align: left;
          min-height: 148px;
        }
        .omniflow-plan-box-compact:hover {
          border-color: #0db49e;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px -2px rgba(13, 180, 158, 0.16);
        }
        .omniflow-plan-box-compact.selected {
          border-color: #0db49e;
          background: #ffffff;
          box-shadow: 0 6px 16px -3px rgba(13, 180, 158, 0.22), 0 0 0 1.5px #0db49e;
        }

        .omniflow-popular-tag {
          position: absolute;
          top: -8px;
          left: 50%;
          transform: translateX(-50%);
          background: #0db49e;
          color: #ffffff;
          font-size: 7.5px;
          font-weight: 800;
          padding: 1px 6px;
          border-radius: 9999px;
          letter-spacing: 0.5px;
          white-space: nowrap;
          box-shadow: 0 2px 5px rgba(13, 180, 158, 0.35);
        }

        .omniflow-plan-name {
          font-size: 12.5px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 2px;
        }

        .omniflow-plan-price-row {
          display: flex;
          align-items: baseline;
          gap: 2px;
          margin-bottom: 6px;
        }
        .omniflow-plan-price {
          font-size: 16.5px;
          font-weight: 800;
          color: #064e43;
        }
        .omniflow-plan-period {
          font-size: 9.5px;
          color: #64748b;
          font-weight: 600;
        }

        .omniflow-plan-features {
          list-style: none;
          padding: 0;
          margin: 0 0 6px 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .omniflow-plan-feat-item {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 9.5px;
          color: #475569;
          line-height: 1.2;
        }

        /* Order Summary Card (Compact) */
        .omniflow-summary-card {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          padding: 12px 14px;
          box-shadow: 0 10px 25px -6px rgba(15, 23, 42, 0.07), 0 0 0 1px rgba(226, 232, 240, 0.8);
          position: sticky;
          top: 60px;
          text-align: left;
        }

        .omniflow-summary-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
          padding-bottom: 6px;
          border-bottom: 1px solid #f1f5f9;
        }

        .omniflow-summary-title {
          font-size: 13px;
          font-weight: 800;
          color: #0f172a;
        }

        .omniflow-ssl-badge {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 9.5px;
          font-weight: 700;
          color: #166534;
          background: #dcfce7;
          padding: 1.5px 5px;
          border-radius: 4px;
        }

        .omniflow-summary-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 11px;
          color: #64748b;
          margin-bottom: 4px;
        }

        .omniflow-summary-total {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          padding-top: 6px;
          border-top: 1.5px dashed #cbd5e1;
          margin-top: 6px;
          margin-bottom: 8px;
        }
        .omniflow-total-lbl {
          font-size: 12.5px;
          font-weight: 800;
          color: #0f172a;
        }
        .omniflow-total-val {
          font-size: 17px;
          font-weight: 800;
          color: #007a68;
        }

        /* STEP 3: Centered Compact Card (Height Under 390px) */
        .omniflow-step3-card {
          width: 100%;
          max-width: 860px;
          background: #ffffff;
          border-radius: 18px;
          border: 1px solid rgba(226, 232, 240, 0.9);
          padding: 14px clamp(14px, 2.2vw, 22px);
          box-shadow: 0 14px 35px -8px rgba(6, 78, 67, 0.10);
          box-sizing: border-box;
          text-align: center;
        }

        .omniflow-step3-split {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          align-items: stretch;
          margin-top: 8px;
        }

        .omniflow-step3-panel {
          background: #ffffff;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          padding: 12px 14px;
          box-shadow: 0 2px 8px -2px rgba(15, 23, 42, 0.04);
          text-align: left;
          display: flex;
          flex-direction: column;
          justifyContent: space-between;
        }

        .omniflow-qr-card-box {
          background: #ffffff;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          padding: 6px 8px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.03);
          margin-bottom: 6px;
        }

        .omniflow-qr-image {
          width: 85px;
          height: 85px;
          border-radius: 5px;
          margin-bottom: 2px;
        }

        .omniflow-upi-copy-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 3px 6px;
          margin-top: 4px;
          width: 100%;
          box-sizing: border-box;
        }

        /* Responsive Breakpoints */
        @media (max-width: 1024px) {
          .omniflow-step2-wrapper,
          .omniflow-step3-split {
            grid-template-columns: 1fr;
          }
          .omniflow-plans-row-compact {
            grid-template-columns: repeat(2, 1fr);
          }
          .omniflow-form-grid-compact {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .omniflow-wiz-container {
            padding: 10px 8px 40px;
          }
          .omniflow-step1-card,
          .omniflow-step2-main,
          .omniflow-step3-card {
            padding: 14px 12px;
            border-radius: 16px;
          }
          .omniflow-plans-row-compact {
            grid-template-columns: 1fr;
          }
          .omniflow-stepper-pill-bar {
            padding: 3px 6px;
            gap: 4px;
          }
          .omniflow-step-item {
            padding: 3px 6px;
            font-size: 10px;
          }
          .omniflow-step-divider-line {
            width: 8px;
          }
        }
      `}</style>

      {/* Atmospheric Ambient Glow Orbs */}
      <div className="omniflow-wiz-glow-orb omniflow-wiz-glow-right" />
      <div className="omniflow-wiz-glow-orb omniflow-wiz-glow-left" />

      {/* Sticky Header */}
      <header className="omniflow-wiz-header">
        <div className="omniflow-wiz-brand">
          {/* 4-petal clover logo */}
          <svg className="omniflow-wiz-logo-clover" viewBox="0 0 48 48" fill="none">
            <rect width="48" height="48" rx="12" fill="#ffffff" />
            <path
              d="M16 12C12.6863 12 10 14.6863 10 18V24C10 27.3137 12.6863 30 16 30H22C25.3137 30 28 27.3137 28 24V18C28 14.6863 25.3137 12 22 12H16Z"
              stroke="#064e43"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M26 18C26 14.6863 28.6863 12 32 12H38C41.3137 12 44 14.6863 44 18V24C44 27.3137 41.3137 30 38 30H32C28.6863 30 26 27.3137 26 24V30C26 33.3137 28.6863 36 32 36H38C41.3137 36 44 33.3137 44 30"
              stroke="#0db49e"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="24" cy="24" r="3.5" fill="#0db49e" />
          </svg>

          <span className="omniflow-wiz-name">OmniFlow</span>
          <div className="omniflow-wiz-brand-divider" />
          <span className="omniflow-wiz-tagline">Manage · Automate · Grow</span>
        </div>

        <div className="omniflow-wiz-signin-link">
          Already have an account?{' '}
          <span onClick={onSwitchToLogin} className="omniflow-wiz-signin-action">
            Sign In →
          </span>
        </div>
      </header>

      {/* Main Container (Fits in 100% View) */}
      <main className="omniflow-wiz-container">
        {/* Modern 3-Step Stepper Pill */}
        <div className="omniflow-stepper-wrap">
          <div className="omniflow-stepper-pill-bar">
            <div 
              className={`omniflow-step-item ${currentStep === 1 ? 'active' : currentStep > 1 ? 'completed' : ''}`}
              onClick={() => { if (currentStep > 1) setCurrentStep(1); }}
            >
              <div className="omniflow-step-icon-circle">
                {currentStep > 1 ? <Check size={11} /> : '1'}
              </div>
              <span>Company Profile</span>
            </div>

            <div className="omniflow-step-divider-line" />

            <div 
              className={`omniflow-step-item ${currentStep === 2 ? 'active' : currentStep > 2 ? 'completed' : ''}`}
              onClick={() => { if (currentStep > 2 || validateStep1()) setCurrentStep(2); }}
            >
              <div className="omniflow-step-icon-circle">
                {currentStep > 2 ? <Check size={11} /> : '2'}
              </div>
              <span>Plan & Modules</span>
            </div>

            <div className="omniflow-step-divider-line" />

            <div 
              className={`omniflow-step-item ${currentStep === 3 ? 'active' : ''}`}
            >
              <div className="omniflow-step-icon-circle">3</div>
              <span>Billing & GST</span>
            </div>
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="omniflow-wiz-error">
            <Info size={15} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: ORGANIZATION PROFILE (Centered, 100% View Fit) */}
        {currentStep === 1 && (
          <div className="omniflow-step1-card">
            <h1 className="omniflow-card-heading-center">Organization Profile & Workspace Provisioning</h1>
            <p className="omniflow-card-subtitle-center">
              Enter your company details to deploy your dedicated tenant database and automated GST invoices.
            </p>

            <form onSubmit={(e) => { e.preventDefault(); handleNextStep(); }}>
              <div className="omniflow-form-grid-compact">
                {/* Legal Company Name */}
                <div className="omniflow-field-group omniflow-grid-full">
                  <div className="omniflow-field-header">
                    <span>Legal Organization / Company Name *</span>
                  </div>
                  <div className="omniflow-input-box">
                    <Building2 size={14} className="omniflow-input-icon" />
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Acme Technologies Private Limited"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="omniflow-input-control"
                    />
                  </div>
                </div>

                {/* Admin Full Name */}
                <div className="omniflow-field-group">
                  <div className="omniflow-field-header">
                    <span>Admin Full Name *</span>
                  </div>
                  <div className="omniflow-input-box">
                    <User size={14} className="omniflow-input-icon" />
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. John Doe"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      className="omniflow-input-control"
                    />
                  </div>
                </div>

                {/* Admin Work Email */}
                <div className="omniflow-field-group">
                  <div className="omniflow-field-header">
                    <span>Admin Work Email *</span>
                  </div>
                  <div className="omniflow-input-box">
                    <Mail size={14} className="omniflow-input-icon" />
                    <input 
                      type="email" 
                      required
                      placeholder="john@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="omniflow-input-control"
                    />
                  </div>
                </div>

                {/* WhatsApp / Mobile Number */}
                <div className="omniflow-field-group">
                  <div className="omniflow-field-header">
                    <span>WhatsApp / Mobile Number *</span>
                  </div>
                  <div className="omniflow-input-box">
                    <Phone size={14} className="omniflow-input-icon" />
                    <input 
                      type="tel" 
                      required
                      placeholder="e.g. +91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="omniflow-input-control"
                    />
                  </div>
                </div>

                {/* Master Password */}
                <div className="omniflow-field-group">
                  <div className="omniflow-field-header">
                    <span>Master Password *</span>
                  </div>
                  <div className="omniflow-input-box">
                    <Lock size={14} className="omniflow-input-icon" />
                    <input 
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Minimum 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="omniflow-input-control"
                      style={{ paddingRight: '36px' }}
                    />
                    <div 
                      onClick={() => setShowPassword(!showPassword)}
                      className="omniflow-eye-toggle"
                      title={showPassword ? 'Hide Password' : 'Show Password'}
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </div>
                  </div>
                </div>

                {/* State / Place of Supply */}
                <div className="omniflow-field-group">
                  <div className="omniflow-field-header">
                    <span>State / Place of Supply *</span>
                  </div>
                  <div className="omniflow-input-box">
                    <MapPin size={14} className="omniflow-input-icon" />
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="omniflow-input-control"
                      style={{ appearance: 'auto' }}
                    >
                      {INDIAN_STATES.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Company GSTIN */}
                <div className="omniflow-field-group">
                  <div className="omniflow-field-header">
                    <span>Company GSTIN</span>
                    <span className="omniflow-tax-credit-badge">18% Input Tax Credit</span>
                  </div>
                  <div className="omniflow-input-box">
                    <FileText size={14} className="omniflow-input-icon" />
                    <input 
                      type="text" 
                      placeholder="e.g. 06AAHCO0192A1Z6"
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value.toUpperCase())}
                      className="omniflow-input-control"
                    />
                  </div>
                </div>

                {/* Industry Sector */}
                <div className="omniflow-field-group">
                  <div className="omniflow-field-header">
                    <span>Industry Sector</span>
                  </div>
                  <div className="omniflow-input-box">
                    <Briefcase size={14} className="omniflow-input-icon" />
                    <select
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      className="omniflow-input-control"
                      style={{ appearance: 'auto' }}
                    >
                      <option value="Real Estate & Property">Real Estate & Property</option>
                      <option value="BFSI & Lending">BFSI & Lending</option>
                      <option value="Healthcare & Diagnostics">Healthcare & Diagnostics</option>
                      <option value="EdTech & Education">EdTech & Education</option>
                      <option value="Retail & D2C Ecommerce">Retail & D2C Ecommerce</option>
                      <option value="Automotive & Mobility">Automotive & Mobility</option>
                      <option value="Logistics & Supply Chain">Logistics & Supply Chain</option>
                      <option value="Manufacturing & Industrial">Manufacturing & Industrial</option>
                      <option value="Other Business">Other Business</option>
                    </select>
                  </div>
                </div>

                {/* Current Team Size */}
                <div className="omniflow-field-group">
                  <div className="omniflow-field-header">
                    <span>Current Team Size</span>
                  </div>
                  <div className="omniflow-input-box">
                    <Users size={14} className="omniflow-input-icon" />
                    <select
                      value={teamSize}
                      onChange={(e) => setTeamSize(e.target.value)}
                      className="omniflow-input-control"
                      style={{ appearance: 'auto' }}
                    >
                      <option value="1-5">1 - 5 Members</option>
                      <option value="5-15">5 - 15 Members</option>
                      <option value="15-50">15 - 50 Members</option>
                      <option value="50-200">50 - 200 Members</option>
                      <option value="200+">200+ Enterprise</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Bottom Action */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="submit" className="omniflow-btn-primary">
                  Continue to Plan Customizer →
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 2: CHOOSE YOUR SAAS PLAN & ADDONS (100% View Fit, Under 480px Height) */}
        {currentStep === 2 && (
          <div className="omniflow-step2-wrapper">
            {/* Left Side: Plans */}
            <div className="omniflow-step2-main">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                <div>
                  <h2 style={{ fontSize: '19px', fontWeight: '800', color: '#0f172a', margin: '0 0 2px 0' }}>
                    Choose Your SaaS Plan & Add-ons
                  </h2>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                    Select base tier and scale capacity with extra seats, channels, or specialized modules.
                  </p>
                </div>

                {/* Monthly / Yearly Toggle */}
                <div className="omniflow-billing-toggle">
                  <button
                    type="button"
                    className={`omniflow-billing-toggle-btn ${billingCycle === 'monthly' ? 'active' : ''}`}
                    onClick={() => setBillingCycle('monthly')}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    className={`omniflow-billing-toggle-btn ${billingCycle === 'yearly' ? 'active' : ''}`}
                    onClick={() => setBillingCycle('yearly')}
                  >
                    Yearly <span className="omniflow-discount-badge">2 Mo Free</span>
                  </button>
                </div>
              </div>

              {/* 4 Plans in Compact Height Grid (No Duplicates) */}
              <div className="omniflow-plans-row-compact">
                {activePlans.map((plan) => {
                  const isSelected = plan.id === selectedPlanId;
                  const price = getPlanPrice(plan, billingCycle);
                  const isPopular = plan.id === 'business' || plan.isPopular || plan.badge === 'popular';

                  return (
                    <div
                      key={plan.id}
                      className={`omniflow-plan-box-compact ${isSelected ? 'selected' : ''}`}
                      onClick={() => handlePlanSelect(plan)}
                    >
                      {isPopular && <div className="omniflow-popular-tag">MOST POPULAR</div>}

                      <div>
                        <div className="omniflow-plan-name">{plan.name}</div>
                        <div className="omniflow-plan-price-row">
                          <span className="omniflow-plan-price">
                            {plan.isTrial ? 'Free' : formatINR(price)}
                          </span>
                          <span className="omniflow-plan-period">
                            {plan.isTrial ? `/ ${plan.trialDays || 7} Days` : billingCycle === 'yearly' ? '/ yr' : '/ mo'}
                          </span>
                        </div>

                        <ul className="omniflow-plan-features">
                          {Array.isArray(plan.features) && plan.features.filter(f => f && String(f).trim()).length > 0 ? (
                            plan.features.filter(f => f && String(f).trim()).slice(0, 3).map((feat, fIdx) => (
                              <li key={fIdx} className="omniflow-plan-feat-item">
                                <Check size={11} color="#0db49e" />
                                <span>{feat}</span>
                              </li>
                            ))
                          ) : (
                            <>
                              <li className="omniflow-plan-feat-item">
                                <Check size={11} color="#0db49e" />
                                <span>{plan.includedSeats || 5} Employee Seats</span>
                              </li>
                              <li className="omniflow-plan-feat-item">
                                <Check size={11} color="#0db49e" />
                                <span>{plan.includedChannels || 1} WhatsApp Channel</span>
                              </li>
                              <li className="omniflow-plan-feat-item">
                                <Check size={11} color="#0db49e" />
                                <span>{plan.tagline || 'Standard Platform Modules'}</span>
                              </li>
                            </>
                          )}
                        </ul>
                      </div>

                      <div style={{ textAlign: 'center', marginTop: '6px' }}>
                        <span style={{ 
                          fontSize: '11px', 
                          fontWeight: '700', 
                          color: isSelected ? '#007a68' : '#64748b' 
                        }}>
                          {isSelected ? '✓ Selected' : 'Select Plan'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Optional Addons (Collapsible Drawer - Keeps Screen 100% Fit) */}
              {!selectedPlan.isTrial && availableAddons.length > 0 && (
                <div style={{ marginTop: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                  <div 
                    onClick={() => setShowAddons(!showAddons)}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      padding: '2px 0',
                      userSelect: 'none'
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Zap size={13} color="#0db49e" />
                      Optional Add-on Modules ({selectedAddons.length} active)
                    </span>
                    <span style={{ fontSize: '11px', color: '#0db49e', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {showAddons ? '− Collapse Add-ons' : '+ Expand Add-ons'}
                      {showAddons ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </span>
                  </div>

                  {showAddons && (
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
                      gap: '6px', 
                      marginTop: '6px',
                      maxHeight: '110px',
                      overflowY: 'auto',
                      paddingRight: '4px'
                    }}>
                      {availableAddons.slice(0, 6).map((addon) => {
                        const isChecked = selectedAddons.includes(addon.id);
                        return (
                          <div
                            key={addon.id}
                            onClick={() => toggleAddon(addon.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '5px 8px',
                              borderRadius: '7px',
                              border: isChecked ? '1.5px solid #0db49e' : '1px solid #e2e8f0',
                              background: isChecked ? '#f0fdf9' : '#ffffff',
                              cursor: 'pointer',
                              transition: 'all 0.15s'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                style={{ accentColor: '#0db49e', cursor: 'pointer' }}
                              />
                              <div>
                                <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#0f172a' }}>{addon.name}</div>
                                <div style={{ fontSize: '9px', color: '#64748b' }}>{addon.category || 'Module'}</div>
                              </div>
                            </div>
                            <span style={{ fontSize: '10px', fontWeight: '700', color: '#064e43' }}>
                              +₹{modulePricing[addon.id] !== undefined ? modulePricing[addon.id] : 299}/mo
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Navigation Back */}
              <div style={{ marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="omniflow-btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '11px' }}
                >
                  <ArrowLeft size={12} /> Back to Profile
                </button>
              </div>
            </div>

            {/* Right Side: Order Summary Card */}
            <div className="omniflow-summary-card">
              <div className="omniflow-summary-title-row">
                <span className="omniflow-summary-title">Order Summary</span>
                <span className="omniflow-ssl-badge">
                  <ShieldCheck size={11} /> 256-Bit SSL
                </span>
              </div>

              <div className="omniflow-summary-row">
                <span>Base Plan: {selectedPlan.name}</span>
                <span style={{ fontWeight: '700', color: '#0f172a' }}>
                  {selectedPlan.isTrial ? 'Free' : formatINR(pricingSummary.planPrice || pricingSummary.basePrice || getPlanPrice(selectedPlan, billingCycle))}
                </span>
              </div>

              {!selectedPlan.isTrial && (
                <>
                  <div className="omniflow-summary-row">
                    <span>Taxable Subtotal (SAC 998313)</span>
                    <span style={{ fontWeight: '700', color: '#0f172a' }}>
                      {formatINR(pricingSummary.taxableSubtotal)}
                    </span>
                  </div>

                  <div className="omniflow-summary-row">
                    <span>IGST (18% Inter-State)</span>
                    <span style={{ fontWeight: '700', color: '#0f172a' }}>
                      {formatINR(pricingSummary.igst || 0)}
                    </span>
                  </div>
                </>
              )}

              <div className="omniflow-summary-total">
                <span className="omniflow-total-lbl">Grand Total:</span>
                <span className="omniflow-total-val">
                  {selectedPlan.isTrial ? 'Free' : formatINR(pricingSummary.grandTotal)}
                </span>
              </div>

              {/* CTA Button */}
              <button
                type="button"
                onClick={handleNextStep}
                disabled={loading}
                className="omniflow-btn-primary"
                style={{ width: '100%' }}
              >
                {loading
                  ? 'Activating...'
                  : selectedPlan.isTrial
                  ? `Start ${selectedPlan.trialDays || 7}-Day Free Trial →`
                  : 'Proceed to Invoice & Payment →'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '10px', color: '#94a3b8' }}>
                Official Section 31 CGST Tax Invoice issued upon checkout
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: TAX INVOICE & INSTANT ACCOUNT ACTIVATION */}
        {currentStep === 3 && (
          <div className="omniflow-step3-card">
            <h2 className="omniflow-card-heading-center" style={{ fontSize: '18px' }}>
              Checkout & Instant Account Activation
            </h2>
            <p className="omniflow-card-subtitle-center" style={{ marginBottom: '6px' }}>
              Pay securely via Razorpay for instant automated activation, or transfer directly via 0% fee UPI.
            </p>

            <div className="omniflow-step3-split">
              {/* Left Panel: Tax Invoice Breakdown */}
              <div className="omniflow-step3-panel">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
                    <FileText size={13} color="#0db49e" />
                    <span style={{ fontSize: '12.5px', fontWeight: '800', color: '#0f172a' }}>
                      SAC 998313 Tax Breakdown
                    </span>
                  </div>

                  <div className="omniflow-summary-row" style={{ padding: '2.5px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span>Plan</span>
                    <span style={{ fontWeight: '700', color: '#0f172a' }}>
                      {selectedPlan.name} ({billingCycle})
                    </span>
                  </div>

                  <div className="omniflow-summary-row" style={{ padding: '2.5px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span>Taxable Value</span>
                    <span style={{ fontWeight: '700', color: '#0f172a' }}>
                      {formatINR(pricingSummary.taxableSubtotal)}
                    </span>
                  </div>

                  <div className="omniflow-summary-row" style={{ padding: '2.5px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span>IGST (18% Inter-State)</span>
                    <span style={{ fontWeight: '700', color: '#0f172a' }}>
                      {formatINR(pricingSummary.igst || 0)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '6px', marginBottom: '1px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>Grand Total:</span>
                    <span style={{ fontSize: '18px', fontWeight: '800', color: '#007a68' }}>
                      {formatINR(pricingSummary.grandTotal)}
                    </span>
                  </div>
                  <div style={{ fontSize: '8.5px', color: '#64748b', fontStyle: 'italic', marginBottom: '6px' }}>
                    in words: {amountInWords(pricingSummary.grandTotal)}
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '5px 8px', borderRadius: '5px', fontSize: '9px', color: '#64748b', lineHeight: 1.3 }}>
                  Official Section 31 CGST Act Invoice with seller GSTIN 06AAHCO0192A1Z6 issued on payment confirmation.
                </div>
              </div>

              {/* Right Panel: Primary Razorpay Online Activation & Collapsible Direct UPI */}
              <div className="omniflow-step3-panel" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* 1. Primary Razorpay Online Gateway Box */}
                <div style={{
                  background: '#f0fdfa',
                  border: '1.5px solid #0d9488',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  boxShadow: '0 2px 8px rgba(13, 148, 136, 0.08)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CreditCard size={14} color="#0d9488" />
                      Razorpay Online Checkout
                    </span>
                    <span style={{
                      fontSize: '9px',
                      fontWeight: '800',
                      color: '#065f46',
                      background: '#a7f3d0',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}>
                      ⚡ INSTANT ACTIVATION
                    </span>
                  </div>

                  <p style={{ fontSize: '10.5px', color: '#475569', margin: '0 0 10px 0', lineHeight: 1.35 }}>
                    Pay via UPI (GPay, PhonePe, Paytm), Debit/Credit Cards, or NetBanking. Your CRM workspace is activated automatically in real-time.
                  </p>

                  <button
                    type="button"
                    onClick={handleRazorpayPayment}
                    disabled={loading}
                    className="omniflow-btn-primary"
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      fontSize: '13px',
                      fontWeight: '800',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      background: 'linear-gradient(135deg, #0d9488 0%, #047857 100%)',
                      boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)',
                      borderRadius: '8px',
                      cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <Sparkles size={15} />
                    <span>
                      {loading ? 'Processing Payment...' : `Pay ${formatINR(pricingSummary.grandTotal)} via Razorpay →`}
                    </span>
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '6px', fontSize: '9px', color: '#64748b' }}>
                    <ShieldCheck size={11} color="#0d9488" />
                    <span>256-Bit SSL Encrypted • Zero Lockout • Auto-Activated</span>
                  </div>
                </div>

                {/* 2. Collapsible Alternative: Direct 0% UPI QR / UTR Input */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: '#ffffff' }}>
                  <div
                    onClick={() => setShowManualUpi(!showManualUpi)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      background: '#f8fafc',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <QrCode size={12} color="#64748b" />
                      Alternative: Direct 0% UPI QR / UTR Transfer
                    </span>
                    <span style={{ fontSize: '10px', color: '#0d9488', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '2px' }}>
                      {showManualUpi ? 'Hide QR' : 'Show QR & UTR'}
                      {showManualUpi ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </span>
                  </div>

                  {showManualUpi && (
                    <div style={{ padding: '10px' }}>
                      {/* QR Code Container */}
                      <div className="omniflow-qr-card-box">
                        <img
                          src={qrUrl}
                          alt="Scan to Pay via UPI"
                          className="omniflow-qr-image"
                        />
                        <div style={{ fontSize: '9.5px', fontWeight: '700', color: '#0f172a', marginBottom: '2px' }}>
                          Scan via GPay / PhonePe / Paytm
                        </div>

                        {/* Official Master UPI ID */}
                        <div className="omniflow-upi-copy-row">
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ fontSize: '7.5px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>OFFICIAL UPI ID</div>
                            <div style={{ fontSize: '10.5px', fontWeight: '800', color: '#064e43', fontFamily: 'monospace' }}>{upiId}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy(upiId, 'upi')}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '2.5px 7px',
                              borderRadius: '4px',
                              background: copiedKey === 'upi' ? '#dcfce7' : '#0db49e',
                              color: copiedKey === 'upi' ? '#166534' : '#ffffff',
                              border: 'none',
                              fontSize: '9.5px',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                          >
                            {copiedKey === 'upi' ? <Check size={9} /> : <Copy size={9} />}
                            {copiedKey === 'upi' ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      </div>

                      {/* UTR Input */}
                      <div className="omniflow-field-group" style={{ marginTop: '8px' }}>
                        <label className="omniflow-field-header" style={{ fontSize: '11px', marginBottom: '2px' }}>
                          <span>UTR / UPI Reference Number</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Enter 12-digit UPI reference number after payment"
                          value={utrRef}
                          onChange={(e) => setUtrRef(e.target.value)}
                          className="omniflow-input-control"
                          style={{ paddingLeft: '8px', height: '30px', fontSize: '11px' }}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleFinalSubmit(false)}
                        disabled={loading || !utrRef.trim()}
                        className="omniflow-btn-secondary"
                        style={{ width: '100%', marginTop: '6px', padding: '6px 12px', fontSize: '11.5px', fontWeight: '700' }}
                      >
                        Submit UTR for Manual Verification →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Step 3 Navigation Action Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="omniflow-btn-secondary"
                style={{ padding: '7px 16px', fontSize: '12px' }}
              >
                <ArrowLeft size={12} /> Back to Plans
              </button>

              <span style={{ fontSize: '11px', color: '#64748b' }}>
                Selected: <strong>{selectedPlan.name}</strong> • Total: <strong style={{ color: '#0d9488' }}>{formatINR(pricingSummary.grandTotal)}</strong>
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
