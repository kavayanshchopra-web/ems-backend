/**
 * UNIVERSAL KANBAN COLUMN COMPONENT
 * Renders a single pipeline stage column with sticky header and vertical scrollbar
 */

import React from 'react';
import KanbanCard from './KanbanCard';
import EmptyState from '../../../components/ui/EmptyState';

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
  return (
    <div
      className="kanban-stage-column"
      style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden'
      }}
    >
      <style>{`
        .kanban-column-cards-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .kanban-column-cards-scroll::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }
        .kanban-column-cards-scroll::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .kanban-column-cards-scroll::-webkit-scrollbar-thumb:hover {
          background: #0d9488;
        }
      `}</style>

      {/* STICKY COLUMN HEADER */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          padding: '12px 16px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px' }}>{stage.emoji || '📋'}</span>
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
            background: 'rgba(13, 148, 136, 0.1)',
            color: stage.color || '#0d9488'
          }}
        >
          {records.length}
        </span>
      </div>

      {/* CARDS LIST CONTAINER WITH VERTICAL SCROLLBAR */}
      <div
        className="kanban-column-cards-scroll"
        style={{
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          flex: 1,
          maxHeight: 'calc(100vh - 310px)',
          minHeight: '260px',
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {records.length === 0 ? (
          <div style={{ padding: '24px 12px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
            <EmptyState
              icon="📥"
              title=""
              description={isFilterActive ? 'No records match filter.' : 'No candidates in this stage.'}
            />
          </div>
        ) : (
          records.map((record, idx) => (
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
          ))
        )}
      </div>
    </div>
  );
}
