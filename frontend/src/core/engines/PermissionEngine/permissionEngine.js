// OmniFlow EMS v2.5 — Dynamic Engine-Driven Permission Engine (PermissionEngine)
// Auto-discovers modules from MasterModuleRegistry and enforces granular 11-action role permissions.
// Backed by Firebase Firestore for persistent multi-tenant cloud storage.

import FirebaseCloudEngine from '../FirebaseCloudEngine';
import FeatureProvisioningEngine from '../FeatureProvisioningEngine';

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
  { id: 'admin', label: '🏢 Company Admin / Owner', isSystem: true },
  { id: 'manager', label: '👔 Operations / Dept Manager', isSystem: true },
  { id: 'hr_accountant', label: '📋 HR & Accountant Lead', isSystem: true },
  { id: 'agent', label: '💼 Sales & Support Agent', isSystem: true },
  { id: 'employee', label: '👤 Standard Employee', isSystem: true }
];

export function normalizeRole(role) {
  if (!role) return 'employee';
  const r = String(role).toLowerCase().trim();
  if (r === 'superadmin' || r === 'super_admin') return 'superadmin';
  if (r === 'admin' || r === 'company_admin' || r === 'owner' || r === 'company_owner') return 'admin';
  if (r === 'manager' || r === 'operations_manager' || r === 'dept_manager') return 'manager';
  if (r === 'hr_accountant' || r === 'hr' || r === 'accountant' || r === 'hr_manager') return 'hr_accountant';
  if (r === 'agent' || r === 'sales_agent' || r === 'sales' || r === 'support_agent') return 'agent';
  return r;
}

export function getTenantKey(tenantId) {
  if (tenantId && tenantId !== 'default' && tenantId !== 'default_tenant' && tenantId !== 'acme_corp') {
    return String(tenantId).trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  }
  if (typeof window !== 'undefined') {
    try {
      const storedUser = JSON.parse(localStorage.getItem('omnilflow_user') || 'null');
      const candidate = storedUser?.tenantId || storedUser?.companyId || storedUser?.tenant_id;
      if (candidate && candidate !== 'default' && candidate !== 'default_tenant' && candidate !== 'acme_corp') {
        return String(candidate).trim().replace(/[^a-zA-Z0-9_-]/g, '_');
      }
    } catch (e) {}
  }
  return tenantId ? String(tenantId).replace(/[^a-zA-Z0-9_-]/g, '_') : 'default_tenant';
}

const LOCAL_STORAGE_KEY_PREFIX = 'omnilflow_permission_matrix_';

class PermissionEngineService {
  getTenantKey(tenantId) {
    return getTenantKey(tenantId);
  }

  normalizeRole(role) {
    return normalizeRole(role);
  }

