import React from 'react';
import { X, FilterX, Bookmark } from 'lucide-react';
import { FilterEngine } from '../FilterEngine';
import { PlaceholderEngine } from '../PlaceholderEngine';
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
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
        width: '460px',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* POPOVER HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
        <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
          Filter {moduleConfig.entityNamePlural || 'Records'}
        </span>
        <button type="button" onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', padding: '2px' }}>
          <X size={15} />
        </button>
      </div>

      {/* 2-COLUMN SCROLLABLE FIELDS GRID */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px 14px',
          maxHeight: '320px',
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

          if (opts.length === 0) {
            if (field.optionsSource === 'departments') opts = (systemDropdowns?.departments || []).map(getValString);
            if (field.optionsSource === 'designations') opts = (systemDropdowns?.designations || []).map(getValString);
            if (field.optionsSource === 'ats_stages') opts = activePipelineStages.map(s => getValString(s.name));
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

      {/* POPOVER FOOTER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
        {isFilterActive ? (
          <Button variant="secondary" size="sm" icon={<FilterX size={12} />} onClick={onResetFilters}>
            Reset All
          </Button>
        ) : (
          <div />
        )}

        {isFilterActive && (
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenSavePresetModal();
            }}
            style={{
              padding: '6px 12px',
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
            <Bookmark size={13} />
            <span>Save as View Preset</span>
          </button>
        )}
      </div>
    </div>
  );
}
