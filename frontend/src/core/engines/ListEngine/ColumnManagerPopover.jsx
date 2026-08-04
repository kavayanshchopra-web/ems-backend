/**
 * UNIVERSAL COLUMN VISIBILITY MANAGER POPOVER
 * 100% Metadata-Driven Instant Column Toggle Popover
 */

import React, { useState } from 'react';
import { Columns, Check, X, RotateCcw } from 'lucide-react';

export default function ColumnManagerPopover({
  allColumns = [],
  hiddenColIds = [],
  onToggleColumn = () => {},
  onShowAll = () => {},
  onResetDefault = () => {},
  onClose = () => {}
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredColumns = allColumns.filter(col =>
    String(col.label || col.id || '').toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const visibleCount = allColumns.length - hiddenColIds.length;

  return (
    <div
      style={{
        position: 'absolute',
        top: '110%',
        left: 0,
        zIndex: 100,
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #cbd5e1',
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
        width: '260px',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* POPOVER HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Columns size={15} color="#0d9488" />
          <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
            Manage Columns ({visibleCount}/{allColumns.length})
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', padding: '2px' }}
        >
          <X size={14} />
        </button>
      </div>

      {/* QUICK SEARCH BAR */}
      <input
        type="text"
        placeholder="🔍 Filter columns..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{
          width: '100%',
          padding: '6px 10px',
          fontSize: '11.5px',
          borderRadius: '6px',
          border: '1px solid #cbd5e1',
          background: '#f8fafc',
          boxSizing: 'border-box',
          outline: 'none'
        }}
      />

      {/* COLUMN CHECKBOXES LIST */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '200px', overflowY: 'auto' }}>
        {filteredColumns.map(col => {
          const isVisible = !hiddenColIds.includes(col.id);
          return (
            <label
              key={col.id}
              onClick={() => onToggleColumn(col.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 8px',
                borderRadius: '6px',
                background: isVisible ? 'rgba(13, 148, 136, 0.05)' : '#ffffff',
                cursor: 'pointer',
                userSelect: 'none',
                transition: 'background 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                <input
                  type="checkbox"
                  checked={isVisible}
                  onChange={() => {}}
                  style={{ accentColor: '#0d9488', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '12px', fontWeight: isVisible ? '700' : '500', color: isVisible ? '#0f172a' : '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {col.label || col.id}
                </span>
              </div>
              {isVisible && <Check size={12} color="#0d9488" />}
            </label>
          );
        })}
      </div>

      {/* FOOTER ACTIONS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '8px', fontSize: '11px' }}>
        <button
          type="button"
          onClick={onShowAll}
          style={{ border: 'none', background: 'transparent', color: '#0d9488', fontWeight: '700', cursor: 'pointer', padding: 0 }}
        >
          Show All
        </button>
        <button
          type="button"
          onClick={onResetDefault}
          style={{ border: 'none', background: 'transparent', color: '#64748b', fontWeight: '700', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <RotateCcw size={11} /> Reset
        </button>
      </div>
    </div>
  );
}