  /**
   * Auto-discover all active modules from MasterModuleRegistry filtered by SuperAdmin Feature Provisioning
   */
  getDiscoveredModules(tenantId = null, authUser = null) {
    // 100% Canonical Sidebar Module Definitions (Matched 1:1 with DashboardShell.jsx nav items)
    const CANONICAL_SIDEBAR_MODULES = [
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
      { id: 'contacts', label: 'Contacts', icon: '👥', category: 'CRM & SALES' },
      { id: 'conversations', label: 'Conversations', icon: '💬', category: 'CRM & SALES' },
      { id: 'wa_live_web', label: 'WhatsApp', icon: '💻', category: 'CRM & SALES' },
      { id: 'kanban', label: 'CRM', icon: '📈', category: 'CRM & SALES' },
      { id: 'telecalling', label: 'Phone System', icon: '📞', category: 'CRM & SALES' },

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

    let targetTenant = tenantId;
    if (!targetTenant && typeof window !== 'undefined') {
      try {
        const storedUser = JSON.parse(localStorage.getItem('omnilflow_user') || 'null');
        targetTenant = storedUser?.tenantId || storedUser?.companyId || storedUser?.tenant_id;
      } catch (e) {}
    }

    return CANONICAL_SIDEBAR_MODULES.filter(mod =>
      FeatureProvisioningEngine.isModuleEnabledForTenant(mod.id, targetTenant, authUser)
    );
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

        if (role.id === 'admin') {
          STANDARD_ACTIONS.forEach(act => { defaultActions[act.id] = true; });
          defaultScope = 'all';
        } else if (role.id === 'manager') {
          STANDARD_ACTIONS.forEach(act => {
            defaultActions[act.id] = ['view', 'create', 'edit', 'duplicate', 'archive', 'export', 'approve'].includes(act.id);
          });
          defaultScope = 'team';
        } else if (role.id === 'hr_accountant') {
          const hrAllowed = ['employees', 'recruitment_ats', 'verify_documents', 'offboarding', 'payroll', 'taxes_compliance', 'ff_settlements', 'advances_loans', 'expenses', 'leaves', 'notice_board', 'holidays', 'app_guide', 'settings'];
          STANDARD_ACTIONS.forEach(act => {
            defaultActions[act.id] = hrAllowed.includes(mod.id);
          });
          defaultScope = 'all';
        } else if (role.id === 'agent') {
          const agentAllowed = ['channels', 'wa_live_web', 'kanban', 'telecalling', 'tasks', 'my_attendance', 'leaves', 'shifts', 'notice_board', 'holidays', 'app_guide'];
          STANDARD_ACTIONS.forEach(act => {
            defaultActions[act.id] = agentAllowed.includes(mod.id) && ['view', 'create', 'edit'].includes(act.id);
          });
          defaultScope = 'team';
        } else {
          // Standard employee — strictly scoped to self-portal & notice/holidays/employees directory
          const empAllowed = ['employees', 'my_attendance', 'leaves', 'shifts', 'notice_board', 'holidays', 'app_guide', 'settings'];
          STANDARD_ACTIONS.forEach(act => {
            defaultActions[act.id] = empAllowed.includes(mod.id) && act.id === 'view';
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
    const tenantKey = getTenantKey(tenantId);
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + tenantKey) ||
                    localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + 'default_tenant') ||
                    localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + 'default');
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
              const isAdmin = role.id === 'admin';
              const actions = {};
              STANDARD_ACTIONS.forEach(act => { actions[act.id] = isAdmin; });
              parsed.permissions[role.id][mod.id] = {
                scope: isAdmin ? 'all' : 'own',
                actions
              };
              updated = true;
            }
          });
        });

        if (updated) {
          this.savePermissionMatrix(tenantKey, parsed);
        }
        return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse permission matrix, returning defaults', e);
    }

    const defaultMatrix = this.generateDefaultMatrix();
    this.savePermissionMatrix(tenantKey, defaultMatrix);
    return defaultMatrix;
  }

  /**
   * Save permission matrix for a tenant
   */
  savePermissionMatrix(tenantId = 'default_tenant', matrix) {
    const tenantKey = getTenantKey(tenantId);
    try {
      const jsonStr = JSON.stringify(matrix);
      localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + tenantKey, jsonStr);
      localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + 'default_tenant', jsonStr);
      localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + 'default', jsonStr);

      // Firebase Firestore Sync
      FirebaseCloudEngine.saveRecord('permission_matrix', {
        id: `matrix_${tenantKey}`,
        tenantId: tenantKey,
        matrix: matrix,
        updatedAt: new Date().toISOString()
      }, tenantKey).catch(err => console.warn('Firebase permission_matrix save warning:', err));

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('omnilflow_permissions_updated', {
          detail: { tenantId: tenantKey }
        }));
      }
    } catch (e) {
      console.error('Failed to persist permission matrix', e);
    }
  }

  /**
   * Sync permission matrix from Firebase Firestore
   */
  async syncFromCloud(tenantId = 'default_tenant') {
    const tenantKey = getTenantKey(tenantId);
    try {
      const cloudRecords = await FirebaseCloudEngine.fetchRecords('permission_matrix', tenantKey);
      if (Array.isArray(cloudRecords) && cloudRecords.length > 0) {
        const latest = cloudRecords[0];
        if (latest && latest.matrix) {
          const jsonStr = JSON.stringify(latest.matrix);
          localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + tenantKey, jsonStr);
          localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + 'default_tenant', jsonStr);
          localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + 'default', jsonStr);

          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('omnilflow_permissions_updated', {
              detail: { tenantId: tenantKey }
            }));
          }
          console.log(`☁️ Synced Permission Matrix from Firebase Firestore for tenant: ${tenantKey}`);
          return latest.matrix;
        }
      }
    } catch (err) {
      console.warn('Failed to sync permission matrix from cloud:', err);
    }
    return null;
  }

  /**
   * Real-time Firestore subscription
   */
  subscribeToCloudMatrix(tenantId = 'default_tenant', callback) {
    const tenantKey = getTenantKey(tenantId);
    return FirebaseCloudEngine.subscribeToCollection('permission_matrix', tenantKey, (records) => {
      if (Array.isArray(records) && records.length > 0) {
        const latest = records[0];
        if (latest && latest.matrix) {
          const jsonStr = JSON.stringify(latest.matrix);
          localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + tenantKey, jsonStr);
          localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + 'default_tenant', jsonStr);
          localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + 'default', jsonStr);

          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('omnilflow_permissions_updated', {
              detail: { tenantId: tenantKey }
            }));
          }
          if (typeof callback === 'function') callback(latest.matrix);
        }
      }
    });
  }

  /**
   * Check if active user has permission for a specific action on a module
   */
  can(userObj, moduleId, actionId = 'view') {
    if (!userObj) return false;
    
    // SuperAdmin has platform god-mode
    if (userObj.role === 'superadmin' || userObj.role === 'super_admin' || userObj.isSuperAdmin) {
      return true;
    }

    const tenantKey = getTenantKey(userObj.tenantId || userObj.companyId || userObj.tenant_id);

    // 1. Check Feature Provisioning: if disabled by SuperAdmin globally or for this company -> return false immediately!
    if (!FeatureProvisioningEngine.isModuleEnabledForTenant(moduleId, tenantKey, userObj)) {
      return false;
    }

    const role = normalizeRole(userObj.role);
    const matrix = this.getPermissionMatrix(tenantKey);
    const rolePerms = matrix.permissions?.[role];

    if (!rolePerms || !rolePerms[moduleId]) {
      // If Admin and not explicitly restricted, allow default access
      if (role === 'admin') return true;
      // Standard employee defaults
      if (role === 'employee') {
        const empAllowed = ['employees', 'my_attendance', 'leaves', 'shifts', 'notice_board', 'holidays', 'app_guide', 'settings'];
        return empAllowed.includes(moduleId) && actionId === 'view';
      }
      return false;
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
    if (userObj.role === 'superadmin' || userObj.role === 'super_admin' || userObj.isSuperAdmin) return 'all';

    const role = normalizeRole(userObj.role);
    const tenantKey = getTenantKey(userObj.tenantId || userObj.companyId || userObj.tenant_id);
    const matrix = this.getPermissionMatrix(tenantKey);
    return matrix.permissions?.[role]?.[moduleId]?.scope || (role === 'admin' ? 'all' : 'own');
  }
}

export const PermissionEngine = new PermissionEngineService();
export default PermissionEngine;
