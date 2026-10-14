import React, { useState } from 'react';

export default function SandboxErpHub({ authUser, companyId, apiBase = '/api' }) {
  const LIVE_ERP_DOMAIN = 'https://erp.employeemanagementsystems.com/web/autologin';
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div
      style={{
        width: '100%',
        height: 'calc(100vh - 58px)',
        background: '#ffffff',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: '#ffffff',
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
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f2b26', fontFamily: 'Inter, sans-serif' }}>
            Loading OmniFlow ERP...
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
        src={LIVE_ERP_DOMAIN}
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
  );
}
