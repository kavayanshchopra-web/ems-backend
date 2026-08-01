/**
 * UNIVERSAL KANBAN CARD COMPONENT
 * 100% Schema-Driven Card Renderer for any EMS Module Record
 */

import React from 'react';
import { Eye, Edit2, Archive, FileText } from 'lucide-react';
import Badge from '../../../components/ui/Badge';
import { LabelEngine } from '../LabelEngine';

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

  const kanbanCardsConfig = moduleConfig.kanbanFields || { position: true, email: true, phone: true, resume: true };

  return (
    <div
      className="kanban-card-container"
      style={{
        background: '#f8fafc',
        padding: '12px 14px',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        transition: 'all 0.15s ease',
        overflow: 'hidden'
      }}
    >
      {/* HEADER: TITLE + VIEW EYE BUTTON */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div>
          <div
            onClick={() => onViewRecord(record)}
            style={{ fontWeight: '700', color: '#0f172a', fontSize: '13px', wordBreak: 'break-word', cursor: 'pointer' }}
          >
            {cardName}
          </div>
          {kanbanCardsConfig.position && cardSubtitle && (
            <div style={{ color: '#0d9488', fontSize: '11px', fontWeight: '600', marginTop: '2px', wordBreak: 'break-word' }}>
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
          <Eye size={14} />
        </button>
      </div>

      {/* CONTACT INFO */}
      {(kanbanCardsConfig.email || kanbanCardsConfig.phone) && (cardEmail || cardPhone) && (
        <div style={{ marginTop: '6px', fontSize: '10px', color: '#475569' }}>
          {kanbanCardsConfig.email && cardEmail && <div>📧 {cardEmail}</div>}
          {kanbanCardsConfig.phone && cardPhone && cardPhone !== cardSubtitle && <div>📞 {cardPhone}</div>}
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
        <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <select
            value={currentStage}
            onChange={(e) => onMoveStage(record.id, e.target.value)}
            style={{ fontSize: '10px', fontWeight: '700', padding: '3px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0d9488', cursor: 'pointer' }}
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
              style={{ padding: '3px 6px', fontSize: '10px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', cursor: 'pointer' }}
            >
              Edit
            </button>
            <button
              type="button"
              title="Archive Record"
              onClick={(e) => { e.stopPropagation(); onArchiveRecord(record); }}
              style={{ padding: '3px 6px', fontSize: '10px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
            >
              <Archive size={10} /> Archive
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
