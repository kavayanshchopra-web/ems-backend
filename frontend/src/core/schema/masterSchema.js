/**
 * GLOBAL EMS MASTER CONFIGURATION SCHEMA DEFINITIONS
 * Authoritative Single Source of Truth for all 15 Enterprise Module Sub-Schemas
 */

export const SCHEMA_VERSIONS = {
  CURRENT: '1.0.0',
  MIN_SUPPORTED: '1.0.0'
};

/**
 * 1. Global Entity Schema
 */
export const DEFAULT_ENTITY_SCHEMA = {
  entityId: 'default_entity',
  entityName: 'Record',
  entityNamePlural: 'Records',
  moduleKey: 'recruitment_ats',
  storageCollection: 'candidates',
  primaryKey: 'id',
  displayField: 'name',
  auditLogging: true,
  softDelete: true
};

/**
 * 2. Field Schema
 */
export const DEFAULT_FIELD_SCHEMA = {
  id: '',
  label: '',
  type: 'text', // text, number, email, phone, date, dropdown, radio, checkbox, textarea, file, currency, user_ref, relation
  systemField: false,
  required: false,
  searchable: true,
  filterable: true,
  sortable: true,
  showOnCreate: true,
  showOnEdit: true,
  showOnView: true,
  placeholder: '',
  helpText: '',
  defaultValue: null,
  optionsSource: null, // departments, designations, employment_types, ats_stages, etc.
  manualOptions: [],
  validations: []
};

/**
 * 3. Relationship Schema
 */
export const DEFAULT_RELATIONSHIP_SCHEMA = {
  id: '',
  name: '',
  type: 'ONE_TO_MANY', // ONE_TO_ONE, ONE_TO_MANY, MANY_TO_MANY
  sourceEntity: '',
  targetEntity: '',
  foreignKey: '',
  cascadeDelete: false
};

/**
 * 4. Layout Schema
 */
export const DEFAULT_LAYOUT_SCHEMA = {
  formLayout: {
    columns: 2,
    gap: '14px',
    sections: [
      { id: 'general', title: 'General Information', fields: ['name', 'email', 'phone'] }
    ]
  },
  detailLayout: {
    sections: [
      { id: 'overview', title: 'Overview', fields: ['name', 'position', 'status'] }
    ]
  }
};

/**
 * 5. View Schema
 */
export const DEFAULT_VIEW_SCHEMA = {
  availableViews: ['kanban', 'list'],
  defaultView: 'kanban',
  kanbanFields: { position: true, email: true, phone: true, resume: true }
};

/**
 * 6. Widget Schema
 */
export const DEFAULT_WIDGET_SCHEMA = {
  id: '',
  label: '',
  metricType: 'TOTAL', // TOTAL, SEMANTIC, STAGE_COUNT, FORMULA
  semanticGroup: null, // INTERVIEW, OFFER, HIRED, WON, LOST
  stageName: null,
  color: '#0d9488',
  bg: 'rgba(13, 148, 136, 0.1)',
  icon: '📊',
  enabled: true,
  order: 1
};

/**
 * 7. Action Schema
 */
export const DEFAULT_ACTION_SCHEMA = {
  id: '',
  label: '',
  actionType: 'CREATE', // CREATE, EDIT, ARCHIVE, RESTORE, DELETE, CUSTOM_SCRIPT
  requiredPermission: '',
  confirmMessage: null,
  icon: ''
};

/**
 * 8. Filter Schema
 */
export const DEFAULT_FILTER_SCHEMA = {
  searchQuery: '',
  stageFilter: 'all',
  customFilterValues: {}
};

/**
 * 9. Search Schema
 */
export const DEFAULT_SEARCH_SCHEMA = {
  minChars: 1,
  debounceMs: 200,
  matchMode: 'CONTAINS' // CONTAINS, EXACT, STARTS_WITH
};

/**
 * 10. Validation Schema
 */
export const DEFAULT_VALIDATION_SCHEMA = {
  requiredMessage: '{label} is required',
  emailMessage: 'Enter a valid email address',
  phoneMessage: 'Enter a valid phone number'
};

/**
 * 11. Workflow Schema
 */
export const DEFAULT_WORKFLOW_SCHEMA = {
  stages: [],
  allowBackwardsTransitions: true,
  autoMoveTriggers: []
};

/**
 * 12. Permission Schema
 */
export const DEFAULT_PERMISSION_SCHEMA = {
  viewPermission: 'module.view',
  createPermission: 'module.create',
  editPermission: 'module.edit',
  deletePermission: 'module.delete',
  configPermission: 'module.config'
};

/**
 * 13. Automation Schema
 */
export const DEFAULT_AUTOMATION_SCHEMA = {
  rules: [] // { trigger: 'STAGE_CHANGED', targetStage: 'HIRED', action: 'SEND_EMAIL' }
};

/**
 * 14. Report Schema
 */
export const DEFAULT_REPORT_SCHEMA = {
  exportFormats: ['CSV', 'JSON', 'PDF'],
  defaultSortKey: 'createdAt',
  defaultSortDir: 'desc'
};

/**
 * 15. AI Schema
 */
export const DEFAULT_AI_SCHEMA = {
  enableAiAssistant: true,
  screeningPrompt: 'Screen candidate skills against job description',
  summaryGenerator: true
};
