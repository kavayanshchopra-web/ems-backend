/**
 * EXPENSE CLAIMS MODULE MANIFEST
 * System Manifest for Expense Claims & Reimbursements Module
 */

import { MODULE_CATEGORIES, LICENSE_PLANS } from '../types';

export const EXPENSE_CLAIMS_MANIFEST = {
  moduleId: 'expenses',
  version: '1.0.0',
  minPlatformVersion: '1.0.0',
  name: 'Expense Claims',
  description: 'Employee voucher claims, travel reimbursements, receipt attachments & approvals.',
  category: MODULE_CATEGORIES?.PAYROLL_FINANCE || 'PAYROLL & FINANCE',
  icon: '🧾',
  accentColor: '#10b981',
  author: 'EMS Core Team',
  
  requiredLicensePlan: LICENSE_PLANS?.STARTER || 'STARTER',
  isCoreModule: true,
  dependencies: [],
  
  routes: [
    {
      path: '/expenses',
      componentKey: 'ExpensesView',
      exact: true,
      requiresAuth: true,
      requiredPermissions: ['expenses.view']
    }
  ],
  
  navigation: [
    {
      id: 'nav_expenses',
      label: 'Expenses Claim',
      icon: 'Receipt',
      category: 'Payroll & Finance',
      order: 6
    }
  ],
  
  permissions: [
    { key: 'expenses.view', name: 'View Expense Claims', description: 'Access expense claims and reimbursement vouchers', defaultRoles: ['superadmin', 'owner', 'admin', 'manager', 'hr', 'employee', 'agent'] },
    { key: 'expenses.create', name: 'Submit Expense Claim', description: 'Create and submit new expense reimbursement claim', defaultRoles: ['superadmin', 'owner', 'admin', 'manager', 'hr', 'employee', 'agent'] },
    { key: 'expenses.edit', name: 'Edit / Approve Claim', description: 'Update claim details or change approval stage', defaultRoles: ['superadmin', 'owner', 'admin', 'manager', 'hr', 'employee', 'agent'] },
    { key: 'expenses.delete', name: 'Delete Claim', description: 'Remove expense claim record', defaultRoles: ['superadmin', 'owner', 'admin', 'manager', 'hr'] }
  ],
  
  defaultFields: [
    { id: 'title', label: 'Expense Claim Title', type: 'text', systemField: true, required: true, searchable: true, filterable: false, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, placeholder: 'e.g. Client Lunch Meeting, Delhi Flight Ticket' },
    { 
      id: 'employee', 
      label: 'Claimant Employee', 
      type: 'dropdown', 
      optionsSource: 'employees',
      systemField: true, 
      required: true, 
      searchable: true, 
      filterable: true, 
      sortable: true, 
      showOnCreate: true, 
      showOnEdit: true, 
      showOnView: true, 
      placeholder: 'Select Employee Name' 
    },
    { 
      id: 'category', 
      label: 'Expense Category', 
      type: 'dropdown', 
      options: [
        { label: 'Travel & Taxi', value: 'Travel & Taxi' },
        { label: 'Meals & Food', value: 'Meals & Food' },
        { label: 'Client Entertainment', value: 'Client Entertainment' },
        { label: 'Office Supplies', value: 'Office Supplies' },
        { label: 'Internet & Phone', value: 'Internet & Phone' },
        { label: 'Accommodation', value: 'Accommodation' },
        { label: 'Other', value: 'Other' }
      ],
      systemField: true, 
      required: true, 
      searchable: true, 
      filterable: true, 
      sortable: true, 
      showOnCreate: true, 
      showOnEdit: true, 
      showOnView: true 
    },
    { id: 'amount', label: 'Claim Amount (₹)', type: 'currency', systemField: true, required: true, searchable: true, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, placeholder: 'e.g. 1500' },
    { id: 'expenseDate', label: 'Expense Date', type: 'date', systemField: true, required: true, searchable: true, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true },
    { 
      id: 'status', 
      label: 'Approval Stage', 
      type: 'dropdown', 
      defaultValue: 'Submitted',
      options: [
        { label: 'Submitted', value: 'Submitted' },
        { label: 'Approved', value: 'Approved' },
        { label: 'Reimbursed', value: 'Reimbursed' },
        { label: 'Rejected', value: 'Rejected' }
      ],
      systemField: true, 
      required: false, 
      searchable: true, 
      filterable: true, 
      sortable: true, 
      showOnCreate: false, 
      showOnEdit: true, 
      showOnView: true 
    },
    { id: 'notes', label: 'Notes / Voucher Details', type: 'textarea', systemField: true, required: false, searchable: true, filterable: false, sortable: false, showOnCreate: true, showOnEdit: true, showOnView: true, placeholder: 'Enter receipt bill details or approval notes...' }
  ],
  
  defaultSummaryWidgets: [
    { id: 'total_claims', label: 'TOTAL CLAIMS', metricType: 'TOTAL', bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981', icon: '🧾', enabled: true, order: 1 },
    { id: 'pending_claims', label: 'PENDING APPROVAL', metricType: 'COUNT_SUBMITTED', bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', icon: '⏳', enabled: true, order: 2 },
    { id: 'approved_claims', label: 'APPROVED CLAIMS', metricType: 'COUNT_APPROVED', bg: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', icon: '✅', enabled: true, order: 3 },
    { id: 'total_reimbursed', label: 'REIMBURSED (₹)', metricType: 'SUM_AMOUNT', bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', icon: '💵', enabled: true, order: 4 }
  ],
  
  defaultColumns: [
    { id: 'title', fieldKey: 'title', label: 'Expense Title', visible: true, width: '240px', align: 'left', sortable: true, sortOrder: 1 },
    { id: 'employee', fieldKey: 'employee', label: 'Employee Name', visible: true, width: '180px', align: 'left', sortable: true, sortOrder: 2 },
    { id: 'category', fieldKey: 'category', label: 'Category', visible: true, width: '160px', align: 'left', sortable: true, sortOrder: 3 },
    { id: 'amount', fieldKey: 'amount', label: 'Amount (₹)', visible: true, width: '130px', align: 'right', sortable: true, sortOrder: 4 },
    { id: 'expenseDate', fieldKey: 'expenseDate', label: 'Expense Date', visible: true, width: '140px', align: 'left', sortable: true, sortOrder: 5 },
    { id: 'status', fieldKey: 'status', label: 'Approval Stage', visible: true, width: '140px', align: 'left', sortable: true, sortOrder: 6 }
  ],
  
  defaultViews: {
    availableViews: ['kanban', 'list'],
    defaultView: 'kanban'
  },
  
  defaultStages: ['Submitted', 'Approved', 'Reimbursed', 'Rejected'],
  
  kanbanConfig: {
    groupByField: 'status'
  }
};
