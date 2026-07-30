import React from 'react';

/**
 * Global Design System v2.0 - Spinner Primitive
 */
export default function Spinner({ size = '32px', color = '#0d9488', style = {} }) {
  return (
    <div
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        border: `3px solid rgba(13, 148, 136, 0.2)`,
        borderTopColor: color,
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        ...style
      }}
    />
  );
}
