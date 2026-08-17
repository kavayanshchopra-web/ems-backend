import React from 'react';

/**
 * Global Design System v2.0 - Select Primitive
 */
export default function Select({
  label,
  helperText,
  error,
  required = false,
  options = [],
  value,
  onChange,
  disabled = false,
  style = {},
  selectStyle = {},
  className = '',
  children,
  ...props
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', ...style }} className={className}>
      {label && (
        <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>{label}</span>
          {required && <span style={{ color: '#ef4444' }}>*</span>}
        </label>
      )}
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        style={{
          width: '100%',
          height: '38px',
          padding: '0 12px',
          fontSize: '12px',
          fontFamily: 'Inter, system-ui, sans-serif',
          fontWeight: '600',
          color: '#0f172a',
          background: disabled ? '#f1f5f9' : '#ffffff',
          border: error ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
          borderRadius: '8px',
          outline: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s ease',
          ...selectStyle
        }}
        {...props}
      >
        {children || options.map((opt) => (
          <option key={opt.value || opt} value={opt.value || opt}>
            {opt.label || opt}
          </option>
        ))}
      </select>
      {error && <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: '600' }}>{error}</span>}
      {!error && helperText && <span style={{ fontSize: '11px', color: '#64748b' }}>{helperText}</span>}
    </div>
  );
}
