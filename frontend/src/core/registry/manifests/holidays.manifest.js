/**
 * COMPANY HOLIDAYS CALENDAR MODULE MANIFEST
 * System Manifest for Company Holidays Module
 */

import { MODULE_CATEGORIES, LICENSE_PLANS } from '../types';

export const HOLIDAYS_MANIFEST = {
  moduleId: 'holidays',
  version: '1.0.0',
  minPlatformVersion: '1.0.0',
  name: 'Company Holidays Calendar',
  description: 'Manage annual official gazetted holidays and restricted company leave schedule.',
  category: MODULE_CATEGORIES?.OPERATIONS || 'OPERATIONS',
  icon: '📅',
  accentColor: '#0d9488',
  author: 'EMS Core Team',
  
  requiredLicensePlan: LICENSE_PLANS?.STARTER || 'STARTER',
  isCoreModule: true,
  dependencies: [],
  
  routes: [
    {
      path: '/holidays',
      componentKey: 'HolidaysView',
      exact: true,
      requiresAuth: true,
      requiredPermissions: ['holidays.view']
    }
  ],
  
  navigation: [
    {
      id: 'nav_holidays',
      label: 'Holidays List',
      icon: 'Calendar',
      category: 'Operations',
      order: 5
    }
  ],
  
  permissions: [
    { key: 'holidays.view', name: 'View Holidays Calendar', description: 'Access annual company holidays list', defaultRoles: ['superadmin', 'owner', 'admin', 'manager', 'employee', 'agent'] },
    { key: 'holidays.create', name: 'Add Holidays', description: 'Register new annual gazetted or optional holidays', defaultRoles: ['superadmin', 'owner', 'admin', 'manager'] },
    { key: 'holidays.delete', name: 'Delete Holidays', description: 'Remove company holidays from calendar', defaultRoles: ['superadmin', 'owner', 'admin', 'manager'] }
  ],
  
  defaultFields: [
    { id: 'name', label: 'Holiday Title / Festival Name', type: 'text', systemField: true, required: true, searchable: true, filterable: false, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, placeholder: 'e.g. Diwali Festival, New Year\'s Day' },
    { id: 'date', label: 'Holiday Date', type: 'date', systemField: true, required: true, searchable: true, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true },
    { 
      id: 'type', 
      label: 'Holiday Category', 
      type: 'dropdown', 
      options: [
        { label: 'Gazetted Official Holiday', value: 'Gazetted Official Holiday' },
        { label: 'Restricted / Optional Holiday', value: 'Restricted / Optional Holiday' },
        { label: 'National Festival', value: 'National Festival' }
      ],
      systemField: true, 
      required: true, 
      searchable: true, 
      filterable: true, 
      sortable: true, 
      showOnCreate: true, 
      showOnEdit: true, 
      showOnView: true 
    }
  ],
  
  defaultSummaryWidgets: [
    { id: 'total_holidays', label: 'TOTAL HOLIDAYS', metricType: 'TOTAL', bg: 'rgba(13, 148, 136, 0.1)', color: '#0d9488', icon: '📅', enabled: true, order: 1 },
    { id: 'gazetted_holidays', label: 'GAZETTED OFFICIAL', metricType: 'COUNT_GAZETTED', bg: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', icon: '🏛️', enabled: true, order: 2 },
    { id: 'restricted_holidays', label: 'RESTRICTED / OPTIONAL', metricType: 'COUNT_RESTRICTED', bg: 'rgba(217, 119, 6, 0.1)', color: '#d97706', icon: '🌟', enabled: true, order: 3 }
  ],
  
  defaultColumns: [
    { id: 'name', fieldKey: 'name', label: 'Holiday Title / Festival Name', visible: true, width: '240px', align: 'left', sortable: true, sortOrder: 1 },
    { id: 'date', fieldKey: 'date', label: 'Holiday Date', visible: true, width: '160px', align: 'left', sortable: true, sortOrder: 2 },
    { id: 'type', fieldKey: 'type', label: 'Holiday Category', visible: true, width: '200px', align: 'left', sortable: true, sortOrder: 3 }
  ],
  
  defaultViews: {
    availableViews: ['list', 'kanban'],
    defaultView: 'list'
  },
  
  defaultStages: ['Gazetted Official Holiday', 'Restricted / Optional Holiday', 'National Festival'],
  
  kanbanConfig: {
    groupByField: 'type'
  }
};
