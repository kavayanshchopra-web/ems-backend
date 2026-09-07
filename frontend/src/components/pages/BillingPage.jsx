import React, { useState, useEffect, useMemo } from 'react';
import { 
  CreditCard, 
  ShieldCheck, 
  Calendar, 
  Users, 
  Phone, 
  Sparkles, 
  QrCode, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText, 
  Printer, 
  RefreshCw, 
  Plus, 
  Minus, 
  Check, 
  Copy, 
  ExternalLink, 
  Layers, 
  Zap,
  ArrowRight,
  HelpCircle,
  Building
} from 'lucide-react';
import SubscriptionEngine, { 
  DEFAULT_PLANS, 
  DEFAULT_PRICING_CONFIG, 
  DEFAULT_MODULE_PRICING,
  formatINR, 
  amountInWords, 
  generateUpiQrCodeUrl, 
  generateUpiPaymentString 
} from '../../core/engines/SubscriptionEngine';
import MasterModuleRegistry from '../../core/registry/MasterModuleRegistry';
import FeatureProvisioningEngine from '../../core/engines/FeatureProvisioningEngine';
import InvoiceReceiptModal from '../InvoiceReceiptModal';
import onboardingConfigService from '../../core/services/onboardingConfigService';

export default function BillingPage({ user, showToast }) {
  const [subscription, setSubscription] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [pricingConfig, setPricingConfig] = useState(DEFAULT_PRICING_CONFIG);
  const [plansConfig, setPlansConfig] = useState(onboardingConfigService.getDefaultConfig());
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  // Upgrade / Renewal Customizer State
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [targetPlanId, setTargetPlanId] = useState('pro');
  const [billingCycle, setBillingCycle] = useState('yearly');
  const [seatCount, setSeatCount] = useState(15);
  const [channelCount, setChannelCount] = useState(3);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [renewalUtr, setRenewalUtr] = useState('');
  const [submittingRenewal, setSubmittingRenewal] = useState(false);
  const [renewalNotice, setRenewalNotice] = useState(null);

  // All system modules from registry
  const allModules = useMemo(() => {
    let list = [];
    try {
      if (MasterModuleRegistry && typeof MasterModuleRegistry.getAllManifests === 'function') {
        list = MasterModuleRegistry.getAllManifests();
      } else if (MasterModuleRegistry && typeof MasterModuleRegistry.getAllSystemManifests === 'function') {
        list = MasterModuleRegistry.getAllSystemManifests();
      }
    } catch (e) {}

    if (!Array.isArray(list) || list.length === 0) {
      list = [
        { id: 'employees', name: 'Employees Directory', category: 'HR & Workforce', icon: '👥' },
        { id: 'recruitment_ats', name: 'Recruitment & ATS', category: 'HR & Workforce', icon: '💼' },
        { id: 'asset_management', name: 'Asset Management', category: 'HR & Workforce', icon: '💻' },
        { id: 'verify_documents', name: 'Verify Documents', category: 'HR & Workforce', icon: '📄' },
        { id: 'offboarding', name: 'Offboarding Exit', category: 'HR & Workforce', icon: '🚪' },
        { id: 'payroll', name: 'Payroll & Salary Slips', category: 'Finance & Payroll', icon: '💰' },
        { id: 'taxes_compliance', name: 'Taxes & Compliance', category: 'Finance & Payroll', icon: '⚖️' },
        { id: 'ff_settlements', name: 'F&F Settlements', category: 'Finance & Payroll', icon: '🧾' },
        { id: 'advances_loans', name: 'Advances & Loans', category: 'Finance & Payroll', icon: '💳' },
        { id: 'expenses', name: 'Expenses Claim', category: 'Finance & Payroll', icon: '📊' },
        { id: 'contacts', name: 'Contacts & Leads', category: 'CRM & Sales', icon: '👥' },
        { id: 'conversations', name: 'WhatsApp Conversations', category: 'CRM & Sales', icon: '💬' },
        { id: 'wa_live_web', name: 'WhatsApp Web Live Hub', category: 'CRM & Sales', icon: '📱' },
        { id: 'kanban', name: 'CRM Deals Pipeline', category: 'CRM & Sales', icon: '📊' },
        { id: 'telecalling', name: 'SIM Calls & Cloud PBX', category: 'Field & Telephony', icon: '📞' },
        { id: 'gps_attendance', name: 'Live GPS Field Tracking', category: 'Field & Telephony', icon: '📍' },
        { id: 'tasks', name: 'Tasks Board', category: 'Platform Operations', icon: '📋' },
        { id: 'office_kiosk', name: 'Office Kiosk Terminal', category: 'Platform Operations', icon: '⏱️' },
        { id: 'notice_board', name: 'Notice Board', category: 'Platform Operations', icon: '📢' },
        { id: 'holidays', name: 'Holidays Calendar', category: 'Platform Operations', icon: '📅' },
        { id: 'audit_logs', name: 'System Audit Logs', category: 'Platform Operations', icon: '🛡️' },
        { id: 'media_storage', name: 'Media Storage Vault', category: 'Platform Operations', icon: '🗄️' },
        { id: 'feedback', name: 'Feedback & Suggestions', category: 'Platform Operations', icon: '💌' }
      ];
    }

    return list.map(m => ({
      ...m,
      id: m.moduleId || m.id,
      name: m.name || m.title || m.moduleId || m.id
    }));
  }, []);

  const loadBillingData = async () => {
    setLoading(true);
    try {
      const tenantId = user?.tenant_id || user?.tenantId || 1;

      // 1. Fetch Subscription
      const subData = await SubscriptionEngine.fetchTenantSubscription(tenantId);
      if (subData) {
        setSubscription(subData);
        setTargetPlanId(subData.plan_id || 'pro');
        setSeatCount(subData.seats_limit || 15);
        setChannelCount(subData.channels_limit || 3);
      }

      // 2. Fetch Invoices
      const invData = await SubscriptionEngine.fetchTenantInvoices(tenantId);
      if (Array.isArray(invData)) {
        setInvoices(invData);
      }

      // 3. Fetch Pricing Config
      const config = await SubscriptionEngine.fetchPricingConfig();
      if (config) {
        setPricingConfig(prev => ({ ...prev, ...config }));
      }
    } catch (err) {
      console.error('Failed to load billing data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBillingData();
    let isMounted = true;
    onboardingConfigService.getOnboardingConfig().then(cfg => {
      if (isMounted && cfg) setPlansConfig(cfg);
    });
    const unsub = onboardingConfigService.subscribe((updated) => {
      if (isMounted && updated) setPlansConfig(updated);
    });
    return () => {
      isMounted = false;
      unsub();
    };
  }, [user]);

  const activePlans = useMemo(() => plansConfig.plans || DEFAULT_PLANS, [plansConfig]);
  const targetPlan = useMemo(() => {
    return activePlans.find(p => p.id === targetPlanId) || activePlans.find(p => !p.isTrial) || activePlans[0] || DEFAULT_PLANS[2];
  }, [activePlans, targetPlanId]);

  const availableAddons = useMemo(() => {
    const included = new Set(targetPlan.includedModules || []);
    return allModules
      .filter(m => {
        try {
          return FeatureProvisioningEngine?.isModuleGloballyDisabled ? !FeatureProvisioningEngine.isModuleGloballyDisabled(m.id) : true;
        } catch (e) {
          return true;
        }
      })
      .filter(m => !included.has(m.id));
  }, [allModules, targetPlan]);

  const toggleAddon = (moduleId) => {
    setSelectedAddons(prev => 
      prev.includes(moduleId) ? prev.filter(id => id !== moduleId) : [...prev, moduleId]
    );
  };

  // Expiry Calculations
  const expiryDetails = useMemo(() => {
    if (!subscription) return { daysLeft: 0, isExpiringSoon: false };
    const exp = subscription.expires_at || subscription.expiry_date || subscription.trial_ends_at;
    if (!exp) return { daysLeft: 999, isExpiringSoon: false };
    const diff = new Date(exp).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return {
      daysLeft: Math.max(0, days),
      isExpiringSoon: days <= 7,
      formattedDate: new Date(exp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    };
  }, [subscription]);

  const modulePricing = useMemo(() => {
    return { ...DEFAULT_MODULE_PRICING, ...(plansConfig.modulePricing || {}) };
  }, [plansConfig.modulePricing]);

  // Dynamic Cart Summary
  const pricingSummary = useMemo(() => {
    return SubscriptionEngine.calculateCartSummary({
      planId: targetPlanId,
      plans: activePlans,
      billingCycle,
      seatCount,
      channelCount,
      selectedAddonIds: selectedAddons,
      buyerState: subscription?.buyer_state || 'Haryana',
      buyerCountry: 'IN',
      pricingConfig: {
        ...DEFAULT_PRICING_CONFIG,
        ...(plansConfig.pricing || {}),
        modulePricing
      }
    });
  }, [targetPlanId, activePlans, billingCycle, seatCount, channelCount, selectedAddons, subscription, plansConfig.pricing, modulePricing]);

  // UPI Strings
  const upiId = pricingConfig?.upi?.vpa || pricingConfig?.upiId || DEFAULT_PRICING_CONFIG?.upi?.vpa || 'omniflow.crm@icici';
  const payeeName = pricingConfig?.upi?.payeeName || pricingConfig?.upiMerchantName || DEFAULT_PRICING_CONFIG?.upi?.payeeName || 'OmniFlow Technologies';
  
  const upiIntentString = useMemo(() => {
    return generateUpiPaymentString({
      upiId,
      merchantName: payeeName,
      amount: pricingSummary.grandTotal,
      transactionNote: `EMS-RENEW-${(subscription?.company_name || 'SUB').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)}`
    });
  }, [upiId, payeeName, pricingSummary.grandTotal, subscription]);

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

  const handleCreateRenewalOrder = async (e) => {
    e.preventDefault();
    if (!renewalUtr.trim()) {
      setRenewalNotice({ type: 'error', message: 'Please enter your 12-digit UPI UTR number after paying.' });
      return;
    }

    setSubmittingRenewal(true);
    setRenewalNotice(null);

    try {
      const res = await SubscriptionEngine.createRenewalOrder({
        tenantId: user?.tenant_id || user?.tenantId || 1,
        planId: targetPlan.id,
        planName: targetPlan.name,
        billingCycle,
        seats: seatCount,
        channels: channelCount,
        selectedAddons,
        pricingSummary,
        utrRef: renewalUtr.trim(),
        paymentMode: 'upi'
      });

      if (res.success) {
        setRenewalNotice({ type: 'success', message: 'Renewal request & UTR submitted successfully! Super Admin will verify and extend validity.' });
        setRenewalUtr('');
        loadBillingData();
        if (typeof showToast === 'function') showToast('Renewal order submitted for review', 'success');
      } else {
        setRenewalNotice({ type: 'error', message: res.error || 'Failed to submit renewal request.' });
      }
    } catch (err) {
      setRenewalNotice({ type: 'error', message: err.message || 'Error creating renewal request' });
    } finally {
      setSubmittingRenewal(false);
    }
  };

  // Theme styles matching OmniFlow EMS v2.0
  const s = {
    container: {
      padding: '24px 32px',
      color: '#0f172a',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      maxWidth: '1240px',
      margin: '0 auto',
      boxSizing: 'border-box'
    },
    headerRow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '24px',
      flexWrap: 'wrap',
      gap: '16px'
    },
    title: {
      fontSize: '22px',
      fontWeight: '800',
      color: '#0f2b26',
      margin: 0,
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    subtitle: {
      fontSize: '13px',
      color: '#64748b',
      margin: '4px 0 0 0'
    },
    card: {
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '16px',
      padding: '22px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
      boxSizing: 'border-box',
      position: 'relative'
    },
    btnPrimary: {
      background: '#0d9488',
      color: '#ffffff',
      border: 'none',
      padding: '10px 18px',
      borderRadius: '8px',
      fontSize: '13px',
      fontWeight: '700',
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      boxShadow: '0 2px 6px rgba(13, 148, 136, 0.25)',
      transition: 'background 0.15s ease'
    },
    btnSecondary: {
      background: '#ffffff',
      border: '1px solid #cbd5e1',
      color: '#475569',
      padding: '8px 14px',
      borderRadius: '8px',
      fontSize: '12.5px',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px'
    },
    input: {
      width: '100%',
      padding: '10px 14px',
      background: '#ffffff',
      border: '1px solid #cbd5e1',
      borderRadius: '8px',
      color: '#0f172a',
      fontSize: '13px',
      outline: 'none',
      boxSizing: 'border-box'
    }
  };

  return (
    <div style={s.container}>
      
      {/* Top Header Row */}
      <div style={s.headerRow}>
        <div>
          <h1 style={s.title}>
            <CreditCard size={24} style={{ color: '#0d9488' }} />
            <span>Workspace Subscription & Billing</span>
          </h1>
          <p style={s.subtitle}>
            Manage workspace capacity, view official GST Tax Invoices (SAC 998313), and customize add-ons.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={loadBillingData}
            disabled={loading}
            style={s.btnSecondary}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCustomizerOpen(!isCustomizerOpen)}
            style={s.btnPrimary}
          >
            <Sparkles size={14} />
            <span>{isCustomizerOpen ? 'Close Customizer' : '⚡ Upgrade / Renew Plan'}</span>
          </button>
        </div>
      </div>

      {/* Near Expiry Urgent Banner (Amber/Red themed to match EMS) */}
      {expiryDetails.isExpiringSoon && (
        <div style={{
          background: '#fffbeb',
          border: '1.5px solid #fde68a',
          borderRadius: '14px',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 8px rgba(245, 158, 11, 0.08)',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Clock size={22} style={{ color: '#d97706' }} />
            <div>
              <strong style={{ fontSize: '14px', color: '#92400e', display: 'block' }}>
                Urgent Notice: Subscription Expires in {expiryDetails.daysLeft} Day{expiryDetails.daysLeft === 1 ? '' : 's'} ({expiryDetails.formattedDate})
              </strong>
              <span style={{ fontSize: '12.5px', color: '#b45309' }}>
                Renew now to maintain uninterrupted CRM deals, WhatsApp sessions, and telecalling recordings.
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsCustomizerOpen(true)}
            style={{
              background: '#d97706',
              color: '#ffffff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(217, 119, 6, 0.3)'
            }}
          >
            Renew Plan Now →
          </button>
        </div>
      )}

      {/* 3 Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        
        {/* Card 1: Plan Tier */}
        <div style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Active Subscription
            </span>
            <span style={{
              fontSize: '11px',
              fontWeight: '800',
              padding: '2px 9px',
              borderRadius: '20px',
              background: subscription?.status === 'active' ? '#ecfdf5' : '#fffbeb',
              color: subscription?.status === 'active' ? '#047857' : '#b45309',
              border: subscription?.status === 'active' ? '1px solid #a7f3d0' : '1px solid #fde68a'
            }}>
              {subscription?.status === 'active' ? 'Active' : (subscription?.status || 'Active')}
            </span>
          </div>
          <h3 style={{ fontSize: '22px', fontWeight: '800', margin: 0, color: '#0f172a' }}>
            {subscription?.plan_name || 'Business Pro Tier'}
          </h3>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 16px 0' }}>
            Billing Cycle: <strong style={{ color: '#1e293b', textTransform: 'capitalize' }}>{subscription?.billing_cycle || 'Yearly'}</strong>
          </p>
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', fontSize: '12px', color: '#475569' }}>
            Expires: <strong style={{ color: '#0f172a' }}>{expiryDetails.formattedDate || '31 Dec 2026'}</strong> ({expiryDetails.daysLeft} days remaining)
          </div>
        </div>

        {/* Card 2: Seats Gauge */}
        <div style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Employee Seats
            </span>
            <Users size={18} style={{ color: '#0284c7' }} />
          </div>
          <h3 style={{ fontSize: '22px', fontWeight: '800', margin: 0, color: '#0f172a' }}>
            {subscription?.seats_limit || 15} Seats
          </h3>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 16px 0' }}>
            Workspace accounts provisioned for your team
          </p>
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', fontSize: '12px', color: '#475569' }}>
            Scale extra seats anytime at <strong>₹199/seat/mo</strong>
          </div>
        </div>

        {/* Card 3: WhatsApp Channels */}
        <div style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              WhatsApp Channels
            </span>
            <Phone size={18} style={{ color: '#7c3aed' }} />
          </div>
          <h3 style={{ fontSize: '22px', fontWeight: '800', margin: 0, color: '#0f172a' }}>
            {subscription?.channels_limit || 3} Channels
          </h3>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 16px 0' }}>
            Simultaneous WhatsApp Web & Cloud numbers paired
          </p>
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', fontSize: '12px', color: '#475569' }}>
            Add extra numbers anytime at <strong>₹499/channel/mo</strong>
          </div>
        </div>
      </div>

      {/* Upgrade / Renewal Customizer Drawer */}
      {isCustomizerOpen && (
        <div style={{ ...s.card, marginBottom: '28px', border: '2px solid #0d9488', background: '#f8fafc' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: '#0f2b26' }}>
                Customize Plan Upgrade / Renewal
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                Select desired tier and capacity. Instant 0% fee UPI QR code generated with SAC 998313 Tax Breakdown.
              </p>
            </div>

            {/* Billing Cycle Toggle */}
            <div style={{ display: 'flex', background: '#ffffff', padding: '4px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  background: billingCycle === 'monthly' ? '#0d9488' : 'transparent',
                  color: billingCycle === 'monthly' ? '#ffffff' : '#64748b'
                }}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('yearly')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  background: billingCycle === 'yearly' || billingCycle === 'annual' ? '#0d9488' : 'transparent',
                  color: billingCycle === 'yearly' || billingCycle === 'annual' ? '#ffffff' : '#64748b'
                }}
              >
                Yearly (2 Mo Free)
              </button>
            </div>
          </div>

          {/* Plan Selector */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
            {activePlans.filter(p => !p.isTrial).map(plan => {
              const isSelected = targetPlanId === plan.id;
              const price = billingCycle === 'yearly' ? plan.basePriceYearly : plan.basePriceMonthly;

              return (
                <div
                  key={plan.id}
                  onClick={() => {
                    setTargetPlanId(plan.id);
                    setSeatCount(plan.includedSeats);
                    setChannelCount(plan.includedChannels);
                  }}
                  style={{
                    background: isSelected ? '#f0fdfa' : '#ffffff',
                    border: isSelected ? '2px solid #0d9488' : '1px solid #cbd5e1',
                    borderRadius: '12px',
                    padding: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '15px', color: '#0f172a' }}>{plan.name}</strong>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      border: isSelected ? '5px solid #0d9488' : '2px solid #cbd5e1',
                      background: '#ffffff'
                    }} />
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#0d9488', margin: '8px 0 4px 0' }}>
                    {formatINR(price)}
                  </div>
                  <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                    {plan.includedSeats} Seats • {plan.includedChannels} WhatsApp Numbers
                  </span>
                </div>
              );
            })}
          </div>

          {/* Steppers & Order Summary Split */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            
            {/* Left Column: Capacity Steppers & Addons */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', padding: '12px 16px', borderRadius: '10px', marginBottom: '10px', border: '1px solid #e2e8f0' }}>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', display: 'block' }}>Total Employee Seats</span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>{targetPlan.includedSeats} included in base</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setSeatCount(prev => Math.max(targetPlan.includedSeats, prev - 1))}
                    style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#334155', cursor: 'pointer', fontWeight: '800' }}
                  >
                    -
                  </button>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: '#0d9488', minWidth: '24px', textAlign: 'center' }}>
                    {seatCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSeatCount(prev => prev + 1)}
                    style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#0d9488', border: 'none', color: '#ffffff', cursor: 'pointer', fontWeight: '800' }}
                  >
                    +
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', padding: '12px 16px', borderRadius: '10px', marginBottom: '14px', border: '1px solid #e2e8f0' }}>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', display: 'block' }}>WhatsApp Channels</span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>{targetPlan.includedChannels} included in base</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setChannelCount(prev => Math.max(targetPlan.includedChannels, prev - 1))}
                    style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#334155', cursor: 'pointer', fontWeight: '800' }}
                  >
                    -
                  </button>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: '#0d9488', minWidth: '24px', textAlign: 'center' }}>
                    {channelCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setChannelCount(prev => prev + 1)}
                    style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#0d9488', border: 'none', color: '#ffffff', cursor: 'pointer', fontWeight: '800' }}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Add-on Modules */}
              {availableAddons.length > 0 && (
                <div>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '8px' }}>
                    Optional Module Add-ons (Custom Per-Module Pricing)
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: '8px', maxHeight: '150px', overflowY: 'auto', paddingRight: '4px' }}>
                    {availableAddons.map(mod => {
                      const isAdded = selectedAddons.includes(mod.id);
                      const addonRate = modulePricing[mod.id] !== undefined ? modulePricing[mod.id] : 299;
                      return (
                        <div
                          key={mod.id}
                          onClick={() => toggleAddon(mod.id)}
                          style={{
                            background: isAdded ? '#ecfdf5' : '#ffffff',
                            border: isAdded ? '1.5px solid #0d9488' : '1px solid #e2e8f0',
                            borderRadius: '8px',
                            padding: '6px 10px',
                            cursor: 'pointer',
                            fontSize: '11.5px',
                            fontWeight: '600',
                            color: isAdded ? '#065f46' : '#334155',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div>
                            <span style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: isAdded ? '#065f46' : '#1e293b' }}>
                              {mod.name}
                            </span>
                            <span style={{ fontSize: '9.5px', color: '#0d9488', fontWeight: '700' }}>
                              +₹{addonRate}/mo
                            </span>
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: '800' }}>
                            {isAdded ? '✓' : '+'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: 0% UPI Payment & UTR Form */}
            <div style={{ background: '#ffffff', borderRadius: '12px', padding: '18px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Taxable: {formatINR(pricingSummary.taxableSubtotal)}</span>
                <span style={{ fontSize: '16px', fontWeight: '800', color: '#0d9488' }}>
                  {formatINR(pricingSummary.grandTotal)} (Inc. 18% GST)
                </span>
              </div>

              {renewalNotice && (
                <div style={{
                  background: renewalNotice.type === 'success' ? '#ecfdf5' : '#fef2f2',
                  border: renewalNotice.type === 'success' ? '1px solid #a7f3d0' : '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  color: renewalNotice.type === 'success' ? '#065f46' : '#991b1b',
                  fontSize: '12px',
                  marginBottom: '12px'
                }}>
                  {renewalNotice.message}
                </div>
              )}

              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '14px', background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ background: '#ffffff', borderRadius: '8px', padding: '6px', flexShrink: 0, border: '1px solid #e2e8f0' }}>
                  <img src={qrUrl} alt="UPI QR" style={{ width: '90px', height: '90px', display: 'block' }} />
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Scan to Pay 0% Fee</span>
                  <strong style={{ fontSize: '13px', color: '#0f172a', fontFamily: 'monospace' }}>{upiId}</strong>
                  <a
                    href={upiIntentString}
                    style={{ display: 'inline-block', marginTop: '6px', fontSize: '11.5px', color: '#0d9488', fontWeight: '700', textDecoration: 'underline' }}
                  >
                    1-Click Mobile App Pay →
                  </a>
                </div>
              </div>

              <form onSubmit={handleCreateRenewalOrder} style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  required
                  placeholder="Enter 12-digit UTR number"
                  value={renewalUtr}
                  onChange={(e) => setRenewalUtr(e.target.value)}
                  style={{ ...s.input, flex: 1 }}
                />
                <button
                  type="submit"
                  disabled={submittingRenewal || !renewalUtr.trim()}
                  style={{
                    ...s.btnPrimary,
                    opacity: (!renewalUtr.trim() || submittingRenewal) ? 0.6 : 1,
                    cursor: (!renewalUtr.trim() || submittingRenewal) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {submittingRenewal ? 'Submitting...' : 'Submit UTR'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Official Tax Invoices Registry */}
      <div style={s.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: '800', margin: 0, color: '#0f2b26' }}>
              Official GST Tax Invoices
            </h3>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
              Download or print official Section 31 CGST Act tax invoices (SAC 998313).
            </p>
          </div>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
            {invoices.length} Invoice{invoices.length === 1 ? '' : 's'} Issued
          </span>
        </div>

        {invoices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px', color: '#94a3b8', fontSize: '13px' }}>
            No tax invoices generated yet. Invoices appear here automatically upon subscription verification.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ textAlign: 'left', padding: '10px 14px', color: '#64748b', fontWeight: '700', fontSize: '11.5px', textTransform: 'uppercase' }}>Invoice Number</th>
                  <th style={{ textAlign: 'left', padding: '10px 14px', color: '#64748b', fontWeight: '700', fontSize: '11.5px', textTransform: 'uppercase' }}>Date</th>
                  <th style={{ textAlign: 'left', padding: '10px 14px', color: '#64748b', fontWeight: '700', fontSize: '11.5px', textTransform: 'uppercase' }}>Plan / Services</th>
                  <th style={{ textAlign: 'left', padding: '10px 14px', color: '#64748b', fontWeight: '700', fontSize: '11.5px', textTransform: 'uppercase' }}>Total (Inc. GST)</th>
                  <th style={{ textAlign: 'left', padding: '10px 14px', color: '#64748b', fontWeight: '700', fontSize: '11.5px', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ textAlign: 'right', padding: '10px 14px', color: '#64748b', fontWeight: '700', fontSize: '11.5px', textTransform: 'uppercase' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => {
                  const isPaid = inv.status === 'paid' || inv.status === 'active';
                  const isPending = inv.status === 'pending' || inv.status === 'payment_under_review';

                  return (
                    <tr key={inv.id || inv.invoice_number} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: '700', color: '#0f172a' }}>
                        {inv.invoice_number || inv.invoiceNumber}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#475569' }}>
                        {new Date(inv.invoice_date || inv.created_at || Date.now()).toLocaleDateString('en-IN')}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#1e293b' }}>
                        <strong>{inv.plan_name || 'Enterprise SaaS Plan'}</strong>
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: '700', color: '#0d9488' }}>
                        {formatINR(inv.grand_total || inv.grandTotal || inv.amount_paid)}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '800',
                          padding: '2px 9px',
                          borderRadius: '12px',
                          background: isPaid ? '#ecfdf5' : '#fffbeb',
                          color: isPaid ? '#047857' : '#b45309',
                          border: isPaid ? '1px solid #a7f3d0' : '1px solid #fde68a'
                        }}>
                          {isPaid ? 'PAID' : (isPending ? 'REVIEWING' : 'PENDING')}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedInvoice(inv)}
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            color: '#334155',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Printer size={13} />
                          <span>View Invoice</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Modal */}
      {selectedInvoice && (
        <InvoiceReceiptModal
          invoice={selectedInvoice}
          isOpen={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
}
