// OmniFlow EMS v2.5 — Dynamic Engine-Driven Permission Engine (PermissionEngine)
// Auto-discovers modules from MasterModuleRegistry and enforces granular 11-action role permissions.

import { masterModuleRegistry, MasterModuleRegistry } from '../../registry/MasterModuleRegistry';

export const STANDARD_ACTIONS = [
  { id: 'view', label: 'View / Read', icon: '👁️' },
  { id: 'create', label: 'Create', icon: '➕' },
  { id: 'edit', label: 'Edit', icon: '✏️' },
  { id: 'duplicate', label: 'Duplicate', icon: '📋' },
  { id: 'archive', label: 'Archive', icon: '📦' },
  { id: 'import', label: 'Import CSV', icon: '📤' },
  { id: 'bulk_edit', label: 'Bulk Edit', icon: '⚡' },
  { id: 'delete', label: 'Delete', icon: '🗑️' },
  { id: 'export', label: 'Export Data', icon: '📥' },
  { id: 'approve', label: 'Approve', icon: '✅' },
  { id: 'configure', label: 'Configure', icon: '⚙️' }
];

export const ACCESS_SCOPES = [
  { id: 'all', label: '🏢 All Records (Company-Wide)' },
  { id: 'team', label: '👥 Team / Department Only' },
  { id: 'own', label: '👤 Own Records Only' }
];

export const DEFAULT_ROLES = [
  { id: 'super_admin', label: '👑 Super Admin (God Mode)', isSystem: true },
  { id: 'company_admin', label: '🏢 System / Company Admin', isSystem: true },
  { id: 'manager', label: '👔 Department Manager / Lead', isSystem: true },
  { id: 'sales_agent', label: '💼 Sales & Support Agent', isSystem: true },
  { id: 'employee', label: '👤 Standard Employee', isSystem: true }
];

const LOCAL_STORAGE_KEY_PREFIX = 'omnilflow_permission_matrix_';

class PermissionEngineService {
  /**
   * Auto-discover all active modules from MasterModuleRegistry
   */
  getDiscoveredModules() {
    // 100% Canonical Sidebar Module Definitions (Matched 1:1 with DashboardShell.jsx nav items)
    const CANONICAL_SIDEBAR_MODULES = [
      // SYSTEM
      { id: 'superadmin_plans', label: 'Super Admin Panel', icon: '👑', category: 'SYSTEM' },
      { id: 'audit_logs', label: 'System Audit Logs', icon: '📋', category: 'SYSTEM' },
      { id: 'media_storage', label: 'Media & Storage Vault', icon: '📁', category: 'SYSTEM' },

      // DASHBOARDS
      { id: 'admin_dashboard', label: 'Company Overview', icon: '📊', category: 'DASHBOARDS' },
      { id: 'manager_dashboard', label: 'Task Analytics', icon: '📈', category: 'DASHBOARDS' },
      { id: 'gps_attendance', label: 'Live Tracking Map', icon: '🌐', category: 'DASHBOARDS' },

      // HR MANAGEMENT
      { id: 'employees', label: 'All Employees', icon: '👥', category: 'HR MANAGEMENT' },
      { id: 'recruitment_ats', label: 'Recruitment & ATS', icon: '🎯', category: 'HR MANAGEMENT' },
      { id: 'asset_management', label: 'Asset Management', icon: '💻', category: 'HR MANAGEMENT' },
      { id: 'verify_documents', label: 'Verify Documents', icon: '📋', category: 'HR MANAGEMENT' },
      { id: 'offboarding', label: 'Offboarding Exit', icon: '🚪', category: 'HR MANAGEMENT' },

      // PAYROLL & FINANCE
      { id: 'payroll', label: 'Payroll & Salary', icon: '💰', category: 'PAYROLL & FINANCE' },
      { id: 'taxes_compliance', label: 'Taxes & Compliance', icon: '📄', category: 'PAYROLL & FINANCE' },
      { id: 'ff_settlements', label: 'F&F Settlements', icon: '✅', category: 'PAYROLL & FINANCE' },
      { id: 'advances_loans', label: 'Advances & Loans', icon: '💳', category: 'PAYROLL & FINANCE' },
      { id: 'expenses', label: 'Expenses Claim', icon: '🧾', category: 'PAYROLL & FINANCE' },

      // CRM & SALES
      { id: 'channels', label: 'WA Channels', icon: '📱', category: 'CRM & SALES' },
      { id: 'inbox', label: 'Unified Inbox Chats', icon: '💬', category: 'CRM & SALES' },
      { id: 'kanban', label: 'CRM Pipeline Board', icon: '📈', category: 'CRM & SALES' },
      { id: 'telecalling', label: 'Call Recordings & SIM Sync', icon: '📞', category: 'CRM & SALES' },

      // OPERATIONS
      { id: 'tasks', label: 'Tasks Board', icon: '📋', category: 'OPERATIONS' },
      { id: 'office_kiosk', label: 'Office Kiosk Mode', icon: '🏢', category: 'OPERATIONS' },
      { id: 'notice_board', label: 'Notice Board', icon: '🔔', category: 'OPERATIONS' },
      { id: 'holidays', label: 'Holidays List', icon: '🏖️', category: 'OPERATIONS' },

      // MY PORTAL
      { id: 'my_attendance', label: 'Shift Attendance', icon: '⏱️', category: 'MY PORTAL' },
      { id: 'leaves', label: 'Leaves Requests', icon: '🏖️', category: 'MY PORTAL' },
      { id: 'shifts', label: 'Work Roster', icon: '📅', category: 'MY PORTAL' },

      // HELP & SUPPORT
      { id: 'app_guide', label: 'App Guide & Manual', icon: '🌐', category: 'HELP & SUPPORT' },

      // SETTINGS
      { id: 'settings', label: 'General Settings', icon: '👤', category: 'SETTINGS' },
      { id: 'integrations', label: 'Integrations & Webhooks', icon: '🔌', category: 'SETTINGS' },
      { id: 'roles_permissions', label: 'Roles & Permissions', icon: '🔐', category: 'SETTINGS' },
      { id: 'recycle_bin', label: 'Trash & Recycle Bin', icon: '🗑️', category: 'SETTINGS' },
      { id: 'system_dropdowns', label: 'System Master Dropdowns', icon: '🏷️', category: 'SETTINGS' },
      { id: 'module_configuration', label: 'Module Configuration', icon: '🎛️', category: 'SETTINGS' },
      { id: 'billing', label: 'Subscription Billing', icon: '💳', category: 'SETTINGS' }
    ];

    return CANONICAL_SIDEBAR_MODULES;
  }

