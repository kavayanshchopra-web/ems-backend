/**
 * UNIVERSAL LAYOUT TOOLBAR COMPONENT
 * 100% Schema-Driven Header Toolbar for any EMS Module
 */

import React, { useState } from 'react';
import { Plus, Archive, Settings, Sliders, Filter, Download, Upload, X, Columns, ChevronDown } from 'lucide-react';
import Button from '../../../components/ui/Button';
import SearchInput from '../../../components/ui/SearchInput';
import ViewSwitcher from '../ViewEngine/ViewSwitcher';
import FilterPanel from '../FilterEngine/FilterPanel';
import SavedViewsEngine from '../FilterEngine/SavedViewsEngine';
import ColumnManagerPopover from '../ListEngine/ColumnManagerPopover';
import Pagination from '../ListEngine/Pagination';
import { LabelEngine } from '../LabelEngine';
import { PlaceholderEngine } from '../PlaceholderEngine';
import { FilterEngine } from '../FilterEngine';

export default function LayoutToolbar({
  moduleConfig = {},
  records = [],
  totalCount = 0,
  viewMode = 'kanban',
  onViewChange = () => {},
  searchQuery = '',
  onSearchChange = () => {},
  filterValues = {},
  onFilterChange = () => {},
  onResetFilters = () => {},
  sortKey = 'createdAt',
  sortDir = 'desc',
  onSortChange = () => {},
  archivedCount = 0,
  onOpenArchived = () => {},
  onOpenAddModal = () => {},
  onOpenConfigModal = () => {},
  onOpenPositionModal = () => {},
  onManageStages = () => {},
  onOpenExportModal = () => {},
  onOpenImportModal = () => {},
  canManage = true,
  systemDropdowns = null,
  activePipelineStages = [],
  allPositions = [],
  onOpenSavePresetModal = () => {},
  showToast = () => {},
  hiddenColIds = [],
  setHiddenColIds = () => {},
  currentPage = 1,
  pageSize = 25,
  onPageChange = () => {},
  onPageSizeChange = () => {}
}) {
  const [showManageDropdown, setShowManageDropdown] = useState(false);
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const [showSavePresetModal, setShowSavePresetModal] = useState(false);
  const [showColumnPopover, setShowColumnPopover] = useState(false);

  const allCols = moduleConfig.columns || [];
  const visibleCols = allCols.filter(c => c.visible !== false && !(hiddenColIds || []).includes(c.id));

  let availableViews = [];
  if (Array.isArray(moduleConfig.views?.availableViews) && moduleConfig.views.availableViews.length > 0) {
    availableViews = moduleConfig.views.availableViews;
  } else if (Array.isArray(moduleConfig.availableViews) && moduleConfig.availableViews.length > 0) {
    availableViews = moduleConfig.availableViews;
  } else if (moduleConfig.views && typeof moduleConfig.views === 'object') {
    availableViews = Object.keys(moduleConfig.views).filter(k => moduleConfig.views[k] === true);
  }
  if (availableViews.length === 0) availableViews = ['list'];

  const isFilterActive = FilterEngine.isFilterActive(filterValues) || Boolean(searchQuery.trim());

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
      {/* 1. TOP HEADER & MAIN ACTION STRIP */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          background: '#ffffff',
          padding: '8px 14px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
        }}
      >
        {/* Module Title & Subtitle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(13,148,136,0.15) 0%, rgba(15,118,110,0.25) 100%)',
              display: 'flex',
              alignItems: 'center',
              justify: 'center',
              fontSize: '18px',
              flexShrink: 0
            }}
          >
            {moduleConfig.icon || '🧑‍💼'}
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>
              {LabelEngine.getModuleTitle(moduleConfig)}
            </h1>
            <p style={{ margin: '1px 0 0 0', fontSize: '12px', color: '#64748b' }}>
              {LabelEngine.getModuleSubtitle(moduleConfig)}
            </p>
          </div>
        </div>

        {/* Header Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginLeft: 'auto' }}>

          {canManage && (
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowManageDropdown(prev => !prev)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  fontSize: '12px',
                  fontWeight: '700',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#334155',
                  cursor: 'pointer'
                }}
              >
                <Settings size={14} /> Manage ▾
              </button>

              {showManageDropdown && (
                <>
                  <div
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }}
                    onClick={() => setShowManageDropdown(false)}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: '105%',
                      zIndex: 100,
                      background: '#ffffff',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      boxShadow: '0 8px 20px rgba(0,0,0,0.14)',
                      minWidth: '210px',
                      overflow: 'hidden'
                    }}
                  >
                    <div style={{ padding: '8px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>Manage Tools</span>
                      <button type="button" onClick={() => setShowManageDropdown(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b', padding: '1px', display: 'flex' }}>
                        <X size={13} />
                      </button>
                    </div>

                    <div style={{ padding: '4px 0' }}>
                      <button
                        type="button"
                        onClick={() => { setShowManageDropdown(false); onOpenArchived(); }}
                        style={{ width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: '600', color: viewMode === 'archived' ? '#d97706' : '#0f172a', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9' }}
                      >
                        <Archive size={13} color="#f59e0b" /> {viewMode === 'archived' ? 'Active Roster' : `Archived (${archivedCount})`}
                      </button>

                      <button
                        type="button"
                        onClick={() => { setShowManageDropdown(false); onOpenImportModal(); }}
                        style={{ width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: '600', color: '#0f172a', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9' }}
                      >
                        <Upload size={13} color="#0d9488" /> Import Data Wizard
                      </button>

                      <button
                        type="button"
                        onClick={() => { setShowManageDropdown(false); onOpenExportModal(); }}
                        style={{ width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: '600', color: '#0f172a', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9' }}
                      >
                        <Download size={13} color="#0d9488" /> Export Data Wizard
                      </button>

                      <button
                        type="button"
                        onClick={() => { setShowManageDropdown(false); onOpenConfigModal(); }}
                        style={{ width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: '600', color: '#0d9488', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                      >
                        <Sliders size={13} /> Configure Module
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {canManage && (
            <Button
              variant="primary"
              size="md"
              icon={<Plus size={16} />}
              onClick={onOpenAddModal}
              style={{ background: 'linear-gradient(135deg, #0d9488 0%, #064e43 100%)', color: 'white', border: 'none', boxShadow: '0 2px 8px rgba(13, 148, 136, 0.25)' }}
            >
              Add {LabelEngine.getEntityName(moduleConfig)}
            </Button>
          )}
        </div>
      </div>

      {/* 2. SEARCH / FILTER TOOLBAR */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justify: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          background: '#ffffff',
          padding: '8px 12px',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
        }}
      >
        {/* A. LEFT CORNER: COLS BUTTON & PAGINATION CONTROLS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowColumnPopover(prev => !prev)}
              style={{
                height: '28px',
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: '700',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0d9488',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                whiteSpace: 'nowrap'
              }}
            >
              <Columns size={13} />
              <span>Cols</span>
            </button>

            {showColumnPopover && (
              <ColumnManagerPopover
                allColumns={allCols}
                hiddenColIds={hiddenColIds}
                onToggleColumn={(colId) => {
                  setHiddenColIds(prev =>
                    prev.includes(colId) ? prev.filter(id => id !== colId) : [...prev, colId]
                  );
                }}
                onShowAll={() => setHiddenColIds([])}
                onResetDefault={() => setHiddenColIds([])}
                onClose={() => setShowColumnPopover(false)}
              />
            )}
          </div>

          {/* COMPACT PAGINATION (NO TEXT) */}
          <Pagination
            compact={true}
            currentPage={currentPage}
            pageSize={pageSize}
            totalRecords={totalCount}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        </div>

        {/* B. CENTER: SEARCH INPUT WITH INTEGRATED MINI GREEN FILTER ARROW BOX + PRESET TABS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', flex: 1 }}>
          <div style={{ position: 'relative' }}>
            <SearchInput
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onClear={() => onSearchChange('')}
              placeholder={PlaceholderEngine.getSearchPlaceholder(moduleConfig)}
              width="320px"
              rightElement={
                <button
                  type="button"
                  title="Open Filters"
                  onClick={() => setShowFilterPopover(prev => !prev)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    background: isFilterActive ? '#065f46' : '#0d9488',
                    border: 'none',
                    color: '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 1px 3px rgba(13, 148, 136, 0.3)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <ChevronDown size={15} />
                </button>
              }
            />

            {/* FILTER PANEL POPOVER ANCHORED BELOW SEARCH INPUT */}
            {showFilterPopover && (
              <FilterPanel
                moduleConfig={moduleConfig}
                filterValues={filterValues}
                onFilterChange={onFilterChange}
                onResetFilters={onResetFilters}
                onClose={() => setShowFilterPopover(false)}
                onOpenSavePresetModal={() => setShowSavePresetModal(true)}
                systemDropdowns={systemDropdowns}
                activePipelineStages={activePipelineStages}
                allPositions={allPositions}
              />
            )}
          </div>
        </div>

        {/* C. RIGHT CORNER: LIST / KANBAN VIEW SWITCHER */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ViewSwitcher
            availableViews={availableViews}
            activeView={viewMode}
            onViewChange={onViewChange}
          />
        </div>
      </div>
    </div>
  );
}
