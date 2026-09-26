import React from 'react';
import { Search, X } from 'lucide-react';

/**
 * Global Design System v2.0 - SearchInput Primitive
 */
export default function SearchInput({
  value,
  onChange,
  onClear,
  placeholder = 'Search records...',
  style = {},
  width = '240px',
  disabled = false,
  rightElement = null,
  ...props
}) {
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width, ...style }}>
      <Search
        size={15}
        color="#94a3b8"
        style={{
          position: 'absolute',
          left: '11px',
          pointerEvents: 'none',
          zIndex: 2,
          flexShrink: 0
        }}
      />
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          width: '100%',
          height: '36px',
          paddingLeft: '34px',
          paddingRight: rightElement ? (value ? '60px' : '36px') : (value ? '28px' : '12px'),
          fontSize: '12.5px',
          fontFamily: 'Inter, system-ui, sans-serif',
          color: '#0f172a',
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          outline: 'none',
          boxSizing: 'border-box',
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
            right: rightElement ? '38px' : '10px',
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3
          }}
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}

      {rightElement && (
        <div style={{ position: 'absolute', right: '6px', display: 'flex', alignItems: 'center', zIndex: 4 }}>
          {rightElement}
        </div>
      )}
    </div>
  );
}