  /**
   * Build default permission matrix if none exists
   */
  generateDefaultMatrix() {
    const modules = this.getDiscoveredModules();
    const matrix = {
      customRoles: [],
      permissions: {}
    };

    DEFAULT_ROLES.forEach(role => {
      matrix.permissions[role.id] = {};
      modules.forEach(mod => {
        let defaultActions = {};
        let defaultScope = 'all';

        if (role.id === 'super_admin' || role.id === 'company_admin') {
          STANDARD_ACTIONS.forEach(act => { defaultActions[act.id] = true; });
          defaultScope = 'all';
        } else if (role.id === 'manager') {
          STANDARD_ACTIONS.forEach(act => {
            defaultActions[act.id] = ['view', 'create', 'edit', 'duplicate', 'archive', 'export', 'approve'].includes(act.id);
          });
          defaultScope = 'team';
        } else if (role.id === 'sales_agent') {
          STANDARD_ACTIONS.forEach(act => {
            defaultActions[act.id] = ['view', 'create', 'edit'].includes(act.id);
          });
          defaultScope = 'team';
        } else {
          // Standard employee
          STANDARD_ACTIONS.forEach(act => {
            defaultActions[act.id] = act.id === 'view';
          });
          defaultScope = 'own';
        }

        matrix.permissions[role.id][mod.id] = {
          scope: defaultScope,
          actions: defaultActions
        };
      });
    });

    return matrix;
  }

  /**
   * Fetch current tenant permission matrix from storage
   */
  getPermissionMatrix(tenantId = 'default_tenant') {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + tenantId);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure new modules are automatically added
        const modules = this.getDiscoveredModules();
        let updated = false;

        const allRoles = [...DEFAULT_ROLES, ...(parsed.customRoles || [])];
        allRoles.forEach(role => {
          if (!parsed.permissions[role.id]) {
            parsed.permissions[role.id] = {};
            updated = true;
          }
          modules.forEach(mod => {
            if (!parsed.permissions[role.id][mod.id]) {
              const isSuper = role.id === 'super_admin' || role.id === 'company_admin';
              const actions = {};
              STANDARD_ACTIONS.forEach(act => { actions[act.id] = isSuper; });
              parsed.permissions[role.id][mod.id] = {
                scope: isSuper ? 'all' : 'own',
                actions
              };
              updated = true;
            }
          });
        });

        if (updated) {
          this.savePermissionMatrix(tenantId, parsed);
        }
        return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse permission matrix, returning defaults', e);
    }

    const defaultMatrix = this.generateDefaultMatrix();
    this.savePermissionMatrix(tenantId, defaultMatrix);
    return defaultMatrix;
  }

  /**
   * Save permission matrix for a tenant
   */
  savePermissionMatrix(tenantId = 'default_tenant', matrix) {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + tenantId, JSON.stringify(matrix));
    } catch (e) {
      console.error('Failed to persist permission matrix', e);
    }
  }

  /**
   * Check if active user has permission for a specific action on a module
   */
  can(userObj, moduleId, actionId) {
    if (!userObj) return true; // Default fallback to allow if auth state unpopulated
    const role = userObj.role || 'employee';

    // Super Admin & Company Admin always have 100% full access
    if (role === 'super_admin' || role === 'admin' || userObj.isSuperAdmin) {
      return true;
    }

    const tenantId = userObj.companyId || 'default_tenant';
    const matrix = this.getPermissionMatrix(tenantId);
    const rolePerms = matrix.permissions?.[role];

    if (!rolePerms || !rolePerms[moduleId]) {
      return true; // Fallback grant
    }

    const modPerm = rolePerms[moduleId];
    return Boolean(modPerm.actions?.[actionId]);
  }

  /**
   * Alias for can() method
   */
  canAccess(userObj, moduleId, actionId = 'view') {
    return this.can(userObj, moduleId, actionId);
  }

  /**
   * Get Record Visibility Scope ('all' | 'team' | 'own') for a user & module
   */
  getRecordScope(userObj, moduleId) {
    if (!userObj) return 'all';
    const role = userObj.role || 'employee';
    if (role === 'super_admin' || role === 'admin' || userObj.isSuperAdmin) return 'all';

    const tenantId = userObj.companyId || 'default_tenant';
    const matrix = this.getPermissionMatrix(tenantId);
    return matrix.permissions?.[role]?.[moduleId]?.scope || 'all';
  }
}

export const PermissionEngine = new PermissionEngineService();
