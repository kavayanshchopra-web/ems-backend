/**
 * OFFBOARDING EXIT MODULE MANIFEST
 * System Manifest for Employee Offboarding & Exit Clearance Module
 */

import { MODULE_CATEGORIES, LICENSE_PLANS } from '../types';

export const OFFBOARDING_MANIFEST = {
  moduleId: 'offboarding',
  version: '1.0.0',
  minPlatformVersion: '1.0.0',
  name: 'Offboarding Exit',
  entityName: 'Offboarding Case',
  entityNamePlural: 'Offboarding Cases',
  description: 'Track resignation clearances, IT asset handovers, NOC checklists, F&F settlements, and exit interviews.',
  category: MODULE_CATEGORIES.HR,
  icon: '🚪',
  accentColor: '#f59e0b',
  author: 'EMS Core Team',
  
  requiredLicensePlan: LICENSE_PLANS.COMMUNITY,
  isCoreModule: true,
  dependencies: [],

  idConfig: {
    prefix: 'EXIT',
    pattern: 'EXIT-0001',
    nextSeq: 1
  },

  routes: [
    {
      path: '/offboarding',
      componentKey: 'OffboardingView',
      exact: true,
      requiresAuth: true,
      requiredPermissions: ['offboarding.view']
    }
  ],

  navigation: [
    {
      id: 'nav_offboarding',
      label: 'Offboarding Exit',
      icon: 'LogOut',
      category: 'Organization HR',
      order: 6
    }
  ],

  permissions: [
    { key: 'offboarding.view', name: 'View Offboarding Cases', description: 'Access employee exit clearance records', defaultRoles: ['superadmin', 'owner', 'admin', 'manager', 'employee'] },
    { key: 'offboarding.manage', name: 'Manage Offboarding Cases', description: 'Approve NOCs, manage exit interviews, and issue relieving letters', defaultRoles: ['superadmin', 'owner', 'admin', 'manager'] }
  ],

  defaultFields: [
    { id: 'employee', key: 'employee', label: 'Employee Name', type: 'text', systemField: true, required: true, searchable: true, filterable: false, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, showOnList: true, showOnKanban: true, placeholder: 'e.g. Rahul Sharma', sortOrder: 1 },
    { id: 'resignationDate', key: 'resignationDate', label: 'Resignation Date', type: 'date', systemField: true, required: true, searchable: true, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, showOnList: true, showOnKanban: false, sortOrder: 2 },
    { id: 'lastWorkingDay', key: 'lastWorkingDay', label: 'Last Working Day (LWD)', type: 'date', systemField: true, required: true, searchable: true, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, showOnList: true, showOnKanban: true, sortOrder: 3 },
    { id: 'noticePeriod', key: 'noticePeriod', label: 'Notice Period', type: 'dropdown', options: ['15 Days', '30 Days', '60 Days', '90 Days', 'Immediate'], systemField: true, required: true, searchable: true, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, showOnList: true, showOnKanban: false, defaultValue: '30 Days', sortOrder: 4 },
    { id: 'assetClearance', key: 'assetClearance', label: 'IT Asset Clearance', type: 'dropdown', options: ['✓ Cleared', '⏳ Pending Return', '🚫 Assets Damaged', 'N/A'], systemField: true, required: true, searchable: true, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, showOnList: true, showOnKanban: true, defaultValue: '⏳ Pending Return', sortOrder: 5 },
    { id: 'financeClearance', key: 'financeClearance', label: 'Finance Clearance', type: 'dropdown', options: ['✓ Cleared', '⏳ Pending Advance Loan', 'N/A'], systemField: true, required: true, searchable: true, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, showOnList: true, showOnKanban: false, defaultValue: '✓ Cleared', sortOrder: 6 },
    { id: 'stage', key: 'stage', label: 'Exit Stage', type: 'dropdown', options: ['Resignation Submitted', 'NOC Clearance', 'Exit Interview', 'F&F Processed', 'Relieved'], systemField: true, required: true, searchable: true, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, showOnList: true, showOnKanban: true, defaultValue: 'Resignation Submitted', sortOrder: 7 },
    { id: 'reason', key: 'reason', label: 'Reason for Leaving', type: 'text', systemField: false, required: false, searchable: true, filterable: false, sortable: false, showOnCreate: true, showOnEdit: true, showOnView: true, showOnList: true, showOnKanban: false, placeholder: 'Better opportunity, relocation, etc.', sortOrder: 8 }
  ],

  defaultStages: [
    { id: 'stage_resigned', name: 'Resignation Submitted', color: '#3b82f6', isDefault: true, sortOrder: 1 },
    { id: 'stage_noc', name: 'NOC Clearance', color: '#f59e0b', isDefault: false, sortOrder: 2 },
    { id: 'stage_interview', name: 'Exit Interview', color: '#8b5cf6', isDefault: false, sortOrder: 3 },
    { id: 'stage_fnf', name: 'F&F Processed', color: '#0d9488', isDefault: false, sortOrder: 4 },
    { id: 'stage_relieved', name: 'Relieved', color: '#10b981', isDefault: false, sortOrder: 5 }
  ],

  defaultSummaryWidgets: [
    { id: 'total_cases', label: 'ACTIVE OFFBOARDING CASES', metricType: 'TOTAL', bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', icon: '🚪', enabled: true, sortOrder: 1 },
    { id: 'in_noc', label: 'IN NOC CLEARANCE', metricType: 'STAGE_COUNT', stageName: 'NOC Clearance', bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', icon: '📋', enabled: true, sortOrder: 2 },
    { id: 'fully_relieved', label: 'FULLY RELIEVED', metricType: 'STAGE_COUNT', stageName: 'Relieved', bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981', icon: '✅', enabled: true, sortOrder: 3 }
  ],

  defaultColumns: [
    { id: 'employee', label: 'Employee Name', visible: true, fieldKey: 'employee', width: '220px', align: 'left', sortOrder: 1 },
    { id: 'resignationDate', label: 'Resignation Date', visible: true, fieldKey: 'resignationDate', width: '150px', align: 'left', sortOrder: 2 },
    { id: 'lastWorkingDay', label: 'Last Working Day', visible: true, fieldKey: 'lastWorkingDay', width: '150px', align: 'left', sortOrder: 3 },
    { id: 'noticePeriod', label: 'Notice Period', visible: true, fieldKey: 'noticePeriod', width: '130px', align: 'left', sortOrder: 4 },
    { id: 'assetClearance', label: 'IT Asset Clearance', visible: true, fieldKey: 'assetClearance', width: '160px', align: 'left', sortOrder: 5 },
    { id: 'financeClearance', label: 'Finance Clearance', visible: true, fieldKey: 'financeClearance', width: '160px', align: 'left', sortOrder: 6 },
    { id: 'stage', label: 'Exit Stage', visible: true, fieldKey: 'stage', width: '180px', align: 'left', sortOrder: 7 }
  ],

  defaultViews: {
    availableViews: ['list', 'kanban'],
    defaultView: 'list',
    list: true,
    kanban: true
  },

  defaultLookupData: {
    notice_periods: ['15 Days', '30 Days', '60 Days', '90 Days', 'Immediate'],
    asset_clearance_options: ['✓ Cleared', '⏳ Pending Return', '🚫 Assets Damaged', 'N/A'],
    finance_clearance_options: ['✓ Cleared', '⏳ Pending Advance Loan', 'N/A']
  }
};
