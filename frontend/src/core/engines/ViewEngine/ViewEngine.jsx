/**
 * UNIVERSAL VIEW ENGINE CONTAINER
 * Dynamic Container Switching between KanbanEngine, ListEngine, and Custom Views
 */

import React, { useState } from 'react';
import KanbanEngine from '../KanbanEngine/KanbanEngine';
import ListEngine from '../ListEngine/ListEngine';

export default function ViewEngine({
  records = [],
  setRecords = () => {},
  moduleConfig = {},
  viewMode = 'list',
  totalCount = 0,
  isFilterActive = false,
  searchQuery = '',
  sortKey = 'createdAt',
  sortDir = 'desc',
  onSortChange = () => {},
  canManage = true,
  softDeleteRecord = null,
  handleRestoreBinItem = null,
  showToast = () => {},
  isArchivedView = false,
  onViewRecord = () => {},
  onEditRecord = () => {},
  onArchiveRecord = () => {},
  onMoveStage = () => {},
  onResetFilters = () => {},
  systemDropdowns = null,
  activePipelineStages = []
}) {
  // Resolve enabled views from moduleConfig (supports availableViews array and views object map)
  let enabledViewsList = [];
  if (Array.isArray(moduleConfig?.views?.availableViews) && moduleConfig.views.availableViews.length > 0) {
    enabledViewsList = moduleConfig.views.availableViews;
  } else if (Array.isArray(moduleConfig?.availableViews) && moduleConfig.availableViews.length > 0) {
    enabledViewsList = moduleConfig.availableViews;
  } else if (moduleConfig?.views && typeof moduleConfig.views === 'object') {
    enabledViewsList = Object.keys(moduleConfig.views).filter(k => moduleConfig.views[k] === true);
  }
  if (enabledViewsList.length === 0) enabledViewsList = ['list'];

  // Default fallback if requested viewMode is disabled
  let activeView = viewMode;
  if (!enabledViewsList.includes(activeView)) {
    activeView = moduleConfig?.views?.defaultView || moduleConfig?.defaultView || enabledViewsList[0] || 'list';
  }

  // Render Corresponding View Engine
  if (activeView === 'kanban') {
    return (
      <KanbanEngine
        records={records}
        moduleConfig={moduleConfig}
        activePipelineStages={activePipelineStages}
        systemDropdowns={systemDropdowns}
        isFilterActive={isFilterActive}
        onViewRecord={onViewRecord}
        onEditRecord={onEditRecord}
        onArchiveRecord={onArchiveRecord}
        onMoveStage={onMoveStage}
        canManage={canManage}
      />
    );
  }

  if (activeView === 'calendar') {
    return (
      <div style={{ padding: '32px', textAlign: 'center', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>📅 Calendar View Engine</h3>
        <p style={{ fontSize: '13px', color: '#64748b' }}>Calendar View is enabled for {moduleConfig.name || 'this module'}. Total schedule items: {records.length}</p>
      </div>
    );
  }

  if (activeView === 'timeline') {
    return (
      <div style={{ padding: '32px', textAlign: 'center', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>⏳ Timeline View Engine</h3>
        <p style={{ fontSize: '13px', color: '#64748b' }}>Timeline View is enabled for {moduleConfig.name || 'this module'}. Total timeline events: {records.length}</p>
      </div>
    );
  }

  if (activeView === 'gantt') {
    return (
      <div style={{ padding: '32px', textAlign: 'center', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>📈 Gantt Chart Engine</h3>
        <p style={{ fontSize: '13px', color: '#64748b' }}>Gantt Chart View is enabled for {moduleConfig.name || 'this module'}. Total project items: {records.length}</p>
      </div>
    );
  }

  // Default to List View Engine
  return (
    <ListEngine
      records={records}
      setRecords={setRecords}
      moduleConfig={moduleConfig}
      totalCount={totalCount}
      isFilterActive={isFilterActive}
      searchQuery={searchQuery}
      sortKey={sortKey}
      sortDir={sortDir}
      onSortChange={onSortChange}
      canManage={canManage}
      softDeleteRecord={softDeleteRecord}
      handleRestoreBinItem={handleRestoreBinItem}
      showToast={showToast}
      isArchivedView={isArchivedView}
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
