/**
 * CRM CONTACTS & LEADS REFERENCE MODULE MANIFEST
 * System Manifest for Central Contacts Hub with GoHighLevel 2-Way Sync
 */

import { MODULE_CATEGORIES, LICENSE_PLANS } from '../types';

export const CONTACTS_MANIFEST = {
  moduleId: 'contacts',
  version: '1.0.0',
  minPlatformVersion: '1.0.0',
  name: 'CRM Contacts & Leads',
  description: 'Manage centralized customer database, WhatsApp leads, SIM telecalling contacts, and GoHighLevel 2-way sync.',
  category: MODULE_CATEGORIES.CRM_SALES,
  icon: '👥',
  accentColor: '#0d9488',
  author: 'EMS Core Team',
  
  requiredLicensePlan: LICENSE_PLANS.COMMUNITY,
  isCoreModule: true,
  dependencies: [],
  idConfig: {
    prefix: 'CON',
    pattern: 'CON-0001',
    nextSeq: 1
  },
  
  routes: [
    {
      path: '/contacts',
      componentKey: 'ContactsPage',
      exact: true,
      requiresAuth: true,
      requiredPermissions: ['contacts.view']
    }
  ],
  
  navigation: [
    {
      id: 'nav_contacts',
      label: 'Contacts & Leads',
      icon: 'Users',
      category: 'CRM & SALES',
      order: 1
    }
  ],
  
  permissions: [
    { key: 'contacts.view', name: 'View Contacts Directory', description: 'Access CRM contacts roster, search and filters', defaultRoles: ['superadmin', 'owner', 'admin', 'manager', 'employee'] },
    { key: 'contacts.create', name: 'Add Contact', description: 'Create new contacts into CRM database', defaultRoles: ['superadmin', 'owner', 'admin', 'manager', 'employee'] },
    { key: 'contacts.edit', name: 'Edit Contact Details', description: 'Update contact info, tags, and custom fields', defaultRoles: ['superadmin', 'owner', 'admin', 'manager'] },
    { key: 'contacts.archive', name: 'Archive / Delete Contact', description: 'Soft delete contacts to Universal Recycle Bin', defaultRoles: ['superadmin', 'owner', 'admin'] },
    { key: 'contacts.config', name: 'Configure Contacts Module', description: 'Modify custom fields, column settings, and pipelines', defaultRoles: ['superadmin', 'owner', 'admin'] }
  ],
  
  defaultFields: [
    { id: 'name', label: 'Contact Name', type: 'text', systemField: true, required: true, searchable: true, filterable: false, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, placeholder: 'e.g. Rahul Sharma' },
    { id: 'phone', label: 'Phone Number', type: 'phone', systemField: true, required: true, searchable: true, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, placeholder: 'e.g. +91 9876543210' },
    { id: 'email', label: 'Email / Gmail ID', type: 'email', systemField: true, required: false, searchable: true, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, placeholder: 'e.g. rahul@example.com' },
    { id: 'tags', label: 'Tags / Labels', type: 'text', systemField: true, required: false, searchable: true, filterable: true, sortable: false, showOnCreate: true, showOnEdit: true, showOnView: true, placeholder: 'e.g. High Value, Facebook Ad, New Lead' },
    { id: 'status', label: 'Lead Stage', type: 'dropdown', optionsSource: 'crm_stages', systemField: true, required: true, searchable: true, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true },
    { id: 'source', label: 'Lead Source', type: 'dropdown', options: ['GoHighLevel', 'WhatsApp Inbound', 'SIM Dialer', 'Manual Entry', 'Website'], systemField: true, required: false, searchable: true, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true },
    { id: 'assignedTo', label: 'Assigned Agent', type: 'text', systemField: true, required: false, searchable: true, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, placeholder: 'e.g. Staff 1' },
    { id: 'notes', label: 'Contact Notes', type: 'textarea', systemField: true, required: false, searchable: true, filterable: false, sortable: false, showOnCreate: true, showOnEdit: true, showOnView: true, placeholder: 'e.g. Client interested in CRM Enterprise plan' }
  ],
  
  summaryWidgets: [
    { id: 'total_contacts', label: 'TOTAL CONTACTS', metricType: 'TOTAL', bg: 'rgba(13, 148, 136, 0.1)', color: '#0d9488', icon: '👥', enabled: true, order: 1 },
    { id: 'ghl_synced', label: 'GHL SYNCED', metricType: 'FILTER_COUNT', filterField: 'ghlContactId', bg: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', icon: '⚡', enabled: true, order: 2 },
    { id: 'whatsapp_leads', label: 'WHATSAPP LEADS', metricType: 'FILTER_COUNT', filterField: 'source', filterValue: 'WhatsApp Inbound', bg: 'rgba(5, 150, 105, 0.1)', color: '#059669', icon: '💬', enabled: true, order: 3 },
    { id: 'new_leads', label: 'NEW LEADS', metricType: 'STAGE_COUNT', stageName: 'New Lead', bg: 'rgba(217, 119, 6, 0.1)', color: '#d97706', icon: '🎯', enabled: true, order: 4 }
  ],
  defaultSummaryWidgets: [
    { id: 'total_contacts', label: 'TOTAL CONTACTS', metricType: 'TOTAL', bg: 'rgba(13, 148, 136, 0.1)', color: '#0d9488', icon: '👥', enabled: true, order: 1 },
    { id: 'ghl_synced', label: 'GHL SYNCED', metricType: 'FILTER_COUNT', filterField: 'ghlContactId', bg: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', icon: '⚡', enabled: true, order: 2 },
    { id: 'whatsapp_leads', label: 'WHATSAPP LEADS', metricType: 'FILTER_COUNT', filterField: 'source', filterValue: 'WhatsApp Inbound', bg: 'rgba(5, 150, 105, 0.1)', color: '#059669', icon: '💬', enabled: true, order: 3 },
    { id: 'new_leads', label: 'NEW LEADS', metricType: 'STAGE_COUNT', stageName: 'New Lead', bg: 'rgba(217, 119, 6, 0.1)', color: '#d97706', icon: '🎯', enabled: true, order: 4 }
  ],
  
  defaultColumns: [
    { id: 'name', label: 'Contact Name', visible: true, fieldKey: 'name', order: 1 },
    { id: 'phone', label: 'Phone Number', visible: true, fieldKey: 'phone', order: 2 },
    { id: 'email', label: 'Email Address', visible: true, fieldKey: 'email', order: 3 },
    { id: 'tags', label: 'Tags', visible: true, fieldKey: 'tags', order: 4 },
    { id: 'status', label: 'Pipeline Stage', visible: true, fieldKey: 'status', order: 5 },
    { id: 'source', label: 'Source', visible: true, fieldKey: 'source', order: 6 },
    { id: 'assignedTo', label: 'Assigned Agent', visible: true, fieldKey: 'assignedTo', order: 7 },
    { id: 'createdAt', label: 'Created At', visible: true, fieldKey: 'createdAt', order: 8 }
  ],
  
  defaultViews: {
    availableViews: ['list', 'kanban'],
    defaultView: 'list',
    list: true,
    kanban: true,
    calendar: false,
    timeline: false,
    gallery: false,
    tree: false,
    gantt: false,
    map: false
  },

  defaultBulkActions: {
    selectAll: true,
    archive: true,
    restore: true,
    duplicate: false,
    delete: true
  },
  
  defaultStages: [
    { id: 'new_lead', key: 'NEW_LEAD', name: 'New Lead', emoji: '🎯', color: '#0d9488', semanticType: 'QUALIFIED', sortOrder: 1 },
    { id: 'contacted', key: 'CONTACTED', name: 'Contacted', emoji: '📞', color: '#2563eb', semanticType: 'PROPOSAL', sortOrder: 2 },
    { id: 'interested', key: 'INTERESTED', name: 'Interested', emoji: '⭐', color: '#d97706', semanticType: 'NEGOTIATION', sortOrder: 3 },
    { id: 'customer', key: 'CUSTOMER', name: 'Customer / Won', emoji: '🎉', color: '#059669', semanticType: 'WON', sortOrder: 4 },
    { id: 'unqualified', key: 'UNQUALIFIED', name: 'Unqualified / Lost', emoji: '❌', color: '#ef4444', semanticType: 'LOST', sortOrder: 5 }
  ]
};
