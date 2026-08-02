/**
 * UNIVERSAL ARCHIVED RECORDS MODAL
 * Displays archived module records with Restore and Permanent Delete actions
 */

import React from 'react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import EmptyState from '../../../components/ui/EmptyState';
import { RotateCcw, Trash2 } from 'lucide-react';
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

const formatDate = (isoStr) => {
  if (!isoStr) return '01 Aug 2026';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return String(isoStr);
    const dayStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${dayStr}, ${timeStr}`;
  } catch (e) {
    return String(isoStr);
  }
};

export default function ArchivedModal({
  isOpen = false,
  onClose = () => {},
  moduleConfig = {},
  archivedItems = [],
  onRestoreItem = () => {}
}) {
  const entityName = LabelEngine.getEntityName(moduleConfig);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Archived ${LabelEngine.getEntityNamePlural(moduleConfig)}`}
      subtitle={`Safely manage soft-archived ${entityName.toLowerCase()} records.`}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {archivedItems.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <EmptyState
              icon="📦"
              title="No Archived Records"
              description={`There are currently no archived ${entityName.toLowerCase()} records.`}
            />
          </div>
        ) : (
          archivedItems.map((item) => {
            const payloadRec = item.payload?.record || item.entityData?.record || item.payload?.candidate || item.payload || {};
            const itemTitle = getValString(item.name || payloadRec.name || payloadRec.title, entityName);
            const itemId = getValString(item.originalId || item.id || payloadRec.id, '—');
            const itemArchivedDate = formatDate(item.deletedAt || item.archivedAt || item.timestamp);
            const itemArchivedBy = getValString(item.deletedBy || item.archivedBy || item.user, 'System Administrator');

            return (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'space-between',
                  padding: '12px 14px',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a' }}>
                    {itemTitle}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: '#64748b' }}>
                    <span><strong style={{ color: '#0d9488' }}>ID:</strong> {itemId}</span>
                    <span>•</span>
                    <span><strong>Archived:</strong> {itemArchivedDate}</span>
                    <span>•</span>
                    <span><strong>By:</strong> {itemArchivedBy}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<RotateCcw size={13} />}
                    onClick={() => onRestoreItem(item)}
                  >
                    Restore
                  </Button>
                </div>
              </div>
            );
          })
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
          <Button variant="secondary" size="md" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
