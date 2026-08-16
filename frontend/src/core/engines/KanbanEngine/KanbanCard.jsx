/**
 * COMPACT ENTERPRISE CRM KANBAN CARD COMPONENT
 * Single-Line Ellipsis (Name, Email, Phone, Position), Non-Wrapping ATS ID, 15% Compact Vertical Padding,
 * Fixed-Width Status Dropdown (120px), Formatted Date & "No Resume" Fallback
 */

import React, { useState } from 'react';
import { Eye, Edit2, Archive, FileText, Calendar, Mail, Phone, Briefcase, MessageSquare } from 'lucide-react';
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
    const dayStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${dayStr}, ${timeStr}`;
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
  onOpenChatWithLead = null,
  canManage = true
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [, setCurrencyUpdate] = React.useState(0);

  React.useEffect(() => {
    const handleCurrChange = () => setCurrencyUpdate(v => v + 1);
    window.addEventListener('app_currency_changed', handleCurrChange);
    return () => window.removeEventListener('app_currency_changed', handleCurrChange);
  }, []);

  const activeCurr = moduleConfig?.activeCurrency || (typeof window !== 'undefined' ? localStorage.getItem('appCurrency') : null) || 'USD';

  const kanbanConfig = moduleConfig.kanbanFields || {};
  const fieldsMap = new Map((moduleConfig.fields || []).map(f => [f.id, f]));

  const isCrm = moduleConfig?.moduleId === 'crm_deals' || moduleConfig?.moduleId === 'crm_leads';
  const rawName = record.name || record.clientName || record.companyName || record.title || (record.first_name ? `${record.first_name || ''} ${record.last_name || ''}`.trim() : null) || record.fullName;
  const cardName = getValString(rawName, LabelEngine.getEntityName(moduleConfig));

  const amountVal = parseFloat(record.amount || 0);
  const formattedAmount = amountVal > 0 ? LabelEngine.formatCurrencyVal(amountVal, activeCurr) : '';
  const cardSubtitle = isCrm
    ? getValString(record.contact || formattedAmount || record.phone, formattedAmount || 'Sales Deal')
    : getValString(record.position || record.appliedFor || record.department, 'Staff Member');

  const cardEmail = getValString(record.email, '');
  const cardPhone = getValString(record.phone, '');
  const cleanPhone = cardPhone.replace(/[^0-9+]/g, '');
  const cardFile = getValString(record.resume || record.attachment, '');
  const createdDateStr = formatDate(record.createdAt || record.appliedDate);
  const currentStage = getValString(record.status || record.stage, 'Applied');
  const displayId = isCrm ? String(record.id || 'LEAD-0001') : formatCandidateId(record.id, 0, moduleConfig);

  const stagesList = (Array.isArray(activePipelineStages) && activePipelineStages.length > 0)
    ? activePipelineStages
    : (moduleConfig?.stages || []);

  const showPosition = kanbanConfig.position !== false && fieldsMap.get('position')?.showOnKanban !== false && cardSubtitle.length > 0;
  const showEmail = kanbanConfig.email !== false && fieldsMap.get('email')?.showOnKanban !== false;
  const showPhone = kanbanConfig.phone !== false && fieldsMap.get('phone')?.showOnKanban !== false;
  const showResume = !isCrm && kanbanConfig.resume !== false && fieldsMap.get('resume')?.showOnKanban !== false;

  // Dynamic Custom Fields Added via Module Configuration
  const customFields = (moduleConfig.fields || []).filter(f =>
    !f.systemField &&
    !f.archived &&
    !f.deleted &&
    f.showOnKanban !== false
  );

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
        padding: '8px 10px',
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
        gap: '4px',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      {/* 1. TOP BAR: FIXED-WIDTH ID + 1-CLICK DIAL/WHATSAPP & VIEW/EDIT/ARCHIVE BUTTONS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span
          title={`ID: ${displayId}`}
          style={{
            fontSize: '10px',
            fontWeight: '800',
            padding: '2px 6px',
            borderRadius: '5px',
            background: 'rgba(13, 148, 136, 0.1)',
            color: '#0d9488',
            fontFamily: 'monospace',
            letterSpacing: '0.03em',
            whiteSpace: 'nowrap',
            display: 'inline-block',
            flexShrink: 0
          }}
        >
          {displayId}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          {/* Quick Call Button */}
          {cleanPhone && (
            <button
              type="button"
              title={`Call ${cleanPhone}`}
              onClick={(e) => { e.stopPropagation(); window.open(`tel:${cleanPhone}`); }}
              style={{ width: '26px', height: '26px', minWidth: '26px', borderRadius: '5px', border: 'none', background: '#dcfce7', color: '#166534', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
            >
              <Phone size={12} />
            </button>
          )}

          {/* Quick Unified Inbox Chat Button */}
          <button
            type="button"
            title={`Open Unified Inbox Chat (${cardName})`}
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenChatWithLead) {
                onOpenChatWithLead(record);
              } else if (cleanPhone) {
                window.open(`https://wa.me/${cleanPhone.replace('+', '')}`, '_blank');
              }
            }}
            style={{ width: '26px', height: '26px', minWidth: '26px', borderRadius: '5px', border: 'none', background: '#25d366', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
          >
            <MessageSquare size={12} />
          </button>

          <button
            type="button"
            title={`View ${LabelEngine.getEntityName(moduleConfig)} Profile`}
            onClick={(e) => { e.stopPropagation(); onViewRecord(record); }}
            style={{ width: '26px', height: '26px', minWidth: '26px', borderRadius: '5px', border: 'none', background: '#f1f5f9', color: '#0d9488', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
          >
            <Eye size={12} />
          </button>

          <button
            type="button"
            title="Edit Record"
            onClick={(e) => { e.stopPropagation(); onEditRecord(record); }}
            style={{ width: '26px', height: '26px', minWidth: '26px', borderRadius: '5px', border: 'none', background: '#f1f5f9', color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
          >
            <Edit2 size={12} />
          </button>

          <button
            type="button"
            title="Archive Record"
            onClick={(e) => { e.stopPropagation(); onArchiveRecord(record); }}
            style={{ width: '26px', height: '26px', minWidth: '26px', borderRadius: '5px', border: 'none', background: '#f1f5f9', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
          >
            <Archive size={12} />
          </button>
        </div>
      </div>

      {/* 2. NAME & POSITION WITH SINGLE-LINE ELLIPSIS & TOOLTIPS */}
      <div>
        <div
          title={cardName}
          onClick={() => onViewRecord(record)}
          style={{ fontWeight: '800', color: '#0f172a', fontSize: '13px', lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}
        >
          {cardName}
        </div>
        {showPosition && (
          <div
            title={cardSubtitle}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#0d9488', fontSize: '11px', fontWeight: '700', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            <Briefcase size={11} style={{ flexShrink: 0 }} />
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cardSubtitle}</span>
          </div>
        )}
      </div>

      {/* 3. COMPACT CONTACT BOX (EMAIL + PHONE SINGLE LINE ELLIPSIS) */}
      {(showEmail || showPhone) && (
        <div style={{ padding: '4px 6px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #f1f5f9', fontSize: '11px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {showEmail && cardEmail && (
            <div title={`Email: ${cardEmail}`} style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden' }}>
              <Mail size={11} style={{ color: '#0d9488', flexShrink: 0 }} />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: '600' }}>{cardEmail}</span>
            </div>
          )}
          {showPhone && cardPhone && (
            <div title={`Phone: ${cardPhone}`} style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden' }}>
              <Phone size={11} style={{ color: '#0d9488', flexShrink: 0 }} />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: '600' }}>{cardPhone}</span>
            </div>
          )}
        </div>
      )}

      {/* 4. DYNAMIC CUSTOM FIELDS BADGE */}
      {customFields.length > 0 && (
        <div style={{ padding: '4px 6px', background: '#f0fdfa', borderRadius: '5px', border: '1px solid #ccfbf1', fontSize: '10px', color: '#0f766e', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {customFields.map(f => {
            const fieldVal = getValString(record[f.id] || record[f.key] || record.customFields?.[f.id] || record.customFields?.[f.key] || record[f.label]);
            if (!fieldVal) return null;
            return (
              <div key={f.id} title={`${f.label}: ${fieldVal}`} style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden' }}>
                <span style={{ fontWeight: '800', color: '#0d9488', flexShrink: 0 }}>{f.label}:</span>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fieldVal}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. RESUME ("No Resume" FALLBACK) & FORMATTED DATE */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', fontSize: '10px' }}>
        {showResume && (
          cardFile ? (
            <Badge variant="info" style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', padding: '2px 6px', maxWidth: '120px' }}>
              <FileText size={9} style={{ flexShrink: 0 }} />
              <span title={cardFile} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cardFile}</span>
            </Badge>
          ) : (
            <span style={{ color: '#94a3b8', fontSize: '10px', fontWeight: '600' }}>No Resume</span>
          )
        )}

        <div title={`Created: ${createdDateStr}`} style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#64748b', fontWeight: '700', marginLeft: 'auto', flexShrink: 0 }}>
          <Calendar size={10} />
          <span>{createdDateStr}</span>
        </div>
      </div>

      {/* 6. PIPELINE STAGE WITH FIXED-WIDTH DROPDOWN (120px) */}
      {canManage && (
        <div style={{ paddingTop: '4px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
          <span style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', flexShrink: 0 }}>Stage:</span>
          <select
            value={currentStage}
            onChange={(e) => onMoveStage(record.id, e.target.value)}
            style={{
              fontSize: '10px',
              fontWeight: '700',
              padding: '2px 6px',
              borderRadius: '5px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#0d9488',
              cursor: 'pointer',
              width: '120px',
              minWidth: '120px',
              maxWidth: '120px'
            }}
          >
            {stagesList.map(s => {
              const valStr = typeof s === 'string' ? s : getValString(s.name || s.title || s.label || s.id || s);
              const labelStr = typeof s === 'string' ? s : getValString(s.title || s.name || s.label || s.id || s);
              return (
                <option key={s.id || valStr} value={valStr}>
                  {labelStr}
                </option>
              );
            })}
          </select>
        </div>
      )}
    </div>
  );
}
