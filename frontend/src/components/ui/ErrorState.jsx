import React from 'react';
import Button from './Button';

/**
 * Global Design System v2.0 - ErrorState Primitive
 */
export default function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred while loading this view.',
  onRetry = null,
  style = {},
  className = ''
}) {
  return (
    <div
      className={`app-error-state ${className}`}
      style={{
        padding: '36px 24px',
        textAlign: 'center',
        background: '#fef2f2',
        borderRadius: '12px',
        border: '1px solid #fecaca',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '20px 0',
        ...style
      }}
    >
      <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⚠️</div>
      <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#991b1b', margin: '0 0 4px 0' }}>{title}</h3>
      <p style={{ fontSize: '12px', color: '#b91c1c', margin: '0 0 16px 0', maxWidth: '400px' }}>{message}</p>
      {onRetry && (
        <Button variant="danger-solid" size="sm" onClick={onRetry}>
          🔄 Retry
        </Button>
      )}
    </div>
  );
}
