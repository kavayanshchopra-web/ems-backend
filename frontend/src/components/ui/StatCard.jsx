import React from 'react';

/**
 * Global Design System v2.0 - StatCard / KpiCard Primitive
 * Inherits exact Emerald / Dark Slate theme
 */
export default function StatCard({
  icon = '📦',
  title,
  value,
  subtitle,
  trend,
  trendDirection = 'up', // 'up' | 'down' | 'neutral'
  color = '#0f2b26',
  badgeText,
  badgeBg = 'rgba(16, 185, 129, 0.1)',
  badgeColor = '#059669',
  style = {},
  className = ''
}) {
  return (
    <div
      className={`glass-card ${className}`}
      style={{
        padding: '16px 20px',
        borderRadius: '12px',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'all 0.15s ease',
        ...style
      }}
    >
      <div style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {icon && <span style={{ fontSize: '14px' }}>{icon}</span>}
          <span>{title}</span>
        </div>
        {trend && (
          <span style={{ fontSize: '11px', fontWeight: '800', color: trendDirection === 'up' ? '#059669' : (trendDirection === 'down' ? '#ef4444' : '#64748b') }}>
            {trendDirection === 'up' ? '▲' : (trendDirection === 'down' ? '▼' : '•')} {trend}
          </span>
        )}
      </div>

      <div style={{ fontSize: '1.8rem', fontWeight: '800', color: color, marginTop: '6px', lineHeight: '1.2' }}>
        {value}
      </div>

      {(subtitle || badgeText) && (
        <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {badgeText && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: '800',
                padding: '2px 8px',
                borderRadius: '6px',
                background: badgeBg,
                color: badgeColor,
                border: `1px solid ${badgeBg}`
              }}
            >
              {badgeText}
            </span>
          )}
          {subtitle && <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
