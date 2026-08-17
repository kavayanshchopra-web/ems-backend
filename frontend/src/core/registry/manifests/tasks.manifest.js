/**
 * TASKS BOARD MODULE MANIFEST
 * System Manifest for Tasks Board Module
 */

import { MODULE_CATEGORIES, LICENSE_PLANS } from '../types';

export const TASKS_MANIFEST = {
  moduleId: 'tasks',
  version: '1.0.0',
  minPlatformVersion: '1.0.0',
  name: 'Tasks Board',
  description: 'Assign, track, and manage team task workloads with interactive Kanban boards.',
  category: MODULE_CATEGORIES?.OPERATIONS || 'OPERATIONS',
  icon: '📋',
  accentColor: '#0d9488',
  author: 'EMS Core Team',
  
  requiredLicensePlan: LICENSE_PLANS?.STARTER || 'STARTER',
  isCoreModule: true,
  dependencies: [],
  
  routes: [
    {
      path: '/tasks',
      componentKey: 'TasksView',
      exact: true,
      requiresAuth: true,
      requiredPermissions: ['tasks.view']
    }
  ],
  
  navigation: [
    {
      id: 'nav_tasks',
      label: 'Tasks Board',
      icon: 'ClipboardList',
      category: 'Operations',
      order: 1
    }
  ],
  
  permissions: [
    { key: 'tasks.view', name: 'View Tasks Board', description: 'Access team tasks and workload board', defaultRoles: ['superadmin', 'owner', 'admin', 'manager', 'employee', 'agent'] },
    { key: 'tasks.create', name: 'Assign New Task', description: 'Create and assign new tasks to team members', defaultRoles: ['superadmin', 'owner', 'admin', 'manager', 'employee', 'agent'] },
    { key: 'tasks.edit', name: 'Edit / Move Tasks', description: 'Update task details or change stage status', defaultRoles: ['superadmin', 'owner', 'admin', 'manager', 'employee', 'agent'] },
    { key: 'tasks.delete', name: 'Delete Tasks', description: 'Remove tasks from board', defaultRoles: ['superadmin', 'owner', 'admin', 'manager'] }
  ],
  
  defaultFields: [
    { id: 'title', label: 'Task Title', type: 'text', systemField: true, required: true, searchable: true, filterable: false, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, placeholder: 'e.g. Update Monthly Attendance Logs, Audit Lead Pipeline' },
    { id: 'description', label: 'Detailed Description', type: 'textarea', systemField: true, required: false, searchable: true, filterable: false, sortable: false, showOnCreate: true, showOnEdit: true, showOnView: true, placeholder: 'Enter complete task details and requirements...' },
    { 
      id: 'assignedTo', 
      label: 'Assigned To (Employee)', 
      type: 'dropdown', 
      optionsSource: 'employees', 
      systemField: true, 
      required: false, 
      searchable: true, 
      filterable: true, 
      sortable: true, 
      showOnCreate: true, 
      showOnEdit: true, 
      showOnView: true, 
      placeholder: 'Select Assigned Employee' 
    },
    { 
      id: 'priority', 
      label: 'Priority Level', 
      type: 'dropdown', 
      options: [
        { label: 'Low', value: 'Low' },
        { label: 'Medium', value: 'Medium' },
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
    { 
      id: 'status', 
      label: 'Task Status / Stage', 
      type: 'dropdown', 
      options: [
        { label: 'To Do', value: 'To Do' },
        { label: 'In Progress', value: 'In Progress' },
        { label: 'Review', value: 'Review' },
        { label: 'Completed', value: 'Completed' }
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
    { id: 'dueDate', label: 'Due Date', type: 'date', systemField: true, required: false, searchable: true, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true },
    { id: 'category', label: 'Category / Tag', type: 'text', systemField: true, required: false, searchable: true, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, placeholder: 'e.g. Operations, IT, Sales, Support' }
  ],
  
  defaultSummaryWidgets: [
    { id: 'total_tasks', label: 'TOTAL TASKS', metricType: 'TOTAL', bg: 'rgba(13, 148, 136, 0.1)', color: '#0d9488', icon: '📋', enabled: true, order: 1 },
    { id: 'in_progress_tasks', label: 'IN PROGRESS', metricType: 'COUNT_IN_PROGRESS', bg: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', icon: '⚡', enabled: true, order: 2 },
    { id: 'completed_tasks', label: 'COMPLETED', metricType: 'COUNT_COMPLETED', bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981', icon: '✅', enabled: true, order: 3 },
    { id: 'urgent_tasks', label: 'URGENT PRIORITIES', metricType: 'COUNT_URGENT', bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', icon: '🚨', enabled: true, order: 4 }
  ],
  
  defaultColumns: [
    { id: 'title', fieldKey: 'title', label: 'Task Title', visible: true, width: '260px', align: 'left', sortable: true, sortOrder: 1 },
    { id: 'assignedTo', fieldKey: 'assignedTo', label: 'Assigned Employee', visible: true, width: '180px', align: 'left', sortable: true, sortOrder: 2 },
    { id: 'priority', fieldKey: 'priority', label: 'Priority', visible: true, width: '130px', align: 'left', sortable: true, sortOrder: 3 },
    { id: 'status', fieldKey: 'status', label: 'Status / Stage', visible: true, width: '150px', align: 'left', sortable: true, sortOrder: 4 },
    { id: 'dueDate', fieldKey: 'dueDate', label: 'Due Date', visible: true, width: '140px', align: 'left', sortable: true, sortOrder: 5 }
  ],
  
  defaultViews: {
    availableViews: ['kanban', 'list'],
    defaultView: 'kanban'
  },
  
  defaultStages: ['To Do', 'In Progress', 'Review', 'Completed'],
  
  kanbanConfig: {
    groupByField: 'status'
  }
};
