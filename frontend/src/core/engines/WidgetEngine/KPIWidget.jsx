/**
 * UNIVERSAL KPI WIDGET CARD COMPONENT
 * Renders a single compact KPI summary metric card
 */

import React from 'react';

export default function KPIWidget({
  widget = {},
  value = 0
}) {
  return (
    <div
      className="kpi-widget-card"
      style={{
        background: '#ffffff',
        padding: '10px 14px',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}
    >
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          background: widget.bg || 'rgba(13, 148, 136, 0.1)',
          color: widget.color || '#0d9488',
          display: 'flex',
          alignItems: 'center',
          justify: 'center',
          fontSize: '18px',
          flexShrink: 0
        }}
      >
        {widget.icon || '📊'}
      </div>
      <div>
        <div style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {widget.label}
        </div>
        <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', lineHeight: 1.2 }}>
          {value}
        </div>
      </div>
    </div>
  );
}
