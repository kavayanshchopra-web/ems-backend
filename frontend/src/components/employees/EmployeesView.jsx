import React, { useState } from 'react';
import ListPattern from '../patterns/ListPattern';
import PageHeader from '../ui/PageHeader';
import Toolbar from '../ui/Toolbar';
import SearchInput from '../ui/SearchInput';
import Select from '../ui/Select';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Pagination from '../ui/Pagination';
import EmptyState from '../ui/EmptyState';
import Skeleton from '../ui/Skeleton';
import StatCard from '../ui/StatCard';
import { Plus, UserCheck, ShieldAlert, Edit2, Trash2 } from 'lucide-react';

/**
 * Phase 2B — All Employees Listing View Component
 * Migrated to Global Design System v2.0
 * Preserves exact Emerald Teal palette (#0d9488 -> #064e43) and 100% business logic.
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
      <div style={{ padding: '60px', textAlign: 'center', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', margin: '20px' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔒</div>
        <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Access Restricted</h3>
        <p style={{ fontSize: '13px', color: '#64748b', marginTop: '6px' }}>
          You do not have permission to view employee salary details and management portals. Please contact your system administrator.
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
  const filtered = employees.filter(emp => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (
      (emp.first_name || '').toLowerCase().includes(q) ||
      (emp.last_name || '').toLowerCase().includes(q) ||
      (emp.role || '').toLowerCase().includes(q) ||
      (emp.department || '').toLowerCase().includes(q) ||
      (emp.email || '').toLowerCase().includes(q) ||
      (emp.phone || '').includes(q)
    );

    const matchesRole = selectedRoleFilter === 'all' || (emp.role || '').toLowerCase() === selectedRoleFilter.toLowerCase();
    return matchesSearch && matchesRole;
  });

  const sorted = [...filtered].sort((a, b) => {
    let valA = a[sortKey] || '';
    let valB = b[sortKey] || '';

    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    if (sortKey === 'salary') {
      valA = parseFloat(valA) || 0;
      valB = parseFloat(valB) || 0;
    }

    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sorted.length / pageSize) || 1;
  const paginated = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Summary Metrics Calculation
  const totalCount = employees.length;
  const activeCount = employees.filter(e => e.status === 'active' || !e.status).length;
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

  const toolbarLeft = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
      <SearchInput
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          setCurrentPage(1);
        }}
        onClear={() => setSearchQuery('')}
        placeholder="Search by name, role, email or dept..."
        width="280px"
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
        {sortDir === 'asc' ? '↑ Ascending' : '↓ Descending'}
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
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
        <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>
              Workspace Plan Seat Usage
            </span>
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#0d9488' }}>
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

      {/* Touch Swipe Hint for Mobile Viewports */}
      <div className="mobile-swipe-hint" style={{ display: 'none', fontSize: '11px', color: '#0d9488', fontWeight: '700', padding: '4px 12px', textAlign: 'right' }}>
        Swipe table horizontally ↔
      </div>

      {/* Main Employee Table */}
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table className="std-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th
                onClick={() => handleSort('first_name')}
                style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }}
              >
                Employee <span style={{ color: sortKey === 'first_name' ? '#0d9488' : '#94a3b8' }}>{sortKey === 'first_name' ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
              </th>
              <th
                onClick={() => handleSort('role')}
                style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }}
              >
                Role <span style={{ color: sortKey === 'role' ? '#0d9488' : '#94a3b8' }}>{sortKey === 'role' ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
              </th>
              <th
                onClick={() => handleSort('department')}
                style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }}
              >
                Department <span style={{ color: sortKey === 'department' ? '#0d9488' : '#94a3b8' }}>{sortKey === 'department' ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
              </th>
              <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>
                Contact Info
              </th>
              <th
                onClick={() => handleSort('salary')}
                style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }}
              >
                Base Salary <span style={{ color: sortKey === 'salary' ? '#0d9488' : '#94a3b8' }}>{sortKey === 'salary' ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
              </th>
              <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>
                Status
              </th>
              {canManage && (
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', textAlign: 'right' }}>
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {isEmployeesLoading ? (
              <tr>
                <td colSpan={canManage ? 7 : 6} style={{ padding: '24px' }}>
                  <Skeleton height="36px" count={5} style={{ marginBottom: '8px' }} />
                </td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={canManage ? 7 : 6} style={{ padding: '40px', textAlign: 'center' }}>
                  <EmptyState
                    title="No employees found"
                    description={searchQuery ? `No staff records match "${searchQuery}".` : 'No employee records are available.'}
                  />
                </td>
              </tr>
            ) : (
              paginated.map((emp) => {
                const roleLower = (emp.role || 'employee').toLowerCase();
                let badgeVariant = 'neutral';
                if (roleLower === 'admin' || roleLower === 'owner' || roleLower === 'superadmin') badgeVariant = 'danger';
                else if (roleLower === 'manager') badgeVariant = 'warning';
                else if (roleLower === 'agent') badgeVariant = 'info';

                return (
                  <tr key={emp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg, #0d9488, #064e43)', color: '#ffffff', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0 }}>
                          {(emp.first_name || '')[0]}{(emp.last_name || '')[0] || ''}
                        </div>
                        <div>
                          <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '13px' }}>
                            {emp.first_name} {emp.last_name || ''}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>ID: {emp.id}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <Badge variant={badgeVariant}>
                        {emp.role || 'employee'}
                      </Badge>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#334155', fontSize: '12px', fontWeight: '600' }}>
                      {emp.department || 'Sales'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: '12px', color: '#0f172a', fontWeight: '600' }}>{emp.email}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{emp.phone || '—'}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: '800', color: '#0d9488', fontSize: '13px' }}>
                      ₹{emp.salary ? parseFloat(emp.salary).toLocaleString('en-IN') : '0'} /mo
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <Badge variant={emp.status === 'active' || !emp.status ? 'success' : 'neutral'}>
                        {emp.status === 'active' || !emp.status ? 'Active' : 'Suspended'}
                      </Badge>
                    </td>
                    {canManage && (
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <Button
                            variant="outline"
                            size="sm"
                            icon={<Edit2 size={12} />}
                            onClick={() => {
                              setNewEmployeeForm({
                                id: emp.id,
                                firstName: emp.first_name,
                                lastName: emp.last_name || '',
                                email: emp.email || '',
                                phone: emp.phone || '',
                                role: emp.role,
                                department: emp.department || 'Sales',
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
    </ListPattern>
  );
}
