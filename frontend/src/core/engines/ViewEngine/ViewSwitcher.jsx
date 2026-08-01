/**
 * UNIVERSAL VIEW SWITCHER COMPONENT
 * Renders view mode toggle buttons for all enabled views in moduleConfig
 */

import React from 'react';
import { viewRegistry } from './ViewRegistry';

export default function ViewSwitcher({
  availableViews = ['kanban', 'list'],
  activeView = 'kanban',
  onViewChange = () => {}
}) {
  if (!Array.isArray(availableViews) || availableViews.length <= 1) {
    return null; // Hide switcher if only 1 view mode enabled
  }

  const allRegistered = viewRegistry.getAllViews();
  const enabledViewDefs = allRegistered.filter(v => availableViews.includes(v.key));

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
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: '700',
              borderRadius: '6px',
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
            {IconComponent && <IconComponent size={14} />}
            {v.label}
          </button>
        );
      })}
    </div>
  );
}
