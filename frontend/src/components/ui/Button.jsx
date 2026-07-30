import React from 'react';

/**
 * Global Design System v2.0 - Button Primitive
 * Inherits exact Emerald Teal theme palette (#0d9488 -> #064e43)
 */
export default function Button({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'danger' | 'danger-solid' | 'success' | 'outline' | 'ghost'
  size = 'md', // 'sm' | 'md' | 'lg'
  icon = null,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  type = 'button',
  onClick,
  style = {},
  className = '',
  ariaLabel,
  ...props
}) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          background: 'linear-gradient(135deg, #0d9488 0%, #064e43 100%)',
          color: '#ffffff',
          border: 'none',
          boxShadow: '0 2px 8px rgba(13, 148, 136, 0.25)'
        };
      case 'secondary':
        return {
          background: '#ffffff',
          color: '#334155',
          border: '1px solid #cbd5e1',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
        };
      case 'danger':
        return {
          background: 'rgba(239, 68, 68, 0.1)',
          color: '#ef4444',
          border: '1px solid rgba(239, 68, 68, 0.3)'
        };
      case 'danger-solid':
        return {
          background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
          color: '#ffffff',
          border: 'none',
          boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)'
        };
      case 'success':
        return {
          background: 'rgba(16, 185, 129, 0.1)',
          color: '#059669',
          border: '1px solid rgba(16, 185, 129, 0.3)'
        };
      case 'outline':
        return {
          background: 'transparent',
          color: '#0d9488',
          border: '1.5px solid #0d9488'
        };
      case 'ghost':
        return {
          background: 'transparent',
          color: '#475569',
          border: 'none'
        };
      default:
        return {};
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          padding: '6px 12px',
          fontSize: '12px',
          height: '32px',
          borderRadius: '6px'
        };
      case 'lg':
        return {
          padding: '10px 20px',
          fontSize: '14px',
          height: '44px',
          borderRadius: '10px'
        };
      case 'md':
      default:
        return {
          padding: '8px 16px',
          fontSize: '12px',
          height: '38px',
          borderRadius: '8px'
        };
    }
  };

  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    fontWeight: '700',
    fontFamily: 'Inter, system-ui, sans-serif',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    transition: 'all 0.15s ease',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    width: fullWidth ? '100%' : 'auto',
    minHeight: '32px',
    ...getSizeStyles(),
    ...getVariantStyles(),
    ...style
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      style={baseStyle}
      className={`app-btn app-btn-${variant} ${className}`}
      aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
      {...props}
    >
      {loading && (
        <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
      )}
      {!loading && icon && iconPosition === 'left' && <span className="btn-icon">{icon}</span>}
      {children && <span>{children}</span>}
      {!loading && icon && iconPosition === 'right' && <span className="btn-icon">{icon}</span>}
    </button>
  );
}
