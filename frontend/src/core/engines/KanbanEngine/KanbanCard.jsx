/**
 * UNIVERSAL KANBAN CARD COMPONENT
 * 100% Schema-Driven Card Renderer with Full Visible Details & Candidate ID
 */

import React from 'react';
import { Eye, Edit2, Archive, FileText } from 'lucide-react';
import Badge from '../../../components/ui/Badge';
import { LabelEngine } from '../LabelEngine';
import { formatCandidateId } from '../../../services/atsStorageService';

const getValString = (val, fallback = '') => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string' || typeof val === 'number') return String(val);
  if (typeof val === 'object') {
    if (typeof val.name === 'string') return val.name;
    if (typeof val.title === 'string') return val.title;
    if (typeof val.label === 'string') return val.label;
    if (typeof val.value === 'string') return val.value;
  }
  return fallback;
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
  const cardName = getValString(record.name || record.title, LabelEngine.getEntityName(moduleConfig));
  const cardSubtitle = getValString(record.position || record.department || record.amount);
  const cardEmail = getValString(record.email);
  const cardPhone = getValString(record.phone);
  const cardFile = getValString(record.resume || record.attachment);
  const currentStage = getValString(record.status || record.stage);
  const displayId = formatCandidateId(record.id, 0, moduleConfig);

  const kanbanCardsConfig = {
    position: moduleConfig.kanbanFields?.position !== false,
    email: moduleConfig.kanbanFields?.email !== false,
    phone: moduleConfig.kanbanFields?.phone !== false,
    resume: moduleConfig.kanbanFields?.resume !== false
  };

  return (
    <div
      className="kanban-card-container"
      style={{
        background: '#ffffff',
        padding: '14px',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 5px rgba(0,0,0,0.04)',
        transition: 'all 0.15s ease',
        overflow: 'hidden'
      }}
    >
      {/* HEADER: ID BADGE + TITLE + VIEW EYE BUTTON */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span style={{ fontSize: '10px', fontWeight: '800', padding: '2px 7px', borderRadius: '4px', background: 'rgba(13, 148, 136, 0.12)', color: '#0d9488', fontFamily: 'monospace' }}>
              {displayId}
            </span>
          </div>
          <div
            onClick={() => onViewRecord(record)}
            style={{ fontWeight: '800', color: '#0f172a', fontSize: '13px', lineHeight: 1.3, wordBreak: 'break-word', cursor: 'pointer' }}
          >
            {cardName}
          </div>
          {kanbanCardsConfig.position && cardSubtitle && (
            <div style={{ color: '#0d9488', fontSize: '11px', fontWeight: '700', marginTop: '3px', wordBreak: 'break-word' }}>
              {cardSubtitle}
            </div>
          )}
        </div>
        <button
          type="button"
          title={`View ${LabelEngine.getEntityName(moduleConfig)} Profile`}
          onClick={() => onViewRecord(record)}
          style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px' }}
        >
          <Eye size={15} />
        </button>
      </div>

      {/* CONTACT INFO (EMAIL & PHONE ALWAYS ON FRONT) */}
      {(cardEmail || cardPhone) && (
        <div style={{ marginTop: '8px', fontSize: '11px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '3px' }}>
          {cardEmail && <div>📧 {cardEmail}</div>}
          {cardPhone && cardPhone !== cardSubtitle && <div>📞 {cardPhone}</div>}
        </div>
      )}

      {/* ATTACHMENT BADGE */}
      {kanbanCardsConfig.resume && cardFile && (
        <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px', maxWidth: '100%', overflow: 'hidden' }}>
          <Badge variant="info" style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <FileText size={10} style={{ marginRight: '3px', flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cardFile}</span>
          </Badge>
        </div>
      )}

      {/* FOOTER ACTIONS & STAGE MOVER */}
      {canManage && (
        <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <select
            value={currentStage}
            onChange={(e) => onMoveStage(record.id, e.target.value)}
            style={{ fontSize: '10px', fontWeight: '700', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0d9488', cursor: 'pointer' }}
          >
            {activePipelineStages.map(s => (
              <option key={s.id || s.name} value={getValString(s.name)}>
                Stage: {getValString(s.name)}
              </option>
            ))}
          </select>

          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onEditRecord(record); }}
              style={{ padding: '4px 8px', fontSize: '10px', fontWeight: '700', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', cursor: 'pointer' }}
            >
              Edit
            </button>
            <button
              type="button"
              title="Archive Record"
              onClick={(e) => { e.stopPropagation(); onArchiveRecord(record); }}
              style={{ padding: '4px 8px', fontSize: '10px', fontWeight: '700', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
            >
              <Archive size={10} /> Archive
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
