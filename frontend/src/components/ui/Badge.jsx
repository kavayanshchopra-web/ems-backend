import React from 'react';

/**
 * Global Design System v2.0 - Badge / Status Pill Primitive
 */
export default function Badge({
  children,
  variant = 'teal', // 'teal' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  icon = null,
  style = {},
  className = ''
}) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'teal':
        return {
          background: 'rgba(13, 148, 136, 0.1)',
          color: '#0d9488',
          border: '1px solid rgba(13, 148, 136, 0.2)'
        };
      case 'success':
        return {
          background: 'rgba(16, 185, 129, 0.1)',
          color: '#059669',
          border: '1px solid rgba(16, 185, 129, 0.25)'
        };
      case 'warning':
        return {
          background: 'rgba(245, 158, 11, 0.1)',
          color: '#d97706',
          border: '1px solid rgba(245, 158, 11, 0.25)'
        };
      case 'danger':
        return {
          background: 'rgba(239, 68, 68, 0.1)',
          color: '#ef4444',
          border: '1px solid rgba(239, 68, 68, 0.25)'
        };
      case 'info':
        return {
          background: 'rgba(59, 130, 246, 0.1)',
          color: '#2563eb',
          border: '1px solid rgba(59, 130, 246, 0.25)'
        };
      case 'neutral':
      default:
        return {
          background: '#f1f5f9',
          color: '#64748b',
          border: '1px solid #cbd5e1'
        };
    }
  };

  return (
    <span
      className={`app-badge app-badge-${variant} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '11px',
        fontWeight: '800',
        padding: '3px 10px',
        borderRadius: '12px',
        whiteSpace: 'nowrap',
        lineHeight: '1.2',
        ...getVariantStyles(),
        ...style
      }}
    >
      {icon && <span style={{ fontSize: '10px' }}>{icon}</span>}
      <span>{children}</span>
    </span>
  );
}
