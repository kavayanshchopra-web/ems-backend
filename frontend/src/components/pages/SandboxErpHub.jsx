import React, { useState, useRef, useEffect } from 'react';
import {
  ExternalLink,
  RefreshCw,
  Maximize2,
  Minimize2,
  ShieldCheck,
  CheckCircle2,
  Radio
} from 'lucide-react';

export default function SandboxErpHub({ authUser, companyId, apiBase = '/api' }) {
  const LIVE_ERP_DOMAIN = 'https://erp.employeemanagementsystems.com/web/autologin';
  const FALLBACK_ERP_DOMAIN = 'https://api.employeemanagementsystems.com:8443/web/autologin';

  const [selectedDomain, setSelectedDomain] = useState(LIVE_ERP_DOMAIN);
  const [iframeKey, setIframeKey] = useState(Date.now());
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);

  // Handle Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.warn('Fullscreen request failed:', err);
      });
    } else {
      document.exitFullscreen().catch(err => {
        console.warn('Exit fullscreen failed:', err);
      });
    }
  };

  const handleRefreshIframe = () => {
    setIsLoading(true);
    setIframeKey(Date.now());
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: isFullscreen ? '100vh' : 'calc(100vh - 58px)',
        display: 'flex',
        flexDirection: 'column',
        background: '#0f172a',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* Sleek Ultra-Thin Header (Only 38px, Zero wasted space) */}
      <div
        style={{
          height: '38px',
          minHeight: '38px',
          background: '#0f2b26',
          borderBottom: '1px solid rgba(20, 210, 203, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 14px',
          color: '#ffffff',
          fontSize: '12px',
          zIndex: 10,
          userSelect: 'none'
        }}
      >
        {/* Left: Branding & Status Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', letterSpacing: '0.2px' }}>
            <span style={{
              background: 'linear-gradient(135deg, #0d9488 0%, #059669 100%)',
              color: '#ffffff',
              fontSize: '10px',
              fontWeight: '800',
              padding: '2px 6px',
              borderRadius: '4px',
              letterSpacing: '0.5px'
            }}>
              ERP CORE
            </span>
            <span style={{ color: '#f8fafc' }}>EMS Enterprise Workspace</span>
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '11px',
            color: '#34d399',
            background: 'rgba(52, 211, 153, 0.1)',
            padding: '2px 8px',
            borderRadius: '12px',
            border: '1px solid rgba(52, 211, 153, 0.25)'
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#34d399',
              boxShadow: '0 0 8px #34d399'
            }} />
            <span>Production Live</span>
          </div>
        </div>

        {/* Right: Quick Controls (Domain toggle, Reload, Fullscreen, Popout) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Domain Segmented Toggle */}
          <div style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.08)',
            padding: '2px',
            borderRadius: '6px',
            border: '1px solid rgba(255, 255, 255, 0.12)'
          }}>
            <button
              onClick={() => {
                if (selectedDomain !== LIVE_ERP_DOMAIN) {
                  setSelectedDomain(LIVE_ERP_DOMAIN);
                  setIsLoading(true);
                }
              }}
              style={{
                border: 'none',
                background: selectedDomain === LIVE_ERP_DOMAIN ? '#0d9488' : 'transparent',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: '600',
                padding: '3px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Primary Domain: erp.employeemanagementsystems.com"
            >
              erp.employeemanagementsystems.com
            </button>
            <button
              onClick={() => {
                if (selectedDomain !== FALLBACK_ERP_DOMAIN) {
                  setSelectedDomain(FALLBACK_ERP_DOMAIN);
                  setIsLoading(true);
                }
              }}
              style={{
                border: 'none',
                background: selectedDomain === FALLBACK_ERP_DOMAIN ? '#0d9488' : 'transparent',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: '600',
                padding: '3px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Direct SSL Gateway: api port 8443"
            >
              api port 8443 (SSL)
            </button>
          </div>

          {/* Refresh Frame Button */}
          <button
            onClick={handleRefreshIframe}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              background: 'rgba(255, 255, 255, 0.06)',
              color: '#ffffff',
              padding: '4px 8px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: '600'
            }}
            title="Reload ERP Interface"
          >
            <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
            <span>Reload</span>
          </button>

          {/* True Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              background: 'rgba(255, 255, 255, 0.06)',
              color: '#ffffff',
              padding: '4px 8px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: '600'
            }}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Native Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            <span>{isFullscreen ? 'Exit Full' : 'Fullscreen'}</span>
          </button>

          {/* Popout Link */}
          <a
            href={selectedDomain}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: 'linear-gradient(135deg, #0d9488 0%, #064e43 100%)',
              color: '#ffffff',
              border: '1px solid rgba(20, 210, 203, 0.4)',
              padding: '4px 10px',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '11px',
              fontWeight: '700'
            }}
            title="Open ERP in New Browser Window"
          >
            <span>Popout</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* Embedded ERP Iframe (Takes 100% of remaining viewport) */}
      <div style={{ flex: 1, width: '100%', height: '100%', position: 'relative' }}>
        {isLoading && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: '#f8fafc',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              zIndex: 5
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: '3px solid #e2e8f0',
                borderTopColor: '#0d9488',
                animation: 'spin 1s linear infinite'
              }}
            />
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f2b26' }}>
              Connecting to OmniFlow Enterprise ERP...
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              Autologin session: {selectedDomain}
            </div>
            <style>{`
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}

        <iframe
          key={iframeKey}
          src={selectedDomain}
          title="EMS Enterprise Workspace"
          onLoad={() => setIsLoading(false)}
          allow="camera; microphone; geolocation; clipboard-read; clipboard-write; fullscreen"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            display: 'block'
          }}
        />
      </div>
    </div>
  );
}
