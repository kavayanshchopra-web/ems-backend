import React from 'react';
import Button from './Button';

/**
 * Global Design System v2.0 - EmptyState Primitive
 */
export default function EmptyState({
  icon = '🗑️',
  title = 'No records found',
  description = 'No items match your filter criteria.',
  actionLabel = null,
  onAction = null,
  style = {},
  className = ''
}) {
  return (
    <div
      className={`app-empty-state ${className}`}
      style={{
        padding: '48px 24px',
        textAlign: 'center',
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px border-dashed #cbd5e1',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '20px 0',
        ...style
      }}
    >
      <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>{icon}</div>
      <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>{title}</h3>
      <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0', maxWidth: '360px' }}>{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
