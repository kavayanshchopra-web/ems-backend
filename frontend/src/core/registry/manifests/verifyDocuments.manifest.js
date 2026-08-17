/**
 * VERIFY DOCUMENTS MODULE MANIFEST
 * System Manifest for Employee Document Verification & KYC Module
 */

import { MODULE_CATEGORIES, LICENSE_PLANS } from '../types';

export const VERIFY_DOCUMENTS_MANIFEST = {
  moduleId: 'verify_documents',
  version: '1.0.0',
  minPlatformVersion: '1.0.0',
  name: 'Verify Documents',
  entityName: 'Document Checklist',
  entityNamePlural: 'Document Checklists',
  description: 'Audit employee KYC files, Aadhaar, PAN, Bank Passbook, Degree Certificates, and verification status.',
  category: MODULE_CATEGORIES.HR,
  icon: '📄',
  accentColor: '#0d9488',
  author: 'EMS Core Team',
  
  requiredLicensePlan: LICENSE_PLANS.COMMUNITY,
  isCoreModule: true,
  dependencies: [],

  idConfig: {
    prefix: 'KYC',
    pattern: 'KYC-0001',
    nextSeq: 1
  },

  routes: [
    {
      path: '/verify-documents',
      componentKey: 'VerifyDocumentsView',
      exact: true,
      requiresAuth: true,
      requiredPermissions: ['verify_documents.view']
    }
  ],

  navigation: [
    {
      id: 'nav_verify_documents',
      label: 'Verify Documents',
      icon: 'FileText',
      category: 'Organization HR',
      order: 5
    }
  ],

  permissions: [
    { key: 'verify_documents.view', name: 'View Verification Checklists', description: 'Access document verification roster', defaultRoles: ['superadmin', 'owner', 'admin', 'manager', 'employee'] },
    { key: 'verify_documents.manage', name: 'Manage & Verify Documents', description: 'Approve or reject employee KYC files', defaultRoles: ['superadmin', 'owner', 'admin', 'manager'] }
  ],

  defaultFields: [
    { id: 'name', key: 'name', label: 'Employee Name', type: 'text', systemField: true, required: true, searchable: true, filterable: false, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, showOnList: true, showOnKanban: true, placeholder: 'e.g. Rahul Sharma', sortOrder: 1 },
    { id: 'aadharCard', key: 'aadharCard', label: 'Aadhaar Card', type: 'dropdown', options: ['✓ Verified', '⏳ Pending', '❌ Rejected', '📂 Missing'], systemField: true, required: true, searchable: true, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, showOnList: true, showOnKanban: true, defaultValue: '✓ Verified', sortOrder: 2 },
    { id: 'panCard', key: 'panCard', label: 'PAN Card', type: 'dropdown', options: ['✓ Verified', '⏳ Pending', '❌ Rejected', '📂 Missing'], systemField: true, required: true, searchable: true, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, showOnList: true, showOnKanban: true, defaultValue: '✓ Verified', sortOrder: 3 },
    { id: 'bankPassbook', key: 'bankPassbook', label: 'Bank Passbook', type: 'dropdown', options: ['✓ Verified', '⏳ Pending', '❌ Rejected', '📂 Missing'], systemField: true, required: true, searchable: true, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, showOnList: true, showOnKanban: true, defaultValue: '⏳ Pending', sortOrder: 4 },
    { id: 'degreeCert', key: 'degreeCert', label: 'Degree Certificate', type: 'dropdown', options: ['✓ Verified', '⏳ Pending', '❌ Rejected', '📂 Missing'], systemField: true, required: true, searchable: true, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, showOnList: true, showOnKanban: true, defaultValue: '✓ Verified', sortOrder: 5 },
    { id: 'status', key: 'status', label: 'Verification Status', type: 'dropdown', options: ['Fully Verified', 'Pending Review', 'Action Required'], systemField: true, required: true, searchable: true, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, showOnList: true, showOnKanban: true, defaultValue: 'Pending Review', sortOrder: 6 }
  ],

  defaultSummaryWidgets: [
    { id: 'total_profiles', label: 'MONITORED PROFILES', metricType: 'TOTAL', bg: 'rgba(13, 148, 136, 0.1)', color: '#0d9488', icon: '📋', enabled: true, sortOrder: 1 },
    { id: 'fully_verified', label: 'FULLY VERIFIED', metricType: 'STAGE_COUNT', stageName: 'Fully Verified', bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981', icon: '✅', enabled: true, sortOrder: 2 },
    { id: 'pending_review', label: 'PENDING REVIEW', metricType: 'STAGE_COUNT', stageName: 'Pending Review', bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', icon: '⏳', enabled: true, sortOrder: 3 }
  ],

  defaultColumns: [
    { id: 'name', label: 'Employee Name', visible: true, fieldKey: 'name', width: '220px', align: 'left', sortOrder: 1 },
    { id: 'aadharCard', label: 'Aadhaar Card', visible: true, fieldKey: 'aadharCard', width: '160px', align: 'left', sortOrder: 2 },
    { id: 'panCard', label: 'PAN Card', visible: true, fieldKey: 'panCard', width: '160px', align: 'left', sortOrder: 3 },
    { id: 'bankPassbook', label: 'Bank Passbook', visible: true, fieldKey: 'bankPassbook', width: '160px', align: 'left', sortOrder: 4 },
    { id: 'degreeCert', label: 'Degree Certificate', visible: true, fieldKey: 'degreeCert', width: '160px', align: 'left', sortOrder: 5 },
    { id: 'status', label: 'Verification Status', visible: true, fieldKey: 'status', width: '160px', align: 'left', sortOrder: 6 }
  ],

  defaultViews: {
    availableViews: ['list'],
    defaultView: 'list',
    list: true,
    kanban: false
  },

  defaultLookupData: {
    document_status: ['✓ Verified', '⏳ Pending', '❌ Rejected', '📂 Missing'],
    verification_status: ['Fully Verified', 'Pending Review', 'Action Required']
  }
};
