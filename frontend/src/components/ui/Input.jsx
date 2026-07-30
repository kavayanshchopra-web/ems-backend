import React from 'react';

/**
 * Global Design System v2.0 - Input Primitive
 */
export default function Input({
  label,
  helperText,
  error,
  required = false,
  leadingIcon = null,
  trailingIcon = null,
  type = 'text',
  placeholder = '',
  value,
  onChange,
  disabled = false,
  readOnly = false,
  style = {},
  inputStyle = {},
  className = '',
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
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
        {leadingIcon && (
          <span style={{ position: 'absolute', left: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
            {leadingIcon}
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          style={{
            width: '100%',
            height: '38px',
            paddingLeft: leadingIcon ? '36px' : '12px',
            paddingRight: trailingIcon ? '36px' : '12px',
            fontSize: '12px',
            fontFamily: 'Inter, system-ui, sans-serif',
            color: '#0f172a',
            background: disabled ? '#f1f5f9' : '#ffffff',
            border: error ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
            borderRadius: '8px',
            outline: 'none',
            transition: 'all 0.15s ease',
            cursor: disabled ? 'not-allowed' : 'text',
            ...inputStyle
          }}
          {...props}
        />
        {trailingIcon && (
          <span style={{ position: 'absolute', right: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
            {trailingIcon}
          </span>
        )}
      </div>
      {error && <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: '600' }}>{error}</span>}
      {!error && helperText && <span style={{ fontSize: '11px', color: '#64748b' }}>{helperText}</span>}
    </div>
  );
}
