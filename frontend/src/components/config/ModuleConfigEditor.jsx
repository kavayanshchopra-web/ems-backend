import React, { useState } from 'react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { Plus, Trash2, Eye, EyeOff, Sliders, LayoutGrid, List, Search, Filter, Layers, ArrowLeft } from 'lucide-react';

/**
 * Generic Capability-Driven Module Configuration Editor
 * Left-side vertical navigation sidebar prevents tab clipping on Desktop viewports.
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

  const [activeNav, setActiveNav] = useState('fields');
  const [configState, setConfigState] = useState({
    fields: [...(initialConfig.fields || [])],
    summaryWidgets: [...(initialConfig.summaryWidgets || [])],
    columns: [...(initialConfig.columns || [])],
    kanbanFields: { ...(initialConfig.kanbanFields || { position: true, email: true, phone: true, resume: true }) },
    views: { ...(initialConfig.views || { availableViews: ['kanban', 'list'], defaultView: 'kanban' }) }
  });

  // New Custom Field State
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState('text');
  const [newFieldOptionsSource, setNewFieldOptionsSource] = useState('manual');
  const [newFieldManualOptions, setNewFieldManualOptions] = useState('');

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

    setConfigState(prev => ({ ...prev, fields: updated }));
  };

  const handleToggleFieldProp = (fieldId, prop) => {
    setConfigState(prev => ({
      ...prev,
      fields: prev.fields.map(f => {
        if (f.id === fieldId) {
          if (f.systemField && prop === 'required') return f;
          return { ...f, [prop]: !f[prop] };
        }
        return f;
      })
    }));
  };

  const handleFieldLabelChange = (fieldId, newLabel) => {
    setConfigState(prev => ({
      ...prev,
      fields: prev.fields.map(f => f.id === fieldId ? { ...f, label: newLabel } : f)
    }));
  };

  const handleAddCustomField = () => {
    if (!newFieldLabel.trim()) return;
    const fieldId = 'custom_' + Date.now();

    let manualOpts = [];
    if (newFieldOptionsSource === 'manual' && newFieldManualOptions.trim()) {
      manualOpts = newFieldManualOptions.split(',').map(s => s.trim()).filter(Boolean);
    }

    const newField = {
      id: fieldId,
      label: newFieldLabel.trim(),
      type: newFieldType,
      optionsSource: newFieldOptionsSource,
      manualOptions: manualOpts,
      required: false,
      showOnCreate: true,
      showOnEdit: true,
      showOnView: true,
      searchable: true,
      filterable: newFieldType === 'dropdown' || newFieldType === 'radio',
      systemField: false,
      sortOrder: configState.fields.length + 1
    };

    setConfigState(prev => ({ ...prev, fields: [...prev.fields, newField] }));
    setNewFieldLabel('');
    setNewFieldManualOptions('');
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
      fields: prev.fields.filter(f => f.id !== fieldId)
    }));
    showToast(`Removed field "${field.label}"`, 'info');
  };

  // Widget Reordering Controls
  const handleMoveWidget = (idx, direction) => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= configState.summaryWidgets.length) return;

    const updated = [...configState.summaryWidgets];
    const temp = updated[targetIdx];
    updated[targetIdx] = updated[idx];
    updated[idx] = temp;

    setConfigState(prev => ({ ...prev, summaryWidgets: updated }));
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

  // Column Reordering Controls
  const handleMoveColumn = (idx, direction) => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= configState.columns.length) return;

    const updated = [...configState.columns];
    const temp = updated[targetIdx];
    updated[targetIdx] = updated[idx];
    updated[idx] = temp;

    setConfigState(prev => ({ ...prev, columns: updated }));
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
    onClose();
  };

  const navItems = [
    capabilities.forms && { id: 'fields', label: 'Forms & Fields', icon: <Sliders size={16} /> },
    capabilities.summary && { id: 'summary', label: 'Summary', icon: <Layers size={16} /> },
    capabilities.searchFilters && { id: 'search_filters', label: 'Search & Filters', icon: <Filter size={16} /> },
    capabilities.listView && { id: 'columns', label: 'List View', icon: <List size={16} /> },
    capabilities.kanbanView && { id: 'kanban', label: 'Kanban View', icon: <LayoutGrid size={16} /> },
    capabilities.views && { id: 'views', label: 'Views', icon: <Eye size={16} /> }
  ].filter(Boolean);

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
              {moduleDef?.description}
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

      {/* Main Layout: Left-side Navigation Sidebar + Right-side Content */}
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
              <div style={{ fontSize: '11px', color: '#64748b', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                One Field Schema drives Add, Edit, and View screens. Dynamic properties control field visibility without JSX changes.
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', maxHeight: '340px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 5 }}>
                    <tr>
                      <th style={{ padding: '8px 6px', textAlign: 'center', width: '40px' }}>ORD</th>
                      <th style={{ padding: '8px 8px', textAlign: 'left' }}>LABEL</th>
                      <th style={{ padding: '8px 8px', textAlign: 'center' }}>TYPE</th>
                      <th style={{ padding: '8px 6px', textAlign: 'center' }}>ADD</th>
                      <th style={{ padding: '8px 6px', textAlign: 'center' }}>EDIT</th>
                      <th style={{ padding: '8px 6px', textAlign: 'center' }}>VIEW</th>
                      <th style={{ padding: '8px 6px', textAlign: 'center' }}>REQ</th>
                      <th style={{ padding: '8px 8px', textAlign: 'right' }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {configState.fields.map((field, idx) => (
                      <tr key={field.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '2px', justifyContent: 'center' }}>
                            <button type="button" disabled={idx === 0} onClick={() => handleMoveField(idx, 'up')} style={{ border: 'none', background: 'none', cursor: idx === 0 ? 'not-allowed' : 'pointer', opacity: idx === 0 ? 0.3 : 1 }}>▲</button>
                            <button type="button" disabled={idx === configState.fields.length - 1} onClick={() => handleMoveField(idx, 'down')} style={{ border: 'none', background: 'none', cursor: idx === configState.fields.length - 1 ? 'not-allowed' : 'pointer', opacity: idx === configState.fields.length - 1 ? 0.3 : 1 }}>▼</button>
                          </div>
                        </td>
                        <td style={{ padding: '8px 8px' }}>
                          <input
                            type="text"
                            value={field.label}
                            onChange={(e) => handleFieldLabelChange(field.id, e.target.value)}
                            style={{ padding: '4px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: '600', width: '100%', outline: 'none' }}
                          />
                        </td>
                        <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                          <Badge variant="neutral">{field.type}</Badge>
                        </td>
                        <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                          <button type="button" onClick={() => handleToggleFieldProp(field.id, 'showOnCreate')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: field.showOnCreate ? '#0d9488' : '#94a3b8' }}>
                            {field.showOnCreate ? <Eye size={14} /> : <EyeOff size={14} />}
                          </button>
                        </td>
                        <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                          <button type="button" onClick={() => handleToggleFieldProp(field.id, 'showOnEdit')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: field.showOnEdit ? '#0d9488' : '#94a3b8' }}>
                            {field.showOnEdit ? <Eye size={14} /> : <EyeOff size={14} />}
                          </button>
                        </td>
                        <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                          <button type="button" onClick={() => handleToggleFieldProp(field.id, 'showOnView')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: field.showOnView !== false ? '#0d9488' : '#94a3b8' }}>
                            {field.showOnView !== false ? <Eye size={14} /> : <EyeOff size={14} />}
                          </button>
                        </td>
                        <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={!!field.required}
                            disabled={field.systemField}
                            onChange={() => handleToggleFieldProp(field.id, 'required')}
                            style={{ accentColor: '#0d9488', cursor: field.systemField ? 'not-allowed' : 'pointer' }}
                          />
                        </td>
                        <td style={{ padding: '8px 8px', textAlign: 'right' }}>
                          {!field.systemField ? (
                            <button type="button" onClick={() => handleDeleteField(field.id)} style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}>
                              <Trash2 size={14} />
                            </button>
                          ) : (
                            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700' }}>CORE</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add Custom Field Form */}
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#334155' }}>Add Custom Field</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 140px auto', gap: '8px', alignItems: 'center' }}>
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
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="date">Date</option>
                    <option value="dropdown">Dropdown</option>
                    <option value="radio">Radio</option>
                    <option value="checkbox">Checkbox</option>
                    <option value="url">URL</option>
                    <option value="textarea">Textarea</option>
                  </select>
                  <select
                    value={newFieldOptionsSource}
                    onChange={(e) => setNewFieldOptionsSource(e.target.value)}
                    disabled={newFieldType !== 'dropdown' && newFieldType !== 'radio'}
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

                {newFieldOptionsSource === 'manual' && (newFieldType === 'dropdown' || newFieldType === 'radio') && (
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

          {/* SECTION: SUMMARY */}
          {activeNav === 'summary' && capabilities.summary && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                Reorder, enable/disable, or add custom stage-count summary KPI cards.
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

          {/* SECTION: SEARCH & FILTERS */}
          {activeNav === 'search_filters' && capabilities.searchFilters && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                Configure which fields are checked by Search and which fields appear in the Filters popover panel.
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
                Reorder and toggle column visibility for Candidate Roster List view.
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
                      background: col.visible ? '#ffffff' : '#f8fafc'
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

                    <Button
                      variant={col.visible ? 'secondary' : 'outline'}
                      size="sm"
                      disabled={col.systemColumn}
                      onClick={() => handleToggleColumn(col.id)}
                    >
                      {col.visible ? 'Visible' : 'Hidden'}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION: KANBAN VIEW */}
          {activeNav === 'kanban' && capabilities.kanbanView && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                Select which candidate metadata fields display on Kanban cards.
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
                Configure supported views and default view mode on load.
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                {[
                  { key: 'kanban', label: 'Kanban Board View', icon: <LayoutGrid size={16} /> },
                  { key: 'list', label: 'Candidate Roster List View', icon: <List size={16} /> }
                ].map(view => {
                  const isEnabled = (configState.views.availableViews || []).includes(view.key);
                  const isDefault = configState.views.defaultView === view.key;

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
                          {isDefault && <Badge variant="success">Default View</Badge>}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {isEnabled && !isDefault && (
                          <Button variant="outline" size="sm" onClick={() => handleSetDefaultView(view.key)}>
                            Set Default
                          </Button>
                        )}
                        <Button
                          variant={isEnabled ? 'secondary' : 'outline'}
                          size="sm"
                          onClick={() => handleToggleViewMode(view.key)}
                        >
                          {isEnabled ? 'Enabled' : 'Disabled'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
