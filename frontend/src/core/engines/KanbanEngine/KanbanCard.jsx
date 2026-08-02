/**
 * COMPACT ENTERPRISE CRM KANBAN CARD COMPONENT
 * Jira / Trello / ClickUp Quality High-Density Compact Card
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
  if (!isoStr) return '02 Aug 2026';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '02 Aug 2026';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) {
    return '02 Aug 2026';
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
        padding: '12px',
        borderRadius: '10px',
        border: isHovered ? '1px solid #0d9488' : '1px solid #e2e8f0',
        boxShadow: isHovered
          ? '0 6px 12px -2px rgba(13, 148, 136, 0.12), 0 2px 4px -1px rgba(0, 0, 0, 0.04)'
          : '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        transform: isHovered ? 'translateY(-1.5px)' : 'none',
        transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: isDragging ? 0.4 : 1,
        cursor: canManage ? 'grab' : 'default',
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      {/* 1. TOP BAR: CANDIDATE ID + ACTION ICONS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span
          title={`Candidate ID: ${displayId}`}
          style={{
            fontSize: '10px',
            fontWeight: '800',
            padding: '2px 6px',
            borderRadius: '5px',
            background: 'rgba(13, 148, 136, 0.1)',
            color: '#0d9488',
            fontFamily: 'monospace',
            letterSpacing: '0.03em'
          }}
        >
          {displayId}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <button
            type="button"
            title={`View ${LabelEngine.getEntityName(moduleConfig)} Profile`}
            onClick={(e) => { e.stopPropagation(); onViewRecord(record); }}
            style={{ width: '28px', height: '28px', borderRadius: '5px', border: 'none', background: '#f1f5f9', color: '#0d9488', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Eye size={13} />
          </button>
          <button
            type="button"
            title="Edit Candidate"
            onClick={(e) => { e.stopPropagation(); onEditRecord(record); }}
            style={{ width: '28px', height: '28px', borderRadius: '5px', border: 'none', background: '#f1f5f9', color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Edit2 size={13} />
          </button>
          <button
            type="button"
            title="Archive Candidate"
            onClick={(e) => { e.stopPropagation(); onArchiveRecord(record); }}
            style={{ width: '28px', height: '28px', borderRadius: '5px', border: 'none', background: '#f1f5f9', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Archive size={13} />
          </button>
        </div>
      </div>

      {/* 2. CANDIDATE NAME & POSITION */}
      <div>
        <div
          title={cardName}
          onClick={() => onViewRecord(record)}
          style={{ fontWeight: '800', color: '#0f172a', fontSize: '13px', lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}
        >
          {cardName}
        </div>
        {cardSubtitle && (
          <div
            title={cardSubtitle}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#0d9488', fontSize: '11px', fontWeight: '700', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            <Briefcase size={11} style={{ flexShrink: 0 }} />
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cardSubtitle}</span>
          </div>
        )}
      </div>

      {/* 3. COMPACT CONTACT BOX (EMAIL + PHONE) */}
      <div style={{ padding: '6px 8px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #f1f5f9', fontSize: '11px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <div title={cardEmail} style={{ display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden' }}>
          <Mail size={11} style={{ color: '#0d9488', flexShrink: 0 }} />
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: '600' }}>{cardEmail}</span>
        </div>
        <div title={cardPhone} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Phone size={11} style={{ color: '#0d9488', flexShrink: 0 }} />
          <span style={{ fontWeight: '600' }}>{cardPhone}</span>
        </div>
      </div>

      {/* 4. RESUME & DATE ON SAME ROW */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', fontSize: '10px' }}>
        {cardFile && (
          <Badge variant="info" style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', padding: '2px 6px', maxWidth: '140px' }}>
            <FileText size={9} style={{ flexShrink: 0 }} />
            <span title={cardFile} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cardFile}</span>
          </Badge>
        )}
        <div title={`Applied: ${createdDateStr}`} style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#64748b', fontWeight: '700', marginLeft: 'auto', flexShrink: 0 }}>
          <Calendar size={10} />
          <span>{createdDateStr}</span>
        </div>
      </div>

      {/* 5. PIPELINE STAGE ON ONE LINE */}
      {canManage && (
        <div style={{ paddingTop: '6px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
          <span style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', flexShrink: 0 }}>Stage:</span>
          <select
            value={currentStage}
            onChange={(e) => onMoveStage(record.id, e.target.value)}
            style={{ fontSize: '10px', fontWeight: '700', padding: '3px 6px', borderRadius: '5px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0d9488', cursor: 'pointer', maxWidth: '180px' }}
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
