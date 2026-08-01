/**
 * UNIVERSAL LAYOUT ENGINE SHELL
 * Master Page Shell Composing All 15 Master Engines for Any EMS Module
 */

import React, { useState } from 'react';
import LayoutToolbar from './LayoutToolbar';
import WidgetEngine from '../WidgetEngine/WidgetEngine';
import ViewEngine from '../ViewEngine/ViewEngine';
import ActiveFilterChips from '../FilterEngine/ActiveFilterChips';
import ActionEngine from '../ActionEngine/ActionEngine';
import { SearchEngine } from '../SearchEngine';
import { FilterEngine } from '../FilterEngine';

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

export default function LayoutEngine({
  moduleConfig = {},
  records = [],
  setRecords = () => {},
  authUser = null,
  systemDropdowns = null,
  activePipelineStages = [],
  allPositions = [],
  recycleBinItems = [],
  handleRestoreBinItem = () => {},
  handlePermanentDeleteBinItem = () => {},
  softDeleteRecord = () => {},
  showToast = () => {},
  onOpenModuleConfig = null,
  onManageStages = () => {},
  onOpenPositionModal = () => {}
}) {
  // View Mode state
  const availableViews = moduleConfig.views?.availableViews || ['kanban', 'list'];
  const defaultView = moduleConfig.views?.defaultView || 'kanban';
  const [viewMode, setViewMode] = useState(availableViews.includes(defaultView) ? defaultView : availableViews[0] || 'kanban');

  // Search, Filter & Sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterValues, setFilterValues] = useState({});
  const [sortKey, setSortKey] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');

  // Modal / Drawer Action States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showArchivedModal, setShowArchivedModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const canManage = authUser?.role === 'owner' || authUser?.role === 'admin' || authUser?.role === 'manager' || authUser?.role === 'superadmin';

  // 1. FILTERING ENGINE PIPELINE
  const searchMatchedRecords = SearchEngine.search(records, searchQuery, moduleConfig);
  const filteredRecords = FilterEngine.filterRecords(searchMatchedRecords, filterValues, moduleConfig);

  // 2. SORTING ENGINE PIPELINE
  const sortedRecords = [...filteredRecords].sort((a, b) => {
    let valA = a[sortKey];
    let valB = b[sortKey];

    if (sortKey === 'createdAt') {
      valA = new Date(a.createdAt || 0).getTime();
      valB = new Date(b.createdAt || 0).getTime();
      return sortDir === 'asc' ? valA - valB : valB - valA;
    }

    valA = getValString(valA).toLowerCase();
    valB = getValString(valB).toLowerCase();

    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const isFilterActive = FilterEngine.isFilterActive(filterValues) || Boolean(searchQuery.trim());

  const handleFilterChange = (fieldId, val) => {
    setFilterValues(prev => ({ ...prev, [fieldId]: val }));
  };

  const handleRemoveFilter = (fieldId) => {
    setFilterValues(prev => ({ ...prev, [fieldId]: 'all' }));
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterValues({});
  };

  // Filtered Archived Records from global Recycle Bin
  const archivedModuleItems = (recycleBinItems || []).filter(item => {
    const cat = getValString(item.category || item.type || item.moduleTab).toLowerCase();
    return cat.includes(moduleConfig.moduleId) || cat.includes(moduleConfig.entityName?.toLowerCase());
  });

  return (
    <div className="layout-engine-shell" style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      {/* A. TOOLBAR & HEADER */}
      <LayoutToolbar
        moduleConfig={moduleConfig}
        records={records}
        totalCount={records.length}
        viewMode={viewMode}
        onViewChange={setViewMode}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        sortKey={sortKey}
        sortDir={sortDir}
        onSortChange={(key, dir) => { setSortKey(key); setSortDir(dir); }}
        archivedCount={archivedModuleItems.length}
        onOpenArchived={() => setShowArchivedModal(true)}
        onOpenAddModal={() => setShowAddModal(true)}
        onOpenConfigModal={() => onOpenModuleConfig && onOpenModuleConfig(moduleConfig.moduleId)}
        onOpenPositionModal={onOpenPositionModal}
        onManageStages={onManageStages}
        canManage={canManage}
        systemDropdowns={systemDropdowns}
        activePipelineStages={activePipelineStages}
        allPositions={allPositions}
      />

      {/* B. KPI SUMMARY STRIP WIDGETS */}
      <WidgetEngine
        moduleConfig={moduleConfig}
        records={records}
        activePipelineStages={activePipelineStages}
      />

      {/* C. ACTIVE FILTER CHIPS BAR */}
      <ActiveFilterChips
        moduleConfig={moduleConfig}
        filterValues={filterValues}
        searchQuery={searchQuery}
        totalCount={records.length}
        filteredCount={sortedRecords.length}
        onRemoveFilter={handleRemoveFilter}
        onClearSearch={() => setSearchQuery('')}
        onResetAll={handleResetFilters}
      />

      {/* D. CONTENT VIEW CONTAINER (KANBAN OR LIST) */}
      <ViewEngine
        records={sortedRecords}
        moduleConfig={moduleConfig}
        viewMode={viewMode}
        totalCount={records.length}
        isFilterActive={isFilterActive}
        searchQuery={searchQuery}
        canManage={canManage}
        onViewRecord={(rec) => { setSelectedRecord(rec); setShowDetailModal(true); }}
        onEditRecord={(rec) => { setSelectedRecord(rec); setShowEditModal(true); }}
        onArchiveRecord={(rec) => { setSelectedRecord(rec); setShowArchiveModal(true); }}
        onMoveStage={(recId, newStage) => {
          const updated = records.map(r => r.id === recId ? { ...r, status: newStage, stage: newStage } : r);
          setRecords(updated);
          showToast(`Moved record to ${newStage}`, 'info');
        }}
        onResetFilters={handleResetFilters}
        systemDropdowns={systemDropdowns}
        activePipelineStages={activePipelineStages}
      />

      {/* E. ACTION ENGINE MODALS & DRAWERS */}
      <ActionEngine
        moduleConfig={moduleConfig}
        records={records}
        setRecords={setRecords}
        showAddModal={showAddModal}
        setShowAddModal={setShowAddModal}
        showEditModal={showEditModal}
        setShowEditModal={setShowEditModal}
        showDetailModal={showDetailModal}
        setShowDetailModal={setShowDetailModal}
        showArchiveModal={showArchiveModal}
        setShowArchiveModal={setShowArchiveModal}
        selectedRecord={selectedRecord}
        setSelectedRecord={setSelectedRecord}
        canManage={canManage}
        systemDropdowns={systemDropdowns}
        activePipelineStages={activePipelineStages}
        allPositions={allPositions}
        softDeleteRecord={softDeleteRecord}
        showToast={showToast}
      />
    </div>
  );
}
