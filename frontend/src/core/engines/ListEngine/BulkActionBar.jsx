/**
 * UNIVERSAL BULK ACTION BAR COMPONENT
 * Renders bulk actions bar when records are selected
 */

import React from 'react';
import { Archive, Trash2, CheckSquare, X } from 'lucide-react';
import Button from '../../ui/Button';

export default function BulkActionBar({
  selectedCount = 0,
  onClearSelection = () => {},
  onBulkArchive = () => {},
  onBulkDelete = () => {},
  canManage = true
}) {
  if (selectedCount === 0) return null;

  return (
    <div
      className="bulk-action-bar-container"
      style={{
        display: 'flex',
        alignItems: 'center',
        justify: 'space-between',
        background: '#0f172a',
        color: '#ffffff',
        padding: '10px 18px',
        borderRadius: '10px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        fontSize: '13px',
        fontWeight: '700',
        marginBottom: '12px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <CheckSquare size={16} style={{ color: '#0d9488' }} />
        <span>{selectedCount} item{selectedCount > 1 ? 's' : ''} selected</span>
        <button
          type="button"
          onClick={onClearSelection}
          style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '12px', textDecoration: 'underline', marginLeft: '6px' }}
        >
          Deselect All
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {canManage && (
          <Button
            variant="secondary"
            size="sm"
            icon={<Archive size={13} />}
            onClick={onBulkArchive}
            style={{ background: '#334155', color: '#ffffff', border: 'none' }}
          >
            Bulk Archive
          </Button>
        )}
      </div>
    </div>
  );
}
