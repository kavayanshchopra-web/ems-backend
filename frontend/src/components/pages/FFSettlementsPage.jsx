import React from 'react';

export default function FFSettlementsPage() {
  return (
    <div className="payroll-page glass-panel">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-header-title">📋 Full &amp; Final Settlements</h1>
          <p className="page-header-subtitle">Clear remaining dues for exiting employees.</p>
        </div>
      </div>
      <div style={{ padding: 'var(--space-6)' }}>
        <div className="empty-state-card">
          <div className="empty-state-icon">📭</div>
          <div className="empty-state-title">No Pending Settlements</div>
          <div className="empty-state-desc">All full &amp; final settlements have been cleared.</div>
        </div>
      </div>
    </div>
  );
}
