/**
 * CRM DEALS MODULE MANIFEST
 * System Manifest for CRM Deals Module
 */

import { MODULE_CATEGORIES, LICENSE_PLANS } from '../types';

export const CRM_DEALS_MANIFEST = {
  moduleId: 'crm_deals',
  version: '1.0.0',
  minPlatformVersion: '1.0.0',
  name: 'CRM Sales Deals',
  description: 'Manage sales deals, lead pipelines, deal amounts, and revenue forecasts.',
  category: MODULE_CATEGORIES.CRM_SALES,
  icon: '💼',
  accentColor: '#2563eb',
  author: 'EMS Core Team',
  
  requiredLicensePlan: LICENSE_PLANS.PRO,
  isCoreModule: false,
  dependencies: [],
  
  routes: [
    {
      path: '/crm',
      componentKey: 'CrmDealsView',
      exact: true,
      requiresAuth: true,
      requiredPermissions: ['crm.view']
    }
  ],
  
  navigation: [
    {
      id: 'nav_crm',
      label: 'CRM Sales Deals',
      icon: 'Briefcase',
      category: 'Sales & CRM',
      order: 2
    }
  ],
  
  permissions: [
    { key: 'crm.view', name: 'View Sales Deals', description: 'Access CRM sales deals and pipeline', defaultRoles: ['superadmin', 'owner', 'admin', 'manager'] },
    { key: 'crm.create', name: 'Create Deals', description: 'Register new sales deals', defaultRoles: ['superadmin', 'owner', 'admin', 'manager'] },
    { key: 'crm.edit', name: 'Edit Deals', description: 'Update deal values and move pipeline stages', defaultRoles: ['superadmin', 'owner', 'admin', 'manager'] }
  ],
  
  defaultFields: [
    { id: 'name', label: 'Deal Title', type: 'text', systemField: true, required: true, searchable: true, filterable: false, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, placeholder: 'e.g. Acme Corp Enterprise License' },
    { id: 'amount', label: 'Deal Amount', type: 'currency', systemField: true, required: true, searchable: true, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, placeholder: 'e.g. 50000' },
    { id: 'contact', label: 'Contact Person', type: 'text', systemField: true, required: false, searchable: true, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, placeholder: 'e.g. John Doe' },
    { id: 'email', label: 'Contact Email', type: 'email', systemField: true, required: false, searchable: true, filterable: true, sortable: false, showOnCreate: true, showOnEdit: true, showOnView: true, placeholder: 'e.g. john@acme.com' },
    { id: 'status', label: 'Deal Stage', type: 'dropdown', optionsSource: 'crm_stages', systemField: true, required: true, searchable: true, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true }
  ],
  
  defaultSummaryWidgets: [
    { id: 'total_deals', label: 'TOTAL DEALS', metricType: 'TOTAL', bg: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', icon: '💼', enabled: true, order: 1 },
    { id: 'leads', label: 'NEW LEADS', metricType: 'STAGE_COUNT', stageName: 'Lead Qualified', bg: 'rgba(13, 148, 136, 0.1)', color: '#0d9488', icon: '🎯', enabled: true, order: 2 },
    { id: 'won_deals', label: 'CLOSED WON', metricType: 'SEMANTIC', semanticGroup: 'WON', bg: 'rgba(5, 150, 105, 0.1)', color: '#059669', icon: '🎉', enabled: true, order: 3 },
    { id: 'lost_deals', label: 'CLOSED LOST', metricType: 'SEMANTIC', semanticGroup: 'LOST', bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', icon: '❌', enabled: true, order: 4 }
  ],
  
  defaultColumns: [
    { id: 'deal', label: 'Deal Title', visible: true, fieldKey: 'name', order: 1 },
    { id: 'amount', label: 'Amount', visible: true, fieldKey: 'amount', order: 2 },
    { id: 'contact', label: 'Contact', visible: true, fieldKey: 'contact', order: 3 },
    { id: 'stage', label: 'Pipeline Stage', visible: true, fieldKey: 'status', order: 4 },
    { id: 'createdAt', label: 'Created Date', visible: true, fieldKey: 'createdAt', order: 5 }
  ],
  
  defaultViews: {
    availableViews: ['kanban', 'list'],
    defaultView: 'kanban'
  },
  
  defaultStages: [
    { id: 'lead', key: 'LEAD', name: 'Lead Qualified', emoji: '🎯', color: '#0d9488', semanticType: 'QUALIFIED', sortOrder: 1 },
    { id: 'proposal', key: 'PROPOSAL', name: 'Proposal Sent', emoji: '📄', color: '#2563eb', semanticType: 'PROPOSAL', sortOrder: 2 },
    { id: 'negotiation', key: 'NEGOTIATION', name: 'In Negotiation', emoji: '🤝', color: '#d97706', semanticType: 'NEGOTIATION', sortOrder: 3 },
    { id: 'won', key: 'WON', name: 'Closed Won', emoji: '🎉', color: '#059669', semanticType: 'WON', sortOrder: 4 },
    { id: 'lost', key: 'LOST', name: 'Closed Lost', emoji: '❌', color: '#ef4444', semanticType: 'LOST', sortOrder: 5 }
  ]
};
