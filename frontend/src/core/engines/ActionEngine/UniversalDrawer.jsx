/**
 * UNIVERSAL VIEW DRAWER COMPONENT
 * 100% Schema-Driven View Drawer for Record Inspection
 */

import React from 'react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import SchemaFieldRenderer from '../FieldEngine/SchemaFieldRenderer';
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

export default function UniversalDrawer({
  isOpen = false,
  onClose = () => {},
  record = null,
  moduleConfig = {},
  onEditRecord = () => {},
  onArchiveRecord = () => {},
  onMoveStage = () => {},
  canManage = true,
  systemDropdowns = null,
  activePipelineStages = []
}) {
  if (!record) return null;

  const recordName = getValString(record.name || record.title, LabelEngine.getEntityName(moduleConfig));
  const recordSubtitle = getValString(record.position || record.department || record.amount);
  const recordStatus = getValString(record.status || record.stage);

  const viewFields = (moduleConfig.fields || []).filter(f => !f.archived && !f.deleted && f.showOnView !== false);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${LabelEngine.getEntityName(moduleConfig)} Profile`}
      subtitle={`Detailed application record for ${recordName}.`}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* AVATAR & HEADER CARD */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg, #0d9488, #064e43)', color: '#ffffff', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
            {(recordName[0] || 'R')}
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
              {recordName}
            </h3>
            {recordSubtitle && (
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>
                {recordSubtitle}
              </div>
            )}
          </div>
          <Badge variant={LabelEngine.getBadgeVariant(recordStatus)}>
            {recordStatus || 'Active'}
          </Badge>
        </div>

        {/* DYNAMIC SCHEMA FIELD GRID */}
        <div className="universal-drawer-field-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {viewFields.map(field => {
            const rawVal = record[field.id] !== undefined ? record[field.id] : record.customFields?.[field.id];
            const cleanVal = (field.id === 'notes' && typeof rawVal === 'string' && /^Imported from GoHighLevel/i.test(rawVal.trim()))
              ? ''
              : rawVal;

            return (
              <SchemaFieldRenderer
                key={field.id}
                field={field}
                value={cleanVal}
                mode="view"
                moduleConfig={moduleConfig}
                systemDropdowns={systemDropdowns}
              />
            );
          })}
        </div>

        {/* INTEGRATION INFO CARD (GHL SYNC) */}
        {(record.ghlContactId || (record.source && String(record.source).toLowerCase().includes('gohighlevel'))) && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.25)', fontSize: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>⚡</span>
              <div>
                <div style={{ fontWeight: '800', color: '#065f46' }}>GoHighLevel 2-Way Sync</div>
                <div style={{ fontSize: '11px', color: '#047857', fontFamily: 'monospace' }}>
                  GHL Contact ID: {record.ghlContactId || 'Active'}
                </div>
              </div>
            </div>
            {record.ghlContactId && (
              <button
                type="button"
                onClick={() => {
                  if (navigator?.clipboard?.writeText) {
                    navigator.clipboard.writeText(record.ghlContactId);
                    alert(`Copied GHL ID: ${record.ghlContactId}`);
                  }
                }}
                style={{ padding: '4px 10px', borderRadius: '6px', background: '#ffffff', border: '1px solid #10b981', color: '#065f46', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
              >
                📋 Copy ID
              </button>
            )}
          </div>
        )}

        {/* STAGE MOVER IN DRAWER */}
        {canManage && activePipelineStages.length > 0 && (
          <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Move Pipeline Stage</span>
            <select
              value={recordStatus}
              onChange={(e) => onMoveStage(record.id, e.target.value)}
              style={{ width: '100%', padding: '8px 10px', fontSize: '12px', fontWeight: '700', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0d9488', cursor: 'pointer' }}
            >
              {activePipelineStages.map(s => (
                <option key={s.id || s.name} value={getValString(s.name)}>
                  Stage: {getValString(s.name)}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* DRAWER FOOTER ACTIONS */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
            ID: {record.id}
          </span>
          {canManage && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { onClose(); onEditRecord(record); }}
              >
                Edit Profile
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { onClose(); onArchiveRecord(record); }}
              >
                Archive
              </Button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
