import React, { useState } from 'react';
import ListPattern from '../patterns/ListPattern';
import SearchInput from '../ui/SearchInput';
import Select from '../ui/Select';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import EmptyState from '../ui/EmptyState';
import Skeleton from '../ui/Skeleton';
import StatCard from '../ui/StatCard';
import { Plus, Edit2, Trash2, Eye, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/**
 * Defensive string extractor helper
 */
const getValString = (val, fallback = '') => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string' || typeof val === 'number') return String(val);
  if (typeof val === 'object') {
    if (typeof val.name === 'string') return val.name;
    if (typeof val.title === 'string') return val.title;
    if (typeof val.label === 'string') return val.label;
    if (typeof val.value === 'string') return val.value;
  }
  return fallback;
};

/**
 * Format Employee ID (EMP-0001, EMP-0002...)
 */
const formatEmployeeId = (id, index = 0) => {
  if (!id) return `EMP-${String(index + 1).padStart(4, '0')}`;
  const strId = String(id).trim();
  if (strId.toUpperCase().startsWith('EMP-')) return strId.toUpperCase();
  const numMatch = strId.match(/\d+/g);
  if (numMatch) {
    const num = parseInt(numMatch[numMatch.length - 1], 10);
    if (!isNaN(num)) return `EMP-${String(num).padStart(4, '0')}`;
  }
  return `EMP-${String(index + 1).padStart(4, '0')}`;
};

/**
 * Format Salary Display (₹25,000 / month, Not Assigned)
 */
const formatSalaryDisplay = (val) => {
  if (val === null || val === undefined || val === '') return '—';
  const num = parseFloat(val);
  if (isNaN(num) || num <= 0) return 'Not Assigned';
  return `₹${num.toLocaleString('en-IN')} / month`;
};

/**
 * Get Status Badge Color & Configuration
 */
