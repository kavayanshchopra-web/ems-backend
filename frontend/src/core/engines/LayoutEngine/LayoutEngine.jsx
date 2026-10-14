/**
 * UNIVERSAL LAYOUT ENGINE SHELL
 * Master Page Shell Composing All 15 Master Engines for Any EMS Module
 */

import React, { useState, useMemo } from 'react';
import LayoutToolbar from './LayoutToolbar';
import WidgetEngine from '../WidgetEngine/WidgetEngine';
import ViewEngine from '../ViewEngine/ViewEngine';
import ActiveFilterChips from '../FilterEngine/ActiveFilterChips';
import ActionEngine from '../ActionEngine/ActionEngine';
import ExportModal from '../ExportEngine/ExportEngine';
import ImportModal from '../ImportEngine/ImportEngine';
import SavedViewsEngine from '../FilterEngine/SavedViewsEngine';
import FirebaseCloudEngine from '../FirebaseCloudEngine';
import GhlSyncBridge from '../../services/ghlSyncBridge';
import { SearchEngine } from '../SearchEngine';
import { FilterEngine } from '../FilterEngine';
import { LabelEngine } from '../LabelEngine';
import { PermissionEngine, getUserRole } from '../PermissionEngine';
import ModuleConfigEditor from '../../../components/config/ModuleConfigEditor';
import { moduleConfigService } from '../../../services/moduleConfigService';

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

export const extractRecordTimestamp = (record) => {
  if (!record || typeof record !== 'object') return 0;

  // Direct numeric timestamp
  if (typeof record._createdAt === 'number' && record._createdAt > 0) {
    return record._createdAt < 1e11 ? record._createdAt * 1000 : record._createdAt;
  }

  // Priority search for date/timestamp fields
  const candidates = [
    record.createdAt,
    record.created_at,
    record.callTime,
    record.call_time,
    record.timestamp,
    record.createdDate,
    record.creationDate,
    record.appliedDate,
    record.date,
    record.dateTime,
    record.updatedAt,
    record.updated_at
  ];

  for (const cand of candidates) {
    if (!cand) continue;
    if (typeof cand === 'number' && cand > 0) {
      return cand < 1e11 ? cand * 1000 : cand;
    }
    if (typeof cand === 'string') {
      const parsed = Date.parse(cand);
      if (!isNaN(parsed) && parsed > 0) return parsed;
      const num = Number(cand);
      if (!isNaN(num) && num > 0) return num < 1e11 ? num * 1000 : num;
    }
    if (cand instanceof Date && !isNaN(cand.getTime())) {
      return cand.getTime();
    }
  }

  // Fallback: check if id contains a unix timestamp (e.g. con_1728900000_abc or 1728900000)
  const idStr = String(record.id || record._id || record.originalId || '');
  const digitsMatch = idStr.match(/\d{10,13}/);
  if (digitsMatch) {
    const num = Number(digitsMatch[0]);
    return num < 1e11 ? num * 1000 : num;
  }

  return 0;
};

