/**
 * RECRUITMENT ATS REFERENCE MODULE MANIFEST
 * System Manifest for Recruitment ATS Module
 */

import { MODULE_CATEGORIES, LICENSE_PLANS } from '../types';

export const RECRUITMENT_ATS_MANIFEST = {
  moduleId: 'recruitment_ats',
  version: '1.0.0',
  minPlatformVersion: '1.0.0',
  name: 'Recruitment ATS',
  description: 'Complete candidate pipeline management, applicant tracking, and position requisition manager.',
  category: MODULE_CATEGORIES.HR_RECRUITMENT,
  icon: '🧑‍💼',
  accentColor: '#0d9488',
  author: 'EMS Core Team',
  
  requiredLicensePlan: LICENSE_PLANS.COMMUNITY,
  isCoreModule: true,
  dependencies: [],
  
  routes: [
    {
      path: '/ats',
      componentKey: 'RecruitmentAtsView',
      exact: true,
      requiresAuth: true,
      requiredPermissions: ['recruitment.view']
    }
  ],
  
  navigation: [
    {
      id: 'nav_ats',
      label: 'Recruitment ATS',
      icon: 'UserCheck',
      category: 'Recruitment ATS',
      order: 1
    }
  ],
  
  permissions: [
    { key: 'recruitment.view', name: 'View ATS Candidate Roster', description: 'Access Recruitment ATS candidates and views', defaultRoles: ['superadmin', 'owner', 'admin', 'manager', 'employee'] },
    { key: 'recruitment.create', name: 'Add Candidates', description: 'Register new candidates into ATS pipeline', defaultRoles: ['superadmin', 'owner', 'admin', 'manager'] },
    { key: 'recruitment.edit', name: 'Edit Candidates & Move Stages', description: 'Modify candidate profile details and drag pipeline stages', defaultRoles: ['superadmin', 'owner', 'admin', 'manager'] },
    { key: 'recruitment.archive', name: 'Archive Candidates', description: 'Soft delete candidates to Recycle Bin', defaultRoles: ['superadmin', 'owner', 'admin', 'manager'] },
    { key: 'recruitment.config', name: 'Configure ATS Module', description: 'Modify ATS module configuration and position requisitions', defaultRoles: ['superadmin', 'owner', 'admin'] }
  ],
  
  defaultFields: [
    { id: 'name', label: 'Candidate Name', type: 'text', systemField: true, required: true, searchable: true, filterable: false, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, placeholder: 'e.g. Vikram Sharma' },
    { id: 'position', label: 'Position / Applied For', type: 'dropdown', optionsSource: 'departments', systemField: true, required: true, searchable: true, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, placeholder: 'Select Position...' },
    { id: 'email', label: 'Email Address', type: 'email', systemField: true, required: false, searchable: true, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, placeholder: 'e.g. vikram@example.com' },
    { id: 'phone', label: 'Phone Number', type: 'phone', systemField: true, required: false, searchable: true, filterable: true, sortable: false, showOnCreate: true, showOnEdit: true, showOnView: true, placeholder: 'e.g. +91 9876543210' },
    { id: 'status', label: 'Pipeline Stage', type: 'dropdown', optionsSource: 'ats_stages', systemField: true, required: true, searchable: true, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true },
    { id: 'resume', label: 'Resume Document', type: 'file', systemField: true, required: false, searchable: true, filterable: false, sortable: false, showOnCreate: true, showOnEdit: true, showOnView: true }
  ],
  
  defaultSummaryWidgets: [
    { id: 'total_applicants', label: 'TOTAL APPLICANTS', metricType: 'TOTAL', bg: 'rgba(13, 148, 136, 0.1)', color: '#0d9488', icon: '👥', enabled: true, order: 1 },
    { id: 'interviewing', label: 'INTERVIEWING', metricType: 'SEMANTIC', semanticGroup: 'INTERVIEW', bg: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', icon: '🗣️', enabled: true, order: 2 },
    { id: 'offers_extended', label: 'OFFERS EXTENDED', metricType: 'SEMANTIC', semanticGroup: 'OFFER', bg: 'rgba(217, 119, 6, 0.1)', color: '#d97706', icon: '📋', enabled: true, order: 3 },
    { id: 'hired', label: 'HIRED', metricType: 'SEMANTIC', semanticGroup: 'HIRED', bg: 'rgba(5, 150, 105, 0.1)', color: '#059669', icon: '✅', enabled: true, order: 4 }
  ],
  
  defaultColumns: [
    { id: 'candidate', label: 'Candidate Name', visible: true, fieldKey: 'name', order: 1 },
    { id: 'position', label: 'Position', visible: true, fieldKey: 'position', order: 2 },
    { id: 'contact', label: 'Contact Details', visible: true, fieldKey: 'contact', order: 3 },
    { id: 'stage', label: 'Stage / Status', visible: true, fieldKey: 'status', order: 4 },
    { id: 'resume', label: 'Resume', visible: true, fieldKey: 'resume', order: 5 },
    { id: 'createdAt', label: 'Applied Date', visible: true, fieldKey: 'createdAt', order: 6 }
  ],
  
  defaultViews: {
    availableViews: ['kanban', 'list'],
    defaultView: 'kanban',
    list: true,
    kanban: true,
    calendar: false,
    timeline: false,
    gallery: false,
    tree: false,
    gantt: false,
    map: false
  },
  
  defaultStages: [
    { id: 'applied', key: 'APPLIED', name: 'Applied', emoji: '📥', color: '#0d9488', semanticType: 'APPLIED', sortOrder: 1 },
    { id: 'interviewing', key: 'INTERVIEWING', name: 'Interviewing', emoji: '🗣️', color: '#2563eb', semanticType: 'INTERVIEW', sortOrder: 2 },
    { id: 'offered', key: 'OFFERED', name: 'Offered', emoji: '📋', color: '#d97706', semanticType: 'OFFER', sortOrder: 3 },
    { id: 'hired', key: 'HIRED', name: 'Hired', emoji: '✅', color: '#059669', semanticType: 'HIRED', sortOrder: 4 }
  ]
};
