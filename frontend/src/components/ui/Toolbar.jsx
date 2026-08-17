import React from 'react';

/**
 * Global Design System v2.0 - Toolbar Primitive
 */
export default function Toolbar({
  leftContent,
  rightContent,
  style = {},
  className = ''
}) {
  return (
    <div
      className={`app-toolbar ${className}`}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '20px',
        flexWrap: 'wrap',
        ...style
      }}
    >
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', maxWidth: '100%' }}>
        {leftContent}
      </div>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        {rightContent}
      </div>
    </div>
  );
}
