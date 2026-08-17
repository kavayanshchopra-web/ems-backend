/**
 * WORKSPACE NOTICE BOARD MODULE MANIFEST
 * System Manifest for Workspace Notice Board Module
 */

import { MODULE_CATEGORIES, LICENSE_PLANS } from '../types';

export const NOTICE_BOARD_MANIFEST = {
  moduleId: 'notice_board',
  version: '1.0.0',
  minPlatformVersion: '1.0.0',
  name: 'Workspace Notice Board',
  description: 'Broadcast company announcements, updates, and official guidelines to your team.',
  category: MODULE_CATEGORIES?.OPERATIONS || 'OPERATIONS',
  icon: '🔔',
  accentColor: '#0d9488',
  author: 'EMS Core Team',
  
  requiredLicensePlan: LICENSE_PLANS?.STARTER || 'STARTER',
  isCoreModule: true,
  dependencies: [],
  
  routes: [
    {
      path: '/notice-board',
      componentKey: 'NoticeBoardView',
      exact: true,
      requiresAuth: true,
      requiredPermissions: ['notice_board.view']
    }
  ],
  
  navigation: [
    {
      id: 'nav_notice_board',
      label: 'Notice Board',
      icon: 'Bell',
      category: 'Operations',
      order: 4
    }
  ],
  
  permissions: [
    { key: 'notice_board.view', name: 'View Notice Board', description: 'Access workspace announcements', defaultRoles: ['superadmin', 'owner', 'admin', 'manager', 'employee', 'agent'] },
    { key: 'notice_board.create', name: 'Add Notice', description: 'Broadcast new workspace announcements', defaultRoles: ['superadmin', 'owner', 'admin', 'manager'] },
    { key: 'notice_board.delete', name: 'Delete Notice', description: 'Remove workspace announcements', defaultRoles: ['superadmin', 'owner', 'admin', 'manager'] }
  ],
  
  defaultFields: [
    { id: 'title', label: 'Notice Title', type: 'text', systemField: true, required: true, searchable: true, filterable: false, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, placeholder: 'e.g. Diwali Holiday, System Maintenance' },
    { id: 'content', label: 'Announcement Content', type: 'textarea', systemField: true, required: true, searchable: true, filterable: false, sortable: false, showOnCreate: true, showOnEdit: true, showOnView: true, placeholder: 'Enter full details of the announcement...' },
    { 
      id: 'priority', 
      label: 'Notice Priority', 
      type: 'dropdown', 
      options: [
        { label: 'Normal', value: 'Normal' },
        { label: 'High', value: 'High' },
        { label: 'Urgent', value: 'Urgent' }
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
    { id: 'targetDept', label: 'Target Department / Audience', type: 'text', systemField: true, required: false, searchable: true, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, placeholder: 'e.g. All, Operations, Sales, Engineering' },
    { id: 'author', label: 'Posted By', type: 'text', systemField: true, required: false, searchable: true, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, placeholder: 'e.g. Admin / HR Team' }
  ],
  
  defaultSummaryWidgets: [
    { id: 'total_notices', label: 'TOTAL ANNOUNCEMENTS', metricType: 'TOTAL', bg: 'rgba(13, 148, 136, 0.1)', color: '#0d9488', icon: '🔔', enabled: true, order: 1 },
    { id: 'urgent_notices', label: 'URGENT NOTICES', metricType: 'COUNT_URGENT', bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', icon: '🚨', enabled: true, order: 2 },
    { id: 'general_notices', label: 'GENERAL BROADCASTS', metricType: 'COUNT_GENERAL', bg: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', icon: '📢', enabled: true, order: 3 }
  ],
  
  defaultColumns: [
    { id: 'title', fieldKey: 'title', label: 'Notice Title', visible: true, width: '260px', align: 'left', sortable: true, sortOrder: 1 },
    { id: 'priority', fieldKey: 'priority', label: 'Notice Priority', visible: true, width: '150px', align: 'left', sortable: true, sortOrder: 2 },
    { id: 'targetDept', fieldKey: 'targetDept', label: 'Audience / Department', visible: true, width: '180px', align: 'left', sortable: true, sortOrder: 3 },
    { id: 'author', fieldKey: 'author', label: 'Posted By', visible: true, width: '160px', align: 'left', sortable: true, sortOrder: 4 },
    { id: 'createdAt', fieldKey: 'createdAt', label: 'Date Posted', visible: true, width: '160px', align: 'left', sortable: true, sortOrder: 5 }
  ],
  
  defaultViews: {
    availableViews: ['list', 'kanban'],
    defaultView: 'list'
  },
  
  defaultStages: ['Normal', 'High', 'Urgent'],
  
  kanbanConfig: {
    groupByField: 'priority'
  }
};
