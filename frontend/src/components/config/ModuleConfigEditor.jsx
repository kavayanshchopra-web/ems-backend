import React, { useState } from 'react';
import { LabelEngine } from '../../core/engines/LabelEngine';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { Plus, Trash2, Eye, EyeOff, Sliders, LayoutGrid, List, Search, Filter, Layers, ArrowLeft, Hash, Edit3, Settings, ChevronDown, ChevronUp, Calendar, Clock, Image, GitFork, BarChartHorizontal, MapPin } from 'lucide-react';
import { formatCustomSequencePattern } from '../../services/atsStorageService';

export const ALL_FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'number', label: 'Number' },
  { value: 'currency', label: 'Currency' },
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'date', label: 'Date' },
  { value: 'time', label: 'Time' },
  { value: 'datetime', label: 'DateTime' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'multiselect', label: 'Multi Select' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'radio', label: 'Radio' },
  { value: 'toggle', label: 'Toggle' },
  { value: 'file', label: 'File Upload' },
  { value: 'image', label: 'Image' },
  { value: 'url', label: 'URL' },
  { value: 'color', label: 'Color' },
  { value: 'rating', label: 'Rating' },
  { value: 'richtext', label: 'Rich Text' },
  { value: 'autoid', label: 'Auto ID' },
  { value: 'status', label: 'Status' },
  { value: 'tag', label: 'Tag' }
];

