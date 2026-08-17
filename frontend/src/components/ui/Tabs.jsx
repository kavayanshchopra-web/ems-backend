import React from 'react';

/**
 * Global Design System v2.0 - Tabs Primitive
 * Touch-swipeable horizontal category filter pills
 */
export default function Tabs({
  tabs = [],
  activeTab,
  onTabChange,
  style = {},
  className = ''
}) {
  return (
    <div
      className={`app-tabs-wrap ${className}`}
      style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        paddingBottom: '4px',
        maxWidth: '100%',
        ...style
      }}
    >
      {tabs.map((tab) => {
        const key = typeof tab === 'object' ? tab.id || tab.key || tab.value : tab;
        const label = typeof tab === 'object' ? tab.label || tab.name : tab;
        const icon = typeof tab === 'object' ? tab.icon : null;
        const count = typeof tab === 'object' ? tab.count : null;
        const isSelected = activeTab === key;

        return (
          <button
            key={key}
            type="button"
            style={{
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: isSelected ? '800' : '600',
              borderRadius: '8px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transition: 'all 0.15s ease',
              border: isSelected ? 'none' : '1px solid #cbd5e1',
              background: isSelected ? 'linear-gradient(135deg, #0d9488 0%, #064e43 100%)' : '#ffffff',
              color: isSelected ? '#ffffff' : '#334155',
              boxShadow: isSelected ? '0 2px 8px rgba(13, 148, 136, 0.3)' : 'none'
            }}
            onClick={() => onTabChange(key)}
          >
            {icon && <span style={{ marginRight: '6px' }}>{icon}</span>}
            <span>{label}</span>
            {count !== null && count !== undefined && (
              <span
                style={{
                  marginLeft: '6px',
                  fontSize: '10px',
                  fontWeight: '800',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  background: isSelected ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                  color: isSelected ? '#ffffff' : '#64748b'
                }}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
