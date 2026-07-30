import React from 'react';
import PageContainer from '../ui/PageContainer';
import PageHeader from '../ui/PageHeader';
import Toolbar from '../ui/Toolbar';

/**
 * Global Design System v2.0 - MapPattern (GPS Live Tracking & Leaflet Route Playback Pattern)
 */
export default function MapPattern({
  icon = '🗺️',
  title = 'Live GPS Attendance & Geofencing',
  subtitle,
  badgeText,
  headerActions,
  mapControls = null,
  mapContainer,
  sideInspector = null,
  style = {},
  className = ''
}) {
  return (
    <PageContainer fullWidth style={{ padding: '16px', ...style }} className={className}>
      <PageHeader
        icon={icon}
        title={title}
        subtitle={subtitle}
        badgeText={badgeText}
        actions={headerActions}
      />

      {mapControls && <Toolbar leftContent={mapControls} />}

      <div style={{ display: 'flex', gap: '16px', height: 'calc(100vh - 200px)', minHeight: '500px', width: '100%', overflow: 'hidden' }}>
        {/* Main Leaflet Map View Container */}
        <div style={{ flex: 1, height: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
          {mapContainer}
        </div>

        {/* Side Field Worker Inspector Panel */}
        {sideInspector && (
          <div style={{ width: '340px', flexShrink: 0, height: '100%', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#ffffff', overflowY: 'auto', padding: '16px' }}>
            {sideInspector}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
