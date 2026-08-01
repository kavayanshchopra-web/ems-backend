/**
 * PAYROLL MODULE MANIFEST
 * System Manifest for Payroll Module
 */

import { MODULE_CATEGORIES, LICENSE_PLANS } from '../types';

export const PAYROLL_MANIFEST = {
  moduleId: 'payroll',
  version: '1.0.0',
  minPlatformVersion: '1.0.0',
  name: 'Payroll & Salary Engine',
  description: 'Manage staff compensation, salary structures, payslips, and compliance reports.',
  category: MODULE_CATEGORIES.FINANCE_PAYROLL,
  icon: '💰',
  accentColor: '#7c3aed',
  author: 'EMS Core Team',
  
  requiredLicensePlan: LICENSE_PLANS.ENTERPRISE,
  isCoreModule: false,
  dependencies: [{ moduleId: 'employees', minVersion: '1.0.0' }],
  
  routes: [
    {
      path: '/payroll',
      componentKey: 'PayrollView',
      exact: true,
      requiresAuth: true,
      requiredPermissions: ['payroll.view']
    }
  ],
  
  navigation: [
    {
      id: 'nav_payroll',
      label: 'Payroll & Compensation',
      icon: 'DollarSign',
      category: 'Finance & Payroll',
      order: 4
    }
  ],
  
  permissions: [
    { key: 'payroll.view', name: 'View Payroll Statements', description: 'Access payroll reports', defaultRoles: ['superadmin', 'owner', 'admin'] },
    { key: 'payroll.process', name: 'Process Monthly Payroll', description: 'Execute payroll runs and generate payslips', defaultRoles: ['superadmin', 'owner', 'admin'] }
  ],
  
  defaultFields: [
    { id: 'employeeName', label: 'Employee Name', type: 'text', systemField: true, required: true, searchable: true, filterable: false, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true },
    { id: 'basicSalary', label: 'Basic Monthly Salary (₹)', type: 'currency', systemField: true, required: true, searchable: true, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true },
    { id: 'allowances', label: 'HRA & Allowances (₹)', type: 'currency', systemField: true, required: false, searchable: false, filterable: false, sortable: false, showOnCreate: true, showOnEdit: true, showOnView: true },
    { id: 'deductions', label: 'PF & Tax Deductions (₹)', type: 'currency', systemField: true, required: false, searchable: false, filterable: false, sortable: false, showOnCreate: true, showOnEdit: true, showOnView: true },
    { id: 'netSalary', label: 'Net Payable Salary (₹)', type: 'currency', systemField: true, required: true, searchable: true, filterable: true, sortable: true, showOnCreate: false, showOnEdit: false, showOnView: true },
    { id: 'status', label: 'Payroll Run Status', type: 'dropdown', optionsSource: 'payroll_statuses', systemField: true, required: true, searchable: true, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true }
  ],
  
  defaultSummaryWidgets: [
    { id: 'total_payroll_cost', label: 'MONTHLY PAYROLL COST', metricType: 'TOTAL', bg: 'rgba(124, 58, 237, 0.1)', color: '#7c3aed', icon: '💰', enabled: true, order: 1 },
    { id: 'processed_runs', label: 'PROCESSED PAYSLIPS', metricType: 'STAGE_COUNT', stageName: 'Disbursed', bg: 'rgba(5, 150, 105, 0.1)', color: '#059669', icon: '✅', enabled: true, order: 2 }
  ],
  
  defaultColumns: [
    { id: 'employee', label: 'Employee', visible: true, fieldKey: 'employeeName', order: 1 },
    { id: 'basic', label: 'Basic Salary', visible: true, fieldKey: 'basicSalary', order: 2 },
    { id: 'net', label: 'Net Payable', visible: true, fieldKey: 'netSalary', order: 3 },
    { id: 'status', label: 'Payroll Status', visible: true, fieldKey: 'status', order: 4 }
  ],
  
  defaultViews: {
    availableViews: ['list', 'kanban'],
    defaultView: 'list'
  },
  
  defaultStages: [
    { id: 'draft', key: 'DRAFT', name: 'Draft Run', emoji: '📝', color: '#64748b', semanticType: 'DRAFT', sortOrder: 1 },
    { id: 'approved', key: 'APPROVED', name: 'Approved', emoji: '👍', color: '#2563eb', semanticType: 'APPROVED', sortOrder: 2 },
    { id: 'disbursed', key: 'DISBURSED', name: 'Disbursed', emoji: '💸', color: '#059669', semanticType: 'DISBURSED', sortOrder: 3 }
  ]
};
