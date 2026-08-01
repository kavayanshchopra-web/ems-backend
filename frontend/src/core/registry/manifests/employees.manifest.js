/**
 * EMPLOYEES MODULE MANIFEST
 * System Manifest for Employee Directory Module
 */

import { MODULE_CATEGORIES, LICENSE_PLANS } from '../types';

export const EMPLOYEES_MANIFEST = {
  moduleId: 'employees',
  version: '1.0.0',
  minPlatformVersion: '1.0.0',
  name: 'Employees Directory',
  description: 'Manage staff records, departments, designations, and employee directory.',
  category: MODULE_CATEGORIES.HR_RECRUITMENT,
  icon: '👥',
  accentColor: '#059669',
  author: 'EMS Core Team',
  
  requiredLicensePlan: LICENSE_PLANS.COMMUNITY,
  isCoreModule: true,
  dependencies: [],
  
  routes: [
    {
      path: '/employees',
      componentKey: 'EmployeesView',
      exact: true,
      requiresAuth: true,
      requiredPermissions: ['employees.view']
    }
  ],
  
  navigation: [
    {
      id: 'nav_employees',
      label: 'Employee Directory',
      icon: 'Users',
      category: 'Organization HR',
      order: 3
    }
  ],
  
  permissions: [
    { key: 'employees.view', name: 'View Employee Directory', description: 'Access staff directory', defaultRoles: ['superadmin', 'owner', 'admin', 'manager', 'employee'] },
    { key: 'employees.manage', name: 'Manage Staff Records', description: 'Add, edit, or terminate employee profiles', defaultRoles: ['superadmin', 'owner', 'admin'] }
  ],
  
  defaultFields: [
    { id: 'name', label: 'Full Name', type: 'text', systemField: true, required: true, searchable: true, filterable: false, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, placeholder: 'e.g. Rahul Verma' },
    { id: 'department', label: 'Department', type: 'dropdown', optionsSource: 'departments', systemField: true, required: true, searchable: true, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true },
    { id: 'designation', label: 'Designation', type: 'dropdown', optionsSource: 'designations', systemField: true, required: true, searchable: true, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true },
    { id: 'email', label: 'Work Email', type: 'email', systemField: true, required: true, searchable: true, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true },
    { id: 'phone', label: 'Phone Number', type: 'phone', systemField: true, required: false, searchable: true, filterable: true, sortable: false, showOnCreate: true, showOnEdit: true, showOnView: true },
    { id: 'status', label: 'Employment Status', type: 'dropdown', optionsSource: 'employment_statuses', systemField: true, required: true, searchable: true, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true }
  ],
  
  defaultSummaryWidgets: [
    { id: 'total_staff', label: 'TOTAL EMPLOYEES', metricType: 'TOTAL', bg: 'rgba(5, 150, 105, 0.1)', color: '#059669', icon: '👥', enabled: true, order: 1 },
    { id: 'active_staff', label: 'ACTIVE STAFF', metricType: 'STAGE_COUNT', stageName: 'Active', bg: 'rgba(13, 148, 136, 0.1)', color: '#0d9488', icon: '✅', enabled: true, order: 2 }
  ],
  
  defaultColumns: [
    { id: 'employee', label: 'Employee Name', visible: true, fieldKey: 'name', order: 1 },
    { id: 'department', label: 'Department', visible: true, fieldKey: 'department', order: 2 },
    { id: 'designation', label: 'Designation', visible: true, fieldKey: 'designation', order: 3 },
    { id: 'contact', label: 'Work Contact', visible: true, fieldKey: 'email', order: 4 },
    { id: 'status', label: 'Status', visible: true, fieldKey: 'status', order: 5 }
  ],
  
  defaultViews: {
    availableViews: ['list', 'kanban'],
    defaultView: 'list'
  },
  
  defaultStages: [
    { id: 'active', key: 'ACTIVE', name: 'Active', emoji: '✅', color: '#059669', semanticType: 'ACTIVE', sortOrder: 1 },
    { id: 'on_leave', key: 'ON_LEAVE', name: 'On Leave', emoji: '🏖️', color: '#d97706', semanticType: 'LEAVE', sortOrder: 2 },
    { id: 'terminated', key: 'TERMINATED', name: 'Terminated', emoji: '🚪', color: '#ef4444', semanticType: 'EXITED', sortOrder: 3 }
  ]
};
