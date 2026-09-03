import React, { useState, useEffect } from 'react';
import { Phone, PhoneCall, PhoneOff, Delete, User, Sparkles, Smartphone, CheckCircle2, Clock, Calendar, AlertCircle } from 'lucide-react';

export default function ClickToCallModal({
  showClickToCallModal,
  setShowClickToCallModal,
  activeCallStatus = 'idle',
  clickToCallLead = { name: 'Direct Dial', phone: '' },
  setClickToCallLead,
  initiateClickToCall,
  activeCallDuration = 0,
  endClickToCall,
  contacts = [],
  showToast
}) {
  const [dialNumber, setDialNumber] = useState(clickToCallLead.phone || '');
  const [leadName, setLeadName] = useState(clickToCallLead.name || 'Customer');
  const [simSlot, setSimSlot] = useState('SIM 1 (Work)');
  const [callNotes, setCallNotes] = useState('');

  useEffect(() => {
    if (clickToCallLead.phone) {
      setDialNumber(clickToCallLead.phone);
    }
    if (clickToCallLead.name) {
      setLeadName(clickToCallLead.name);
    }
  }, [clickToCallLead]);

  if (!showClickToCallModal) return null;

  const handleKeyPress = (num) => {
    setDialNumber(prev => (prev || '') + String(num));
  };

  const handleBackspace = () => {
    setDialNumber(prev => (prev || '').slice(0, -1));
  };

  const handleStartCall = () => {
    if (!dialNumber.trim()) {
      if (showToast) showToast('Please enter a phone number to dial', 'error');
      return;
    }
    if (initiateClickToCall) {
      initiateClickToCall(leadName || 'Direct Dial Lead', dialNumber.trim());
    }
  };

  const keys = [
    { num: '1', sub: '' },
    { num: '2', sub: 'ABC' },
    { num: '3', sub: 'DEF' },
    { num: '4', sub: 'GHI' },
    { num: '5', sub: 'JKL' },
    { num: '6', sub: 'MNO' },
    { num: '7', sub: 'PQRS' },
    { num: '8', sub: 'TUV' },
    { num: '9', sub: 'WXYZ' },
    { num: '*', sub: '' },
    { num: '0', sub: '+' },
    { num: '#', sub: '' }
  ];

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      width: '350px',
      maxWidth: '92vw',
      background: '#0f172a',
      borderRadius: '20px',
      border: '1.5px solid #1e293b',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 20px rgba(13, 148, 136, 0.15)',
      padding: '22px',
      color: '#ffffff',
      zIndex: 99999,
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #1e293b', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            background: activeCallStatus === 'connected' ? '#10b981' : activeCallStatus === 'ringing' ? '#f59e0b' : '#0d9488',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Smartphone size={15} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '800', color: '#f8fafc' }}>
              {activeCallStatus === 'idle' ? 'SIM Lead Keypad' : 'Live SIM Call'}
            </div>
            <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>
              {activeCallStatus === 'idle' ? simSlot : activeCallStatus === 'ringing' ? 'Connecting Leg...' : 'Call In-Progress'}
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowClickToCallModal(false)}
          style={{
            background: '#1e293b',
            border: 'none',
            color: '#94a3b8',
            width: '26px',
            height: '26px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ✕
        </button>
      </div>

      {/* STATE 1: IDLE KEYPAD MODE */}
      {activeCallStatus === 'idle' && (
        <div>
          {/* Contact Name & Number Screen */}
          <div style={{
            background: '#1e293b',
            borderRadius: '14px',
            padding: '12px 14px',
            marginBottom: '16px',
            border: '1px solid #334155'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <User size={12} style={{ color: '#0d9488' }} />
              <input
                type="text"
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
                placeholder="Lead / Customer Name"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '11.5px',
                  fontWeight: '600',
                  outline: 'none',
                  width: '100%'
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <input
                type="text"
                value={dialNumber}
                onChange={(e) => setDialNumber(e.target.value)}
                placeholder="Enter phone number..."
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#38bdf8',
                  fontSize: '20px',
                  fontWeight: '800',
                  fontFamily: 'monospace',
                  letterSpacing: '1px',
                  outline: 'none',
                  width: '100%'
                }}
              />

              {dialNumber && (
                <button
                  type="button"
                  onClick={handleBackspace}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Backspace"
                >
                  <Delete size={18} />
                </button>
              )}
            </div>
          </div>

          {/* 12-Key Dialpad Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            marginBottom: '16px'
          }}>
            {keys.map((k) => (
              <button
                key={k.num}
                type="button"
                onClick={() => handleKeyPress(k.num)}
                style={{
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  padding: '10px 0',
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                  userSelect: 'none'
                }}
                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <span style={{ fontSize: '18px', fontWeight: '800', lineHeight: 1 }}>{k.num}</span>
                {k.sub && <span style={{ fontSize: '8.5px', color: '#64748b', fontWeight: '700', marginTop: '3px' }}>{k.sub}</span>}
              </button>
            ))}
          </div>

          {/* Action Row */}
          <button
            type="button"
            onClick={handleStartCall}
            disabled={!dialNumber.trim()}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              border: 'none',
              background: dialNumber.trim() ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#334155',
              color: '#ffffff',
              fontSize: '13.5px',
              fontWeight: '800',
              cursor: dialNumber.trim() ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: dialNumber.trim() ? '0 4px 14px rgba(16, 185, 129, 0.4)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <PhoneCall size={16} />
            <span>Call via SIM Companion</span>
          </button>
        </div>
      )}

      {/* STATE 2: RINGING / CONNECTED / IN-CALL MODE */}
      {(activeCallStatus === 'ringing' || activeCallStatus === 'connected' || activeCallStatus === 'ended') && (
        <div>
          {/* Avatar & Target Lead */}
          <div style={{ textAlign: 'center', marginBottom: '18px' }}>
            <div style={{
              width: '58px',
              height: '58px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0d9488 0%, #059669 100%)',
              color: 'white',
              fontWeight: '900',
              fontSize: '22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 10px auto',
              boxShadow: '0 4px 16px rgba(13, 148, 136, 0.5)',
              border: '2px solid rgba(255,255,255,0.2)'
            }}>
              {(clickToCallLead.name || leadName || 'C').charAt(0).toUpperCase()}
            </div>

            <div style={{ fontWeight: '800', fontSize: '16px', color: '#f8fafc' }}>
              {clickToCallLead.name || leadName}
            </div>

            <div style={{ fontSize: '13px', color: '#38bdf8', marginTop: '2px', fontWeight: '700', fontFamily: 'monospace' }}>
              {clickToCallLead.phone || dialNumber}
            </div>

            {activeCallStatus === 'ringing' && (
              <div style={{ marginTop: '8px' }}>
                <div style={{ fontSize: '12px', color: '#fbbf24', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fbbf24', animation: 'pulse 1.5s infinite' }}></span>
                  <span>Ringing customer SIM phone...</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const clean = String(clickToCallLead.phone || dialNumber).replace(/[^0-9+]/g, '');
                    if (window.AndroidApp && typeof window.AndroidApp.makeDirectCall === 'function') {
                      window.AndroidApp.makeDirectCall(clean);
                    } else if (window.OmniFlowNative && typeof window.OmniFlowNative.makeDirectCall === 'function') {
                      window.OmniFlowNative.makeDirectCall(clean);
                    } else {
                      window.location.href = `tel:${clean}`;
                    }
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    color: '#38bdf8',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  <Phone size={12} />
                  <span>Direct Dial SIM (Native)</span>
                </button>
              </div>
            )}

            {activeCallStatus === 'connected' && (
              <div style={{ fontSize: '24px', fontWeight: '900', color: '#10b981', marginTop: '8px', fontFamily: 'monospace' }}>
                {Math.floor(activeCallDuration / 60)}:{(activeCallDuration % 60).toString().padStart(2, '0')}
              </div>
            )}
          </div>

          {/* Disposition Controls on Connected Call */}
          {activeCallStatus === 'connected' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8' }}>
                Select Call Disposition to Save & Log:
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => endClickToCall('Interested', callNotes || 'Customer showed high interest')}
                  style={{
                    background: '#059669',
                    color: 'white',
                    border: 'none',
                    padding: '9px 8px',
                    borderRadius: '8px',
                    fontSize: '11.5px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <CheckCircle2 size={12} /> Interested
                </button>

                <button
                  type="button"
                  onClick={() => endClickToCall('Demo Scheduled', callNotes || 'Product demo booked')}
                  style={{
                    background: '#2563eb',
                    color: 'white',
                    border: 'none',
                    padding: '9px 8px',
                    borderRadius: '8px',
                    fontSize: '11.5px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <Calendar size={12} /> Demo Scheduled
                </button>

                <button
                  type="button"
                  onClick={() => endClickToCall('Follow-up Required', callNotes || 'Requested callback')}
                  style={{
                    background: '#d97706',
                    color: 'white',
                    border: 'none',
                    padding: '9px 8px',
                    borderRadius: '8px',
                    fontSize: '11.5px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <Clock size={12} /> Follow-up
                </button>

                <button
                  type="button"
                  onClick={() => endClickToCall('Not Interested', callNotes || 'Lead not interested')}
                  style={{
                    background: '#dc2626',
                    color: 'white',
                    border: 'none',
                    padding: '9px 8px',
                    borderRadius: '8px',
                    fontSize: '11.5px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <AlertCircle size={12} /> Not Interested
                </button>
              </div>

              {/* Quick End Call Button */}
              <button
                type="button"
                onClick={() => endClickToCall('Completed', callNotes || 'Call completed')}
                style={{
                  width: '100%',
                  marginTop: '4px',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #dc2626',
                  background: 'rgba(220, 38, 38, 0.15)',
                  color: '#ef4444',
                  fontSize: '12px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <PhoneOff size={14} />
                <span>Hang Up & Log Call</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
