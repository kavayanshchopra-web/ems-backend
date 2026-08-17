import React from 'react';
import PageContainer from '../ui/PageContainer';
import PageHeader from '../ui/PageHeader';

/**
 * Global Design System v2.0 - BillingPattern (SaaS Subscription & Tenant Tier Billing Pattern)
 */
export default function BillingPattern({
  icon = '💳',
  title = 'Subscription & Billing',
  subtitle = 'Manage tenant subscription plans, usage quotas, and payment receipts',
  currentPlanCard = null,
  usageMeters = null,
  plansTable = null,
  invoicesLedger = null,
  style = {},
  className = ''
}) {
  return (
    <PageContainer maxWidth="1600px" style={style} className={className}>
      <PageHeader icon={icon} title={title} subtitle={subtitle} />

      {currentPlanCard && (
        <div style={{ marginBottom: '24px' }}>{currentPlanCard}</div>
      )}

      {usageMeters && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {usageMeters}
        </div>
      )}

      {plansTable && (
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          {plansTable}
        </div>
      )}

      {invoicesLedger && (
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          {invoicesLedger}
        </div>
      )}
    </PageContainer>
  );
}
