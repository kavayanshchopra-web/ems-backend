import React, { useState } from 'react';
import DashboardPattern from '../patterns/DashboardPattern';
import StatCard from '../ui/StatCard';
import Badge from '../ui/Badge';
import SearchInput from '../ui/SearchInput';
import EmptyState from '../ui/EmptyState';

const getValString = (val, fallback = '') => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string' || typeof val === 'number') return String(val);
  if (typeof val === 'object') {
    if (typeof val.name === 'string') return val.name;
    if (typeof val.title === 'string') return val.title;
    if (typeof val.label === 'string') return val.label;
  }
  return fallback;
};

/**
 * Phase 2A — Task Analytics & Workload Pipeline View (Manager Dashboard)
 * Preserves exact original Manager Task Analytics functionality & table sorting
 */
export default function TaskAnalyticsView({
  employees = [],
  tasks = [],
  t = (key) => key
}) {
  const [workloadSortKey, setWorkloadSortKey] = useState('first_name');
  const [workloadSortDir, setWorkloadSortDir] = useState('asc');
  const [searchFilter, setSearchFilter] = useState('');

  const handleSortWorkload = (key) => {
    if (workloadSortKey === key) {
      setWorkloadSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setWorkloadSortKey(key);
      setWorkloadSortDir('asc');
    }
  };

  const overloadedCount = employees.filter(e => tasks.filter(t => t.assigned_to === e.id).length > 3).length;
  const optimalCount = employees.length - overloadedCount;

  const statsGrid = (
    <>
      <StatCard
        icon="📋"
        title="TOTAL ACTIVE TASKS"
        value={tasks.length}
        subtitle="Current Active Pipeline"
        trend="Active"
        trendDirection="neutral"
        badgeText="Pipeline"
        badgeBg="rgba(59, 130, 246, 0.1)"
        badgeColor="#2563eb"
      />
      <StatCard
        icon="👥"
        title="TEAM MEMBERS"
        value={employees.length}
        subtitle="Assigned Staff"
        trend="Roster"
        trendDirection="neutral"
        badgeText="Staff"
        badgeBg="rgba(13, 148, 136, 0.1)"
        badgeColor="#0d9488"
      />
      <StatCard
        icon="⚠️"
        title="OVERLOADED STAFF"
        value={overloadedCount}
        subtitle="> 3 Active Tasks"
        trend={overloadedCount > 0 ? "Action Required" : "Balanced"}
        trendDirection={overloadedCount > 0 ? "down" : "up"}
        badgeText="Overload Alert"
        badgeBg="rgba(239, 68, 68, 0.1)"
        badgeColor="#ef4444"
      />
      <StatCard
        icon="✅"
        title="OPTIMAL CAPACITY"
        value={optimalCount}
        subtitle="Staff At Normal Load"
        trend="Healthy"
        trendDirection="up"
        badgeText="Optimal"
        badgeBg="rgba(16, 185, 129, 0.1)"
        badgeColor="#059669"
      />
    </>
  );

  return (
    <DashboardPattern
      icon="📊"
      title="Task Analytics & Workload Pipeline"
      subtitle="Monitor assignments pipeline, staff workload distribution, and timelines tracker."
      badgeText="Manager Workload"
      statsGrid={statsGrid}
    >
      {/* Staff Workload Analytics Table */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justify: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
              📊 {t('workloadTable') || 'Employee Workload & Capacity Table'}
            </h3>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              💡 Click column headers to sort staff by name, role, task load, or timeline status
            </span>
          </div>
          <SearchInput
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            onClear={() => setSearchFilter('')}
            placeholder="🔍 Search employee or role..."
            width="240px"
          />
        </div>

        <div className="mobile-swipe-hint" style={{ display: 'none', fontSize: '11px', color: '#0d9488', fontWeight: '700', padding: '4px 12px', textAlign: 'right' }}>
          Swipe table horizontally ↔
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="std-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th
                  onClick={() => handleSortWorkload('first_name')}
                  style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }}
                >
                  {t('employee') || 'Employee'} <span style={{ color: workloadSortKey === 'first_name' ? '#0d9488' : '#94a3b8' }}>{workloadSortKey === 'first_name' ? (workloadSortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
                </th>
                <th
                  onClick={() => handleSortWorkload('role')}
                  style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }}
                >
                  {t('role') || 'Role'} <span style={{ color: workloadSortKey === 'role' ? '#0d9488' : '#94a3b8' }}>{workloadSortKey === 'role' ? (workloadSortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
                </th>
                <th
                  onClick={() => handleSortWorkload('assigned_tasks')}
                  style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }}
                >
                  {t('assignedTasks') || 'Assigned Tasks'} <span style={{ color: workloadSortKey === 'assigned_tasks' ? '#0d9488' : '#94a3b8' }}>{workloadSortKey === 'assigned_tasks' ? (workloadSortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
                </th>
                <th
                  onClick={() => handleSortWorkload('status')}
                  style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }}
                >
                  {t('timelineStatus') || 'Timeline Status'} <span style={{ color: workloadSortKey === 'status' ? '#0d9488' : '#94a3b8' }}>{workloadSortKey === 'status' ? (workloadSortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const filtered = employees.filter(emp => {
                  const firstName = getValString(emp.first_name);
                  const lastName = getValString(emp.last_name);
                  const role = getValString(emp.role);
                  const fullName = `${firstName} ${lastName}`.toLowerCase();
                  return fullName.includes(searchFilter.toLowerCase()) || role.toLowerCase().includes(searchFilter.toLowerCase());
                });

                if (filtered.length === 0) {
                  return (
                    <tr>
                      <td colSpan="4" style={{ padding: '32px', textAlign: 'center' }}>
                        <EmptyState
                          title="No employee workload records found"
                          description="No staff members match your search filter."
                        />
                      </td>
                    </tr>
                  );
                }

                const sorted = [...filtered].sort((a, b) => {
                  if (workloadSortKey === 'first_name') {
                    const nameA = `${getValString(a.first_name)} ${getValString(a.last_name)}`.toLowerCase();
                    const nameB = `${getValString(b.first_name)} ${getValString(b.last_name)}`.toLowerCase();
                    return workloadSortDir === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
                  }
                  if (workloadSortKey === 'role') {
                    const roleA = getValString(a.role).toLowerCase();
                    const roleB = getValString(b.role).toLowerCase();
                    return workloadSortDir === 'asc' ? roleA.localeCompare(roleB) : roleB.localeCompare(roleA);
                  }
                  if (workloadSortKey === 'assigned_tasks') {
                    const countA = tasks.filter(t => t.assigned_to === a.id).length;
                    const countB = tasks.filter(t => t.assigned_to === b.id).length;
                    return workloadSortDir === 'asc' ? countA - countB : countB - countA;
                  }
                  if (workloadSortKey === 'status') {
                    const countA = tasks.filter(t => t.assigned_to === a.id).length;
                    const countB = tasks.filter(t => t.assigned_to === b.id).length;
                    const statusA = countA > 3 ? 1 : 0;
                    const statusB = countB > 3 ? 1 : 0;
                    return workloadSortDir === 'asc' ? statusA - statusB : statusB - statusA;
                  }
                  return 0;
                });

                return sorted.map((emp) => {
                  const firstName = getValString(emp.first_name, 'Staff');
                  const lastName = getValString(emp.last_name);
                  const roleStr = getValString(emp.role, 'Staff Member');
                  const taskCount = tasks.filter(t => t.assigned_to === emp.id).length;
                  const isOverloaded = taskCount > 3;

                  return (
                    <tr key={emp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #0d9488, #064e43)', color: 'white', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>
                            {(firstName[0] || 'E')}{(lastName[0] || '')}
                          </div>
                          <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '13px' }}>
                            {firstName} {lastName}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', textTransform: 'capitalize', color: '#475569', fontSize: '12px', fontWeight: '600' }}>
                        {roleStr}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px' }}>
                        <strong style={{ color: '#0f172a' }}>{taskCount}</strong> Tasks
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <Badge variant={isOverloaded ? 'danger' : 'success'}>
                          {isOverloaded ? 'Overloaded' : (t('optimal') || 'Optimal Capacity')}
                        </Badge>
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardPattern>
  );
}
