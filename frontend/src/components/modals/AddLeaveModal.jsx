import React from 'react';
import { X } from 'lucide-react';

export default function AddLeaveModal({
  showAddLeaveModal,
  setShowAddLeaveModal,
  handleSaveLeave,
  newLeaveForm,
  setNewLeaveForm
}) {
  if (!showAddLeaveModal) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel" style={{ maxWidth: '400px', color: '#0f2b26' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '800' }}>File Leave Request</h2>
          <X size={18} style={{ cursor: 'pointer', color: 'var(--text-dim)' }} onClick={() => setShowAddLeaveModal(false)} />
        </div>
        <form onSubmit={handleSaveLeave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="crm-group">
              <label className="crm-label">Start Date</label>
              <input className="crm-input" type="date" required value={newLeaveForm.startDate} onChange={e => setNewLeaveForm({ ...newLeaveForm, startDate: e.target.value })} />
            </div>
            <div className="crm-group">
              <label className="crm-label">End Date</label>
              <input className="crm-input" type="date" required value={newLeaveForm.endDate} onChange={e => setNewLeaveForm({ ...newLeaveForm, endDate: e.target.value })} />
            </div>
          </div>
          <div className="crm-group">
            <label className="crm-label">Leave Type</label>
            <select className="crm-select" value={newLeaveForm.type} onChange={e => setNewLeaveForm({ ...newLeaveForm, type: e.target.value })}>
              <option value="Sick">Sick Leave</option>
              <option value="Casual">Casual Leave</option>
              <option value="Annual">Annual Leave</option>
            </select>
          </div>
          <div className="crm-group">
            <label className="crm-label">Reason</label>
            <textarea className="crm-textarea" required value={newLeaveForm.reason} onChange={e => setNewLeaveForm({ ...newLeaveForm, reason: e.target.value })} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: '12px' }}>File Application</button>
        </form>
      </div>
    </div>
  );
}
