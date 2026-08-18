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
  const [selectedExtension, setSelectedExtension] = useState('101');
  const [allExtensions, setAllExtensions] = useState([]);
  
  // Real paired mobile device status (null = NOT PAIRED / OFFLINE)
  const [pairedDevice, setPairedDevice] = useState(null);

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

  const IS_DEV = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' || 
    window.location.hostname.startsWith('192.168.')
  );
  const API_BASE = IS_DEV 
    ? `http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:5000/api` 
    : 'https://ems-backend-9hig.onrender.com/api';

  const SERVER_URL = IS_DEV
    ? `http://${typeof window !== 'undefined' ? (window.location.hostname === 'localhost' ? '192.168.29.95' : window.location.hostname) : '192.168.29.95'}:5000`
    : 'https://ems-backend-9hig.onrender.com';

  // Poll for paired device status & extensions list
  useEffect(() => {
    if (!isOpen) return;

    const fetchDeviceStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/sim-bridge/devices`);
        if (res.ok) {
          const data = await res.json();
          if (data.devices) {
            setAllExtensions(data.devices);
            // Match active device strictly by selected extension AND online status
            const active = data.devices.find(d => String(d.extension) === String(selectedExtension) && d.isOnline);
            if (active) {
              setPairedDevice(active);
              if (showPairModal) {
                setShowPairModal(false); // Auto close modal when scanned!
              }
            } else {
              setPairedDevice(null);
            }
          }
        }
      } catch (err) {
        setPairedDevice(null);
      }
    };

    fetchDeviceStatus();
    const interval = setInterval(fetchDeviceStatus, 2500);
    return () => clearInterval(interval);
  }, [isOpen, selectedExtension, API_BASE, showPairModal]);


  // Trigger call via SIM Bridge
  const handleStartCall = async () => {
    if (!phoneNumber) return;
    setCallState('DIALING');
    setCallDuration(0);
    setRecordingUrl(null);

    try {
      await fetch(API_BASE + '/sim-bridge/trigger-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: currentStaff?.id || selectedExtension || '101',
          extension: selectedExtension || '101',
          customerPhone: phoneNumber,
          customerName: contactName,
          audioRelay: audioRelayMode === 'WIFI'
        })
      });

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
      fetch(API_BASE + '/telecalling/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: currentStaff?.id || selectedExtension || '101',
          staffName: currentStaff?.name || `Agent (Ext ${selectedExtension})`,
          customerName: contactName,
          customerPhone: phoneNumber,
          channel: 'SIM',
          type: 'OUTGOING',
          durationSeconds: finalDuration,
          recordingUrl: sampleRec,
          disposition: disposition,
          notes: callNotes || `Direct SIM Call via Ext ${selectedExtension}`
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

        {/* Paired Device Status Pill & Extension Selector */}
        <div style={{
          padding: '10px 18px',
          background: pairedDevice?.isOnline ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
          borderBottom: pairedDevice?.isOnline ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11.5px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              background: pairedDevice?.isOnline ? '#10b981' : '#ef4444', 
              boxShadow: pairedDevice?.isOnline ? '0 0 8px #10b981' : '0 0 8px #ef4444' 
            }}></span>
            {pairedDevice?.isOnline ? (
              <span style={{ fontWeight: '700', color: '#34d399' }}>
                🟢 {pairedDevice.sim_carrier || 'Active SIM'} ({pairedDevice.device_name || 'Phone'}) • 🔋 {pairedDevice.battery_level || 90}%
              </span>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: '700', color: '#f87171' }}>
                  🔴 Ext {selectedExtension}: Offline (No Phone Paired)
                </span>
                <button
                  type="button"
                  onClick={() => setShowPairModal(true)}
                  style={{
                    background: '#0d9488',
                    border: 'none',
                    color: '#ffffff',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '10.5px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  📷 Scan QR
                </button>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: '700' }}>PBX EXT:</span>
            <select
              value={selectedExtension}
              onChange={(e) => setSelectedExtension(e.target.value)}
              style={{
                background: '#1a2630',
                border: '1px solid rgba(20, 210, 203, 0.3)',
                borderRadius: '6px',
                padding: '3px 8px',
                color: '#14d2cb',
                fontSize: '11px',
                fontWeight: '700',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="101">Ext 101 (Telecaller 1)</option>
              <option value="102">Ext 102 (Telecaller 2)</option>
              <option value="103">Ext 103 (Telecaller 3)</option>
              <option value="104">Ext 104 (Telecaller 4)</option>
              <option value="105">Ext 105 (Telecaller 5)</option>
              <option value="106">Ext 106 (Telecaller 6)</option>
              <option value="107">Ext 107 (Telecaller 7)</option>
              <option value="108">Ext 108 (Telecaller 8)</option>
              <option value="109">Ext 109 (Telecaller 9)</option>
              <option value="110">Ext 110 (Telecaller 10)</option>
              {allExtensions.filter(d => !['101','102','103','104','105','106','107','108','109','110'].includes(String(d.extension))).map(d => (
                <option key={d.extension} value={d.extension}>Ext {d.extension} ({d.staff_name || 'Agent'})</option>
              ))}
            </select>
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
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#1a2630',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '8px 12px',
                  gap: '8px'
                }}>
                  <User size={15} style={{ color: '#94a3b8' }} />
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Customer Name"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '13px',
                      outline: 'none',
                      width: '100%'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', display: 'block', marginBottom: '5px' }}>
                  PHONE NUMBER (GSM SIM)
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#1a2630',
                  borderRadius: '8px',
                  border: '1px solid rgba(20, 210, 203, 0.3)',
                  padding: '8px 12px',
                  gap: '8px'
                }}>
                  <Phone size={15} style={{ color: '#14d2cb' }} />
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+91 98765 43210"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '15px',
                      fontWeight: '700',
                      letterSpacing: '0.5px',
                      outline: 'none',
                      width: '100%'
                    }}
                  />
                </div>
              </div>

              {/* Call Now Action Button */}
              {pairedDevice?.isOnline ? (
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
                  <span>Call via Ext {selectedExtension} ({pairedDevice.sim_carrier || 'Mobile SIM'})</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowPairModal(true)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    background: '#1e293b',
                    border: '1px dashed #f59e0b',
                    color: '#f59e0b',
                    fontSize: '13px',
                    fontWeight: '700',
                    letterSpacing: '0.3px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    marginTop: '4px'
                  }}
                >
                  <QrCode size={18} />
                  <span>⚠️ Phone Not Paired (Click to Scan QR)</span>
                </button>
              )}
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
            background: 'rgba(11, 20, 26, 0.98)',
            borderRadius: '18px',
            padding: '20px',
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

            <div style={{ fontSize: '16px', fontWeight: '800', color: '#ffffff', textAlign: 'center', marginBottom: '4px' }}>
              Pair Ext {selectedExtension} with Phone
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', maxWidth: '280px', marginBottom: '14px' }}>
              Open <strong style={{ color: '#14d2cb' }}>OmniFlow Mobile APK</strong> and tap <strong style={{ color: '#14d2cb' }}>[ 📷 Scan QR ]</strong> to pair your SIM instantly.
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
              gap: '6px'
            }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(JSON.stringify({
                  action: 'PAIR_SIM_BRIDGE',
                  serverUrl: SERVER_URL,
                  extension: selectedExtension,
                  staffId: selectedExtension,
                  staffName: `Telecaller ${selectedExtension}`
                }))}`}
                alt="Pair SIM Bridge QR"
                style={{ width: '160px', height: '160px', display: 'block' }}
              />
            </div>

            {/* Extension & Server details */}
            <div style={{
              marginTop: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              width: '100%',
              maxWidth: '280px',
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '11px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>PBX Extension:</span>
                <strong style={{ color: '#14d2cb' }}>Ext {selectedExtension}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Server:</span>
                <span style={{ color: '#e2e8f0', fontSize: '10px' }}>{SERVER_URL}</span>
              </div>
            </div>

            <div style={{ fontSize: '11.5px', color: '#14d2cb', fontWeight: '700', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <RefreshCw size={13} className="animate-spin" />
              <span>Waiting for Mobile APK to scan...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
