/**
 * Global EMS Configuration Engine — Recruitment ATS Module Configuration Schema
 * Tenant-scoped schema definitions for fields, widgets, columns, kanban cards, and views.
 */

import FirebaseCloudEngine from '../core/engines/FirebaseCloudEngine';

export const SCHEMA_VERSION = '1.1';

export const DEFAULT_ATS_FIELDS = [
  {
    id: 'name',
    key: 'name',
    label: 'Candidate Name',
    type: 'text',
    required: true,
    defaultValue: '',
    placeholder: 'Enter candidate name',
    helpText: 'Full legal name of candidate',
    options: [],
    showOnCreate: true,
    showOnEdit: true,
    showOnView: true,
    showOnList: true,
    showOnKanban: true,
    searchable: true,
    filterable: false,
    systemField: true,
    sortOrder: 1,
    archived: false,
    deleted: false
  },
  {
    id: 'position',
    key: 'position',
    label: 'Position / Applied For',
    type: 'dropdown',
    optionsSource: 'designations',
    required: true,
    defaultValue: '',
    placeholder: 'Select job position',
    helpText: 'Job requisition or role applied for',
    options: [],
    showOnCreate: true,
    showOnEdit: true,
    showOnView: true,
    showOnList: true,
    showOnKanban: true,
    searchable: true,
    filterable: true,
    systemField: true,
    sortOrder: 2,
    archived: false,
    deleted: false
  },
  {
    id: 'status',
    key: 'status',
    label: 'Pipeline Stage',
    type: 'dropdown',
    optionsSource: 'ats_stages',
    required: true,
    defaultValue: 'Applied',
    placeholder: 'Select stage',
    helpText: 'Current recruitment pipeline stage',
    options: [],
    showOnCreate: true,
    showOnEdit: true,
    showOnView: true,
    showOnList: true,
    showOnKanban: true,
    searchable: false,
    filterable: true,
    systemField: true,
    sortOrder: 3,
    archived: false,
    deleted: false
  },
  {
    id: 'email',
    key: 'email',
    label: 'Email Address',
    type: 'email',
    required: false,
    defaultValue: '',
    placeholder: 'e.g. candidate@example.com',
    helpText: 'Primary contact email address',
    options: [],
    showOnCreate: true,
    showOnEdit: true,
    showOnView: true,
    showOnList: true,
    showOnKanban: true,
    searchable: true,
    filterable: true,
    systemField: true,
    sortOrder: 4,
    archived: false,
    deleted: false
  },
  {
    id: 'phone',
    key: 'phone',
    label: 'Phone Number',
    type: 'phone',
    required: false,
    defaultValue: '',
    placeholder: 'e.g. +1 555-0192',
    helpText: 'Direct phone or WhatsApp number',
    options: [],
    showOnCreate: true,
    showOnEdit: true,
    showOnView: true,
    showOnList: true,
    showOnKanban: true,
    searchable: true,
    filterable: true,
    systemField: true,
    sortOrder: 5,
    archived: false,
    deleted: false
  },
  {
    id: 'resume',
    key: 'resume',
    label: 'Resume / CV Document',
    type: 'file',
    required: false,
    defaultValue: '',
    placeholder: 'Upload candidate resume',
    helpText: 'PDF or Word document CV file',
    options: [],
    showOnCreate: true,
    showOnEdit: true,
    showOnView: true,
    showOnList: true,
    showOnKanban: true,
    searchable: true,
    filterable: false,
    systemField: true,
    sortOrder: 6,
    archived: false,
    deleted: false
  }
];

export const DEFAULT_ATS_SUMMARY_WIDGETS = [
  {
    id: 'total_applicants',
    label: 'TOTAL APPLICANTS',
    metricType: 'TOTAL',
    bg: 'rgba(13, 148, 136, 0.1)',
    color: '#0d9488',
    icon: '👥',
    enabled: true,
    sortOrder: 1
  },
  {
    id: 'interviewing',
    label: 'INTERVIEWING',
    metricType: 'SEMANTIC',
    semanticGroup: 'INTERVIEW',
    bg: 'rgba(37, 99, 235, 0.1)',
    color: '#2563eb',
    icon: '🗣️',
    enabled: true,
    sortOrder: 2
  },
  {
    id: 'offers_extended',
    label: 'OFFERS EXTENDED',
    metricType: 'SEMANTIC',
    semanticGroup: 'OFFER',
    bg: 'rgba(217, 119, 6, 0.1)',
    color: '#d97706',
    icon: '📋',
    enabled: true,
    sortOrder: 3
  },
  {
    id: 'hired',
    label: 'HIRED',
    metricType: 'SEMANTIC',
    semanticGroup: 'HIRED',
    bg: 'rgba(5, 150, 105, 0.1)',
    color: '#059669',
    icon: '✅',
    enabled: true,
    sortOrder: 4
  }
];

