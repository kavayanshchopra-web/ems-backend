import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneCall, PhoneOff, X, User, Hash, Clock, Volume2, ShieldCheck, Activity, Smartphone, Laptop, Settings } from 'lucide-react';

export default function VoxbayCloudDialerModal({
  isOpen,
  onClose,
  initialNumber = '',
  initialName = '',
  currentStaff = { id: '1', name: 'Agent' },
  onCallLogged,
  showToast
}) {
  const [phoneNumber, setPhoneNumber] = useState(initialNumber || '');
  const [contactName, setContactName] = useState(initialName || '');
  const [callState, setCallState] = useState('IDLE'); // IDLE, DIALING, RINGING, CONNECTED, ENDED
  const [activeCallId, setActiveCallId] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  
  // Calling Mode: 'extension_to_mobile' or 'mobile_to_mobile'
  const [callingMode, setCallingMode] = useState('extension_to_mobile');
  const [extension, setExtension] = useState('111');
  const [agentMobile, setAgentMobile] = useState('6283513686');
  const [showConfig, setShowConfig] = useState(false);

  const timerRef = useRef(null);

  useEffect(() => {
    if (initialNumber) setPhoneNumber(initialNumber);
    if (initialName) setContactName(initialName);
  }, [initialNumber, initialName]);

  useEffect(() => {
    if (callState === 'CONNECTED') {
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  if (!isOpen) return null;

  const playDTMF = (digit) => {
    try {
      const dtmfFreqs = {
        '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
        '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
        '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
        '*': [941, 1209], '0': [941, 1336], '#': [941, 1477]
      };
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const freqs = dtmfFreqs[digit] || [700, 1200];
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.frequency.value = freqs[0];
      osc2.frequency.value = freqs[1];
      gain.gain.value = 0.08;

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      setTimeout(() => {
        osc1.stop();
        osc2.stop();
        ctx.close();
      }, 100);
    } catch (e) {}
  };

  const handleDigitClick = (digit) => {
    playDTMF(digit);
    setPhoneNumber(prev => prev + digit);
  };

  const handleInitiateCall = async () => {
    const cleanNumber = String(phoneNumber).replace(/[^\d+]/g, '');
    if (!cleanNumber || cleanNumber.length < 5) {
      if (showToast) showToast('Please enter a valid phone number', 'error');
      return;
    }

    setCallState('DIALING');
    setCallDuration(0);

    try {
      const response = await fetch('/api/calls/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: cleanNumber,
          contactName: contactName || 'Customer',
          callingMode,
          agentExtension: extension || '111',
          agentMobile: agentMobile || '6283513686',
          staffId: currentStaff?.id || '1',
          staffName: currentStaff?.name || 'Agent'
        })
      });

      const data = await response.json();
      if (data.success) {
        setActiveCallId(data.callId || data.providerCallId);
        setCallState('RINGING');
        if (showToast) {
          const msg = callingMode === 'mobile_to_mobile'
            ? `Calling Agent Mobile (${agentMobile}) -> Then Customer (${cleanNumber})`
            : `Ringing Softphone Ext ${extension} -> Then Customer (${cleanNumber})`;
          showToast(msg, 'success');
        }

        setTimeout(() => {
          setCallState('CONNECTED');
        }, 4000);
      } else {
        setCallState('IDLE');
        if (showToast) showToast(data.error || 'Failed to dispatch Voxbay call', 'error');
      }
    } catch (err) {
      setCallState('IDLE');
      if (showToast) showToast(`Call error: ${err.message}`, 'error');
    }
  };

  const handleHangup = async () => {
    try {
      await fetch('/api/calls/hangup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId: activeCallId })
      });
    } catch (e) {}

    setCallState('ENDED');
    if (showToast) showToast('Call terminated.', 'info');

    setTimeout(() => {
      setCallState('IDLE');
      if (onCallLogged) {
        onCallLogged({
          id: activeCallId || `call_${Date.now()}`,
          phone: phoneNumber,
          name: contactName,
          duration: `${Math.floor(callDuration / 60)}m ${callDuration % 60}s`,
          status: 'COMPLETED'
        });
      }
    }, 1500);
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const keyRows = [
    [{ digit: '1', sub: '' }, { digit: '2', sub: 'ABC' }, { digit: '3', sub: 'DEF' }],
    [{ digit: '4', sub: 'GHI' }, { digit: '5', sub: 'JKL' }, { digit: '6', sub: 'MNO' }],
    [{ digit: '7', sub: 'PQRS' }, { digit: '8', sub: 'TUV' }, { digit: '9', sub: 'WXYZ' }],
    [{ digit: '*', sub: '' }, { digit: '0', sub: '+' }, { digit: '#', sub: '' }]
  ];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(3, 7, 18, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '16px'
    }}>
      <div style={{
        background: '#0b1329',
        border: '1px solid rgba(20, 210, 203, 0.3)',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 35px rgba(20, 210, 203, 0.2)',
        overflow: 'hidden',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 18px',
          background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.25) 0%, rgba(15, 23, 42, 0.9) 100%)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(20, 210, 203, 0.2)',
              color: '#14d2cb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <PhoneCall size={18} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#ffffff' }}>
                Voxbay Cloud Dialer
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                DID: 918031496345 &bull; {callingMode === 'extension_to_mobile' ? `Ext: ${extension}` : `Agent Mobile: ${agentMobile}`}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setShowConfig(prev => !prev)}
              style={{
                background: showConfig ? 'rgba(20, 210, 203, 0.2)' : 'transparent',
                border: 'none',
                color: showConfig ? '#14d2cb' : '#94a3b8',
                cursor: 'pointer',
                padding: '5px',
                borderRadius: '6px'
              }}
              title="Calling Settings"
            >
              <Settings size={17} />
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '6px'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          padding: '8px 16px 0 16px',
          gap: '8px'
        }}>
          <button
            type="button"
            onClick={() => setCallingMode('extension_to_mobile')}
            style={{
              padding: '8px 6px',
              borderRadius: '8px',
              border: callingMode === 'extension_to_mobile' ? '1px solid #14d2cb' : '1px solid rgba(255, 255, 255, 0.08)',
              background: callingMode === 'extension_to_mobile' ? 'rgba(20, 210, 203, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              color: callingMode === 'extension_to_mobile' ? '#14d2cb' : '#94a3b8',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Laptop size={13} />
            <span>Softphone (Ext 111)</span>
          </button>
          <button
            type="button"
            onClick={() => setCallingMode('mobile_to_mobile')}
            style={{
              padding: '8px 6px',
              borderRadius: '8px',
              border: callingMode === 'mobile_to_mobile' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
              background: callingMode === 'mobile_to_mobile' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              color: callingMode === 'mobile_to_mobile' ? '#38bdf8' : '#94a3b8',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Smartphone size={13} />
            <span>Agent Mobile</span>
          </button>
        </div>

        {/* Optional Quick Config Box */}
        {showConfig && (
          <div style={{
            margin: '8px 16px 0 16px',
            padding: '10px 12px',
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(20, 210, 203, 0.25)',
            borderRadius: '10px',
            fontSize: '11.5px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {callingMode === 'mobile_to_mobile' ? (
              <div>
                <label style={{ display: 'block', color: '#94a3b8', marginBottom: '3px', fontWeight: '600' }}>
                  Agent Mobile Number (Leg 1):
                </label>
                <input
                  type="text"
                  value={agentMobile}
                  onChange={(e) => setAgentMobile(e.target.value)}
                  placeholder="e.g. 6283513686"
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '12px',
                    outline: 'none'
                  }}
                />
              </div>
            ) : (
              <div>
                <label style={{ display: 'block', color: '#94a3b8', marginBottom: '3px', fontWeight: '600' }}>
                  Softphone SIP Extension (Leg 1):
                </label>
                <input
                  type="text"
                  value={extension}
                  onChange={(e) => setExtension(e.target.value)}
                  placeholder="e.g. 111"
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '12px',
                    outline: 'none'
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* In-Call Active HUD */}
        {callState !== 'IDLE' && (
          <div style={{
            margin: '10px 16px 0 16px',
            padding: '14px 16px',
            borderRadius: '12px',
            background: callState === 'CONNECTED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(56, 189, 248, 0.15)',
            border: `1px solid ${callState === 'CONNECTED' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(56, 189, 248, 0.3)'}`,
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '11px',
              fontWeight: '800',
              color: callState === 'CONNECTED' ? '#34d399' : '#38bdf8',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '3px'
            }}>
              {callState === 'DIALING' && '🚀 Dispatching 2-Leg Telephony...'}
              {callState === 'RINGING' && (callingMode === 'mobile_to_mobile' ? `🔔 Ringing Agent (${agentMobile})...` : `🔔 Ringing Softphone (Ext ${extension})...`)}
              {callState === 'CONNECTED' && '🟢 Live Call Connected'}
              {callState === 'ENDED' && '🔴 Call Terminated'}
            </div>
            <div style={{ fontSize: '18px', fontWeight: '900', color: '#ffffff' }}>
              {contactName || phoneNumber}
            </div>
            {callState === 'CONNECTED' && (
              <div style={{ fontSize: '22px', fontWeight: '900', color: '#14d2cb', marginTop: '4px', fontFamily: 'monospace' }}>
                {formatTimer(callDuration)}
              </div>
            )}
          </div>
        )}

        {/* Input Area */}
        <div style={{ padding: '12px 16px 6px 16px' }}>
          {contactName && (
            <div style={{ fontSize: '11.5px', color: '#94a3b8', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <User size={12} />
              <span>{contactName}</span>
            </div>
          )}
          <div style={{
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '12px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Enter Customer Number..."
              disabled={callState !== 'IDLE'}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                fontSize: '18px',
                fontWeight: '800',
                outline: 'none',
                width: '100%',
                letterSpacing: '1px'
              }}
            />
            {phoneNumber && callState === 'IDLE' && (
              <button
                type="button"
                onClick={() => setPhoneNumber(prev => prev.slice(0, -1))}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '700'
                }}
              >
                ⌫
              </button>
            )}
          </div>
        </div>

        {/* Dialpad Keys */}
        <div style={{ padding: '6px 16px 14px 16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {keyRows.flat().map((k, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleDigitClick(k.digit)}
              disabled={callState !== 'IDLE' && callState !== 'CONNECTED'}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '10px 0',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(20, 210, 203, 0.15)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}
            >
              <span style={{ fontSize: '17px', fontWeight: '800', lineHeight: 1 }}>{k.digit}</span>
              {k.sub && <span style={{ fontSize: '9px', color: '#94a3b8', marginTop: '2px', fontWeight: '600' }}>{k.sub}</span>}
            </button>
          ))}
        </div>

        {/* Action Button */}
        <div style={{ padding: '0 16px 16px 16px' }}>
          {callState === 'IDLE' ? (
            <button
              type="button"
              onClick={handleInitiateCall}
              style={{
                width: '100%',
                padding: '13px 0',
                borderRadius: '12px',
                background: callingMode === 'mobile_to_mobile'
                  ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
                  : 'linear-gradient(135deg, #10b981 0%, #0d9488 100%)',
                border: 'none',
                color: '#ffffff',
                fontSize: '14.5px',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: callingMode === 'mobile_to_mobile'
                  ? '0 4px 15px rgba(2, 132, 199, 0.35)'
                  : '0 4px 15px rgba(16, 185, 129, 0.35)'
              }}
            >
              <PhoneCall size={17} />
              <span>{callingMode === 'mobile_to_mobile' ? 'Call via Agent Mobile' : 'Call via Softphone (Ext 111)'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleHangup}
              style={{
                width: '100%',
                padding: '13px 0',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                border: 'none',
                color: '#ffffff',
                fontSize: '14.5px',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 15px rgba(239, 68, 68, 0.35)'
              }}
            >
              <PhoneOff size={17} />
              <span>End Call (Hang Up)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}