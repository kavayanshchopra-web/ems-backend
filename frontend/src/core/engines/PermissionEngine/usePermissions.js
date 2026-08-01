/**
 * UNIVERSAL PERMISSIONS HOOK
 * React Hook exposing RBAC permission flags and evaluators
 */

import { useMemo } from 'react';
import { PermissionEngine } from '../PermissionEngine';

export function usePermissions(user = null, moduleConfig = {}) {
  return useMemo(() => {
    const canView = PermissionEngine.canView(user, moduleConfig);
    const canCreate = PermissionEngine.canCreate(user, moduleConfig);
    const canEdit = PermissionEngine.canEdit(user, moduleConfig);
    const canDelete = PermissionEngine.canDelete(user, moduleConfig);
    const canConfig = PermissionEngine.canConfig(user, moduleConfig);
    const canManage = PermissionEngine.canManageModule(user);

    return {
      canView,
      canCreate,
      canEdit,
      canDelete,
      canConfig,
      canManage,
      canAccessField: (field, action) => PermissionEngine.canAccessField(user, field, action)
    };
  }, [user, moduleConfig]);
}