export const DEFAULT_ATS_COLUMNS = [
  { id: 'candidate', label: 'Candidate Name', visible: true, fieldKey: 'name', width: '220px', align: 'left', sortable: true, sortOrder: 1 },
  { id: 'position', label: 'Position', visible: true, fieldKey: 'position', width: '160px', align: 'left', sortable: true, sortOrder: 2 },
  { id: 'contact', label: 'Contact Details', visible: true, fieldKey: 'contact', width: '200px', align: 'left', sortable: false, sortOrder: 3 },
  { id: 'status', label: 'Stage / Status', visible: true, fieldKey: 'status', width: '140px', align: 'left', sortable: true, sortOrder: 4 },
  { id: 'resume', label: 'Resume', visible: true, fieldKey: 'resume', width: '120px', align: 'left', sortable: false, sortOrder: 5 },
  { id: 'createdAt', label: 'Applied Date', visible: true, fieldKey: 'createdAt', width: '160px', align: 'left', sortable: true, sortOrder: 6 }
];

export const DEFAULT_KANBAN_FIELDS = {
  position: true,
  email: true,
  phone: true,
  resume: true
};

export const DEFAULT_VIEW_CONFIG = {
  availableViews: ['kanban', 'list'],
  defaultView: 'kanban'
};

export const DEFAULT_ID_CONFIG = {
  prefix: 'ATS',
  pattern: 'ATS-001',
  nextSeq: 1
};

function getStorageKey(companyId) {
  const tenantKey = companyId ? String(companyId).replace(/[^a-zA-Z0-9_-]/g, '_') : 'default';
  return `omnilflow_config_${tenantKey}_ats`;
}

export function loadAtsModuleConfig(companyId) {
  const key = getStorageKey(companyId);
  try {
    const saved = localStorage.getItem('omnilflow_config_master_ats') ||
                  localStorage.getItem(key) ||
                  localStorage.getItem('omnilflow_config_default_tenant_ats') ||
                  localStorage.getItem('omnilflow_config_default_ats') ||
                  localStorage.getItem('omnilflow_config_ats');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        schemaVersion: SCHEMA_VERSION,
        moduleId: 'recruitment_ats',
        entityName: 'Candidate',
        fields: Array.isArray(parsed.fields) ? parsed.fields : DEFAULT_ATS_FIELDS,
        summaryWidgets: Array.isArray(parsed.summaryWidgets) ? parsed.summaryWidgets : DEFAULT_ATS_SUMMARY_WIDGETS,
        columns: Array.isArray(parsed.columns) ? parsed.columns : DEFAULT_ATS_COLUMNS,
        kanbanFields: parsed.kanbanFields || DEFAULT_KANBAN_FIELDS,
        views: parsed.views || DEFAULT_VIEW_CONFIG,
        idConfig: { ...DEFAULT_ID_CONFIG, ...(parsed.idConfig || {}) }
      };
    }
  } catch (e) {
    console.error('Error loading tenant ATS module config:', e);
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    moduleId: 'recruitment_ats',
    entityName: 'Candidate',
    fields: DEFAULT_ATS_FIELDS,
    summaryWidgets: DEFAULT_ATS_SUMMARY_WIDGETS,
    columns: DEFAULT_ATS_COLUMNS,
    kanbanFields: DEFAULT_KANBAN_FIELDS,
    views: DEFAULT_VIEW_CONFIG,
    idConfig: DEFAULT_ID_CONFIG
  };
}

export function saveAtsModuleConfig(companyId, config) {
  const tenantKey = companyId ? String(companyId).replace(/[^a-zA-Z0-9_-]/g, '_') : 'default_tenant';
  const key = getStorageKey(companyId);
  try {
    const payload = {
      ...config,
      moduleId: 'recruitment_ats',
      tenantId: tenantKey,
      schemaVersion: SCHEMA_VERSION,
      updatedAt: new Date().toISOString()
    };
    const jsonStr = JSON.stringify(payload);
    localStorage.setItem(key, jsonStr);
    localStorage.setItem('omnilflow_config_master_ats', jsonStr);
    localStorage.setItem('omnilflow_config_default_tenant_ats', jsonStr);
    localStorage.setItem('omnilflow_config_default_ats', jsonStr);
    localStorage.setItem('omnilflow_config_ats', jsonStr);

    try {
      FirebaseCloudEngine.saveRecord('module_configs', {
        id: `${tenantKey}_recruitment_ats`,
        ...payload
      }, tenantKey).catch(() => {});
    } catch (err) {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('omnilflow_config_updated', {
        detail: { moduleId: 'recruitment_ats', companyId: tenantKey }
      }));
    }
  } catch (e) {
    console.error('Error saving tenant ATS module config:', e);
  }
}
