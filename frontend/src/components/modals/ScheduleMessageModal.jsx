import React from 'react';
import { X } from 'lucide-react';

export default function ScheduleMessageModal({
  showScheduleModal,
  setShowScheduleModal,
  handleScheduleMessage,
  scheduleDateTime,
  setScheduleDateTime,
  scheduleMessageText,
  setScheduleMessageText
}) {
  if (!showScheduleModal) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel" style={{ maxWidth: '440px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Schedule WhatsApp Message</h2>
          <X size={18} style={{ cursor: 'pointer', color: 'var(--text-dim)' }} onClick={() => setShowScheduleModal(false)} />
        </div>

        <form onSubmit={handleScheduleMessage} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Set a specific date and time for this message to be sent automatically by the server.
          </p>

          <div className="crm-group">
            <label className="crm-label">Scheduled Date & Time</label>
            <input
              type="datetime-local"
              className="modal-input"
              value={scheduleDateTime}
              onChange={(e) => setScheduleDateTime(e.target.value)}
              required
            />
          </div>

          <div className="crm-group">
            <label className="crm-label">Message Content</label>
            <textarea
              className="modal-input"
              style={{ height: '110px', resize: 'none', padding: '8px 12px' }}
              placeholder="Type message content here..."
              value={scheduleMessageText}
              onChange={(e) => setScheduleMessageText(e.target.value)}
              required
            />
          </div>

          <div className="modal-buttons" style={{ marginTop: '8px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowScheduleModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Schedule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
