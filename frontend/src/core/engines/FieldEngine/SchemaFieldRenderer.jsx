/**
 * UNIVERSAL SCHEMA FIELD RENDERER
 * 100% Schema-Driven UI Renderer for All Enterprise Data Types
 */

import React from 'react';
import { FileText, User, Calendar, CheckSquare, Hash, DollarSign, Mail, Phone, Link, Sparkles } from 'lucide-react';

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

const formatDate = (isoStr) => {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return String(isoStr);
    const dayStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${dayStr}, ${timeStr}`;
  } catch (e) {
    return String(isoStr);
  }
};

export default function SchemaFieldRenderer({
  field,
  value,
  onChange = () => {},
  error = null,
  mode = 'create', // 'create' | 'edit' | 'view'
  compact = false,
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
  // READ-ONLY / VIEW MODE RENDERER
  // ----------------------------------------------------
  if (isViewMode) {
    let displayVal = valStr || '—';
    if (field.type === 'checkbox' || field.type === 'boolean') {
      displayVal = rawVal ? 'Yes' : 'No';
    } else if (field.type === 'currency' && valStr) {
      displayVal = `$${Number(valStr).toLocaleString()}`;
    } else if ((field.type === 'date' || field.type === 'datetime' || field.id === 'createdAt' || field.id === 'appliedDate') && valStr) {
      displayVal = formatDate(valStr);
    }

    if (compact) {
      return (
        <span style={{ fontWeight: '600', color: valStr ? '#334155' : '#94a3b8', fontSize: '12px', wordBreak: 'break-word' }}>
          {displayVal}
        </span>
      );
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
    marginBottom: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.02em'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%' }}>
      <label style={labelStyle}>
        {field.label}
        {field.required && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
      </label>

      {/* DROPDOWN / SELECT */}
      {field.type === 'dropdown' || field.type === 'select' ? (
        <select
          value={valStr}
          onChange={(e) => onChange(e.target.value)}
          style={{ ...baseInputStyle, cursor: 'pointer' }}
        >
          <option value="">Select {field.label}...</option>
          {optionsList.map((opt, idx) => {
            const optVal = getValString(opt);
            return (
              <option key={idx} value={optVal}>
                {optVal}
              </option>
            );
          })}
        </select>
      ) : field.type === 'textarea' ? (
        <textarea
          rows={3}
          value={valStr}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || `Enter ${field.label}...`}
          style={{ ...baseInputStyle, resize: 'vertical' }}
        />
      ) : field.type === 'checkbox' || field.type === 'boolean' ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '4px' }}>
          <input
            type="checkbox"
            checked={Boolean(rawVal)}
            onChange={(e) => onChange(e.target.checked)}
            style={{ accentColor: '#0d9488', width: '16px', height: '16px', cursor: 'pointer' }}
          />
          <span style={{ fontSize: '13px', color: '#334155' }}>{field.label}</span>
        </div>
      ) : (
        <input
          type={field.type === 'email' ? 'email' : field.type === 'number' || field.type === 'currency' ? 'number' : field.type === 'phone' ? 'tel' : 'text'}
          value={valStr}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || `Enter ${field.label}...`}
          style={baseInputStyle}
        />
      )}

      {error && (
        <span style={{ fontSize: '11px', color: '#ef4444', marginTop: '2px', fontWeight: '600' }}>
          {error}
        </span>
      )}
    </div>
  );
}
