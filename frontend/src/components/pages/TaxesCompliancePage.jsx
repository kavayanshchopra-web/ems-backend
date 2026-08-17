import React from 'react';

export default function TaxesCompliancePage({ showToast = () => {} }) {
  return (
    <div className="payroll-page glass-panel">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-header-title">🏛️ Taxes &amp; PF Compliance</h1>
          <p className="page-header-subtitle">Configure standard TDS deductions and Provident Fund rates.</p>
        </div>
      </div>
      <div style={{ padding: 'var(--space-6)' }}>
        <div className="simple-form-card">
          <div className="form-row">
            <label>Standard PF Deduction (%)</label>
            <input className="crm-input" type="number" defaultValue="12" />
          </div>
          <div className="form-row">
            <label>Professional Tax Deduction (PT)</label>
            <input className="crm-input" type="number" defaultValue="200" />
          </div>
          <div className="form-row">
            <label>TDS Rate (%)</label>
            <input className="crm-input" type="number" defaultValue="10" />
          </div>
          <button className="btn btn-primary" onClick={() => showToast('Tax parameters updated!', 'success')}>
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