export const extractRecordIdNumber = (record) => {
  if (!record) return 0;
  const id = record.id || record._id || record.originalId || record.code || '';
  if (typeof id === 'number') return id;
  const digits = String(id).replace(/\D/g, '');
  return digits ? parseInt(digits.slice(-9), 10) : 0;
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
  onArchiveRecord = null,
  showToast = () => {},
  onOpenModuleConfig = null,
  onManageStages = () => {},
  onOpenPositionModal = () => {},
  onOpenChatWithLead = null,
  customHeaderActions = null,
  customHeaderLeft = null
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
  const [showConfigModal, setShowConfigModal] = useState(false);
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

  // Filtered Archived Records from global Recycle Bin
  const archivedModuleItems = (recycleBinItems || []).filter(item => {
    if (!item) return false;
    const itemTab = getValString(item.moduleTab || item.category || item.type).toLowerCase();
    const modId = getValString(moduleConfig.moduleId).toLowerCase();
    const entityName = getValString(LabelEngine.getEntityName(moduleConfig)).toLowerCase();
    const entityPlural = getValString(LabelEngine.getEntityNamePlural(moduleConfig)).toLowerCase();

    return (
      (modId && itemTab.includes(modId)) ||
      (entityName && itemTab.includes(entityName)) ||
      (entityPlural && itemTab.includes(entityPlural)) ||
      (modId === 'employees' && (itemTab.includes('employee') || itemTab.includes('staff'))) ||
      (modId === 'assets' && (itemTab.includes('asset') || itemTab.includes('device'))) ||
      (modId === 'recruitment_ats' && (itemTab.includes('ats') || itemTab.includes('candidate'))) ||
      ((modId === 'contacts' || modId === 'crm' || !modId) && (itemTab.includes('contact') || itemTab.includes('lead') || itemTab.includes('crm')))
    );
  });

  const unwrapArchivedRecord = (item) => {
    if (!item) return null;
    const payloadRec = item.payload?.record || item.entityData?.record || item.payload?.employee || item.payload?.candidate || item.payload?.asset || item.payload?.entityData || item.payload || {};
    const trueId = item.originalId || payloadRec.id || payloadRec.originalId || item.id || `arch_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    return {
      ...payloadRec,
      id: trueId,
      originalId: trueId,
      recycleBinId: item.id || trueId,
      name: payloadRec.name || payloadRec.title || (payloadRec.first_name ? `${payloadRec.first_name || ''} ${payloadRec.last_name || ''}`.trim() : null) || item.name || item.title || 'Archived Item',
      title: payloadRec.title || payloadRec.name || item.title || item.name || 'Archived Item',
      phone: payloadRec.phone || payloadRec.phone_computed || payloadRec.customerPhone || '—',
      email: payloadRec.email || payloadRec.customerEmail || '',
      status: payloadRec.status || payloadRec.pipeline_stage || 'Archived',
      source: payloadRec.source || 'CRM',
      createdAt: item.deletedAt || item.archivedAt || item.timestamp || payloadRec.createdAt,
      archivedBy: item.deletedBy || item.archivedBy || item.user || 'System Administrator',
      _vaultRawItem: item
    };
  };

  const isArchivedView = viewMode === 'archived';
  let initialModuleRecords = isArchivedView
    ? (archivedModuleItems || []).map(unwrapArchivedRecord).filter(r => !!r)
    : (records || []).filter(r => !!r);

  // Personal Data Scope Filtering for Employees on Tasks & Expenses Modules
  if (isUserScopedModule && isEmployeeRole && !isArchivedView) {
    const normalize = (str) => String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    const userEmail = normalize(effectiveUser?.email);
    const userName = normalize(effectiveUser?.name);
    const firstName = normalize(effectiveUser?.first_name || effectiveUser?.firstName);
    const lastName = normalize(effectiveUser?.last_name || effectiveUser?.lastName);
    const fullName = normalize(`${firstName} ${lastName}`);

    let empDirectory = [];

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

  const activeModuleRecords = useMemo(() => {
    return (initialModuleRecords || []).filter(r => !!r);
  }, [initialModuleRecords]);

  // 1. FILTERING ENGINE PIPELINE (Memoized)
  const filteredRecords = useMemo(() => {
    const searchMatched = SearchEngine.search(activeModuleRecords, searchQuery, moduleConfig);
    return FilterEngine.filterRecords(searchMatched, filterValues, moduleConfig);
  }, [activeModuleRecords, searchQuery, filterValues, moduleConfig]);

  // 2. SORTING ENGINE PIPELINE (Memoized) - Guaranteed Newest on Top by Default
  const sortedRecords = useMemo(() => {
    return [...(filteredRecords || []).filter(r => !!r)].sort((a, b) => {
      if (!a || !b) return 0;

      const isDateSort = [
        'createdAt', 'created_at', '_createdAt', 'creationDate', 'createdDate',
        'callTime', 'call_time', 'timestamp', 'date', 'appliedDate'
      ].includes(sortKey);

      if (isDateSort) {
        const timeA = extractRecordTimestamp(a);
        const timeB = extractRecordTimestamp(b);
        if (timeA !== timeB) {
          return sortDir === 'asc' ? timeA - timeB : timeB - timeA;
        }
        // Secondary ID tie-breaker so newly created records always float to Row #1
        const idA = extractRecordIdNumber(a);
        const idB = extractRecordIdNumber(b);
        return sortDir === 'asc' ? idA - idB : idB - idA;
      }

      let valA = a[sortKey];
      let valB = b[sortKey];

      valA = getValString(valA).toLowerCase();
      valB = getValString(valB).toLowerCase();

      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;

      // Deterministic tie-breaker for equal non-date sort: newest first
      const timeA = extractRecordTimestamp(a);
      const timeB = extractRecordTimestamp(b);
      if (timeA !== timeB) return timeB - timeA;

      const idA = extractRecordIdNumber(a);
      const idB = extractRecordIdNumber(b);
      return idB - idA;
    });
  }, [filteredRecords, sortKey, sortDir]);

  const isFilterActive = FilterEngine.isFilterActive(filterValues) || Boolean(searchQuery.trim());

  const handleFilterChange = (fieldId, val) => {
    if (typeof fieldId === 'object' && fieldId !== null) {
      setFilterValues(prev => ({ ...prev, ...fieldId }));
    } else {
      setFilterValues(prev => ({ ...prev, [fieldId]: val }));
    }
  };

  const handleRemoveFilter = (fieldId, conditionIndex) => {
    if (fieldId === '_conditions' && conditionIndex !== undefined) {
      setFilterValues(prev => {
        const nextConditions = Array.isArray(prev._conditions)
          ? prev._conditions.filter((_, idx) => idx !== conditionIndex)
          : [];
        return { ...prev, _conditions: nextConditions };
      });
      return;
    }
    setFilterValues(prev => ({ ...prev, [fieldId]: 'all' }));
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterValues({});
  };

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
        onOpenConfigModal={() => {
          setShowConfigModal(true);
          if (typeof onOpenModuleConfig === 'function') {
            onOpenModuleConfig(moduleConfig.moduleId || moduleConfig.id || 'telecalling');
          }
        }}
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
        customHeaderActions={customHeaderActions}
        customHeaderLeft={customHeaderLeft}
      />

      {/* B. KPI SUMMARY STRIP WIDGETS */}
      <WidgetEngine
        moduleConfig={moduleConfig}
        records={activeModuleRecords}
        activePipelineStages={activePipelineStages}
      />

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
        authUser={authUser}
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
            const isMatch = String(r.id) === String(recId) || 
                            String(r.displayId) === String(recId) || 
                            (r.originalId && String(r.originalId) === String(recId));
            if (isMatch) {
              movedRec = { 
                ...r, 
                status: newStage, 
                stage: newStage, 
                disposition: newStage, 
                updatedAt: new Date().toISOString() 
              };
              return movedRec;
            }
            return r;
          });
          setRecords(updated);
          const activeTenantId = authUser?.companyId || authUser?.tenantId || 'default_tenant';
          if (movedRec && moduleConfig.moduleId) {
            FirebaseCloudEngine.saveRecord(moduleConfig.moduleId, movedRec, activeTenantId);
            if (moduleConfig.moduleId === 'crm_deals' || moduleConfig.moduleId === 'contacts') {
              GhlSyncBridge.pushSingleContactAuto(activeTenantId, movedRec).catch(() => {});
            }
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
        customHeaderActions={customHeaderActions}
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
        onArchiveRecord={onArchiveRecord}
        showToast={showToast}
        authUser={authUser}
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

      {/* H. UNIVERSAL IN-PAGE MODULE CONFIGURATION MODAL */}
      {showConfigModal && (
        <div
          className="layout-engine-config-modal-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            boxSizing: 'border-box'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowConfigModal(false);
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '1240px',
              maxHeight: '92vh',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid #e2e8f0',
              position: 'relative'
            }}
          >
            <ModuleConfigEditor
              companyId={effectiveUser?.companyId || effectiveUser?.tenantId || effectiveUser?.tenant_id || 'default_tenant'}
              moduleDef={moduleConfigService.getModuleDefinition(moduleConfig.moduleId || moduleConfig.id || 'telecalling') || {
                id: moduleConfig.moduleId || moduleConfig.id || 'telecalling',
                label: LabelEngine.getTitle(moduleConfig) || 'Phone System',
                icon: moduleConfig.icon || '📞',
                configurable: true,
                capabilities: { forms: true, summary: true, searchFilters: true, listView: true, views: true }
              }}
              initialConfig={moduleConfigService.getModuleConfig(effectiveUser?.companyId || effectiveUser?.tenantId || effectiveUser?.tenant_id || 'default_tenant', moduleConfig.moduleId || moduleConfig.id || 'telecalling') || moduleConfig}
              onSaveConfig={(newCfg) => {
                const targetModId = moduleConfig.moduleId || moduleConfig.id || 'telecalling';
                const compId = effectiveUser?.companyId || effectiveUser?.tenantId || effectiveUser?.tenant_id || 'default_tenant';
                moduleConfigService.saveModuleConfig(compId, targetModId, newCfg);
                showToast(`Saved configuration for ${LabelEngine.getTitle(moduleConfig) || targetModId}!`, 'success');
                window.dispatchEvent(new CustomEvent('omnilflow_config_updated', { detail: { moduleId: targetModId } }));
                setShowConfigModal(false);
              }}
              activePipelineStages={activePipelineStages}
              systemDropdowns={systemDropdowns}
              onClose={() => setShowConfigModal(false)}
              showToast={showToast}
            />
          </div>
        </div>
      )}
    </div>
  );
}
