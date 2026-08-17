/**
 * TELECALLING & CALL RECORDINGS MODULE MANIFEST
 * System Manifest for Call Recordings & SIM Sync Module
 */

import { MODULE_CATEGORIES, LICENSE_PLANS } from '../types';

export const TELECALLING_MANIFEST = {
  moduleId: 'telecalling',
  version: '1.0.0',
  minPlatformVersion: '1.0.0',
  name: 'Call Recordings Directory',
  entityName: 'Call Log',
  description: 'Manage GSM mobile SIM call recordings, VoIP calls, lead dispositions, and telecaller logs.',
  category: MODULE_CATEGORIES.CRM_SALES,
  icon: '📞',
  accentColor: '#0d9488',
  author: 'EMS Core Team',
  
  requiredLicensePlan: LICENSE_PLANS.COMMUNITY,
  isCoreModule: true,
  dependencies: [],

  routes: [
    {
      path: '/telecalling',
      componentKey: 'TelecallingView',
      exact: true,
      requiresAuth: true,
      requiredPermissions: ['telecalling.view']
    }
  ],

  navigation: [
    {
      id: 'nav_telecalling',
      label: 'Call Recordings & SIM Sync',
      icon: 'PhoneCall',
      category: 'CRM & Sales',
      order: 4
    }
  ],

  permissions: [
    { key: 'telecalling.view', name: 'View Call Directory', description: 'Access call logs and recordings', defaultRoles: ['superadmin', 'owner', 'admin', 'manager', 'employee'] },
    { key: 'telecalling.manage', name: 'Manage Call Logs', description: 'Add, edit, or remove call records', defaultRoles: ['superadmin', 'owner', 'admin'] }
  ],

  defaultFields: [
    { id: 'name', key: 'name', label: 'Lead / Customer', type: 'text', systemField: true, required: true, searchable: true, filterable: false, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, showOnList: true, placeholder: 'e.g. Priya Sharma', sortOrder: 1 },
    { id: 'agentName', key: 'agentName', label: 'Telecaller Agent', type: 'text', systemField: true, required: true, searchable: true, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, showOnList: true, placeholder: 'e.g. Rahul Verma', sortOrder: 2 },
    { id: 'phone', key: 'phone', label: 'Phone Number', type: 'phone', systemField: true, required: true, searchable: true, filterable: true, sortable: false, showOnCreate: true, showOnEdit: true, showOnView: true, showOnList: true, placeholder: 'e.g. +91 9876543210', sortOrder: 3 },
    { id: 'channel', key: 'channel', label: 'Channel', type: 'dropdown', options: ['SIM', 'WHATSAPP'], systemField: true, required: true, searchable: true, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, showOnList: true, defaultValue: 'SIM', sortOrder: 4 },
    { id: 'type', key: 'type', label: 'Call Type', type: 'dropdown', options: ['OUTGOING', 'INCOMING', 'MISSED', 'REJECTED'], systemField: true, required: true, searchable: true, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, showOnList: true, defaultValue: 'OUTGOING', sortOrder: 5 },
    { id: 'duration', key: 'duration', label: 'Duration', type: 'text', systemField: true, required: false, searchable: false, filterable: false, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, showOnList: true, placeholder: 'e.g. 2m 45s', sortOrder: 6 },
    { id: 'recording', key: 'recording', label: 'Audio Recording', type: 'audio', systemField: true, required: false, searchable: false, filterable: false, sortable: false, showOnCreate: false, showOnEdit: true, showOnView: true, showOnList: true, sortOrder: 7 },
    { id: 'status', key: 'status', label: 'Call Disposition', type: 'dropdown', optionsSource: 'status', options: ['Interested', 'Demo Scheduled', 'Follow-up Required', 'Deal Closed', 'Not Interested'], systemField: true, required: true, searchable: true, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, showOnList: true, defaultValue: 'Interested', sortOrder: 8 }
  ],

  defaultSummaryWidgets: [
    { id: 'total_calls', label: 'TOTAL CALLS', metricType: 'TOTAL', bg: 'rgba(13, 148, 136, 0.1)', color: '#0d9488', icon: '📞', enabled: true, sortOrder: 1 },
    { id: 'interested_calls', label: 'INTERESTED LEADS', metricType: 'STAGE_COUNT', stageName: 'Interested', bg: 'rgba(5, 150, 105, 0.1)', color: '#059669', icon: '🎯', enabled: true, sortOrder: 2 },
    { id: 'followup_calls', label: 'FOLLOW-UP QUEUED', metricType: 'STAGE_COUNT', stageName: 'Follow-up Required', bg: 'rgba(217, 119, 6, 0.1)', color: '#d97706', icon: '⏰', enabled: true, sortOrder: 3 }
  ],

  defaultColumns: [
    { id: 'name', label: 'Customer / Lead', visible: true, fieldKey: 'name', width: '200px', align: 'left', sortOrder: 1 },
    { id: 'agentName', label: 'Telecaller Agent', visible: true, fieldKey: 'agentName', width: '180px', align: 'left', sortOrder: 2 },
    { id: 'phone', label: 'Phone Number', visible: true, fieldKey: 'phone', width: '150px', align: 'left', sortOrder: 3 },
    { id: 'channel', label: 'Channel', visible: true, fieldKey: 'channel', width: '120px', align: 'left', sortOrder: 4 },
    { id: 'type', label: 'Call Type', visible: true, fieldKey: 'type', width: '120px', align: 'left', sortOrder: 5 },
    { id: 'duration', label: 'Duration', visible: true, fieldKey: 'duration', width: '110px', align: 'left', sortOrder: 6 },
    { id: 'recording', label: 'Audio Recording', visible: true, fieldKey: 'recording', width: '210px', align: 'left', sortOrder: 7 },
    { id: 'status', label: 'Call Disposition', visible: true, fieldKey: 'status', width: '160px', align: 'left', sortOrder: 8 }
  ],

  defaultViews: {
    availableViews: ['list'],
    defaultView: 'list',
    list: true,
    kanban: false
  },

  defaultBulkActions: {
    selectAll: true,
    archive: true,
    restore: true,
    duplicate: true,
    delete: true
  },

  defaultLookupData: {
    status: ['Interested', 'Demo Scheduled', 'Follow-up Required', 'Deal Closed', 'Not Interested']
  },

  defaultStages: [
    { id: 'interested', key: 'INTERESTED', name: 'Interested', emoji: '🎯', color: '#059669', semanticType: 'ACTIVE', sortOrder: 1 },
    { id: 'demo_scheduled', key: 'DEMO_SCHEDULED', name: 'Demo Scheduled', emoji: '📅', color: '#2563eb', semanticType: 'ACTIVE', sortOrder: 2 },
    { id: 'followup_required', key: 'FOLLOWUP_REQUIRED', name: 'Follow-up Required', emoji: '⏰', color: '#d97706', semanticType: 'ACTIVE', sortOrder: 3 },
    { id: 'deal_closed', key: 'DEAL_CLOSED', name: 'Deal Closed', emoji: '🎉', color: '#10b981', semanticType: 'ACTIVE', sortOrder: 4 },
    { id: 'not_interested', key: 'NOT_INTERESTED', name: 'Not Interested', emoji: '❌', color: '#ef4444', semanticType: 'EXITED', sortOrder: 5 }
  ],

  defaultIdConfig: {
    prefix: 'CALL',
    pattern: 'CALL-0001',
    nextSeq: 1
  }
};
