/**
 * UNIVERSAL VIEW SWITCHER COMPONENT
 * Renders view mode toggle buttons for all enabled views in moduleConfig
 */

import React from 'react';
import { viewRegistry } from './ViewRegistry';

export default function ViewSwitcher({
  availableViews = ['list'],
  activeView = 'list',
  onViewChange = () => {}
}) {
  if (!Array.isArray(availableViews) || availableViews.length === 0) {
    return null;
  }

  const allRegisteredMap = new Map(viewRegistry.getAllViews().map(v => [v.key, v]));

  const enabledViewDefs = availableViews.map(key => {
    return allRegisteredMap.get(key) || {
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      icon: null,
      order: 99
    };
  }).sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <div
      className="view-switcher-container"
      style={{
        display: 'flex',
        background: '#f1f5f9',
        padding: '2px',
        borderRadius: '8px',
        border: '1px solid #cbd5e1'
      }}
    >
      {enabledViewDefs.map(v => {
        const IconComponent = v.icon;
        const isActive = activeView === v.key;

        return (
          <button
            key={v.key}
            type="button"
            onClick={() => onViewChange(v.key)}
            style={{
              padding: '3px 8px',
              height: '26px',
              fontSize: '11px',
              fontWeight: '700',
              borderRadius: '5px',
              border: 'none',
              background: isActive ? '#ffffff' : 'transparent',
              color: isActive ? '#0d9488' : '#64748b',
              boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {IconComponent && <IconComponent size={12} />}
            {v.label}
          </button>
        );
      })}
    </div>
  );
}
