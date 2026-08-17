import React from 'react';
import { Plus, RefreshCw, Check, Trash2, Smartphone } from 'lucide-react';

export default function ChannelsPage({
  sessions = [],
  setShowAddSessionModal,
  handleStartSession,
  handleStopSession,
  handleDeleteSession
}) {
  return (
    <div className="channels-grid channels-tab-panel">
      {(sessions || []).map(sess => (
        <div key={sess.id} className="channel-card glass-panel">
          <div className="channel-status-indicator">
            <span className={`status-dot ${sess.status}`}></span>
            <span style={{ textTransform: 'capitalize', color: 'var(--text-muted)' }}>{(sess.status || '').replace('_', ' ')}</span>
          </div>

          <div className="avatar-wrapper" style={{ margin: '8px 0', display: 'flex', justifyContent: 'center' }}>
            {sess.profile_pic_url ? (
              <img
                src={sess.profile_pic_url}
                alt={sess.phone_name}
                style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.1)' }}
              />
            ) : (
              <div className="avatar" style={{ width: '64px', height: '64px', fontSize: '24px' }}>
                {(sess.phone_name || 'WA').substring(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          <h3 style={{ fontSize: '16px', fontWeight: '700' }}>{sess.phone_name || 'WhatsApp Account'}</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {sess.phone_number ? `+${sess.phone_number}` : 'No phone connected'}
          </p>

          {sess.status === 'qr_ready' && sess.qr_code ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '16px 0' }}>
              <div className="channel-qr-container" style={{ background: 'white', padding: '12px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <img src={sess.qr_code} alt="WhatsApp Link QR Code" style={{ width: '180px', height: '180px', objectFit: 'contain' }} />
              </div>
              <p style={{ fontSize: '12px', color: '#0d9488', fontWeight: '700', marginTop: '10px', textAlign: 'center' }}>
                Scan this QR code from your phone's WhatsApp ➔ Linked Devices
              </p>
            </div>
          ) : sess.status === 'connecting' ? (
            <div style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <RefreshCw size={24} className="spin" style={{ color: '#0d9488' }} />
              <p style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Generating WhatsApp QR Code...</p>
            </div>
          ) : sess.status === 'connected' ? (
            <div style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div style={{ background: '#dcfce7', padding: '10px', borderRadius: '50%' }}>
                <Check size={24} style={{ color: '#16a34a' }} />
              </div>
              <p style={{ fontSize: '13px', color: '#16a34a', fontWeight: '700' }}>WhatsApp Connected Live</p>
            </div>
          ) : (
            <div style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <p style={{ fontSize: '12px', color: '#64748b' }}>Account disconnected or ready to pair</p>
              <button
                type="button"
                style={{ padding: '8px 16px', fontSize: '12px', fontWeight: '700', background: 'linear-gradient(135deg, #0d9488, #0f766e)', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => handleStartSession && handleStartSession(sess.id)}
              >
                📱 Generate QR Code to Connect
              </button>
            </div>
          )}

          <div style={{ marginTop: 'auto', display: 'flex', gap: '8px', width: '100%', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            {sess.status !== 'disconnected' && (
              <button className="btn btn-secondary" style={{ flexGrow: 1, padding: '6px', fontSize: '11px' }} onClick={() => handleStopSession && handleStopSession(sess.id)}>
                Disconnect
              </button>
            )}
            <button className="btn btn-danger" style={{ padding: '6px 10px' }} onClick={() => handleDeleteSession && handleDeleteSession(sess.id)}>
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      ))}

      {(!sessions || sessions.length === 0) && (
        <div className="glass-panel" style={{ gridColumn: '1 / -1', padding: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', justifyContent: 'center', color: 'var(--text-dim)' }}>
          <Smartphone size={48} strokeWidth={1} />
          <h3>No channels connected</h3>
          <p style={{ fontSize: '13px' }}>Click "Add Channel" in the top right to link your first WhatsApp number.</p>
          <button className="btn btn-primary" onClick={() => setShowAddSessionModal && setShowAddSessionModal(true)}>
            <Plus size={16} /> Add First Channel
          </button>
        </div>
      )}
    </div>
  );
}
