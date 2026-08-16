import React, { useState } from 'react';

export default function RewardsPage({ employees = [], t, viewMode = 'badges' }) {
  const [kpiSortKey, setKpiSortKey] = useState('first_name');
  const [kpiSortDir, setKpiSortDir] = useState('asc');

  return (
    <div className="payroll-page glass-panel payroll-panel">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-header-title">🏆 {viewMode === 'badges' ? 'Rewards & Badges Dashboard' : (t ? t('kpiTitle') : 'Performance KPIs & Badges')}</h1>
          <p className="page-header-subtitle">
            {viewMode === 'badges'
              ? 'Recognise and celebrate top performers in your organisation.'
              : (t ? t('kpiSubtitle') : 'Track quality ratings, attendance scores and performance grades')}
          </p>
        </div>
      </div>
      <div style={{ padding: '0 var(--space-6) var(--space-6)', overflowY: 'auto', flexGrow: 1 }}>
        {/* Badges Grid Section */}
        <div className="rewards-grid" style={{ marginBottom: '24px' }}>
          {[
            { icon: '🏆', title: 'Employee of Month', desc: 'Top performer with 100% attendance and high sales conversions.' },
            { icon: '⚡', title: 'Speed Star', desc: 'Quick response rate on WhatsApp customer chat pipelines.' },
            { icon: '🎯', title: 'Target Crusher', desc: 'Achieved 120%+ of monthly sales target for the quarter.' },
            { icon: '🤝', title: 'Team Player', desc: 'Consistently supported peers and improved team productivity.' },
            { icon: '📚', title: 'Self Learner', desc: 'Completed advanced training modules ahead of schedule.' },
            { icon: '💡', title: 'Innovator', desc: 'Proposed a process improvement that saved 5 hours per week.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="reward-card">
              <div className="reward-icon">{icon}</div>
              <div className="reward-title">{title}</div>
              <div className="reward-desc">{desc}</div>
            </div>
          ))}
        </div>

        {/* Employee Scores Table */}
        <div className="payroll-table-card">
          <div className="payroll-table-toolbar">
            <span className="payroll-table-title">{t ? t('kpiTitle') : 'Employee Scores'}</span>
            <span className="payroll-table-hint">💡 Click column headers to sort</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="std-table">
              <thead>
                <tr>
                  <th className={`th-sortable${kpiSortKey === 'first_name' ? ' active' : ''}`}
                    onClick={() => { if (kpiSortKey === 'first_name') setKpiSortDir(prev => prev === 'asc' ? 'desc' : 'asc'); else { setKpiSortKey('first_name'); setKpiSortDir('asc'); } }}>
                    {t ? t('employee') : 'Employee'} <span className="th-sort-icon">{kpiSortKey === 'first_name' ? (kpiSortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
                  </th>
                  <th className={`th-sortable${kpiSortKey === 'rating' ? ' active' : ''}`}
                    onClick={() => { if (kpiSortKey === 'rating') setKpiSortDir(prev => prev === 'asc' ? 'desc' : 'asc'); else { setKpiSortKey('rating'); setKpiSortDir('asc'); } }}>
                    {t ? t('qualityRating') : 'Quality Rating'} <span className="th-sort-icon">{kpiSortKey === 'rating' ? (kpiSortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
                  </th>
                  <th className={`th-sortable${kpiSortKey === 'attendance' ? ' active' : ''}`}
                    onClick={() => { if (kpiSortKey === 'attendance') setKpiSortDir(prev => prev === 'asc' ? 'desc' : 'asc'); else { setKpiSortKey('attendance'); setKpiSortDir('asc'); } }}>
                    {t ? t('attendanceScore') : 'Attendance Score'} <span className="th-sort-icon">{kpiSortKey === 'attendance' ? (kpiSortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
                  </th>
                  <th className={`th-sortable${kpiSortKey === 'grade' ? ' active' : ''}`}
                    onClick={() => { if (kpiSortKey === 'grade') setKpiSortDir(prev => prev === 'asc' ? 'desc' : 'asc'); else { setKpiSortKey('grade'); setKpiSortDir('asc'); } }}>
                    {t ? t('overallGrade') : 'Overall Grade'} <span className="th-sort-icon">{kpiSortKey === 'grade' ? (kpiSortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const sorted = [...employees].sort((a, b) => {
                    if (kpiSortKey === 'first_name') {
                      const nameA = `${a.first_name} ${a.last_name || ''}`.toLowerCase();
                      const nameB = `${b.first_name} ${b.last_name || ''}`.toLowerCase();
                      return kpiSortDir === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
                    }
                    return 0;
                  });
                  return sorted.map(emp => (
                    <tr key={emp.id}>
                      <td><div className="emp-cell"><div className="emp-avatar-sm">{(emp.first_name||'')[0]}{(emp.last_name||'')[0]||''}</div><span className="emp-name-main">{emp.first_name} {emp.last_name || ''}</span></div></td>
                      <td><span style={{ color: '#eab308', fontWeight: 'var(--fw-bold)' }}>★★★★☆</span> <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>(4.2)</span></td>
                      <td><span className="badge-success">98% Present</span></td>
                      <td><span className="badge-success">Grade A</span></td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
