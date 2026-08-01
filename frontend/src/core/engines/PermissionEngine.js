/**
 * UNIVERSAL PERMISSION ENGINE
 * Enterprise RBAC & Capability-Based Permission Evaluator
 */

export class PermissionEngine {
  /**
   * Check if user is SuperAdmin, Owner, or Tenant Admin
   * @param {Object} user 
   * @returns {boolean}
   */
  static isAdmin(user) {
    if (!user) return false;
    const role = (user.role || '').toLowerCase();
    return role === 'superadmin' || role === 'owner' || role === 'admin';
  }

  /**
   * Check if user is Manager or Admin
   * @param {Object} user 
   * @returns {boolean}
   */
  static canManageModule(user) {
    if (!user) return false;
    const role = (user.role || '').toLowerCase();
    return role === 'superadmin' || role === 'owner' || role === 'admin' || role === 'manager';
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
    return this.canManageModule(user);
  }

  /**
   * Evaluate if user can edit existing records in module
   * @param {Object} user 
   * @param {Object} moduleConfig 
   * @returns {boolean}
   */
  static canEdit(user, moduleConfig) {
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

    if (action === 'create') return field.showOnCreate !== false;
    if (action === 'edit') return field.showOnEdit !== false && this.canEdit(user);
    if (action === 'view') return field.showOnView !== false;

    return true;
  }
}
