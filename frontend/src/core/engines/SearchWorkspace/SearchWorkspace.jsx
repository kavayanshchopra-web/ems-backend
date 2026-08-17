/**
 * UNIVERSAL METADATA-DRIVEN SEARCH WORKSPACE COMPONENT
 * Enterprise Odoo/Salesforce-Style Search, Quick Filters, Group By, Filter Chips, & Saved Views
 */

import React, { useState, useEffect } from 'react';
import { Search, Filter, Layers, Bookmark, Sliders, X, Plus, Star, Check, Globe, User, RotateCcw } from 'lucide-react';
import Button from '../../../components/ui/Button';
import SearchInput from '../../../components/ui/SearchInput';
import FilterPanel from '../FilterEngine/FilterPanel';
import { FilterEngine } from '../FilterEngine';
import { PlaceholderEngine } from '../PlaceholderEngine';
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

export default function SearchWorkspace({
  moduleConfig = {},
  records = [],
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
  viewMode = 'list',
  onViewChange = () => {},
  systemDropdowns = null,
  activePipelineStages = [],
  allPositions = []
}) {
  const moduleId = moduleConfig.moduleId || 'default_module';
  const storageKey = `omnilflow_saved_views_${moduleId}`;

  const [showQuickFiltersPopover, setShowQuickFiltersPopover] = useState(false);
  const [showGroupByPopover, setShowGroupByPopover] = useState(false);
  const [showSavedViewsPopover, setShowSavedViewsPopover] = useState(false);
  const [showAdvancedDrawer, setShowAdvancedDrawer] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

  const [newViewTitle, setNewViewTitle] = useState('');
  const [newViewScope, setNewViewScope] = useState('personal'); // 'personal' | 'public'
  const [newViewIsDefault, setNewViewIsDefault] = useState(false);
  const [savedViews, setSavedViews] = useState([]);
  const [activeSavedViewId, setActiveSavedViewId] = useState(null);

  // Load Saved Views from LocalStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSavedViews(Array.isArray(parsed) ? parsed : []);

        // Auto-load default view if present and no active filters/search set
        const defaultView = (parsed || []).find(v => v.isDefault);
        if (defaultView && !searchQuery && !FilterEngine.isFilterActive(filterValues) && !groupByFieldId) {
          applySavedView(defaultView);
        }
      }
    } catch (e) {
      console.warn('Failed to load saved views:', e);
    }
  }, [moduleId]);

  // Save views array to LocalStorage
  const persistSavedViews = (views) => {
    setSavedViews(views);
    try {
      localStorage.setItem(storageKey, JSON.stringify(views));
    } catch (e) {
      console.warn('Failed to persist saved views:', e);
    }
  };

  const applySavedView = (view) => {
    if (!view) return;
    setActiveSavedViewId(view.id);
    onSearchChange(view.searchQuery || '');
    
    // Apply filters
    if (view.filterValues && typeof view.filterValues === 'object') {
      Object.keys(view.filterValues).forEach(k => {
        onFilterChange(k, view.filterValues[k]);
      });
    } else {
      onResetFilters();
    }

    if (view.groupByFieldId !== undefined) {
      onGroupByChange(view.groupByFieldId);
    }
    if (view.sortKey && view.sortDir) {
      onSortChange(view.sortKey, view.sortDir);
    }
    if (view.viewMode) {
      onViewChange(view.viewMode);
    }
    setShowSavedViewsPopover(false);
  };

  const handleSaveCurrentView = (e) => {
    e.preventDefault();
    if (!newViewTitle.trim()) return;

    const newView = {
      id: `view_${Date.now()}`,
      title: newViewTitle.trim(),
      scope: newViewScope, // 'personal' or 'public'
      isDefault: newViewIsDefault,
      searchQuery,
      filterValues: { ...filterValues },
      groupByFieldId,
      sortKey,
      sortDir,
      viewMode,
      createdAt: new Date().toISOString()
    };

    let updatedViews = [...savedViews];
    if (newViewIsDefault) {
      updatedViews = updatedViews.map(v => ({ ...v, isDefault: false }));
    }
    updatedViews.push(newView);

    persistSavedViews(updatedViews);
    setActiveSavedViewId(newView.id);
    setNewViewTitle('');
    setNewViewIsDefault(false);
    setShowSaveModal(false);
  };

  const handleDeleteSavedView = (viewId, e) => {
    e.stopPropagation();
    const updated = savedViews.filter(v => v.id !== viewId);
    persistSavedViews(updated);
    if (activeSavedViewId === viewId) setActiveSavedViewId(null);
  };

  const handleSetDefaultView = (viewId, e) => {
    e.stopPropagation();
    const updated = savedViews.map(v => ({
      ...v,
      isDefault: v.id === viewId ? !v.isDefault : false
    }));
    persistSavedViews(updated);
  };

  // Derive Metadata Fields
  const fields = moduleConfig.fields || [];
  const filterableFields = fields.filter(f => !f.archived && !f.deleted && f.filterable !== false);
  const groupableFields = fields.filter(f => !f.archived && !f.deleted && (f.groupable === true || (f.groupable !== false && (['dropdown', 'radio', 'stage', 'status', 'lookup', 'select'].includes(f.type) || f.systemField))));

  // Extract Lookup Options for a field
  const getFieldOptions = (field) => {
    if (Array.isArray(field.options) && field.options.length > 0) {
      return field.options.map(opt => (typeof opt === 'object' ? opt.value || opt.label : opt));
    }
    const sourceKey = field.optionsSource || field.id;
    if (moduleConfig.lookupData && Array.isArray(moduleConfig.lookupData[sourceKey])) {
      return moduleConfig.lookupData[sourceKey];
    }
    if (moduleConfig.lookupData && Array.isArray(moduleConfig.lookupData[sourceKey + 's'])) {
      return moduleConfig.lookupData[sourceKey + 's'];
    }
    if (systemDropdowns && Array.isArray(systemDropdowns[sourceKey])) {
      return systemDropdowns[sourceKey].map(d => d.name || d.label || d);
    }
    if (field.id === 'stage' && activePipelineStages.length > 0) {
      return activePipelineStages.map(s => s.name);
    }
    // Fallback: Extract unique values live from records
    const set = new Set();
    records.forEach(r => {
      const val = getValString(r[field.id] || r.customFields?.[field.id]);
      if (val) set.add(val);
    });
    return Array.from(set);
  };

  // Filter Chips Math
  const activeChips = [];
  if (searchQuery.trim()) {
    activeChips.push({
      id: '__search__',
      label: `🔍 "${searchQuery}"`,
      onClear: () => onSearchChange('')
    });
  }

  Object.keys(filterValues).forEach(fId => {
    const val = filterValues[fId];
    if (val && val !== 'all') {
      const fieldDef = fields.find(f => f.id === fId);
      const fieldLabel = fieldDef ? fieldDef.label : fId;
      activeChips.push({
        id: fId,
        label: `${fieldLabel}: ${getValString(val)}`,
        onClear: () => onFilterChange(fId, 'all')
      });
    }
  });

  if (groupByFieldId) {
    const groupField = fields.find(f => f.id === groupByFieldId);
    activeChips.push({
      id: '__groupby__',
      label: `📁 Grouped by: ${groupField ? groupField.label : groupByFieldId}`,
      onClear: () => onGroupByChange('')
    });
  }

  const activeSavedView = savedViews.find(v => v.id === activeSavedViewId);
  const activeFiltersCount = Object.values(filterValues).filter(v => v && v !== 'all').length;
  const hasAdvancedFilters = FilterEngine.isFilterActive(filterValues);

  return (
    <div className="universal-search-workspace" style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      {/* MAIN SEARCH WORKSPACE BAR */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justify: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          background: '#ffffff',
          padding: '10px 14px',
          borderRadius: '10px',
          border: '1px solid #cbd5e1',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
          {/* 1. ENTERPRISE SEARCH INPUT */}
          <SearchInput
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onClear={() => onSearchChange('')}
            placeholder={PlaceholderEngine.getSearchPlaceholder(moduleConfig)}
            width="280px"
          />

          {/* 2. ODOO-STYLE QUICK FILTERS DROPDOWN */}
          <div style={{ position: 'relative' }}>
            <Button
              variant={activeFiltersCount > 0 ? 'primary' : 'secondary'}
              size="md"
              icon={<Filter size={14} />}
              onClick={() => {
                setShowQuickFiltersPopover(prev => !prev);
                setShowGroupByPopover(false);
                setShowSavedViewsPopover(false);
                setShowAdvancedDrawer(false);
              }}
              style={activeFiltersCount > 0 ? { background: '#0d9488', color: '#ffffff', border: 'none' } : {}}
            >
              Filters ▾ {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}
            </Button>

            {showQuickFiltersPopover && (
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: '105%',
                  zIndex: 100,
                  background: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                  minWidth: '260px',
                  maxWidth: '340px',
                  maxHeight: '400px',
                  overflowY: 'auto',
                  padding: '8px 0'
                }}
              >
                <div style={{ padding: '6px 14px', fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9' }}>
                  Quick Metadata Filters
                </div>
                {filterableFields.length === 0 ? (
                  <div style={{ padding: '12px 14px', fontSize: '12px', color: '#94a3b8' }}>No filterable fields configured</div>
                ) : (
                  filterableFields.map(field => {
                    const opts = getFieldOptions(field);
                    const currentVal = filterValues[field.id] || 'all';

                    return (
                      <div key={field.id} style={{ padding: '8px 14px', borderBottom: '1px solid #f8fafc' }}>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>
                          {field.label}
                        </div>
                        <select
                          value={currentVal}
                          onChange={(e) => {
                            onFilterChange(field.id, e.target.value);
                          }}
                          style={{
                            width: '100%',
                            padding: '5px 8px',
                            fontSize: '12px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            background: currentVal !== 'all' ? 'rgba(13,148,136,0.08)' : '#ffffff',
                            color: currentVal !== 'all' ? '#0d9488' : '#334155',
                            fontWeight: currentVal !== 'all' ? '700' : '500',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="all">All {field.label}s</option>
                          {opts.map((opt, oIdx) => (
                            <option key={oIdx} value={getValString(opt)}>
                              {getValString(opt)}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })
                )}
                <div style={{ padding: '8px 14px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onResetFilters();
                      setShowQuickFiltersPopover(false);
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* 3. GROUP BY DROPDOWN */}
          <div style={{ position: 'relative' }}>
            <Button
              variant={groupByFieldId ? 'primary' : 'secondary'}
              size="md"
              icon={<Layers size={14} />}
              onClick={() => {
                setShowGroupByPopover(prev => !prev);
                setShowQuickFiltersPopover(false);
                setShowSavedViewsPopover(false);
                setShowAdvancedDrawer(false);
              }}
              style={groupByFieldId ? { background: '#0d9488', color: '#ffffff', border: 'none' } : {}}
            >
              Group By {groupByFieldId ? `(${fields.find(f => f.id === groupByFieldId)?.label || groupByFieldId})` : '▾'}
            </Button>

            {showGroupByPopover && (
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: '105%',
                  zIndex: 100,
                  background: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                  minWidth: '220px',
                  padding: '6px 0'
                }}
              >
                <div style={{ padding: '6px 14px', fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9' }}>
                  Group Roster By
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onGroupByChange('');
                    setShowGroupByPopover(false);
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: !groupByFieldId ? '800' : '500',
                    color: !groupByFieldId ? '#0d9488' : '#334155',
                    background: !groupByFieldId ? 'rgba(13,148,136,0.08)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  None (Default Roster)
                </button>
                {groupableFields.map(field => {
                  const isSelected = groupByFieldId === field.id;
                  return (
                    <button
                      key={field.id}
                      type="button"
                      onClick={() => {
                        onGroupByChange(field.id);
                        setShowGroupByPopover(false);
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 14px',
                        fontSize: '12px',
                        fontWeight: isSelected ? '800' : '500',
                        color: isSelected ? '#0d9488' : '#334155',
                        background: isSelected ? 'rgba(13,148,136,0.08)' : 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justify: 'space-between'
                      }}
                    >
                      <span>{field.label}</span>
                      {isSelected && <Check size={13} color="#0d9488" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4. SAVED VIEWS DROPDOWN */}
          <div style={{ position: 'relative' }}>
            <Button
              variant={activeSavedView ? 'primary' : 'secondary'}
              size="md"
              icon={<Bookmark size={14} />}
              onClick={() => {
                setShowSavedViewsPopover(prev => !prev);
                setShowQuickFiltersPopover(false);
                setShowGroupByPopover(false);
                setShowAdvancedDrawer(false);
              }}
              style={activeSavedView ? { background: '#f59e0b', color: '#ffffff', border: 'none' } : {}}
            >
              Saved Views {activeSavedView ? `(${activeSavedView.title})` : '▾'}
            </Button>

            {showSavedViewsPopover && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '105%',
                  zIndex: 100,
                  background: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                  minWidth: '260px',
                  padding: '6px 0'
                }}
              >
                <div style={{ padding: '6px 14px', fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Custom Workspaces</span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSaveModal(true);
                      setShowSavedViewsPopover(false);
                    }}
                    style={{ border: 'none', background: 'transparent', color: '#0d9488', fontWeight: '700', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                  >
                    <Plus size={12} /> Save Current
                  </button>
                </div>

                {savedViews.length === 0 ? (
                  <div style={{ padding: '14px', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
                    No saved views yet. Configure search/filters and click "+ Save Current".
                  </div>
                ) : (
                  savedViews.map(view => {
                    const isActive = activeSavedViewId === view.id;
                    return (
                      <div
                        key={view.id}
                        onClick={() => applySavedView(view)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justify: 'space-between',
                          padding: '8px 14px',
                          fontSize: '12px',
                          background: isActive ? 'rgba(245,158,11,0.1)' : 'transparent',
                          cursor: 'pointer',
                          borderBottom: '1px solid #f8fafc'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            title={view.isDefault ? 'Default View' : 'Set as Default View'}
                            onClick={(e) => handleSetDefaultView(view.id, e)}
                            style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
                          >
                            <Star size={13} fill={view.isDefault ? '#f59e0b' : 'none'} color="#f59e0b" />
                          </button>
                          <div>
                            <div style={{ fontWeight: '700', color: '#0f172a' }}>{view.title}</div>
                            <div style={{ fontSize: '10px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              {view.scope === 'public' ? <Globe size={10} /> : <User size={10} />}
                              <span>{view.scope === 'public' ? 'Public' : 'Personal'}</span>
                              {view.isDefault && <span style={{ color: '#d97706', fontWeight: '700' }}>• Default</span>}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          title="Delete Saved View"
                          onClick={(e) => handleDeleteSavedView(view.id, e)}
                          style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* 5. ADVANCED FILTER DRAWER BUTTON */}
          <div style={{ position: 'relative' }}>
            <Button
              variant={hasAdvancedFilters ? 'primary' : 'outline'}
              size="md"
              icon={<Sliders size={14} />}
              onClick={() => {
                setShowAdvancedDrawer(prev => !prev);
                setShowQuickFiltersPopover(false);
                setShowGroupByPopover(false);
                setShowSavedViewsPopover(false);
              }}
              style={hasAdvancedFilters ? { background: '#0d9488', color: '#ffffff', border: 'none' } : {}}
            >
              Advanced Filter {hasAdvancedFilters ? '•' : ''}
            </Button>

            {showAdvancedDrawer && (
              <FilterPanel
                moduleConfig={moduleConfig}
                filterValues={filterValues}
                onFilterChange={onFilterChange}
                onResetFilters={onResetFilters}
                onClose={() => setShowAdvancedDrawer(false)}
                systemDropdowns={systemDropdowns}
                activePipelineStages={activePipelineStages}
                allPositions={allPositions}
              />
            )}
          </div>
        </div>
      </div>

      {/* FILTER CHIPS BAR */}
      {activeChips.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', padding: '4px 2px' }}>
          <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginRight: '4px' }}>
            Active Workspace Filters:
          </span>
          {activeChips.map(chip => (
            <div
              key={chip.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '3px 9px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '700',
                background: chip.id === '__search__' ? 'rgba(13,148,136,0.12)' : chip.id === '__groupby__' ? 'rgba(245,158,11,0.12)' : '#e2e8f0',
                color: chip.id === '__search__' ? '#0d9488' : chip.id === '__groupby__' ? '#b45309' : '#1e293b',
                border: '1px solid rgba(0,0,0,0.06)'
              }}
            >
              <span>{chip.label}</span>
              <button
                type="button"
                onClick={chip.onClear}
                style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'inherit' }}
              >
                <X size={12} />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={() => {
              onSearchChange('');
              onResetFilters();
              onGroupByChange('');
              setActiveSavedViewId(null);
            }}
            style={{ border: 'none', background: 'transparent', color: '#ef4444', fontSize: '11px', fontWeight: '700', cursor: 'pointer', marginLeft: '6px', textDecoration: 'underline' }}
          >
            Clear All
          </button>
        </div>
      )}

      {/* SAVE VIEW MODAL */}
      {showSaveModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justify: 'center',
            padding: '16px'
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #cbd5e1',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
              width: '100%',
              maxWidth: '420px',
              padding: '20px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                ⭐ Save Search Workspace View
              </h3>
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveCurrentView} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Workspace View Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sales Team Roster, Active Candidates"
                  value={newViewTitle}
                  onChange={(e) => setNewViewTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Access Scope
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setNewViewScope('personal')}
                    style={{
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px solid',
                      borderColor: newViewScope === 'personal' ? '#0d9488' : '#cbd5e1',
                      background: newViewScope === 'personal' ? 'rgba(13,148,136,0.08)' : '#ffffff',
                      color: newViewScope === 'personal' ? '#0d9488' : '#334155',
                      fontWeight: '700',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'center',
                      gap: '4px'
                    }}
                  >
                    <User size={13} /> Personal (Only Me)
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewViewScope('public')}
                    style={{
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px solid',
                      borderColor: newViewScope === 'public' ? '#0d9488' : '#cbd5e1',
                      background: newViewScope === 'public' ? 'rgba(13,148,136,0.08)' : '#ffffff',
                      color: newViewScope === 'public' ? '#0d9488' : '#334155',
                      fontWeight: '700',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'center',
                      gap: '4px'
                    }}
                  >
                    <Globe size={13} /> Public (Everyone)
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="viewDefaultCheck"
                  checked={newViewIsDefault}
                  onChange={(e) => setNewViewIsDefault(e.target.checked)}
                  style={{ accentColor: '#0d9488', width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="viewDefaultCheck" style={{ fontSize: '12px', color: '#334155', fontWeight: '600', cursor: 'pointer' }}>
                  Set as Default View when entering module
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <Button variant="outline" size="md" onClick={() => setShowSaveModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="md" type="submit">
                  Save View
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
