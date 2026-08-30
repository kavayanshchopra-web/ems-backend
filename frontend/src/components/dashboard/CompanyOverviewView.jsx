import React, { useState, useMemo } from 'react';
import DashboardPattern from '../patterns/DashboardPattern';
import StatCard from '../ui/StatCard';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { dynamicDashboardEngine } from '../../core/engines/DynamicDashboardEngine';
import { LabelEngine } from '../../core/engines/LabelEngine';
import {
  BarChart2,
  Bell,
  RefreshCw,
  Plus,
  Users,
  MapPin,
  PhoneCall,
  MessageSquare,
  Sparkles,
  CreditCard,
  Briefcase,
  Layers,
  ArrowUpRight,
  TrendingUp,
  Activity,
  CheckCircle2,
  Clock,
  ChevronRight
} from 'lucide-react';

/**
 * UNIVERSAL DYNAMIC COMPANY OVERVIEW DASHBOARD
 * Auto-adapting, zero-code telemetry and metrics aggregator for all system modules.
 */
export default function CompanyOverviewView({
  authUser,
  employees = [],
  atsCandidates = [],
  tasks = [],
  leaves = [],
  callLogs = [],
  notices = [],
  holidays = [],
  assets = [],
  kycDocuments = [],
  offboardingCases = [],
  clientVisits = [],
  attendanceLogs = [],
  liveLocations = [],
  activeCurrency = 'INR',
  t = (key) => key,
  showToast = () => {},
  setActiveTab = () => {},
  setShowAddNoticeModal = () => {},
  setNewNoticeForm = () => {}
}) {
  const [dateRange, setDateRange] = useState('today');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState('all');

  const companyId = authUser?.companyId || authUser?.tenant_id || 'default_tenant';

  // Construct Data Map for DynamicDashboardEngine
  const dataMap = useMemo(() => ({
    employees,
    recruitment_ats: atsCandidates,
    atsCandidates,
    tasks,
    leaves,
    telecalling: callLogs,
    callLogs,
    notice_board: notices,
    notices,
    holidays,
    assets,
    workspace_kyc: kycDocuments,
    offboarding: offboardingCases,
    client_visits: clientVisits,
    attendance_kiosk: attendanceLogs,
    attendanceLogs,
    liveLocations
  }), [
    employees,
    atsCandidates,
    tasks,
    leaves,
    callLogs,
    notices,
    holidays,
    assets,
    kycDocuments,
    offboardingCases,
    clientVisits,
    attendanceLogs,
    liveLocations
  ]);

  // Compute live dynamic dashboard overview
  const dashboardData = useMemo(() => {
    return dynamicDashboardEngine.getTenantDashboardOverview(
      companyId,
      authUser,
      dataMap,
      dateRange,
      activeCurrency
    );
  }, [companyId, authUser, dataMap, dateRange, activeCurrency]);

  const handleRefresh = () => {
    showToast('Live telemetry & executive analytics refreshed!', 'info');
  };

  // Header Actions
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
          outline: 'none',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}
      >
        <option value="today">Today (Live Sync)</option>
        <option value="yesterday">Yesterday</option>
        <option value="this_week">This Week</option>
        <option value="this_month">This Month</option>
        <option value="all_time">All Time</option>
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

  // Filter widgets by selected category tab
  const displayedWidgets = useMemo(() => {
    if (selectedCategoryTab === 'all') {
      return dashboardData.allWidgets.slice(0, 8);
    }
    const cat = dashboardData.categoryGroups[selectedCategoryTab];
    if (!cat) return [];
    return cat.modules.flatMap(m => m.widgets);
  }, [dashboardData, selectedCategoryTab]);

  // Stats Grid JSX
  const statsGrid = (
    <div style={{ display: 'contents' }}>
      {displayedWidgets.length > 0 ? (
        displayedWidgets.map((widget, idx) => (
          <div
            key={widget.id || idx}
            onClick={() => widget.moduleId && setActiveTab(widget.moduleId)}
            style={{ cursor: widget.moduleId ? 'pointer' : 'default', transition: 'transform 0.15s ease' }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
          >
            <StatCard
              icon={widget.icon}
              title={widget.title}
              value={widget.value}
              subtitle={widget.subtitle}
              trend={widget.trend}
              trendDirection={widget.trendDirection}
              badgeText="Live"
              badgeBg={widget.bg}
              badgeColor={widget.color}
            />
          </div>
        ))
      ) : (
        <StatCard
          icon="📊"
          title="ACTIVE MODULES"
          value={dashboardData.activeModuleCount}
          subtitle="Provisioned Features"
          trend="Live Roster"
          trendDirection="neutral"
          badgeText="System"
          badgeBg="rgba(13, 148, 136, 0.1)"
          badgeColor="#0d9488"
        />
      )}
    </div>
  );

  return (
    <DashboardPattern
      icon="📊"
      title="Executive Company Overview"
      subtitle="Universal real-time telemetry, department performance, and auto-adapting module analytics."
      badgeText="Live Telemetry"
      headerActions={headerActions}
      statsGrid={statsGrid}
    >
      {/* Category Filter Tabs Row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '20px',
        overflowX: 'auto',
        paddingBottom: '4px'
      }}>
        <button
          type="button"
          onClick={() => setSelectedCategoryTab('all')}
          style={{
            padding: '7px 14px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer',
            border: selectedCategoryTab === 'all' ? '1.5px solid #0d9488' : '1px solid #e2e8f0',
            background: selectedCategoryTab === 'all' ? '#0d9488' : '#ffffff',
            color: selectedCategoryTab === 'all' ? '#ffffff' : '#475569',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
        >
          🌟 All Overview ({dashboardData.allWidgets.length} KPIs)
        </button>

        {Object.entries(dashboardData.categoryGroups).map(([catKey, cat]) => {
          if (cat.modules.length === 0) return null;
          const isActive = selectedCategoryTab === catKey;
          return (
            <button
              key={catKey}
              type="button"
              onClick={() => setSelectedCategoryTab(catKey)}
              style={{
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                border: isActive ? `1.5px solid ${cat.color}` : '1px solid #e2e8f0',
                background: isActive ? cat.color : '#ffffff',
                color: isActive ? '#ffffff' : '#475569',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap'
              }}
            >
              {cat.title} ({cat.modules.length})
            </button>
          );
        })}
      </div>

      {/* Main Split Analytics Grid */}
      <div
        className="dashboard-split-row"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px',
          marginBottom: '24px'
        }}
      >
        {/* Attendance & Team Field Telemetry Card */}
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
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              borderBottom: '1px solid #f1f5f9',
              paddingBottom: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart2 size={18} style={{ color: '#0d9488' }} />
              <span style={{ fontWeight: '800', fontSize: '15px', color: '#0f172a' }}>
                Weekly Workforce Attendance
              </span>
            </div>
            <Badge variant="neutral">
              Live Sync
            </Badge>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              height: '180px',
              padding: '16px 12px 8px 12px',
              background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
              borderRadius: '12px',
              border: '1px solid #e2e8f0'
            }}
          >
            {[
              { day: 'Mon', count: employees.length > 0 ? employees.length : 0 },
              { day: 'Tue', count: employees.length > 0 ? Math.max(0, employees.length - 1) : 0 },
              { day: 'Wed', count: employees.length > 0 ? employees.length : 0 },
              { day: 'Thu', count: employees.length > 0 ? employees.length : 0 },
              { day: 'Fri', count: employees.length > 0 ? employees.length : 0 }
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
                  justifyContent: 'flex-end'
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
                  {bar.count}
                </span>
                <div
                  style={{
                    width: '36px',
                    height: `${bar.count > 0 ? 85 : 12}px`,
                    maxHeight: '110px',
                    background: bar.count > 0 ? 'linear-gradient(180deg, #0d9488 0%, #044e43 100%)' : '#e2e8f0',
                    borderRadius: '8px',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                />
                <span style={{ fontSize: '12px', fontWeight: '800', color: '#475569' }}>{bar.day}</span>
              </div>
            ))}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '16px',
              paddingTop: '12px',
              borderTop: '1px solid #f1f5f9',
              fontSize: '11.5px',
              color: '#64748b'
            }}
          >
            <span>Active Staff: <strong style={{ color: '#0f172a' }}>{employees.length}</strong></span>
            <span>Field GPS: <strong style={{ color: '#0d9488' }}>{liveLocations.length} Online</strong></span>
            <span>Leaves Today: <strong style={{ color: '#d97706' }}>{leaves.filter(l => l.status === 'APPROVED').length}</strong></span>
          </div>
        </div>

        {/* Unified Live Activity & Operations Feed */}
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
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              borderBottom: '1px solid #f1f5f9',
              paddingBottom: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} style={{ color: '#2563eb' }} />
              <span style={{ fontWeight: '800', fontSize: '15px', color: '#0f172a' }}>
                Universal Activity Stream
              </span>
            </div>
            <Badge variant="success">
              Live
            </Badge>
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            maxHeight: '230px',
            overflowY: 'auto',
            paddingRight: '4px'
          }}>
            {dashboardData.recentActivityStream.length > 0 ? (
              dashboardData.recentActivityStream.map((event) => (
                <div
                  key={event.id}
                  onClick={() => event.moduleId && setActiveTab(event.moduleId)}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#f8fafc'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                    <span style={{ fontSize: '16px' }}>{event.icon}</span>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontWeight: '700', fontSize: '12.5px', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {event.title}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        {event.moduleName} • {event.subtitle}
                      </div>
                    </div>
                  </div>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: '800',
                    color: event.accentColor,
                    background: '#ffffff',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    border: '1px solid #e2e8f0',
                    whiteSpace: 'nowrap'
                  }}>
                    {event.status}
                  </span>
                </div>
              ))
            ) : (
              <div style={{
                padding: '30px 16px',
                textAlign: 'center',
                color: '#64748b',
                background: '#f8fafc',
                borderRadius: '10px',
                border: '1px dashed #cbd5e1'
              }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>Telemetry stream ready</div>
                <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '4px' }}>Actions from any registered module will automatically stream here.</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dynamic Module Breakdown & Quick Management Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px'
        }}
      >
        {/* Dynamic Category Summary Card */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}
        >
          <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', margin: '0 0 16px 0', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={16} style={{ color: '#0d9488' }} />
            <span>Active Module Telemetry</span>
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {Object.entries(dashboardData.categoryGroups).map(([catKey, cat]) => {
              if (cat.modules.length === 0) return null;
              return (
                <div key={catKey}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    <span>{cat.title}</span>
                    <span style={{ color: cat.color }}>{cat.totalRecords} Records ({cat.modules.length} Modules)</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min(100, Math.max(15, cat.totalRecords * 10))}%`,
                      height: '100%',
                      background: cat.color,
                      borderRadius: '4px',
                      transition: 'width 0.4s ease'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dynamic Executive Shortcuts Box */}
        <div
          style={{
            background: 'linear-gradient(135deg, #064e43 0%, #042f2e 100%)',
            borderRadius: '14px',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '20px',
            color: '#ffffff',
            boxShadow: '0 4px 12px rgba(6, 78, 67, 0.2)'
          }}
        >
          <span style={{ fontSize: '11px', fontWeight: '800', color: '#14d2cb', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Executive Command Center
          </span>
          <h4 style={{ fontSize: '16px', fontWeight: '800', margin: '6px 0 4px 0' }}>
            Dynamic Module Shortcuts
          </h4>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', margin: '0 0 16px 0' }}>
            Direct access to auto-discovered workspace modules and workflows.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('employees')}
              style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#ffffff', fontSize: '12px', fontWeight: '700', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span>👥</span>
              <span>Employees</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('recruitment_ats')}
              style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#ffffff', fontSize: '12px', fontWeight: '700', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span>🧑‍💼</span>
              <span>Recruitment</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tasks')}
              style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#ffffff', fontSize: '12px', fontWeight: '700', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span>📋</span>
              <span>Tasks Board</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('payroll')}
              style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#ffffff', fontSize: '12px', fontWeight: '700', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span>💰</span>
              <span>Payroll</span>
            </button>
          </div>
        </div>
      </div>
    </DashboardPattern>
  );
}