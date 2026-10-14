/**
 * UNIVERSAL ACTIVE FILTER CHIPS COMPONENT
 * Renders active filter badges and Odoo/GHL smart condition chips with single-click dismissal
 */

import React from 'react';
import { X, FilterX, Sliders } from 'lucide-react';
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
  const allFields = FilterEngine.getAllConditionFields(moduleConfig);
  const isFilterActive = FilterEngine.isFilterActive(filterValues) || Boolean(searchQuery.trim());

  if (!isFilterActive) return null;

  const conditions = Array.isArray(filterValues._conditions) ? filterValues._conditions : [];
  const combinator = filterValues._combinator || 'AND';

  return (
    <div
      className="active-filter-chips-container"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap',
        background: '#f8fafc',
        padding: '6px 12px',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        fontSize: '12px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '700', color: '#475569' }}>
        <Sliders size={13} color="#0d9488" />
        <span>Active Filters ({filteredCount} of {totalCount}):</span>
      </div>

      {/* COMBINATOR BADGE IF MULTIPLE CONDITIONS */}
      {conditions.length > 1 && (
        <span
          style={{
            padding: '2px 6px',
            borderRadius: '4px',
            background: combinator === 'OR' ? '#dbeafe' : '#ccfbf1',
            color: combinator === 'OR' ? '#1d4ed8' : '#0f766e',
            fontWeight: '800',
            fontSize: '10px'
          }}
        >
          {combinator === 'OR' ? 'MATCH ANY (OR)' : 'MATCH ALL (AND)'}
        </span>
      )}

      {/* 1. ADVANCED ODOO/GHL CONDITION CHIPS */}
      {conditions.map((cond, idx) => {
        const field = allFields.find(f => f.id === cond.fieldId) || { label: cond.fieldId };
        const ops = FilterEngine.getOperatorsForField(field);
        const op = ops.find(o => o.id === cond.operator) || { label: cond.operator };
        const hasVal = cond.value && String(cond.value).trim();

        return (
          <span
            key={cond.id || idx}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 8px',
              borderRadius: '12px',
              background: '#f0fdfa',
              border: '1px solid #99f6e4',
              color: '#0f766e',
              fontWeight: '700',
              fontSize: '11px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
            }}
          >
            <span>{field.label || field.name || cond.fieldId}:</span>
            <span style={{ color: '#0d9488', fontWeight: '600' }}>{op.label}</span>
            {hasVal && <span style={{ color: '#0f172a', fontWeight: '700' }}>"{cond.value}"</span>}
            <button
              type="button"
              title="Remove condition"
              onClick={() => onRemoveFilter('_conditions', idx)}
              style={{
                border: 'none',
                background: 'rgba(13, 148, 136, 0.15)',
                borderRadius: '50%',
                cursor: 'pointer',
                color: '#0f766e',
                width: '14px',
                height: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0
              }}
            >
              <X size={10} />
            </button>
          </span>
        );
      })}

      {/* 2. LEGACY QUICK FIELD DROPDOWN CHIPS */}
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

      {/* 3. SEARCH QUERY CHIP */}
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
          Search: "{searchQuery.trim()}"
          <button
            type="button"
            onClick={onClearSearch}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#d97706', padding: 0 }}
          >
            <X size={12} />
          </button>
        </span>
      )}

      {/* CLEAR ALL BUTTON */}
      <Button variant="secondary" size="sm" icon={<FilterX size={12} />} onClick={onResetAll}>
        Clear All
      </Button>
    </div>
  );
}
