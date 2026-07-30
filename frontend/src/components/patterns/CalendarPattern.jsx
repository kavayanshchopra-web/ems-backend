import React from 'react';
import PageContainer from '../ui/PageContainer';
import PageHeader from '../ui/PageHeader';
import Toolbar from '../ui/Toolbar';

/**
 * Global Design System v2.0 - CalendarPattern (Holiday Calendar & Shift Rostering Pattern)
 */
export default function CalendarPattern({
  icon = '📅',
  title = 'Holiday Calendar & Rostering',
  subtitle,
  badgeText,
  headerActions,
  viewControls = null,
  calendarGrid,
  sideEventsPanel = null,
  style = {},
  className = ''
}) {
  return (
    <PageContainer maxWidth="1600px" style={style} className={className}>
      <PageHeader
        icon={icon}
        title={title}
        subtitle={subtitle}
        badgeText={badgeText}
        actions={headerActions}
      />

      {viewControls && <Toolbar leftContent={viewControls} />}

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Main Calendar Month/Week Grid Container */}
        <div style={{ flex: 1, minWidth: '320px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          {calendarGrid}
        </div>

        {/* Side Upcoming Events & Shifts Drawer Panel */}
        {sideEventsPanel && (
          <div style={{ width: '320px', flexShrink: 0, background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            {sideEventsPanel}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
