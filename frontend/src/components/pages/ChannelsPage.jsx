import React from 'react';
import { Plus, RefreshCw, Check, Trash2, Smartphone, Shield, QrCode, PowerOff, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ChannelsPage({
  sessions = [],
  setShowAddSessionModal,
  handleStartSession,
  handleStopSession,
  handleDeleteSession
}) {
  const formatDisplayName = (sess) => {
    if (sess.phone_name && !sess.phone_name.startsWith('session_')) {
      return sess.phone_name;
    }
    if (sess.phone_number) {
      return `WhatsApp Line (+${sess.phone_number})`;
    }
    return 'Primary WhatsApp Line';
  };

  return (
    <div style={{
      padding: '24px 28px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      maxWidth: '1200px',
      margin: '0 auto',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      {/* Policy Alert Banner */}
      {sessions && sessions.length >= 1 && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.1) 0%, rgba(6, 78, 67, 0.12) 100%)',
          border: '1px solid rgba(13, 148, 136, 0.3)',
          borderRadius: '12px',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: 'rgba(13, 148, 136, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Shield size={16} style={{ color: '#0d9488' }} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f2b26' }}>
                1 User = 1 WhatsApp Account Policy
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                Your dedicated WhatsApp channel is registered. Disconnect or delete to link a different number.
              </div>
            </div>
          </div>
          <span style={{
            fontSize: '11.5px',
            background: 'rgba(13, 148, 136, 0.15)',
            border: '1px solid rgba(13, 148, 136, 0.3)',
            color: '#0d9488',
            padding: '3px 10px',
            borderRadius: '20px',
            fontWeight: '700'
          }}>
            {sessions.length} / 1 Linked Channel
          </span>
        </div>
      )}

      {/* Channels Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 420px))',
        gap: '20px'
      }}>
        {(sessions || []).map(sess => {
          const isConnected = sess.status === 'connected';
          const isQRReady = sess.status === 'qr_ready';
          const isConnecting = sess.status === 'connecting';

          return (
            <div
              key={sess.id}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '20px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                position: 'relative',
                transition: 'all 0.2s ease'
              }}
            >
              {/* Card Header & Status */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Smartphone size={16} color="#0d9488" />
                  <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    WhatsApp Gateway
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  background: isConnected ? '#ecfdf5' : (isQRReady ? '#fefce8' : '#f8fafc'),
                  border: `1px solid ${isConnected ? '#a7f3d0' : (isQRReady ? '#fef08a' : '#e2e8f0')}`,
                  fontSize: '11px',
                  fontWeight: '700',
                  color: isConnected ? '#15803d' : (isQRReady ? '#a16207' : '#64748b')
                }}>
                  <span style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: isConnected ? '#10b981' : (isQRReady ? '#eab308' : '#94a3b8'),
                    boxShadow: isConnected ? '0 0 6px #10b981' : 'none'
                  }} />
                  <span style={{ textTransform: 'capitalize' }}>
                    {isConnected ? 'Connected Live' : (isQRReady ? 'Scan QR Code' : (sess.status || 'Disconnected').replace('_', ' '))}
                  </span>
                </div>
              </div>

              {/* Profile Avatar & Account Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #ccfbf1 0%, #99f6e4 100%)',
                  border: '2px solid #0d9488',
                  color: '#0f766e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  fontWeight: '800',
                  flexShrink: 0,
                  overflow: 'hidden',
                  boxShadow: '0 4px 10px rgba(13, 148, 136, 0.15)'
                }}>
                  {sess.profile_pic_url ? (
                    <img
                      src={sess.profile_pic_url}
                      alt={sess.phone_name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span>{(sess.phone_name || 'WA').substring(0, 2).toUpperCase()}</span>
                  )}
                </div>

                <div style={{ minWidth: 0, flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {formatDisplayName(sess)}
                  </h3>
                  <div style={{ fontSize: '13px', fontFamily: 'monospace', fontWeight: '700', color: '#0d9488', marginTop: '2px' }}>
                    {sess.phone_number ? `+${sess.phone_number}` : 'Phone: Ready to pair'}
                  </div>
                </div>
              </div>

              {/* State Interactive Content */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '130px'
              }}>
                {isQRReady && sess.qr_code ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      background: '#ffffff',
                      padding: '10px',
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                    }}>
                      <img
                        src={sess.qr_code}
                        alt="WhatsApp QR Code"
                        style={{ width: '180px', height: '180px', objectFit: 'contain', display: 'block' }}
                      />
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: '#0f766e', fontWeight: '700', textAlign: 'center' }}>
                      📱 Open WhatsApp → Linked Devices → Link a Device
                    </p>
                  </div>
                ) : isConnecting ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <RefreshCw size={24} className="spin" style={{ color: '#0d9488' }} />
                    <p style={{ margin: 0, fontSize: '12.5px', color: '#475569', fontWeight: '700' }}>
                      Initializing WhatsApp QR Code...
                    </p>
                  </div>
                ) : isConnected ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <div style={{ background: '#dcfce7', padding: '8px', borderRadius: '50%' }}>
                      <CheckCircle2 size={24} color="#16a34a" />
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#16a34a' }}>
                      WhatsApp Connected & Active
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      Messages and chats are synced live
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', textAlign: 'center' }}>
                      Account is disconnected. Click below to generate linking QR code.
                    </div>
                    <button
                      type="button"
                      onClick={() => handleStartSession && handleStartSession(sess.id)}
                      style={{
                        width: '100%',
                        padding: '10px 16px',
                        fontSize: '12.5px',
                        fontWeight: '800',
                        background: 'linear-gradient(135deg, #0d9488 0%, #064e43 100%)',
                        color: '#ffffff',
                        borderRadius: '10px',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 2px 8px rgba(13, 148, 136, 0.3)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <QrCode size={15} />
                      <span>Generate QR Code to Connect</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Action Bar Footer */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '12px',
                borderTop: '1px solid #f1f5f9',
                marginTop: 'auto'
              }}>
                <div>
                  {sess.status !== 'disconnected' && (
                    <button
                      type="button"
                      onClick={() => handleStopSession && handleStopSession(sess.id)}
                      style={{
                        padding: '6px 12px',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#475569',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <PowerOff size={13} />
                      <span>Disconnect</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteSession && handleDeleteSession(sess.id)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: '1px solid #fecaca',
                    background: '#fef2f2',
                    color: '#dc2626',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s'
                  }}
                  title="Delete Channel"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}

        {/* Empty State */}
        {(!sessions || sessions.length === 0) && (
          <div style={{
            gridColumn: '1 / -1',
            background: '#ffffff',
            border: '1px dashed #cbd5e1',
            borderRadius: '16px',
            padding: '60px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '14px',
            color: '#64748b'
          }}>
            <Smartphone size={44} strokeWidth={1.5} color="#94a3b8" />
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#1e293b' }}>No WhatsApp Channels Connected</div>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0, textAlign: 'center' }}>
              Click "+ Add Channel" to link your WhatsApp Business or personal number.
            </p>
            <button
              type="button"
              onClick={() => setShowAddSessionModal && setShowAddSessionModal(true)}
              style={{
                padding: '9px 18px',
                fontSize: '13px',
                fontWeight: '800',
                background: 'linear-gradient(135deg, #0d9488 0%, #064e43 100%)',
                color: '#ffffff',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Plus size={16} />
              <span>Add Channel</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}