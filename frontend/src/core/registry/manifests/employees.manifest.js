/**
 * EMPLOYEES MODULE MANIFEST
 * System Manifest for Employee Directory Module
 */

import { MODULE_CATEGORIES, LICENSE_PLANS } from '../types';

export const EMPLOYEES_MANIFEST = {
  moduleId: 'employees',
  version: '1.0.0',
  minPlatformVersion: '1.0.0',
  name: 'Employee Directory',
  description: 'Manage staff records, departments, designations, system roles, and base salaries.',
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
    { id: 'name', key: 'name', label: 'Full Name', type: 'text', systemField: true, required: true, searchable: true, filterable: false, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, showOnList: true, showOnKanban: true, placeholder: 'e.g. Rahul Verma', sortOrder: 1 },
    { id: 'role', key: 'role', label: 'System Role', type: 'dropdown', optionsSource: 'role', options: ['Owner / Admin', 'Manager', 'Sales Agent', 'Staff Employee'], systemField: true, required: true, searchable: true, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, showOnList: true, showOnKanban: true, sortOrder: 2 },
    { id: 'department', key: 'department', label: 'Department', type: 'dropdown', optionsSource: 'departments', options: ['Sales', 'Engineering', 'Marketing', 'HR', 'Finance', 'Operations'], systemField: true, required: true, searchable: true, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, showOnList: true, showOnKanban: true, sortOrder: 3 },
    { id: 'designation', key: 'designation', label: 'Designation', type: 'dropdown', optionsSource: 'designations', systemField: true, required: false, searchable: true, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, showOnList: true, showOnKanban: true, placeholder: 'e.g. Senior Account Manager', sortOrder: 4 },
    { id: 'email', key: 'email', label: 'Work Email', type: 'email', systemField: true, required: true, searchable: true, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, showOnList: true, showOnKanban: true, placeholder: 'e.g. rahul@company.com', sortOrder: 5 },
    { id: 'phone', key: 'phone', label: 'Phone Number', type: 'phone', systemField: true, required: false, searchable: true, filterable: true, sortable: false, showOnCreate: true, showOnEdit: true, showOnView: true, showOnList: true, showOnKanban: true, placeholder: 'e.g. +91 9876543210', sortOrder: 6 },
    { id: 'salary', key: 'salary', label: 'Base Salary', type: 'currency', systemField: true, required: false, searchable: false, filterable: false, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, showOnList: true, showOnKanban: false, placeholder: 'e.g. 50000', sortOrder: 7 },
    { id: 'status', key: 'status', label: 'Employment Status', type: 'dropdown', optionsSource: 'status', options: ['Active', 'On Leave', 'Suspended', 'Terminated'], systemField: true, required: true, searchable: true, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, showOnList: true, showOnKanban: true, defaultValue: 'Active', sortOrder: 8 }
  ],

  defaultSummaryWidgets: [
    { id: 'total_staff', label: 'TOTAL EMPLOYEES', metricType: 'TOTAL', bg: 'rgba(5, 150, 105, 0.1)', color: '#059669', icon: '👥', enabled: true, sortOrder: 1 },
    { id: 'active_staff', label: 'ACTIVE STAFF', metricType: 'STAGE_COUNT', stageName: 'Active', bg: 'rgba(13, 148, 136, 0.1)', color: '#0d9488', icon: '✅', enabled: true, sortOrder: 2 },
    { id: 'on_leave_staff', label: 'ON LEAVE', metricType: 'STAGE_COUNT', stageName: 'On Leave', bg: 'rgba(217, 119, 6, 0.1)', color: '#d97706', icon: '🏖️', enabled: true, sortOrder: 3 }
  ],

  defaultColumns: [
    { id: 'employee', label: 'Employee Name', visible: true, fieldKey: 'name', width: '220px', align: 'left', sortOrder: 1 },
    { id: 'role', label: 'System Role', visible: true, fieldKey: 'role', width: '140px', align: 'left', sortOrder: 2 },
    { id: 'department', label: 'Department', visible: true, fieldKey: 'department', width: '140px', align: 'left', sortOrder: 3 },
    { id: 'contact', label: 'Work Contact', visible: true, fieldKey: 'email', width: '200px', align: 'left', sortOrder: 4 },
    { id: 'salary', label: 'Base Salary', visible: true, fieldKey: 'salary', width: '140px', align: 'left', sortOrder: 5 },
    { id: 'status', label: 'Status', visible: true, fieldKey: 'status', width: '130px', align: 'left', sortOrder: 6 }
  ],

  defaultViews: {
    availableViews: ['list'],
    defaultView: 'list',
    list: true,
    kanban: false,
    calendar: false,
    timeline: false,
    gallery: false,
    tree: false,
    gantt: false,
    map: false
  },

  defaultLookupData: {
    departments: ['Engineering', 'Product', 'Design', 'Sales', 'Marketing', 'Customer Support', 'Finance', 'Human Resources', 'Operations'],
    designations: ['Senior Software Engineer', 'Product Manager', 'UX Designer', 'Sales Executive', 'HR Specialist', 'Financial Analyst', 'Operations Lead', 'Marketing Manager'],
    employment_types: ['Full-time', 'Part-time', 'Contract', 'Internship'],
    status: ['active', 'on_leave', 'terminated', 'probation'],
    role: ['employee', 'manager', 'admin', 'hr', 'finance']
  },

  defaultStages: [
    { id: 'active', key: 'ACTIVE', name: 'Active', emoji: '✅', color: '#059669', semanticType: 'ACTIVE', sortOrder: 1 },
    { id: 'on_leave', key: 'ON_LEAVE', name: 'On Leave', emoji: '🏖️', color: '#d97706', semanticType: 'LEAVE', sortOrder: 2 },
    { id: 'suspended', key: 'SUSPENDED', name: 'Suspended', emoji: '⛔', color: '#dc2626', semanticType: 'EXITED', sortOrder: 3 },
    { id: 'terminated', key: 'TERMINATED', name: 'Terminated', emoji: '🚪', color: '#ef4444', semanticType: 'EXITED', sortOrder: 4 }
  ],

  defaultIdConfig: {
    prefix: 'EMP',
    pattern: 'EMP-0001',
    nextSeq: 1
  }
};
