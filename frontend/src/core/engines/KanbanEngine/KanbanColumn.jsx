/**
 * UNIVERSAL KANBAN COLUMN COMPONENT
 * Renders a 320px pipeline stage column with sticky header, independent vertical scroll,
 * per-column 25-card pagination with "Load More" & centered empty state
 */

import React, { useState } from 'react';
import KanbanCard from './KanbanCard';
import EmptyState from '../../../components/ui/EmptyState';
import { ChevronDown } from 'lucide-react';

export default function KanbanColumn({
  stage = {},
  records = [],
  moduleConfig = {},
  activePipelineStages = [],
  isFilterActive = false,
  onViewRecord = () => {},
  onEditRecord = () => {},
  onArchiveRecord = () => {},
  onMoveStage = () => {},
  canManage = true
}) {
  const [visibleCount, setVisibleCount] = useState(25);
  const [isDragOver, setIsDragOver] = useState(false);

  const visibleRecords = records.slice(0, visibleCount);
  const remainingCount = records.length - visibleCount;

  const handleLoadMore = (e) => {
    e.stopPropagation();
    setVisibleCount(prev => prev + 25);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const recId = e.dataTransfer.getData('text/plain');
    if (recId) {
      onMoveStage(recId, stage.name);
    }
  };

  return (
    <div
      className="kanban-stage-column"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        background: isDragOver ? '#f0fdfa' : '#ffffff',
        borderRadius: '12px',
        border: isDragOver ? '2px dashed #0d9488' : '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 280px)',
        minHeight: '420px',
        overflow: 'hidden',
        transition: 'all 0.15s ease'
      }}
    >
      <style>{`
        .kanban-column-cards-scroll::-webkit-scrollbar {
          width: 6px !important;
          display: block !important;
        }
        .kanban-column-cards-scroll::-webkit-scrollbar-track {
          background: #f1f5f9 !important;
          border-radius: 4px !important;
        }
        .kanban-column-cards-scroll::-webkit-scrollbar-thumb {
          background: #cbd5e1 !important;
          border-radius: 4px !important;
        }
        .kanban-column-cards-scroll::-webkit-scrollbar-thumb:hover {
          background: #0d9488 !important;
        }
      `}</style>

      {/* STICKY COLUMN HEADER */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          padding: '12px 14px',
          background: isDragOver ? '#ccfbf1' : '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '15px' }}>{stage.emoji || '📋'}</span>
          <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
            {stage.name}
          </span>
        </div>
        <span
          style={{
            fontSize: '11px',
            fontWeight: '800',
            padding: '2px 8px',
            borderRadius: '12px',
            background: 'rgba(13, 148, 136, 0.12)',
            color: stage.color || '#0d9488'
          }}
        >
          {records.length}
        </span>
      </div>

      {/* CARDS LIST CONTAINER WITH INDEPENDENT VERTICAL SCROLLBAR & WHEEL PROPAGATION GUARD */}
      <div
        className="kanban-column-cards-scroll"
        onWheel={(e) => e.stopPropagation()}
        style={{
          padding: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'thin',
          scrollbarColor: '#cbd5e1 #f1f5f9'
        }}
      >
        {records.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
            <EmptyState
              icon="📥"
              title="No candidates"
              description={isFilterActive ? 'No records match active filters.' : `Drag candidates here to move to ${stage.name}.`}
            />
          </div>
        ) : (
          <>
            {visibleRecords.map((record, idx) => (
              <KanbanCard
                key={record.id || idx}
                record={record}
                moduleConfig={moduleConfig}
                activePipelineStages={activePipelineStages}
                onViewRecord={onViewRecord}
                onEditRecord={onEditRecord}
                onArchiveRecord={onArchiveRecord}
                onMoveStage={onMoveStage}
                canManage={canManage}
              />
            ))}

            {/* PER-COLUMN ENTERPRISE "LOAD MORE" BUTTON */}
            {remainingCount > 0 && (
              <button
                type="button"
                onClick={handleLoadMore}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  marginTop: '4px',
                  borderRadius: '8px',
                  border: '1px solid #0d9488',
                  background: '#f0fdfa',
                  color: '#0d9488',
                  fontSize: '11px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 1px 2px rgba(13, 148, 136, 0.08)'
                }}
              >
                <span>Load More (+{remainingCount} remaining)</span>
                <ChevronDown size={14} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
