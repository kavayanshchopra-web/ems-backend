/**
 * ADVANCES & LOANS MODULE MANIFEST
 * System Manifest for Salary Advances & Loans Module
 */

import { MODULE_CATEGORIES, LICENSE_PLANS } from '../types';

export const ADVANCES_LOANS_MANIFEST = {
  moduleId: 'advances_loans',
  version: '1.0.0',
  minPlatformVersion: '1.0.0',
  name: 'Advances & Loans',
  description: 'Process advanced payout requests and company loan approvals for employees.',
  category: MODULE_CATEGORIES?.PAYROLL_FINANCE || 'PAYROLL & FINANCE',
  icon: '💳',
  accentColor: '#3b82f6',
  author: 'EMS Core Team',
  
  requiredLicensePlan: LICENSE_PLANS?.STARTER || 'STARTER',
  isCoreModule: true,
  dependencies: [],
  
  routes: [
    {
      path: '/advances-loans',
      componentKey: 'AdvancesLoansView',
      exact: true,
      requiresAuth: true,
      requiredPermissions: ['advances_loans.view']
    }
  ],
  
  navigation: [
    {
      id: 'nav_advances_loans',
      label: 'Advances & Loans',
      icon: 'CreditCard',
      category: 'Payroll & Finance',
      order: 5
    }
  ],
  
  permissions: [
    { key: 'advances_loans.view', name: 'View Loan Requests', description: 'Access salary advance and loan requests', defaultRoles: ['superadmin', 'owner', 'admin', 'manager', 'hr', 'employee', 'agent'] },
    { key: 'advances_loans.create', name: 'Submit Loan Request', description: 'Create and submit new advance/loan request', defaultRoles: ['superadmin', 'owner', 'admin', 'manager', 'hr', 'employee', 'agent'] },
    { key: 'advances_loans.edit', name: 'Edit / Approve Request', description: 'Update loan details or change approval stage', defaultRoles: ['superadmin', 'owner', 'admin', 'manager', 'hr', 'employee', 'agent'] },
    { key: 'advances_loans.delete', name: 'Delete Request', description: 'Remove advance loan record', defaultRoles: ['superadmin', 'owner', 'admin', 'manager', 'hr'] }
  ],
  
  defaultFields: [
    { id: 'title', label: 'Request Title / Purpose', type: 'text', systemField: true, required: true, searchable: true, filterable: false, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, placeholder: 'e.g. Medical Emergency Advance, Home Renovation Loan' },
    { 
      id: 'employee', 
      label: 'Employee Name', 
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
      id: 'requestType', 
      label: 'Request Type', 
      type: 'dropdown', 
      options: [
        { label: 'Salary Advance', value: 'Salary Advance' },
        { label: 'Personal Loan', value: 'Personal Loan' },
        { label: 'Emergency Fund', value: 'Emergency Fund' },
        { label: 'Travel Advance', value: 'Travel Advance' },
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
    { id: 'amount', label: 'Requested Amount (₹)', type: 'currency', systemField: true, required: true, searchable: true, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, placeholder: 'e.g. 10000' },
    { id: 'repaymentTerms', label: 'EMI Repayment Months', type: 'text', systemField: true, required: false, searchable: true, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, placeholder: 'e.g. 1 Month, 3 Months, 6 Months' },
    { id: 'requestDate', label: 'Request Date', type: 'date', systemField: true, required: true, searchable: true, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true },
    { 
      id: 'status', 
      label: 'Approval Stage', 
      type: 'dropdown', 
      defaultValue: 'Requested',
      options: [
        { label: 'Requested', value: 'Requested' },
        { label: 'Approved', value: 'Approved' },
        { label: 'Disbursed', value: 'Disbursed' },
        { label: 'Settled', value: 'Settled' },
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
    { id: 'notes', label: 'Comments / Notes', type: 'textarea', systemField: true, required: false, searchable: true, filterable: false, sortable: false, showOnCreate: true, showOnEdit: true, showOnView: true, placeholder: 'Enter any additional details or approval notes...' }
  ],
  
  defaultSummaryWidgets: [
    { id: 'total_requests', label: 'TOTAL REQUESTS', metricType: 'TOTAL', bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', icon: '💳', enabled: true, order: 1 },
    { id: 'pending_requests', label: 'PENDING REQUESTS', metricType: 'COUNT_REQUESTED', bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', icon: '⏳', enabled: true, order: 2 },
    { id: 'approved_requests', label: 'APPROVED LOANS', metricType: 'COUNT_APPROVED', bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981', icon: '✅', enabled: true, order: 3 },
    { id: 'disbursed_amount', label: 'DISBURSED (₹)', metricType: 'SUM_AMOUNT', bg: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', icon: '💵', enabled: true, order: 4 }
  ],
  
  defaultColumns: [
    { id: 'title', fieldKey: 'title', label: 'Purpose', visible: true, width: '220px', align: 'left', sortable: true, sortOrder: 1 },
    { id: 'employee', fieldKey: 'employee', label: 'Employee', visible: true, width: '180px', align: 'left', sortable: true, sortOrder: 2 },
    { id: 'requestType', fieldKey: 'requestType', label: 'Type', visible: true, width: '150px', align: 'left', sortable: true, sortOrder: 3 },
    { id: 'amount', fieldKey: 'amount', label: 'Amount (₹)', visible: true, width: '130px', align: 'right', sortable: true, sortOrder: 4 },
    { id: 'requestDate', fieldKey: 'requestDate', label: 'Request Date', visible: true, width: '140px', align: 'left', sortable: true, sortOrder: 5 },
    { id: 'status', fieldKey: 'status', label: 'Approval Stage', visible: true, width: '140px', align: 'left', sortable: true, sortOrder: 6 }
  ],
  
  defaultViews: {
    availableViews: ['kanban', 'list'],
    defaultView: 'kanban'
  },
  
  defaultStages: ['Requested', 'Approved', 'Disbursed', 'Settled', 'Rejected'],
  
  kanbanConfig: {
    groupByField: 'status'
  }
};
