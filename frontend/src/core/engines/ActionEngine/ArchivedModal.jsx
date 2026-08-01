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

export default function ArchivedModal({
  isOpen = false,
  onClose = () => {},
  moduleConfig = {},
  archivedItems = [],
  onRestoreItem = () => {},
  onPermanentDeleteItem = () => {}
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
            const itemSubtitle = getValString(payloadRec.position || payloadRec.department || item.type || '');

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
                <div>
                  <div style={{ fontWeight: '700', fontSize: '13px', color: '#0f172a' }}>
                    {itemTitle}
                  </div>
                  {itemSubtitle && (
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      {itemSubtitle}
                    </div>
                  )}
                  {item.deletedAt && (
                    <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                      Archived on: {item.deletedAt}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<RotateCcw size={12} />}
                    onClick={() => onRestoreItem(item)}
                  >
                    Restore
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Trash2 size={12} />}
                    onClick={() => onPermanentDeleteItem(item.id)}
                    style={{ color: '#dc2626', borderColor: '#fca5a5', background: '#fff5f5' }}
                  >
                    Purge
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
