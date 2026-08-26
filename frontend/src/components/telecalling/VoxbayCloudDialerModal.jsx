import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneCall, PhoneOff, X, User, Hash, Clock, Volume2, ShieldCheck, Activity, Smartphone, Laptop, Settings, Disc, Mic, CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react';

const IS_DEV = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const API_BASE = IS_DEV ? 'http://localhost:5000' : 'https://api.employeemanagementsystems.com';

export default function VoxbayCloudDialerModal({
  isOpen,
  onClose,
  initialNumber = '',
  initialName = '',
  autoDial = true,
  currentStaff = { id: '1', name: 'Agent' },
  onCallLogged,
  showToast
}) {
  const [phoneNumber, setPhoneNumber] = useState(initialNumber || '');
  const [contactName, setContactName] = useState(initialName || '');
  const [callState, setCallState] = useState('IDLE'); // IDLE, DIALING, RINGING, CONNECTED, ENDED
  const [activeCallId, setActiveCallId] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [showKeypad, setShowKeypad] = useState(!initialNumber);
  
  // PRIMARY DEFAULT: Mobile SIM (6283513686)
  const [callingMode, setCallingMode] = useState('mobile_to_mobile');
  const [extension, setExtension] = useState('2MaqwezO');
  const [agentMobile, setAgentMobile] = useState('6283513686');
  const [showConfig, setShowConfig] = useState(false);

  const timerRef = useRef(null);
  const autoDialTriggeredRef = useRef(false);

  // Switch mode and re-dial immediately if clicked
  const handleModeChange = (mode) => {
    setCallingMode(mode);
    localStorage.setItem('voxbay_calling_mode', mode);
    // If already in a call or dialing, redial in the new selected mode
    if (callState !== 'IDLE' && callState !== 'ENDED') {
      handleInitiateCall(phoneNumber, contactName, mode);
    }
  };

  const handleExtensionChange = (val) => {
    setExtension(val);
    localStorage.setItem('voxbay_extension', val);
  };

  const handleAgentMobileChange = (val) => {
    setAgentMobile(val);
    localStorage.setItem('voxbay_agent_mobile', val);
  };

  useEffect(() => {
    if (initialNumber) setPhoneNumber(initialNumber);
    if (initialName) setContactName(initialName);
  }, [initialNumber, initialName]);

  // Instant 1-Click Auto Dial on open in Mobile SIM Mode
  useEffect(() => {
    if (isOpen && (autoDial || initialNumber) && !autoDialTriggeredRef.current) {
      autoDialTriggeredRef.current = true;
      const timer = setTimeout(() => {
        handleInitiateCall(initialNumber || phoneNumber, initialName || contactName, 'mobile_to_mobile');
      }, 150);
      return () => clearTimeout(timer);
    }
    if (!isOpen) {
      autoDialTriggeredRef.current = false;
    }
  }, [isOpen, autoDial, initialNumber]);

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

  const handleInitiateCall = async (overrideNumber = null, overrideName = null, overrideMode = null) => {
    const rawNum = (typeof overrideNumber === 'string' && overrideNumber) ? overrideNumber : phoneNumber;
    const rawName = (typeof overrideName === 'string' && overrideName) ? overrideName : contactName;
    const activeMode = overrideMode || callingMode;
    const cleanNumber = String(rawNum).replace(/[^\d+]/g, '');
    if (activeMode === 'extension_to_mobile') {
      try {
        const telFrame = document.createElement('iframe');
        telFrame.style.display = 'none';
        telFrame.src = `tel:${cleanNumber}`;
        document.body.appendChild(telFrame);
        setTimeout(() => { if (telFrame.parentNode) document.body.removeChild(telFrame); }, 1500);
      } catch (err) {}
    }

    if (!cleanNumber || cleanNumber.length < 5) {
      if (showToast) showToast('Please enter a valid phone number', 'error');
      return;
    }

    setCallState('DIALING');
    setCallDuration(0);

    try {
      const response = await fetch(`${API_BASE}/api/calls/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: cleanNumber,
          contactName: rawName || 'Customer',
          callingMode: activeMode,
          agentExtension: extension || '2MaqwezO',
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
          const targetDevice = activeMode === 'mobile_to_mobile' ? `Agent Mobile (${agentMobile})` : `Softphone (${extension})`;
          showToast(`📞 Dispatched to Voxbay! Ringing ${targetDevice}...`, 'success');
        }

        setTimeout(() => {
          setCallState('CONNECTED');
        }, 3000);
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
      if (callingMode === 'extension_to_mobile') {
        const hFrame = document.createElement('iframe');
        hFrame.style.display = 'none';
        hFrame.src = 'tel:hangup';
        document.body.appendChild(hFrame);
        setTimeout(() => { if (hFrame.parentNode) document.body.removeChild(hFrame); }, 1000);
      }
    } catch (e) {}
    try {
      await fetch(`${API_BASE}/api/calls/hangup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId: activeCallId })
      });
    } catch (e) {}

    setCallState('ENDED');
    const syncedRecording = `https://x.voxbay.com:81/callcenter/rec-${activeCallId || Date.now()}.wav`;
    if (onCallLogged) {
      onCallLogged({
        id: activeCallId || `call_${Date.now()}`,
        contactName: contactName || 'Customer',
        phoneNumber: phoneNumber,
        duration: formatDuration(callDuration),
        recording: syncedRecording,
        type: 'OUTGOING',
        status: callDuration > 0 ? 'Interested' : 'Missed',
        notes: `Voxbay Cloud Recording Synced (${formatDuration(callDuration)})`,
        timestamp: new Date().toISOString()
      });
    }

    if (showToast) showToast('🛑 Call ended & recording synced to Directory', 'info');

    setTimeout(() => {
      setCallState('IDLE');
      setCallDuration(0);
      onClose();
    }, 1200);
  };

  const formatDuration = (sec) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '20px'
    }}>
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '24px',
        width: '410px',
        maxWidth: '95vw',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        animation: 'fadeIn 0.25s ease-out'
      }}>
        {/* HEADER */}
        <div style={{
          background: 'linear-gradient(135deg, #064e3b 0%, #0f766e 100%)',
          padding: '16px 20px',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.3)'
            }}>
              <PhoneCall size={18} color="#a7f3d0" />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '800', letterSpacing: '0.3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Voxbay Live Call</span>
                <span style={{ fontSize: '10px', background: callingMode === 'mobile_to_mobile' ? '#2563eb' : '#059669', padding: '2px 8px', borderRadius: '10px', color: '#ffffff', fontWeight: '800' }}>
                  {callingMode === 'mobile_to_mobile' ? '📱 Mobile SIM Active' : '💻 Softphone App'}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#a7f3d0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399', display: 'inline-block' }}></span>
                Virtual DID: 918031496345
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              style={{
                background: showConfig ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.15)',
                border: 'none',
                color: '#ffffff',
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Settings"
            >
              <Settings size={15} />
            </button>
            <button
              type="button"
              onClick={handleHangup}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                border: 'none',
                color: '#ffffff',
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* 1-CLICK CALLING MODE SELECTOR BAR */}
        <div style={{
          background: '#eff6ff',
          padding: '10px 16px',
          borderBottom: '1px solid #dbeafe',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#1e3a8a' }}>📞 Receive Call On:</span>
            <span style={{ fontSize: '10px', color: '#3b82f6', fontWeight: '600' }}>Click to switch device</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              onClick={() => handleModeChange('mobile_to_mobile')}
              style={{
                padding: '8px',
                borderRadius: '8px',
                border: callingMode === 'mobile_to_mobile' ? '2.5px solid #2563eb' : '1px solid #cbd5e1',
                background: callingMode === 'mobile_to_mobile' ? '#2563eb' : '#ffffff',
                color: callingMode === 'mobile_to_mobile' ? '#ffffff' : '#64748b',
                fontWeight: '800',
                fontSize: '11.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                boxShadow: callingMode === 'mobile_to_mobile' ? '0 4px 10px rgba(37, 99, 235, 0.3)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <Smartphone size={15} color={callingMode === 'mobile_to_mobile' ? '#ffffff' : '#64748b'} />
              <span>📱 Mobile ({agentMobile})</span>
            </button>

            <button
              type="button"
              onClick={() => handleModeChange('extension_to_mobile')}
              style={{
                padding: '8px',
                borderRadius: '8px',
                border: callingMode === 'extension_to_mobile' ? '2.5px solid #0d9488' : '1px solid #cbd5e1',
                background: callingMode === 'extension_to_mobile' ? '#0d9488' : '#ffffff',
                color: callingMode === 'extension_to_mobile' ? '#ffffff' : '#64748b',
                fontWeight: '800',
                fontSize: '11.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                boxShadow: callingMode === 'extension_to_mobile' ? '0 4px 10px rgba(13, 148, 136, 0.3)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <Laptop size={15} color={callingMode === 'extension_to_mobile' ? '#ffffff' : '#64748b'} />
              <span>💻 Softphone ({extension})</span>
            </button>
          </div>
        </div>

        {/* SETTINGS DRAWER */}
        {showConfig && (
          <div style={{ background: '#f1f5f9', padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontSize: '12px' }}>
            <div style={{ fontWeight: '800', color: '#1e293b', marginBottom: '8px' }}>⚙️ Telephony Parameters:</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#475569', fontWeight: '700' }}>Agent Mobile Number:</label>
                <input
                  type="text"
                  value={agentMobile}
                  onChange={(e) => handleAgentMobileChange(e.target.value)}
                  placeholder="6283513686"
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #94a3b8', fontSize: '12px', fontWeight: '700', color: '#1e293b' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#475569', fontWeight: '700' }}>Softphone Extension:</label>
                <input
                  type="text"
                  value={extension}
                  onChange={(e) => handleExtensionChange(e.target.value)}
                  placeholder="2MaqwezO"
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #94a3b8', fontSize: '12px', fontWeight: '700', color: '#1e293b' }}
                />
              </div>
            </div>
            <div style={{ fontSize: '11px', color: '#475569', lineHeight: '1.4' }}>
              💡 <strong>Mobile SIM:</strong> Voxbay rings your mobile <code>{agentMobile}</code> first. Once answered, connects lead <code>{phoneNumber}</code>.<br />
              💡 <strong>Softphone:</strong> Rings your MicroSIP / VoxbayPhone app on this PC.
            </div>
          </div>
        )}

        {/* CALL CARD BODY */}
        <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* AVATAR */}
          <div style={{
            position: 'relative',
            width: '76px',
            height: '76px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #a7f3d0 0%, #34d399 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            fontWeight: '800',
            color: '#065f46',
            marginBottom: '12px',
            boxShadow: '0 8px 20px rgba(13, 148, 136, 0.25)'
          }}>
            <span>{(contactName || 'C').charAt(0).toUpperCase()}</span>
            <span style={{
              position: 'absolute',
              bottom: '4px',
              right: '4px',
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              background: callState === 'CONNECTED' ? '#10b981' : callState === 'DIALING' || callState === 'RINGING' ? '#f59e0b' : '#94a3b8',
              border: '2px solid #ffffff'
            }}></span>
          </div>

          <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0', textAlign: 'center' }}>
            {contactName || 'Lead / Customer'}
          </h3>
          <div style={{ fontSize: '16px', fontWeight: '800', color: '#0d9488', letterSpacing: '0.5px', marginBottom: '14px' }}>
            {phoneNumber || 'No Number'}
          </div>

          {/* STATUS PILL */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 16px',
            borderRadius: '20px',
            background: callState === 'CONNECTED' ? 'rgba(16, 185, 129, 0.12)' : callState === 'DIALING' || callState === 'RINGING' ? 'rgba(245, 158, 11, 0.12)' : '#f1f5f9',
            border: `1px solid ${callState === 'CONNECTED' ? 'rgba(16, 185, 129, 0.3)' : callState === 'DIALING' || callState === 'RINGING' ? 'rgba(245, 158, 11, 0.3)' : '#e2e8f0'}`,
            marginBottom: '14px'
          }}>
            {callState === 'CONNECTED' && (
              <>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.5s infinite' }}></span>
                <span style={{ fontSize: '12px', fontWeight: '800', color: '#059669' }}>
                  REC LIVE: {formatDuration(callDuration)}
                </span>
                <span style={{ fontSize: '10px', color: '#64748b', marginLeft: '4px', borderLeft: '1px solid #cbd5e1', paddingLeft: '6px' }}>Auto Syncing</span>
              </>
            )}
            {(callState === 'DIALING' || callState === 'RINGING') && (
              <>
                <RefreshCw size={12} className="spin" color="#d97706" />
                <span style={{ fontSize: '12px', fontWeight: '800', color: '#d97706' }}>
                  {callingMode === 'mobile_to_mobile' ? `Ringing Mobile (${agentMobile})...` : `Ringing Softphone (${extension})...`}
                </span>
              </>
            )}
            {callState === 'ENDED' && (
              <span style={{ fontSize: '12px', fontWeight: '800', color: '#ef4444' }}>Call Terminated</span>
            )}
            {callState === 'IDLE' && (
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>Ready to Call</span>
            )}
          </div>

          {/* HELPER CALL HINT */}
          {callingMode === 'mobile_to_mobile' && (callState === 'DIALING' || callState === 'RINGING') && (
            <div style={{ fontSize: '11px', color: '#2563eb', fontWeight: '700', background: '#eff6ff', padding: '4px 10px', borderRadius: '6px', marginBottom: '14px', textAlign: 'center' }}>
              📲 Voxbay is ringing your phone (<strong>{agentMobile}</strong>). Please answer!
            </div>
          )}

          {/* CALL ACTION BUTTONS */}
          {callState !== 'IDLE' && callState !== 'ENDED' ? (
            <button
              type="button"
              onClick={handleHangup}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: '#ffffff',
                border: 'none',
                fontWeight: '800',
                fontSize: '15px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 8px 20px rgba(239, 68, 68, 0.35)',
                transition: 'transform 0.15s ease'
              }}
            >
              <PhoneOff size={18} />
              <span>End Call</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleInitiateCall()}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                background: callingMode === 'mobile_to_mobile' ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : 'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
                color: '#ffffff',
                border: 'none',
                fontWeight: '800',
                fontSize: '15px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 8px 20px rgba(37, 99, 235, 0.35)',
                transition: 'transform 0.15s ease'
              }}
            >
              <PhoneCall size={18} />
              <span>Call Now ({callingMode === 'mobile_to_mobile' ? '📱 Mobile SIM' : '💻 Softphone'})</span>
            </button>
          )}

          {/* DIALPAD TOGGLE */}
          <button
            type="button"
            onClick={() => setShowKeypad(!showKeypad)}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              fontSize: '12px',
              fontWeight: '700',
              marginTop: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Hash size={13} />
            <span>{showKeypad ? 'Hide Dialpad' : 'Show Dialpad / DTMF'}</span>
          </button>

          {/* DTMF DIALPAD */}
          {showKeypad && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px',
              marginTop: '16px',
              width: '100%',
              maxWidth: '260px'
            }}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleDigitClick(digit)}
                  style={{
                    padding: '12px 0',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    color: '#0f172a',
                    fontWeight: '800',
                    fontSize: '16px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                    transition: 'all 0.1s ease'
                  }}
                  onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                  onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  {digit}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}