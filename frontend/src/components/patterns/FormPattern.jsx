import React from 'react';
import PageContainer from '../ui/PageContainer';
import PageHeader from '../ui/PageHeader';

/**
 * Global Design System v2.0 - FormPattern
 */
export default function FormPattern({
  icon = '📝',
  title,
  subtitle,
  children,
  actionFooter = null,
  style = {},
  className = ''
}) {
  return (
    <PageContainer maxWidth="1000px" style={style} className={className}>
      <PageHeader icon={icon} title={title} subtitle={subtitle} />
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        {children}
        {actionFooter && (
          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            {actionFooter}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
