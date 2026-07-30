import React from 'react';
import PageContainer from '../ui/PageContainer';
import PageHeader from '../ui/PageHeader';

/**
 * Global Design System v2.0 - DetailPattern (Employee/Lead Profile Inspector Pattern)
 */
export default function DetailPattern({
  icon = '👤',
  title,
  subtitle,
  badgeText,
  headerActions,
  profileBanner = null,
  tabs = null,
  children,
  style = {},
  className = ''
}) {
  return (
    <PageContainer maxWidth="1400px" style={style} className={className}>
      <PageHeader
        icon={icon}
        title={title}
        subtitle={subtitle}
        badgeText={badgeText}
        actions={headerActions}
      />
      {profileBanner}
      {tabs && <div style={{ marginBottom: '20px' }}>{tabs}</div>}
      <div>{children}</div>
    </PageContainer>
  );
}
