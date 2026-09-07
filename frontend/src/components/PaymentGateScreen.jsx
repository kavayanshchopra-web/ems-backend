import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldAlert, 
  Clock, 
  CheckCircle2, 
  QrCode, 
  Copy, 
  Check, 
  RefreshCw, 
  ArrowRight, 
  LogOut, 
  Sparkles, 
  CreditCard, 
  Building, 
  ExternalLink,
  HelpCircle,
  FileText
} from 'lucide-react';
import SubscriptionEngine, { 
  formatINR, 
  DEFAULT_PRICING_CONFIG, 
  generateUpiQrCodeUrl,
  generateUpiPaymentString 
} from '../core/engines/SubscriptionEngine';
import InvoiceReceiptModal from './InvoiceReceiptModal';

export default function PaymentGateScreen({ user, onLogout, onPaymentVerified }) {
  const [subscription, setSubscription] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [pricingConfig, setPricingConfig] = useState(DEFAULT_PRICING_CONFIG);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedInvoiceForModal, setSelectedInvoiceForModal] = useState(null);

  // UTR Form State
  const [utrInput, setUtrInput] = useState('');
  const [receiptUrlInput, setReceiptUrlInput] = useState('');
  const [submittingUtr, setSubmittingUtr] = useState(false);
  const [utrSuccessMsg, setUtrSuccessMsg] = useState('');
  const [utrErrorMsg, setUtrErrorMsg] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);

  const fetchStatus = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const tenantId = user?.tenant_id || user?.tenantId || 1;

      // 1. Fetch Subscription via Engine
      const subData = await SubscriptionEngine.fetchTenantSubscription(tenantId);
      if (subData) {
        setSubscription(subData);
        if (subData.status === 'active' || subData.status === 'trial') {
          if (onPaymentVerified) onPaymentVerified(subData);
        }
      }

      // 2. Fetch Invoices via Engine
      const invData = await SubscriptionEngine.fetchTenantInvoices(tenantId);
      if (Array.isArray(invData)) {
        setInvoices(invData);
        if (invData.length > 0) {
          const pending = invData.find(i => i.status === 'pending' || i.status === 'payment_under_review') || invData[0];
          setActiveInvoice(pending);
          if (pending.utr_ref && !utrInput) {
            setUtrInput(pending.utr_ref);
          }
        }
      }

      // 3. Fetch Pricing & Payment Config
      const config = await SubscriptionEngine.fetchPricingConfig();
      if (config) {
        setPricingConfig(prev => ({ ...prev, ...config }));
      }
    } catch (err) {
      console.error('Failed to poll payment status:', err);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    // Auto-poll every 6 seconds to detect SuperAdmin approval in real time
    const interval = setInterval(() => {
      fetchStatus(false);
    }, 6000);

    return () => clearInterval(interval);
  }, [user]);

  const handleCopy = (text, key) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const handleUtrSubmit = async (e) => {
    e.preventDefault();
    if (!utrInput.trim()) {
      setUtrErrorMsg('Please enter a valid 12-digit UTR reference number.');
      return;
    }

    setSubmittingUtr(true);
    setUtrErrorMsg('');
    setUtrSuccessMsg('');

    try {
      const res = await SubscriptionEngine.submitUtrVerification({
        tenantId: user?.tenant_id || user?.tenantId || 1,
        invoiceId: activeInvoice?.id || activeInvoice?.invoice_number || 'INV_INIT',
        utrRef: utrInput.trim(),
        paymentMode: 'upi',
        receiptUrl: receiptUrlInput.trim()
      });

      if (res.success) {
        setUtrSuccessMsg('UTR reference submitted successfully! Super Admin review in progress.');
        fetchStatus(false);
      } else {
        setUtrErrorMsg(res.error || 'Failed to submit UTR reference.');
      }
    } catch (err) {
      setUtrErrorMsg(err.message || 'Submission error');
    } finally {
      setSubmittingUtr(false);
    }
  };

  const amountToPay = activeInvoice ? (activeInvoice.grand_total || activeInvoice.grandTotal || 1999) : 1999;
  const upiId = pricingConfig?.upi?.vpa || pricingConfig?.upiId || DEFAULT_PRICING_CONFIG?.upi?.vpa || 'omniflow.crm@icici';
  const payeeName = pricingConfig?.upi?.payeeName || pricingConfig?.upiMerchantName || DEFAULT_PRICING_CONFIG?.upi?.payeeName || 'OmniFlow Technologies';
  
  const upiIntentString = useMemo(() => {
    return generateUpiPaymentString({
      upiId,
      merchantName: payeeName,
      amount: amountToPay,
      transactionNote: `EMS-${activeInvoice?.invoice_number || 'SUB'}`
    });
  }, [upiId, payeeName, amountToPay, activeInvoice]);

  const qrUrl = useMemo(() => {
    return generateUpiQrCodeUrl(upiIntentString);
  }, [upiIntentString]);

  const isUnderReview = subscription?.status === 'payment_under_review' || (activeInvoice && (activeInvoice.status === 'pending' || activeInvoice.utr_ref));
  const isExpired = subscription?.status === 'expired' || Boolean(subscription?.expiry_date && new Date(subscription.expiry_date).getTime() < Date.now());
  const isTrialExpired = isExpired && (subscription?.is_trial || subscription?.plan_id === 'trial');

  const s = {
    container: {
      minHeight: '100vh',
      background: 'radial-gradient(circle at 50% 10%, #0d1b2a 0%, #050811 100%)',
      color: '#f1f5f9',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      position: 'relative',
      padding: '0 0 24px 0',
      boxSizing: 'border-box'
    },
    header: {
      padding: '16px 28px',
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      zIndex: 20
    },
    card: {
      background: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '20px',
      padding: '32px',
      boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
      boxSizing: 'border-box',
      maxWidth: '900px',
      width: '100%',
      margin: '20px auto'
    },
    input: {
      width: '100%',
      padding: '11px 14px',
      background: 'rgba(30, 41, 59, 0.8)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      borderRadius: '10px',
      color: '#ffffff',
      fontSize: '13.5px',
      outline: 'none',
      boxSizing: 'border-box'
    },
    btnPrimary: {
      background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)',
      color: '#ffffff',
      border: 'none',
      padding: '12px 24px',
      borderRadius: '10px',
      fontSize: '14px',
      fontWeight: '700',
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      boxShadow: '0 4px 16px rgba(13, 148, 136, 0.35)'
    }
  };

  return (
    <div style={s.container}>
      
      {/* Top Navbar */}
      <header style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontWeight: '800',
            fontSize: '18px'
          }}>
            ⚡
          </div>
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: '#ffffff' }}>
              OmniFlow EMS • Subscription Gate
            </h1>
            <p style={{ fontSize: '11.5px', color: '#94a3b8', margin: '2px 0 0 0' }}>
              Workspace Security & Provisioning Verification Hub
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={() => fetchStatus(true)}
            disabled={refreshing}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#cbd5e1',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Checking...' : 'Check Status'}</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Lock Screen Card */}
      <main style={{ flex: 1, padding: '0 16px', display: 'flex', alignItems: 'center' }}>
        <div style={s.card}>

          {/* Status Badge Top */}
          <div style={{
            background: isUnderReview ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: isUnderReview ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '12px',
            padding: '14px 18px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {isUnderReview ? <Clock size={20} style={{ color: '#f59e0b' }} /> : <ShieldAlert size={20} style={{ color: '#ef4444' }} />}
              <div>
                <span style={{ fontSize: '14px', fontWeight: '800', color: isUnderReview ? '#fbbf24' : '#f87171', display: 'block' }}>
                  {isUnderReview 
                    ? 'Payment Under Review • SuperAdmin Approval Pending' 
                    : (isTrialExpired 
                        ? '⏳ 7-Day Free Trial Ended • Plan Upgrade Required' 
                        : (isExpired ? '🔒 Subscription Expired • Plan Renewal Required' : 'Payment Verification Pending'))}
                </span>
                <span style={{ fontSize: '12px', color: '#cbd5e1' }}>
                  {isUnderReview 
                    ? 'Your UTR payment reference has been submitted. Super Admin will verify and activate your workspace shortly.'
                    : (isTrialExpired 
                        ? 'Your 7-day free trial period has concluded. All your WhatsApp leads, contacts, and settings are safely preserved. Upgrade to a plan below to continue.'
                        : (isExpired 
                            ? 'Your subscription period has ended. Please renew your plan below to restore team access.'
                            : 'Access to the workspace is strictly protected until payment is verified. Complete your 0% UPI payment below.'))}
                </span>
              </div>
            </div>

            <div style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'right', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
              Live Polling (6s)
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            
            {/* Left Box: 0% UPI Payment QR */}
            <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '800', margin: 0, color: '#ffffff' }}>
                  0% Fee UPI QR Checkout
                </h3>
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#2dd4bf' }}>
                  {formatINR(amountToPay)}
                </span>
              </div>

              {/* QR Code */}
              <div style={{ background: '#ffffff', borderRadius: '14px', padding: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '200px', margin: '0 auto 16px auto', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
                <img
                  src={qrUrl}
                  alt="UPI QR Code"
                  style={{ width: '160px', height: '160px', display: 'block' }}
                />
                <span style={{ fontSize: '11px', color: '#0f172a', fontWeight: '700', marginTop: '6px' }}>
                  Scan with GPay / PhonePe / Paytm
                </span>
              </div>

              {/* Copy UPI VPA */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(15, 23, 42, 0.7)', padding: '10px 14px', borderRadius: '10px', marginBottom: '14px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div>
                  <span style={{ fontSize: '10.5px', color: '#94a3b8', display: 'block' }}>Master UPI ID</span>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#ffffff', fontFamily: 'monospace' }}>{upiId}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(upiId, 'upi')}
                  style={{
                    background: copiedKey === 'upi' ? '#10b981' : '#334155',
                    border: 'none',
                    color: '#ffffff',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {copiedKey === 'upi' ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedKey === 'upi' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {/* Direct Mobile Intent */}
              <a
                href={upiIntentString}
                style={{
                  display: 'block',
                  textAlign: 'center',
                  background: 'rgba(45, 212, 191, 0.15)',
                  border: '1px solid #2dd4bf',
                  color: '#2dd4bf',
                  padding: '10px',
                  borderRadius: '10px',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  textDecoration: 'none'
                }}
              >
                📱 1-Click Pay on Mobile App
              </a>
            </div>

            {/* Right Box: Submit UTR & Bank Transfer Details */}
            <div style={{ background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: '800', margin: '0 0 14px 0', color: '#ffffff' }}>
                  Submit UTR / Transaction Reference
                </h3>

                {utrSuccessMsg && (
                  <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '10px', padding: '10px 14px', color: '#6ee7b7', fontSize: '12px', marginBottom: '14px' }}>
                    {utrSuccessMsg}
                  </div>
                )}

                {utrErrorMsg && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '10px', padding: '10px 14px', color: '#fca5a5', fontSize: '12px', marginBottom: '14px' }}>
                    {utrErrorMsg}
                  </div>
                )}

                <form onSubmit={handleUtrSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                      12-Digit UTR Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 523412984576"
                      value={utrInput}
                      onChange={(e) => setUtrInput(e.target.value)}
                      style={s.input}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                      Receipt Screenshot URL (Optional)
                    </label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={receiptUrlInput}
                      onChange={(e) => setReceiptUrlInput(e.target.value)}
                      style={s.input}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingUtr || !utrInput.trim()}
                    style={{
                      ...s.btnPrimary,
                      marginTop: '6px',
                      justifyContent: 'center',
                      opacity: (!utrInput.trim() || submittingUtr) ? 0.6 : 1,
                      cursor: (!utrInput.trim() || submittingUtr) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <span>{submittingUtr ? 'Verifying...' : 'Update & Verify Payment →'}</span>
                  </button>
                </form>
              </div>

              {/* Direct Bank Transfer Details Card */}
              <div style={{ marginTop: '20px', padding: '12px 14px', borderRadius: '12px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.06)', fontSize: '11.5px', color: '#94a3b8' }}>
                <span style={{ fontWeight: '700', color: '#e2e8f0', display: 'block', marginBottom: '4px' }}>
                  Alternative Direct Bank Transfer (NEFT / IMPS / RTGS):
                </span>
                <div>Bank: <strong>{pricingConfig?.bankDetails?.bankName || 'HDFC Bank Ltd'}</strong></div>
                <div>Account: <strong>{pricingConfig?.bankDetails?.accountNumber || '50200084729103'}</strong></div>
                <div>IFSC: <strong>{pricingConfig?.bankDetails?.ifsc || 'HDFC0001234'}</strong></div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ textAlign: 'center', fontSize: '11.5px', color: '#64748b' }}>
        © 2026 OmniFlow EMS Suite. Registered SAC 998313 Cloud IT Services.
      </footer>
    </div>
  );
}
