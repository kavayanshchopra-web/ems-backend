import React from 'react';

export default function ClickToCallModal({
  showClickToCallModal,
  setShowClickToCallModal,
  activeCallStatus,
  clickToCallLead,
  activeCallDuration,
  endClickToCall
}) {
  if (!showClickToCallModal) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      width: '320px',
      background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)',
      borderRadius: '16px',
      border: '1px solid #334155',
      boxShadow: '0 20px 40px rgba(0,0,0,0.35)',
      padding: '20px',
      color: '#ffffff',
      zIndex: 9999
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: activeCallStatus === 'connected' ? '#10b981' : '#f59e0b', display: 'inline-block' }}></span>
          <span style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.5px', color: '#94a3b8', textTransform: 'uppercase' }}>
            {activeCallStatus === 'ringing' ? '📞 Ringing SIM Call...' : activeCallStatus === 'connected' ? '🟢 Call In-Progress' : '🔴 Call Ended'}
          </span>
        </div>
        <button onClick={() => setShowClickToCallModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '16px', cursor: 'pointer' }}>✕</button>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '18px' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, #0d9488 0%, #059669 100%)', color: 'white', fontWeight: '900', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px auto', boxShadow: '0 4px 14px rgba(13, 148, 136, 0.4)' }}>
          {clickToCallLead.name.charAt(0)}
        </div>
        <div style={{ fontWeight: '800', fontSize: '16px', color: '#f8fafc' }}>{clickToCallLead.name}</div>
        <div style={{ fontSize: '13px', color: '#38bdf8', marginTop: '2px', fontWeight: '700' }}>{clickToCallLead.phone}</div>
        
        {activeCallStatus === 'connected' && (
          <div style={{ fontSize: '22px', fontWeight: '900', color: '#10b981', marginTop: '8px' }}>
            {Math.floor(activeCallDuration / 60)}:{(activeCallDuration % 60).toString().padStart(2, '0')}
          </div>
        )}
      </div>

      {activeCallStatus === 'connected' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8' }}>Select Call Disposition & Hangup:</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button onClick={() => endClickToCall('Interested', 'Lead interested in pricing')} style={{ background: '#059669', color: 'white', border: 'none', padding: '8px', borderRadius: '8px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}>
              🟢 Interested
            </button>
            <button onClick={() => endClickToCall('Demo Scheduled', 'Product demo scheduled')} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '8px', borderRadius: '8px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}>
              📅 Demo Scheduled
            </button>
            <button onClick={() => endClickToCall('Follow-up Required', 'Callback requested')} style={{ background: '#d97706', color: 'white', border: 'none', padding: '8px', borderRadius: '8px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}>
              ⏳ Follow-up
            </button>
            <button onClick={() => endClickToCall('Not Interested', 'Lead not interested')} style={{ background: '#dc2626', color: 'white', border: 'none', padding: '8px', borderRadius: '8px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}>
              🔴 Not Interested
            </button>
          </div>
        </div>
      )}

      {activeCallStatus === 'ringing' && (
        <div style={{ textAlign: 'center', fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
          Ringing customer SIM phone line via OmniFlow Gateway...
        </div>
      )}
    </div>
  );
}
