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
    <div className="search-input-primitive" style={{ position: 'relative', display: 'flex', alignItems: 'center', width, ...style }}>
      <Search
        size={16}
        color="#64748b"
        style={{
          position: 'absolute',
          left: '12px',
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
          height: '38px',
          paddingLeft: '38px',
          paddingRight: rightElement ? (value ? '64px' : '40px') : (value ? '32px' : '12px'),
          fontSize: '13px',
          fontFamily: 'Inter, system-ui, sans-serif',
          color: '#0f172a',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
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
            right: rightElement ? '40px' : '10px',
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
