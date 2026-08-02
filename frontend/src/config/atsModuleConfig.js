/**
 * Global EMS Configuration Engine — Recruitment ATS Module Configuration Schema
 * Tenant-scoped schema definitions for fields, widgets, columns, kanban cards, and views.
 */

export const SCHEMA_VERSION = '1.1';

export const DEFAULT_ATS_FIELDS = [
  {
    id: 'name',
    label: 'Candidate Name',
    type: 'text',
    required: true,
    showOnCreate: true,
    showOnEdit: true,
    searchable: true,
    filterable: false,
    systemField: true,
    sortOrder: 1
  },
  {
    id: 'position',
    label: 'Position / Applied For',
    type: 'dropdown',
    optionsSource: 'designations',
    required: true,
    showOnCreate: true,
    showOnEdit: true,
    searchable: true,
    filterable: true,
    systemField: true,
    sortOrder: 2
  },
  {
    id: 'status',
    label: 'Pipeline Stage',
    type: 'dropdown',
    optionsSource: 'ats_stages',
    required: true,
    showOnCreate: true,
    showOnEdit: true,
    searchable: false,
    filterable: true,
    systemField: true,
    sortOrder: 3
  },
  {
    id: 'email',
    label: 'Email Address',
    type: 'email',
    required: false,
    showOnCreate: true,
    showOnEdit: true,
    searchable: true,
    filterable: true,
    systemField: true,
    sortOrder: 4
  },
  {
    id: 'phone',
    label: 'Phone Number',
    type: 'phone',
    required: false,
    showOnCreate: true,
    showOnEdit: true,
    searchable: true,
    filterable: true,
    systemField: true,
    sortOrder: 5
  },
  {
    id: 'resume',
    label: 'Resume / CV Document',
    type: 'text',
    required: false,
    showOnCreate: true,
    showOnEdit: true,
    searchable: true,
    filterable: false,
    systemField: true,
    sortOrder: 6
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
  { id: 'candidate', label: 'Candidate Name', visible: true, fieldKey: 'name', sortOrder: 1 },
  { id: 'position', label: 'Position', visible: true, fieldKey: 'position', sortOrder: 2 },
  { id: 'contact', label: 'Contact Details', visible: true, fieldKey: 'contact', sortOrder: 3 },
  { id: 'status', label: 'Stage / Status', visible: true, fieldKey: 'status', sortOrder: 4 },
  { id: 'resume', label: 'Resume', visible: true, fieldKey: 'resume', sortOrder: 5 },
  { id: 'createdAt', label: 'Applied Date', visible: true, fieldKey: 'createdAt', sortOrder: 6 }
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
        fields: Array.isArray(parsed.fields) ? parsed.fields : DEFAULT_ATS_FIELDS,
        summaryWidgets: Array.isArray(parsed.summaryWidgets) ? parsed.summaryWidgets : DEFAULT_ATS_SUMMARY_WIDGETS,
        columns: DEFAULT_ATS_COLUMNS,
        kanbanFields: DEFAULT_KANBAN_FIELDS,
        views: parsed.views || DEFAULT_VIEW_CONFIG,
        idConfig: { ...DEFAULT_ID_CONFIG, ...(parsed.idConfig || {}) }
      };
    }
  } catch (e) {
    console.error('Error loading tenant ATS module config:', e);
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    fields: DEFAULT_ATS_FIELDS,
    summaryWidgets: DEFAULT_ATS_SUMMARY_WIDGETS,
    columns: DEFAULT_ATS_COLUMNS,
    kanbanFields: DEFAULT_KANBAN_FIELDS,
    views: DEFAULT_VIEW_CONFIG,
    idConfig: DEFAULT_ID_CONFIG
  };
}

export function saveAtsModuleConfig(companyId, config) {
  const key = getStorageKey(companyId);
  try {
    const payload = {
      ...config,
      schemaVersion: SCHEMA_VERSION,
      updatedAt: new Date().toISOString()
    };
    const jsonStr = JSON.stringify(payload);
    localStorage.setItem(key, jsonStr);
    localStorage.setItem('omnilflow_config_master_ats', jsonStr);
    localStorage.setItem('omnilflow_config_default_tenant_ats', jsonStr);
    localStorage.setItem('omnilflow_config_default_ats', jsonStr);
    localStorage.setItem('omnilflow_config_ats', jsonStr);
  } catch (e) {
    console.error('Error saving tenant ATS module config:', e);
  }
}
