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
import ExportModal from '../ExportEngine/ExportEngine';
import ImportModal from '../ImportEngine/ImportEngine';
import SavedViewsEngine from '../FilterEngine/SavedViewsEngine';
import { SearchEngine } from '../SearchEngine';
import { FilterEngine } from '../FilterEngine';
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
  const [sortKey, setSortKey] = useState(() => moduleConfig.defaultSort?.key || 'createdAt');
  const [sortDir, setSortDir] = useState(() => moduleConfig.defaultSort?.dir || 'desc');
  const [hiddenColIds, setHiddenColIds] = useState([]);

  // Modal / Drawer Action States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showArchivedModal, setShowArchivedModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [recordToArchive, setRecordToArchive] = useState(null);

  const canManage = authUser?.role === 'owner' || authUser?.role === 'admin' || authUser?.role === 'manager' || authUser?.role === 'superadmin';

  // Filtered Archived Records from global Recycle Bin
  const archivedModuleItems = (recycleBinItems || []).filter(item => {
    if (!item) return false;
    const itemTab = getValString(item.moduleTab || item.category || item.type).toLowerCase();
    const modId = getValString(moduleConfig.moduleId).toLowerCase();
    const entityName = getValString(LabelEngine.getEntityName(moduleConfig)).toLowerCase();
    const entityPlural = getValString(LabelEngine.getEntityNamePlural(moduleConfig)).toLowerCase();

    return (
      itemTab.includes(modId) ||
      itemTab.includes(entityName) ||
      itemTab.includes(entityPlural) ||
      (modId === 'employees' && (itemTab.includes('employee') || itemTab.includes('staff'))) ||
      (modId === 'assets' && (itemTab.includes('asset') || itemTab.includes('device'))) ||
      (modId === 'recruitment_ats' && (itemTab.includes('ats') || itemTab.includes('candidate')))
    );
  });

  const unwrapArchivedRecord = (item) => {
    const payloadRec = item.payload?.record || item.entityData?.record || item.payload?.candidate || item.payload || {};
    return {
      ...payloadRec,
      ...item,
      id: item.originalId || item.id || payloadRec.id,
      recycleBinId: item.id,
      name: item.name || payloadRec.name || payloadRec.title,
      title: item.title || payloadRec.title || item.name || payloadRec.name,
      createdAt: item.deletedAt || item.archivedAt || item.timestamp || payloadRec.createdAt,
      archivedBy: item.deletedBy || item.archivedBy || item.user || 'System Administrator'
    };
  };

  const isArchivedView = viewMode === 'archived';
  const activeModuleRecords = isArchivedView
    ? archivedModuleItems.map(unwrapArchivedRecord)
    : records;

  // 1. FILTERING ENGINE PIPELINE
  const searchMatchedRecords = SearchEngine.search(activeModuleRecords, searchQuery, moduleConfig);
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
        onOpenArchived={() => setViewMode(prev => prev === 'archived' ? (moduleConfig?.views?.defaultView || 'list') : 'archived')}
        onOpenAddModal={() => { setSelectedRecord(null); setShowAddModal(true); }}
        onOpenConfigModal={() => onOpenModuleConfig && onOpenModuleConfig(moduleConfig.moduleId)}
        onOpenPositionModal={onOpenPositionModal}
        onManageStages={onManageStages}
        onOpenExportModal={() => setShowExportModal(true)}
        onOpenImportModal={() => setShowImportModal(true)}
        canManage={canManage}
        systemDropdowns={systemDropdowns}
        activePipelineStages={activePipelineStages}
        allPositions={allPositions}
        showToast={showToast}
        hiddenColIds={hiddenColIds}
        setHiddenColIds={setHiddenColIds}
      />

      {/* B. KPI SUMMARY STRIP WIDGETS (REMOVED FROM DIRECTORY — KEPT ON DASHBOARD) */}

      {/* C. ACTIVE FILTER CHIPS BAR */}
      <ActiveFilterChips
        moduleConfig={moduleConfig}
        filterValues={filterValues}
        searchQuery={searchQuery}
        totalCount={activeModuleRecords.length}
        filteredCount={sortedRecords.length}
        onRemoveFilter={handleRemoveFilter}
        onClearSearch={() => setSearchQuery('')}
        onResetAll={handleResetFilters}
      />

      {/* D. CONTENT VIEW CONTAINER (KANBAN, LIST, OR ARCHIVED) */}
      <ViewEngine
        records={sortedRecords}
        setRecords={setRecords}
        moduleConfig={moduleConfig}
        viewMode={viewMode}
        totalCount={activeModuleRecords.length}
        isFilterActive={isFilterActive}
        searchQuery={searchQuery}
        sortKey={sortKey}
        sortDir={sortDir}
        onSortChange={(key, dir) => { setSortKey(key); setSortDir(dir); }}
        canManage={canManage}
        softDeleteRecord={isArchivedView ? handlePermanentDeleteBinItem : softDeleteRecord}
        handleRestoreBinItem={handleRestoreBinItem}
        showToast={showToast}
        isArchivedView={isArchivedView}
        onViewRecord={(rec) => { setSelectedRecord(rec); setShowDetailModal(true); }}
        onEditRecord={(rec) => { setSelectedRecord(rec); setShowEditModal(true); }}
        onArchiveRecord={(rec) => { setRecordToArchive(rec); setSelectedRecord(rec); setShowArchiveModal(true); }}
        onMoveStage={(recId, newStage) => {
          const updated = records.map(r => r.id === recId ? { ...r, status: newStage, stage: newStage } : r);
          setRecords(updated);
          showToast(`Moved record to ${newStage}`, 'info');
        }}
        onResetFilters={handleResetFilters}
        systemDropdowns={systemDropdowns}
        activePipelineStages={activePipelineStages}
        onOpenExportModal={() => setShowExportModal(true)}
        hiddenColIds={hiddenColIds}
        setHiddenColIds={setHiddenColIds}
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
        showArchivedModal={showArchivedModal}
        setShowArchivedModal={setShowArchivedModal}
        recordToArchive={recordToArchive}
        setRecordToArchive={setRecordToArchive}
        selectedRecord={selectedRecord}
        setSelectedRecord={setSelectedRecord}
        canManage={canManage}
        systemDropdowns={systemDropdowns}
        activePipelineStages={activePipelineStages}
        allPositions={allPositions}
        archivedModuleItems={archivedModuleItems}
        handleRestoreBinItem={handleRestoreBinItem}
        handlePermanentDeleteBinItem={handlePermanentDeleteBinItem}
        softDeleteRecord={softDeleteRecord}
        showToast={showToast}
      />

      {/* F. UNIVERSAL CUSTOM EXPORT WIZARD MODAL */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        records={sortedRecords}
        moduleConfig={moduleConfig}
        showToast={showToast}
      />

      {/* G. UNIVERSAL CUSTOM IMPORT WIZARD MODAL */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        records={records}
        setRecords={setRecords}
        moduleConfig={moduleConfig}
        showToast={showToast}
      />
    </div>
  );
}
