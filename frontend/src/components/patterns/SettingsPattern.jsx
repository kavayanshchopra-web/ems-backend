import React from 'react';
import PageContainer from '../ui/PageContainer';
import PageHeader from '../ui/PageHeader';

/**
 * Global Design System v2.0 - SettingsPattern (Master Settings & Dropdown Engine Pattern)
 */
export default function SettingsPattern({
  icon = '⚙️',
  title = 'System Configuration',
  subtitle = 'Manage application rules, dropdown options, and parameters',
  categoryNav,
  children,
  style = {},
  className = ''
}) {
  return (
    <PageContainer maxWidth="1600px" style={style} className={className}>
      <PageHeader icon={icon} title={title} subtitle={subtitle} />

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Settings Navigation Sidebar */}
        <div style={{ width: '280px', flexShrink: 0, background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          {categoryNav}
        </div>

        {/* Main Settings Card Content */}
        <div style={{ flex: 1, minWidth: '300px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          {children}
        </div>
      </div>
    </PageContainer>
  );
}
