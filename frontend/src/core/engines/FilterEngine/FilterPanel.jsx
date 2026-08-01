/**
 * UNIVERSAL FILTER PANEL COMPONENT
 * 100% Schema-Driven Filter Popover Renderer for any EMS Module
 */

import React from 'react';
import { X, FilterX } from 'lucide-react';
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
        borderRadius: '10px',
        border: '1px solid #cbd5e1',
        boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
        minWidth: '240px',
        maxWidth: '320px',
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
        <span style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a' }}>
          Filter {moduleConfig.entityNamePlural || 'Records'}
        </span>
        <button type="button" onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}>
          <X size={14} />
        </button>
      </div>

      {filterableFields.map(field => {
        let opts = field.manualOptions || [];
        if (field.optionsSource === 'departments') opts = (systemDropdowns?.departments || []).map(getValString);
        if (field.optionsSource === 'designations') opts = (systemDropdowns?.designations || []).map(getValString);
        if (field.optionsSource === 'ats_stages') opts = activePipelineStages.map(s => getValString(s.name));
        if (field.optionsSource === 'employment_types') opts = ['Full-time', 'Part-time', 'Contract', 'Internship'];
        if (field.optionsSource === 'positions') opts = allPositions;

        const currentVal = filterValues[field.id] || 'all';

        return (
          <div key={field.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569' }}>
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
                style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none' }}
              />
            )}
          </div>
        );
      })}

      {isFilterActive && (
        <Button variant="secondary" size="sm" icon={<FilterX size={12} />} onClick={onResetFilters}>
          Reset All Filters
        </Button>
      )}
    </div>
  );
}
