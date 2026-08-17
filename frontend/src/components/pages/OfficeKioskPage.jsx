import React from 'react';
import { Clock } from 'lucide-react';

export default function OfficeKioskPage({ employees = [] }) {
  return (
    <div className="payroll-page glass-panel payroll-panel">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-header-title">🖥️ Office Kiosk Mode</h1>
          <p className="page-header-subtitle">Office Kiosk Touchscreen Attendance Terminal</p>
        </div>
      </div>

      <div style={{ padding: '0 var(--space-6) var(--space-6)', overflowY: 'auto', flexGrow: 1 }}>
        <div style={{ background: 'var(--color-primary)', color: 'white', padding: 'var(--space-8)', borderRadius: 'var(--radius-lg)', textAlign: 'center', marginBottom: 'var(--space-6)', boxShadow: 'var(--shadow-lg)' }}>
          <Clock size={48} style={{ marginBottom: 'var(--space-3)', opacity: 0.9 }} />
          <h1 style={{ fontSize: '36px', fontWeight: '800', fontFamily: 'monospace', margin: 0 }}>{new Date().toLocaleTimeString()}</h1>
          <p style={{ fontSize: 'var(--text-sm)', opacity: 0.8, marginTop: 'var(--space-1)', margin: 0 }}>Terminal Active</p>
        </div>

        <div className="simple-form-card" style={{ maxWidth: '460px', margin: '0 auto', textAlign: 'center' }}>
          <h3 className="payroll-table-title" style={{ marginBottom: 'var(--space-2)' }}>Employee Quick Punch</h3>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-5)' }}>Enter your 4-Digit Security PIN or Select Employee Name</p>

          <select style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', width: '100%', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)', background: 'var(--bg-subtle)', color: 'var(--text-primary)' }}>
            <option value="">-- Choose Employee Name --</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name || ''} ({e.department})</option>)}
          </select>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <button className="btn btn-success" style={{ padding: '14px', fontSize: 'var(--text-sm)', borderRadius: 'var(--radius-md)' }} onClick={() => alert('Punch IN registered successfully at office kiosk!')}>
              🟢 Punch IN
            </button>
            <button className="btn btn-danger" style={{ padding: '14px', fontSize: 'var(--text-sm)', borderRadius: 'var(--radius-md)' }} onClick={() => alert('Punch OUT registered successfully at office kiosk!')}>
              🔴 Punch OUT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
