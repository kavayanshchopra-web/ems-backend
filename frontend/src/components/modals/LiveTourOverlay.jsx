import React from 'react';

export default function LiveTourOverlay({
  isLiveTourActive,
  setIsLiveTourActive,
  virtualCursor,
  tourStepIndex,
  setTourStepIndex,
  guideSteps,
  tourVoiceStatus,
  runTourStep,
  showToast
}) {
  if (!isLiveTourActive) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999999,
        pointerEvents: 'none'
      }}
    >
      {/* Spotlight Backdrop */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.45)', pointerEvents: 'none' }} />

      {/* Floating Animated Virtual Mouse SVG Pointer */}
      <div
        style={{
          position: 'fixed',
          top: `${virtualCursor.y}px`,
          left: `${virtualCursor.x}px`,
          zIndex: 1000000,
          pointerEvents: 'none',
          transition: 'all 0.7s cubic-bezier(0.25, 1, 0.5, 1)',
          transform: virtualCursor.isClicking ? 'scale(0.85)' : 'scale(1)'
        }}
      >
        {/* SVG Mouse Pointer Icon */}
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))' }}>
          <path d="M3 3l7 18 3-7 7-3L3 3z" fill="#0d9488" stroke="#ffffff" strokeWidth="2" strokeLinejoin="round" />
        </svg>

        {/* Mouse Click Ripple Pulse */}
        {virtualCursor.isClicking && (
          <div
            style={{
              position: 'absolute',
              top: '-12px',
              left: '-12px',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(13, 148, 136, 0.5)',
              border: '2px solid #0d9488',
              animation: 'ping 0.6s cubic-bezier(0, 0, 0.2, 1) infinite'
            }}
          />
        )}
      </div>

      {/* Tour Floating Interactive Control Dock */}
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#0f172a',
          color: 'white',
          padding: '16px 24px',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          pointerEvents: 'auto',
          maxWidth: '90vw',
          width: '680px'
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '10px', fontWeight: '800', background: 'var(--color-primary)', color: 'white', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
              STEP {tourStepIndex + 1} OF {guideSteps.length}
            </span>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>
              {tourVoiceStatus}
            </span>
          </div>
          <h4 style={{ fontSize: '15px', fontWeight: '800', margin: '0 0 2px 0', color: 'white' }}>
            {guideSteps[tourStepIndex]?.title || 'System Walkthrough'}
          </h4>
          <p style={{ fontSize: '12px', color: '#cbd5e1', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {guideSteps[tourStepIndex]?.description}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn"
            style={{ padding: '6px 12px', fontSize: '12px', background: '#334155', color: 'white', border: 'none' }}
            disabled={tourStepIndex === 0}
            onClick={() => {
              const prevIdx = tourStepIndex - 1;
              setTourStepIndex(prevIdx);
              runTourStep(prevIdx);
            }}
          >
            ◀ Prev
          </button>

          <button
            type="button"
            className="btn btn-primary"
            style={{ padding: '6px 14px', fontSize: '12px' }}
            onClick={() => {
              const nextIdx = (tourStepIndex + 1) % guideSteps.length;
              setTourStepIndex(nextIdx);
              runTourStep(nextIdx);
            }}
          >
            Next Step ▶
          </button>

          <button
            type="button"
            className="btn btn-danger"
            style={{ padding: '6px 10px', fontSize: '12px' }}
            onClick={() => {
              setIsLiveTourActive(false);
              if ('speechSynthesis' in window) window.speechSynthesis.cancel();
              if (showToast) showToast('Interactive Tour Ended', 'info');
            }}
          >
            ✕ Exit
          </button>
        </div>
      </div>
    </div>
  );
}
