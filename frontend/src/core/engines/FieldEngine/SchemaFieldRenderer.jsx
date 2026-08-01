/**
 * UNIVERSAL SCHEMA FIELD RENDERER
 * 100% Schema-Driven UI Renderer for All Enterprise Data Types
 */

import React from 'react';
import { FileText, User, Calendar, CheckSquare, Hash, DollarSign, Mail, Phone, Link, Sparkles } from 'lucide-react';

/**
 * Defensive string extractor helper
 */
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

export default function SchemaFieldRenderer({
  field,
  value,
  onChange = () => {},
  error = null,
  mode = 'create', // 'create' | 'edit' | 'view'
  systemDropdowns = null,
  activePipelineStages = [],
  allPositions = [],
  readOnly = false,
  theme = {}
}) {
  if (!field || field.hidden) return null;

  const isViewMode = mode === 'view' || readOnly || field.readOnly;
  const rawVal = value !== undefined && value !== null ? value : '';
  const valStr = getValString(rawVal);

  // Resolution of Option List for Dropdowns
  let optionsList = field.manualOptions || [];
  if (field.optionsSource === 'departments') optionsList = (systemDropdowns?.departments || []).map(getValString);
  if (field.optionsSource === 'designations') optionsList = (systemDropdowns?.designations || []).map(getValString);
  if (field.optionsSource === 'ats_stages') optionsList = activePipelineStages.map(s => getValString(s.name));
  if (field.optionsSource === 'employment_types') optionsList = ['Full-time', 'Part-time', 'Contract', 'Internship'];
  if (field.optionsSource === 'positions') optionsList = allPositions;

  // ----------------------------------------------------
  // READ-ONLY / VIEW DRAWER MODE RENDERER
  // ----------------------------------------------------
  if (isViewMode) {
    let displayVal = valStr || '—';
    if (field.type === 'checkbox' || field.type === 'boolean') {
      displayVal = rawVal ? 'Yes' : 'No';
    } else if (field.type === 'currency' && valStr) {
      displayVal = `$${Number(valStr).toLocaleString()}`;
    }

    return (
      <div
        className="schema-field-view"
        style={{
          background: theme.bg || '#ffffff',
          padding: '10px 12px',
          borderRadius: '6px',
          border: '1px solid #e2e8f0',
          fontSize: '12px'
        }}
      >
        <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
          {field.label}
        </span>
        <span style={{ fontWeight: '700', color: '#0f172a', wordBreak: 'break-word' }}>
          {displayVal}
        </span>
      </div>
    );
  }

  // ----------------------------------------------------
  // EDIT / CREATE FORM INPUT RENDERERS
  // ----------------------------------------------------
  const baseInputStyle = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '6px',
    border: error ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
    background: '#ffffff',
    color: '#0f172a',
    transition: 'border-color 0.15s ease'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '11px',
    fontWeight: '700',
    color: '#334155',
    marginBottom: '4px'
  };

  const renderInputField = () => {
    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            id={field.id}
            rows={field.rows || 3}
            placeholder={field.placeholder || `Enter ${field.label}...`}
            value={valStr}
            onChange={(e) => onChange(e.target.value)}
            style={{ ...baseInputStyle, resize: 'vertical' }}
            aria-invalid={Boolean(error)}
          />
        );

      case 'dropdown':
      case 'select':
      case 'radio':
        return (
          <select
            id={field.id}
            value={valStr}
            onChange={(e) => onChange(e.target.value)}
            style={baseInputStyle}
            aria-invalid={Boolean(error)}
          >
            <option value="">Select {field.label}...</option>
            {optionsList.map((opt, i) => (
              <option key={i} value={opt}>{opt}</option>
            ))}
          </select>
        );

      case 'checkbox':
      case 'boolean':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
            <input
              type="checkbox"
              id={field.id}
              checked={Boolean(rawVal)}
              onChange={(e) => onChange(e.target.checked)}
              style={{ accentColor: '#0d9488', width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor={field.id} style={{ fontSize: '12px', fontWeight: '700', color: '#334155', cursor: 'pointer', margin: 0 }}>
              {field.label} {field.required && <span style={{ color: '#ef4444' }}>*</span>}
            </label>
          </div>
        );

      case 'number':
      case 'currency':
        return (
          <input
            type="number"
            id={field.id}
            placeholder={field.placeholder || `0.00`}
            value={valStr}
            onChange={(e) => onChange(e.target.value)}
            style={baseInputStyle}
            aria-invalid={Boolean(error)}
          />
        );

      case 'date':
        return (
          <input
            type="date"
            id={field.id}
            value={valStr}
            onChange={(e) => onChange(e.target.value)}
            style={baseInputStyle}
            aria-invalid={Boolean(error)}
          />
        );

      case 'datetime':
        return (
          <input
            type="datetime-local"
            id={field.id}
            value={valStr}
            onChange={(e) => onChange(e.target.value)}
            style={baseInputStyle}
            aria-invalid={Boolean(error)}
          />
        );

      case 'email':
        return (
          <input
            type="email"
            id={field.id}
            placeholder={field.placeholder || `e.g. user@example.com`}
            value={valStr}
            onChange={(e) => onChange(e.target.value)}
            style={baseInputStyle}
            aria-invalid={Boolean(error)}
          />
        );

      case 'phone':
        return (
          <input
            type="tel"
            id={field.id}
            placeholder={field.placeholder || `e.g. +91 9876543210`}
            value={valStr}
            onChange={(e) => onChange(e.target.value)}
            style={baseInputStyle}
            aria-invalid={Boolean(error)}
          />
        );

      case 'file':
      case 'image':
        return (
          <input
            type="text"
            id={field.id}
            placeholder={field.placeholder || `Enter ${field.label} URL / Filename...`}
            value={valStr}
            onChange={(e) => onChange(e.target.value)}
            style={baseInputStyle}
            aria-invalid={Boolean(error)}
          />
        );

      case 'ai':
        return (
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              id={field.id}
              placeholder={field.placeholder || `AI Assistant Prompt / Result...`}
              value={valStr}
              onChange={(e) => onChange(e.target.value)}
              style={{ ...baseInputStyle, paddingRight: '32px' }}
            />
            <Sparkles size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#0d9488' }} />
          </div>
        );

      case 'text':
      default:
        return (
          <input
            type="text"
            id={field.id}
            placeholder={field.placeholder || `Enter ${field.label}...`}
            value={valStr}
            onChange={(e) => onChange(e.target.value)}
            style={baseInputStyle}
            aria-invalid={Boolean(error)}
          />
        );
    }
  };

  return (
    <div key={field.id} className="schema-field-container" style={{ display: 'flex', flexDirection: 'column' }}>
      {field.type !== 'checkbox' && field.type !== 'boolean' && (
        <label htmlFor={field.id} style={labelStyle}>
          {field.label} {field.required && <span style={{ color: '#ef4444' }}>*</span>}
        </label>
      )}

      {renderInputField()}

      {field.helpText && !error && (
        <span style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{field.helpText}</span>
      )}

      {error && (
        <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: '600', marginTop: '2px' }}>
          {error}
        </span>
      )}
    </div>
  );
}
