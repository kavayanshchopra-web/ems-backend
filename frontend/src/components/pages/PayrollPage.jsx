import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { LabelEngine } from '../../core/engines/LabelEngine';

export default function PayrollPage({
  employees = [],
  attendanceLogs = [],
  activeCurrency = 'INR',
  showToast = () => {},
  t = (key) => key
}) {
  const [payrollSortKey, setPayrollSortKey] = useState('first_name');
  const [payrollSortDir, setPayrollSortDir] = useState('asc');

  return (
    <div className="payroll-page glass-panel payroll-panel">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-header-title">💰 {t('payrollTitle')}</h1>
          <p className="page-header-subtitle">{t('payrollSubtitle')}</p>
        </div>
        <div className="page-header-right">
          <button
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => showToast('Calculating payroll rates and generating payslip structures...', 'success')}
          >
            <RefreshCw size={15} /> Auto Calculate
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="payroll-stats-row">
        <div className="payroll-stat-card">
          <div className="payroll-stat-icon teal">👥</div>
          <div>
            <div className="payroll-stat-label">Total Employees</div>
            <div className="payroll-stat-value">{employees.length}</div>
          </div>
        </div>
        <div className="payroll-stat-card">
          <div className="payroll-stat-icon green">{LabelEngine.getCurrencySymbol(activeCurrency)}</div>
          <div>
            <div className="payroll-stat-label">Total Payroll</div>
            <div className="payroll-stat-value">
              {LabelEngine.formatCurrencyVal(
                employees.reduce((s, e) => s + (parseFloat(e.salary) || 0), 0),
                activeCurrency
              )}
            </div>
          </div>
        </div>
        <div className="payroll-stat-card">
          <div className="payroll-stat-icon amber">⏳</div>
          <div>
            <div className="payroll-stat-label">Pending Payslips</div>
            <div className="payroll-stat-value">{employees.length}</div>
          </div>
        </div>
        <div className="payroll-stat-card">
          <div className="payroll-stat-icon blue">📅</div>
          <div>
            <div className="payroll-stat-label">Working Days / Mo</div>
            <div className="payroll-stat-value">22</div>
          </div>
        </div>
      </div>

      {/* Payroll Table */}
      <div className="payroll-table-section">
        <div className="payroll-table-card">
          <div className="payroll-table-toolbar">
            <span className="payroll-table-title">Employee Salary Register</span>
            <span className="payroll-table-hint">💡 Click column headers to sort</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="std-table">
              <thead>
                <tr>
                  <th
                    className={`th-sortable${payrollSortKey === 'first_name' ? ' active' : ''}`}
                    onClick={() => {
                      if (payrollSortKey === 'first_name') {
                        setPayrollSortDir(p => (p === 'asc' ? 'desc' : 'asc'));
                      } else {
                        setPayrollSortKey('first_name');
                        setPayrollSortDir('asc');
                      }
                    }}
                  >
                    {t('employee')}{' '}
                    <span className="th-sort-icon">
                      {payrollSortKey === 'first_name'
                        ? payrollSortDir === 'asc'
                          ? '▲'
                          : '▼'
                        : '⇅'}
                    </span>
                  </th>
                  <th
                    className={`th-sortable${payrollSortKey === 'salary' ? ' active' : ''}`}
                    onClick={() => {
                      if (payrollSortKey === 'salary') {
                        setPayrollSortDir(p => (p === 'asc' ? 'desc' : 'asc'));
                      } else {
                        setPayrollSortKey('salary');
                        setPayrollSortDir('asc');
                      }
                    }}
                  >
                    {t('baseSalary')}{' '}
                    <span className="th-sort-icon">
                      {payrollSortKey === 'salary'
                        ? payrollSortDir === 'asc'
                          ? '▲'
                          : '▼'
                        : '⇅'}
                    </span>
                  </th>
                  <th>{t('workingDays')}</th>
                  <th>{t('netSalary')}</th>
                  <th>{t('status')}</th>
                  <th style={{ textAlign: 'right' }}>{t('action')}</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const sorted = [...employees].sort((a, b) => {
                    if (payrollSortKey === 'first_name') {
                      const nA = `${a.first_name} ${a.last_name || ''}`.toLowerCase();
                      const nB = `${b.first_name} ${b.last_name || ''}`.toLowerCase();
                      return payrollSortDir === 'asc' ? nA.localeCompare(nB) : nB.localeCompare(nA);
                    }
                    if (payrollSortKey === 'salary') {
                      const sA = parseFloat(a.salary) || 0,
                        sB = parseFloat(b.salary) || 0;
                      return payrollSortDir === 'asc' ? sA - sB : sB - sA;
                    }
                    return 0;
                  });

                  if (!sorted.length) {
                    return (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                          No employees found.
                        </td>
                      </tr>
                    );
                  }

                  return sorted.map(emp => {
                    const days = Math.min(
                      22,
                      attendanceLogs.filter(l => l.employee_id === emp.id).length
                    );
                    const net = emp.salary > 0 ? Math.round(emp.salary * (days / 22)) : 0;
                    const pct = Math.round((days / 22) * 100);
                    const initials = `${(emp.first_name || '')[0] || ''}${(emp.last_name || '')[0] || ''}`.toUpperCase();

                    return (
                      <tr key={emp.id}>
                        <td>
                          <div className="emp-cell">
                            <div className="emp-avatar-sm">{initials}</div>
                            <div>
                              <div className="emp-name-main">
                                {emp.first_name} {emp.last_name || ''}
                              </div>
                              <div className="emp-name-sub">
                                {emp.role || 'Employee'} · {emp.department || 'General'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="emp-name-main">
                            {LabelEngine.formatCurrencyVal(emp.salary || 0, activeCurrency)}
                          </div>
                          <div className="emp-name-sub">per month</div>
                        </td>
                        <td>
                          <div className="days-cell">
                            <div className="days-label">
                              {days} / 22 days ({pct}%)
                            </div>
                            <div className="days-bar-track">
                              <div className="days-bar-fill" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="salary-amount">
                            {LabelEngine.formatCurrencyVal(net, activeCurrency)}
                          </div>
                          <div className="salary-base">after attendance deduction</div>
                        </td>
                        <td>
                          <span className="badge-warning">Pending</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn-payslip"
                            onClick={() =>
                              showToast(
                                `Payslip generated for ${emp.first_name}. Sending copy on email.`,
                                'success'
                              )
                            }
                          >
                            📄 Payslip
                          </button>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
