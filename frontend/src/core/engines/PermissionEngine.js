/**
 * UNIVERSAL PERMISSION ENGINE
 * Enterprise RBAC & Capability-Based Permission Evaluator
 */

/**
 * Helper to resolve role string safely from user object
 * @param {Object} user 
 * @returns {string}
 */
export function getUserRole(user) {
  if (!user) return '';
  const rawRole = user.role || user.user_role || user.user?.role || user.type || user.designation || '';
  return String(rawRole).toLowerCase().trim();
}

export class PermissionEngine {
  /**
   * Helper to resolve role string safely from user object
   * @param {Object} user 
   * @returns {string}
   */
  static getRole(user) {
    return getUserRole(user);
  }

  /**
   * Check if user is SuperAdmin, Owner, or Tenant Admin
   * @param {Object} user 
   * @returns {boolean}
   */
  static isAdmin(user) {
    const role = getUserRole(user);
    return role === 'superadmin' || role === 'owner' || role === 'admin';
  }

  /**
   * Check if user is Manager, HR, or Admin
   * @param {Object} user 
   * @returns {boolean}
   */
  static canManageModule(user) {
    const role = getUserRole(user);
    return role === 'superadmin' || role === 'owner' || role === 'admin' || role === 'manager' || role === 'hr';
  }

  /**
   * Universal permission evaluator used by LayoutEngine, LayoutToolbar, and ViewEngine
   * @param {Object} user 
   * @param {string|Object} moduleIdOrConfig 
   * @param {'view'|'create'|'edit'|'delete'|'configure'|'export'|'import'|'manage'} action 
   * @returns {boolean}
   */
  static can(user, moduleIdOrConfig, action = 'view') {
    if (!user) return false;
    const role = getUserRole(user);
    const modId = typeof moduleIdOrConfig === 'string' ? moduleIdOrConfig : (moduleIdOrConfig?.moduleId || '');

    // Allow employee / agent / staff roles to view, create, and edit tasks and expense claims
    if ((modId === 'tasks' || modId === 'tasks_board' || modId === 'expenses' || modId === 'expense_claims') && (action === 'view' || action === 'create' || action === 'edit')) {
      return true;
    }

    // Explicitly restrict employee / agent / staff roles from any management or write actions for other modules
    if (role === 'employee' || role === 'agent' || role === 'staff') {
      if (action === 'view') return true;
      return false;
    }

    // Superadmin, Owner, Admin have master access across all modules
    if (role === 'superadmin' || role === 'owner' || role === 'admin') return true;

    // View action is allowed for all authenticated users (including employees and agents)
    if (action === 'view') return true;

    // Create, Edit, Delete, Configure, Manage, Import, Export are restricted to Admin/Owner/Manager/HR
    if (action === 'create' || action === 'edit' || action === 'delete' || action === 'configure' || action === 'manage' || action === 'import' || action === 'export') {
      return role === 'manager' || role === 'hr' || role === 'admin' || role === 'owner' || role === 'superadmin';
    }

    return false;
  }

  /**
   * Evaluate if user can view module records
   * @param {Object} user 
   * @param {Object} moduleConfig 
   * @returns {boolean}
   */
  static canView(user, moduleConfig) {
    if (!user) return false;
    return true; // All authenticated tenant users can view records by default
  }

  /**
   * Evaluate if user can create new records in module
   * @param {Object} user 
   * @param {Object} moduleConfig 
   * @returns {boolean}
   */
  static canCreate(user, moduleConfig) {
    const modId = typeof moduleConfig === 'string' ? moduleConfig : (moduleConfig?.moduleId || '');
    if (modId === 'tasks' || modId === 'tasks_board' || modId === 'expenses' || modId === 'expense_claims' || modId === 'advances_loans') return true;
    return this.canManageModule(user);
  }

  /**
   * Evaluate if user can edit existing records in module
   * @param {Object} user 
   * @param {Object} moduleConfig 
   * @returns {boolean}
   */
  static canEdit(user, moduleConfig) {
    const modId = typeof moduleConfig === 'string' ? moduleConfig : (moduleConfig?.moduleId || '');
    if (modId === 'tasks' || modId === 'tasks_board' || modId === 'expenses' || modId === 'expense_claims' || modId === 'advances_loans') return true;
    return this.canManageModule(user);
  }

  /**
   * Evaluate if user can archive / soft-delete records in module
   * @param {Object} user 
   * @param {Object} moduleConfig 
   * @returns {boolean}
   */
  static canDelete(user, moduleConfig) {
    return this.canManageModule(user);
  }

  /**
   * Evaluate if user can configure module fields, views, columns
   * @param {Object} user 
   * @param {Object} moduleConfig 
   * @returns {boolean}
   */
  static canConfig(user, moduleConfig) {
    return this.isAdmin(user);
  }

  /**
   * Check if user can access a specific field for an action
   * @param {Object} user 
   * @param {Object} field 
   * @param {'view'|'create'|'edit'} action 
   * @returns {boolean}
   */
  static canAccessField(user, field, action = 'view') {
    if (!field || field.hidden) return false;

    if (action === 'create') return field.showOnCreate !== false && this.canCreate(user);
    if (action === 'edit') return field.showOnEdit !== false && this.canEdit(user);
    if (action === 'view') return field.showOnView !== false;

    return true;
  }
}
