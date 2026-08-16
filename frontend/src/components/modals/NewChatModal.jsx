import React from 'react';
import { X } from 'lucide-react';

export default function NewChatModal({
  showNewChatModal,
  setShowNewChatModal,
  handleStartNewChat,
  newChatError,
  newChatPhone,
  setNewChatPhone,
  newChatName,
  setNewChatName,
  newChatSessionId,
  setNewChatSessionId,
  sessions,
  newChatInitialMsg,
  setNewChatInitialMsg,
  isCreatingNewChat
}) {
  if (!showNewChatModal) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel" style={{ maxWidth: '440px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Start New Chat</h2>
          <X size={18} style={{ cursor: 'pointer', color: 'var(--text-dim)' }} onClick={() => setShowNewChatModal(false)} />
        </div>

        <form onSubmit={handleStartNewChat} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {newChatError && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '10px 12px', borderRadius: '8px', color: '#f87171', fontSize: '12px' }}>
              {newChatError}
            </div>
          )}

          <div className="crm-group">
            <label className="crm-label">Phone Number (with Country Code)</label>
            <input
              type="text"
              className="modal-input"
              placeholder="e.g. 917986411005"
              value={newChatPhone}
              onChange={(e) => setNewChatPhone(e.target.value)}
              required
              autoFocus
            />
            <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>Type numbers only without spaces or + (e.g. 91 for India, 1 for USA).</span>
          </div>

          <div className="crm-group">
            <label className="crm-label">Lead Name (Optional)</label>
            <input
              type="text"
              className="modal-input"
              placeholder="e.g. Sahil Veera"
              value={newChatName}
              onChange={(e) => setNewChatName(e.target.value)}
            />
          </div>

          <div className="crm-group">
            <label className="crm-label">Send From Account</label>
            <select
              className="crm-select"
              style={{ width: '100%', height: '38px', padding: '6px 12px' }}
              value={newChatSessionId}
              onChange={(e) => setNewChatSessionId(e.target.value)}
              required
            >
              {sessions.filter(s => s.status === 'connected').length === 0 ? (
                <option value="">No connected accounts found</option>
              ) : (
                sessions.filter(s => s.status === 'connected').map(s => (
                  <option key={s.id} value={s.id}>{s.phone_name} (+{s.phone_number})</option>
                ))
              )}
            </select>
          </div>

          <div className="crm-group">
            <label className="crm-label">Initial Message (Optional)</label>
            <textarea
              className="modal-input"
              style={{ height: '70px', resize: 'none', padding: '8px 12px' }}
              placeholder="e.g. Hello, welcome to our business..."
              value={newChatInitialMsg}
              onChange={(e) => setNewChatInitialMsg(e.target.value)}
            />
          </div>

          <div className="modal-buttons" style={{ marginTop: '8px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowNewChatModal(false)} disabled={isCreatingNewChat}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isCreatingNewChat}>
              {isCreatingNewChat ? 'Verifying on WhatsApp...' : 'Start Chat'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
