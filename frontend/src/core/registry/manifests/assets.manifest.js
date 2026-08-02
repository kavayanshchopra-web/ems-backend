/**
 * ASSETS MODULE MANIFEST
 * System Manifest for Corporate Asset Management Module
 */

import { MODULE_CATEGORIES, LICENSE_PLANS } from '../types';

export const ASSETS_MANIFEST = {
  moduleId: 'asset_management',
  version: '1.0.0',
  minPlatformVersion: '1.0.0',
  name: 'Asset Management',
  description: 'Track corporate devices, hardware tags, employee assignments, and maintenance status.',
  category: MODULE_CATEGORIES.OPERATIONS,
  icon: '🖥️',
  accentColor: '#3b82f6',
  author: 'EMS Core Team',
  
  requiredLicensePlan: LICENSE_PLANS.COMMUNITY,
  isCoreModule: true,
  dependencies: [],

  routes: [
    {
      path: '/assets',
      componentKey: 'AssetsView',
      exact: true,
      requiresAuth: true,
      requiredPermissions: ['assets.view']
    }
  ],

  navigation: [
    {
      id: 'nav_assets',
      label: 'Asset Management',
      icon: 'Monitor',
      category: 'Organization HR',
      order: 4
    }
  ],

  permissions: [
    { key: 'assets.view', name: 'View Corporate Assets', description: 'Access asset directory', defaultRoles: ['superadmin', 'owner', 'admin', 'manager', 'employee'] },
    { key: 'assets.manage', name: 'Manage Assets', description: 'Add, assign, or retire corporate devices', defaultRoles: ['superadmin', 'owner', 'admin'] }
  ],

  defaultFields: [
    { id: 'tag', key: 'tag', label: 'Asset Tag ID', type: 'text', systemField: true, required: true, searchable: true, filterable: false, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, showOnList: true, showOnKanban: true, placeholder: 'e.g. AST-LAP-001', sortOrder: 1 },
    { id: 'name', key: 'name', label: 'Device / Asset Name', type: 'text', systemField: true, required: true, searchable: true, filterable: false, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, showOnList: true, showOnKanban: true, placeholder: 'e.g. MacBook Pro M2 16"', sortOrder: 2 },
    { id: 'category', key: 'category', label: 'Asset Category', type: 'dropdown', options: ['Laptop', 'Mobile Phone', 'Monitor', 'Peripheral', 'Office Equipment'], systemField: true, required: true, searchable: true, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, showOnList: true, showOnKanban: true, sortOrder: 3 },
    { id: 'assignedTo', key: 'assignedTo', label: 'Assigned Staff', type: 'text', systemField: true, required: false, searchable: true, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, showOnList: true, showOnKanban: true, placeholder: 'e.g. Rahul Verma', sortOrder: 4 },
    { id: 'purchaseDate', key: 'purchaseDate', label: 'Purchase Date', type: 'date', systemField: true, required: false, searchable: false, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, showOnList: true, showOnKanban: false, sortOrder: 5 },
    { id: 'purchaseValue', key: 'purchaseValue', label: 'Purchase Cost', type: 'currency', systemField: true, required: false, searchable: false, filterable: false, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, showOnList: true, showOnKanban: false, placeholder: 'e.g. 120000', sortOrder: 6 },
    { id: 'status', key: 'status', label: 'Device Status', type: 'dropdown', options: ['In Use', 'Available', 'Under Maintenance', 'Retired'], systemField: true, required: true, searchable: true, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, showOnList: true, showOnKanban: true, defaultValue: 'In Use', sortOrder: 7 }
  ],

  defaultSummaryWidgets: [
    { id: 'total_assets', label: 'TOTAL ASSETS', metricType: 'TOTAL', bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', icon: '🖥️', enabled: true, sortOrder: 1 },
    { id: 'in_use_assets', label: 'IN USE', metricType: 'STAGE_COUNT', stageName: 'In Use', bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981', icon: '💻', enabled: true, sortOrder: 2 },
    { id: 'available_assets', label: 'AVAILABLE', metricType: 'STAGE_COUNT', stageName: 'Available', bg: 'rgba(13, 148, 136, 0.1)', color: '#0d9488', icon: '📦', enabled: true, sortOrder: 3 }
  ],

  defaultColumns: [
    { id: 'tag', label: 'Asset Tag', visible: true, fieldKey: 'tag', width: '160px', align: 'left', sortOrder: 1 },
    { id: 'name', label: 'Device Details', visible: true, fieldKey: 'name', width: '220px', align: 'left', sortOrder: 2 },
    { id: 'category', label: 'Category', visible: true, fieldKey: 'category', width: '140px', align: 'left', sortOrder: 3 },
    { id: 'assignedTo', label: 'Assigned To', visible: true, fieldKey: 'assignedTo', width: '180px', align: 'left', sortOrder: 4 },
    { id: 'status', label: 'Status', visible: true, fieldKey: 'status', width: '140px', align: 'left', sortOrder: 5 }
  ],

  defaultViews: {
    availableViews: ['list', 'kanban'],
    defaultView: 'list'
  },

  defaultStages: [
    { id: 'in_use', key: 'IN_USE', name: 'In Use', emoji: '💻', color: '#10b981', semanticType: 'ACTIVE', sortOrder: 1 },
    { id: 'available', key: 'AVAILABLE', name: 'Available', emoji: '📦', color: '#0d9488', semanticType: 'NEW', sortOrder: 2 },
    { id: 'under_maintenance', key: 'UNDER_MAINTENANCE', name: 'Under Maintenance', emoji: '🛠️', color: '#d97706', semanticType: 'REVIEW', sortOrder: 3 },
    { id: 'retired', key: 'RETIRED', name: 'Retired', emoji: '♻️', color: '#64748b', semanticType: 'EXITED', sortOrder: 4 }
  ],

  defaultIdConfig: {
    prefix: 'AST',
    pattern: 'AST-0001',
    nextSeq: 1
  }
};
