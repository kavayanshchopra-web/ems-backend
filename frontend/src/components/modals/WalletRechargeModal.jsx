import React, { useState } from 'react';
import { X, Wallet, ShieldCheck, CheckCircle2, AlertTriangle, ArrowRight, Zap } from 'lucide-react';
import frontendWalletService from '../../core/services/universalWalletService';

export default function WalletRechargeModal({ isOpen, onClose, currentBalance = 0, onRechargeSuccess, tenantId = 1, user }) {
  const [selectedAmount, setSelectedAmount] = useState(1000);
  const [customAmount, setCustomAmount] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  if (!isOpen) return null;

  const finalAmount = isCustom ? parseFloat(customAmount || 0) : selectedAmount;

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleProceedPayment = async () => {
    setError(null);
    setSuccess(null);

    if (finalAmount < 1000) {
      setError('Minimum wallet recharge amount is ₹1,000.00');
      return;
    }

    setLoading(true);
    try {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        throw new Error('Could not load Razorpay secure checkout. Please check internet connection.');
      }

      // 1. Create Order
      const res = await frontendWalletService.createRechargeOrder(tenantId, finalAmount);
      const order = res?.order || res;

      if (!order || !order.keyId) {
        throw new Error(
          res?.error || 
          'SuperAdmin Razorpay Gateway is not configured yet. SuperAdmin must enter the Razorpay Key ID in Billing Studio ➔ Pricing & Margins (ADMIN).'
        );
      }

      // 2. Open Razorpay Checkout
      const options = {
        key: order.keyId,
        amount: Math.round(Number(finalAmount) * 100), // paise
        currency: order.currency || 'INR',
        name: 'Employee Management Systems',
        description: `Universal SaaS Wallet Recharge - ₹${Number(finalAmount).toLocaleString('en-IN')}`,
        handler: async function (response) {
          try {
            setLoading(true);
            // 3. Verify Payment and Credit Balance in Supabase
            const verifyRes = await frontendWalletService.verifyRechargePayment(tenantId, {
              orderId: response.razorpay_order_id || order.orderId,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              amount: finalAmount
            });

            setSuccess({
              amount: verifyRes.creditedAmount,
              newBalance: verifyRes.newBalance,
              paymentId: verifyRes.paymentId
            });

            if (onRechargeSuccess) {
              onRechargeSuccess(verifyRes.newBalance);
            }
          } catch (vErr) {
            setError(vErr.message || 'Payment verification failed. Balance was not credited.');
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: user?.name || user?.displayName || 'Enterprise Client',
          email: user?.email || '',
          contact: user?.phone || ''
        },
        theme: {
          color: '#0d9488'
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          }
        }
      };

      if (order.orderId && order.orderId.startsWith('order_') && !order.orderId.startsWith('order_wal_') && !order.orderId.startsWith('wal_ord_')) {
        options.order_id = order.orderId;
      }

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        setError(`Payment Failed: ${response.error?.description || 'Transaction declined'}`);
        setLoading(false);
      });
      rzp.open();
    } catch (err) {
      setError(err.message || 'Failed to initiate recharge');
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '16px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        width: '480px',
        maxWidth: '100%',
        boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          padding: '20px 24px',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(13, 148, 136, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(45, 212, 191, 0.4)'
            }}>
              <Wallet size={22} color="#2dd4bf" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', letterSpacing: '-0.3px' }}>
                Universal SaaS Wallet
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                Instant Recharge via UPI, Cards, NetBanking
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {/* Current Balance & Threshold Card */}
          <div style={{
            background: currentBalance <= 1000 ? '#fffbeb' : '#f0fdf4',
            border: `1px solid ${currentBalance <= 1000 ? '#fde68a' : '#bbf7d0'}`,
            borderRadius: '12px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px'
          }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: currentBalance <= 1000 ? '#b45309' : '#166534', textTransform: 'uppercase' }}>
                Current Available Balance
              </div>
              <div style={{ fontSize: '24px', fontWeight: '900', color: currentBalance <= 1000 ? '#92400e' : '#14532d', marginTop: '2px' }}>
                ₹{parseFloat(currentBalance || 0).toFixed(2)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{
                background: currentBalance <= 1000 ? '#fef3c7' : '#dcfce7',
                color: currentBalance <= 1000 ? '#b45309' : '#15803d',
                fontSize: '11px',
                fontWeight: '800',
                padding: '4px 10px',
                borderRadius: '20px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                {currentBalance <= 1000 ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
                {currentBalance <= 1000 ? 'Low Balance' : 'Active'}
              </span>
              <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '4px' }}>
                Threshold: ₹1,000.00
              </div>
            </div>
          </div>

          {/* Success Message */}
          {success && (
            <div style={{
              background: '#ecfdf5',
              border: '1.5px solid #34d399',
              borderRadius: '10px',
              padding: '14px',
              marginBottom: '18px',
              color: '#065f46'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', fontSize: '14px' }}>
                <CheckCircle2 size={18} color="#059669" />
                <span>Recharge Successful!</span>
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '12.5px' }}>
                ₹{success.amount.toLocaleString('en-IN')} has been added. New Balance: <b>₹{success.newBalance.toFixed(2)}</b>
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1.5px solid #fecaca',
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '18px',
              color: '#b91c1c',
              fontSize: '12.5px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', color: '#991b1b' }}>
                <AlertTriangle size={16} color="#dc2626" style={{ flexShrink: 0 }} />
                <span>Configuration Notice</span>
              </div>
              <div style={{ margin: 0, lineHeight: 1.45 }}>
                {error}
              </div>
            </div>
          )}

          {/* Amount Selection */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '8px' }}>
              Select Recharge Pack (Minimum: ₹1,000)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              {[
                { amount: 1000, label: 'Starter', popular: false },
                { amount: 2500, label: 'Growth', popular: true },
                { amount: 5000, label: 'Pro Scale', popular: false }
              ].map((pack) => {
                const active = !isCustom && selectedAmount === pack.amount;
                return (
                  <button
                    key={pack.amount}
                    type="button"
                    onClick={() => {
                      setSelectedAmount(pack.amount);
                      setIsCustom(false);
                    }}
                    style={{
                      border: `2px solid ${active ? '#0d9488' : '#e2e8f0'}`,
                      background: active ? '#f0fdf4' : '#ffffff',
                      borderRadius: '10px',
                      padding: '12px 8px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      position: 'relative',
                      transition: 'all 0.15s'
                    }}
                  >
                    {pack.popular && (
                      <span style={{
                        position: 'absolute',
                        top: '-8px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: '#0d9488',
                        color: '#ffffff',
                        fontSize: '9px',
                        fontWeight: '800',
                        padding: '1px 6px',
                        borderRadius: '6px',
                        textTransform: 'uppercase'
                      }}>
                        Popular
                      </span>
                    )}
                    <div style={{ fontSize: '16px', fontWeight: '900', color: active ? '#0f766e' : '#1e293b' }}>
                      ₹{pack.amount.toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '2px' }}>
                      {pack.label}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom Amount Option */}
            <div style={{ marginTop: '12px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                border: `1.5px solid ${isCustom ? '#0d9488' : '#cbd5e1'}`,
                borderRadius: '10px',
                padding: '6px 12px',
                background: isCustom ? '#f0fdf4' : '#f8fafc'
              }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#64748b' }}>Custom ₹</span>
                <input
                  type="number"
                  min="1000"
                  step="100"
                  placeholder="Enter amount (min ₹1,000)"
                  value={customAmount}
                  onFocus={() => setIsCustom(true)}
                  onChange={(e) => {
                    setIsCustom(true);
                    setCustomAmount(e.target.value);
                  }}
                  style={{
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontSize: '13px',
                    fontWeight: '700',
                    color: '#0f2b26',
                    width: '100%'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Secure Assurance Banner */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '20px'
          }}>
            <ShieldCheck size={18} color="#0d9488" />
            <div style={{ fontSize: '11px', color: '#475569', lineHeight: 1.3 }}>
              <b>100% Verified Payment:</b> Funds are credited instantly only upon official Razorpay gateway bank confirmation.
            </div>
          </div>

          {/* Proceed Button */}
          <button
            type="button"
            disabled={loading || finalAmount < 1000}
            onClick={handleProceedPayment}
            style={{
              width: '100%',
              background: loading ? '#94a3b8' : 'linear-gradient(135deg, #0d9488 0%, #10b981 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '14px',
              fontSize: '14px',
              fontWeight: '800',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 15px rgba(13, 148, 136, 0.3)',
              transition: 'all 0.15s'
            }}
          >
            {loading ? (
              <span>Verifying & Opening Gateway...</span>
            ) : (
              <>
                <Zap size={16} />
                <span>Recharge ₹{finalAmount.toLocaleString('en-IN')} Now</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
