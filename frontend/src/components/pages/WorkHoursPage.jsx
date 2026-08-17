import React from 'react';

export default function WorkHoursPage({ employees = [] }) {
  return (
    <div className="payroll-page glass-panel payroll-panel">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-header-title">⏱️ Work Hours &amp; Overtime Audit Log</h1>
          <p className="page-header-subtitle">Daily shift duration, break logs, and overtime hours.</p>
        </div>
      </div>

      <div className="payroll-table-section">
        <div className="payroll-table-card">
          <div className="payroll-table-toolbar">
            <span className="payroll-table-title">Overtime &amp; Activity Log</span>
            <span className="payroll-table-hint">📅 Daily update register</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="std-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Shift Hours</th>
                  <th>Break Time</th>
                  <th>Overtime Hours</th>
                  <th style={{ textAlign: 'right' }}>Total Worked</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id}>
                    <td><span className="emp-name-main">{emp.first_name} {emp.last_name || ''}</span></td>
                    <td>8.0 Hours</td>
                    <td>45 Mins</td>
                    <td><span className="badge-success" style={{ fontWeight: '700' }}>+1.5 Hours</span></td>
                    <td style={{ textAlign: 'right', fontWeight: '700' }}>9.5 Hours</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
