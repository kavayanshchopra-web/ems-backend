import React from 'react';

/**
 * Global Design System v2.0 - PageHeader Primitive
 */
export default function PageHeader({
  icon = '📌',
  title,
  subtitle,
  badgeText,
  badgeVariant = 'success',
  actions = null,
  style = {},
  className = ''
}) {
  return (
    <div
      className={`page-header ${className}`}
      style={{
        marginBottom: 'var(--space-6)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        ...style
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {icon && (
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: 'rgba(13, 148, 136, 0.1)',
              color: '#0d9488',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              flexShrink: 0
            }}
          >
            {icon}
          </div>
        )}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 className="page-header-title" style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
              {title}
            </h1>
            {badgeText && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: '800',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: '#059669',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  whiteSpace: 'nowrap'
                }}
              >
                {badgeText}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="page-header-subtitle" style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {actions}
        </div>
      )}
    </div>
  );
}
