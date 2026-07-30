import React from 'react';
import Button from './Button';

/**
 * Global Design System v2.0 - Modal Primitive
 */
export default function Modal({
  isOpen = false,
  onClose,
  title,
  subtitle,
  children,
  footer = null,
  size = 'md', // 'sm' | 'md' | 'lg' | 'fullscreen'
  danger = false,
  style = {},
  className = ''
}) {
  if (!isOpen) return null;

  const getMaxWidth = () => {
    switch (size) {
      case 'sm': return '400px';
      case 'lg': return '720px';
      case 'fullscreen': return '95vw';
      case 'md':
      default: return '540px';
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--z-modal-backdrop, 400)',
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      className={`app-modal-overlay ${className}`}
    >
      <div
        style={{
          width: '100%',
          maxWidth: getMaxWidth(),
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          fontFamily: 'Inter, system-ui, sans-serif',
          animation: 'fadeIn 0.2s ease-out',
          border: '1px solid #e2e8f0',
          ...style
        }}
      >
        {/* Header */}
        <div
          style={{
            background: danger
              ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)'
              : 'linear-gradient(135deg, #0d9488 0%, #064e43 100%)',
            padding: '18px 24px',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#ffffff' }}>
              {title}
            </h3>
            {subtitle && (
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.85)' }}>
                {subtitle}
              </p>
            )}
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: '#ffffff',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                fontWeight: '700'
              }}
              aria-label="Close modal"
            >
              ✕
            </button>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flexGrow: 1 }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            style={{
              padding: '16px 24px',
              background: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justify: 'flex-end',
              gap: '12px',
              flexShrink: 0
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