const getDefaultLookupData = (modId) => {
  if (modId === 'employees') {
    return {
      departments: ['Engineering', 'Product', 'Design', 'Sales', 'Marketing', 'Customer Support', 'Finance', 'Human Resources', 'Operations'],
      designations: ['Senior Software Engineer', 'Product Manager', 'UX Designer', 'Sales Executive', 'HR Specialist', 'Financial Analyst', 'Operations Lead', 'Marketing Manager'],
      employment_types: ['Full-time', 'Part-time', 'Contract', 'Internship'],
      status: ['active', 'on_leave', 'terminated', 'probation'],
      role: ['employee', 'manager', 'admin', 'hr', 'finance']
    };
  }
  if (modId === 'asset_management') {
    return {
      category: ['Laptop', 'Mobile Phone', 'Monitor', 'Peripheral', 'Tablet', 'Networking', 'Furniture'],
      status: ['In Use', 'Available', 'Under Repair', 'Retired', 'Lost/Stolen'],
      vendors: ['Apple Inc.', 'Dell Technologies', 'Logitech', 'Samsung', 'Lenovo', 'HP Inc.'],
      locations: ['HQ - Mumbai', 'Branch - Bangalore', 'Branch - Delhi', 'Remote / Work From Home', 'Warehouse']
    };
  }
  if (modId === 'recruitment_ats') {
    return {
      ats_stages: ['New Applied', 'Screening', 'Technical Interview', 'HR Interview', 'Offered', 'Hired', 'Rejected'],
      candidate_status: ['Active', 'In Review', 'On Hold', 'Offered', 'Joined', 'Rejected'],
      interview_types: ['Technical Round 1', 'System Design', 'HR Screening', 'Cultural Fit', 'Managerial'],
      job_types: ['Full-time', 'Part-time', 'Contract', 'Remote'],
      rejection_reasons: ['Salary Expectation Mismatch', 'Notice Period Too Long', 'Technical Skill Gap', 'Culture Fit', 'Offer Declined']
    };
  }
  if (modId === 'crm' || modId === 'crm_sales') {
    return {
      pipeline_stages: ['Lead In', 'Contacted', 'Demo Scheduled', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'],
      lead_sources: ['Website', 'WhatsApp', 'Referral', 'LinkedIn', 'Cold Call', 'Campaign'],
      lead_statuses: ['New', 'Qualified', 'Unqualified', 'In Progress'],
      contact_tags: ['VIP', 'High Intent', 'Decision Maker', 'Enterprise', 'SMB']
    };
  }
  return {};
};

const syncColumnsWithFields = (fields = [], existingCols = []) => {
  const colMap = new Map((existingCols || []).map(c => [c.id || c.fieldKey, c]));
  const activeFields = (fields || []).filter(f => !f.archived && !f.deleted);

  return activeFields.map((f, idx) => {
    const key = f.key || f.id;
    const existingCol = colMap.get(f.id) || colMap.get(key);

    return {
      id: f.id || key,
      fieldKey: key,
      label: f.label, // Always 100% sync exact field label from Forms & Fields!
      visible: f.showOnList !== false, // Always 100% sync LIST eye toggle!
      width: existingCol?.width || (key === 'name' ? '220px' : key === 'email' ? '200px' : '140px'),
      align: existingCol?.align || 'left',
      sortable: true,
      sortOrder: f.sortOrder || idx + 1,
      systemColumn: f.systemField || false
    };
  });
};

/**
 * Generic Capability-Driven Module Configuration Editor
 * Single Source of Truth for ATS & All Enterprise Modules
 */
export default function ModuleConfigEditor({
  companyId,
  moduleDef,
  initialConfig,
  onSaveConfig,
  activePipelineStages = [],
  atsCandidates = [],
  systemDropdowns = {},
  onClose,
  showToast = () => {}
}) {
  const capabilities = moduleDef?.capabilities || { forms: true, summary: true, searchFilters: true, listView: true, kanbanView: true, views: true };
  const modId = moduleDef?.id || 'recruitment_ats';
  const defaultLookups = getDefaultLookupData(modId);

  const [activeNav, setActiveNav] = useState('fields');
  const [configState, setConfigState] = useState(() => {
    const initialFields = (initialConfig.fields || []).map((f, idx) => ({
      ...f,
      key: f.key || f.id,
      sortOrder: f.sortOrder || idx + 1,
      showOnList: f.showOnList !== undefined ? f.showOnList : true,
      showOnKanban: f.showOnKanban !== undefined ? f.showOnKanban : true
    }));

    return {
      fields: initialFields,
      summaryWidgets: [...(initialConfig.summaryWidgets || [])],
      columns: syncColumnsWithFields(initialFields, initialConfig.columns),
      kanbanFields: { ...(initialConfig.kanbanFields || { position: true, email: true, phone: true, resume: true }) },
      views: { ...(initialConfig.views || { availableViews: ['kanban', 'list'], defaultView: 'kanban' }) },
      idConfig: { ...(initialConfig.idConfig || { prefix: 'ATS', pattern: 'ATS-001', nextSeq: 1 }) },
      lookupData: { ...defaultLookups, ...(initialConfig.lookupData || {}) },
      lookupColors: { ...(initialConfig.lookupColors || {}) }
    };
  });

  const handleUpdateOptionColor = (optName, hexColor) => {
    setConfigState(prev => ({
      ...prev,
      lookupColors: {
        ...(prev.lookupColors || {}),
        [optName]: hexColor
      }
    }));
  };

  const [selectedLookupDataset, setSelectedLookupDataset] = useState(() => {
    const keys = Object.keys({ ...defaultLookups, ...(initialConfig.lookupData || {}) });
    return keys.length > 0 ? keys[0] : '';
  });
  const [newDatasetKey, setNewDatasetKey] = useState('');
  const [newLookupItem, setNewLookupItem] = useState('');

  const handleAddLookupDataset = () => {
    const key = newDatasetKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!key) {
      showToast('Dataset key is required', 'error');
      return;
    }
    if (configState.lookupData[key]) {
      showToast(`Dataset "${key}" already exists`, 'error');
      return;
    }
    setConfigState(prev => ({
      ...prev,
      lookupData: {
        ...prev.lookupData,
        [key]: []
      }
    }));
    setSelectedLookupDataset(key);
    setNewDatasetKey('');
    showToast(`Added lookup dataset "${key}"`, 'success');
  };

  const handleDeleteLookupDataset = (dsKey) => {
    if (!confirm(`Are you sure you want to delete dataset "${dsKey}"?`)) return;
    const updated = { ...configState.lookupData };
    delete updated[dsKey];
    setConfigState(prev => ({ ...prev, lookupData: updated }));
    const remaining = Object.keys(updated);
    setSelectedLookupDataset(remaining.length > 0 ? remaining[0] : '');
    showToast(`Deleted lookup dataset "${dsKey}"`, 'info');
  };

  const handleAddLookupItem = (dsKey) => {
    const val = newLookupItem.trim();
    if (!val) return;
    const currentList = configState.lookupData[dsKey] || [];
    if (currentList.includes(val)) {
      showToast(`Item "${val}" already exists in ${dsKey}`, 'error');
      return;
    }
    setConfigState(prev => ({
      ...prev,
      lookupData: {
        ...prev.lookupData,
        [dsKey]: [...currentList, val]
      }
    }));
    setNewLookupItem('');
    showToast(`Added "${val}" to ${dsKey}`, 'success');
  };

  const handleDeleteLookupItem = (dsKey, itemIdx) => {
    const currentList = configState.lookupData[dsKey] || [];
    const updatedList = currentList.filter((_, idx) => idx !== itemIdx);
    setConfigState(prev => ({
      ...prev,
      lookupData: {
        ...prev.lookupData,
        [dsKey]: updatedList
      }
    }));
  };

  // Field Category & Usage Helpers
  const getFieldCategory = (field) => {
    if (field.category) return field.category.toUpperCase();
    if (['id', 'companyId', 'createdAt', 'updatedAt'].includes(field.id) || ['id', 'companyId', 'createdAt', 'updatedAt'].includes(field.key)) {
      return 'SYSTEM';
    }
    if (field.systemField) return 'BUSINESS';
    return 'CUSTOM';
  };

  const getFieldUsageCount = (fieldKeyOrId) => {
    if (!atsCandidates || !Array.isArray(atsCandidates)) return 0;
    return atsCandidates.filter(record => {
      if (!record) return false;
      const directVal = record[fieldKeyOrId];
      if (directVal !== undefined && directVal !== null && String(directVal).trim() !== '') return true;
      const customVal = record.customFields?.[fieldKeyOrId];
      if (customVal !== undefined && customVal !== null && String(customVal).trim() !== '') return true;
      return false;
    }).length;
  };

  // Archive & Delete Policy Modal State
  const [fieldToArchive, setFieldToArchive] = useState(null);
  const [archiveUsageCount, setArchiveUsageCount] = useState(0);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showArchivedFields, setShowArchivedFields] = useState(false);

  // Change Impact Analysis State
  const [pendingImpactChange, setPendingImpactChange] = useState(null);
  const [showImpactModal, setShowImpactModal] = useState(false);

  // Dataset Import/Export State
  const [showImportDatasetModal, setShowImportDatasetModal] = useState(false);
  const [importDatasetText, setImportDatasetText] = useState('');

  const handleInitiateArchiveField = (field) => {
    const cat = getFieldCategory(field);
    if (cat === 'SYSTEM') {
      showToast('System core fields cannot be archived or deleted', 'error');
      return;
    }
    const usage = getFieldUsageCount(field.id);
    setFieldToArchive(field);
    setArchiveUsageCount(usage);
    setShowArchiveModal(true);
  };

  const handleConfirmArchiveField = () => {
    if (!fieldToArchive) return;
    setConfigState(prev => {
      const updatedFields = prev.fields.map(f => f.id === fieldToArchive.id ? { ...f, archived: true } : f);
      return {
        ...prev,
        fields: updatedFields,
        columns: syncColumnsWithFields(updatedFields, prev.columns)
      };
    });
    showToast(`📦 Archived field "${fieldToArchive.label}". Historical records preserved.`, 'info');
    setShowArchiveModal(false);
    setFieldToArchive(null);
  };

  const handleRestoreField = (fieldId) => {
    const field = configState.fields.find(f => f.id === fieldId);
    setConfigState(prev => {
      const updatedFields = prev.fields.map(f => f.id === fieldId ? { ...f, archived: false } : f);
      return {
        ...prev,
        fields: updatedFields,
        columns: syncColumnsWithFields(updatedFields, prev.columns)
      };
    });
    showToast(`🔄 Restored field "${field?.label || fieldId}" back to active use.`, 'success');
  };

  const handleInitiateFieldTypeChange = (fieldId, newType) => {
    const field = configState.fields.find(f => f.id === fieldId);
    if (!field || field.type === newType) return;

    const cat = getFieldCategory(field);
    if (cat === 'SYSTEM') {
      showToast('System field types cannot be modified', 'error');
      return;
    }

    setPendingImpactChange({
      fieldId,
      fieldLabel: field.label,
      oldType: field.type,
      newType
    });
    setShowImpactModal(true);
  };

  const handleConfirmImpactChange = () => {
    if (!pendingImpactChange) return;
    const { fieldId, newType } = pendingImpactChange;
    setConfigState(prev => ({
      ...prev,
      fields: prev.fields.map(f => f.id === fieldId ? { ...f, type: newType } : f)
    }));
    showToast(`Updated field type for "${pendingImpactChange.fieldLabel}" to ${newType}`, 'success');
    setShowImpactModal(false);
    setPendingImpactChange(null);
  };

  const handleExportLookupDataset = (dsKey) => {
    const items = configState.lookupData[dsKey] || [];
    const dataStr = JSON.stringify({ dataset: dsKey, items }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lookup_dataset_${dsKey}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported dataset "${dsKey}"`, 'info');
  };

  const handleImportLookupItems = () => {
    if (!selectedLookupDataset || !importDatasetText.trim()) return;
    let parsedOpts = [];
    try {
      if (importDatasetText.trim().startsWith('{') || importDatasetText.trim().startsWith('[')) {
        const json = JSON.parse(importDatasetText);
        parsedOpts = Array.isArray(json) ? json : (json.items || []);
      } else {
        parsedOpts = importDatasetText.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
      }
    } catch (e) {
      parsedOpts = importDatasetText.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
    }

    if (parsedOpts.length === 0) {
      showToast('No valid items found to import', 'error');
      return;
    }

    const currentList = configState.lookupData[selectedLookupDataset] || [];
    const merged = Array.from(new Set([...currentList, ...parsedOpts.map(String)]));

    setConfigState(prev => ({
      ...prev,
      lookupData: {
        ...prev.lookupData,
        [selectedLookupDataset]: merged
      }
    }));

    setImportDatasetText('');
    setShowImportDatasetModal(false);
    showToast(`Imported ${parsedOpts.length} items into "${selectedLookupDataset}"`, 'success');
  };

  // Expanded Field Metadata Editing Drawer State
  const [editingFieldId, setEditingFieldId] = useState(null);

  // New Custom Field State
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldType, setNewFieldType] = useState('text');
  const [newFieldOptionsSource, setNewFieldOptionsSource] = useState('manual');
  const [newFieldManualOptions, setNewFieldManualOptions] = useState('');
  const [newFieldDefaultValue, setNewFieldDefaultValue] = useState('');
  const [newFieldPlaceholder, setNewFieldPlaceholder] = useState('');
  const [newFieldHelpText, setNewFieldHelpText] = useState('');

  // New Widget State
  const [newWidgetLabel, setNewWidgetLabel] = useState('');
  const [selectedWidgetStage, setSelectedWidgetStage] = useState('');

  // Field Reordering Controls
  const handleMoveField = (idx, direction) => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= configState.fields.length) return;

    const updated = [...configState.fields];
    const temp = updated[targetIdx];
    updated[targetIdx] = updated[idx];
    updated[idx] = temp;

    const reordered = updated.map((f, i) => ({ ...f, sortOrder: i + 1 }));
    setConfigState(prev => ({
      ...prev,
      fields: reordered,
      columns: syncColumnsWithFields(reordered, prev.columns)
    }));
  };

  const handleToggleFieldProp = (fieldId, prop) => {
    setConfigState(prev => {
      const updatedFields = prev.fields.map(f => {
        if (f.id === fieldId) {
          if (f.systemField && prop === 'required') return f;
          return { ...f, [prop]: !f[prop] };
        }
        return f;
      });
      return {
        ...prev,
        fields: updatedFields,
        columns: syncColumnsWithFields(updatedFields, prev.columns)
      };
    });
  };

  const handleFieldPropertyChange = (fieldId, prop, val) => {
    setConfigState(prev => {
      const updatedFields = prev.fields.map(f => f.id === fieldId ? { ...f, [prop]: val } : f);
      return {
        ...prev,
        fields: updatedFields,
        columns: syncColumnsWithFields(updatedFields, prev.columns)
      };
    });
  };

  const handleAddCustomField = () => {
    if (!newFieldLabel.trim()) {
      showToast('Field label is required', 'error');
      return;
    }

    const fieldId = 'custom_' + Date.now();
    const key = newFieldKey.trim() || newFieldLabel.toLowerCase().replace(/[^a-z0-9_]/g, '_');

    let manualOpts = [];
    if (newFieldOptionsSource === 'manual' && newFieldManualOptions.trim()) {
      manualOpts = newFieldManualOptions.split(',').map(s => s.trim()).filter(Boolean);
    }

    const newField = {
      id: fieldId,
      key: key,
      label: newFieldLabel.trim(),
      type: newFieldType,
      optionsSource: newFieldOptionsSource,
      manualOptions: manualOpts,
      options: manualOpts,
      defaultValue: newFieldDefaultValue.trim(),
      placeholder: newFieldPlaceholder.trim() || `Enter ${newFieldLabel.trim()}...`,
      helpText: newFieldHelpText.trim(),
      required: false,
      showOnCreate: true,
      showOnEdit: true,
      showOnView: true,
      showOnList: true,
      showOnKanban: true,
      searchable: true,
      filterable: ['dropdown', 'radio', 'multiselect', 'status', 'tag', 'checkbox'].includes(newFieldType),
      systemField: false,
      sortOrder: configState.fields.length + 1,
      archived: false,
      deleted: false
    };

    // Automatically sync columns list
    const newColumn = {
      id: fieldId,
      fieldKey: key,
      label: newField.label,
      visible: true,
      width: '160px',
      align: 'left',
      sortable: true,
      sortOrder: configState.columns.length + 1
    };

    setConfigState(prev => ({
      ...prev,
      fields: [...prev.fields, newField],
      columns: [...prev.columns, newColumn]
    }));

    setNewFieldLabel('');
    setNewFieldKey('');
    setNewFieldManualOptions('');
    setNewFieldDefaultValue('');
    setNewFieldPlaceholder('');
    setNewFieldHelpText('');
    showToast(`Added custom field "${newField.label}"`, 'success');
  };

  const handleDeleteField = (fieldId) => {
    const field = configState.fields.find(f => f.id === fieldId);
    if (field?.systemField) {
      showToast('Core system fields cannot be deleted', 'error');
      return;
    }

    const occupiedCount = (atsCandidates || []).filter(c => {
      return c.customFields && c.customFields[fieldId] !== undefined && String(c.customFields[fieldId]).trim() !== '';
    }).length;

    if (occupiedCount > 0) {
      alert(`Cannot delete field "${field.label}" because ${occupiedCount} candidate record(s) contain saved historical data for this field.`);
      return;
    }

    setConfigState(prev => ({
      ...prev,
      fields: prev.fields.filter(f => f.id !== fieldId),
      columns: prev.columns.filter(c => c.id !== fieldId && c.fieldKey !== fieldId)
    }));
    showToast(`Removed field "${field.label}"`, 'info');
  };

  // Widget Controls
  const handleMoveWidget = (idx, direction) => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= configState.summaryWidgets.length) return;

    const updated = [...configState.summaryWidgets];
    const temp = updated[targetIdx];
    updated[targetIdx] = updated[idx];
    updated[idx] = temp;

    const reordered = updated.map((w, i) => ({ ...w, sortOrder: i + 1 }));
    setConfigState(prev => ({ ...prev, summaryWidgets: reordered }));
  };

  const handleToggleWidget = (widgetId) => {
    setConfigState(prev => ({
      ...prev,
      summaryWidgets: prev.summaryWidgets.map(w => w.id === widgetId ? { ...w, enabled: !w.enabled } : w)
    }));
  };

  const handleAddStageWidget = () => {
    if (!selectedWidgetStage) return;
    const stageObj = activePipelineStages.find(s => (s.id || s.name) === selectedWidgetStage);
    const label = newWidgetLabel.trim() || stageObj?.name || 'Stage Count';
    const widgetId = 'widget_stage_' + Date.now();

    const newWidget = {
      id: widgetId,
      label: label.toUpperCase(),
      icon: stageObj?.emoji || '📋',
      metricType: 'STAGE_COUNT',
      stageName: stageObj?.name || selectedWidgetStage,
      color: stageObj?.color || '#0d9488',
      bg: 'rgba(13, 148, 136, 0.1)',
      enabled: true,
      sortOrder: configState.summaryWidgets.length + 1
    };

    setConfigState(prev => ({ ...prev, summaryWidgets: [...prev.summaryWidgets, newWidget] }));
    setNewWidgetLabel('');
    setSelectedWidgetStage('');
    showToast(`Added summary widget "${label}"`, 'success');
  };

  // Column Controls
  const handleMoveColumn = (idx, direction) => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= configState.columns.length) return;

    const updated = [...configState.columns];
    const temp = updated[targetIdx];
    updated[targetIdx] = updated[idx];
    updated[idx] = temp;

    const reordered = updated.map((c, i) => ({ ...c, sortOrder: i + 1 }));
    setConfigState(prev => ({ ...prev, columns: reordered }));
  };

  const handleToggleColumn = (colId) => {
    setConfigState(prev => ({
      ...prev,
      columns: prev.columns.map(c => {
        if (c.id === colId) {
          if (c.systemColumn) return c;
          return { ...c, visible: !c.visible };
        }
        return c;
      })
    }));
  };

  const handleColumnChange = (colId, prop, val) => {
    setConfigState(prev => ({
      ...prev,
      columns: prev.columns.map(c => c.id === colId ? { ...c, [prop]: val } : c)
    }));
  };

  const handleToggleKanbanField = (key) => {
    setConfigState(prev => ({
      ...prev,
      kanbanFields: {
        ...prev.kanbanFields,
        [key]: !prev.kanbanFields[key]
      }
    }));
  };

  const handleToggleViewMode = (viewKey) => {
    const currentViews = configState.views.availableViews || ['kanban', 'list'];
    let updatedViews = [...currentViews];

    if (currentViews.includes(viewKey)) {
      if (currentViews.length === 1) {
        showToast('At least one view mode must remain enabled', 'error');
        return;
      }
      updatedViews = currentViews.filter(v => v !== viewKey);
    } else {
      updatedViews.push(viewKey);
    }

    const defaultView = updatedViews.includes(configState.views.defaultView) ? configState.views.defaultView : updatedViews[0];

    setConfigState(prev => ({
      ...prev,
      views: { availableViews: updatedViews, defaultView }
    }));
  };

  const handleSetDefaultView = (viewKey) => {
    setConfigState(prev => ({
      ...prev,
      views: { ...prev.views, defaultView: viewKey }
    }));
  };

  const handleSave = () => {
    onSaveConfig(configState);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('omnilflow_config_updated', {
        detail: { moduleId: moduleDef?.id || 'recruitment_ats', companyId }
      }));
    }
    onClose();
  };

  const navItems = [
    capabilities.forms && { id: 'fields', label: 'Forms & Fields', icon: <Sliders size={16} /> },
    { id: 'lookup_data', label: 'Dropdowns / Lookup Data', icon: <Layers size={16} /> },
    { id: 'id_config', label: 'ID Format & Prefix', icon: <Hash size={16} /> },
    capabilities.summary && { id: 'summary', label: 'Summary Cards', icon: <Layers size={16} /> },
    capabilities.searchFilters && { id: 'search_filters', label: 'Search & Filters', icon: <Filter size={16} /> },
    capabilities.listView && { id: 'columns', label: 'List View', icon: <List size={16} /> },
    capabilities.kanbanView && { id: 'kanban', label: 'Kanban View', icon: <LayoutGrid size={16} /> },
    capabilities.views && { id: 'views', label: 'Views', icon: <Eye size={16} /> }
  ].filter(Boolean);

  const editingField = configState.fields.find(f => f.id === editingFieldId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px', background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>

      {/* Editor Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button variant="secondary" size="sm" icon={<ArrowLeft size={14} />} onClick={onClose}>
            Back to Registry
          </Button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>{moduleDef?.icon || '⚙️'}</span>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                Module Configuration — {moduleDef?.label || 'Module'}
              </h2>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
              Single source of truth configuration engine for {moduleDef?.label || 'this module'}. All screens update live from metadata.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="md" onClick={handleSave} style={{ background: 'linear-gradient(135deg, #0d9488 0%, #064e43 100%)', color: 'white', border: 'none' }}>
            Save Configuration
          </Button>
        </div>
      </div>

      {/* Main Layout: Left Navigation Sidebar + Right Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '20px', minHeight: '440px' }}>

        {/* Left Navigation Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderRight: '1px solid #e2e8f0', paddingRight: '16px' }}>
          <div style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
            CONFIGURATION TABS
          </div>
          {navItems.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveNav(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                fontSize: '12px',
                fontWeight: activeNav === item.id ? '800' : '600',
                borderRadius: '8px',
                border: 'none',
                background: activeNav === item.id ? 'rgba(13, 148, 136, 0.1)' : 'transparent',
                color: activeNav === item.id ? '#0d9488' : '#475569',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>

        {/* Right Content Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* SECTION: FORMS & FIELDS */}
          {activeNav === 'fields' && capabilities.forms && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  Every row defines one field. Fields are classified as <strong>SYSTEM</strong>, <strong>BUSINESS</strong>, or <strong>CUSTOM</strong>. Deleting a field archives it to preserve historical records.
                </div>
                <button
                  type="button"
                  onClick={() => setShowArchivedFields(!showArchivedFields)}
                  style={{ fontSize: '11px', fontWeight: '700', color: showArchivedFields ? '#0d9488' : '#64748b', border: 'none', background: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  {showArchivedFields ? 'Hide Archived Fields' : `Show Archived (${configState.fields.filter(f => f.archived).length})`}
                </button>
              </div>

              {/* FIELDS SCHEMA TABLE */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', maxHeight: '420px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 5 }}>
                    <tr>
                      <th style={{ padding: '8px 6px', textAlign: 'center', width: '30px' }}>ORD</th>
                      <th style={{ padding: '8px 6px', textAlign: 'center', width: '70px' }}>CAT</th>
                      <th style={{ padding: '8px 8px', textAlign: 'left' }}>LABEL</th>
                      <th style={{ padding: '8px 8px', textAlign: 'left', width: '100px' }}>TYPE</th>
                      <th style={{ padding: '8px 4px', textAlign: 'center', width: '32px' }} title="Add Form">ADD</th>
                      <th style={{ padding: '8px 4px', textAlign: 'center', width: '32px' }} title="Edit Form">EDIT</th>
                      <th style={{ padding: '8px 4px', textAlign: 'center', width: '32px' }} title="View Drawer">VIEW</th>
                      <th style={{ padding: '8px 4px', textAlign: 'center', width: '32px' }} title="List Column">LIST</th>
                      <th style={{ padding: '8px 4px', textAlign: 'center', width: '32px' }} title="Kanban Card">KANBAN</th>
                      <th style={{ padding: '8px 4px', textAlign: 'center', width: '32px' }} title="Required">REQ</th>
                      <th style={{ padding: '8px 6px', textAlign: 'center', width: '70px' }}>USAGE</th>
                      <th style={{ padding: '8px 8px', textAlign: 'right', width: '80px' }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {configState.fields.filter(f => showArchivedFields ? true : !f.archived).map((field, idx) => {
                      const cat = getFieldCategory(field);
                      const usageCount = getFieldUsageCount(field.id);
                      const isArchived = !!field.archived;

                      return (
                      <React.Fragment key={field.id}>
                        <tr style={{ borderBottom: '1px solid #f1f5f9', background: isArchived ? '#fffbe6' : editingFieldId === field.id ? '#f0fdfa' : 'white', opacity: isArchived ? 0.75 : 1 }}>
                          <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '1px', justifyContent: 'center' }}>
                              <button type="button" disabled={idx === 0 || isArchived} onClick={() => handleMoveField(idx, 'up')} style={{ border: 'none', background: 'none', cursor: idx === 0 || isArchived ? 'not-allowed' : 'pointer', opacity: idx === 0 || isArchived ? 0.3 : 1 }}>▲</button>
                              <button type="button" disabled={idx === configState.fields.length - 1 || isArchived} onClick={() => handleMoveField(idx, 'down')} style={{ border: 'none', background: 'none', cursor: idx === configState.fields.length - 1 || isArchived ? 'not-allowed' : 'pointer', opacity: idx === configState.fields.length - 1 || isArchived ? 0.3 : 1 }}>▼</button>
                            </div>
                          </td>
                          <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                            <span style={{
                              fontSize: '9px',
                              fontWeight: '800',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: cat === 'SYSTEM' ? '#f1f5f9' : cat === 'BUSINESS' ? '#ccfbf1' : '#f3e8ff',
                              color: cat === 'SYSTEM' ? '#475569' : cat === 'BUSINESS' ? '#0f766e' : '#6b21a8'
                            }}>
                              {cat}
                            </span>
                          </td>
                          <td style={{ padding: '6px 8px' }}>
                            <input
                              type="text"
                              value={field.label}
                              disabled={cat === 'SYSTEM' || isArchived}
                              onChange={(e) => handleFieldPropertyChange(field.id, 'label', e.target.value)}
                              style={{ padding: '4px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: '600', width: '100%', outline: 'none', background: cat === 'SYSTEM' || isArchived ? '#f8fafc' : 'white' }}
                            />
                          </td>
                          <td style={{ padding: '6px 8px' }}>
                            <select
                              value={field.type}
                              disabled={cat === 'SYSTEM' || isArchived}
                              onChange={(e) => handleInitiateFieldTypeChange(field.id, e.target.value)}
                              style={{ padding: '4px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: '600', width: '100%', outline: 'none', background: cat === 'SYSTEM' || isArchived ? '#f8fafc' : 'white' }}
                            >
                              {ALL_FIELD_TYPES.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                              ))}
                            </select>
                          </td>
                          <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                            <button type="button" disabled={isArchived} onClick={() => handleToggleFieldProp(field.id, 'showOnCreate')} style={{ border: 'none', background: 'none', cursor: isArchived ? 'not-allowed' : 'pointer', color: field.showOnCreate ? '#0d9488' : '#cbd5e1' }}>
                              {field.showOnCreate ? <Eye size={14} /> : <EyeOff size={14} />}
                            </button>
                          </td>
                          <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                            <button type="button" disabled={isArchived} onClick={() => handleToggleFieldProp(field.id, 'showOnEdit')} style={{ border: 'none', background: 'none', cursor: isArchived ? 'not-allowed' : 'pointer', color: field.showOnEdit ? '#0d9488' : '#cbd5e1' }}>
                              {field.showOnEdit ? <Eye size={14} /> : <EyeOff size={14} />}
                            </button>
                          </td>
                          <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                            <button type="button" disabled={isArchived} onClick={() => handleToggleFieldProp(field.id, 'showOnView')} style={{ border: 'none', background: 'none', cursor: isArchived ? 'not-allowed' : 'pointer', color: field.showOnView !== false ? '#0d9488' : '#cbd5e1' }}>
                              {field.showOnView !== false ? <Eye size={14} /> : <EyeOff size={14} />}
                            </button>
                          </td>
                          <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                            <button type="button" disabled={isArchived} onClick={() => handleToggleFieldProp(field.id, 'showOnList')} style={{ border: 'none', background: 'none', cursor: isArchived ? 'not-allowed' : 'pointer', color: field.showOnList !== false ? '#0d9488' : '#cbd5e1' }}>
                              {field.showOnList !== false ? <Eye size={14} /> : <EyeOff size={14} />}
                            </button>
                          </td>
                          <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                            <button type="button" disabled={isArchived} onClick={() => handleToggleFieldProp(field.id, 'showOnKanban')} style={{ border: 'none', background: 'none', cursor: isArchived ? 'not-allowed' : 'pointer', color: field.showOnKanban !== false ? '#0d9488' : '#cbd5e1' }}>
                              {field.showOnKanban !== false ? <Eye size={14} /> : <EyeOff size={14} />}
                            </button>
                          </td>
                          <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={!!field.required}
                              disabled={cat === 'SYSTEM' || isArchived}
                              onChange={() => handleToggleFieldProp(field.id, 'required')}
                              style={{ accentColor: '#0d9488', cursor: cat === 'SYSTEM' || isArchived ? 'not-allowed' : 'pointer' }}
                            />
                          </td>
                          <td style={{ padding: '6px 6px', textAlign: 'center' }}>
                            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700' }}>
                              {usageCount} Recs
                            </span>
                          </td>
                          <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', alignItems: 'center' }}>
                              {!isArchived ? (
                                <>
                                  <button
                                    type="button"
                                    title="Edit Field Metadata Settings"
                                    onClick={() => setEditingFieldId(editingFieldId === field.id ? null : field.id)}
                                    style={{ border: 'none', background: 'transparent', color: '#0d9488', cursor: 'pointer' }}
                                  >
                                    {editingFieldId === field.id ? <ChevronUp size={14} /> : <Settings size={14} />}
                                  </button>
                                  {cat !== 'SYSTEM' ? (
                                    <button
                                      type="button"
                                      title="Archive Field"
                                      onClick={() => handleInitiateArchiveField(field)}
                                      style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  ) : (
                                    <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: '800' }}>CORE</span>
                                  )}
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleRestoreField(field.id)}
                                  style={{ border: 'none', background: '#0d9488', color: 'white', borderRadius: '4px', fontSize: '10px', fontWeight: '700', padding: '2px 6px', cursor: 'pointer' }}
                                >
                                  Restore
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* EXPANDABLE METADATA EDIT PANEL */}
                        {editingFieldId === field.id && (
                          <tr style={{ background: '#f0fdfa', borderBottom: '1px solid #ccfbf1' }}>
                            <td colSpan={10} style={{ padding: '12px 16px' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                                <div>
                                  <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: '#475569', marginBottom: '2px' }}>FIELD KEY / IDENTIFIER</label>
                                  <input
                                    type="text"
                                    value={field.key || field.id}
                                    onChange={(e) => handleFieldPropertyChange(field.id, 'key', e.target.value)}
                                    style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', width: '100%' }}
                                  />
                                </div>
                                <div>
                                  <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: '#475569', marginBottom: '2px' }}>DEFAULT VALUE</label>
                                  <input
                                    type="text"
                                    value={field.defaultValue || ''}
                                    onChange={(e) => handleFieldPropertyChange(field.id, 'defaultValue', e.target.value)}
                                    placeholder="Default value"
                                    style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', width: '100%' }}
                                  />
                                </div>
                                <div>
                                  <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: '#475569', marginBottom: '2px' }}>PLACEHOLDER TEXT</label>
                                  <input
                                    type="text"
                                    value={field.placeholder || ''}
                                    onChange={(e) => handleFieldPropertyChange(field.id, 'placeholder', e.target.value)}
                                    placeholder="Placeholder text"
                                    style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', width: '100%' }}
                                  />
                                </div>
                                <div>
                                  <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: '#475569', marginBottom: '2px' }}>HELP TEXT</label>
                                  <input
                                    type="text"
                                    value={field.helpText || ''}
                                    onChange={(e) => handleFieldPropertyChange(field.id, 'helpText', e.target.value)}
                                    placeholder="Help text below input"
                                    style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', width: '100%' }}
                                  />
                                </div>
                                <div>
                                  <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: '#475569', marginBottom: '2px' }}>MIN LENGTH / VALUE</label>
                                  <input
                                    type="number"
                                    value={field.minLength || field.min || ''}
                                    onChange={(e) => {
                                      const v = e.target.value ? Number(e.target.value) : undefined;
                                      handleFieldPropertyChange(field.id, 'minLength', v);
                                      handleFieldPropertyChange(field.id, 'min', v);
                                    }}
                                    style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', width: '100%' }}
                                  />
                                </div>
                                <div>
                                  <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: '#475569', marginBottom: '2px' }}>MAX LENGTH / VALUE</label>
                                  <input
                                    type="number"
                                    value={field.maxLength || field.max || ''}
                                    onChange={(e) => {
                                      const v = e.target.value ? Number(e.target.value) : undefined;
                                      handleFieldPropertyChange(field.id, 'maxLength', v);
                                      handleFieldPropertyChange(field.id, 'max', v);
                                    }}
                                    style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', width: '100%' }}
                                  />
                                </div>
                                <div>
                                  <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: '#475569', marginBottom: '2px' }}>REGEX PATTERN</label>
                                  <input
                                    type="text"
                                    value={field.pattern || field.regex || ''}
                                    onChange={(e) => handleFieldPropertyChange(field.id, 'pattern', e.target.value)}
                                    placeholder="e.g. ^[A-Z]{3}$"
                                    style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', width: '100%' }}
                                  />
                                </div>
                                {/* TYPE-SPECIFIC DYNAMIC CONFIGURATION PANELS */}

                                {/* A. DROPDOWN / SELECT / RADIO / CHECKBOX / STATUS / TAG */}
                                {(field.type === 'dropdown' || field.type === 'radio' || field.type === 'multiselect' || field.type === 'status' || field.type === 'tag' || field.type === 'checkbox') && (
                                  <>
                                    <div style={{ gridColumn: 'span 2' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                                        <label style={{ fontSize: '10px', fontWeight: '800', color: '#475569' }}>LOOKUP DATASET BINDING</label>
                                        {field.optionsSource && field.optionsSource !== 'manual' && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setSelectedLookupDataset(field.optionsSource);
                                              setActiveNav('lookup_data');
                                            }}
                                            style={{ fontSize: '10px', fontWeight: '800', color: '#0d9488', border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                                          >
                                            [ Manage Dataset ]
                                          </button>
                                        )}
                                      </div>
                                      <select
                                        value={field.optionsSource || field.key || field.id || 'manual'}
                                        onChange={(e) => {
                                          const selectedDs = e.target.value;
                                          handleFieldPropertyChange(field.id, 'optionsSource', selectedDs);
                                          if (configState.lookupData[selectedDs]) {
                                            handleFieldPropertyChange(field.id, 'options', configState.lookupData[selectedDs]);
                                            handleFieldPropertyChange(field.id, 'manualOptions', configState.lookupData[selectedDs]);
                                          }
                                        }}
                                        style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', width: '100%', background: 'white' }}
                                      >
                                        <option value="manual">Manual Options (Custom List)</option>
                                        {Object.keys(configState.lookupData || {}).map(dsKey => (
                                          <option key={dsKey} value={dsKey}>
                                            Dataset: {dsKey.replace(/_/g, ' ').toUpperCase()} ({(configState.lookupData[dsKey] || []).length} items)
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    {(!field.optionsSource || field.optionsSource === 'manual') && (
                                      <div style={{ gridColumn: 'span 2' }}>
                                        <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: '#475569', marginBottom: '2px' }}>CUSTOM OPTIONS (IF MANUAL)</label>
                                        <input
                                          type="text"
                                          value={Array.isArray(field.options) ? field.options.join(', ') : (field.manualOptions || []).join(', ')}
                                          onChange={(e) => {
                                            const opts = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                                            handleFieldPropertyChange(field.id, 'options', opts);
                                            handleFieldPropertyChange(field.id, 'manualOptions', opts);
                                          }}
                                          placeholder="e.g. Option 1, Option 2, Option 3"
                                          style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', width: '100%' }}
                                        />
                                      </div>
                                    )}
                                  </>
                                )}

                                {/* B. NUMBER CONFIG */}
                                {field.type === 'number' && (
                                  <div>
                                    <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: '#475569', marginBottom: '2px' }}>ALLOW DECIMAL</label>
                                    <select
                                      value={field.allowDecimal ? 'yes' : 'no'}
                                      onChange={(e) => handleFieldPropertyChange(field.id, 'allowDecimal', e.target.value === 'yes')}
                                      style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', width: '100%', background: 'white' }}
                                    >
                                      <option value="no">Integer Only</option>
                                      <option value="yes">Allow Decimal</option>
                                    </select>
                                  </div>
                                )}

                                {/* C. CURRENCY CONFIG */}
                                {field.type === 'currency' && (
                                  <>
                                    <div>
                                      <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: '#475569', marginBottom: '2px' }}>CURRENCY CODE</label>
                                      <input
                                        type="text"
                                        value={field.currencyCode || '$'}
                                        onChange={(e) => handleFieldPropertyChange(field.id, 'currencyCode', e.target.value)}
                                        placeholder="e.g. $, ₹, €"
                                        style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', width: '100%' }}
                                      />
                                    </div>
                                    <div>
                                      <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: '#475569', marginBottom: '2px' }}>DECIMAL PLACES</label>
                                      <input
                                        type="number"
                                        value={field.decimalPlaces !== undefined ? field.decimalPlaces : 2}
                                        onChange={(e) => handleFieldPropertyChange(field.id, 'decimalPlaces', Number(e.target.value))}
                                        style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', width: '100%' }}
                                      />
                                    </div>
                                  </>
                                )}

                                {/* D. PHONE CONFIG */}
                                {field.type === 'phone' && (
                                  <>
                                    <div>
                                      <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: '#475569', marginBottom: '2px' }}>COUNTRY CODE</label>
                                      <input
                                        type="text"
                                        value={field.countryCode || '+1'}
                                        onChange={(e) => handleFieldPropertyChange(field.id, 'countryCode', e.target.value)}
                                        placeholder="e.g. +1 or +91"
                                        style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', width: '100%' }}
                                      />
                                    </div>
                                    <div>
                                      <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: '#475569', marginBottom: '2px' }}>FORMAT PATTERN</label>
                                      <input
                                        type="text"
                                        value={field.phoneFormat || '(###) ###-####'}
                                        onChange={(e) => handleFieldPropertyChange(field.id, 'phoneFormat', e.target.value)}
                                        placeholder="e.g. (###) ###-####"
                                        style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', width: '100%' }}
                                      />
                                    </div>
                                  </>
                                )}

                                {/* E. DATE CONFIG */}
                                {field.type === 'date' && (
                                  <div>
                                    <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: '#475569', marginBottom: '2px' }}>DATE FORMAT</label>
                                    <select
                                      value={field.dateFormat || 'YYYY-MM-DD'}
                                      onChange={(e) => handleFieldPropertyChange(field.id, 'dateFormat', e.target.value)}
                                      style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', width: '100%', background: 'white' }}
                                    >
                                      <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                                      <option value="DD/MM/YYYY">DD/MM/YYYY (UK/IN)</option>
                                      <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
                                      <option value="DD MMM YYYY">DD MMM YYYY</option>
                                    </select>
                                  </div>
                                )}

                                {/* F. FILE CONFIG */}
                                {field.type === 'file' && (
                                  <>
                                    <div>
                                      <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: '#475569', marginBottom: '2px' }}>ALLOWED TYPES</label>
                                      <input
                                        type="text"
                                        value={field.allowedTypes || '.pdf,.doc,.png'}
                                        onChange={(e) => handleFieldPropertyChange(field.id, 'allowedTypes', e.target.value)}
                                        placeholder="e.g. .pdf,.doc"
                                        style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', width: '100%' }}
                                      />
                                    </div>
                                    <div>
                                      <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: '#475569', marginBottom: '2px' }}>MAX SIZE (MB)</label>
                                      <input
                                        type="number"
                                        value={field.maxSizeMb || 10}
                                        onChange={(e) => handleFieldPropertyChange(field.id, 'maxSizeMb', Number(e.target.value))}
                                        style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', width: '100%' }}
                                      />
                                    </div>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Add Custom Field Form */}
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#334155' }}>Add Custom Field</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 140px auto', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Field label (e.g. Expected CTC)"
                    value={newFieldLabel}
                    onChange={(e) => setNewFieldLabel(e.target.value)}
                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none' }}
                  />
                  <select
                    value={newFieldType}
                    onChange={(e) => setNewFieldType(e.target.value)}
                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', background: 'white' }}
                  >
                    {ALL_FIELD_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  <select
                    value={newFieldOptionsSource}
                    onChange={(e) => setNewFieldOptionsSource(e.target.value)}
                    disabled={!['dropdown', 'radio', 'multiselect', 'status'].includes(newFieldType)}
                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', background: 'white' }}
                  >
                    <option value="manual">Manual Options</option>
                    <option value="departments">Sys: Departments</option>
                    <option value="designations">Sys: Designations</option>
                    <option value="ats_stages">Sys: ATS Stages</option>
                    <option value="employment_types">Sys: Employment</option>
                  </select>
                  <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={handleAddCustomField}>
                    Add Field
                  </Button>
                </div>

                {newFieldOptionsSource === 'manual' && ['dropdown', 'radio', 'multiselect'].includes(newFieldType) && (
                  <input
                    type="text"
                    placeholder="Enter manual options comma-separated (e.g. Full-time, Part-time, Contract)"
                    value={newFieldManualOptions}
                    onChange={(e) => setNewFieldManualOptions(e.target.value)}
                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', width: '100%' }}
                  />
                )}
              </div>
            </div>
          )}

          {/* SECTION: DROPDOWNS / LOOKUP DATA */}
          {activeNav === 'lookup_data' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                Single source of truth for all module-specific lookup datasets (Departments, Designations, Categories, Statuses, Vendors, etc.). Changes update all Forms, Filters, Search, and Lists live.
              </div>

              {/* Dataset Management Panel */}
              <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '16px' }}>
                {/* Dataset Selector List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderRight: '1px solid #e2e8f0', paddingRight: '12px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>LOOKUP DATASETS</div>
                  {Object.keys(configState.lookupData || {}).map(dsKey => (
                    <button
                      key={dsKey}
                      type="button"
                      onClick={() => setSelectedLookupDataset(dsKey)}
                      style={{
                        textAlign: 'left',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: selectedLookupDataset === dsKey ? '800' : '600',
                        border: 'none',
                        background: selectedLookupDataset === dsKey ? 'rgba(13, 148, 136, 0.12)' : '#f8fafc',
                        color: selectedLookupDataset === dsKey ? '#0d9488' : '#334155',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <span>{dsKey.replace(/_/g, ' ').toUpperCase()}</span>
                      <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '10px', background: '#e2e8f0', color: '#475569' }}>
                        {(configState.lookupData[dsKey] || []).length}
                      </span>
                    </button>
                  ))}

                  {/* Add Dataset Button */}
                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '8px', marginTop: '6px' }}>
                    <input
                      type="text"
                      placeholder="New dataset key (e.g. vendors)"
                      value={newDatasetKey}
                      onChange={(e) => setNewDatasetKey(e.target.value)}
                      style={{ width: '100%', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', marginBottom: '6px' }}
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Plus size={12} />}
                      onClick={handleAddLookupDataset}
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      Add Dataset
                    </Button>
                  </div>
                </div>

                {/* Dataset Values Editor */}
                {selectedLookupDataset ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                        Dataset: <span style={{ color: '#0d9488' }}>{selectedLookupDataset.replace(/_/g, ' ').toUpperCase()}</span>
                      </h4>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleExportLookupDataset(selectedLookupDataset)}
                        >
                          Export
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setShowImportDatasetModal(true)}
                        >
                          Import
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          icon={<Trash2 size={12} />}
                          onClick={() => handleDeleteLookupDataset(selectedLookupDataset)}
                          style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                        >
                          Delete Dataset
                        </Button>
                      </div>
                    </div>

                    {/* Options Badges */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', minHeight: '100px' }}>
                      {(configState.lookupData[selectedLookupDataset] || []).map((opt, optIdx) => {
                        const optStyle = LabelEngine.getOptionStyle(opt, configState);
                        const currentColor = configState.lookupColors?.[opt] || optStyle.color;

                        return (
                          <div
                            key={optIdx}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '4px 10px',
                              borderRadius: '16px',
                              background: optStyle.bg,
                              border: `1px solid ${optStyle.border}`,
                              fontSize: '12px',
                              fontWeight: '700',
                              color: optStyle.color,
                              boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                            }}
                          >
                            <input
                              type="color"
                              value={currentColor.startsWith('#') ? currentColor : '#0d9488'}
                              onChange={(e) => handleUpdateOptionColor(opt, e.target.value)}
                              title="Click to customize option badge color"
                              style={{ width: '16px', height: '16px', borderRadius: '50%', border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                            />
                            <span>{opt}</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteLookupItem(selectedLookupDataset, optIdx)}
                              style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', padding: 0, display: 'flex', alignItems: 'center', fontWeight: 'bold' }}
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                      {(configState.lookupData[selectedLookupDataset] || []).length === 0 && (
                        <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>No items in this dataset yet.</span>
                      )}
                    </div>

                    {/* Add Item to Dataset */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder={`Add new item to ${selectedLookupDataset}...`}
                        value={newLookupItem}
                        onChange={(e) => setNewLookupItem(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddLookupItem(selectedLookupDataset); } }}
                        style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none' }}
                      />
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<Plus size={14} />}
                        onClick={() => handleAddLookupItem(selectedLookupDataset)}
                        style={{ background: '#0d9488', color: 'white', border: 'none' }}
                      >
                        Add Item
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                    Select a lookup dataset on the left or create a new dataset.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECTION: SUMMARY */}
          {activeNav === 'summary' && capabilities.summary && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                Reorder, enable/disable, or add custom stage-count summary KPI cards. Recruitment dashboard updates automatically.
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', maxHeight: '280px', overflowY: 'auto' }}>
                {configState.summaryWidgets.map((widget, idx) => (
                  <div
                    key={widget.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'space-between',
                      padding: '10px 14px',
                      borderBottom: '1px solid #f1f5f9',
                      background: widget.enabled ? '#ffffff' : '#f8fafc'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <button type="button" disabled={idx === 0} onClick={() => handleMoveWidget(idx, 'up')} style={{ border: 'none', background: 'none', cursor: idx === 0 ? 'not-allowed' : 'pointer', opacity: idx === 0 ? 0.3 : 1 }}>▲</button>
                        <button type="button" disabled={idx === configState.summaryWidgets.length - 1} onClick={() => handleMoveWidget(idx, 'down')} style={{ border: 'none', background: 'none', cursor: idx === configState.summaryWidgets.length - 1 ? 'not-allowed' : 'pointer', opacity: idx === configState.summaryWidgets.length - 1 ? 0.3 : 1 }}>▼</button>
                      </div>
                      <span style={{ fontSize: '16px' }}>{widget.icon || '📊'}</span>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '12px', color: widget.enabled ? '#0f172a' : '#94a3b8' }}>
                          {widget.label}
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>
                          Type: {widget.metricType} {widget.stageName ? `(${widget.stageName})` : ''}
                        </div>
                      </div>
                    </div>

                    <Button
                      variant={widget.enabled ? 'secondary' : 'outline'}
                      size="sm"
                      onClick={() => handleToggleWidget(widget.id)}
                    >
                      {widget.enabled ? 'Enabled' : 'Disabled'}
                    </Button>
                  </div>
                ))}
              </div>

              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <select
                  value={selectedWidgetStage}
                  onChange={(e) => setSelectedWidgetStage(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', background: 'white', flex: 1 }}
                >
                  <option value="">Select Stage for Stage-Count Widget...</option>
                  {activePipelineStages.map(s => (
                    <option key={s.id || s.name} value={s.id || s.name}>
                      Stage: {s.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Optional Label (e.g. SCREENING COUNT)"
                  value={newWidgetLabel}
                  onChange={(e) => setNewWidgetLabel(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', flex: 1 }}
                />
                <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={handleAddStageWidget}>
                  Add Widget
                </Button>
              </div>
            </div>
          )}

          {/* SECTION: ID FORMAT & PREFIX */}
          {activeNav === 'id_config' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '18px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '15px', marginBottom: '4px' }}>
                  ⚙️ Candidate & Record ID Format Configuration
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '18px' }}>
                  Type custom ID prefix (e.g. ATS, EMP, LEAD, CAND), sequence pattern template string, and next sequence starting counter directly.
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                      ID Prefix Code (e.g. ATS, EMP, LEAD, CAND)
                    </label>
                    <input
                      type="text"
                      value={configState.idConfig?.prefix || 'ATS'}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '');
                        setConfigState(prev => ({
                          ...prev,
                          idConfig: { ...(prev.idConfig || {}), prefix: val || 'ATS' }
                        }));
                      }}
                      placeholder="e.g. ATS"
                      style={{ width: '100%', padding: '8px 12px', fontSize: '13px', fontWeight: '800', borderRadius: '6px', border: '1px solid #cbd5e1', textTransform: 'uppercase' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                      Sequence Pattern Format (e.g. ATS-2026-001, CAND-001)
                    </label>
                    <input
                      type="text"
                      value={configState.idConfig?.pattern || `${configState.idConfig?.prefix || 'ATS'}-001`}
                      onChange={(e) => {
                        const val = e.target.value;
                        setConfigState(prev => ({
                          ...prev,
                          idConfig: { ...(prev.idConfig || {}), pattern: val }
                        }));
                      }}
                      placeholder="e.g. ATS-2026-001 or CAND-001"
                      style={{ width: '100%', padding: '8px 12px', fontSize: '13px', fontWeight: '800', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#334155', marginBottom: '6px' }}>
                      Next Sequence Number (Starting Counter ID)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={configState.idConfig?.nextSeq || 1}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 1;
                        setConfigState(prev => ({
                          ...prev,
                          idConfig: { ...(prev.idConfig || {}), nextSeq: val }
                        }));
                      }}
                      style={{ width: '100%', padding: '8px 12px', fontSize: '13px', fontWeight: '800', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '20px', padding: '14px 18px', background: '#ffffff', borderRadius: '8px', border: '1px dashed #0d9488', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a' }}>Live Pattern Sample Preview:</span>
                  {[0, 1, 2].map(offset => {
                    const sample = formatCustomSequencePattern(
                      configState.idConfig?.pattern || `${configState.idConfig?.prefix || 'ATS'}-001`,
                      (configState.idConfig?.nextSeq || 1) + offset
                    );
                    return (
                      <span key={offset} style={{ fontSize: '12px', fontWeight: '800', padding: '4px 12px', borderRadius: '6px', background: 'rgba(13, 148, 136, 0.1)', color: '#0d9488', fontFamily: 'monospace' }}>
                        {sample}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* SECTION: SEARCH & FILTERS */}
          {activeNav === 'search_filters' && capabilities.searchFilters && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                Configure which fields are checked by Search and which fields appear inside the Filters popover drawer.
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead style={{ background: '#f8fafc' }}>
                    <tr>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>FIELD LABEL</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>SEARCHABLE</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>FILTERABLE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {configState.fields.map(field => (
                      <tr key={field.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 12px', fontWeight: '700', color: '#0f172a' }}>
                          {field.label}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={!!field.searchable}
                            onChange={() => handleToggleFieldProp(field.id, 'searchable')}
                            style={{ accentColor: '#0d9488', width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={!!field.filterable}
                            onChange={() => handleToggleFieldProp(field.id, 'filterable')}
                            style={{ accentColor: '#0d9488', width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECTION: LIST VIEW */}
          {activeNav === 'columns' && capabilities.listView && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                Configure column visibility, column width, alignment (`left`/`center`/`right`), and display order for Candidate Roster List view.
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                {configState.columns.map((col, idx) => (
                  <div
                    key={col.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'space-between',
                      padding: '10px 14px',
                      borderBottom: '1px solid #f1f5f9',
                      background: col.visible ? '#ffffff' : '#f8fafc',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <button type="button" disabled={idx === 0} onClick={() => handleMoveColumn(idx, 'up')} style={{ border: 'none', background: 'none', cursor: idx === 0 ? 'not-allowed' : 'pointer', opacity: idx === 0 ? 0.3 : 1 }}>▲</button>
                        <button type="button" disabled={idx === configState.columns.length - 1} onClick={() => handleMoveColumn(idx, 'down')} style={{ border: 'none', background: 'none', cursor: idx === configState.columns.length - 1 ? 'not-allowed' : 'pointer', opacity: idx === configState.columns.length - 1 ? 0.3 : 1 }}>▼</button>
                      </div>
                      <div style={{ fontWeight: '700', fontSize: '12px', color: col.visible ? '#0f172a' : '#94a3b8' }}>
                        {col.label} {col.systemColumn && <span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: '6px' }}>(Protected)</span>}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input
                        type="text"
                        placeholder="Width (e.g. 160px)"
                        value={col.width || ''}
                        onChange={(e) => handleColumnChange(col.id, 'width', e.target.value)}
                        style={{ width: '90px', padding: '4px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px' }}
                      />
                      <select
                        value={col.align || 'left'}
                        onChange={(e) => handleColumnChange(col.id, 'align', e.target.value)}
                        style={{ padding: '4px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px', background: 'white' }}
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                      <Button
                        variant={col.visible ? 'secondary' : 'outline'}
                        size="sm"
                        disabled={col.systemColumn}
                        onClick={() => handleToggleColumn(col.id)}
                      >
                        {col.visible ? 'Visible' : 'Hidden'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION: KANBAN VIEW */}
          {activeNav === 'kanban' && capabilities.kanbanView && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                Configure Kanban column grouping field and card metadata visibility.
              </div>

              {/* KANBAN GROUPING FIELD SELECTOR */}
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: '800', color: '#0f172a' }}>KANBAN COLUMN GROUPING FIELD</label>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Choose which field groups records into board columns (e.g. Status, Department, System Role):</div>
                <select
                  value={configState.kanbanConfig?.groupByField || 'status'}
                  onChange={(e) => {
                    const val = e.target.value;
                    setConfigState(prev => ({
                      ...prev,
                      kanbanConfig: {
                        ...(prev.kanbanConfig || {}),
                        groupByField: val
                      }
                    }));
                  }}
                  style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', background: 'white', maxWidth: '300px' }}
                >
                  {configState.fields.filter(f => !f.archived && (f.type === 'dropdown' || f.type === 'select' || f.type === 'radio' || f.type === 'status' || f.id === 'status' || f.id === 'stage' || f.id === 'department' || f.id === 'role')).map(f => (
                    <option key={f.id} value={f.id || f.key}>{f.label} ({f.id})</option>
                  ))}
                </select>
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                {[
                  { key: 'position', label: 'Candidate Position' },
                  { key: 'email', label: 'Email Address' },
                  { key: 'phone', label: 'Phone Number' },
                  { key: 'resume', label: 'Resume Badge' }
                ].map(item => (
                  <div
                    key={item.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'space-between',
                      padding: '12px 16px',
                      borderBottom: '1px solid #f1f5f9'
                    }}
                  >
                    <div style={{ fontWeight: '700', fontSize: '12px', color: '#0f172a' }}>
                      {item.label}
                    </div>
                    <input
                      type="checkbox"
                      checked={!!configState.kanbanFields[item.key]}
                      onChange={() => handleToggleKanbanField(item.key)}
                      style={{ accentColor: '#0d9488', width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION: VIEWS */}
          {activeNav === 'views' && capabilities.views && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                Configure supported view modes and default view mode on load.
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                {[
                  { key: 'list', label: 'List View', desc: 'Standard data grid table view', icon: <List size={16} /> },
                  { key: 'kanban', label: 'Kanban Board View', desc: 'Interactive drag-and-drop board view', icon: <LayoutGrid size={16} /> },
                  { key: 'calendar', label: 'Calendar View', desc: 'Schedule and event calendar view', icon: <Calendar size={16} /> },
                  { key: 'timeline', label: 'Timeline View', desc: 'Chronological event stream view', icon: <Clock size={16} /> },
                  { key: 'gallery', label: 'Gallery View', desc: 'Visual card gallery layout view', icon: <Image size={16} /> },
                  { key: 'tree', label: 'Tree / Org View', desc: 'Hierarchical structure & org chart view', icon: <GitFork size={16} /> },
                  { key: 'gantt', label: 'Gantt View', desc: 'Project milestone & dependency timeline', icon: <BarChartHorizontal size={16} /> },
                  { key: 'map', label: 'Map View', desc: 'Geographic location map view', icon: <MapPin size={16} /> }
                ].map(view => {
                  let availableViewsArr = [];
                  if (Array.isArray(configState.views?.availableViews)) {
                    availableViewsArr = configState.views.availableViews;
                  } else if (configState.views && typeof configState.views === 'object') {
                    availableViewsArr = Object.keys(configState.views).filter(k => configState.views[k] === true);
                  }
                  const isEnabled = availableViewsArr.includes(view.key) || (configState.views?.[view.key] === true);
                  const isDefault = (configState.views?.defaultView || configState.defaultView || availableViewsArr[0] || 'list') === view.key;

                  return (
                    <div
                      key={view.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justify: 'space-between',
                        padding: '12px 16px',
                        borderBottom: '1px solid #f1f5f9',
                        background: isEnabled ? '#ffffff' : '#f8fafc'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ color: '#0d9488' }}>{view.icon}</span>
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '12px', color: isEnabled ? '#0f172a' : '#94a3b8' }}>
                            {view.label}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{view.desc}</div>
                          {isDefault && <Badge variant="success" style={{ marginTop: '2px' }}>Default View</Badge>}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {isEnabled && !isDefault && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setConfigState(prev => ({
                                ...prev,
                                views: {
                                  ...(prev.views || {}),
                                  defaultView: view.key
                                }
                              }));
                              showToast(`Set default view to "${view.label}"`, 'info');
                            }}
                          >
                            Set Default
                          </Button>
                        )}
                        <Button
                          variant={isEnabled ? 'secondary' : 'outline'}
                          size="sm"
                          disabled={isDefault}
                          onClick={() => {
                            let nextViews = [...availableViewsArr];
                            if (isEnabled) {
                              nextViews = nextViews.filter(k => k !== view.key);
                            } else {
                              nextViews.push(view.key);
                            }
                            const viewMap = { ...(configState.views || {}) };
                            nextViews.forEach(k => { viewMap[k] = true; });
                            Object.keys(viewMap).forEach(k => {
                              if (!nextViews.includes(k) && k !== 'defaultView' && k !== 'availableViews') {
                                viewMap[k] = false;
                              }
                            });
                            setConfigState(prev => ({
                              ...prev,
                              views: {
                                ...viewMap,
                                availableViews: nextViews,
                                defaultView: nextViews.includes(prev.views?.defaultView) ? prev.views?.defaultView : (nextViews[0] || 'list')
                              }
                            }));
                          }}
                        >
                          {isEnabled ? 'Enabled' : 'Disabled'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* BULK ACTIONS CONTROL PANEL */}
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontWeight: '800', fontSize: '12px', color: '#0f172a', textTransform: 'uppercase' }}>
                  BULK ACTIONS PERMISSION CONTROL
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  Enable or disable universal bulk operations for records selected in this module.
                </div>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                  {[
                    { key: 'selectAll', label: 'Select All Visible', desc: 'Allow bulk select all visible records' },
                    { key: 'archive', label: 'Archive Selected', desc: 'Allow bulk archiving selected records' },
                    { key: 'restore', label: 'Restore Selected', desc: 'Allow bulk restoring archived records' },
                    { key: 'duplicate', label: 'Duplicate Selected', desc: 'Allow bulk record duplication with new IDs' },
                    { key: 'delete', label: 'Delete Selected (Governance Prompt)', desc: 'Allow bulk delete warning & archive redirection' }
                  ].map(ba => {
                    const isEnabled = configState.bulkActions ? configState.bulkActions[ba.key] !== false : true;
                    return (
                      <div key={ba.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid #f1f5f9', background: '#ffffff' }}>
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '12px', color: '#0f172a' }}>{ba.label}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{ba.desc}</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setConfigState(prev => ({
                              ...prev,
                              bulkActions: {
                                ...(prev.bulkActions || { selectAll: true, archive: true, restore: true, duplicate: true, delete: true }),
                                [ba.key]: val
                              }
                            }));
                          }}
                          style={{ accentColor: '#0d9488', width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ARCHIVE FIELD POLICY MODAL */}
      {showArchiveModal && fieldToArchive && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#ffffff', borderRadius: '12px', width: '440px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>{archiveUsageCount > 0 ? '⚠️' : '📦'}</span>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                {archiveUsageCount > 0 ? `Field Currently In Use (${archiveUsageCount} Records)` : `Archive Field "${fieldToArchive.label}"`}
              </h3>
            </div>

            <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: '1.5' }}>
              {archiveUsageCount > 0
                ? `This field is currently used by ${archiveUsageCount} record(s). Permanent deletion is disabled to prevent data loss. You can archive this field instead. Archiving removes it from active use while preserving all historical data.`
                : `This field is currently unused. Would you like to archive it? Archiving removes it from active forms and views while keeping historical metadata intact.`
              }
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
              <Button variant="secondary" size="sm" onClick={() => setShowArchiveModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleConfirmArchiveField} style={{ background: '#ef4444', borderColor: '#ef4444', color: 'white' }}>
                Archive Field
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CHANGE IMPACT ANALYSIS MODAL */}
      {showImpactModal && pendingImpactChange && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#ffffff', borderRadius: '12px', width: '480px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>⚠️</span>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                Risk Analysis: Change Field Type
              </h3>
            </div>

            <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: '1.5' }}>
              Modifying <strong>"{pendingImpactChange.fieldLabel}"</strong> from <code>{pendingImpactChange.oldType}</code> to <code>{pendingImpactChange.newType}</code> may affect existing system components:
            </p>

            <div style={{ background: '#fffbe6', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ffe58f', fontSize: '11px', color: '#78350f', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div>📄 <strong>Existing Records</strong>: Stored values will not be deleted, but formatting may alter.</div>
              <div>📝 <strong>Forms & Inputs</strong>: Input controls will switch to {pendingImpactChange.newType} inputs.</div>
              <div>🔍 <strong>Search & Filters</strong>: Filter indexes and quick search matches will re-sync.</div>
              <div>📊 <strong>Reports & Automations</strong>: Downstream integrations using this key will adapt to the new type.</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
              <Button variant="secondary" size="sm" onClick={() => setShowImpactModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleConfirmImpactChange} style={{ background: '#0d9488', color: 'white', border: 'none' }}>
                Confirm & Apply Change
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT DATASET ITEMS MODAL */}
      {showImportDatasetModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#ffffff', borderRadius: '12px', width: '480px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
              Import Items into "{selectedLookupDataset}"
            </h3>

            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
              Paste comma-separated values, line-separated text, or a JSON array of items:
            </p>

            <textarea
              rows={6}
              value={importDatasetText}
              onChange={(e) => setImportDatasetText(e.target.value)}
              placeholder="e.g. Sales, Engineering, Marketing, Finance..."
              style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontFamily: 'monospace', width: '100%', outline: 'none' }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button variant="secondary" size="sm" onClick={() => setShowImportDatasetModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleImportLookupItems} style={{ background: '#0d9488', color: 'white', border: 'none' }}>
                Import Items
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

