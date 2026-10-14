/**
 * UNIVERSAL CONDITION BUILDER (Odoo & GoHighLevel Architecture)
 * Dynamic, schema-driven AND/OR rule condition builder for any module.
 */

import React, { useMemo } from 'react';
import { Plus, Trash2, Sliders, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { FilterEngine } from '../FilterEngine';

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

export default function UniversalConditionBuilder({
  moduleConfig = {},
  filterValues = {},
  onFilterChange = () => {},
  systemDropdowns = null,
  activePipelineStages = [],
  allPositions = []
}) {
  const allFields = useMemo(() => {
    return FilterEngine.getAllConditionFields(moduleConfig);
  }, [moduleConfig]);

  const conditions = useMemo(() => {
    return Array.isArray(filterValues._conditions) ? filterValues._conditions : [];
  }, [filterValues._conditions]);

  const combinator = filterValues._combinator || 'AND';

  // Helper to get dropdown options for a field dynamically
  const getFieldOptions = (field) => {
    if (!field) return [];
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
      if (field.id === 'agentName' || field.optionsSource === 'employees' || lookupKey === 'employees') {
        if (Array.isArray(systemDropdowns?.employees) && systemDropdowns.employees.length > 0) {
          opts = systemDropdowns.employees.map(e => typeof e === 'string' ? e : getValString(e.name || e.label || e.email));
        }
      }
      if (field.optionsSource === 'crm_stages' || lookupKey === 'crm_stages' || (moduleConfig?.moduleId === 'contacts' && field.id === 'status')) {
        const raw = (activePipelineStages && activePipelineStages.length > 0)
          ? activePipelineStages
          : (systemDropdowns?.crmStages || systemDropdowns?.crm_stages || moduleConfig?.stages || []);
        opts = raw.map(s => typeof s === 'string' ? s : getValString(s.name || s.title || s.label || s.id || s));
      }
      if (field.optionsSource === 'departments') opts = (systemDropdowns?.departments || []).map(getValString);
      if (field.optionsSource === 'designations') opts = (systemDropdowns?.designations || []).map(getValString);
      if (field.optionsSource === 'positions') opts = allPositions;
    }

    return opts.filter(Boolean);
  };

  // Add a new condition row
  const handleAddCondition = () => {
    const firstField = allFields[0];
    if (!firstField) return;
    const ops = FilterEngine.getOperatorsForField(firstField);
    const newRule = {
      id: 'cond_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      fieldId: firstField.id,
      operator: ops[0]?.id || 'contains',
      value: ''
    };
    const nextConditions = [...conditions, newRule];
    onFilterChange({
      _conditions: nextConditions,
      _combinator: combinator
    });
  };

  // Update a condition row
  const handleUpdateCondition = (index, key, val) => {
    const nextConditions = conditions.map((c, i) => {
      if (i !== index) return c;
      const updated = { ...c, [key]: val };

      // If user changed the field, reset operator to the new field's default operator
      if (key === 'fieldId') {
        const newField = allFields.find(f => f.id === val);
        const ops = FilterEngine.getOperatorsForField(newField);
        updated.operator = ops[0]?.id || 'contains';
        updated.value = '';
      }
      return updated;
    });

    onFilterChange({
      _conditions: nextConditions,
      _combinator: combinator
    });
  };

  // Remove a condition row
  const handleRemoveCondition = (index) => {
    const nextConditions = conditions.filter((_, i) => i !== index);
    onFilterChange({
      _conditions: nextConditions,
      _combinator: combinator
    });
  };

  // Toggle Combinator (AND / OR)
  const handleToggleCombinator = (nextComb) => {
    onFilterChange({
      _combinator: nextComb
    });
  };

  // One-click Quick Shortcut Pills
  const handleApplyShortcutPill = (fieldId, operator, value = '') => {
    const exists = conditions.some(c => c.fieldId === fieldId && c.operator === operator);
    let nextConditions;
    if (exists) {
      // Toggle off if already active
      nextConditions = conditions.filter(c => !(c.fieldId === fieldId && c.operator === operator));
    } else {
      nextConditions = [
        ...conditions,
        {
          id: 'cond_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          fieldId,
          operator,
          value
        }
      ];
    }
    onFilterChange({
      _conditions: nextConditions,
      _combinator: combinator
    });
  };

  const isContactsModule = moduleConfig?.moduleId === 'contacts' || moduleConfig?.moduleId === 'crm_leads';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* 1. QUICK SHORTCUT PILLS BAR */}
      {isContactsModule && (
        <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Sparkles size={12} color="#0d9488" />
            <span>1-CLICK QUICK FILTERS:</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            <button
              type="button"
              onClick={() => handleApplyShortcutPill('phone', 'has_value')}
              style={{
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer',
                border: '1px solid #0d9488',
                background: conditions.some(c => c.fieldId === 'phone' && c.operator === 'has_value') ? '#0d9488' : '#ffffff',
                color: conditions.some(c => c.fieldId === 'phone' && c.operator === 'has_value') ? '#ffffff' : '#0d9488'
              }}
            >
              📞 Phone Available
            </button>

            <button
              type="button"
              onClick={() => handleApplyShortcutPill('phone', 'is_empty')}
              style={{
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer',
                border: '1px solid #f59e0b',
                background: conditions.some(c => c.fieldId === 'phone' && c.operator === 'is_empty') ? '#f59e0b' : '#ffffff',
                color: conditions.some(c => c.fieldId === 'phone' && c.operator === 'is_empty') ? '#ffffff' : '#d97706'
              }}
            >
              ⚠️ Missing Phone
            </button>

            <button
              type="button"
              onClick={() => handleApplyShortcutPill('email', 'is_empty')}
              style={{
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer',
                border: '1px solid #64748b',
                background: conditions.some(c => c.fieldId === 'email' && c.operator === 'is_empty') ? '#64748b' : '#ffffff',
                color: conditions.some(c => c.fieldId === 'email' && c.operator === 'is_empty') ? '#ffffff' : '#475569'
              }}
            >
              ✉️ Missing Email
            </button>

            <button
              type="button"
              onClick={() => handleApplyShortcutPill('assignedTo', 'is_empty')}
              style={{
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer',
                border: '1px solid #8b5cf6',
                background: conditions.some(c => c.fieldId === 'assignedTo' && c.operator === 'is_empty') ? '#8b5cf6' : '#ffffff',
                color: conditions.some(c => c.fieldId === 'assignedTo' && c.operator === 'is_empty') ? '#ffffff' : '#7c3aed'
              }}
            >
              👤 Unassigned
            </button>
          </div>
        </div>
      )}

      {/* 2. MATCH LOGIC SWITCHER (AND / OR) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f1f5f9', padding: '6px 10px', borderRadius: '8px' }}>
        <span style={{ fontSize: '11.5px', fontWeight: '800', color: '#1e293b' }}>
          Match Records That Satisfy:
        </span>
        <div style={{ display: 'flex', alignItems: 'center', background: '#ffffff', borderRadius: '6px', padding: '2px', border: '1px solid #cbd5e1' }}>
          <button
            type="button"
            onClick={() => handleToggleCombinator('AND')}
            style={{
              padding: '2px 8px',
              fontSize: '11px',
              fontWeight: '800',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              background: combinator === 'AND' ? '#0d9488' : 'transparent',
              color: combinator === 'AND' ? '#ffffff' : '#64748b',
              transition: 'all 0.15s ease'
            }}
          >
            ALL (AND)
          </button>
          <button
            type="button"
            onClick={() => handleToggleCombinator('OR')}
            style={{
              padding: '2px 8px',
              fontSize: '11px',
              fontWeight: '800',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              background: combinator === 'OR' ? '#2563eb' : 'transparent',
              color: combinator === 'OR' ? '#ffffff' : '#64748b',
              transition: 'all 0.15s ease'
            }}
          >
            ANY (OR)
          </button>
        </div>
      </div>

      {/* 3. LIST OF CONDITION RULES */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto', paddingRight: '2px' }}>
        {conditions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 10px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
            <Sliders size={20} color="#94a3b8" style={{ margin: '0 auto 6px' }} />
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>No conditional rules applied</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Click "+ Add Condition" below to build custom Odoo/GHL filters.</div>
          </div>
        ) : (
          conditions.map((cond, idx) => {
            const currentField = allFields.find(f => f.id === cond.fieldId) || allFields[0];
            const ops = FilterEngine.getOperatorsForField(currentField);
            const fieldOpts = getFieldOptions(currentField);
            const needsNoValue = cond.operator === 'has_value' || cond.operator === 'is_empty' || cond.operator === 'today' || cond.operator === 'yesterday' || cond.operator === 'last_7_days' || cond.operator === 'this_month';

            const isDateField = currentField?.type === 'date' || currentField?.type === 'datetime' || ['exact_date', 'before', 'after'].includes(cond.operator);

            return (
              <div
                key={cond.id || idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: needsNoValue ? '1fr 1fr 30px' : '120px 120px 1fr 30px',
                  gap: '6px',
                  alignItems: 'center',
                  background: '#ffffff',
                  padding: '6px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                }}
              >
                {/* A. FIELD SELECTOR */}
                <select
                  value={cond.fieldId}
                  onChange={(e) => handleUpdateCondition(idx, 'fieldId', e.target.value)}
                  style={{
                    padding: '5px 8px',
                    borderRadius: '5px',
                    border: '1px solid #cbd5e1',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    color: '#0f172a',
                    outline: 'none',
                    background: '#f8fafc'
                  }}
                >
                  {allFields.map(f => (
                    <option key={f.id} value={f.id}>{f.label || f.name || f.id}</option>
                  ))}
                </select>

                {/* B. OPERATOR SELECTOR */}
                <select
                  value={cond.operator}
                  onChange={(e) => handleUpdateCondition(idx, 'operator', e.target.value)}
                  style={{
                    padding: '5px 8px',
                    borderRadius: '5px',
                    border: '1px solid #cbd5e1',
                    fontSize: '11px',
                    fontWeight: '600',
                    color: '#0d9488',
                    outline: 'none',
                    background: '#ffffff'
                  }}
                >
                  {ops.map(o => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>

                {/* C. VALUE INPUT (Only if operator needs a value) */}
                {!needsNoValue && (
                  fieldOpts.length > 0 ? (
                    <select
                      value={cond.value || ''}
                      onChange={(e) => handleUpdateCondition(idx, 'value', e.target.value)}
                      style={{
                        padding: '5px 8px',
                        borderRadius: '5px',
                        border: '1px solid #cbd5e1',
                        fontSize: '11.5px',
                        outline: 'none',
                        background: '#ffffff',
                        width: '100%',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="">Select option...</option>
                      {fieldOpts.map((opt, optIdx) => (
                        <option key={optIdx} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={isDateField ? 'date' : (currentField?.type === 'number' ? 'number' : 'text')}
                      value={cond.value || ''}
                      onChange={(e) => handleUpdateCondition(idx, 'value', e.target.value)}
                      placeholder={cond.operator === 'ends_with' ? 'e.g. @gmail.com' : 'Enter value...'}
                      style={{
                        padding: '5px 8px',
                        borderRadius: '5px',
                        border: '1px solid #cbd5e1',
                        fontSize: '11.5px',
                        outline: 'none',
                        background: '#ffffff',
                        width: '100%',
                        boxSizing: 'border-box'
                      }}
                    />
                  )
                )}

                {/* D. REMOVE BUTTON */}
                <button
                  type="button"
                  title="Remove condition"
                  onClick={() => handleRemoveCondition(idx)}
                  style={{
                    border: 'none',
                    background: '#fee2e2',
                    color: '#ef4444',
                    borderRadius: '5px',
                    padding: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '26px'
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* 4. ADD CONDITION BUTTON */}
      <button
        type="button"
        onClick={handleAddCondition}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: '7px',
          border: '1px dashed #0d9488',
          background: 'rgba(13, 148, 136, 0.05)',
          color: '#0d9488',
          fontSize: '11.5px',
          fontWeight: '800',
          cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}
      >
        <Plus size={13} />
        <span>+ Add Condition Rule</span>
      </button>
    </div>
  );
}
