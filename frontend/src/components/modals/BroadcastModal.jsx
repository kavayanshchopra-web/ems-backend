import React from 'react';
import { X } from 'lucide-react';

export default function BroadcastModal({
  showBroadcastModal,
  setShowBroadcastModal,
  broadcastProgress,
  handleSendBroadcast,
  broadcastStage,
  setBroadcastStage,
  contacts,
  stages,
  broadcastSessionId,
  setBroadcastSessionId,
  sessions,
  broadcastMessage,
  setBroadcastMessage
}) {
  if (!showBroadcastModal) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel" style={{ maxWidth: '460px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Send Broadcast Message</h2>
          <X size={18} style={{ cursor: 'pointer', color: 'var(--text-dim)' }} onClick={() => {
            if (broadcastProgress && broadcastProgress.status === 'sending') {
              alert('Broadcast is in progress. Please wait for it to complete.');
              return;
            }
            setShowBroadcastModal(false);
          }} />
        </div>

        {broadcastProgress ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '10px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '600' }}>
              <span>{broadcastProgress.status === 'completed' ? 'Broadcast Completed!' : 'Sending Broadcast...'}</span>
              <span>{broadcastProgress.current} / {broadcastProgress.total}</span>
            </div>

            {/* Progress bar */}
            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${(broadcastProgress.current / broadcastProgress.total) * 100}%`, height: '100%', background: 'var(--color-primary)', transition: 'width 0.3s ease' }}></div>
            </div>

            {broadcastProgress.status === 'sending' && (
              <p style={{ fontSize: '12px', color: 'var(--text-dim)', fontStyle: 'italic', textAlign: 'center' }}>
                Please do not close this modal or refresh the page while campaign is sending. Adding 2-4 seconds delay between messages to prevent account bans.
              </p>
            )}

            {broadcastProgress.status === 'completed' && (
              <div className="modal-buttons" style={{ marginTop: '10px' }}>
                <button className="btn btn-primary" onClick={() => setShowBroadcastModal(false)}>
                  Close Progress
                </button>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSendBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Send a bulk message to multiple leads at once. A randomized delay is automatically added to simulate human behavior and protect your accounts.
            </p>

            <div className="crm-group">
              <label className="crm-label">Target Lead Stage</label>
              <select
                className="crm-select"
                style={{ width: '100%', height: '38px', padding: '6px 12px' }}
                value={broadcastStage}
                onChange={(e) => setBroadcastStage(e.target.value)}
                required
              >
                <option value="all">All Synced Leads ({contacts.length} contacts)</option>
                {stages.map(s => (
                  <option key={s.id} value={s.id}>{s.title} ({contacts.filter(c => c.pipeline_stage === s.id).length} contacts)</option>
                ))}
              </select>
            </div>

            <div className="crm-group">
              <label className="crm-label">Send From Account</label>
              <select
                className="crm-select"
                style={{ width: '100%', height: '38px', padding: '6px 12px' }}
                value={broadcastSessionId}
                onChange={(e) => setBroadcastSessionId(e.target.value)}
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
              <label className="crm-label">Broadcast Message Text</label>
              <textarea
                className="modal-input"
                style={{ height: '110px', resize: 'none', padding: '8px 12px' }}
                placeholder="e.g. Hello, hope you are doing well! We have a special discount for you today..."
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                required
              />
            </div>

            <div className="modal-buttons" style={{ marginTop: '8px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowBroadcastModal(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={sessions.filter(s => s.status === 'connected').length === 0}>
                Link & Send Campaign
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
