import React from 'react';

export default function BillingPage({
  billingTenant,
  API_URL,
  selectedCountry,
  setSelectedCountry,
  billingPlans = [],
  handleCreateCheckoutSession
}) {
  return (
    <div className="billing-panel glass-panel" style={{ padding: '30px', margin: '16px', overflowY: 'auto', flexGrow: 1 }}>
      <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-primary)', marginBottom: '6px' }}>Subscription Billing</h2>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
        Manage your subscription plans, Stripe invoice billing history, and payment cards.
      </p>

      {/* Current Status Box */}
      <div style={{
        background: 'white',
        padding: '24px',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px'
      }}>
        <div>
          <span style={{ fontSize: '12px', color: '#557a75', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CURRENT PLAN</span>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f2b26', marginTop: '4px' }}>
            {billingTenant?.subscription_status === 'active' ? 'OmniFlow CRM Unlimited Pro Plan' : 'Free Trial Tier (Limited)'}
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {billingTenant?.subscription_status === 'active'
              ? 'Thank you for supporting us! Your billing account is active.'
              : 'Upgrade to unlock multiple WhatsApp channels and automatic scheduled responders.'}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
          <span style={{
            padding: '6px 14px',
            borderRadius: '99px',
            fontSize: '12px',
            fontWeight: '700',
            textTransform: 'uppercase',
            background: billingTenant?.subscription_status === 'active' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            color: billingTenant?.subscription_status === 'active' ? '#10b981' : '#ef4444',
            border: billingTenant?.subscription_status === 'active' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)'
          }}>
            {billingTenant?.subscription_status || 'Trial'}
          </span>

          {billingTenant?.stripe_customer_id && (
            <button
              className="btn"
              type="button"
              style={{ background: 'rgba(13, 148, 136, 0.1)', color: 'var(--color-primary)', border: 'none', fontSize: '12px', padding: '6px 12px' }}
              onClick={async () => {
                try {
                  const res = await fetch(`${API_URL}/billing/create-portal-session`, { method: 'POST' });
                  const data = await res.json();
                  if (data.url) window.location.href = data.url;
                } catch (err) {
                  alert('Stripe customer portal redirection failed.');
                }
              }}
            >
              Manage Billing Portal
            </button>
          )}
        </div>
      </div>

      {/* Country pricing rate selector */}
      <div style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        padding: '16px 20px',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '32px'
      }}>
        <div>
          <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#0f2b26' }}>Billing Location Currency</h4>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Swap country code to view pricing details in localized currencies.</p>
        </div>
        <select
          value={selectedCountry}
          onChange={(e) => setSelectedCountry && setSelectedCountry(e.target.value)}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            background: 'white',
            fontSize: '13px',
            fontWeight: '600',
            color: '#0f2b26',
            cursor: 'pointer',
            outline: 'none'
          }}
        >
          <option value="IN">India (₹ INR)</option>
          <option value="US">United States ($ USD)</option>
          <option value="DEFAULT">International ($ USD)</option>
        </select>
      </div>

      {/* Pricing Cards List */}
      {(!billingTenant || billingTenant.subscription_status !== 'active') && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f2b26', marginBottom: '24px', textAlign: 'center' }}>
            Choose a Localized Subscription Plan
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', maxWidth: '800px', margin: '0 auto' }}>

            {(billingPlans || []).map(plan => {
              const priceSymbol = plan.price?.currency === 'INR' ? '₹' : '$';
              const amountValue = plan.price?.amount !== undefined ? plan.price.amount : 0;
              const stripePriceId = plan.price?.stripe_price_id || '';
              const isPopular = plan.id === 'pro';

              return (
                <div
                  key={plan.id}
                  style={{
                    background: 'white',
                    padding: '28px',
                    borderRadius: '16px',
                    border: isPopular ? '2px solid var(--color-primary)' : '1px solid #e2e8f0',
                    boxShadow: isPopular ? '0 10px 30px rgba(13,148,136,0.1)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative'
                  }}
                >
                  {isPopular && (
                    <span style={{
                      position: 'absolute',
                      top: '-12px',
                      right: '20px',
                      background: 'var(--color-primary)',
                      color: 'white',
                      fontSize: '9px',
                      fontWeight: '800',
                      padding: '3px 10px',
                      borderRadius: '99px',
                      letterSpacing: '0.05em'
                    }}>
                      POPULAR
                    </span>
                  )}
                  <div>
                    <h4 style={{ fontSize: '18px', fontWeight: '800', color: '#0f2b26' }}>{plan.name}</h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{plan.description}</p>
                    <div style={{ margin: '20px 0', display: 'flex', alignItems: 'baseline' }}>
                      <span style={{ fontSize: '32px', fontWeight: '800', color: 'var(--color-primary)' }}>
                        {priceSymbol}{amountValue}
                      </span>
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)', marginLeft: '4px' }}>/ month</span>
                    </div>
                    <ul style={{ paddingLeft: '18px', fontSize: '12px', color: '#557a75', lineHeight: '22px', marginBottom: '20px' }}>
                      {(plan.features || []).map((feat, idx) => (
                        <li key={idx}>{feat}</li>
                      ))}
                    </ul>
                  </div>
                  <button
                    className="btn btn-primary"
                    type="button"
                    style={{
                      marginTop: '12px',
                      width: '100%',
                      padding: '12px',
                      background: isPopular ? 'linear-gradient(135deg, #0d9488, #0f766e)' : 'var(--color-primary)'
                    }}
                    onClick={() => handleCreateCheckoutSession && handleCreateCheckoutSession(stripePriceId)}
                  >
                    Upgrade to {plan.name}
                  </button>
                </div>
              );
            })}

            {(!billingPlans || billingPlans.length === 0) && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
                No active subscription plans found for this location.
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
