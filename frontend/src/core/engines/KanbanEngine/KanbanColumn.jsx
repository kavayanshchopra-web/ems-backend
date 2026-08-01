/**
 * UNIVERSAL KANBAN COLUMN COMPONENT
 * Renders a single pipeline stage column with cards list
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
        overflow: 'hidden'
      }}
    >
      {/* COLUMN HEADER */}
      <div
        style={{
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

      {/* CARDS LIST CONTAINER */}
      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
        {records.length === 0 ? (
          <div style={{ padding: '20px 12px', textAlign: 'center' }}>
            <EmptyState
              icon="📋"
              title=""
              description={isFilterActive ? 'No records match filter.' : 'No records in this stage.'}
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
