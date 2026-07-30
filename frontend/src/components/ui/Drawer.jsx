import React from 'react';

/**
 * Global Design System v2.0 - Drawer Primitive (Slide-in Drawer)
 */
export default function Drawer({
  isOpen = false,
  onClose,
  title,
  subtitle,
  children,
  position = 'right', // 'right' | 'left'
  width = '420px',
  style = {},
  className = ''
}) {
  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--z-drawer, 200)',
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        justifyContent: position === 'left' ? 'flex-start' : 'flex-end'
      }}
      className={`app-drawer-overlay ${className}`}
    >
      <div
        style={{
          width: '100%',
          maxWidth: width,
          height: '100%',
          background: '#ffffff',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'Inter, system-ui, sans-serif',
          animation: 'slideIn 0.25s ease-out',
          ...style
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f8fafc'
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>{title}</h3>
            {subtitle && <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>{subtitle}</p>}
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '18px',
                color: '#64748b',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Drawer Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flexGrow: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
