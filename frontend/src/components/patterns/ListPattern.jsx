import React from 'react';
import PageContainer from '../ui/PageContainer';
import PageHeader from '../ui/PageHeader';
import Toolbar from '../ui/Toolbar';

/**
 * Global Design System v2.0 - ListPattern (Data & Table List Pattern)
 */
export default function ListPattern({
  icon = '📁',
  title,
  subtitle,
  badgeText,
  headerActions,
  statsGrid = null,
  filterTabs = null,
  toolbarLeft = null,
  toolbarRight = null,
  tableCardTitle,
  tableSubtitle,
  children,
  tableFooter = null,
  style = {},
  className = ''
}) {
  const leftContent = toolbarLeft || filterTabs;

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

      {(leftContent || toolbarRight) && (
        <Toolbar leftContent={leftContent} rightContent={toolbarRight} />
      )}

      <div className="payroll-table-card" style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        {tableCardTitle && (
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <h3 className="payroll-table-title" style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{tableCardTitle}</h3>
            {tableSubtitle && (
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
                {tableSubtitle}
              </span>
            )}
          </div>
        )}

        {children}

        {tableFooter}
      </div>
    </PageContainer>
  );
}
