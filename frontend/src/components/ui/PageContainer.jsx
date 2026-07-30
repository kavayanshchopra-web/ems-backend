import React from 'react';

/**
 * Global Design System v2.0 - PageContainer Primitive
 * Restricts ultra-wide stretching on 1920px displays while allowing full width for Kanban, Maps & Inbox
 */
export default function PageContainer({
  children,
  fullWidth = false,
  maxWidth = '1600px',
  style = {},
  className = ''
}) {
  return (
    <div
      className={`glass-panel app-page-container ${className}`}
      style={{
        padding: 'var(--space-6)',
        margin: 'var(--space-4)',
        overflowY: 'auto',
        flexGrow: 1,
        width: '100%',
        maxWidth: fullWidth ? '100%' : maxWidth,
        boxSizing: 'border-box',
        ...style
      }}
    >
      {children}
    </div>
  );
}