const getStatusBadgeConfig = (status) => {
  const st = String(status || 'active').toLowerCase().trim();
  switch (st) {
    case 'active':
      return { label: 'Active', bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' };
    case 'inactive':
      return { label: 'Inactive', bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1' };
    case 'suspended':
      return { label: 'Suspended', bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
    case 'on leave':
    case 'on_leave':
    case 'leave':
      return { label: 'On Leave', bg: '#fffbeb', color: '#d97706', border: '#fde68a' };
    default:
      return { label: status || 'Active', bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' };
  }
};

export default function EmployeesView({
  authUser,
  employees = [],
  billingTenant = null,
  isEmployeesLoading = false,
  setNewEmployeeForm = () => {},
  setShowAddEmployeeModal = () => {},
  handleDeleteEmployee = () => {},
  showToast = () => {}
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState('first_name');
  const [sortDir, setSortDir] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');

  // Modals for View & Delete Confirmation
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({
    isOpen: false,
    employeeId: null,
    employeeName: ''
  });

  const canManage = authUser?.role === 'owner' || authUser?.role === 'admin' || authUser?.role === 'superadmin';
  const canView = canManage || authUser?.role === 'manager';

  if (!canView) {
    return (
      <div style={{ padding: '36px 20px', textAlign: 'center', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', margin: '16px' }}>
        <div style={{ fontSize: '36px', marginBottom: '8px' }}>🔒</div>
        <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Access Restricted</h3>
        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
          You do not have permission to view employee salary details and management portals. Please contact your administrator.
        </p>
      </div>
    );
  }

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // Filter & Sort Logic
  const filtered = employees.filter((emp, idx) => {
    const q = searchQuery.toLowerCase().trim();
    const rawId = String(emp.id || '').toLowerCase();
    const formattedId = formatEmployeeId(emp.id, idx).toLowerCase();
    const firstName = getValString(emp.first_name).toLowerCase();
    const lastName = getValString(emp.last_name).toLowerCase();
    const fullName = `${firstName} ${lastName}`.trim();
    const role = getValString(emp.role, 'employee').toLowerCase();
    const department = getValString(emp.department, 'Sales').toLowerCase();
    const email = getValString(emp.email).toLowerCase();
    const phone = getValString(emp.phone).toLowerCase();

    const matchesSearch = !q || (
      rawId.includes(q) ||
      formattedId.includes(q) ||
      firstName.includes(q) ||
      lastName.includes(q) ||
      fullName.includes(q) ||
      role.includes(q) ||
      department.includes(q) ||
      email.includes(q) ||
      phone.includes(q)
    );

    const matchesRole = selectedRoleFilter === 'all' || role === selectedRoleFilter.toLowerCase();
    return matchesSearch && matchesRole;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === 'salary') {
      const valA = parseFloat(a.salary || 0) || 0;
      const valB = parseFloat(b.salary || 0) || 0;
      return sortDir === 'asc' ? valA - valB : valB - valA;
    }
    if (sortKey === 'id') {
      const valA = String(a.id || '');
      const valB = String(b.id || '');
      return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    const valA = getValString(a[sortKey]).toLowerCase();
    const valB = getValString(b[sortKey]).toLowerCase();

    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sorted.length / pageSize) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = sorted.length > 0 ? (safeCurrentPage - 1) * pageSize : 0;
  const endIndex = Math.min(safeCurrentPage * pageSize, sorted.length);
  const paginated = sorted.slice(startIndex, endIndex);

  // Summary Metrics Calculation
  const totalCount = employees.length;
  const activeCount = employees.filter(e => getValString(e.status, 'active').toLowerCase() === 'active').length;
  const suspendedCount = employees.filter(e => {
    const st = getValString(e.status, 'active').toLowerCase();
    return st === 'suspended' || st === 'inactive';
  }).length;

  const headerActions = canManage ? (
    <Button
      variant="primary"
      size="md"
      icon={<Plus size={16} />}
      onClick={() => {
        setNewEmployeeForm({
          id: '',
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          role: 'employee',
          department: 'Sales',
          salary: '',
          createLoginAccount: false,
          password: '',
          status: 'active'
        });
        setShowAddEmployeeModal(true);
      }}
    >
      Add Employee
    </Button>
  ) : null;

  const roleOptions = [
    { label: 'All Roles', value: 'all' },
    { label: 'Owner / Admin', value: 'admin' },
    { label: 'Manager', value: 'manager' },
    { label: 'Sales Agent', value: 'agent' },
    { label: 'Staff Employee', value: 'employee' }
  ];

  const sortSelectOptions = [
    { label: 'Sort: Name', value: 'first_name' },
    { label: 'Sort: Recently Added', value: 'id' },
    { label: 'Sort: Salary', value: 'salary' },
    { label: 'Sort: Status', value: 'status' },
    { label: 'Sort: Department', value: 'department' }
  ];

  const toolbarLeft = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
      <SearchInput
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          setCurrentPage(1);
        }}
        onClear={() => setSearchQuery('')}
        placeholder="Search employee, ID, role, email or dept..."
        width="260px"
      />
      <Select
        value={selectedRoleFilter}
        onChange={(e) => {
          setSelectedRoleFilter(e.target.value);
          setCurrentPage(1);
        }}
        options={roleOptions}
        style={{ width: '160px' }}
      />
    </div>
  );

  const toolbarRight = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <Select
        value={sortKey}
        onChange={(e) => setSortKey(e.target.value)}
        options={sortSelectOptions}
        style={{ width: '170px' }}
      />
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))}
      >
        {sortDir === 'asc' ? '↑ Asc' : '↓ Desc'}
      </Button>
    </div>
  );

  const statsGrid = (
    <>
      <StatCard
        icon="👥"
        title="TOTAL STAFF"
        value={totalCount}
        subtitle="Registered Team Members"
        trend="Directory"
        badgeText="Active Roster"
        badgeBg="rgba(13, 148, 136, 0.1)"
        badgeColor="#0d9488"
      />
      <StatCard
        icon="🟢"
        title="ACTIVE EMPLOYEES"
        value={activeCount}
        subtitle="Active Shift Status"
        trend="Operational"
        trendDirection="up"
        badgeText="Active"
        badgeBg="rgba(16, 185, 129, 0.1)"
        badgeColor="#059669"
      />
      <StatCard
        icon="⚪"
        title="SUSPENDED / INACTIVE"
        value={suspendedCount}
        subtitle="Inactive Accounts"
        trend="Hold"
        badgeText="Suspended"
        badgeBg="rgba(100, 116, 139, 0.1)"
        badgeColor="#64748b"
      />
    </>
  );

  return (
    <ListPattern
      icon="👥"
      title="Employee Directory"
      subtitle="Manage organization staff members, system roles, department structures and base salaries."
      badgeText={`${totalCount} Total Registered`}
      headerActions={headerActions}
      statsGrid={statsGrid}
      toolbarLeft={toolbarLeft}
      toolbarRight={toolbarRight}
      pagination={
        sorted.length > 0 ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', padding: '14px 18px', background: '#ffffff', borderTop: '1px solid #e2e8f0', borderRadius: '0 0 12px 12px' }}>
            {/* Status Counter */}
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>
              Showing <strong style={{ color: '#0f172a' }}>{startIndex + 1}–{endIndex}</strong> of <strong style={{ color: '#0f172a' }}>{sorted.length}</strong> Employees
            </div>

            {/* Pagination Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Per Page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: '700', color: '#0f172a', background: '#f8fafc', cursor: 'pointer' }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  disabled={safeCurrentPage <= 1}
                  onClick={() => setCurrentPage(1)}
                  title="First Page"
                  style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: safeCurrentPage <= 1 ? '#f1f5f9' : '#ffffff', color: safeCurrentPage <= 1 ? '#94a3b8' : '#0f172a', cursor: safeCurrentPage <= 1 ? 'not-allowed' : 'pointer' }}
                >
                  <ChevronsLeft size={14} />
                </button>
                <button
                  disabled={safeCurrentPage <= 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  title="Previous Page"
                  style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: safeCurrentPage <= 1 ? '#f1f5f9' : '#ffffff', color: safeCurrentPage <= 1 ? '#94a3b8' : '#0f172a', cursor: safeCurrentPage <= 1 ? 'not-allowed' : 'pointer' }}
                >
                  <ChevronLeft size={14} />
                </button>
                <span style={{ padding: '4px 10px', fontSize: '12px', fontWeight: '800', color: '#0d9488', background: 'rgba(13, 148, 136, 0.1)', borderRadius: '6px' }}>
                  {safeCurrentPage} / {totalPages}
                </span>
                <button
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  title="Next Page"
                  style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: safeCurrentPage >= totalPages ? '#f1f5f9' : '#ffffff', color: safeCurrentPage >= totalPages ? '#94a3b8' : '#0f172a', cursor: safeCurrentPage >= totalPages ? 'not-allowed' : 'pointer' }}
                >
                  <ChevronRight size={14} />
                </button>
                <button
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  title="Last Page"
                  style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: safeCurrentPage >= totalPages ? '#f1f5f9' : '#ffffff', color: safeCurrentPage >= totalPages ? '#94a3b8' : '#0f172a', cursor: safeCurrentPage >= totalPages ? 'not-allowed' : 'pointer' }}
                >
                  <ChevronsRight size={14} />
                </button>
              </div>
            </div>
          </div>
        ) : null
      }
    >
      {/* Seat Usage Indicator */}
      {billingTenant && (
        <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#475569' }}>
              Workspace Plan Seat Usage
            </span>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#0d9488' }}>
              {totalCount} / {billingTenant.plan?.max_employees || 5} Seats Filled
            </span>
          </div>
          <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.min(100, (totalCount / (billingTenant.plan?.max_employees || 5)) * 100)}%`,
                height: '100%',
                background: '#0d9488',
                borderRadius: '4px',
                transition: 'width 0.3s ease'
              }}
            />
          </div>
        </div>
      )}

      {/* Table Container with Controlled Scroll */}
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div className="table-header-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px', padding: '10px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>
            Staff Roster Directory ({sorted.length})
          </span>
          <span className="mobile-swipe-hint" style={{ fontSize: '11px', color: '#0d9488', fontWeight: '700' }}>
            Swipe horizontally ↔
          </span>
        </div>

        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table className="std-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th
                  onClick={() => handleSort('first_name')}
                  style={{ padding: '10px 14px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none', position: 'sticky', left: 0, background: '#f8fafc', zIndex: 2 }}
                >
                  Employee <span style={{ color: sortKey === 'first_name' ? '#0d9488' : '#94a3b8' }}>{sortKey === 'first_name' ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
                </th>
                <th
                  onClick={() => handleSort('role')}
                  style={{ padding: '10px 14px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }}
                >
                  Role <span style={{ color: sortKey === 'role' ? '#0d9488' : '#94a3b8' }}>{sortKey === 'role' ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
                </th>
                <th
                  onClick={() => handleSort('department')}
                  style={{ padding: '10px 14px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }}
                >
                  Department <span style={{ color: sortKey === 'department' ? '#0d9488' : '#94a3b8' }}>{sortKey === 'department' ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
                </th>
                <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>
                  Contact Details
                </th>
                <th
                  onClick={() => handleSort('salary')}
                  style={{ padding: '10px 14px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }}
                >
                  Base Salary <span style={{ color: sortKey === 'salary' ? '#0d9488' : '#94a3b8' }}>{sortKey === 'salary' ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
                </th>
                <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>
                  Status
                </th>
                {canManage && (
                  <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', textAlign: 'right' }}>
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {isEmployeesLoading ? (
                <tr>
                  <td colSpan={canManage ? 7 : 6} style={{ padding: '20px' }}>
                    <Skeleton height="32px" count={4} style={{ marginBottom: '6px' }} />
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 7 : 6} style={{ padding: '32px', textAlign: 'center' }}>
                    <EmptyState
                      title="No employees found"
                      description={searchQuery ? `No staff records match "${searchQuery}".` : 'No employee records are available.'}
                    />
                  </td>
                </tr>
              ) : (
                paginated.map((emp, idx) => {
                  const empFormattedId = formatEmployeeId(emp.id, startIndex + idx);
                  const firstName = getValString(emp.first_name, 'Staff');
                  const lastName = getValString(emp.last_name);
                  const roleStr = getValString(emp.role, 'employee');
                  const deptStr = getValString(emp.department, 'Sales');
                  const emailStr = getValString(emp.email);
                  const phoneStr = getValString(emp.phone);
                  const statusConfig = getStatusBadgeConfig(emp.status);

                  const roleLower = roleStr.toLowerCase();
                  let badgeVariant = 'neutral';
                  if (roleLower === 'admin' || roleLower === 'owner' || roleLower === 'superadmin') badgeVariant = 'danger';
                  else if (roleLower === 'manager') badgeVariant = 'warning';
                  else if (roleLower === 'agent') badgeVariant = 'info';

                  return (
                    <tr key={emp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px', position: 'sticky', left: 0, background: '#ffffff', zIndex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '200px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #0d9488, #064e43)', color: '#ffffff', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', flexShrink: 0 }}>
                            {(firstName[0] || 'E')}{(lastName[0] || '')}
                          </div>
                          <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={`${firstName} ${lastName}`}>
                              {firstName} {lastName}
                            </div>
                            <div style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: '700', color: '#0d9488', opacity: 0.95 }} title={`Employee ID: ${empFormattedId}`}>
                              {empFormattedId}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <Badge variant={badgeVariant}>
                          {roleStr}
                        </Badge>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#334155', fontSize: '12px', fontWeight: '600', maxWidth: '140px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={deptStr}>
                        {deptStr}
                      </td>
                      <td style={{ padding: '10px 14px', maxWidth: '180px', overflow: 'hidden' }}>
                        {emailStr ? (
                          <a
                            href={`mailto:${emailStr}`}
                            title={`Send Email to ${emailStr}`}
                            style={{ fontSize: '12px', color: '#0d9488', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', textDecoration: 'none' }}
                          >
                            📧 {emailStr}
                          </a>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#94a3b8' }}>—</span>
                        )}
                        {phoneStr ? (
                          <a
                            href={`tel:${phoneStr}`}
                            title={`Call ${phoneStr}`}
                            style={{ fontSize: '10px', color: '#475569', fontWeight: '600', textDecoration: 'none', display: 'block', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                          >
                            📞 {phoneStr}
                          </a>
                        ) : (
                          <span style={{ fontSize: '10px', color: '#94a3b8' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: '800', color: '#0d9488', fontSize: '12px', whiteSpace: 'nowrap' }}>
                        {formatSalaryDisplay(emp.salary)}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', background: statusConfig.bg, color: statusConfig.color, border: `1px solid ${statusConfig.border}` }}>
                          {statusConfig.label}
                        </span>
                      </td>
                      {canManage && (
                        <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                            {/* READ-ONLY VIEW ACTION */}
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<Eye size={12} />}
                              title="View Profile"
                              onClick={() => setViewingEmployee({ ...emp, formattedId: empFormattedId })}
                            >
                              View
                            </Button>
                            {/* EDIT ACTION */}
                            <Button
                              variant="outline"
                              size="sm"
                              icon={<Edit2 size={12} />}
                              title="Edit Profile"
                              onClick={() => {
                                setNewEmployeeForm({
                                  id: emp.id,
                                  firstName: firstName,
                                  lastName: lastName,
                                  email: emailStr,
                                  phone: phoneStr,
                                  role: roleStr,
                                  department: deptStr,
                                  salary: emp.salary || '',
                                  createLoginAccount: !!emp.user_id,
                                  password: '',
                                  status: emp.status || 'active'
                                });
                                setShowAddEmployeeModal(true);
                              }}
                            >
                              Edit
                            </Button>
                            {/* DELETE ACTION WITH CONFIRMATION */}
                            <Button
                              variant="danger"
                              size="sm"
                              icon={<Trash2 size={12} />}
                              title="Delete Profile"
                              onClick={() => setDeleteConfirmModal({
                                isOpen: true,
                                employeeId: emp.id,
                                employeeName: `${firstName} ${lastName}`
                              })}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* READ-ONLY VIEW EMPLOYEE PROFILE MODAL */}
      {viewingEmployee && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', width: '100%', maxWidth: '480px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
            {/* Modal Header */}
            <div style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #0d9488, #064e43)', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>👤</span>
                <h3 style={{ fontSize: '15px', fontWeight: '800', margin: 0 }}>Employee Profile</h3>
              </div>
              <button
                onClick={() => setViewingEmployee(null)}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Profile Body */}
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ width: '54px', height: '54px', borderRadius: '50%', background: 'linear-gradient(135deg, #0d9488, #064e43)', color: '#ffffff', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                  {(getValString(viewingEmployee.first_name)[0] || 'E')}{(getValString(viewingEmployee.last_name)[0] || '')}
                </div>
                <div>
                  <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                    {getValString(viewingEmployee.first_name)} {getValString(viewingEmployee.last_name)}
                  </h4>
                  <div style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: '700', color: '#0d9488', marginTop: '2px' }}>
                    ID: {viewingEmployee.formattedId || viewingEmployee.id}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                    <Badge variant="info">{getValString(viewingEmployee.role, 'employee')}</Badge>
                    <Badge variant="neutral">{getValString(viewingEmployee.department, 'Sales')}</Badge>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Work Email</div>
                  {viewingEmployee.email ? (
                    <a href={`mailto:${viewingEmployee.email}`} style={{ fontSize: '12px', color: '#0d9488', fontWeight: '600', textDecoration: 'none', display: 'block', marginTop: '2px', wordBreak: 'break-all' }}>
                      {viewingEmployee.email}
                    </a>
                  ) : (
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>—</div>
                  )}
                </div>

                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Phone Number</div>
                  {viewingEmployee.phone ? (
                    <a href={`tel:${viewingEmployee.phone}`} style={{ fontSize: '12px', color: '#0d9488', fontWeight: '600', textDecoration: 'none', display: 'block', marginTop: '2px' }}>
                      {viewingEmployee.phone}
                    </a>
                  ) : (
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>—</div>
                  )}
                </div>

                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Base Salary</div>
                  <div style={{ fontSize: '12px', color: '#0f172a', fontWeight: '800', marginTop: '2px' }}>
                    {formatSalaryDisplay(viewingEmployee.salary)}
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Account Status</div>
                  <div style={{ marginTop: '2px' }}>
                    {(() => {
                      const cfg = getStatusBadgeConfig(viewingEmployee.status);
                      return (
                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '700', background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                          {cfg.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '12px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="secondary" size="md" onClick={() => setViewingEmployee(null)}>
                Close Profile
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmModal.isOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', width: '100%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', background: '#fef2f2', borderBottom: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>⚠️</span>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#991b1b', margin: 0 }}>Delete Employee?</h3>
                <p style={{ fontSize: '12px', color: '#b91c1c', margin: 0 }}>This action cannot be undone.</p>
              </div>
            </div>
            <div style={{ padding: '20px', fontSize: '13px', color: '#334155', lineHeight: 1.5 }}>
              Are you sure you want to permanently delete employee profile <strong style={{ color: '#0f172a' }}>"{deleteConfirmModal.employeeName}"</strong>?
            </div>
            <div style={{ padding: '12px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button
                variant="secondary"
                size="md"
                onClick={() => setDeleteConfirmModal({ isOpen: false, employeeId: null, employeeName: '' })}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                icon={<Trash2 size={14} />}
                onClick={() => {
                  const empId = deleteConfirmModal.employeeId;
                  setDeleteConfirmModal({ isOpen: false, employeeId: null, employeeName: '' });
                  handleDeleteEmployee(empId);
                }}
              >
                Delete Profile
              </Button>
            </div>
          </div>
        </div>
      )}
    </ListPattern>
  );
}
