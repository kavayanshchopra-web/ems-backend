/**
 * UNIVERSAL WIDGET ENGINE STRIP COMPONENT
 * 100% Schema-Driven KPI Summary Strip for any EMS Module
 */

import React from 'react';
import KPIWidget from './KPIWidget';
import { SummaryEngine } from '../SummaryEngine';

export default function WidgetEngine({
  moduleConfig = {},
  records = [],
  activePipelineStages = []
}) {
  const enabledWidgets = (moduleConfig.summaryWidgets || [])
    .filter(w => w.enabled !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  if (enabledWidgets.length === 0) return null;

  return (
    <div
      className="widget-engine-strip"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px',
        width: '100%'
      }}
    >
      {enabledWidgets.map(widget => {
        const value = SummaryEngine.computeWidgetValue(widget, records, activePipelineStages);
        return (
          <KPIWidget
            key={widget.id}
            widget={widget}
            value={value}
          />
        );
      })}
    </div>
  );
}
