/**
 * ENTERPRISE CRM KANBAN CARD COMPONENT
 * HubSpot/Jira Style Drag-and-Drop Card with Rich Metadata & Hover Elevation
 */

import React, { useState } from 'react';
import { Eye, Edit2, Archive, FileText, Calendar, Mail, Phone, Briefcase } from 'lucide-react';
import Badge from '../../../components/ui/Badge';
import { LabelEngine } from '../LabelEngine';
import { formatCandidateId } from '../../../services/atsStorageService';

const getValString = (val, fallback = '') => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') {
    return val.trim().length > 0 ? val.trim() : fallback;
  }
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object') {
    if (typeof val.name === 'string' && val.name.trim()) return val.name.trim();
    if (typeof val.title === 'string' && val.title.trim()) return val.title.trim();
    if (typeof val.label === 'string' && val.label.trim()) return val.label.trim();
    if (typeof val.value === 'string' && val.value.trim()) return val.value.trim();
  }
  return fallback;
};

const formatDate = (isoStr) => {
  if (!isoStr) return '01 Aug 2026';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '01 Aug 2026';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) {
    return '01 Aug 2026';
  }
};

export default function KanbanCard({
  record,
  moduleConfig = {},
  activePipelineStages = [],
  onViewRecord = () => {},
  onEditRecord = () => {},
  onArchiveRecord = () => {},
  onMoveStage = () => {},
  canManage = true
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const cardName = getValString(record.name || record.title, LabelEngine.getEntityName(moduleConfig));
  const cardSubtitle = getValString(record.position || record.appliedFor || record.department, 'Sales Representative');
  const cardEmail = getValString(record.email, 'kavayanshchopra@gmail.com');
  const cardPhone = getValString(record.phone, '8566883642');
  const cardFile = getValString(record.resume || record.attachment, 'Resume.pdf');
  const createdDateStr = formatDate(record.createdAt || record.appliedDate);
  const currentStage = getValString(record.status || record.stage, 'Applied');
  const displayId = formatCandidateId(record.id, 0, moduleConfig);

  return (
    <div
      className="enterprise-kanban-card"
      draggable={canManage}
      onDragStart={(e) => {
        setIsDragging(true);
        e.dataTransfer.setData('text/plain', String(record.id));
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDragEnd={() => setIsDragging(false)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: '#ffffff',
        padding: '16px',
        borderRadius: '12px',
        border: isHovered ? '1px solid #0d9488' : '1px solid #e2e8f0',
        boxShadow: isHovered
          ? '0 10px 15px -3px rgba(13, 148, 136, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
          : '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        transform: isHovered ? 'translateY(-2px)' : 'none',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: isDragging ? 0.4 : 1,
        cursor: canManage ? 'grab' : 'default',
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}
    >
      {/* 1. CARD TOP BAR: CANDIDATE ID + ACTIONS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span
          style={{
            fontSize: '10px',
            fontWeight: '800',
            padding: '3px 8px',
            borderRadius: '6px',
            background: 'rgba(13, 148, 136, 0.1)',
            color: '#0d9488',
            fontFamily: 'monospace',
            letterSpacing: '0.04em'
          }}
        >
          {displayId}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            type="button"
            title={`View ${LabelEngine.getEntityName(moduleConfig)} Profile`}
            onClick={(e) => { e.stopPropagation(); onViewRecord(record); }}
            style={{ padding: '4px', borderRadius: '6px', border: 'none', background: '#f1f5f9', color: '#0d9488', cursor: 'pointer' }}
          >
            <Eye size={14} />
          </button>
          <button
            type="button"
            title="Edit Candidate"
            onClick={(e) => { e.stopPropagation(); onEditRecord(record); }}
            style={{ padding: '4px', borderRadius: '6px', border: 'none', background: '#f1f5f9', color: '#334155', cursor: 'pointer' }}
          >
            <Edit2 size={14} />
          </button>
          <button
            type="button"
            title="Archive Candidate"
            onClick={(e) => { e.stopPropagation(); onArchiveRecord(record); }}
            style={{ padding: '4px', borderRadius: '6px', border: 'none', background: '#f1f5f9', color: '#64748b', cursor: 'pointer' }}
          >
            <Archive size={14} />
          </button>
        </div>
      </div>

      {/* 2. CANDIDATE NAME & POSITION HEADER */}
      <div>
        <div
          onClick={() => onViewRecord(record)}
          style={{ fontWeight: '800', color: '#0f172a', fontSize: '14px', lineHeight: 1.3, wordBreak: 'break-word', cursor: 'pointer' }}
        >
          {cardName}
        </div>
        {cardSubtitle && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#0d9488', fontSize: '12px', fontWeight: '700', marginTop: '4px' }}>
            <Briefcase size={12} style={{ flexShrink: 0 }} />
            <span>{cardSubtitle}</span>
          </div>
        )}
      </div>

      {/* 3. CONTACT DETAILS STRIP (EMAIL & PHONE) */}
      <div style={{ padding: '8px 10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9', fontSize: '11px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
          <Mail size={12} style={{ color: '#0d9488', flexShrink: 0 }} />
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: '600' }}>{cardEmail}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Phone size={12} style={{ color: '#0d9488', flexShrink: 0 }} />
          <span style={{ fontWeight: '600' }}>{cardPhone}</span>
        </div>
      </div>

      {/* 4. ATTACHMENT & CREATED DATE STRIP */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '11px' }}>
        {cardFile && (
          <Badge variant="info" style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px' }}>
            <FileText size={10} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '110px' }}>{cardFile}</span>
          </Badge>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b', fontSize: '10px', fontWeight: '700', marginLeft: 'auto' }}>
          <Calendar size={11} />
          <span>{createdDateStr}</span>
        </div>
      </div>

      {/* 5. FOOTER STAGE SELECTOR DROPDOWN */}
      {canManage && (
        <div style={{ paddingTop: '8px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Pipeline Stage:</span>
          <select
            value={currentStage}
            onChange={(e) => onMoveStage(record.id, e.target.value)}
            style={{ fontSize: '11px', fontWeight: '700', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0d9488', cursor: 'pointer' }}
          >
            {activePipelineStages.map(s => (
              <option key={s.id || s.name} value={getValString(s.name)}>
                {getValString(s.name)}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
