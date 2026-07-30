import React from 'react';
import PageContainer from '../ui/PageContainer';
import PageHeader from '../ui/PageHeader';
import Toolbar from '../ui/Toolbar';

/**
 * Global Design System v2.0 - KanbanPattern (CRM Drag & Drop Pipeline Pattern)
 */
export default function KanbanPattern({
  icon = '📋',
  title = 'Lead Pipeline',
  subtitle,
  badgeText,
  headerActions,
  pipelineSelector = null,
  toolbarRight = null,
  children,
  style = {},
  className = ''
}) {
  return (
    <PageContainer fullWidth style={{ padding: '20px', ...style }} className={className}>
      <PageHeader
        icon={icon}
        title={title}
        subtitle={subtitle}
        badgeText={badgeText}
        actions={headerActions}
      />

      {(pipelineSelector || toolbarRight) && (
        <Toolbar leftContent={pipelineSelector} rightContent={toolbarRight} />
      )}

      {/* Board Container with smooth horizontal drag/scroll */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          overflowX: 'auto',
          paddingBottom: '16px',
          minHeight: '600px',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {children}
      </div>
    </PageContainer>
  );
}
