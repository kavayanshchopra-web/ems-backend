import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Building2, 
  UserPlus, 
  ShieldCheck, 
  QrCode, 
  Settings, 
  FileText, 
  Printer, 
  RefreshCw, 
  Search, 
  Check, 
  Copy, 
  ExternalLink,
  Sparkles,
  Layers,
  Save,
  AlertCircle
} from 'lucide-react';
import SubscriptionEngine, { 
  DEFAULT_PLANS, 
  DEFAULT_PRICING_CONFIG, 
  formatINR, 
  amountInWords 
} from '../../core/engines/SubscriptionEngine';
import MasterModuleRegistry from '../../core/registry/MasterModuleRegistry';
import InvoiceReceiptModal from '../InvoiceReceiptModal';
import onboardingConfigService from '../../core/services/onboardingConfigService';

export default function SuperAdminSubscriptionHub({ showToast }) {
  const [activeSubTab, setActiveSubTab] = useState('approvals'); // 'approvals' | 'direct_provision' | 'pricing_config' | 'all_invoices'
  const [approvals, setApprovals] = useState([]);
  const [allInvoices, setAllInvoices] = useState([]);
  const [pricingConfig, setPricingConfig] = useState(DEFAULT_PRICING_CONFIG);
  const [onboardingConfig, setOnboardingConfig] = useState(onboardingConfigService.getDefaultConfig());
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoiceForModal, setSelectedInvoiceForModal] = useState(null);

  // Approval Action States
  const [processingId, setProcessingId] = useState(null);
  const [customValidityMap, setCustomValidityMap] = useState({});

  // Direct Company Provisioning Form
  const [directForm, setDirectForm] = useState({
    companyName: '',
    adminName: '',
    adminEmail: '',
    adminPhone: '',
    adminPassword: 'Password@123',
    planId: 'pro',
    planName: 'Business Pro (Direct Provisioned)',
    validityDays: 365,
    maxSeats: 25,
    maxChannels: 5,
    activeModules: ['dashboards', 'contacts', 'conversations', 'wa_live_web', 'kanban', 'telecalling', 'employees', 'payroll', 'attendance', 'recruitment_ats', 'tasks', 'notice_board', 'feedback'],
    accountType: 'free_demo',
    notes: 'Direct VIP Provisioned by SuperAdmin'
  });
  const [provisioningSuccess, setProvisioningSuccess] = useState(null);
  const [copiedCreds, setCopiedCreds] = useState(false);

  // Pricing Config Form
  const [configForm, setConfigForm] = useState({
    upiVpa: DEFAULT_PRICING_CONFIG?.upi?.vpa || DEFAULT_PRICING_CONFIG?.upiId || 'omniflow.crm@icici',
    upiPayeeName: DEFAULT_PRICING_CONFIG?.upi?.payeeName || DEFAULT_PRICING_CONFIG?.upiMerchantName || 'OmniFlow Technologies',
    sellerLegalName: DEFAULT_PRICING_CONFIG?.sellerDetails?.legalName || DEFAULT_PRICING_CONFIG?.platformLegalName || 'OmniFlow Cloud Technologies Private Limited',
    sellerGstin: DEFAULT_PRICING_CONFIG?.sellerDetails?.gstin || DEFAULT_PRICING_CONFIG?.platformGSTIN || '06AAHCO0192A1ZK',
    sellerAddress: DEFAULT_PRICING_CONFIG?.sellerDetails?.address || DEFAULT_PRICING_CONFIG?.platformAddress || 'DLF Cyber City, Tower B, Phase III, Sector 24, Gurugram, Haryana - 122002',
    sellerPhone: DEFAULT_PRICING_CONFIG?.sellerDetails?.phone || DEFAULT_PRICING_CONFIG?.platformPhone || '+91 98765 43210',
    sellerEmail: DEFAULT_PRICING_CONFIG?.sellerDetails?.email || DEFAULT_PRICING_CONFIG?.platformEmail || 'billing@employeemanagementsystems.com',
    bankName: DEFAULT_PRICING_CONFIG?.bankDetails?.bankName || DEFAULT_PRICING_CONFIG?.bankName || 'HDFC Bank Ltd',
    bankAccountNumber: DEFAULT_PRICING_CONFIG?.bankDetails?.accountNumber || DEFAULT_PRICING_CONFIG?.bankAccountNumber || '50200084729103',
    bankIfsc: DEFAULT_PRICING_CONFIG?.bankDetails?.ifsc || DEFAULT_PRICING_CONFIG?.bankIfscCode || 'HDFC0001234'
  });
  const [savingConfig, setSavingConfig] = useState(false);
  const [savingPlans, setSavingPlans] = useState(false);

  // Razorpay Payment Gateway Settings State
  const [razorpayConfig, setRazorpayConfig] = useState({
    keyId: '',
    keySecret: '',
    mode: 'test',
    enabled: true,
    keySecretMasked: ''
  });
  const [savingGateway, setSavingGateway] = useState(false);

  // Fetch Pending Approvals & SaaS Config
  const loadData = async () => {
    setLoading(true);
    try {
      const pending = await SubscriptionEngine.fetchPendingApprovals();
      setApprovals(pending || []);

      const invList = await SubscriptionEngine.fetchAllInvoices();
      setAllInvoices(invList || []);

      const config = await SubscriptionEngine.fetchPricingConfig();
      if (config) {
        setPricingConfig(prev => ({ ...prev, ...config }));
        setConfigForm({
          upiVpa: config.upi?.vpa || config.upiId || DEFAULT_PRICING_CONFIG?.upi?.vpa || 'omniflow.crm@icici',
          upiPayeeName: config.upi?.payeeName || config.upiMerchantName || DEFAULT_PRICING_CONFIG?.upi?.payeeName || 'OmniFlow Technologies',
          sellerLegalName: config.sellerDetails?.legalName || config.platformLegalName || DEFAULT_PRICING_CONFIG?.sellerDetails?.legalName || 'OmniFlow Cloud Technologies Private Limited',
          sellerGstin: config.sellerDetails?.gstin || config.platformGSTIN || DEFAULT_PRICING_CONFIG?.sellerDetails?.gstin || '06AAHCO0192A1ZK',
          sellerAddress: config.sellerDetails?.address || config.platformAddress || DEFAULT_PRICING_CONFIG?.sellerDetails?.address || 'DLF Cyber City, Tower B, Phase III, Sector 24, Gurugram, Haryana - 122002',
          sellerPhone: config.sellerDetails?.phone || config.platformPhone || DEFAULT_PRICING_CONFIG?.sellerDetails?.phone || '+91 98765 43210',
          sellerEmail: config.sellerDetails?.email || config.platformEmail || DEFAULT_PRICING_CONFIG?.sellerDetails?.email || 'billing@employeemanagementsystems.com',
          bankName: config.bankDetails?.bankName || config.bankName || DEFAULT_PRICING_CONFIG?.bankDetails?.bankName || 'HDFC Bank Ltd',
          bankAccountNumber: config.bankDetails?.accountNumber || config.bankAccountNumber || DEFAULT_PRICING_CONFIG?.bankDetails?.accountNumber || '50200084729103',
          bankIfsc: config.bankDetails?.ifsc || config.bankIfscCode || DEFAULT_PRICING_CONFIG?.bankDetails?.ifsc || 'HDFC0001234'
        });
      }

      const onb = await onboardingConfigService.getOnboardingConfig();
      if (onb) setOnboardingConfig(onb);

      const gwConfig = await SubscriptionEngine.fetchPaymentGatewayConfig();
      if (gwConfig) {
        setRazorpayConfig({
          keyId: gwConfig.keyId || '',
          keySecret: '',
          keySecretMasked: gwConfig.keySecretMasked || '',
          mode: gwConfig.mode || 'test',
          enabled: gwConfig.enabled !== undefined ? Boolean(gwConfig.enabled) : true
        });
      }
    } catch (err) {
      console.error('Failed to load SuperAdmin subscription data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlansConfig = async () => {
    setSavingPlans(true);
    try {
      await onboardingConfigService.saveOnboardingConfig(onboardingConfig);
      if (typeof showToast === 'function') showToast('Onboarding SaaS Plans & Pricing updated globally!', 'success');
    } catch (err) {
      if (typeof showToast === 'function') showToast('Failed to save plans: ' + err.message, 'error');
    } finally {
      setSavingPlans(false);
    }
  };

  const handleAddPlan = () => {
    const newId = 'tier_' + Math.random().toString(36).substring(2, 7);
    const newPlan = {
      id: newId,
      name: 'New Custom Tier',
      tagline: 'Tailored enterprise capabilities for specialized workflows',
      basePriceMonthly: 3499,
      basePriceYearly: 34990,
      includedSeats: 10,
      includedChannels: 2,
      isTrial: false,
      trialDays: 0,
      isPopular: false,
      badgeColor: '#0ea5e9',
      includedModules: ['dashboards', 'contacts', 'conversations', 'kanban', 'telecalling', 'tasks'],
      features: [
        '10 Included Employee Seats',
        '2 Active WhatsApp Channels',
        'Full CRM & Kanban Pipeline',
        'Cloud PBX & SIM Telecalling'
      ]
    };
    setOnboardingConfig(prev => ({
      ...prev,
      plans: [...(prev.plans || DEFAULT_PLANS), newPlan]
    }));
    if (typeof showToast === 'function') showToast('Added new plan tier draft! Click "Save All Plan Changes Live" to publish.', 'info');
  };

  const handleDeletePlan = (pIdx, planName) => {
    if (!window.confirm(`Are you sure you want to remove the plan "${planName}"?`)) return;
    setOnboardingConfig(prev => {
      const plans = [...(prev.plans || DEFAULT_PLANS)];
      plans.splice(pIdx, 1);
      return { ...prev, plans };
    });
    if (typeof showToast === 'function') showToast(`Removed plan "${planName}". Click "Save All Plan Changes Live" to publish.`, 'info');
  };

  const handleResetPlans = () => {
    if (!window.confirm('Reset all plans to system default templates (Trial, Starter, Pro, Enterprise)? Any custom plans will be cleared.')) return;
    setOnboardingConfig(prev => ({
      ...prev,
      plans: DEFAULT_PLANS
    }));
    if (typeof showToast === 'function') showToast('Reset to default plan templates. Click "Save All Plan Changes Live" to publish.', 'info');
  };

  useEffect(() => {
    loadData();
  }, []);

  // 1-Click Approve Subscription with custom validity option
  const handleApprove = async (invoice) => {
    const validityDays = customValidityMap[invoice.id] || 365;
    setProcessingId(invoice.id);

    try {
      const res = await SubscriptionEngine.approveSubscription(invoice.id, {
        validityDays: Number(validityDays),
        tenantId: invoice.tenant_id,
        planId: invoice.plan_id || 'starter',
        planName: invoice.plan_name,
        seatsLimit: invoice.seats_count || 15,
        channelsLimit: invoice.channels_count || 3,
        buyerEmail: invoice.buyer_email
      });

      if (res.success) {
        if (typeof showToast === 'function') showToast(`Approved & Activated subscription for ${invoice.company_name}!`, 'success');
        loadData();
      } else {
        if (typeof showToast === 'function') showToast(res.error || 'Approval failed', 'error');
      }
    } catch (err) {
      if (typeof showToast === 'function') showToast(err.message || 'Approval error', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // Reject Subscription
  const handleReject = async (invoice) => {
    const reason = prompt(`Enter rejection reason for ${invoice.company_name} (UTR: ${invoice.utr_ref || 'N/A'}):`, 'Invalid UTR reference or payment not received');
    if (!reason) return;

    setProcessingId(invoice.id);
    try {
      const res = await SubscriptionEngine.rejectSubscription(invoice.id, reason);
      if (res.success) {
        if (typeof showToast === 'function') showToast('Subscription rejected.', 'info');
        loadData();
      } else {
        if (typeof showToast === 'function') showToast(res.error || 'Rejection failed', 'error');
      }
    } catch (err) {
      if (typeof showToast === 'function') showToast(err.message, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // Direct Company Creation (Bypasses payment gate)
  const handleDirectProvision = async (e) => {
    e.preventDefault();
    setLoading(true);
    setProvisioningSuccess(null);

    try {
      const res = await SubscriptionEngine.createDirectCompany(directForm);
      if (res.success) {
        setProvisioningSuccess(res);
        if (typeof showToast === 'function') showToast(`Provisioned VIP Company: ${directForm.companyName}!`, 'success');
        loadData();
      } else {
        if (typeof showToast === 'function') showToast(res.error || 'Direct provisioning failed', 'error');
      }
    } catch (err) {
      if (typeof showToast === 'function') showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Save Pricing & UPI Config
  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSavingConfig(true);

    try {
      await SubscriptionEngine.savePricingConfig({
        upi: {
          vpa: configForm.upiVpa,
          payeeName: configForm.upiPayeeName,
          isEnabled: true
        },
        upiId: configForm.upiVpa,
        upiMerchantName: configForm.upiPayeeName,
        sellerDetails: {
          legalName: configForm.sellerLegalName,
          gstin: configForm.sellerGstin,
          address: configForm.sellerAddress,
          phone: configForm.sellerPhone,
          email: configForm.sellerEmail,
          state: 'Haryana',
          stateCode: '06'
        },
        platformLegalName: configForm.sellerLegalName,
        platformGSTIN: configForm.sellerGstin,
        platformAddress: configForm.sellerAddress,
        platformPhone: configForm.sellerPhone,
        platformEmail: configForm.sellerEmail,
        bankDetails: {
          bankName: configForm.bankName,
          accountNumber: configForm.bankAccountNumber,
          ifsc: configForm.bankIfsc
        },
        bankName: configForm.bankName,
        bankAccountNumber: configForm.bankAccountNumber,
        bankIfscCode: configForm.bankIfsc
      });

      if (typeof showToast === 'function') showToast('Master Pricing & 0% UPI configuration updated globally!', 'success');
    } catch (err) {
      if (typeof showToast === 'function') showToast('Failed to save config: ' + err.message, 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  // Save Razorpay Gateway Credentials
  const handleSaveGateway = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setSavingGateway(true);
    try {
      const payload = {
        keyId: razorpayConfig.keyId.trim(),
        mode: razorpayConfig.mode,
        enabled: razorpayConfig.enabled
      };
      if (razorpayConfig.keySecret && razorpayConfig.keySecret.trim()) {
        payload.keySecret = razorpayConfig.keySecret.trim();
      }
      const res = await SubscriptionEngine.savePaymentGatewayConfig(payload);
      if (res && res.success) {
        if (typeof showToast === 'function') showToast('Razorpay Gateway credentials saved successfully!', 'success');
        setRazorpayConfig(prev => ({
          ...prev,
          keySecret: '',
          keySecretMasked: res.config?.keySecretMasked || prev.keySecretMasked
        }));
        loadData();
      } else {
        if (typeof showToast === 'function') showToast(res?.error || 'Failed to save Razorpay config', 'error');
      }
    } catch (err) {
      if (typeof showToast === 'function') showToast(err.message, 'error');
    } finally {
      setSavingGateway(false);
    }
  };

  // EMS Theme Design Tokens
  const s = {
    container: {
      color: '#0f172a',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    },
    navRow: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '20px',
      background: '#f8fafc',
      padding: '6px',
      borderRadius: '10px',
      border: '1px solid #e2e8f0',
      flexWrap: 'wrap'
    },
    navBtn: (isActive) => ({
      padding: '8px 16px',
      borderRadius: '8px',
      border: 'none',
      fontSize: '13px',
      fontWeight: '700',
      cursor: 'pointer',
      background: isActive ? '#0d9488' : 'transparent',
      color: isActive ? '#ffffff' : '#64748b',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      boxShadow: isActive ? '0 2px 6px rgba(13, 148, 136, 0.25)' : 'none',
      transition: 'all 0.15s ease'
    }),
    card: {
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '14px',
      padding: '24px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
      marginBottom: '20px'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '13px'
    },
    th: {
      textAlign: 'left',
      padding: '10px 14px',
      background: '#f8fafc',
      color: '#64748b',
      fontWeight: '700',
      fontSize: '11.5px',
      textTransform: 'uppercase',
      borderBottom: '1px solid #e2e8f0'
    },
    td: {
      padding: '12px 14px',
      borderBottom: '1px solid #f1f5f9',
      color: '#1e293b'
    },
    input: {
      width: '100%',
      padding: '9px 12px',
      background: '#ffffff',
      border: '1px solid #cbd5e1',
      borderRadius: '8px',
      color: '#0f172a',
      fontSize: '13px',
      outline: 'none',
      boxSizing: 'border-box'
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
      boxShadow: '0 2px 6px rgba(13, 148, 136, 0.25)'
    }
  };

  return (
    <div style={s.container}>
      
      {/* Navigation Sub-Tabs */}
      <div style={s.navRow}>
        <button
          type="button"
          onClick={() => setActiveSubTab('approvals')}
          style={s.navBtn(activeSubTab === 'approvals')}
        >
          <Clock size={14} />
          <span>Pending Approvals Queue ({approvals.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('direct_provision')}
          style={s.navBtn(activeSubTab === 'direct_provision')}
        >
          <UserPlus size={14} />
          <span>+ Direct Provision Company (No Gate)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('all_invoices')}
          style={s.navBtn(activeSubTab === 'all_invoices')}
        >
          <FileText size={14} />
          <span>Master GST Invoices ({allInvoices.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('pricing_config')}
          style={s.navBtn(activeSubTab === 'pricing_config')}
        >
          <Settings size={14} />
          <span>0% UPI & Billing Entity</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('razorpay_gateway')}
          style={s.navBtn(activeSubTab === 'razorpay_gateway')}
        >
          <CreditCard size={14} />
          <span>💳 Razorpay Gateway Studio</span>
        </button>
      </div>

      {/* SUB-TAB 1: PENDING APPROVALS QUEUE */}
      {activeSubTab === 'approvals' && (
        <div style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: '#0f2b26' }}>
                Subscription Approvals & UTR Verification Queue
              </h3>
              <p style={{ fontSize: '12.5px', color: '#64748b', margin: '4px 0 0 0' }}>
                Verify client UTR references and activate workspace access with custom validity overrides.
              </p>
            </div>
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                color: '#475569',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>

          {approvals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: '#94a3b8', fontSize: '13.5px' }}>
              ✓ All subscription approvals up to date. No pending UTR verifications.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Company & Admin</th>
                    <th style={s.th}>Plan & Amount</th>
                    <th style={s.th}>Submitted UTR Reference</th>
                    <th style={s.th}>Validity Override</th>
                    <th style={{ ...s.th, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {approvals.map(inv => {
                    const isProcessing = processingId === inv.id;
                    const validity = customValidityMap[inv.id] || 365;

                    return (
                      <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={s.td}>
                          <strong style={{ color: '#0f172a' }}>{inv.company_name}</strong>
                          <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                            {inv.buyer_name} • {inv.buyer_email}
                          </div>
                        </td>
                        <td style={s.td}>
                          <div><strong>{inv.plan_name}</strong> ({inv.billing_cycle || 'monthly'})</div>
                          <span style={{ color: '#0d9488', fontWeight: '700' }}>
                            {formatINR(inv.grand_total || inv.grandTotal || inv.amount_paid)}
                          </span>
                        </td>
                        <td style={s.td}>
                          <div style={{ fontFamily: 'monospace', fontWeight: '700', color: '#0f172a', background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '4px 8px', borderRadius: '6px', display: 'inline-block' }}>
                            {inv.utr_ref || 'PENDING_SUBMISSION'}
                          </div>
                          {inv.receipt_url && (
                            <a href={inv.receipt_url} target="_blank" rel="noreferrer" style={{ display: 'block', fontSize: '11px', color: '#0284c7', marginTop: '2px', fontWeight: '600' }}>
                              View Slip ↗
                            </a>
                          )}
                        </td>
                        <td style={s.td}>
                          <select
                            value={validity}
                            onChange={(e) => setCustomValidityMap(prev => ({ ...prev, [inv.id]: e.target.value }))}
                            style={{ padding: '6px 10px', background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px' }}
                          >
                            <option value={7}>7 Days (Trial)</option>
                            <option value={30}>30 Days (1 Month)</option>
                            <option value={90}>90 Days (3 Months)</option>
                            <option value={180}>180 Days (6 Months)</option>
                            <option value={365}>365 Days (1 Year)</option>
                            <option value={730}>730 Days (2 Years)</option>
                          </select>
                        </td>
                        <td style={{ ...s.td, textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              onClick={() => handleApprove(inv)}
                              disabled={isProcessing}
                              style={{
                                background: '#10b981',
                                color: '#ffffff',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <CheckCircle2 size={13} />
                              <span>{isProcessing ? 'Activating...' : 'Approve & Activate'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleReject(inv)}
                              disabled={isProcessing}
                              style={{
                                background: '#fee2e2',
                                color: '#b91c1c',
                                border: '1px solid #fecaca',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: 'pointer'
                              }}
                            >
                              <XCircle size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: DIRECT PROVISIONING (NO PAYMENT GATE) */}
      {activeSubTab === 'direct_provision' && (
        <div style={s.card}>
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: '#0f2b26' }}>
              Direct Provisioning (Free / Demo / VIP Accounts)
            </h3>
            <p style={{ fontSize: '12.5px', color: '#64748b', margin: '4px 0 0 0' }}>
              Create and activate private company workspaces immediately without going through payment gates.
            </p>
          </div>

          {provisioningSuccess && (
            <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#065f46', marginBottom: '6px' }}>
                ✓ Workspace Created & Activated Successfully!
              </div>
              <div style={{ fontSize: '12.5px', color: '#1e293b', fontFamily: 'monospace' }}>
                <div>Company: <strong>{directForm.companyName}</strong></div>
                <div>Admin Login: <strong>{directForm.adminEmail}</strong></div>
                <div>Password: <strong>{directForm.adminPassword}</strong></div>
                <div>Status: <strong style={{ color: '#047857' }}>Active (VIP Provisioned)</strong></div>
              </div>
            </div>
          )}

          <form onSubmit={handleDirectProvision} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                Legal Company Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. VIP Corp Real Estate"
                value={directForm.companyName}
                onChange={(e) => setDirectForm(prev => ({ ...prev, companyName: e.target.value }))}
                style={s.input}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                Admin Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Vikram Malhotra"
                value={directForm.adminName}
                onChange={(e) => setDirectForm(prev => ({ ...prev, adminName: e.target.value }))}
                style={s.input}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                Admin Work Email *
              </label>
              <input
                type="email"
                required
                placeholder="vikram@vipcorp.com"
                value={directForm.adminEmail}
                onChange={(e) => setDirectForm(prev => ({ ...prev, adminEmail: e.target.value }))}
                style={s.input}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                Admin Password *
              </label>
              <input
                type="text"
                required
                value={directForm.adminPassword}
                onChange={(e) => setDirectForm(prev => ({ ...prev, adminPassword: e.target.value }))}
                style={s.input}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                Assigned Plan Tier
              </label>
              <select
                value={directForm.planId}
                onChange={(e) => setDirectForm(prev => ({ ...prev, planId: e.target.value, planName: e.target.value.toUpperCase() }))}
                style={{ ...s.input, background: '#ffffff' }}
              >
                <option value="starter">Starter Growth</option>
                <option value="pro">Business Pro</option>
                <option value="enterprise">Enterprise Suite</option>
                <option value="trial">Free Trial (7 Days)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                Validity Period
              </label>
              <select
                value={directForm.validityDays}
                onChange={(e) => setDirectForm(prev => ({ ...prev, validityDays: Number(e.target.value) }))}
                style={{ ...s.input, background: '#ffffff' }}
              >
                <option value={7}>7 Days Demo</option>
                <option value={30}>30 Days (1 Month)</option>
                <option value={90}>90 Days (Quarterly)</option>
                <option value={180}>180 Days (Half Year)</option>
                <option value={365}>365 Days (1 Full Year)</option>
                <option value={730}>730 Days (2 Years)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                Maximum Seats Limit
              </label>
              <input
                type="number"
                value={directForm.maxSeats}
                onChange={(e) => setDirectForm(prev => ({ ...prev, maxSeats: Number(e.target.value) }))}
                style={s.input}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                Maximum WhatsApp Channels Limit
              </label>
              <input
                type="number"
                value={directForm.maxChannels}
                onChange={(e) => setDirectForm(prev => ({ ...prev, maxChannels: Number(e.target.value) }))}
                style={s.input}
              />
            </div>

            <div style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
              <button
                type="submit"
                disabled={loading}
                style={s.btnPrimary}
              >
                <Sparkles size={14} />
                <span>{loading ? 'Provisioning Workspace...' : 'Generate & Activate Workspace Immediately'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUB-TAB 3: MASTER GST INVOICES */}
      {activeSubTab === 'all_invoices' && (
        <div style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: '#0f2b26' }}>
                Master GST Tax Invoices Registry
              </h3>
              <p style={{ fontSize: '12.5px', color: '#64748b', margin: '4px 0 0 0' }}>
                Search and print all platform invoices across all customer organizations.
              </p>
            </div>
          </div>

          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Invoice No</th>
                <th style={s.th}>Company</th>
                <th style={s.th}>Date</th>
                <th style={s.th}>Total (Inc. GST)</th>
                <th style={s.th}>Status</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {allInvoices.map(inv => (
                <tr key={inv.id || inv.invoice_number} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ ...s.td, fontFamily: 'monospace', fontWeight: '700', color: '#0d9488' }}>
                    {inv.invoice_number || inv.invoiceNumber}
                  </td>
                  <td style={s.td}>
                    <strong style={{ color: '#0f172a' }}>{inv.company_name}</strong>
                    <div style={{ fontSize: '11.5px', color: '#64748b' }}>{inv.buyer_email}</div>
                  </td>
                  <td style={s.td}>{new Date(inv.invoice_date || inv.created_at || Date.now()).toLocaleDateString('en-IN')}</td>
                  <td style={{ ...s.td, fontWeight: '700', color: '#0d9488' }}>
                    {formatINR(inv.grand_total || inv.grandTotal || inv.amount_paid)}
                  </td>
                  <td style={s.td}>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: '800',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: inv.status === 'paid' ? '#ecfdf5' : '#fffbeb',
                      color: inv.status === 'paid' ? '#047857' : '#b45309',
                      border: inv.status === 'paid' ? '1px solid #a7f3d0' : '1px solid #fde68a'
                    }}>
                      {inv.status?.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ ...s.td, textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedInvoiceForModal(inv)}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        color: '#334155',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '11.5px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Printer size={12} />
                      <span>Print</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* SUB-TAB 4: 0% UPI & PRICING CONFIG */}
      {activeSubTab === 'pricing_config' && (
        <div style={s.card}>
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: '#0f2b26' }}>
              Master UPI Payment & Seller Legal Configuration
            </h3>
            <p style={{ fontSize: '12.5px', color: '#64748b', margin: '4px 0 0 0' }}>
              Configure master 0% fee UPI Virtual Payment Address (VPA) and Seller GST entity details.
            </p>
          </div>

          <form onSubmit={handleSaveConfig} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                Master UPI ID (VPA) *
              </label>
              <input
                type="text"
                required
                placeholder="omniflow.crm@icici"
                value={configForm.upiVpa}
                onChange={(e) => setConfigForm(prev => ({ ...prev, upiVpa: e.target.value }))}
                style={s.input}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                UPI Payee / Merchant Name *
              </label>
              <input
                type="text"
                required
                placeholder="OmniFlow Technologies"
                value={configForm.upiPayeeName}
                onChange={(e) => setConfigForm(prev => ({ ...prev, upiPayeeName: e.target.value }))}
                style={s.input}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                Seller Legal Company Name *
              </label>
              <input
                type="text"
                required
                placeholder="OmniFlow Cloud Technologies Private Limited"
                value={configForm.sellerLegalName}
                onChange={(e) => setConfigForm(prev => ({ ...prev, sellerLegalName: e.target.value }))}
                style={s.input}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                Seller GSTIN (Haryana - 06) *
              </label>
              <input
                type="text"
                required
                placeholder="06AAHCO0192A1ZK"
                value={configForm.sellerGstin}
                onChange={(e) => setConfigForm(prev => ({ ...prev, sellerGstin: e.target.value }))}
                style={s.input}
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                Seller Registered Office Address *
              </label>
              <input
                type="text"
                required
                placeholder="DLF Cyber City, Tower B, Phase III, Sector 24, Gurugram, Haryana - 122002"
                value={configForm.sellerAddress}
                onChange={(e) => setConfigForm(prev => ({ ...prev, sellerAddress: e.target.value }))}
                style={s.input}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                Bank Name (NEFT / IMPS)
              </label>
              <input
                type="text"
                value={configForm.bankName}
                onChange={(e) => setConfigForm(prev => ({ ...prev, bankName: e.target.value }))}
                style={s.input}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                Bank Account Number
              </label>
              <input
                type="text"
                value={configForm.bankAccountNumber}
                onChange={(e) => setConfigForm(prev => ({ ...prev, bankAccountNumber: e.target.value }))}
                style={s.input}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                Bank IFSC Code
              </label>
              <input
                type="text"
                value={configForm.bankIfsc}
                onChange={(e) => setConfigForm(prev => ({ ...prev, bankIfsc: e.target.value }))}
                style={s.input}
              />
            </div>

            <div style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
              <button
                type="submit"
                disabled={savingConfig}
                style={s.btnPrimary}
              >
                <Save size={14} />
                <span>{savingConfig ? 'Saving Settings...' : 'Save Global Pricing & UPI Settings'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUB-TAB 5: RAZORPAY PAYMENT GATEWAY STUDIO */}
      {activeSubTab === 'razorpay_gateway' && (
        <div style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: '#0f2b26', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={20} color="#0d9488" />
                Razorpay Payment Gateway Studio
              </h3>
              <p style={{ fontSize: '12.5px', color: '#64748b', margin: '4px 0 0 0' }}>
                Configure live API credentials for automated Razorpay checkout. Payments are auto-verified via HMAC-SHA256 signatures with instant tenant activation.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '800',
                background: razorpayConfig.mode === 'live' ? '#dcfce7' : '#fef3c7',
                color: razorpayConfig.mode === 'live' ? '#166534' : '#92400e',
                border: razorpayConfig.mode === 'live' ? '1px solid #86efac' : '1px solid #fde68a'
              }}>
                {razorpayConfig.mode === 'live' ? '🟢 LIVE PRODUCTION MODE' : '🟡 TEST / SANDBOX MODE'}
              </span>

              <span style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '800',
                background: razorpayConfig.enabled ? '#ccfbf1' : '#f1f5f9',
                color: razorpayConfig.enabled ? '#0f766e' : '#64748b',
                border: razorpayConfig.enabled ? '1px solid #99f6e4' : '1px solid #cbd5e1'
              }}>
                {razorpayConfig.enabled ? '✓ GATEWAY ACTIVE' : '✕ GATEWAY DISABLED'}
              </span>
            </div>
          </div>

          <form onSubmit={handleSaveGateway} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Gateway Mode */}
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '6px' }}>
                Environment Mode
              </label>
              <select
                value={razorpayConfig.mode}
                onChange={(e) => setRazorpayConfig(prev => ({ ...prev, mode: e.target.value }))}
                style={s.input}
              >
                <option value="test">Test Mode (Sandbox / Testing)</option>
                <option value="live">Live Mode (Production Payments)</option>
              </select>
              <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                Use 'Test Mode' with test keys (rzp_test_...) or 'Live Mode' for real customer transactions.
              </span>
            </div>

            {/* Gateway Enabled Toggle */}
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '6px' }}>
                Enable Razorpay Checkout
              </label>
              <select
                value={razorpayConfig.enabled ? 'true' : 'false'}
                onChange={(e) => setRazorpayConfig(prev => ({ ...prev, enabled: e.target.value === 'true' }))}
                style={s.input}
              >
                <option value="true">Active (Clients can pay via Razorpay)</option>
                <option value="false">Disabled (Hide Razorpay option on signup)</option>
              </select>
              <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                When active, clients see the 1-click Razorpay popup on step 3 with instant activation.
              </span>
            </div>

            {/* Key ID */}
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '6px' }}>
                Razorpay Key ID *
              </label>
              <input
                type="text"
                required
                placeholder="rzp_test_... or rzp_live_..."
                value={razorpayConfig.keyId}
                onChange={(e) => setRazorpayConfig(prev => ({ ...prev, keyId: e.target.value }))}
                style={s.input}
              />
              <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                Found in your Razorpay Dashboard → Settings → API Keys.
              </span>
            </div>

            {/* Key Secret */}
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '6px' }}>
                Razorpay Key Secret {razorpayConfig.keySecretMasked ? `(Configured: ${razorpayConfig.keySecretMasked})` : '*'}
              </label>
              <input
                type="password"
                placeholder={razorpayConfig.keySecretMasked ? 'Enter new secret to update, or leave blank to keep' : 'Enter Razorpay Key Secret'}
                value={razorpayConfig.keySecret}
                onChange={(e) => setRazorpayConfig(prev => ({ ...prev, keySecret: e.target.value }))}
                style={s.input}
              />
              <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                Securely stored and used on backend for HMAC-SHA256 signature verification. Never exposed to public.
              </span>
            </div>

            {/* Architectural & Automation Callout */}
            <div style={{
              gridColumn: '1 / -1',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '14px 16px',
              marginTop: '4px'
            }}>
              <div style={{ fontSize: '12.5px', fontWeight: '800', color: '#0f2b26', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={14} color="#0d9488" />
                Automated Lifecycle Features Triggered on Payment
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#475569', lineHeight: 1.6 }}>
                <li><strong>Auto-Fetch & Verify:</strong> Razorpay webhook and checkout callbacks are verified via cryptographic HMAC signatures.</li>
                <li><strong>Instant Workspace Activation:</strong> Upon successful payment, tenant subscription status is immediately changed to <code>active</code> with +30 days (Monthly) or +365 days (Yearly).</li>
                <li><strong>Zero Lockout:</strong> Client automatically receives JWT authorization tokens and enters the dashboard without waiting for manual UTR review.</li>
                <li><strong>GST Tax Invoicing:</strong> A paid Section 31 tax invoice is automatically generated and archived in the Master Invoices ledger.</li>
              </ul>
            </div>

            <div style={{ gridColumn: '1 / -1', marginTop: '6px' }}>
              <button
                type="submit"
                disabled={savingGateway}
                style={s.btnPrimary}
              >
                <Save size={14} />
                <span>{savingGateway ? 'Saving Gateway Credentials...' : 'Save Razorpay Credentials'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Invoice Modal */}
      {selectedInvoiceForModal && (
        <InvoiceReceiptModal
          invoice={selectedInvoiceForModal}
          isOpen={!!selectedInvoiceForModal}
          onClose={() => setSelectedInvoiceForModal(null)}
        />
      )}
    </div>
  );
}
