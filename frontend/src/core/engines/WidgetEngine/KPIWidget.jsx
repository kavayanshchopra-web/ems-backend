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
  { color: '#0d9488', bg: 'rgba(13, 148, 136, 0.1)' }, // Teal
  { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },   // Rose / Red
  { color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' }, // Emerald / Green
  { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' }, // Amber / Orange
  { color: '#0284c7', bg: 'rgba(2, 132, 199, 0.1)' },  // Sky Blue
  { color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' }, // Purple / Violet
  { color: '#ec4899', bg: 'rgba(236, 72, 153, 0.1)' }, // Pink
  { color: '#0f766e', bg: 'rgba(15, 118, 110, 0.1)' }  // Deep Teal
];

// Helper to render known icon or fallback emoji
function renderIcon(icon, color) {
  if (!icon) return <Users size={18} color={color} />;

  // If already a React element
  if (React.isValidElement(icon)) return icon;

  const str = String(icon).trim();

  // Map common emojis and string keys to Lucide icons
  if (str === '👥' || str.toLowerCase() === 'users') return <Users size={18} color={color} />;
  if (str === '💬' || str.toLowerCase().includes('whatsapp') || str.toLowerCase() === 'chat') return <MessageSquare size={18} color={color} />;
  if (str === '🎯' || str.toLowerCase() === 'target' || str.toLowerCase().includes('lead')) return <Target size={18} color={color} />;
  if (str === '💰' || str === '$' || str.toLowerCase().includes('revenue') || str.toLowerCase() === 'dollar') return <DollarSign size={18} color={color} />;
  if (str.toLowerCase() === 'briefcase' || str === '🏢') return <Briefcase size={18} color={color} />;
  if (str.toLowerCase() === 'shield' || str === '🛡️') return <Shield size={18} color={color} />;
  if (str.toLowerCase() === 'layers' || str === '📚') return <Layers size={18} color={color} />;
  if (str.toLowerCase() === 'phone' || str === '📞') return <Phone size={18} color={color} />;
  if (str.toLowerCase() === 'clock' || str === '⏱️') return <Clock size={18} color={color} />;
  if (str.toLowerCase() === 'trendup' || str === '📈') return <TrendingUp size={18} color={color} />;
  if (str.toLowerCase() === 'trenddown' || str === '📉') return <TrendingDown size={18} color={color} />;
  if (str.toLowerCase() === 'usercheck' || str === '👤') return <UserCheck size={18} color={color} />;

  // Fallback to emoji/text
  return <span style={{ fontSize: '18px', lineHeight: 1 }}>{str}</span>;
}

export default function KPIWidget({
  widget = {},
  value = 0,
  index = 0
}) {
  const fallback = COLOR_PALETTE[index % COLOR_PALETTE.length];
  const cardColor = widget.color || fallback.color;
  const cardBgLight = widget.bgLight || widget.bg || fallback.bg;

  return (
    <div
      className="kpi-widget-card"
      style={{
        background: '#ffffff',
        padding: '12px 16px',
        borderRadius: '14px',
        border: '1px solid rgba(226, 232, 240, 0.85)',
        boxShadow: '0 3px 10px rgba(15, 23, 42, 0.03)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'default',
        boxSizing: 'border-box'
      }}
    >
      {/* 1. Left Color Accent Strip (Matching SuperAdmin visual style) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '4px',
          height: '100%',
          background: cardColor,
          borderRadius: '4px 0 0 4px'
        }}
      />

      {/* 2. Metric Label & Vibrant Value */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '3px',
          minWidth: 0,
          paddingLeft: '4px',
          overflow: 'hidden'
        }}
      >
        <span
          className="kpi-label"
          style={{
            fontSize: '10.5px',
            fontWeight: '700',
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            overflow: 'hidden'
          }}
        >
          {widget.label}
        </span>
        <span
          className="kpi-value"
          style={{
            fontSize: '22px',
            fontWeight: '800',
            color: cardColor,
            lineHeight: 1.15
          }}
        >
          {value}
        </span>
      </div>

      {/* 3. Soft Tinted Icon Container on the Right */}
      <div
        className="kpi-icon-box"
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          background: cardBgLight,
          color: cardColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginLeft: '12px',
          transition: 'transform 0.2s ease'
        }}
      >
        {renderIcon(widget.icon, cardColor)}
      </div>
    </div>
  );
}
