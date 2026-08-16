import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  User,
  Filter,
  Search,
  ArrowRight,
  ShieldCheck,
  Building,
  Check,
  X
} from 'lucide-react';

export default function LeavesPage({
  leaves = [],
  authUser,
  setNewLeaveForm,
  setShowAddLeaveModal,
  handleApproveLeave,
  showToast,
  setActiveTab
}) {
  const isHR = ['superadmin', 'owner', 'admin', 'hr', 'manager'].includes((authUser?.role || 'superadmin').toLowerCase());

  const [localLeaves, setLocalLeaves] = useState(() => {
    try {
      const saved = localStorage.getItem('omniflow_leave_applications_v2');
      if (saved) return JSON.parse(saved).filter(l => !l.id?.startsWith('lv_10'));
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateScope, setDateScope] = useState('all'); // 'all' | 'today' | 'monthly' | 'yearly' | 'custom'
  const [selectedMonth, setSelectedMonth] = useState('2026-08');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [startDateRange, setStartDateRange] = useState('');
  const [endDateRange, setEndDateRange] = useState('');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [quotaTargetKey, setQuotaTargetKey] = useState('');
  const [quotaForm, setQuotaForm] = useState({ cl: 12, sl: 10, el: 15 });
  const [applyForm, setApplyForm] = useState({
    type: 'Casual Leave',
    startDate: '',
    endDate: '',
    reason: ''
  });

  const [customQuotasMap, setCustomQuotasMap] = useState(() => {
    try {
      const saved = localStorage.getItem('omniflow_custom_staff_leave_quotas');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {};
  });

  useEffect(() => {
    const cleanLogs = localLeaves.filter(l => !l.id?.startsWith('lv_10'));
    localStorage.setItem('omniflow_leave_applications_v2', JSON.stringify(cleanLogs));
    // Sync approved leaves to localStorage for Attendance Page sync!
    const approved = cleanLogs.filter(l => l.status === 'Approved');
    localStorage.setItem('omniflow_approved_leaves_dates', JSON.stringify(approved));
  }, [localLeaves]);

  const handleUpdateStatus = (id, newStatus) => {
    const updated = localLeaves.map(l => l.id === id ? { ...l, status: newStatus } : l);
    setLocalLeaves(updated);
    showToast?.(`Leave application ${newStatus === 'Approved' ? 'APPROVED ✅' : 'REJECTED ❌'}`, newStatus === 'Approved' ? 'success' : 'error');
  };

  const handleCreateLeaveSubmit = (e) => {
    e.preventDefault();
    if (!applyForm.startDate || !applyForm.endDate || !applyForm.reason.trim()) {
      showToast?.('Please fill out all required fields!', 'error');
      return;
    }

    const start = new Date(applyForm.startDate);
    const end = new Date(applyForm.endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const newApp = {
      id: `lv_${Date.now()}`,
      user_id: authUser?.id || 'emp_001',
      first_name: authUser?.name?.split(' ')[0] || 'Employee',
      last_name: authUser?.name?.split(' ')[1] || '',
      email: authUser?.email || 'employee@company.com',
      avatar: authUser?.avatar || '',
      type: applyForm.type,
      start_date: applyForm.startDate,
      end_date: applyForm.endDate,
      days_count: diffDays,
      reason: applyForm.reason,
      status: 'Pending',
      applied_at: new Date().toISOString()
    };

    setLocalLeaves([newApp, ...localLeaves]);
    setShowApplyModal(false);
    setApplyForm({ type: 'Casual Leave', startDate: '', endDate: '', reason: '' });
    showToast?.('✅ Leave Application submitted for HR Approval!', 'success');
  };

  const dateScopedLeaves = localLeaves.filter(l => {
    const lStartDate = l.start_date ? l.start_date.substring(0, 10) : '';
    const lEndDate = l.end_date ? l.end_date.substring(0, 10) : lStartDate;

    if (dateScope === 'today') {
      const todayStr = new Date().toISOString().substring(0, 10);
      return lStartDate <= todayStr && lEndDate >= todayStr;
    } else if (dateScope === 'monthly') {
      return (lStartDate && lStartDate.substring(0, 7) === selectedMonth) || (lEndDate && lEndDate.substring(0, 7) === selectedMonth);
    } else if (dateScope === 'yearly') {
      return (lStartDate && lStartDate.substring(0, 4) === selectedYear) || (lEndDate && lEndDate.substring(0, 4) === selectedYear);
    } else if (dateScope === 'custom') {
      if (startDateRange && lEndDate < startDateRange) return false;
      if (endDateRange && lStartDate > endDateRange) return false;
      return true;
    }
    return true;
  });

  const filteredLeaves = dateScopedLeaves.filter(l => {
    const matchesSearch = `${l.first_name || ''} ${l.last_name || ''} ${l.reason || ''} ${l.type || ''}`.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || l.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesType = typeFilter === 'all' || l.type.toLowerCase() === typeFilter.toLowerCase();
    return matchesSearch && matchesStatus && matchesType;
  });

  const pendingCount = dateScopedLeaves.filter(l => l.status === 'Pending').length;
  const approvedCount = dateScopedLeaves.filter(l => l.status === 'Approved').length;

  const userApprovedLeaves = localLeaves.filter(l => l.status === 'Approved' && (
    !authUser?.email || (l.email && l.email.toLowerCase() === authUser.email.toLowerCase()) || l.user_id === authUser?.id
  ));

  const currentKey = (authUser?.email || authUser?.id || 'default_user').toLowerCase().trim();
  const userCustomQuota = customQuotasMap[currentKey] || {};

  const assignedCL = userCustomQuota.cl !== undefined ? parseInt(userCustomQuota.cl) : 12;
  const assignedSL = userCustomQuota.sl !== undefined ? parseInt(userCustomQuota.sl) : 10;
  const assignedEL = userCustomQuota.el !== undefined ? parseInt(userCustomQuota.el) : 15;

  const usedCL = userApprovedLeaves.filter(l => (l.type || '').toLowerCase().includes('casual')).reduce((sum, l) => sum + (l.days_count || 1), 0);
  const usedSL = userApprovedLeaves.filter(l => (l.type || '').toLowerCase().includes('sick')).reduce((sum, l) => sum + (l.days_count || 1), 0);
  const usedEL = userApprovedLeaves.filter(l => (l.type || '').toLowerCase().includes('earned')).reduce((sum, l) => sum + (l.days_count || 1), 0);

  const clRem = Math.max(0, assignedCL - usedCL);
  const slRem = Math.max(0, assignedSL - usedSL);
  const elRem = Math.max(0, assignedEL - usedEL);

  const handleSaveCustomQuotaSubmit = (e) => {
    e.preventDefault();
    const key = (quotaTargetKey || authUser?.email || authUser?.id || '').toLowerCase().trim();
    if (!key) {
      showToast?.('Please enter an employee email or ID!', 'error');
      return;
    }
    const updated = {
      ...customQuotasMap,
      [key]: {
        cl: parseInt(quotaForm.cl) || 12,
        sl: parseInt(quotaForm.sl) || 10,
        el: parseInt(quotaForm.el) || 15
      }
    };
    setCustomQuotasMap(updated);
    try {
      localStorage.setItem('omniflow_custom_staff_leave_quotas', JSON.stringify(updated));
    } catch (err) {}
    setShowQuotaModal(false);
    showToast?.(`✅ Custom Leave Quotas assigned to "${key}"!`, 'success');
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1400px', margin: '0 auto', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      
      {/* ── UNIFIED COMPACT HEADER ── */}
      <div style={{ background: '#ffffff', borderRadius: '20px', border: '1px solid #e2e8f0', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: 'linear-gradient(135deg, #0d9488, #059669)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(13, 148, 136, 0.25)' }}>
            <FileText size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '18px', fontWeight: '900', color: '#0f2b26', margin: 0, letterSpacing: '-0.3px' }}>
                {isHR ? '👑 HR Master Leave Applications Console' : '👤 My Personal Leave Applications'}
              </h1>
              <span style={{ background: 'rgba(13, 148, 136, 0.1)', color: '#0d9488', fontSize: '11px', fontWeight: '800', padding: '3px 10px', borderRadius: '20px', border: '1px solid rgba(13, 148, 136, 0.2)' }}>
                {isHR ? 'All Staff View' : 'Employee Self-Service'}
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0, marginTop: '3px' }}>
              {isHR 
                ? 'Review company-wide staff leave requests, approve/reject applications, and sync with payroll attendance.' 
                : 'Track your remaining leave quotas, apply for leaves, and view real-time HR approval updates.'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {isHR && (
            <button
              onClick={() => {
                setQuotaTargetKey('');
                setQuotaForm({ cl: 12, sl: 10, el: 15 });
                setShowQuotaModal(true);
              }}
              style={{ padding: '9px 16px', borderRadius: '12px', border: '1px solid #0d9488', background: 'rgba(13, 148, 136, 0.08)', color: '#0d9488', fontSize: '13px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}
            >
              ⚙️ Assign Custom Staff Quotas
            </button>
          )}

          <button
            onClick={() => setActiveTab?.('my_attendance')}
            style={{ padding: '9px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '13px', fontWeight: '700', color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}
          >
            <Calendar size={15} /> Shift Attendance
          </button>

          <button
            onClick={() => setShowApplyModal(true)}
            style={{ padding: '10px 20px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #0d9488 0%, #059669 100%)', color: '#ffffff', fontSize: '13px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(13, 148, 136, 0.3)' }}
          >
            <Plus size={16} /> + File Leave Request
          </button>
        </div>
      </div>

      {/* ── TOP METRICS CARDS (DYNAMIC: HR STATS vs EMPLOYEE QUOTAS) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
        {isHR ? (
          <>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px 22px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
              <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(13, 148, 136, 0.1)', color: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={22} />
              </div>
              <div>
                <div style={{ fontSize: '22px', fontWeight: '900', color: '#0f2b26' }}>{localLeaves.length} Requests</div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>Total Staff Leave Requests</div>
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px 22px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
              <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#fffbe6', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={22} />
              </div>
              <div>
                <div style={{ fontSize: '22px', fontWeight: '900', color: '#d97706' }}>{pendingCount} Pending</div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>Awaiting HR Approval</div>
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px 22px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
              <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#e6f4ea', color: '#137333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={22} />
              </div>
              <div>
                <div style={{ fontSize: '22px', fontWeight: '900', color: '#137333' }}>{approvedCount} Approved</div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>Approved Staff Leaves</div>
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px 22px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
              <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#fff5f5', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <XCircle size={22} />
              </div>
              <div>
                <div style={{ fontSize: '22px', fontWeight: '900', color: '#dc2626' }}>{localLeaves.filter(l => l.status === 'Rejected').length} Rejected</div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>Rejected Requests</div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px 22px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
              <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#e6f4ea', color: '#137333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Calendar size={22} />
              </div>
              <div>
                <div style={{ fontSize: '22px', fontWeight: '900', color: '#137333' }}>{clRem} / {assignedCL} Days</div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>Casual Leaves (CL)</div>
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px 22px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
              <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#f0fdf4', color: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={22} />
              </div>
              <div>
                <div style={{ fontSize: '22px', fontWeight: '900', color: '#0d9488' }}>{slRem} / {assignedSL} Days</div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>Sick Leaves (SL)</div>
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px 22px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
              <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#eff6ff', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={22} />
              </div>
              <div>
                <div style={{ fontSize: '22px', fontWeight: '900', color: '#1d4ed8' }}>{elRem} / {assignedEL} Days</div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>Earned Leaves (EL)</div>
              </div>
            </div>

            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px 22px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
              <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#fffbe6', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={22} />
              </div>
              <div>
                <div style={{ fontSize: '22px', fontWeight: '900', color: '#d97706' }}>{pendingCount} Request{pendingCount !== 1 ? 's' : ''}</div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>Awaiting HR Approval</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── FILTER & TOOLBAR BAR ── */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '16px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
          <div style={{ position: 'relative', minWidth: '260px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by employee name or reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '9px 12px 9px 36px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', width: '100%', outline: 'none' }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '9px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#ffffff', color: '#334155', outline: 'none', fontWeight: '600' }}
          >
            <option value="all">All Statuses ({dateScopedLeaves.length})</option>
            <option value="pending">Pending Approvals ({pendingCount})</option>
            <option value="approved">Approved ({approvedCount})</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ padding: '9px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#ffffff', color: '#334155', outline: 'none', fontWeight: '600' }}
          >
            <option value="all">All Leave Types</option>
            <option value="casual leave">Casual Leave</option>
            <option value="sick leave">Sick Leave</option>
            <option value="earned leave">Earned Leave</option>
          </select>

          {/* Date Scope Filter Pills */}
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
            <button
              onClick={() => setDateScope('all')}
              style={{ padding: '6px 12px', borderRadius: '7px', border: 'none', background: dateScope === 'all' ? '#ffffff' : 'transparent', color: dateScope === 'all' ? '#0d9488' : '#64748b', fontSize: '11px', fontWeight: '800', cursor: 'pointer', boxShadow: dateScope === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
            >
              All Time
            </button>
            <button
              onClick={() => setDateScope('today')}
              style={{ padding: '6px 12px', borderRadius: '7px', border: 'none', background: dateScope === 'today' ? '#ffffff' : 'transparent', color: dateScope === 'today' ? '#0d9488' : '#64748b', fontSize: '11px', fontWeight: '800', cursor: 'pointer', boxShadow: dateScope === 'today' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
            >
              Today
            </button>
            <button
              onClick={() => setDateScope('monthly')}
              style={{ padding: '6px 12px', borderRadius: '7px', border: 'none', background: dateScope === 'monthly' ? '#ffffff' : 'transparent', color: dateScope === 'monthly' ? '#0d9488' : '#64748b', fontSize: '11px', fontWeight: '800', cursor: 'pointer', boxShadow: dateScope === 'monthly' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
            >
              Monthly
            </button>
            <button
              onClick={() => setDateScope('yearly')}
              style={{ padding: '6px 12px', borderRadius: '7px', border: 'none', background: dateScope === 'yearly' ? '#ffffff' : 'transparent', color: dateScope === 'yearly' ? '#0d9488' : '#64748b', fontSize: '11px', fontWeight: '800', cursor: 'pointer', boxShadow: dateScope === 'yearly' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
            >
              Yearly
            </button>
            <button
              onClick={() => setDateScope('custom')}
              style={{ padding: '6px 12px', borderRadius: '7px', border: 'none', background: dateScope === 'custom' ? '#ffffff' : 'transparent', color: dateScope === 'custom' ? '#0d9488' : '#64748b', fontSize: '11px', fontWeight: '800', cursor: 'pointer', boxShadow: dateScope === 'custom' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
            >
              Custom Range
            </button>
          </div>

          {dateScope === 'monthly' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '10px' }}>
              <Calendar size={14} style={{ color: '#0d9488' }} />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{ border: 'none', background: 'transparent', fontWeight: '800', color: '#0f2b26', outline: 'none', cursor: 'pointer', fontSize: '12px' }}
              >
                <option value="2026-08">August 2026</option>
                <option value="2026-07">July 2026</option>
                <option value="2026-06">June 2026</option>
                <option value="2026-05">May 2026</option>
              </select>
            </div>
          )}

          {dateScope === 'yearly' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '10px' }}>
              <Calendar size={14} style={{ color: '#0d9488' }} />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                style={{ border: 'none', background: 'transparent', fontWeight: '800', color: '#0f2b26', outline: 'none', cursor: 'pointer', fontSize: '12px' }}
              >
                <option value="2026">Year 2026</option>
                <option value="2025">Year 2025</option>
                <option value="2024">Year 2024</option>
              </select>
            </div>
          )}

          {dateScope === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', border: '1px solid #cbd5e1', padding: '4px 10px', borderRadius: '10px' }}>
              <input
                type="date"
                value={startDateRange}
                onChange={(e) => setStartDateRange(e.target.value)}
                style={{ border: 'none', background: 'transparent', fontSize: '12px', fontWeight: '800', color: '#0f2b26', outline: 'none' }}
              />
              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700' }}>to</span>
              <input
                type="date"
                value={endDateRange}
                onChange={(e) => setEndDateRange(e.target.value)}
                style={{ border: 'none', background: 'transparent', fontSize: '12px', fontWeight: '800', color: '#0f2b26', outline: 'none' }}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── FLEX BOX CARDS LIST (SCREENSHOT 2 BOX FORMAT) ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {filteredLeaves.length === 0 ? (
          <div style={{ background: '#ffffff', borderRadius: '18px', border: '1px solid #e2e8f0', padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '14px', fontWeight: '700' }}>
            No leave applications match your search filters.
          </div>
        ) : (
          filteredLeaves.map(leave => {
            const isApproved = leave.status === 'Approved';
            const isPending = leave.status === 'Pending';
            const isRejected = leave.status === 'Rejected';

            const cardBg = isApproved ? '#ecfdf5' : isPending ? '#fffbe6' : '#fff5f5';
            const cardBorder = isApproved ? '#a7f3d0' : isPending ? '#ffe58f' : '#fca5a5';
            const stripBg = isApproved ? '#10b981' : isPending ? '#d97706' : '#ef4444';
            const initials = `${leave.first_name?.[0] || 'E'}${leave.last_name?.[0] || 'M'}`.toUpperCase();

            return (
              <div
                key={leave.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  minHeight: '80px',
                  background: cardBg,
                  border: `1.5px solid ${cardBorder}`,
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  transition: 'all 0.15s ease'
                }}
              >
                {/* Vertical Left Status Strip */}
                <div style={{
                  width: '38px',
                  alignSelf: 'stretch',
                  background: stripBg,
                  color: '#ffffff',
                  fontWeight: '900',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'center',
                  writingMode: 'vertical-lr',
                  transform: 'rotate(180deg)',
                  letterSpacing: '1px',
                  padding: '12px 0'
                }}>
                  {leave.status.toUpperCase()}
                </div>

                {/* Main Content Area */}
                <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1, flexWrap: 'wrap', gap: '16px' }}>
                  
                  {/* Employee Avatar & Name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '220px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#ffffff', color: '#0d9488', border: '1px solid #cbd5e1', fontSize: '15px', fontWeight: '900', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {initials}
                    </div>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: '900', color: '#0f2b26' }}>
                        {leave.first_name} {leave.last_name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>
                        {leave.email}
                      </div>
                    </div>
                  </div>

                  {/* Leave Type Capsule */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>Leave Type</span>
                    <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '6px 14px', fontSize: '12px', fontWeight: '900', color: '#0d9488', whiteSpace: 'nowrap' }}>
                      {leave.type}
                    </div>
                  </div>

                  {/* Timelines Capsule */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>Timelines (Start - End)</span>
                    <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '6px 14px', fontSize: '12px', fontWeight: '800', color: '#334155', whiteSpace: 'nowrap' }}>
                      {leave.start_date} to {leave.end_date} ({leave.days_count || 1} Day{leave.days_count > 1 ? 's' : ''})
                    </div>
                  </div>

                  {/* Reason Capsule */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '300px', flex: 1 }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>Reason</span>
                    <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '6px 14px', fontSize: '12px', fontWeight: '700', color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {leave.reason}
                    </div>
                  </div>

                  {/* HR Action Buttons / Status Pill */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isPending ? (
                      isHR ? (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => handleUpdateStatus(leave.id, 'Approved')}
                            style={{ padding: '7px 14px', borderRadius: '10px', border: 'none', background: '#16a34a', color: '#ffffff', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 2px 6px rgba(22, 163, 74, 0.3)' }}
                          >
                            <Check size={14} /> Approve
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(leave.id, 'Rejected')}
                            style={{ padding: '7px 14px', borderRadius: '10px', border: 'none', background: '#dc2626', color: '#ffffff', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)' }}
                          >
                            <X size={14} /> Reject
                          </button>
                        </div>
                      ) : (
                        <div style={{ background: '#fffbe6', color: '#d97706', border: '1px solid #ffe58f', padding: '6px 14px', borderRadius: '12px', fontSize: '12px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={15} /> Awaiting HR Approval
                        </div>
                      )
                    ) : (
                      <div style={{ background: isApproved ? '#dcfce7' : '#fee2e2', color: isApproved ? '#15803d' : '#b91c1c', border: `1px solid ${isApproved ? '#86efac' : '#fca5a5'}`, padding: '6px 14px', borderRadius: '12px', fontSize: '12px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isApproved ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                        {isApproved ? 'Approved by HR ✅' : 'Rejected by HR'}
                      </div>
                    )}
                  </div>

                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── FILE LEAVE REQUEST MODAL ── */}
      {showApplyModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }}>
          <div style={{ background: '#ffffff', borderRadius: '24px', width: '100%', maxWidth: '520px', padding: '28px', boxShadow: '0 20px 50px rgba(0,0,0,0.2)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(13, 148, 136, 0.1)', color: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: '900', color: '#0f2b26', margin: 0 }}>File Leave Application</h3>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Submit leave details for HR approval & attendance sync.</p>
                </div>
              </div>
              <button
                onClick={() => setShowApplyModal(false)}
                style={{ border: 'none', background: '#f1f5f9', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateLeaveSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '6px' }}>Leave Category Type</label>
                <select
                  value={applyForm.type}
                  onChange={(e) => setApplyForm({ ...applyForm, type: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '700', outline: 'none' }}
                >
                  <option value="Casual Leave">Casual Leave (CL)</option>
                  <option value="Sick Leave">Sick Leave (SL)</option>
                  <option value="Earned Leave">Earned Leave (EL / Privilege)</option>
                  <option value="Compensatory Off">Compensatory Off (Comp-Off)</option>
                  <option value="Unpaid LOP">Unpaid Leave (LOP)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '6px' }}>Start Date</label>
                  <input
                    type="date"
                    required
                    value={applyForm.startDate}
                    onChange={(e) => setApplyForm({ ...applyForm, startDate: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '700', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '6px' }}>End Date</label>
                  <input
                    type="date"
                    required
                    value={applyForm.endDate}
                    onChange={(e) => setApplyForm({ ...applyForm, endDate: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '700', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '6px' }}>Reason & Justification</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Provide clear reason for leave request..."
                  value={applyForm.reason}
                  onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  style={{ padding: '10px 18px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '10px 22px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #0d9488, #059669)', color: '#ffffff', fontSize: '13px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)' }}
                >
                  Submit Application
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ── HR MODAL: ASSIGN CUSTOM LEAVE QUOTAS TO INDIVIDUAL EMPLOYEE ── */}
      {showQuotaModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '20px', width: '100%', maxWidth: '460px', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: '900', color: '#0f2b26', margin: 0 }}>⚙️ Assign Custom Leave Quotas</h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: 0, marginTop: '2px' }}>Set custom CL, SL, EL yearly limits for a specific employee.</p>
              </div>
              <button
                onClick={() => setShowQuotaModal(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveCustomQuotaSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '6px' }}>Employee Work Email / ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. kavayanshchopr@gmail.com or EMP-0001"
                  value={quotaTargetKey}
                  onChange={(e) => setQuotaTargetKey(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '6px' }}>Casual (CL)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={quotaForm.cl}
                    onChange={(e) => setQuotaForm({ ...quotaForm, cl: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '6px' }}>Sick (SL)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={quotaForm.sl}
                    onChange={(e) => setQuotaForm({ ...quotaForm, sl: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '800', color: '#334155', display: 'block', marginBottom: '6px' }}>Earned (EL)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={quotaForm.el}
                    onChange={(e) => setQuotaForm({ ...quotaForm, el: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowQuotaModal(false)}
                  style={{ padding: '10px 18px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '10px 22px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #0d9488, #059669)', color: '#ffffff', fontSize: '13px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)' }}
                >
                  Save Custom Quotas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
