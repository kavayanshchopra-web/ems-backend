import React, { useState } from 'react';
import ShiftEngine from '../../core/engines/ShiftEngine';

export default function ShiftsPage({
  weeklyRoster: propsWeeklyRoster,
  setWeeklyRoster: propsSetWeeklyRoster,
  shiftProfiles: propsShiftProfiles,
  setShiftProfiles: propsSetShiftProfiles,
  hrOverrideLogs: propsHrOverrideLogs,
  setHrOverrideLogs: propsSetHrOverrideLogs,
  shiftActiveSubTab: propsShiftActiveSubTab,
  setShiftActiveSubTab: propsSetShiftActiveSubTab,
  employees = [],
  authUser,
  showToast
}) {
  const [internalActiveSubTab, setInternalActiveSubTab] = useState('roster');
  const [internalProfiles, setInternalProfiles] = useState(() => ShiftEngine.getShiftProfiles());
  const [internalRoster, setInternalRoster] = useState(() => ShiftEngine.getWeeklyRoster(employees, authUser));
  const [internalLogs, setInternalLogs] = useState(() => ShiftEngine.getHROverrideLogs());

  const shiftActiveSubTab = propsShiftActiveSubTab || internalActiveSubTab;
  const setShiftActiveSubTab = propsSetShiftActiveSubTab || setInternalActiveSubTab;

  const weeklyRoster = (propsWeeklyRoster && propsWeeklyRoster.length > 0) ? propsWeeklyRoster : internalRoster;
  const setWeeklyRoster = propsSetWeeklyRoster || setInternalRoster;

  const shiftProfiles = (propsShiftProfiles && propsShiftProfiles.length > 0) ? propsShiftProfiles : internalProfiles;
  const setShiftProfiles = propsSetShiftProfiles || setInternalProfiles;

  const hrOverrideLogs = (propsHrOverrideLogs && propsHrOverrideLogs.length > 0) ? propsHrOverrideLogs : internalLogs;
  const setHrOverrideLogs = propsSetHrOverrideLogs || setInternalLogs;

  const [shiftSearchQuery, setShiftSearchQuery] = useState('');
  const [shiftDeptFilter, setShiftDeptFilter] = useState('all');

  const [showShiftProfileModal, setShowShiftProfileModal] = useState(false);
  const [editingShiftProfile, setEditingShiftProfile] = useState(null);
  const [shiftProfileForm, setShiftProfileForm] = useState({
    name: '', code: '', startTime: '09:30', endTime: '18:30', graceMins: 15, halfDayHours: 4.5, otThresholdHours: 9.0, color: '#0d9488', bg: '#e6f4f1', description: ''
  });

  const [showHROverrideModal, setShowHROverrideModal] = useState(false);
  const [hrOverrideForm, setHrOverrideForm] = useState({
    empId: '', empName: '', date: '', previousStatus: 'LATE', newStatus: 'ON_TIME', reason: '', waiveLatePenalty: true, manualOTHours: 0
  });

  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [selectedEmpIdsForBulk, setSelectedEmpIdsForBulk] = useState([]);
  const [bulkAssignShiftId, setBulkAssignShiftId] = useState('shift_general');

  const isHR = ['superadmin', 'owner', 'admin', 'hr', 'manager'].includes((authUser?.role || 'superadmin').toLowerCase());
  return (
    <div className="payroll-page glass-panel payroll-panel" style={{ padding: '20px' }}>
      <div className="page-header" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div className="page-header-left">
          <h1 className="page-header-title" style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>📅 Work Shift Roster & HR Override Engine</span>
          </h1>
          <p className="page-header-subtitle" style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
            Define rotational shifts, grace rules, 7-day rosters, and HR manual attendance overrides.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            className="btn"
            style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#334155', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
            onClick={() => {
              const csvContent = 'data:text/csv;charset=utf-8,Employee,Department,Mon,Tue,Wed,Thu,Fri,Sat,Sun\n' +
                weeklyRoster.map(r => `"${r.empName}","${r.department}","${r.schedule.mon}","${r.schedule.tue}","${r.schedule.wed}","${r.schedule.thu}","${r.schedule.fri}","${r.schedule.sat}","${r.schedule.sun}"`).join('\n');
              const encodedUri = encodeURI(csvContent);
              const link = document.createElement('a');
              link.setAttribute('href', encodedUri);
              link.setAttribute('download', `shift_roster_export_${new Date().toISOString().slice(0, 10)}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              showToast('📥 Shift Roster exported as CSV!', 'success');
            }}
          >
            📥 Export Roster CSV
          </button>

          {isHR && (
            <>
              <button
                className="btn"
                style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                onClick={() => {
                  setSelectedEmpIdsForBulk(weeklyRoster.map(r => r.empId));
                  setShowBulkAssignModal(true);
                }}
              >
                👥 Bulk Assign Shift
              </button>

              <button
                className="btn btn-primary"
                style={{ background: '#0d9488', borderColor: '#0d9488', color: '#ffffff', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                onClick={() => {
                  setEditingShiftProfile(null);
                  setShiftProfileForm({ name: '', code: '', startTime: '09:30', endTime: '18:30', graceMins: 15, halfDayHours: 4.5, otThresholdHours: 9.0, color: '#0d9488', bg: '#e6f4f1', description: '' });
                  setShowShiftProfileModal(true);
                }}
              >
                ➕ Create Shift Profile
              </button>
            </>
          )}
        </div>
      </div>

      {/* Sub Tabs Navigation */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', marginBottom: '20px', paddingBottom: '2px' }}>
        <button
          style={{
            padding: '10px 18px',
            fontSize: '13px',
            fontWeight: '700',
            border: 'none',
            background: 'transparent',
            borderBottom: shiftActiveSubTab === 'roster' ? '3px solid #0d9488' : '3px solid transparent',
            color: shiftActiveSubTab === 'roster' ? '#0d9488' : '#64748b',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onClick={() => setShiftActiveSubTab('roster')}
        >
          🗓️ 7-Day Weekly Roster Grid
        </button>
        <button
          style={{
            padding: '10px 18px',
            fontSize: '13px',
            fontWeight: '700',
            border: 'none',
            background: 'transparent',
            borderBottom: shiftActiveSubTab === 'profiles' ? '3px solid #0d9488' : '3px solid transparent',
            color: shiftActiveSubTab === 'profiles' ? '#0d9488' : '#64748b',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onClick={() => setShiftActiveSubTab('profiles')}
        >
          ⚙️ Shift Profiles & Grace Rules ({shiftProfiles.length})
        </button>
        <button
          style={{
            padding: '10px 18px',
            fontSize: '13px',
            fontWeight: '700',
            border: 'none',
            background: 'transparent',
            borderBottom: shiftActiveSubTab === 'overrides' ? '3px solid #0d9488' : '3px solid transparent',
            color: shiftActiveSubTab === 'overrides' ? '#0d9488' : '#64748b',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onClick={() => setShiftActiveSubTab('overrides')}
        >
          🛡️ HR Manual Overrides Audit ({hrOverrideLogs.length})
        </button>
      </div>

      {/* TAB 1: 7-DAY ROTATIONAL ROSTER MATRIX */}
      {shiftActiveSubTab === 'roster' && (
        <div className="payroll-table-card" style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="🔍 Search employee or role..."
                value={shiftSearchQuery}
                onChange={(e) => setShiftSearchQuery(e.target.value)}
                style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', width: '220px' }}
              />
              <select
                value={shiftDeptFilter}
                onChange={(e) => setShiftDeptFilter(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#ffffff' }}
              >
                <option value="all">All Departments</option>
                {Array.from(new Set(weeklyRoster.map(r => r.department))).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
              ⏱️ Showing {weeklyRoster.filter(r => (shiftDeptFilter === 'all' || r.department === shiftDeptFilter) && (r.empName.toLowerCase().includes(shiftSearchQuery.toLowerCase()) || r.role.toLowerCase().includes(shiftSearchQuery.toLowerCase()))).length} Employees
            </span>
          </div>

          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="std-table" style={{ width: '100%', minWidth: '950px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', textTransform: 'uppercase', fontSize: '11px', color: '#475569', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>EMPLOYEE & ROLE</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>DEPARTMENT</th>
                  {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(day => (
                    <th key={day} style={{ padding: '12px 10px', textAlign: 'center' }}>{day}</th>
                  ))}
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>HR OVERRIDE</th>
                </tr>
              </thead>
              <tbody>
                {weeklyRoster
                  .filter(r => (shiftDeptFilter === 'all' || r.department === shiftDeptFilter) && (r.empName.toLowerCase().includes(shiftSearchQuery.toLowerCase()) || r.role.toLowerCase().includes(shiftSearchQuery.toLowerCase())))
                  .map(row => (
                    <tr key={row.empId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '13px' }}>{row.empName}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{row.role}</div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: '#475569' }}>
                        <span style={{ padding: '4px 8px', background: '#f1f5f9', borderRadius: '6px', fontSize: '11px', fontWeight: '600' }}>
                          {row.department}
                        </span>
                      </td>
                      {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(dayKey => {
                        const assignedShiftId = row.schedule[dayKey];
                        const profile = shiftProfiles.find(p => p.id === assignedShiftId) || shiftProfiles[0];
                        return (
                          <td key={dayKey} style={{ padding: '8px 6px', textAlign: 'center' }}>
                            <select
                              value={assignedShiftId}
                              onChange={(e) => {
                                const updated = ShiftEngine.updateEmployeeRoster(row.empId, dayKey, e.target.value);
                                setWeeklyRoster(updated);
                                showToast(`Updated ${row.empName}'s ${dayKey.toUpperCase()} shift`, 'info');
                              }}
                              style={{
                                padding: '4px 6px',
                                borderRadius: '6px',
                                border: `1px solid ${profile.color || '#cbd5e1'}`,
                                background: profile.bg || '#ffffff',
                                color: profile.color || '#0f172a',
                                fontSize: '11px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                width: '100%',
                                maxWidth: '105px'
                              }}
                            >
                              {shiftProfiles.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          </td>
                        );
                      })}
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button
                          style={{ padding: '5px 10px', fontSize: '11px', fontWeight: '700', background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: '6px', cursor: 'pointer' }}
                          onClick={() => {
                            setHrOverrideForm({
                              empId: row.empId,
                              empName: row.empName,
                              date: new Date().toLocaleDateString('en-GB'),
                              previousStatus: 'LATE',
                              newStatus: 'ON_TIME',
                              reason: 'Client Visit / On-field duty',
                              waiveLatePenalty: true,
                              manualOTHours: 0
                            });
                            setShowHROverrideModal(true);
                          }}
                        >
                          🛡️ Manual Override
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: SHIFT PROFILES & GRACE RULES */}
      {shiftActiveSubTab === 'profiles' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {shiftProfiles.map(profile => (
            <div key={profile.id} style={{ background: '#ffffff', border: `2px solid ${profile.color}`, borderRadius: '12px', padding: '18px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ padding: '4px 10px', borderRadius: '20px', background: profile.bg, color: profile.color, fontWeight: '800', fontSize: '12px', border: `1px solid ${profile.color}` }}>
                  {profile.code || 'SHIFT'}
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    style={{ padding: '3px 8px', fontSize: '11px', border: '1px solid #cbd5e1', background: '#ffffff', borderRadius: '4px', cursor: 'pointer' }}
                    onClick={() => {
                      setEditingShiftProfile(profile);
                      setShiftProfileForm({ ...profile });
                      setShowShiftProfileModal(true);
                    }}
                  >
                    ✏️ Edit
                  </button>
                  {!profile.isDefault && (
                    <button
                      style={{ padding: '3px 8px', fontSize: '11px', border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', borderRadius: '4px', cursor: 'pointer' }}
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to delete shift profile "${profile.name}"? It will be archived in Recycle Bin.`)) {
                          const updated = ShiftEngine.deleteShiftProfile(profile.id, authUser?.email, authUser?.companyId);
                          setShiftProfiles(updated);
                          showToast(`Shift Profile "${profile.name}" moved to Trash Bin!`, 'warning');
                        }
                      }}
                    >
                      🗑️ Delete
                    </button>
                  )}
                </div>
              </div>

              <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>{profile.name}</h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 14px 0', minHeight: '32px' }}>{profile.description || 'Custom shift profile'}</p>

              <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Shift Timings:</span>
                  <strong style={{ color: '#0f172a' }}>⏰ {profile.startTime} - {profile.endTime}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Late Grace Period:</span>
                  <strong style={{ color: '#0d9488' }}>🟢 {profile.graceMins} Mins</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Half-Day Cutoff:</span>
                  <strong style={{ color: '#d97706' }}>⏱️ &lt; {profile.halfDayHours} Hours</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Overtime Threshold:</span>
                  <strong style={{ color: '#7c3aed' }}>⚡ &gt; {profile.otThresholdHours} Hours</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: HR MANUAL OVERRIDES AUDIT LOGS */}
      {shiftActiveSubTab === 'overrides' && (
        <div className="payroll-table-card" style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', fontWeight: '800', fontSize: '14px', color: '#0f172a' }}>
            🛡️ HR Attendance Status Correction & Penalty Waiver Audit Log
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="std-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', textTransform: 'uppercase', fontSize: '11px', color: '#475569' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>DATE & TIME</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>EMPLOYEE</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>STATUS CORRECTION</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>HR REASON</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>PENALTY WAIVED</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>OVERRIDDEN BY</th>
                </tr>
              </thead>
              <tbody>
                {hrOverrideLogs.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                      No HR manual overrides logged yet. All attendance records are running on auto-shift rules.
                    </td>
                  </tr>
                ) : (
                  hrOverrideLogs.map(log => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: '#64748b' }}>{log.timestamp}</td>
                      <td style={{ padding: '12px 16px', fontWeight: '700', fontSize: '13px', color: '#0f172a' }}>{log.empName}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{ padding: '3px 6px', background: '#fee2e2', color: '#991b1b', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>{log.previousStatus}</span>
                        <span style={{ margin: '0 6px', color: '#94a3b8' }}>➔</span>
                        <span style={{ padding: '3px 6px', background: '#dcfce7', color: '#166534', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>{log.newStatus}</span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: '#334155' }}>{log.reason}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        {log.waiveLatePenalty ? (
                          <span style={{ padding: '4px 8px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '12px', fontSize: '11px', fontWeight: '700' }}>✅ Waived</span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '12px' }}>No</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '700', fontSize: '12px', color: '#0369a1' }}>{log.actorName}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD / EDIT SHIFT PROFILE */}
      {showShiftProfileModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '520px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 16px 0' }}>
              {editingShiftProfile ? '✏️ Edit Shift Profile' : '➕ Create New Shift Profile'}
            </h3>

            <form onSubmit={(e) => {
              e.preventDefault();
              const updated = ShiftEngine.saveShiftProfile({ ...shiftProfileForm, id: editingShiftProfile?.id });
              setShiftProfiles(updated);
              setShowShiftProfileModal(false);
              showToast(editingShiftProfile ? 'Shift profile updated!' : 'New Shift profile created!', 'success');
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Shift Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. General Day Shift"
                    value={shiftProfileForm.name}
                    onChange={(e) => setShiftProfileForm({ ...shiftProfileForm, name: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Shift Code</label>
                  <input
                    type="text"
                    required
                    placeholder="DAY-OPS"
                    value={shiftProfileForm.code}
                    onChange={(e) => setShiftProfileForm({ ...shiftProfileForm, code: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Start Time</label>
                  <input
                    type="time"
                    required
                    value={shiftProfileForm.startTime}
                    onChange={(e) => setShiftProfileForm({ ...shiftProfileForm, startTime: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>End Time</label>
                  <input
                    type="time"
                    required
                    value={shiftProfileForm.endTime}
                    onChange={(e) => setShiftProfileForm({ ...shiftProfileForm, endTime: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Grace Mins</label>
                  <input
                    type="number"
                    value={shiftProfileForm.graceMins}
                    onChange={(e) => setShiftProfileForm({ ...shiftProfileForm, graceMins: parseInt(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Half-Day Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    value={shiftProfileForm.halfDayHours}
                    onChange={(e) => setShiftProfileForm({ ...shiftProfileForm, halfDayHours: parseFloat(e.target.value) || 4 })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>OT Trigger Hrs</label>
                  <input
                    type="number"
                    step="0.5"
                    value={shiftProfileForm.otThresholdHours}
                    onChange={(e) => setShiftProfileForm({ ...shiftProfileForm, otThresholdHours: parseFloat(e.target.value) || 8.5 })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Description / Notes</label>
                <textarea
                  rows="2"
                  value={shiftProfileForm.description}
                  onChange={(e) => setShiftProfileForm({ ...shiftProfileForm, description: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                  onClick={() => setShowShiftProfileModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#0d9488', color: '#ffffff', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}
                >
                  Save Shift Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: HR MANUAL OVERRIDE */}
      {showHROverrideModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '480px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>
              🛡️ HR Manual Attendance Override
            </h3>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 16px 0' }}>
              Overriding status for <strong>{hrOverrideForm.empName}</strong>
            </p>

            <form onSubmit={(e) => {
              e.preventDefault();
              const logged = ShiftEngine.logHROverride({
                ...hrOverrideForm,
                actorName: authUser?.name || authUser?.email || 'HR Admin'
              });
              setHrOverrideLogs(prev => [logged, ...prev]);
              setShowHROverrideModal(false);
              showToast(`HR Override logged for ${hrOverrideForm.empName}!`, 'success');
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Original Status</label>
                  <input
                    type="text"
                    readOnly
                    value={hrOverrideForm.previousStatus}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#991b1b', fontWeight: '700', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Corrected Status</label>
                  <select
                    value={hrOverrideForm.newStatus}
                    onChange={(e) => setHrOverrideForm({ ...hrOverrideForm, newStatus: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #0d9488', background: '#f0fdf4', color: '#166534', fontWeight: '700', fontSize: '13px' }}
                  >
                    <option value="ON_TIME">🟢 ON TIME</option>
                    <option value="EXCUSED_LATE">🟡 EXCUSED LATE</option>
                    <option value="ON_FIELD_DUTY">🌐 ON FIELD DUTY</option>
                    <option value="PRESENT">✅ PRESENT (FULL DAY)</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>HR Justification / Reason</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Client visit, traffic delay approved by HR"
                  value={hrOverrideForm.reason}
                  onChange={(e) => setHrOverrideForm({ ...hrOverrideForm, reason: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
                <input
                  type="checkbox"
                  id="waivePenaltyCheck"
                  checked={hrOverrideForm.waiveLatePenalty}
                  onChange={(e) => setHrOverrideForm({ ...hrOverrideForm, waiveLatePenalty: e.target.checked })}
                />
                <label htmlFor="waivePenaltyCheck" style={{ fontSize: '13px', fontWeight: '600', color: '#334155', cursor: 'pointer' }}>
                  Waive off Late Mark salary deduction penalty for this day
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                  onClick={() => setShowHROverrideModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#0369a1', color: '#ffffff', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}
                >
                  Apply HR Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: BULK ASSIGN SHIFT */}
      {showBulkAssignModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '440px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 12px 0' }}>
              👥 Bulk Assign Shift Roster
            </h3>

            <form onSubmit={(e) => {
              e.preventDefault();
              const updated = ShiftEngine.bulkAssignShift(selectedEmpIdsForBulk, bulkAssignShiftId);
              setWeeklyRoster(updated);
              setShowBulkAssignModal(false);
              showToast(`Assigned shift to ${selectedEmpIdsForBulk.length} employees!`, 'success');
            }}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>Target Shift Profile</label>
                <select
                  value={bulkAssignShiftId}
                  onChange={(e) => setBulkAssignShiftId(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                >
                  {shiftProfiles.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.startTime} - {p.endTime})</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Selected Employees ({selectedEmpIdsForBulk.length})
                </label>
                <div style={{ maxHeight: '140px', overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px' }}>
                  {weeklyRoster.map(emp => (
                    <label key={emp.empId} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <input
                        type="checkbox"
                        checked={selectedEmpIdsForBulk.includes(emp.empId)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedEmpIdsForBulk(prev => [...prev, emp.empId]);
                          } else {
                            setSelectedEmpIdsForBulk(prev => prev.filter(id => id !== emp.empId));
                          }
                        }}
                      />
                      <span>{emp.empName} ({emp.department})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                  onClick={() => setShowBulkAssignModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#15803d', color: '#ffffff', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}
                >
                  Apply Bulk Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
