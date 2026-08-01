/**
 * UNIVERSAL VIEW ENGINE CONTAINER
 * Dynamic Container Switching between KanbanEngine, ListEngine, and Custom Views
 */

import React, { useState } from 'react';
import KanbanEngine from '../KanbanEngine/KanbanEngine';
import ListEngine from '../ListEngine/ListEngine';

export default function ViewEngine({
  records = [],
  moduleConfig = {},
  viewMode = 'kanban',
  totalCount = 0,
  isFilterActive = false,
  searchQuery = '',
  canManage = true,
  onViewRecord = () => {},
  onEditRecord = () => {},
  onArchiveRecord = () => {},
  onMoveStage = () => {},
  onResetFilters = () => {},
  systemDropdowns = null,
  activePipelineStages = []
}) {
  if (viewMode === 'list') {
    return (
      <ListEngine
        records={records}
        moduleConfig={moduleConfig}
        totalCount={totalCount}
        isFilterActive={isFilterActive}
        searchQuery={searchQuery}
        canManage={canManage}
        onViewRecord={onViewRecord}
        onEditRecord={onEditRecord}
        onArchiveRecord={onArchiveRecord}
        onMoveStage={onMoveStage}
        onResetFilters={onResetFilters}
        systemDropdowns={systemDropdowns}
        activePipelineStages={activePipelineStages}
      />
    );
  }

  // Default to Kanban View Engine
  return (
    <KanbanEngine
      records={records}
      moduleConfig={moduleConfig}
      activePipelineStages={activePipelineStages}
      isFilterActive={isFilterActive}
      onViewRecord={onViewRecord}
      onEditRecord={onEditRecord}
      onArchiveRecord={onArchiveRecord}
      onMoveStage={onMoveStage}
      canManage={canManage}
    />
  );
}
