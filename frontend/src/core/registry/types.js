/**
 * GLOBAL EMS MASTER MODULE REGISTRY — CORE TYPES & CONSTANTS
 * Authoritative Type System & Enums for Multi-Tenant EMS Engine
 */

export const MODULE_CATEGORIES = {
  HR_RECRUITMENT: 'HR & Recruitment',
  CRM_SALES: 'CRM & Sales',
  FINANCE_PAYROLL: 'Finance & Payroll',
  OPERATIONS_INVENTORY: 'Operations & Inventory',
  PROJECTS_TASKS: 'Projects & Tasks',
  COMMUNICATIONS: 'Communications',
  INTELLIGENCE_AI: 'AI & Automation'
};

export const LIFECYCLE_STATUSES = {
  DRAFT: 'DRAFT',
  INSTALLED: 'INSTALLED',
  ENABLED: 'ENABLED',
  DISABLED: 'DISABLED',
  DEPRECATED: 'DEPRECATED',
  ARCHIVED: 'ARCHIVED'
};

export const FIELD_DATA_TYPES = {
  TEXT: 'text',
  NUMBER: 'number',
  EMAIL: 'email',
  PHONE: 'phone',
  DATE: 'date',
  DROPDOWN: 'dropdown',
  RADIO: 'radio',
  CHECKBOX: 'checkbox',
  TEXTAREA: 'textarea',
  FILE: 'file',
  CURRENCY: 'currency',
  USER_REF: 'user_ref',
  RELATION: 'relation'
};

export const LICENSE_PLANS = {
  COMMUNITY: 'COMMUNITY',
  PRO: 'PRO',
  ENTERPRISE: 'ENTERPRISE'
};

export const USER_ROLES = {
  SUPER_ADMIN: 'superadmin',
  OWNER: 'owner',
  ADMIN: 'admin',
  MANAGER: 'manager',
  EMPLOYEE: 'employee'
};
