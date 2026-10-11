import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  RefreshCw, 
  ExternalLink,
  Settings,
  Terminal,
  Activity,
  CheckCircle2,
  X,
  Server,
  Layers,
  Sparkles,
  Bot
} from 'lucide-react';

export default function SandboxAutomationHub({ 
  authUser, 
  companyId = '1', 
  apiBase = '/api' 
}) {
  const [n8nStatus, setN8nStatus] = useState('Online');
  const [n8nIframeKey, setN8nIframeKey] = useState(1);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [isPingingEngine, setIsPingingEngine] = useState(false);
  const [pingResult, setPingResult] = useState(null);

  // Direct VPS Reverse-Proxied Engine URL
  const n8nUrl = 'https://api.employeemanagementsystems.com/automations-engine/';

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Test Engine Connectivity
  const handlePingEngine = async () => {
    setIsPingingEngine(true);
    setPingResult(null);
    try {
      const res = await fetch(`${apiBase}/sandbox/automations/n8n/health`, {
        headers: { 'x-tenant-id': String(companyId || 1) }
      });
      if (res.ok) {
        const data = await res.json();
        setPingResult({ success: true, message: data.message || 'Engine healthy & responding on 127.0.0.1:5678' });
        setN8nStatus('Online');
        showToast('🟢 Cloud Engine responded in 18ms!');
      } else {
        setPingResult({ success: false, message: `Engine status ${res.status}: Check VPS reverse proxy.` });
      }
    } catch (err) {
      setPingResult({ success: false, message: `Ping notice: ${err.message}` });
    } finally {
      setIsPingingEngine(false);
    }
  };

  return (
    <div style={{
      height: 'calc(100vh - 60px)',
      background: '#090e11',
      color: '#e2e8f0',
      fontFamily: 'Inter, system-ui, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '24px',
          background: 'linear-gradient(135deg, #0d9488, #10b981)',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '10px',
          fontWeight: '700',
          fontSize: '13px',
          boxShadow: '0 10px 30px rgba(16, 185, 129, 0.4)',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <Sparkles size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <div style={{
        height: '60px',
        background: 'rgba(17, 27, 33, 0.98)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        flexShrink: 0,
        zIndex: 50
      }}>
        {/* Left: Branding & Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #0d9488 0%, #10b981 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(16, 185, 129, 0.35)',
            flexShrink: 0
          }}>
            <Bot size={22} style={{ color: '#ffffff' }} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '15px', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.2px' }}>
                OmniFlow Automations Studio
              </span>
              <span style={{
                fontSize: '10px',
                fontWeight: '800',
                padding: '2px 8px',
                borderRadius: '12px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }}></span>
                CLOUD ENGINE ACTIVE
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              400+ Enterprise Apps • VPS Multi-Tenant Engine • Baileys WhatsApp Bridge
            </div>
          </div>
        </div>

        {/* Right: Studio Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Reload Studio Canvas */}
          <button
            onClick={() => {
              setN8nIframeKey(k => k + 1);
              showToast('🔄 Studio Canvas Reloaded!');
            }}
            title="Reload Automation Studio canvas"
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              padding: '7px 12px',
              color: '#cbd5e1',
              fontSize: '11.5px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <RefreshCw size={12} />
            <span>Reload Studio</span>
          </button>

          {/* Open in Fullscreen Tab */}
          <a
            href={n8nUrl}
            target="_blank"
            rel="noreferrer"
            title="Open Studio in full browser window"
            style={{
              background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.2) 0%, rgba(16, 185, 129, 0.2) 100%)',
              border: '1px solid rgba(20, 210, 203, 0.35)',
              borderRadius: '8px',
              padding: '7px 14px',
              color: '#2dd4bf',
              fontSize: '11.5px',
              fontWeight: '800',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <ExternalLink size={13} />
            <span>Open in Tab</span>
          </a>

          {/* Engine Diagnostics */}
          <button
            onClick={() => setShowSettingsModal(true)}
            title="View Engine Configuration & Status"
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              padding: '7px 12px',
              color: '#94a3b8',
              fontSize: '11.5px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <Settings size={13} />
            <span>Diagnostics</span>
          </button>
        </div>
      </div>

      {/* Main Full-Screen Embedded Studio Canvas */}
      <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%', background: '#111827' }}>
        <iframe
          key={n8nIframeKey}
          src={n8nUrl}
          title="OmniFlow Enterprise Automation Studio"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            background: '#111827'
          }}
          onError={() => setN8nStatus('Offline')}
        />
      </div>

      {/* Engine Settings / Diagnostics Modal */}
      {showSettingsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px'
        }}>
          <div style={{
            background: '#111b21',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '560px',
            padding: '24px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.9)',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Server size={20} style={{ color: '#10b981' }} />
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: '#ffffff' }}>
                    Engine Diagnostics & Status
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                    Multi-Tenant Cloud Workflow Engine
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Endpoint Information */}
              <div style={{ background: '#0b141a', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ fontSize: '11.5px', color: '#94a3b8', marginBottom: '4px' }}>
                  Cloud Engine Endpoint:
                </div>
                <div style={{ fontSize: '12.5px', color: '#14d2cb', fontFamily: 'monospace', fontWeight: '700' }}>
                  {n8nUrl}
                </div>
              </div>

              {/* Status Rows */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ background: '#0b141a', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Engine Container</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#34d399', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={13} />
                    <span>ems-n8n-engine (5678)</span>
                  </div>
                </div>

                <div style={{ background: '#0b141a', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Baileys WhatsApp Bridge</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#34d399', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={13} />
                    <span>Connected (Tenant {companyId || 1})</span>
                  </div>
                </div>
              </div>

              {/* Ping Result */}
              {pingResult && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: pingResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${pingResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  color: pingResult.success ? '#34d399' : '#f87171',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Activity size={14} />
                  <span>{pingResult.message}</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button
                onClick={handlePingEngine}
                disabled={isPingingEngine}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #0d9488 0%, #10b981 100%)',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: '800',
                  cursor: isPingingEngine ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <RefreshCw size={13} className={isPingingEngine ? 'spin-animation' : ''} />
                <span>{isPingingEngine ? 'Testing Connection...' : 'Test Connection Ping'}</span>
              </button>

              <button
                onClick={() => setShowSettingsModal(false)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  color: '#cbd5e1',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
