/**
 * UNIVERSAL ACTIVE FILTER CHIPS COMPONENT
 * Renders active filter badges with single-click dismissal
 */

import React from 'react';
import { X, FilterX } from 'lucide-react';
import { FilterEngine } from '../FilterEngine';
import Button from '../../../components/ui/Button';

export default function ActiveFilterChips({
  moduleConfig = {},
  filterValues = {},
  searchQuery = '',
  totalCount = 0,
  filteredCount = 0,
  onRemoveFilter = () => {},
  onClearSearch = () => {},
  onResetAll = () => {}
}) {
  const filterableFields = FilterEngine.getFilterableFields(moduleConfig);
  const isFilterActive = FilterEngine.isFilterActive(filterValues) || Boolean(searchQuery.trim());

  if (!isFilterActive) return null;

  return (
    <div
      className="active-filter-chips-container"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap',
        background: '#f8fafc',
        padding: '8px 14px',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        fontSize: '12px'
      }}
    >
      <span style={{ fontWeight: '700', color: '#475569' }}>
        Active Filters ({filteredCount} of {totalCount}):
      </span>

      {filterableFields.map(field => {
        const val = filterValues[field.id];
        if (!val || val === 'all') return null;

        return (
          <span
            key={field.id}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '12px',
              background: 'rgba(13, 148, 136, 0.1)',
              color: '#0d9488',
              fontWeight: '700',
              fontSize: '11px'
            }}
          >
            {field.label}: {val}
            <button
              type="button"
              onClick={() => onRemoveFilter(field.id)}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#0d9488', padding: 0 }}
            >
              <X size={12} />
            </button>
          </span>
        );
      })}

      {searchQuery.trim() && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 8px',
            borderRadius: '12px',
            background: 'rgba(245, 158, 11, 0.1)',
            color: '#d97706',
            fontWeight: '700',
            fontSize: '11px'
          }}
        >
          Query: "{searchQuery.trim()}"
          <button
            type="button"
            onClick={onClearSearch}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#d97706', padding: 0 }}
          >
            <X size={12} />
          </button>
        </span>
      )}

      <Button variant="secondary" size="sm" icon={<FilterX size={12} />} onClick={onResetAll}>
        Clear All
      </Button>
    </div>
  );
}
