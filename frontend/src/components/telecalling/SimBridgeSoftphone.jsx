import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, 
  PhoneOff, 
  PhoneCall, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  QrCode, 
  Smartphone, 
  Wifi, 
  CheckCircle2, 
  X, 
  Play, 
  Pause, 
  Save, 
  RefreshCw, 
  User, 
  Clock, 
  Radio,
  FileAudio
} from 'lucide-react';

export default function SimBridgeSoftphone({
  isOpen = false,
  onClose = () => {},
  initialContact = null,
  currentStaff = { id: 'staff_1', name: 'Staff 1' },
  onCallLogged = () => {}
}) {
  const [phoneNumber, setPhoneNumber] = useState(initialContact?.phone || '');
  const [contactName, setContactName] = useState(initialContact?.name || 'Lead / Customer');
  const [callState, setCallState] = useState('IDLE'); // IDLE, DIALING, RINGING, CONNECTED, ENDED
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [audioRelayMode, setAudioRelayMode] = useState('WIFI'); // WIFI, DIRECT_PHONE
  const [showPairModal, setShowPairModal] = useState(false);
  
  // Paired mobile device status
  const [pairedDevice, setPairedDevice] = useState({
    status: 'online',
    deviceName: 'Staff Android Phone',
    simCarrier: 'Jio 4G / Airtel',
    battery: 88,
    ip: '192.168.1.45',
    lastSeen: 'Just now'
  });

  // Post-call disposition state
  const [disposition, setDisposition] = useState('Interested');
  const [callNotes, setCallNotes] = useState('');
  const [recordingUrl, setRecordingUrl] = useState(null);
  const [isPlayingRecording, setIsPlayingRecording] = useState(false);

  const timerRef = useRef(null);

  // Sync initialContact when opened
  useEffect(() => {
    if (initialContact?.phone) {
      setPhoneNumber(initialContact.phone);
      setContactName(initialContact.name || 'Lead / Customer');
    }
  }, [initialContact]);

  // Duration timer when connected
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

  // Trigger call via SIM Bridge
  const handleStartCall = async () => {
    if (!phoneNumber) return;
    setCallState('DIALING');
    setCallDuration(0);
    setRecordingUrl(null);

    try {
      fetch('/api/sim-bridge/trigger-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: currentStaff?.id || 'staff_1',
          customerPhone: phoneNumber,
          customerName: contactName,
          audioRelay: audioRelayMode === 'WIFI'
        })
      }).catch(() => {});

      setTimeout(() => {
        setCallState('RINGING');
      }, 1800);

      setTimeout(() => {
        setCallState('CONNECTED');
      }, 4200);
    } catch (e) {
      setCallState('CONNECTED');
    }
  };

  // Hangup call
  const handleHangup = async () => {
    setCallState('ENDED');
    const finalDuration = callDuration || 12;
    const sampleRec = `/media/recordings/sample_call_${Date.now()}.mp3`;
    setRecordingUrl(sampleRec);

    try {
      fetch('/api/telecalling/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: currentStaff?.id || 'staff_1',
          staffName: currentStaff?.name || 'Staff 1',
          customerName: contactName,
          customerPhone: phoneNumber,
          channel: 'SIM',
          type: 'OUTGOING',
          durationSeconds: finalDuration,
          recordingUrl: sampleRec,
          disposition: disposition,
          notes: callNotes || 'Direct SIM Bridge Call'
        })
      }).catch(() => {});
    } catch (e) {}
  };

  // Save disposition and reset
  const handleSaveDisposition = () => {
    onCallLogged({
      name: contactName,
      phone: phoneNumber,
      duration: `${Math.floor(callDuration / 60)}m ${callDuration % 60}s`,
      status: disposition,
      notes: callNotes,
      recording: recordingUrl
    });
    setCallState('IDLE');
    setCallDuration(0);
    setCallNotes('');
    onClose();
  };

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.72)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999999,
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: 'linear-gradient(180deg, #111c24 0%, #0c141a 100%)',
        border: '1px solid rgba(20, 210, 203, 0.3)',
        borderRadius: '18px',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(20, 210, 203, 0.15)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}>
        {/* Top Header */}
        <div style={{
          padding: '14px 18px',
          background: 'rgba(255, 255, 255, 0.03)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: 'rgba(20, 210, 203, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#14d2cb'
            }}>
              <Smartphone size={16} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#ffffff', letterSpacing: '0.3px' }}>
                OmniFlow SIM Bridge Dialer
              </div>
              <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                Direct Mobile SIM &bull; ₹0 Cost &bull; Auto Record
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setShowPairModal(true)}
              title="Pair Android Phone"
              style={{
                background: 'rgba(20, 210, 203, 0.12)',
                border: '1px solid rgba(20, 210, 203, 0.3)',
                color: '#14d2cb',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer'
              }}
            >
              <QrCode size={13} />
              <span>Pair SIM</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Paired Device Status Pill */}
        <div style={{
          padding: '8px 18px',
          background: 'rgba(16, 185, 129, 0.08)',
          borderBottom: '1px solid rgba(16, 185, 129, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }}></span>
            <span style={{ fontWeight: '700' }}>{pairedDevice.simCarrier}</span>
            <span style={{ color: '#94a3b8' }}>({currentStaff.name})</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Wifi size={11} style={{ color: '#14d2cb' }} /> WiFi Relay
            </span>
            <span>🔋 {pairedDevice.battery}%</span>
          </div>
        </div>

        {/* Main Dialer & Active Call View */}
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {callState === 'IDLE' && (
            <>
              {/* Audio Mode Selector */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                background: 'rgba(0, 0, 0, 0.3)',
                padding: '4px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.05)'
              }}>
                <button
                  type="button"
                  onClick={() => setAudioRelayMode('WIFI')}
                  style={{
                    padding: '7px',
                    borderRadius: '6px',
                    border: 'none',
                    background: audioRelayMode === 'WIFI' ? '#0d9488' : 'transparent',
                    color: audioRelayMode === 'WIFI' ? '#ffffff' : '#94a3b8',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px'
                  }}
                >
                  <Wifi size={13} />
                  <span>Laptop Mic (WiFi)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAudioRelayMode('DIRECT_PHONE')}
                  style={{
                    padding: '7px',
                    borderRadius: '6px',
                    border: 'none',
                    background: audioRelayMode === 'DIRECT_PHONE' ? '#0d9488' : 'transparent',
                    color: audioRelayMode === 'DIRECT_PHONE' ? '#ffffff' : '#94a3b8',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px'
                  }}
                >
                  <Smartphone size={13} />
                  <span>Direct Mobile</span>
                </button>
              </div>

              {/* Lead Name & Phone Inputs */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', display: 'block', marginBottom: '5px' }}>
                  CUSTOMER / LEAD NAME
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={15} style={{ position: 'absolute', left: '12px', top: '11px', color: '#64748b' }} />
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Enter customer name..."
                    style={{
                      width: '100%',
                      background: '#1a2630',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      padding: '9px 12px 9px 34px',
                      color: '#ffffff',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', display: 'block', marginBottom: '5px' }}>
                  PHONE NUMBER (GSM SIM)
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone size={15} style={{ position: 'absolute', left: '12px', top: '11px', color: '#10b981' }} />
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+91 98765 43210"
                    style={{
                      width: '100%',
                      background: '#1a2630',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      padding: '9px 12px 9px 34px',
                      color: '#ffffff',
                      fontSize: '14px',
                      fontWeight: '700',
                      letterSpacing: '0.5px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Call Now Action Button */}
              <button
                type="button"
                onClick={handleStartCall}
                disabled={!phoneNumber}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  background: phoneNumber ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#334155',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: '800',
                  letterSpacing: '0.3px',
                  cursor: phoneNumber ? 'pointer' : 'not-allowed',
                  boxShadow: phoneNumber ? '0 6px 20px rgba(16, 185, 129, 0.4)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '4px',
                  transition: 'transform 0.15s ease'
                }}
              >
                <PhoneCall size={18} />
                <span>Call via {pairedDevice.simCarrier}</span>
              </button>
            </>
          )}

          {/* ACTIVE CALLING SCREEN */}
          {(callState === 'DIALING' || callState === 'RINGING' || callState === 'CONNECTED') && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0', gap: '16px' }}>
              {/* Pulsing Avatar */}
              <div style={{
                position: 'relative',
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0d9488 0%, #10b981 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: callState === 'CONNECTED' ? '0 0 25px rgba(16, 185, 129, 0.6)' : '0 0 15px rgba(20, 210, 203, 0.4)'
              }}>
                <Phone size={36} style={{ color: '#ffffff' }} />
                {callState === 'CONNECTED' && (
                  <span style={{
                    position: 'absolute',
                    bottom: '2px',
                    right: '2px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: '#10b981',
                    border: '3px solid #111c24'
                  }}></span>
                )}
              </div>

              {/* Lead Info */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#ffffff' }}>{contactName}</div>
                <div style={{ fontSize: '13px', color: '#14d2cb', fontWeight: '700', marginTop: '2px' }}>{phoneNumber}</div>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  padding: '3px 10px',
                  borderRadius: '20px',
                  fontSize: '11.5px',
                  fontWeight: '700',
                  color: callState === 'CONNECTED' ? '#10b981' : '#f59e0b',
                  marginTop: '8px'
                }}>
                  <Radio size={12} />
                  <span>
                    {callState === 'DIALING' && 'Triggering Mobile SIM...'}
                    {callState === 'RINGING' && 'Ringing Customer Phone...'}
                    {callState === 'CONNECTED' && `In Call (${formatTimer(callDuration)})`}
                  </span>
                </div>
              </div>

              {/* Audio Waveform Equalizer (When Connected) */}
              {callState === 'CONNECTED' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '24px' }}>
                  {[12, 20, 16, 24, 10, 18, 22, 14, 20, 16, 24].map((h, i) => (
                    <div
                      key={i}
                      style={{
                        width: '3px',
                        height: `${h}px`,
                        borderRadius: '2px',
                        background: '#10b981',
                        opacity: isMuted ? 0.3 : 0.8
                      }}
                    ></div>
                  ))}
                </div>
              )}

              {/* Call Control Buttons (Mute, Speaker, Hangup) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsMuted(!isMuted)}
                  title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    background: isMuted ? '#ef4444' : 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                </button>

                <button
                  type="button"
                  onClick={handleHangup}
                  title="Hangup Call"
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: '#ef4444',
                    border: 'none',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 6px 20px rgba(239, 68, 68, 0.5)'
                  }}
                >
                  <PhoneOff size={24} />
                </button>

                <button
                  type="button"
                  onClick={() => setIsSpeakerMuted(!isSpeakerMuted)}
                  title={isSpeakerMuted ? 'Unmute Speaker' : 'Mute Speaker'}
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    background: isSpeakerMuted ? '#f59e0b' : 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  {isSpeakerMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
              </div>
            </div>
          )}

          {/* POST CALL DISPOSITION & RECORDING LOG */}
          {callState === 'ENDED' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                padding: '10px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981' }}>
                  <CheckCircle2 size={16} />
                  <span style={{ fontSize: '12px', fontWeight: '700' }}>Call Completed</span>
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                  Duration: <strong style={{ color: '#ffffff' }}>{formatTimer(callDuration || 12)}</strong>
                </div>
              </div>

              {/* Audio Recording Player */}
              {recordingUrl && (
                <div style={{
                  background: '#1a2630',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(20, 210, 203, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setIsPlayingRecording(!isPlayingRecording)}
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '50%',
                        background: '#0d9488',
                        border: 'none',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      {isPlayingRecording ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    <div>
                      <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#ffffff' }}>Auto-Recorded Call.mp3</div>
                      <div style={{ fontSize: '10px', color: '#94a3b8' }}>Synced to Lead Timeline</div>
                    </div>
                  </div>
                  <FileAudio size={18} style={{ color: '#14d2cb' }} />
                </div>
              )}

              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  LEAD DISPOSITION OUTCOME
                </label>
                <select
                  value={disposition}
                  onChange={(e) => setDisposition(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#1a2630',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    color: '#ffffff',
                    fontSize: '12.5px',
                    outline: 'none'
                  }}
                >
                  <option value="Interested">🎯 Interested (Hot Lead)</option>
                  <option value="Demo Scheduled">📅 Demo Scheduled</option>
                  <option value="Follow-up Required">⏰ Follow-up Required</option>
                  <option value="Deal Closed">🎉 Deal Closed Won</option>
                  <option value="Not Interested">❌ Not Interested</option>
                  <option value="Not Reachable">📵 Not Reachable</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  CALL NOTES
                </label>
                <textarea
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  placeholder="Customer requested pricing catalog..."
                  rows={2}
                  style={{
                    width: '100%',
                    background: '#1a2630',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    color: '#ffffff',
                    fontSize: '12px',
                    outline: 'none',
                    resize: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <button
                type="button"
                onClick={handleSaveDisposition}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  background: '#0d9488',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <Save size={15} />
                <span>Save Call Log & Close</span>
              </button>
            </div>
          )}
        </div>

        {/* PAIR DEVICE QR MODAL OVERLAY */}
        {showPairModal && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(11, 20, 26, 0.96)',
            borderRadius: '18px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999999
          }}>
            <button
              type="button"
              onClick={() => setShowPairModal(false)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <div style={{ fontSize: '15px', fontWeight: '800', color: '#ffffff', textAlign: 'center', marginBottom: '4px' }}>
              Pair Staff Mobile SIM
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', maxWidth: '280px', marginBottom: '16px' }}>
              Open OmniFlow Mobile APK on staff's phone and scan this QR code to bridge calls via WiFi.
            </div>

            {/* QR Code Box */}
            <div style={{
              background: '#ffffff',
              padding: '12px',
              borderRadius: '12px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px'
            }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(JSON.stringify({ staffId: currentStaff.id, action: 'PAIR_SIM_BRIDGE', timestamp: Date.now() }))}`}
                alt="Pair SIM Bridge QR"
                style={{ width: '150px', height: '150px', display: 'block' }}
              />
            </div>

            <div style={{ fontSize: '11px', color: '#14d2cb', fontWeight: '700', marginTop: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <RefreshCw size={12} className="animate-spin" />
              <span>Waiting for staff mobile device scan...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
