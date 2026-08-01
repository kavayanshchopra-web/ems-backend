/**
 * UNIVERSAL PERMISSION GUARD COMPONENT
 * Conditional Component Wrapper Driven by RBAC Evaluation
 */

import React from 'react';
import { PermissionEngine } from '../PermissionEngine';

export default function PermissionGuard({
  user = null,
  moduleConfig = {},
  action = 'view', // 'view' | 'create' | 'edit' | 'delete' | 'config'
  children,
  fallback = null
}) {
  let isAllowed = false;

  switch (action) {
    case 'create':
      isAllowed = PermissionEngine.canCreate(user, moduleConfig);
      break;
    case 'edit':
      isAllowed = PermissionEngine.canEdit(user, moduleConfig);
      break;
    case 'delete':
    case 'archive':
      isAllowed = PermissionEngine.canDelete(user, moduleConfig);
      break;
    case 'config':
      isAllowed = PermissionEngine.canConfig(user, moduleConfig);
      break;
    case 'view':
    default:
      isAllowed = PermissionEngine.canView(user, moduleConfig);
      break;
  }

  if (!isAllowed) {
    return fallback;
  }

  return <>{children}</>;
}
