/**
 * UNIVERSAL KPI WIDGET CARD COMPONENT
 * Renders a high-end, colorful KPI summary metric card
 * Matches the SuperAdmin / Executive Analytics visual design system
 */

import React from 'react';
import {
  Users,
  MessageSquare,
  Target,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  Briefcase,
  Shield,
  Layers,
  Phone,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  FileText
} from 'lucide-react';

const COLOR_PALETTE = [
  { color: '#2563eb', bg: '#eff6ff' }, // Sky Blue (like Total Calls)
  { color: '#16a34a', bg: '#f0fdf4' }, // Emerald Green (like Answered)
  { color: '#dc2626', bg: '#fef2f2' }, // Crimson / Coral (like Missed)
  { color: '#d97706', bg: '#fffbeb' }, // Amber Orange (like Follow-up)
  { color: '#0284c7', bg: '#f0f9ff' }, // Ocean Blue
  { color: '#8b5cf6', bg: '#f5f3ff' }, // Purple
  { color: '#ec4899', bg: '#fdf2f8' }, // Rose Pink
  { color: '#0d9488', bg: '#f0fdfa' }  // Teal
];

// Helper to render known icon or fallback emoji
function renderIcon(icon, color) {
  const iconSize = 22;
  if (!icon) return <Users size={iconSize} color={color} />;

  // If already a React element
  if (React.isValidElement(icon)) return icon;

  const str = String(icon).trim();

  // Map common emojis and string keys to Lucide icons
  if (str === '👥' || str.toLowerCase() === 'users') return <Users size={iconSize} color={color} />;
  if (str === '💬' || str.toLowerCase().includes('whatsapp') || str.toLowerCase() === 'chat') return <MessageSquare size={iconSize} color={color} />;
  if (str === '🎯' || str.toLowerCase() === 'target' || str.toLowerCase().includes('lead')) return <Target size={iconSize} color={color} />;
  if (str === '💰' || str === '$' || str.toLowerCase().includes('revenue') || str.toLowerCase() === 'dollar') return <DollarSign size={iconSize} color={color} />;
  if (str.toLowerCase() === 'briefcase' || str === '🏢') return <Briefcase size={iconSize} color={color} />;
  if (str.toLowerCase() === 'shield' || str === '🛡️') return <Shield size={iconSize} color={color} />;
  if (str.toLowerCase() === 'layers' || str === '📚') return <Layers size={iconSize} color={color} />;
  if (str.toLowerCase() === 'phone' || str === '📞') return <Phone size={iconSize} color={color} />;
  if (str.toLowerCase() === 'clock' || str === '⏱️' || str === '⏰') return <Clock size={iconSize} color={color} />;
  if (str === '🚨' || str.toLowerCase().includes('bypass') || str.toLowerCase().includes('alert')) return <AlertCircle size={iconSize} color={color} />;
  if (str.toLowerCase() === 'trendup' || str === '📈') return <TrendingUp size={iconSize} color={color} />;
  if (str.toLowerCase() === 'trenddown' || str === '📉') return <TrendingDown size={iconSize} color={color} />;
  if (str.toLowerCase() === 'usercheck' || str === '👤') return <UserCheck size={iconSize} color={color} />;

  // Fallback to emoji/text
  return <span style={{ fontSize: '20px', lineHeight: 1 }}>{str}</span>;
}

export default function KPIWidget({
  widget = {},
  value = 0,
  index = 0
}) {
  const fallback = COLOR_PALETTE[index % COLOR_PALETTE.length];
  const cardColor = widget.color || fallback.color;
  // Ensure soft pastel background for the circular badge
  const cardBgLight = widget.bgLight || (widget.bg && widget.bg.includes('rgba') ? widget.bg : fallback.bg);

  return (
    <div
      className="kpi-widget-card"
      style={{
        background: '#ffffff',
        padding: '14px 18px',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        position: 'relative',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'default',
        boxSizing: 'border-box'
      }}
    >
      {/* 1. Large, Colorful Circular Icon Badge on the LEFT */}
      <div
        className="kpi-icon-badge"
        style={{
          width: '46px',
          height: '46px',
          borderRadius: '50%',
          background: cardBgLight,
          color: cardColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          border: `1px solid ${cardColor}25`,
          boxShadow: `0 2px 6px ${cardColor}15`
        }}
      >
        {renderIcon(widget.icon, cardColor)}
      </div>

      {/* 2. Text Details on the RIGHT */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          minWidth: 0,
          flex: 1
        }}
      >
        <span
          className="kpi-label"
          style={{
            fontSize: '11.5px',
            fontWeight: '600',
            color: '#64748b',
            letterSpacing: '0.2px',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            overflow: 'hidden'
          }}
        >
          {widget.label}
        </span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span
            className="kpi-value"
            style={{
              fontSize: '24px',
              fontWeight: '800',
              color: '#0f172a',
              lineHeight: 1.1
            }}
          >
            {value}
          </span>
          {widget.metricType === 'STAGE_COUNT' && (
            <span style={{ fontSize: '11px', fontWeight: '700', color: cardColor }}>
              Active
            </span>
          )}
          {widget.metricType === 'BYPASS_COUNT' && value > 0 && (
            <span style={{ fontSize: '10px', fontWeight: '800', color: '#dc2626', background: '#fee2e2', padding: '1px 6px', borderRadius: '6px' }}>
              Alert
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
