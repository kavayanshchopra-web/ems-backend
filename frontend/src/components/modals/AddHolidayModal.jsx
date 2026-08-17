import React from 'react';
import { X } from 'lucide-react';

export default function AddHolidayModal({
  showAddHolidayModal,
  setShowAddHolidayModal,
  handleSaveHoliday,
  newHolidayForm,
  setNewHolidayForm
}) {
  if (!showAddHolidayModal) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel" style={{ maxWidth: '400px', color: '#0f2b26' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '800' }}>Add Scheduled Holiday</h2>
          <X size={18} style={{ cursor: 'pointer', color: 'var(--text-dim)' }} onClick={() => setShowAddHolidayModal(false)} />
        </div>
        <form onSubmit={handleSaveHoliday} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="crm-group">
            <label className="crm-label">Holiday Name</label>
            <input className="crm-input" type="text" required value={newHolidayForm.name} onChange={e => setNewHolidayForm({ ...newHolidayForm, name: e.target.value })} />
          </div>
          <div className="crm-group">
            <label className="crm-label">Scheduled Date</label>
            <input className="crm-input" type="date" required value={newHolidayForm.date} onChange={e => setNewHolidayForm({ ...newHolidayForm, date: e.target.value })} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: '12px' }}>Add Holiday</button>
        </form>
      </div>
    </div>
  );
}
