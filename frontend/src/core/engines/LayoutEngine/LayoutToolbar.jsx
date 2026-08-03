/**
 * UNIVERSAL LAYOUT TOOLBAR COMPONENT
 * 100% Schema-Driven Header Toolbar for any EMS Module
 */

import React, { useState } from 'react';
import { Plus, Archive, Settings, Briefcase, Sliders, Filter, ArrowUpDown } from 'lucide-react';
import Button from '../../../components/ui/Button';
import SearchInput from '../../../components/ui/SearchInput';
import ViewSwitcher from '../ViewEngine/ViewSwitcher';
import FilterPanel from '../FilterEngine/FilterPanel';
import SearchWorkspace from '../SearchWorkspace/SearchWorkspace';
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
  groupByFieldId = '',
  onGroupByChange = () => {},
  sortKey = 'createdAt',
  sortDir = 'desc',
  onSortChange = () => {},
  archivedCount = 0,
  onOpenArchived = () => {},
  onOpenAddModal = () => {},
  onOpenConfigModal = () => {},
  onOpenPositionModal = () => {},
  onManageStages = () => {},
  canManage = true,
  systemDropdowns = null,
  activePipelineStages = [],
  allPositions = []
}) {
  const [showManageDropdown, setShowManageDropdown] = useState(false);

  let availableViews = [];
  if (Array.isArray(moduleConfig.views?.availableViews) && moduleConfig.views.availableViews.length > 0) {
    availableViews = moduleConfig.views.availableViews;
  } else if (Array.isArray(moduleConfig.availableViews) && moduleConfig.availableViews.length > 0) {
    availableViews = moduleConfig.availableViews;
  } else if (moduleConfig.views && typeof moduleConfig.views === 'object') {
    availableViews = Object.keys(moduleConfig.views).filter(k => moduleConfig.views[k] === true);
  }
  if (availableViews.length === 0) availableViews = ['list'];

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
          justify: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          background: '#ffffff',
          padding: '14px 18px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
        }}
      >
        {/* Module Title & Badge */}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>
                {LabelEngine.getModuleTitle(moduleConfig)}
              </h1>
              <span style={{ fontSize: '11px', fontWeight: '800', padding: '2px 9px', borderRadius: '12px', background: 'rgba(13, 148, 136, 0.1)', color: '#0d9488', border: '1px solid rgba(13, 148, 136, 0.2)' }}>
                {LabelEngine.getEntityCountBadge(moduleConfig, records.length)}
              </span>
            </div>
            <p style={{ margin: '1px 0 0 0', fontSize: '12px', color: '#64748b' }}>
              {LabelEngine.getModuleSubtitle(moduleConfig)}
            </p>
          </div>
        </div>

        {/* Header Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <ViewSwitcher
            availableViews={availableViews}
            activeView={viewMode}
            onViewChange={onViewChange}
          />

          <Button
            variant={viewMode === 'archived' ? 'primary' : 'secondary'}
            size="md"
            icon={<Archive size={14} />}
            onClick={onOpenArchived}
            style={viewMode === 'archived' ? { background: '#f59e0b', color: '#ffffff', border: 'none' } : {}}
          >
            {viewMode === 'archived' ? 'Active Roster' : `Archived (${archivedCount})`}
          </Button>

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
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '105%',
                    zIndex: 100,
                    background: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                    minWidth: '180px',
                    padding: '4px 0'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => { setShowManageDropdown(false); onOpenConfigModal(); }}
                    style={{ width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: '600', color: '#0d9488', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Sliders size={13} /> Configure Module
                  </button>
                </div>
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

      {/* 2. UNIVERSAL METADATA-DRIVEN SEARCH WORKSPACE */}
      <SearchWorkspace
        moduleConfig={moduleConfig}
        records={records}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        filterValues={filterValues}
        onFilterChange={onFilterChange}
        onResetFilters={onResetFilters}
        groupByFieldId={groupByFieldId}
        onGroupByChange={onGroupByChange}
        sortKey={sortKey}
        sortDir={sortDir}
        onSortChange={onSortChange}
        viewMode={viewMode}
        onViewChange={onViewChange}
        systemDropdowns={systemDropdowns}
        activePipelineStages={activePipelineStages}
        allPositions={allPositions}
      />
    </div>
  );
}
