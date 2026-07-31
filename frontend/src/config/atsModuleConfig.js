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
    filterable: false,
    systemField: false,
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
    filterable: false,
    systemField: false,
    sortOrder: 5
  },
  {
    id: 'resume',
    label: 'Resume / CV Document',
    type: 'text',
    required: false,
    showOnCreate: true,
    showOnEdit: true,
    searchable: false,
    filterable: false,
    systemField: false,
    sortOrder: 6
  }
];

export const DEFAULT_ATS_SUMMARY_WIDGETS = [
  {
    id: 'total_applicants',
    label: 'TOTAL APPLICANTS',
    icon: '👥',
    metricType: 'TOTAL',
    color: '#0d9488',
    bg: 'rgba(13, 148, 136, 0.1)',
    enabled: true,
    sortOrder: 1
  },
  {
    id: 'interviewing',
    label: 'INTERVIEWING',
    icon: '🗣️',
    metricType: 'SEMANTIC',
    semanticGroup: 'INTERVIEW',
    color: '#2563eb',
    bg: 'rgba(37, 99, 235, 0.1)',
    enabled: true,
    sortOrder: 2
  },
  {
    id: 'offered',
    label: 'OFFERS EXTENDED',
    icon: '📋',
    metricType: 'SEMANTIC',
    semanticGroup: 'OFFER',
    color: '#d97706',
    bg: 'rgba(245, 158, 11, 0.1)',
    enabled: true,
    sortOrder: 3
  },
  {
    id: 'hired',
    label: 'HIRED',
    icon: '✅',
    metricType: 'SEMANTIC',
    semanticGroup: 'HIRED',
    color: '#059669',
    bg: 'rgba(16, 185, 129, 0.1)',
    enabled: true,
    sortOrder: 4
  }
];

export const DEFAULT_ATS_COLUMNS = [
  { id: 'candidate', label: 'Candidate', fieldKey: 'name', visible: true, systemColumn: true, sortOrder: 1 },
  { id: 'position', label: 'Position', fieldKey: 'position', visible: true, systemColumn: false, sortOrder: 2 },
  { id: 'contact', label: 'Contact Details', fieldKey: 'contact', visible: true, systemColumn: false, sortOrder: 3 },
  { id: 'stage', label: 'Stage / Status', fieldKey: 'status', visible: true, systemColumn: true, sortOrder: 4 },
  { id: 'resume', label: 'Resume', fieldKey: 'resume', visible: true, systemColumn: false, sortOrder: 5 },
  { id: 'createdAt', label: 'Created', fieldKey: 'createdAt', visible: true, systemColumn: false, sortOrder: 6 }
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

function getStorageKey(companyId) {
  const tenantKey = companyId ? String(companyId).replace(/[^a-zA-Z0-9_-]/g, '_') : 'default';
  return `omnilflow_config_${tenantKey}_ats`;
}

export function loadAtsModuleConfig(companyId) {
  const key = getStorageKey(companyId);
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        schemaVersion: SCHEMA_VERSION,
        fields: Array.isArray(parsed.fields) ? parsed.fields : DEFAULT_ATS_FIELDS,
        summaryWidgets: Array.isArray(parsed.summaryWidgets) ? parsed.summaryWidgets : DEFAULT_ATS_SUMMARY_WIDGETS,
        columns: Array.isArray(parsed.columns) ? parsed.columns : DEFAULT_ATS_COLUMNS,
        kanbanFields: parsed.kanbanFields || DEFAULT_KANBAN_FIELDS,
        views: parsed.views || DEFAULT_VIEW_CONFIG
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
    views: DEFAULT_VIEW_CONFIG
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
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (e) {
    console.error('Error saving tenant ATS module config:', e);
  }
}
