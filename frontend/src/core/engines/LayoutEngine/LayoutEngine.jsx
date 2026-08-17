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
import { PermissionEngine, getUserRole } from '../PermissionEngine';

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
  activeCurrency = 'INR',
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
  onOpenPositionModal = () => {},
  onOpenChatWithLead = null
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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

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

  const effectiveUser = authUser || (typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('omnilflow_user') || 'null')) : null);

  const userRole = getUserRole(effectiveUser);
  const isEmployeeRole = userRole === 'employee' || userRole === 'agent' || userRole === 'staff';

  const currentModuleId = moduleConfig.moduleId || 'default_module';
  const isTasksModule = currentModuleId === 'tasks';
  const isExpensesModule = currentModuleId === 'expenses' || currentModuleId === 'expense_claims';
  const isAdvancesLoansModule = currentModuleId === 'advances_loans';
  const isUserScopedModule = isTasksModule || isExpensesModule || isAdvancesLoansModule;

  const canView = PermissionEngine.can(effectiveUser, currentModuleId, 'view');
  const canCreate = (isUserScopedModule || !isEmployeeRole) && PermissionEngine.can(effectiveUser, currentModuleId, 'create');
  const canEdit = (isUserScopedModule || !isEmployeeRole) && PermissionEngine.can(effectiveUser, currentModuleId, 'edit');
  const canDelete = !isEmployeeRole && PermissionEngine.can(effectiveUser, currentModuleId, 'delete');
  const canExport = PermissionEngine.can(effectiveUser, currentModuleId, 'export');
  const canImport = !isEmployeeRole && PermissionEngine.can(effectiveUser, currentModuleId, 'import');
  const canConfigure = !isEmployeeRole && PermissionEngine.can(effectiveUser, currentModuleId, 'configure');

  const canManage = (isUserScopedModule ? canEdit : (!isEmployeeRole && (canEdit || canDelete || canConfigure)));

  if (!canView) {
    return (
      <div className="glass-panel" style={{ padding: '48px', margin: '24px', textAlign: 'center', background: '#ffffff', borderRadius: '16px', border: '1px solid #fee2e2' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
        <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#991b1b', margin: 0 }}>Access Restricted</h2>
        <p style={{ fontSize: '13px', color: '#7f1d1d', marginTop: '6px', maxWidth: '480px', margin: '6px auto 0' }}>
          Your user role does not have permission to access the <strong>{LabelEngine.getEntityNamePlural(moduleConfig) || 'requested'}</strong> module. Please contact your system administrator to grant view access.
        </p>
      </div>
    );
  }

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
    const payloadRec = item.payload?.record || item.entityData?.record || item.payload?.employee || item.payload?.candidate || item.payload?.asset || item.payload || {};
    const trueId = item.originalId || payloadRec.id || payloadRec.originalId || item.id;
    return {
      ...payloadRec,
      id: trueId,
      originalId: trueId,
      recycleBinId: item.id || trueId,
      name: payloadRec.name || payloadRec.title || (payloadRec.first_name ? `${payloadRec.first_name || ''} ${payloadRec.last_name || ''}`.trim() : null) || item.name || item.title,
      title: payloadRec.title || payloadRec.name || item.title || item.name,
      createdAt: item.deletedAt || item.archivedAt || item.timestamp || payloadRec.createdAt,
      archivedBy: item.deletedBy || item.archivedBy || item.user || 'System Administrator',
      _vaultRawItem: item
    };
  };

  const isArchivedView = viewMode === 'archived';
  let initialModuleRecords = isArchivedView
    ? archivedModuleItems.map(unwrapArchivedRecord)
    : records;

  // Personal Data Scope Filtering for Employees on Tasks & Expenses Modules
  if (isUserScopedModule && isEmployeeRole && !isArchivedView) {
    const normalize = (str) => String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    const userEmail = normalize(effectiveUser?.email);
    const userName = normalize(effectiveUser?.name);
    const firstName = normalize(effectiveUser?.first_name || effectiveUser?.firstName);
    const lastName = normalize(effectiveUser?.last_name || effectiveUser?.lastName);
    const fullName = normalize(`${firstName} ${lastName}`);

    let empDirectory = [];
    if (typeof window !== 'undefined') {
      try {
        const fall = JSON.parse(localStorage.getItem('omnilflow_fallback_employees') || '[]');
        const reg = JSON.parse(localStorage.getItem('omniflow_registered_users') || '[]');
        const empLoc = JSON.parse(localStorage.getItem('employees') || '[]');
        empDirectory = [...fall, ...reg, ...empLoc];
      } catch (e) {}
    }

    const myExactIdentifiers = new Set();
    if (userEmail) myExactIdentifiers.add(userEmail);
    if (userName) myExactIdentifiers.add(userName);
    if (fullName) myExactIdentifiers.add(fullName);
    if (firstName && firstName.length >= 3) myExactIdentifiers.add(firstName);

    (empDirectory || []).forEach(emp => {
      if (!emp) return;
      const empEmail = normalize(emp.email);
      const empName = normalize(`${emp.first_name || emp.name || ''} ${emp.last_name || ''}`);
      const empFirstName = normalize(emp.first_name || emp.firstName || emp.name);

      if (
        (userEmail && empEmail && userEmail === empEmail) ||
        (fullName && empName && fullName === empName) ||
        (userName && empName && userName === empName)
      ) {
        if (empEmail) myExactIdentifiers.add(empEmail);
        if (empName) myExactIdentifiers.add(empName);
        if (empFirstName && empFirstName.length >= 3) myExactIdentifiers.add(empFirstName);
      }
    });

    const activeIdentifiers = Array.from(myExactIdentifiers).filter(v => Boolean(v && v.length >= 2));

    initialModuleRecords = (initialModuleRecords || []).filter(r => {
      if (!r) return false;
      const rawAssigned = String(r.assignedTo || r.assigned_to || r.employee || '');
      const normAssigned = normalize(rawAssigned);

      if (!normAssigned) return true;

      const isMyTask = activeIdentifiers.some(id => {
        if (!id) return false;
        if (normAssigned === id) return true;
        // Only allow substring if length difference is minimal (e.g. designation suffix like 'user 3 (engineering)')
        if (normAssigned.includes(id) && (normAssigned.length - id.length <= 6)) return true;
        if (id.includes(normAssigned) && (id.length - normAssigned.length <= 6)) return true;
        return false;
      });

      return isMyTask;
    });
  }

  const activeModuleRecords = initialModuleRecords;

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
    <div className="layout-engine-shell" style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', padding: '16px 20px', boxSizing: 'border-box' }}>
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
        canCreate={canCreate}
        canConfigure={canConfigure}
        systemDropdowns={systemDropdowns}
        activePipelineStages={activePipelineStages}
        allPositions={allPositions}
        showToast={showToast}
        hiddenColIds={hiddenColIds}
        setHiddenColIds={setHiddenColIds}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
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
        moduleConfig={{ ...moduleConfig, activeCurrency }}
        activeCurrency={activeCurrency}
        viewMode={viewMode}
        onOpenChatWithLead={onOpenChatWithLead}
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
          let movedRec = null;
          const updated = records.map(r => {
            if (String(r.id) === String(recId)) {
              movedRec = { ...r, status: newStage, stage: newStage, updatedAt: new Date().toISOString() };
              return movedRec;
            }
            return r;
          });
          setRecords(updated);
          if (movedRec && moduleConfig.moduleId) {
            FirebaseCloudEngine.saveRecord(moduleConfig.moduleId, movedRec, 'acme_corp');
          }
          showToast(`Moved record to ${newStage}`, 'info');
        }}
        onResetFilters={handleResetFilters}
        systemDropdowns={systemDropdowns}
        activePipelineStages={activePipelineStages}
        onOpenExportModal={() => setShowExportModal(true)}
        hiddenColIds={hiddenColIds}
        setHiddenColIds={setHiddenColIds}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
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
