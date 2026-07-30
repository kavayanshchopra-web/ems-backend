import React from 'react';
import PageContainer from '../ui/PageContainer';
import PageHeader from '../ui/PageHeader';
import Toolbar from '../ui/Toolbar';

/**
 * Global Design System v2.0 - ReportPattern (Analytics & Financial Ledger Pattern)
 */
export default function ReportPattern({
  icon = '📈',
  title = 'Analytics & Reports',
  subtitle,
  badgeText,
  headerActions,
  filterControls = null,
  exportActions = null,
  kpiSummary = null,
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

      {(filterControls || exportActions) && (
        <Toolbar leftContent={filterControls} rightContent={exportActions} />
      )}

      {kpiSummary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {kpiSummary}
        </div>
      )}

      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        {children}
      </div>
    </PageContainer>
  );
}
