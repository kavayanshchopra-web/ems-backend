import React from 'react';
import { X } from 'lucide-react';

export default function AddSessionModal({
  showAddSessionModal,
  setShowAddSessionModal,
  handleCreateSession,
  newSessionName,
  setNewSessionName
}) {
  if (!showAddSessionModal) return null;

  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (handleCreateSession) {
      handleCreateSession(e);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px' }}>Add WhatsApp Channel</h2>
          <X size={18} style={{ cursor: 'pointer', color: 'var(--text-dim)' }} onClick={() => setShowAddSessionModal(false)} />
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Enter a custom display name to identify this WhatsApp account (e.g., "Main Business", "Sales Account").
          </p>
          <input
            type="text"
            className="modal-input"
            placeholder="e.g. Sales WhatsApp"
            value={newSessionName || ''}
            onChange={(e) => setNewSessionName && setNewSessionName(e.target.value)}
            required
            autoFocus
          />
          <div className="modal-buttons">
            <button type="button" className="btn btn-secondary" onClick={() => setShowAddSessionModal(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSubmit}>
              Create & Link
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
