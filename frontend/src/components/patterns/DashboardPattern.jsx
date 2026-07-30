import React from 'react';
import PageContainer from '../ui/PageContainer';
import PageHeader from '../ui/PageHeader';

/**
 * Global Design System v2.0 - DashboardPattern
 */
export default function DashboardPattern({
  icon = '📊',
  title,
  subtitle,
  badgeText,
  headerActions,
  statsGrid = null,
  children,
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
      {statsGrid && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {statsGrid}
        </div>
      )}
      {children}
    </PageContainer>
  );
}
