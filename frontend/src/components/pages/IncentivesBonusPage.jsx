import React from 'react';

export default function IncentivesBonusPage({
  employees = [],
  showToast = () => {}
}) {
  return (
    <div className="payroll-page glass-panel">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-header-title">🎯 Incentives &amp; Performance Bonus</h1>
          <p className="page-header-subtitle">Add incentive bonuses to salaries based on performance targets.</p>
        </div>
      </div>
      <div style={{ padding: 'var(--space-6)' }}>
        <div className="simple-form-card">
          <div className="form-row">
            <label>Select Employee</label>
            <select className="crm-select">
              {employees.map(e => (
                <option key={e.id} value={e.id}>
                  {e.first_name} {e.last_name || ''}
                </option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label>Incentive Type</label>
            <select className="crm-select">
              <option>Performance Bonus</option>
              <option>Festival Bonus</option>
              <option>Target Achievement</option>
              <option>Referral Bonus</option>
            </select>
          </div>
          <div className="form-row">
            <label>Incentive Amount (₹)</label>
            <input className="crm-input" type="number" placeholder="e.g. 5000" />
          </div>
          <button className="btn btn-primary" onClick={() => showToast('Incentive added successfully!', 'success')}>
            Apply Bonus
          </button>
        </div>
      </div>
    </div>
  );
}
