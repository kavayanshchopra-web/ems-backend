import React from 'react';
import { X } from 'lucide-react';

export default function AddNoticeModal({
  showAddNoticeModal,
  setShowAddNoticeModal,
  handleSaveNotice,
  newNoticeForm,
  setNewNoticeForm
}) {
  if (!showAddNoticeModal) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel" style={{ maxWidth: '450px', color: '#0f2b26' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '800' }}>Publish Corporate Announcement</h2>
          <X size={18} style={{ cursor: 'pointer', color: 'var(--text-dim)' }} onClick={() => setShowAddNoticeModal(false)} />
        </div>
        <form onSubmit={handleSaveNotice} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="crm-group">
            <label className="crm-label">Announcement Title</label>
            <input className="crm-input" type="text" required value={newNoticeForm.title} onChange={e => setNewNoticeForm({ ...newNoticeForm, title: e.target.value })} />
          </div>
          <div className="crm-group">
            <label className="crm-label">Content Description</label>
            <textarea className="crm-textarea" required value={newNoticeForm.content} onChange={e => setNewNoticeForm({ ...newNoticeForm, content: e.target.value })} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: '12px' }}>Publish Notice</button>
        </form>
      </div>
    </div>
  );
}
