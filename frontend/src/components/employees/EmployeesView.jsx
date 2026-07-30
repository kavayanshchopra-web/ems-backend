import React, { useState } from 'react';
import ListPattern from '../patterns/ListPattern';
import SearchInput from '../ui/SearchInput';
import Select from '../ui/Select';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Pagination from '../ui/Pagination';
import EmptyState from '../ui/EmptyState';
import Skeleton from '../ui/Skeleton';
import StatCard from '../ui/StatCard';
import { Plus, Edit2, Trash2 } from 'lucide-react';

/**
 * Defensive string extractor helper
 * Safely handles strings, numbers, nulls, and legacy objects like { name, archived }
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
 * Phase 2B — All Employees Listing View (Runtime Bug Corrected)
 * Preserves exact Emerald Teal palette (#0d9488 -> #064e43) and 100% business logic.
 * Safely renders string or object values ({ name, archived }) without React Error #31.
 */
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

  const canManage = authUser?.role === 'owner' || authUser?.role === 'admin' || authUser?.role === 'superadmin';
  const canView = canManage || authUser?.role === 'manager';

  if (!canView) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', margin: '16px' }}>
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

  // Filter & Sort Logic with Defensive String Extraction
  const filtered = employees.filter(emp => {
    const q = searchQuery.toLowerCase().trim();
    const firstName = getValString(emp.first_name).toLowerCase();
    const lastName = getValString(emp.last_name).toLowerCase();
    const role = getValString(emp.role, 'employee').toLowerCase();
    const department = getValString(emp.department, 'Sales').toLowerCase();
    const email = getValString(emp.email).toLowerCase();
    const phone = getValString(emp.phone).toLowerCase();

    const matchesSearch = !q || (
      firstName.includes(q) ||
      lastName.includes(q) ||
      role.includes(q) ||
      department.includes(q) ||
      email.includes(q) ||
      phone.includes(q)
    );

    const matchesRole = selectedRoleFilter === 'all' || role === selectedRoleFilter.toLowerCase();
    return matchesSearch && matchesRole;
  });

  const sorted = [...filtered].sort((a, b) => {
    let valA = getValString(a[sortKey]);
    let valB = getValString(b[sortKey]);

    if (sortKey === 'salary') {
      valA = parseFloat(a.salary || 0) || 0;
      valB = parseFloat(b.salary || 0) || 0;
      return sortDir === 'asc' ? valA - valB : valB - valA;
    }

    valA = valA.toLowerCase();
    valB = valB.toLowerCase();

    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sorted.length / pageSize) || 1;
  const paginated = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Summary Metrics Calculation
  const totalCount = employees.length;
  const activeCount = employees.filter(e => {
    const st = getValString(e.status, 'active').toLowerCase();
    return st === 'active';
  }).length;
  const suspendedCount = totalCount - activeCount;

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

  const sortLabelMap = {
    first_name: 'Name',
    role: 'Role',
    department: 'Department',
    salary: 'Salary'
  };

  const toolbarLeft = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', width: '100%' }}>
      <SearchInput
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          setCurrentPage(1);
        }}
        onClear={() => setSearchQuery('')}
        placeholder="Search employee, role, email or dept..."
        width="260px"
      />
      <Select
        value={selectedRoleFilter}
        onChange={(e) => {
          setSelectedRoleFilter(e.target.value);
          setCurrentPage(1);
        }}
        options={roleOptions}
      />
    </div>
  );

  const toolbarRight = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))}
      >
        Sort: {sortLabelMap[sortKey] || 'Name'} {sortDir === 'asc' ? '↑' : '↓'}
      </Button>
    </div>
  );

  return (
    <ListPattern
      icon="👥"
      title="Employee Directory"
      subtitle="Manage organization staff members, system roles, department structures and base salaries."
      badgeText={`${totalCount} Total Registered`}
      headerActions={headerActions}
      toolbarLeft={toolbarLeft}
      toolbarRight={toolbarRight}
      pagination={
        sorted.length > 0 ? (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={sorted.length}
            onPageChange={(page) => setCurrentPage(page)}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
          />
        ) : null
      }
    >
      {/* Employee KPI Metrics Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
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
      </div>

      {/* Seat Usage Indicator */}
      {billingTenant && (
        <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
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
        <div className="table-header-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>
            Staff Roster Directory ({sorted.length})
          </span>
          <span className="mobile-swipe-hint" style={{ fontSize: '11px', color: '#0d9488', fontWeight: '700' }}>
            Swipe table horizontally ↔
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
                paginated.map((emp) => {
                  const firstName = getValString(emp.first_name, 'Staff');
                  const lastName = getValString(emp.last_name);
                  const roleStr = getValString(emp.role, 'employee');
                  const deptStr = getValString(emp.department, 'Sales');
                  const emailStr = getValString(emp.email);
                  const phoneStr = getValString(emp.phone);
                  const statusStr = getValString(emp.status, 'active');

                  const roleLower = roleStr.toLowerCase();
                  let badgeVariant = 'neutral';
                  if (roleLower === 'admin' || roleLower === 'owner' || roleLower === 'superadmin') badgeVariant = 'danger';
                  else if (roleLower === 'manager') badgeVariant = 'warning';
                  else if (roleLower === 'agent') badgeVariant = 'info';

                  const isStatusActive = statusStr.toLowerCase() === 'active';

                  return (
                    <tr key={emp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px', position: 'sticky', left: 0, background: '#ffffff', zIndex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '200px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #0d9488, #064e43)', color: '#ffffff', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', flexShrink: 0 }}>
                            {(firstName[0] || 'E')}{(lastName[0] || '')}
                          </div>
                          <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {firstName} {lastName}
                            </div>
                            <div style={{ fontSize: '10px', color: '#64748b' }}>ID: {emp.id}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <Badge variant={badgeVariant}>
                          {roleStr}
                        </Badge>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#334155', fontSize: '12px', fontWeight: '600', maxWidth: '140px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {deptStr}
                      </td>
                      <td style={{ padding: '10px 14px', maxWidth: '180px', overflow: 'hidden' }}>
                        <div style={{ fontSize: '12px', color: '#0f172a', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emailStr}</div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>{phoneStr || '—'}</div>
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: '800', color: '#0d9488', fontSize: '12px', whiteSpace: 'nowrap' }}>
                        ₹{emp.salary ? parseFloat(emp.salary).toLocaleString('en-IN') : '0'} /mo
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <Badge variant={isStatusActive ? 'success' : 'neutral'}>
                          {isStatusActive ? 'Active' : 'Suspended'}
                        </Badge>
                      </td>
                      {canManage && (
                        <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                            <Button
                              variant="outline"
                              size="sm"
                              icon={<Edit2 size={12} />}
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
                                  status: statusStr
                                });
                                setShowAddEmployeeModal(true);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              icon={<Trash2 size={12} />}
                              onClick={() => handleDeleteEmployee(emp.id)}
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
    </ListPattern>
  );
}
