/**
 * UNIVERSAL SCHEMA FIELD RENDERER
 * 100% Schema-Driven UI Renderer for All 23 Enterprise Field Types
 */

import React from 'react';
import { Star, Link as LinkIcon, FileText, CheckCircle2 } from 'lucide-react';

const getValString = (val, fallback = '') => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string' || typeof val === 'number') return String(val);
  if (typeof val === 'object') {
    if (typeof val.name === 'string') return val.name;
    if (typeof val.title === 'string') return val.title;
    if (typeof val.label === 'string') return val.label;
    if (typeof val.value === 'string') return val.value;
    if (Array.isArray(val)) return val.map(getValString).join(', ');
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
  moduleConfig = null,
  systemDropdowns = null,
  activePipelineStages = [],
  allPositions = [],
  readOnly = false,
  theme = {}
}) {
  if (!field || field.hidden || field.archived || field.deleted) return null;

  const isViewMode = mode === 'view' || readOnly || field.readOnly;
  const rawVal = value !== undefined && value !== null ? value : (field.defaultValue !== undefined ? field.defaultValue : '');
  const valStr = getValString(rawVal);

  // Resolution of Option List for Dropdowns & Selects (Prioritizes moduleConfig.lookupData)
  const lookupKey = field.optionsSource || field.key || field.id;
  let optionsList = [];

  if (moduleConfig?.lookupData && Array.isArray(moduleConfig.lookupData[lookupKey]) && moduleConfig.lookupData[lookupKey].length > 0) {
    optionsList = moduleConfig.lookupData[lookupKey].map(getValString);
  } else if (Array.isArray(field.options) && field.options.length > 0) {
    optionsList = field.options.map(getValString);
  } else if (Array.isArray(field.manualOptions) && field.manualOptions.length > 0) {
    optionsList = field.manualOptions.map(getValString);
  }

  if (optionsList.length === 0) {
    if (field.optionsSource === 'departments') optionsList = (systemDropdowns?.departments || []).map(getValString);
    if (field.optionsSource === 'designations') optionsList = (systemDropdowns?.designations || []).map(getValString);
    if (field.optionsSource === 'ats_stages') optionsList = activePipelineStages.map(s => getValString(s.name));
    if (field.optionsSource === 'employment_types') optionsList = ['Full-time', 'Part-time', 'Contract', 'Internship'];
    if (field.optionsSource === 'positions') optionsList = allPositions;
  }

  // ----------------------------------------------------
  // READ-ONLY / VIEW MODE RENDERER (ALL TYPES)
  // ----------------------------------------------------
  if (isViewMode) {
    let displayVal = valStr || '—';

    if (field.type === 'checkbox' || field.type === 'boolean' || field.type === 'toggle') {
      displayVal = Boolean(rawVal) ? 'Yes' : 'No';
    } else if (field.type === 'currency') {
      displayVal = valStr ? `$${Number(valStr).toLocaleString()}` : '—';
    } else if (field.type === 'rating') {
      const ratingNum = parseInt(valStr, 10) || 0;
      displayVal = '★'.repeat(ratingNum) + '☆'.repeat(Math.max(0, 5 - ratingNum));
    } else if (field.type === 'date' || field.type === 'datetime' || field.id === 'createdAt' || field.id === 'appliedDate') {
      displayVal = valStr ? formatDate(valStr) : '—';
    } else if (field.type === 'color' && valStr) {
      displayVal = (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '14px', height: '14px', borderRadius: '4px', background: valStr, border: '1px solid #cbd5e1' }} />
          {valStr}
        </span>
      );
    } else if (field.type === 'url' && valStr) {
      displayVal = (
        <a href={valStr.startsWith('http') ? valStr : `https://${valStr}`} target="_blank" rel="noreferrer" style={{ color: '#0d9488', textDecoration: 'underline' }}>
          {valStr}
        </a>
      );
    } else if (field.type === 'image' && valStr) {
      displayVal = (
        <img src={valStr} alt={field.label} style={{ maxWidth: '100px', maxHeight: '100px', borderRadius: '6px', border: '1px solid #e2e8f0', objectFit: 'cover' }} />
      );
    } else if (field.type === 'multiselect' || field.type === 'tag') {
      const tags = Array.isArray(rawVal) ? rawVal : valStr.split(',').map(s => s.trim()).filter(Boolean);
      displayVal = tags.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {tags.map((t, idx) => (
            <span key={idx} style={{ background: '#f1f5f9', color: '#334155', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>
              {t}
            </span>
          ))}
        </div>
      ) : '—';
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
  // EDIT / CREATE FORM INPUT RENDERERS (23 TYPES)
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

      {/* AUTO ID (READ-ONLY IN FORM) */}
      {field.type === 'autoid' ? (
        <input
          type="text"
          readOnly
          value={valStr || field.placeholder || 'Auto Generated'}
          style={{ ...baseInputStyle, background: '#f8fafc', fontWeight: '800', fontFamily: 'monospace', color: '#0d9488' }}
        />
      ) : /* DROPDOWN / SELECT / STATUS */
      field.type === 'dropdown' || field.type === 'select' || field.type === 'status' ? (
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
      ) : /* MULTI SELECT */
      field.type === 'multiselect' ? (
        <select
          multiple
          value={Array.isArray(rawVal) ? rawVal : valStr.split(',').map(s => s.trim()).filter(Boolean)}
          onChange={(e) => {
            const selected = Array.from(e.target.selectedOptions, option => option.value);
            onChange(selected);
          }}
          style={{ ...baseInputStyle, height: '80px', cursor: 'pointer' }}
        >
          {optionsList.map((opt, idx) => {
            const optVal = getValString(opt);
            return (
              <option key={idx} value={optVal}>
                {optVal}
              </option>
            );
          })}
        </select>
      ) : /* TEXTAREA & RICH TEXT */
      field.type === 'textarea' || field.type === 'richtext' ? (
        <textarea
          rows={field.type === 'richtext' ? 5 : 3}
          value={valStr}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || `Enter ${field.label}...`}
          style={{ ...baseInputStyle, resize: 'vertical' }}
        />
      ) : /* CHECKBOX */
      field.type === 'checkbox' ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '4px' }}>
          <input
            type="checkbox"
            checked={Boolean(rawVal)}
            onChange={(e) => onChange(e.target.checked)}
            style={{ accentColor: '#0d9488', width: '16px', height: '16px', cursor: 'pointer' }}
          />
          <span style={{ fontSize: '13px', color: '#334155' }}>{field.placeholder || field.label}</span>
        </div>
      ) : /* TOGGLE / BOOLEAN */
      field.type === 'toggle' || field.type === 'boolean' ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '4px' }}>
          <button
            type="button"
            onClick={() => onChange(!Boolean(rawVal))}
            style={{
              width: '38px',
              height: '20px',
              borderRadius: '10px',
              border: 'none',
              background: Boolean(rawVal) ? '#0d9488' : '#cbd5e1',
              position: 'relative',
              cursor: 'pointer',
              transition: 'background 0.2s ease',
              padding: 0
            }}
          >
            <span
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: '#ffffff',
                position: 'absolute',
                top: '2px',
                left: Boolean(rawVal) ? '20px' : '2px',
                transition: 'left 0.2s ease'
              }}
            />
          </button>
          <span style={{ fontSize: '12px', fontWeight: '700', color: Boolean(rawVal) ? '#0d9488' : '#64748b' }}>
            {Boolean(rawVal) ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      ) : /* RADIO */
      field.type === 'radio' ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', paddingTop: '4px' }}>
          {optionsList.map((opt, idx) => {
            const optVal = getValString(opt);
            return (
              <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name={`radio_${field.id}`}
                  value={optVal}
                  checked={valStr === optVal}
                  onChange={(e) => onChange(e.target.value)}
                  style={{ accentColor: '#0d9488', cursor: 'pointer' }}
                />
                {optVal}
              </label>
            );
          })}
        </div>
      ) : /* RATING (STAR) */
      field.type === 'rating' ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', paddingTop: '4px' }}>
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star)}
              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '2px', color: star <= (parseInt(valStr, 10) || 0) ? '#f59e0b' : '#cbd5e1' }}
            >
              <Star size={18} fill={star <= (parseInt(valStr, 10) || 0) ? '#f59e0b' : 'none'} />
            </button>
          ))}
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', marginLeft: '6px' }}>
            {valStr ? `${valStr} / 5` : 'Rate'}
          </span>
        </div>
      ) : /* COLOR PICKER */
      field.type === 'color' ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="color"
            value={valStr || '#0d9488'}
            onChange={(e) => onChange(e.target.value)}
            style={{ width: '40px', height: '36px', padding: 0, borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer' }}
          />
          <input
            type="text"
            value={valStr}
            onChange={(e) => onChange(e.target.value)}
            placeholder="#0d9488"
            style={{ ...baseInputStyle, width: '120px' }}
          />
        </div>
      ) : /* FILE & IMAGE UPLOAD */
      field.type === 'file' || field.type === 'image' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <input
            type="file"
            accept={field.type === 'image' ? 'image/*' : field.allowedExtensions ? field.allowedExtensions.split(',').map(ext => `.${ext.trim()}`).join(',') : undefined}
            onChange={(e) => {
              const file = e.target.files && e.target.files[0];
              if (file) {
                onChange(file.name);
              }
            }}
            style={{ ...baseInputStyle, padding: '6px 10px' }}
          />
          {valStr && (
            <div style={{ fontSize: '11px', color: '#0d9488', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <FileText size={12} /> Current File: {valStr}
            </div>
          )}
        </div>
      ) : /* CURRENCY INPUT */
      field.type === 'currency' ? (
        <div style={{ position: 'relative', width: '100%' }}>
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontWeight: '800', color: '#64748b', fontSize: '13px' }}>
            $
          </span>
          <input
            type="number"
            step="0.01"
            value={valStr}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || '0.00'}
            style={{ ...baseInputStyle, paddingLeft: '24px' }}
          />
        </div>
      ) : /* TAG / CHIPS */
      field.type === 'tag' ? (
        <input
          type="text"
          value={valStr}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || 'Enter tags comma-separated (e.g. React, Node, Python)'}
          style={baseInputStyle}
        />
      ) : (
        /* STANDARD INPUT (TEXT, NUMBER, PHONE, EMAIL, DATE, TIME, DATETIME, URL) */
        <input
          type={
            field.type === 'email' ? 'email' :
            field.type === 'number' ? 'number' :
            field.type === 'phone' ? 'tel' :
            field.type === 'date' ? 'date' :
            field.type === 'time' ? 'time' :
            field.type === 'datetime' ? 'datetime-local' :
            field.type === 'url' ? 'url' : 'text'
          }
          value={valStr}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || `Enter ${field.label}...`}
          style={baseInputStyle}
        />
      )}

      {field.helpText && !error && (
        <span style={{ fontSize: '10px', color: '#64748b', marginTop: '1px' }}>
          {field.helpText}
        </span>
      )}

      {error && (
        <span style={{ fontSize: '11px', color: '#ef4444', marginTop: '2px', fontWeight: '600' }}>
          {error}
        </span>
      )}
    </div>
  );
}

