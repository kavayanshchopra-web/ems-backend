import React from 'react';
import { Search } from 'lucide-react';

export default function GlobalSearchModal({
  showGlobalSearchModal,
  setShowGlobalSearchModal,
  globalSearchQuery,
  setGlobalSearchQuery,
  setActiveTab,
  teamTrackLocations = [],
  auditLogs = []
}) {
  if (!showGlobalSearchModal) return null;

  const query = globalSearchQuery.toLowerCase().trim();

  return (
    <div className="modal-overlay" onClick={() => setShowGlobalSearchModal(false)} style={{ zIndex: 99999 }}>
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', padding: '24px', position: 'absolute', top: '15%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '2px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
          <Search size={20} style={{ color: '#0d9488' }} />
          <input
            type="text"
            placeholder="Search contacts, employees, tasks, logs... (Press Esc to close)"
            value={globalSearchQuery}
            onChange={(e) => setGlobalSearchQuery(e.target.value)}
            style={{ width: '100%', border: 'none', outline: 'none', fontSize: '16px', background: 'transparent', fontWeight: '600', color: '#0f2b26' }}
            autoFocus
          />
        </div>

        {/* Search Results list */}
        <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {(() => {
            if (!query) {
              return <div style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', padding: '16px' }}>Type to search across OmniFlow database...</div>;
            }

            const results = [];

            // Page Module Navigation Shortcuts
            if ('payroll salary pay'.includes(query)) {
              results.push({
                type: 'Finance Module',
                title: 'Payroll & Salary Register',
                desc: 'Manage employee salary slips, basic pay, and reimbursements',
                action: () => { setActiveTab('payroll'); setShowGlobalSearchModal(false); }
              });
            }

            if ('verify document kyc docs'.includes(query)) {
              results.push({
                type: 'HR Module',
                title: 'Verify Documents & KYC',
                desc: 'Review Aadhaar, PAN, and employee verification files',
                action: () => { setActiveTab('verify_documents'); setShowGlobalSearchModal(false); }
              });
            }

            if ('live tracking map gps'.includes(query)) {
              results.push({
                type: 'Field Module',
                title: 'Live Tracking Map & Telemetry',
                desc: 'Monitor real-time field staff locations and battery levels',
                action: () => { setActiveTab('gps_attendance'); setShowGlobalSearchModal(false); }
              });
            }

            if ('kiosk punch terminal office'.includes(query)) {
              results.push({
                type: 'Operations Module',
                title: 'Office Kiosk Terminal',
                desc: 'On-site staff check-in & check-out kiosk screen',
                action: () => { setActiveTab('office_kiosk'); setShowGlobalSearchModal(false); }
              });
            }

            // 1. Search employees
            teamTrackLocations.forEach(emp => {
              if ((emp.first_name || '').toLowerCase().includes(query) || (emp.last_name || '').toLowerCase().includes(query) || (emp.role || '').toLowerCase().includes(query)) {
                results.push({
                  type: 'Employee Profile',
                  title: `${emp.first_name || ''} ${emp.last_name || ''}`,
                  desc: `Role: ${emp.role} | Location: ${emp.location_name}`,
                  action: () => {
                    setActiveTab('employees');
                    setShowGlobalSearchModal(false);
                  }
                });
              }
            });

            // 2. Search tasks
            if (query.includes('task') || query.includes('work')) {
              results.push({
                type: 'Operations Tasks',
                title: 'Task Kanban Board',
                desc: 'Manage company active todo pipelines and sprints',
                action: () => {
                  setActiveTab('tasks');
                  setShowGlobalSearchModal(false);
                }
              });
            }

            // 3. Search logs
            auditLogs.forEach(log => {
              if ((log.action || '').toLowerCase().includes(query) || (log.user || '').toLowerCase().includes(query)) {
                results.push({
                  type: 'Audit Log Entry',
                  title: log.action,
                  desc: `Triggered by ${log.user} (${log.time})`,
                  action: () => {
                    setActiveTab('audit_logs');
                    setShowGlobalSearchModal(false);
                  }
                });
              }
            });

            if (results.length === 0) {
              return <div style={{ fontSize: '12px', color: '#ef4444', textAlign: 'center', padding: '16px' }}>❌ No matches found for "{globalSearchQuery}"</div>;
            }

            return results.map((item, idx) => (
              <div key={idx} onClick={item.action} style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', cursor: 'pointer', transition: 'all 0.15s' }} className="search-result-item">
                <span style={{ fontSize: '9px', fontWeight: '800', background: 'rgba(13, 148, 136, 0.1)', color: '#0d9488', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>{item.type}</span>
                <h5 style={{ fontSize: '13px', fontWeight: '800', margin: '4px 0 2px 0', color: '#0f2b26' }}>{item.title}</h5>
                <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>{item.desc}</p>
              </div>
            ));
          })()}
        </div>
      </div>
    </div>
  );
}
