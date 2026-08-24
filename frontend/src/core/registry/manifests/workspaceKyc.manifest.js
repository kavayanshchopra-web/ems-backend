/**
 * WORKSPACE KYC & COMPLIANCE MODULE MANIFEST
 * System Manifest for Company KYC, GST & Commercial Telephony Verification
 */

import { MODULE_CATEGORIES, LICENSE_PLANS } from '../types';

export const WORKSPACE_KYC_MANIFEST = {
  moduleId: 'workspace_kyc',
  version: '1.0.0',
  minPlatformVersion: '1.0.0',
  name: 'Company KYC & Compliance',
  entityName: 'KYC Profile',
  description: 'Manage company business verification, GST registration proofs, authorized signatory KYC, and commercial telephony compliance.',
  category: 'System & Workspace Settings',
  icon: '🛡️',
  accentColor: '#0d9488',
  author: 'EMS Core Team',

  requiredLicensePlan: LICENSE_PLANS.COMMUNITY,
  isCoreModule: true,
  dependencies: [],

  routes: [
    {
      path: '/settings',
      componentKey: 'SettingsPage',
      exact: true,
      requiresAuth: true,
      requiredPermissions: ['settings.view']
    }
  ],

  navigation: [
    {
      id: 'nav_workspace_kyc',
      label: 'KYC Settings',
      icon: 'ShieldCheck',
      category: 'Settings',
      order: 10
    }
  ],

  permissions: [
    { key: 'kyc.view', name: 'View Business KYC', description: 'View company KYC verification status', defaultRoles: ['superadmin', 'owner', 'admin'] },
    { key: 'kyc.manage', name: 'Submit KYC Documents', description: 'Submit and update company KYC credentials', defaultRoles: ['superadmin', 'owner', 'admin'] }
  ],

  defaultFields: [
    // 1. Company Information
    { id: 'company_name', key: 'company_name', label: 'Registered Company Name', type: 'text', section: 'company', systemField: true, required: true, searchable: true, filterable: false, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, showOnList: true, placeholder: 'e.g. Acme Technologies Pvt Ltd', sortOrder: 1 },
    { id: 'country', key: 'country', label: 'Country', type: 'text', section: 'company', systemField: true, required: true, searchable: true, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, showOnList: true, defaultValue: 'India', placeholder: 'e.g. India', sortOrder: 2 },
    { id: 'state', key: 'state', label: 'State / Province', type: 'text', section: 'company', systemField: true, required: true, searchable: true, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, showOnList: true, placeholder: 'e.g. Punjab, Maharashtra, Delhi...', sortOrder: 3 },
    { id: 'pincode', key: 'pincode', label: 'PIN / Postal Code', type: 'text', section: 'company', systemField: true, required: true, searchable: true, filterable: false, sortable: false, showOnCreate: true, showOnEdit: true, showOnView: true, showOnList: true, placeholder: 'e.g. 141001', sortOrder: 4 },
    { id: 'address', key: 'address', label: 'Full Registered Office Address', type: 'textarea', section: 'company', systemField: true, required: true, searchable: true, filterable: false, sortable: false, showOnCreate: true, showOnEdit: true, showOnView: true, showOnList: true, placeholder: 'e.g. Plot No. 12, Cyber City, Sector 44', sortOrder: 5 },
    { id: 'gst_number', key: 'gst_number', label: 'GST Number / Tax ID', type: 'text', section: 'company', systemField: true, required: false, searchable: true, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, showOnList: true, placeholder: 'e.g. 03AQVPC8462H1ZL', sortOrder: 6 },
    { id: 'company_proof_url', key: 'company_proof_url', label: 'Company Proof (GST/MSME/COI)', type: 'file', section: 'company', systemField: true, required: false, searchable: false, filterable: false, sortable: false, showOnCreate: true, showOnEdit: true, showOnView: true, showOnList: false, placeholder: 'Upload GST Registration Certificate PDF or Image', sortOrder: 7 },

    // 2. Authorized Signatory Information
    { id: 'auth_person_name', key: 'auth_person_name', label: 'Signatory Legal Full Name', type: 'text', section: 'signatory', systemField: true, required: true, searchable: true, filterable: false, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, showOnList: true, placeholder: 'e.g. Rahul Sharma', sortOrder: 8 },
    { id: 'auth_person_email', key: 'auth_person_email', label: 'Signatory Official Email Address', type: 'email', section: 'signatory', systemField: true, required: true, searchable: true, filterable: true, sortable: true, showOnCreate: true, showOnEdit: true, showOnView: true, showOnList: true, placeholder: 'e.g. rahul@company.com', sortOrder: 9 },
    { id: 'auth_person_phone', key: 'auth_person_phone', label: 'Signatory Mobile Number', type: 'phone', section: 'signatory', systemField: true, required: true, searchable: true, filterable: true, sortable: false, showOnCreate: true, showOnEdit: true, showOnView: true, showOnList: true, placeholder: 'e.g. 9876543210', sortOrder: 10 },
    { id: 'auth_person_address', key: 'auth_person_address', label: 'Signatory Residential / Official Address', type: 'textarea', section: 'signatory', systemField: true, required: true, searchable: true, filterable: false, sortOrder: 11, showOnCreate: true, showOnEdit: true, showOnView: true, placeholder: 'e.g. House No. 45, Green Avenue' },
    { id: 'profile_photo_url', key: 'profile_photo_url', label: 'Signatory Profile / Passport Photo', type: 'image', section: 'signatory', systemField: true, required: false, searchable: false, filterable: false, sortOrder: 12, showOnCreate: true, showOnEdit: true, showOnView: true, placeholder: 'Upload Signatory Photo' },
    { id: 'id_proof_url', key: 'id_proof_url', label: 'Signatory ID Proof (Aadhaar / PAN Card)', type: 'file', section: 'signatory', systemField: true, required: false, searchable: false, filterable: false, sortOrder: 13, showOnCreate: true, showOnEdit: true, showOnView: true, placeholder: 'Upload Aadhaar Card or PAN Card PDF/Image' }
  ],

  defaultSummaryWidgets: [
    { id: 'kyc_status', label: 'KYC VERIFICATION STATUS', metricType: 'TOTAL', bg: 'rgba(13, 148, 136, 0.1)', color: '#0d9488', icon: '🛡️', enabled: true, sortOrder: 1 },
    { id: 'telephony_access', label: 'TELEPHONY ACCESS', metricType: 'ACTIVE_COUNT', bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981', icon: '📞', enabled: true, sortOrder: 2 },
    { id: 'compliance_mode', label: 'REGULATORY COMPLIANCE', metricType: 'ACTIVE_COUNT', bg: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', icon: '⚖️', enabled: true, sortOrder: 3 }
  ],

  defaultColumns: [
    { id: 'company_name', label: 'Company Name', visible: true, fieldKey: 'company_name', width: '220px', align: 'left', sortOrder: 1 },
    { id: 'gst_number', label: 'GST Number', visible: true, fieldKey: 'gst_number', width: '160px', align: 'left', sortOrder: 2 },
    { id: 'auth_person_name', label: 'Signatory Name', visible: true, fieldKey: 'auth_person_name', width: '160px', align: 'left', sortOrder: 3 },
    { id: 'auth_person_phone', label: 'Signatory Phone', visible: true, fieldKey: 'auth_person_phone', width: '140px', align: 'left', sortOrder: 4 },
    { id: 'state', label: 'State', visible: true, fieldKey: 'state', width: '120px', align: 'left', sortOrder: 5 }
  ],

  defaultViews: {
    availableViews: ['form'],
    defaultView: 'form',
    list: true,
    kanban: false,
    calendar: false,
    timeline: false,
    gallery: false,
    tree: false,
    gantt: false,
    map: false
  },

  defaultBulkActions: {
    selectAll: false,
    archive: false,
    restore: false,
    duplicate: false,
    delete: false
  },

  defaultStages: [
    { id: 'not_submitted', key: 'NOT_SUBMITTED', name: 'Not Submitted', emoji: '⚪', color: '#64748b', semanticType: 'DRAFT', sortOrder: 1 },
    { id: 'pending', key: 'PENDING', name: 'Pending Review', emoji: '🟡', color: '#f59e0b', semanticType: 'REVIEW', sortOrder: 2 },
    { id: 'verified', key: 'VERIFIED', name: 'Verified', emoji: '🟢', color: '#10b981', semanticType: 'APPROVED', sortOrder: 3 },
    { id: 'rejected', key: 'REJECTED', name: 'Action Required', emoji: '🔴', color: '#ef4444', semanticType: 'REJECTED', sortOrder: 4 }
  ]
};