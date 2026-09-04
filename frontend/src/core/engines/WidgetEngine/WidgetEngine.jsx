/**
 * UNIVERSAL WIDGET ENGINE STRIP COMPONENT
 * 100% Schema-Driven KPI Summary Strip for any EMS Module
 * Responsive Flex Layout with Horizontal Scroll for Dynamic Custom Stage Cards
 */

import React from 'react';
import KPIWidget from './KPIWidget';
import { SummaryEngine } from '../SummaryEngine';

export default function WidgetEngine({
  moduleConfig = {},
  records = [],
  activePipelineStages = []
}) {
  const rawWidgets = moduleConfig.summaryWidgets || moduleConfig.defaultSummaryWidgets || [];
  const enabledWidgets = (Array.isArray(rawWidgets) ? rawWidgets : [])
    .filter(w => w.enabled !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  if (enabledWidgets.length === 0) return null;

  return (
    <div
      className="widget-engine-outer-wrapper"
      style={{
        width: '100%',
        overflowX: 'auto',
        overflowY: 'hidden',
        paddingBottom: '4px',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      <div
        className="widget-engine-strip"
        style={{
          display: 'flex',
          gap: '12px',
          width: 'max-content',
          minWidth: '100%',
          boxSizing: 'border-box'
        }}
      >
        {enabledWidgets.map(widget => {
          const value = SummaryEngine.computeWidgetValue(widget, records, activePipelineStages);
          return (
            <div key={widget.id} style={{ minWidth: '200px', flex: '1 0 200px' }}>
              <KPIWidget
                widget={widget}
                value={value}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
