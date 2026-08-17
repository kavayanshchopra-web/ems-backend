import React from 'react';

/**
 * Global Design System v2.0 - SearchInput Primitive
 */
export default function SearchInput({
  value,
  onChange,
  onClear,
  placeholder = '🔍 Search records...',
  style = {},
  width = '240px',
  disabled = false,
  rightElement = null,
  ...props
}) {
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width, ...style }}>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          width: '100%',
          height: '30px',
          paddingLeft: '10px',
          paddingRight: rightElement ? (value ? '56px' : '34px') : (value ? '26px' : '10px'),
          fontSize: '11.5px',
          fontFamily: 'Inter, system-ui, sans-serif',
          color: '#0f172a',
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '6px',
          outline: 'none',
          transition: 'all 0.15s ease'
        }}
        {...props}
      />
      {value && onClear && (
        <button
          type="button"
          onClick={onClear}
          style={{
            position: 'absolute',
            right: rightElement ? '40px' : '8px',
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            fontSize: '14px',
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          aria-label="Clear search"
        >
          ✕
        </button>
      )}

      {rightElement && (
        <div style={{ position: 'absolute', right: '5px', display: 'flex', alignItems: 'center' }}>
          {rightElement}
        </div>
      )}
    </div>
  );
}
