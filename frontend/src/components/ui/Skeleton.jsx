import React from 'react';

/**
 * Global Design System v2.0 - Skeleton Pulse Primitive
 */
export default function Skeleton({ width = '100%', height = '20px', borderRadius = '6px', style = {} }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
        backgroundSize: '200% 100%',
        animation: 'skeletonPulse 1.5s infinite ease-in-out',
        ...style
      }}
    />
  );
}
