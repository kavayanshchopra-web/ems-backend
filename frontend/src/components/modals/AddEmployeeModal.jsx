import React, { useState } from 'react';
import { X, Lock, Eye, EyeOff, KeyRound } from 'lucide-react';

export default function AddEmployeeModal({
  showAddEmployeeModal,
  setShowAddEmployeeModal,
  newEmployeeForm,
  setNewEmployeeForm,
  handleCreateEmployee,
  authUser,
  systemDropdowns,
  billingTenant,
  isEmployeesLoading
}) {
  const [showPassword, setShowPassword] = useState(false);

  if (!showAddEmployeeModal) return null;

  const isEdit = !!newEmployeeForm.id;

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal-content glass-panel" style={{ maxWidth: '520px', color: '#0f2b26', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(13, 148, 136, 0.1)', color: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <KeyRound size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>
                {isEdit ? 'Edit Employee Profile & Login' : 'Add New Employee & Dashboard Account'}
              </h2>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0, marginTop: '2px' }}>
                Set up employee profile, department, role permissions and login password.
              </p>
            </div>
          </div>
          <X size={18} style={{ cursor: 'pointer', color: '#64748b' }} onClick={() => setShowAddEmployeeModal(false)} />
        </div>

        <form onSubmit={handleCreateEmployee} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Name Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '4px', color: '#334155' }}>First Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Rahul"
                value={newEmployeeForm.firstName || ''}
                onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, firstName: e.target.value })}
                style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '13px', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '4px', color: '#334155' }}>Last Name</label>
              <input
                type="text"
                placeholder="e.g. Sharma"
                value={newEmployeeForm.lastName || ''}
                onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, lastName: e.target.value })}
                style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '13px', outline: 'none' }}
              />
            </div>
          </div>

          {/* Email & Phone Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '4px', color: '#334155' }}>Work Email (Login ID) *</label>
              <input
                type="email"
                required
                placeholder="rahul@company.com"
                value={newEmployeeForm.email || ''}
                onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, email: e.target.value })}
                style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '13px', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '4px', color: '#334155' }}>Phone Number</label>
              <input
                type="text"
                placeholder="+91 99999 99999"
                value={newEmployeeForm.phone || ''}
                onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, phone: e.target.value })}
                style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '13px', outline: 'none' }}
              />
            </div>
          </div>

          {/* Role & Department Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '4px', color: '#334155' }}>Access Role Type</label>
              <select
                value={newEmployeeForm.role || 'employee'}
                onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, role: e.target.value })}
                style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '13px', background: '#ffffff', outline: 'none' }}
              >
                <option value="employee">Standard Employee (Portal Only)</option>
                <option value="agent">Field Agent / Support Staff</option>
                <option value="manager">Operations Manager</option>
                <option value="hr_accountant">HR & Accountant Lead</option>
                <option value="admin">Company Owner / Admin</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '4px', color: '#334155' }}>Department</label>
              <select
                value={newEmployeeForm.department || 'Sales'}
                onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, department: e.target.value })}
                style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '13px', background: '#ffffff', outline: 'none' }}
              >
                {(systemDropdowns?.departments || ['Sales', 'IT & Engineering', 'Field Operations', 'HR & Administration', 'Finance']).map((dept, idx) => {
                  const deptName = typeof dept === 'object' && dept !== null ? dept.name : dept;
                  return (
                    <option key={deptName || idx} value={deptName}>{deptName}</option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Salary & Status Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '4px', color: '#334155' }}>
                Salary Base ({billingTenant?.plan?.price?.currency === 'INR' ? '₹' : '$'} / mo)
              </label>
              <input
                type="number"
                placeholder="e.g. 35000"
                value={newEmployeeForm.salary || ''}
                onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, salary: e.target.value })}
                style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '13px', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '4px', color: '#334155' }}>Employment Status</label>
              <select
                value={newEmployeeForm.status || 'active'}
                onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, status: e.target.value })}
                style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '13px', background: '#ffffff', outline: 'none' }}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
                <option value="on_leave">On Leave</option>
              </select>
            </div>
          </div>

          {/* 🔑 Employee Dashboard Login Password Section */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px', marginTop: '4px' }}>
            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Lock size={15} color="#0d9488" />
                <span style={{ fontSize: '12px', fontWeight: '800', color: '#0f2b26' }}>
                  {isEdit ? 'Reset Employee Login Password' : 'Employee Login Password'}
                </span>
              </div>
              <p style={{ fontSize: '11px', color: '#64748b', margin: 0, marginBottom: '10px' }}>
                {isEdit 
                  ? 'Enter a new password below to reset this employee’s dashboard login password (or leave blank to keep current).'
                  : 'Set password for the employee to log in to the Workspace Dashboard with their Work Email.'}
              </p>

              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={isEdit ? 'Leave blank to keep existing password' : 'Enter login password (min 6 chars)'}
                  value={newEmployeeForm.password || ''}
                  onChange={(e) => setNewEmployeeForm({ ...newEmployeeForm, password: e.target.value, createLoginAccount: true })}
                  style={{ padding: '9px 38px 9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '13px', outline: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          {/* Modal Footer Buttons */}
          <div className="modal-buttons" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowAddEmployeeModal(false)}
              style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '13px', fontWeight: '600', color: '#64748b', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: '9px 20px', borderRadius: '8px', background: 'linear-gradient(135deg, #0d9488 0%, #064e43 100%)', color: '#ffffff', border: 'none', fontWeight: '800', fontSize: '13px', boxShadow: '0 2px 8px rgba(13, 148, 136, 0.25)', cursor: 'pointer' }}
              disabled={isEmployeesLoading}
            >
              {isEmployeesLoading ? 'Saving...' : (isEdit ? 'Save Profile' : 'Add Employee & Create Login')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
