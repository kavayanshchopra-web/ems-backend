import React, { useState } from 'react';
import { X, FilterX, Bookmark, Sliders, Zap, Check } from 'lucide-react';
import { FilterEngine } from '../FilterEngine';
import { PlaceholderEngine } from '../PlaceholderEngine';
import UniversalConditionBuilder from './UniversalConditionBuilder';
import Button from '../../../components/ui/Button';

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

export default function FilterPanel({
  moduleConfig = {},
  filterValues = {},
  onFilterChange = () => {},
  onResetFilters = () => {},
  onClose = () => {},
  onOpenSavePresetModal = () => {},
  systemDropdowns = null,
  activePipelineStages = [],
  allPositions = []
}) {
  const filterableFields = FilterEngine.getFilterableFields(moduleConfig);
  const isFilterActive = FilterEngine.isFilterActive(filterValues);

  // If conditions already exist, default to the conditions tab
  const hasActiveConditions = Array.isArray(filterValues._conditions) && filterValues._conditions.length > 0;
  const [activeTab, setActiveTab] = useState(hasActiveConditions ? 'conditions' : 'conditions');

  return (
    <div
      className="filter-panel-popover"
      style={{
        position: 'absolute',
        left: 0,
        top: '105%',
        zIndex: 100,
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #cbd5e1',
        boxShadow: '0 12px 30px -5px rgba(0,0,0,0.18)',
        width: '520px',
        maxWidth: '92vw',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. POPOVER HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(13, 148, 136, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0d9488' }}>
            <Sliders size={14} />
          </div>
          <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
            Filter {moduleConfig.entityNamePlural || 'Records'}
          </span>
        </div>

        {/* TABS: CONDITIONS VS QUICK FILTERS */}
        <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', borderRadius: '7px', padding: '2px', border: '1px solid #cbd5e1' }}>
          <button
            type="button"
            onClick={() => setActiveTab('conditions')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 9px',
              fontSize: '11px',
              fontWeight: '800',
              borderRadius: '5px',
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'conditions' ? '#0d9488' : 'transparent',
              color: activeTab === 'conditions' ? '#ffffff' : '#64748b',
              transition: 'all 0.15s ease'
            }}
          >
            <span>Smart Conditions</span>
            {hasActiveConditions && (
              <span style={{ background: activeTab === 'conditions' ? 'rgba(255,255,255,0.3)' : '#0d9488', color: '#ffffff', borderRadius: '10px', padding: '1px 5px', fontSize: '10px' }}>
                {filterValues._conditions.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('quick')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 9px',
              fontSize: '11px',
              fontWeight: '800',
              borderRadius: '5px',
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'quick' ? '#0d9488' : 'transparent',
              color: activeTab === 'quick' ? '#ffffff' : '#64748b',
              transition: 'all 0.15s ease'
            }}
          >
            <Zap size={11} />
            <span>Quick Fields</span>
          </button>
        </div>

        <button type="button" onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', padding: '2px', display: 'flex' }}>
          <X size={16} />
        </button>
      </div>

      {/* 2. TAB BODY */}
      {activeTab === 'conditions' ? (
        /* ODOO / GHL DYNAMIC RULE BUILDER */
        <UniversalConditionBuilder
          moduleConfig={moduleConfig}
          filterValues={filterValues}
          onFilterChange={onFilterChange}
          systemDropdowns={systemDropdowns}
          activePipelineStages={activePipelineStages}
          allPositions={allPositions}
        />
      ) : (
        /* QUICK FIELD DROPDOWNS */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px 14px',
            maxHeight: '300px',
            overflowY: 'auto',
            paddingRight: '4px'
          }}
        >
          {filterableFields.map(field => {
            const lookupKey = field.optionsSource || field.key || field.id;
            let opts = [];

            if (moduleConfig?.lookupData && Array.isArray(moduleConfig.lookupData[lookupKey]) && moduleConfig.lookupData[lookupKey].length > 0) {
              opts = moduleConfig.lookupData[lookupKey].map(getValString);
            } else if (Array.isArray(field.options) && field.options.length > 0) {
              opts = field.options.map(getValString);
            } else if (Array.isArray(field.manualOptions) && field.manualOptions.length > 0) {
              opts = field.manualOptions.map(getValString);
            }

            if (field.id === 'callTime' || field.type === 'datetime') {
              opts = ['Today', 'Yesterday', 'Last 7 Days', 'This Month'];
            } else if (field.id === 'agentName' || field.optionsSource === 'employees' || lookupKey === 'employees') {
              if (Array.isArray(systemDropdowns?.employees) && systemDropdowns.employees.length > 0) {
                opts = systemDropdowns.employees.map(e => typeof e === 'string' ? e : getValString(e.name || e.label || e.email));
              }
            }

            if (opts.length === 0) {
              if (field.optionsSource === 'departments') opts = (systemDropdowns?.departments || []).map(getValString);
              if (field.optionsSource === 'designations') opts = (systemDropdowns?.designations || []).map(getValString);
              if (field.optionsSource === 'ats_stages') opts = activePipelineStages.map(s => getValString(s.name || s.title));
              if (field.optionsSource === 'crm_stages' || lookupKey === 'crm_stages' || (moduleConfig?.moduleId === 'contacts' && field.id === 'status')) {
                const raw = (activePipelineStages && activePipelineStages.length > 0)
                  ? activePipelineStages
                  : (systemDropdowns?.crmStages || systemDropdowns?.crm_stages || moduleConfig?.stages || []);
                opts = raw.map(s => typeof s === 'string' ? s : getValString(s.name || s.title || s.label || s.id || s));
              }
              if (field.optionsSource === 'employment_types') opts = ['Full-time', 'Part-time', 'Contract', 'Internship'];
              if (field.optionsSource === 'positions') opts = allPositions;
            }

            const currentVal = filterValues[field.id] || 'all';

            return (
              <div key={field.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {field.label}
                </label>
                {opts.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <select
                      value={currentVal}
                      onChange={(e) => onFilterChange(field.id, e.target.value)}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', background: '#ffffff' }}
                    >
                      <option value="all">{PlaceholderEngine.getFilterAllOptionLabel(field)}</option>
                      {opts.map((opt, i) => (
                        <option key={i} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <input
                    type={field.type === 'date' ? 'date' : 'text'}
                    placeholder={PlaceholderEngine.getFilterPlaceholder(field)}
                    value={filterValues[field.id] || ''}
                    onChange={(e) => onFilterChange(field.id, e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 3. POPOVER FOOTER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isFilterActive && (
            <Button variant="secondary" size="sm" icon={<FilterX size={12} />} onClick={onResetFilters}>
              Reset All
            </Button>
          )}
          {isFilterActive && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSavePresetModal();
              }}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '700',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Bookmark size={12} color="#0d9488" />
              <span>Save View</span>
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '11.5px',
            fontWeight: '800',
            border: 'none',
            background: 'linear-gradient(135deg, #064e43 0%, #0d9488 100%)',
            color: '#ffffff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 6px rgba(13, 148, 136, 0.25)'
          }}
        >
          <Check size={13} />
          <span>Done</span>
        </button>
      </div>
    </div>
  );
}
