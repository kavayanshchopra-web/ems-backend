import React, { useState } from 'react';
import DashboardPattern from '../patterns/DashboardPattern';
import StatCard from '../ui/StatCard';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import SearchInput from '../ui/SearchInput';
import Select from '../ui/Select';
import Toolbar from '../ui/Toolbar';
import EmptyState from '../ui/EmptyState';
import {
  Users,
  Globe,
  PhoneCall,
  MessageSquare,
  BarChart2,
  Bell,
  RefreshCw,
  Plus,
  ChevronRight
} from 'lucide-react';

/**
 * Phase 2A — Main Dashboard View Component
 * Migrated to Global Design System v2.0
 * Preserves exact Emerald Teal palette (#0d9488 -> #064e43) and 100% business logic.
 */
export default function AdminDashboardView({
  authUser,
  employees = [],
  liveLocations = [],
  callLogs = [],
  notices = [],
  tasks = [],
  t = (key) => key,
  showToast = () => {},
  setActiveTab = () => {},
  setShowAddNoticeModal = () => {},
  setNewNoticeForm = () => {}
}) {
  const [dateRange, setDateRange] = useState('today');
  const [workloadSortKey, setWorkloadSortKey] = useState('first_name');
  const [workloadSortDir, setWorkloadSortDir] = useState('asc');
  const [searchFilter, setSearchFilter] = useState('');

  const handleRefresh = () => {
    showToast('🔄 Refreshing live dashboard analytics...', 'info');
  };

  const handleSortWorkload = (key) => {
    if (workloadSortKey === key) {
      setWorkloadSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setWorkloadSortKey(key);
      setWorkloadSortDir('asc');
    }
  };

  // Header Actions Toolbar
  const headerActions = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
      <select
        value={dateRange}
        onChange={(e) => setDateRange(e.target.value)}
        style={{
          padding: '8px 12px',
          fontSize: '12px',
          fontWeight: '700',
          borderRadius: '8px',
          border: '1px solid #cbd5e1',
          background: '#ffffff',
          color: '#0f172a',
          cursor: 'pointer',
          outline: 'none'
        }}
      >
        <option value="today">📅 Today (Live Sync)</option>
        <option value="yesterday">📅 Yesterday</option>
        <option value="this_week">📅 This Week</option>
        <option value="this_month">📅 This Month</option>
      </select>

      <Button
        variant="secondary"
        size="sm"
        icon={<RefreshCw size={14} />}
        onClick={handleRefresh}
      >
        Refresh
      </Button>
    </div>
  );

  // 4 KPI Stat Cards
  const statsGrid = (
    <>
      <StatCard
        icon="👥"
        title="TOTAL EMPLOYEES"
        value={employees.length || 24}
        subtitle="🟢 21 Present Today"
        trend="4.2%"
        trendDirection="up"
        badgeText="Active Roster"
        badgeBg="rgba(16, 185, 129, 0.1)"
        badgeColor="#059669"
      />
      <StatCard
        icon="🌐"
        title="ACTIVE IN FIELD"
        value={liveLocations.length || 21}
        subtitle="📍 Live GPS Tracking"
        trend="8.0%"
        trendDirection="up"
        badgeText="Realtime GPS"
        badgeBg="rgba(13, 148, 136, 0.1)"
        badgeColor="#0d9488"
      />
      <StatCard
        icon="📞"
        title="TODAY'S SIM CALLS"
        value={callLogs.length || 48}
        subtitle="🎧 100% Cloud Synced"
        trend="12%"
        trendDirection="up"
        badgeText="Cloud Audio"
        badgeBg="rgba(59, 130, 246, 0.1)"
        badgeColor="#2563eb"
      />
      <StatCard
        icon="💬"
        title="INBOX CHATS"
        value="14 Active"
        subtitle="💬 WhatsApp CRM"
        trend="Normal"
        trendDirection="neutral"
        badgeText="Multi-Agent"
        badgeBg="rgba(245, 158, 11, 0.1)"
        badgeColor="#d97706"
      />
    </>
  );

  return (
    <DashboardPattern
      icon="📊"
      title="Company Executive Dashboard"
      subtitle="Overview of organization performance, field attendance, and team communications."
      badgeText="Live Operations"
      headerActions={headerActions}
      statsGrid={statsGrid}
    >
      {/* SECTION 1: Attendance Analytics & Workspace Notices */}
      <div
        className="dashboard-split-row"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px',
          marginBottom: '24px'
        }}
      >
        {/* Weekly Attendance Statistics Card */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div
            style={{
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              borderBottom: '1px solid #f1f5f9',
              paddingBottom: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart2 size={18} style={{ color: '#0d9488' }} />
              <span style={{ fontWeight: '800', fontSize: '15px', color: '#0f172a' }}>
                Weekly Attendance Analytics
              </span>
            </div>
            <Badge variant="success" icon="📈">
              94.8% Weekly Avg
            </Badge>
          </div>

          {/* Bar Chart Pillars */}
          <div
            style={{
              display: 'flex',
              justify: 'space-between',
              alignItems: 'flex-end',
              height: '180px',
              padding: '16px 12px 8px 12px',
              background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
              borderRadius: '12px',
              border: '1px solid #e2e8f0'
            }}
          >
            {[
              { day: 'Mon', pct: 92, count: '22/24', color: 'linear-gradient(180deg, #0d9488 0%, #044e43 100%)' },
              { day: 'Tue', pct: 96, count: '23/24', color: 'linear-gradient(180deg, #10b981 0%, #059669 100%)' },
              { day: 'Wed', pct: 95, count: '23/24', color: 'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)' },
              { day: 'Thu', pct: 88, count: '21/24', color: 'linear-gradient(180deg, #8b5cf6 0%, #6d28d9 100%)' },
              { day: 'Fri', pct: 94, count: '22/24', color: 'linear-gradient(180deg, #f59e0b 0%, #d97706 100%)' }
            ].map((bar) => (
              <div
                key={bar.day}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  flex: 1,
                  height: '100%',
                  justify: 'flex-end'
                }}
              >
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: '800',
                    color: '#0f172a',
                    background: '#ffffff',
                    padding: '2px 6px',
                    borderRadius: '6px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                    border: '1px solid #e2e8f0'
                  }}
                >
                  {bar.pct}%
                </span>
                <div
                  style={{
                    width: '36px',
                    height: `${Math.max(20, bar.pct * 1.1)}px`,
                    maxHeight: '110px',
                    background: '#e2e8f0',
                    borderRadius: '8px',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'flex-end'
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      background: bar.color,
                      borderRadius: '8px',
                      transition: 'height 0.4s ease'
                    }}
                  />
                </div>
                <span style={{ fontSize: '12px', fontWeight: '800', color: '#475569' }}>{bar.day}</span>
              </div>
            ))}
          </div>

          <div
            style={{
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center',
              marginTop: '16px',
              paddingTop: '12px',
              borderTop: '1px solid #f1f5f9',
              fontSize: '11px',
              color: '#64748b'
            }}
          >
            <span>🟢 Present Today: <strong style={{ color: '#0f172a' }}>21 Staff</strong></span>
            <span>⏳ Late: <strong style={{ color: '#d97706' }}>2</strong></span>
            <span>🏖️ On Leave: <strong style={{ color: '#ef4444' }}>1</strong></span>
          </div>
        </div>

        {/* Workspace Notices Card */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div
            style={{
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              borderBottom: '1px solid #f1f5f9',
              paddingBottom: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={18} style={{ color: '#f59e0b' }} />
              <span style={{ fontWeight: '800', fontSize: '15px', color: '#0f172a' }}>
                Workspace Announcements
              </span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => {
                setNewNoticeForm({ title: '', content: '' });
                setShowAddNoticeModal(true);
              }}
            >
              Notice
            </Button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flexGrow: 1 }}>
            {notices.length > 0 ? (
              notices.slice(0, 3).map((n) => (
                <div
                  key={n.id}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a', display: 'flex', justifyContent: 'space-between' }}>
                    <span>📢 {n.title}</span>
                    <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '600' }}>
                      {new Date(n.created_at || Date.now()).toLocaleDateString()}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#475569', lineHeight: '1.4' }}>{n.content}</div>
                </div>
              ))
            ) : (
              <>
                <div style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #e6fffa 100%)', border: '1px solid #99f6e4', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f766e' }}>
                    📢 All-Hands Q3 Review & Strategy Meeting
                  </div>
                  <div style={{ fontSize: '11px', color: '#115e59', marginTop: '4px' }}>
                    Friday at 4:00 PM in Conference Room A & Google Meet.
                  </div>
                </div>
                <div style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #e0f2fe 100%)', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ fontWeight: '800', fontSize: '13px', color: '#1e40af' }}>
                    🚀 SIM Call Recording & Live GPS Sync Active
                  </div>
                  <div style={{ fontSize: '11px', color: '#1e3a8a', marginTop: '4px' }}>
                    Automated call log sync and mileage calculation active for field staff.
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2: Department Workload & Executive Shortcuts */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px',
          marginBottom: '24px'
        }}
      >
        {/* Department Productivity Progress */}
        <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🏢 Department Productivity Progress
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { dept: 'Sales & Telecalling', pct: 92, color: '#10b981' },
              { dept: 'Field Operations & GPS', pct: 88, color: '#3b82f6' },
              { dept: 'Customer Support & CRM', pct: 95, color: '#0d9488' },
              { dept: 'Finance & Payroll', pct: 100, color: '#8b5cf6' }
            ].map((d) => (
              <div key={d.dept}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  <span>{d.dept}</span>
                  <span style={{ color: d.color, fontWeight: '900' }}>{d.pct}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${d.pct}%`, height: '100%', background: d.color, borderRadius: '4px', transition: 'width 0.3s' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Operational Shortcuts */}
        <div
          style={{
            background: 'linear-gradient(135deg, #044e43 0%, #065f54 100%)',
            borderRadius: '14px',
            padding: '20px',
            color: '#ffffff',
            boxShadow: '0 8px 20px rgba(4, 78, 69, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            justify: 'space-between'
          }}
        >
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#99f6e4', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '4px' }}>
              EXECUTIVE SHORTCUTS
            </div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#ffffff' }}>
              Quick Management Actions
            </h3>
            <p style={{ fontSize: '12px', color: '#ccfbf1', marginTop: '4px', lineHeight: '1.4' }}>
              Instantly jump to critical modules or dispatch updates to field staff.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '16px' }}>
            <button
              onClick={() => setActiveTab('employees')}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: '8px',
                padding: '10px',
                color: 'white',
                fontSize: '12px',
                fontWeight: '800',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              👥 + Add Employee
            </button>
            <button
              onClick={() => setActiveTab('telecalling')}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: '8px',
                padding: '10px',
                color: 'white',
                fontSize: '12px',
                fontWeight: '800',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              📞 Call Logs
            </button>
            <button
              onClick={() => setActiveTab('gps_attendance')}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: '8px',
                padding: '10px',
                color: 'white',
                fontSize: '12px',
                fontWeight: '800',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              🗺️ Live GPS Map
            </button>
            <button
              onClick={() => setActiveTab('payroll')}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: '8px',
                padding: '10px',
                color: 'white',
                fontSize: '12px',
                fontWeight: '800',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              💳 Run Payroll
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 3: Staff Workload Analytics & Sorting Table */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          overflow: 'hidden'
        }}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
              📊 Staff Workload & Task Tracker
            </h3>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              Click column headers to sort ascending or descending
            </span>
          </div>
          <SearchInput
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            onClear={() => setSearchFilter('')}
            placeholder="🔍 Search employee..."
            width="220px"
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
                  Employee Name <span style={{ color: workloadSortKey === 'first_name' ? '#0d9488' : '#94a3b8' }}>{workloadSortKey === 'first_name' ? (workloadSortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
                </th>
                <th
                  onClick={() => handleSortWorkload('role')}
                  style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }}
                >
                  Role / Designation <span style={{ color: workloadSortKey === 'role' ? '#0d9488' : '#94a3b8' }}>{workloadSortKey === 'role' ? (workloadSortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
                </th>
                <th
                  onClick={() => handleSortWorkload('assigned_tasks')}
                  style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }}
                >
                  Assigned Tasks <span style={{ color: workloadSortKey === 'assigned_tasks' ? '#0d9488' : '#94a3b8' }}>{workloadSortKey === 'assigned_tasks' ? (workloadSortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
                </th>
                <th
                  onClick={() => handleSortWorkload('status')}
                  style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }}
                >
                  Workload Status <span style={{ color: workloadSortKey === 'status' ? '#0d9488' : '#94a3b8' }}>{workloadSortKey === 'status' ? (workloadSortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const filtered = employees.filter(emp => {
                  const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase();
                  return fullName.includes(searchFilter.toLowerCase()) || (emp.role || '').toLowerCase().includes(searchFilter.toLowerCase());
                });

                if (filtered.length === 0) {
                  return (
                    <tr>
                      <td colSpan="4" style={{ padding: '32px', textAlign: 'center' }}>
                        <EmptyState
                          title="No employee records found"
                          description="No team members match your search criteria."
                        />
                      </td>
                    </tr>
                  );
                }

                const sorted = [...filtered].sort((a, b) => {
                  if (workloadSortKey === 'first_name') {
                    const nameA = `${a.first_name} ${a.last_name || ''}`.toLowerCase();
                    const nameB = `${b.first_name} ${b.last_name || ''}`.toLowerCase();
                    return workloadSortDir === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
                  }
                  if (workloadSortKey === 'role') {
                    const roleA = (a.role || '').toLowerCase();
                    const roleB = (b.role || '').toLowerCase();
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
                    return workloadSortDir === 'asc' ? countA - countB : countB - countA;
                  }
                  return 0;
                });

                return sorted.map((emp) => {
                  const taskCount = tasks.filter(t => t.assigned_to === emp.id).length;
                  const isOverloaded = taskCount > 3;

                  return (
                    <tr key={emp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #0d9488, #064e43)', color: 'white', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>
                            {(emp.first_name || '')[0]}{(emp.last_name || '')[0] || ''}
                          </div>
                          <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '13px' }}>
                            {emp.first_name} {emp.last_name || ''}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', textTransform: 'capitalize', color: '#475569', fontSize: '12px', fontWeight: '600' }}>
                        {emp.role || 'Staff Member'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px' }}>
                        <strong style={{ color: '#0f172a' }}>{taskCount}</strong> Tasks
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <Badge variant={isOverloaded ? 'danger' : 'success'}>
                          {isOverloaded ? 'Overloaded' : 'Optimal Capacity'}
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
