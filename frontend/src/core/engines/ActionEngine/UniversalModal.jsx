/**
 * UNIVERSAL FORM MODAL COMPONENT
 * 100% Schema-Driven Modal for Add & Edit Form Workflows
 */

import React, { useState, useEffect } from 'react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import SchemaFieldRenderer from '../FieldEngine/SchemaFieldRenderer';
import { DefaultValueEngine } from '../DefaultValueEngine';
import { ValidationEngine } from '../ValidationEngine';
import { LabelEngine } from '../LabelEngine';
import { getNextCategoryAssetTag } from '../../../services/atsStorageService';

export default function UniversalModal({
  isOpen = false,
  onClose = () => {},
  onSubmit = () => {},
  moduleConfig = {},
  initialRecord = null,
  mode = 'create', // 'create' | 'edit'
  systemDropdowns = null,
  activePipelineStages = [],
  allPositions = []
}) {
  const isCreate = mode === 'create';
  const targetFields = (moduleConfig.fields || []).filter(f => !f.archived && !f.deleted && (isCreate ? f.showOnCreate !== false : f.showOnEdit !== false));

  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isTagManuallyEdited, setIsTagManuallyEdited] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const initial = DefaultValueEngine.initializeFormState(targetFields, initialRecord || {});
      
      // Auto-prefill Category-Aware Asset Tag ID for Asset Management
      if (isCreate && (moduleConfig.moduleId === 'asset_management' || targetFields.some(f => f.id === 'tag'))) {
        const defaultCat = initial.category || 'Laptop';
        const customPrefixes = moduleConfig?.idConfig?.categoryPrefixes || null;
        initial.tag = getNextCategoryAssetTag(defaultCat, allPositions || [], customPrefixes);
      }

      setFormData(initial);
      setFormErrors({});
      setIsTagManuallyEdited(false);
    }
  }, [isOpen, initialRecord, mode, moduleConfig]);

  const handleFieldChange = (fieldId, value) => {
    setFormData(prev => {
      const updated = { ...prev, [fieldId]: value };

      if (fieldId === 'tag') {
        setIsTagManuallyEdited(true);
      }

      // Dynamic Auto-Update Tag ID on Category Change if user hasn't manually edited Tag ID
      if (fieldId === 'category' && isCreate && !isTagManuallyEdited && (moduleConfig.moduleId === 'asset_management' || targetFields.some(f => f.id === 'tag'))) {
        const customPrefixes = moduleConfig?.idConfig?.categoryPrefixes || null;
        updated.tag = getNextCategoryAssetTag(value, allPositions || [], customPrefixes);
      }

      return updated;
    });

    if (formErrors[fieldId]) {
      setFormErrors(prev => ({ ...prev, [fieldId]: null }));
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const { valid, errors } = ValidationEngine.validateForm(targetFields, formData);

    if (!valid) {
      setFormErrors(errors);
      return;
    }

    setIsSaving(true);
    onSubmit(formData);
    setIsSaving(false);
    onClose();
  };

  const recordName = initialRecord ? (initialRecord.name || initialRecord.title) : '';
  const modalTitle = LabelEngine.getModalTitle(moduleConfig, mode, recordName);
  const modalSubtitle = LabelEngine.getModalSubtitle(moduleConfig, mode);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      subtitle={modalSubtitle}
    >
      <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {targetFields.map(field => (
          <SchemaFieldRenderer
            key={field.id}
            field={field}
            value={formData[field.id]}
            onChange={(val) => handleFieldChange(field.id, val)}
            error={formErrors[field.id]}
            mode={mode}
            moduleConfig={moduleConfig}
            systemDropdowns={systemDropdowns}
            activePipelineStages={activePipelineStages}
            allPositions={allPositions}
          />
        ))}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
          <Button variant="secondary" size="md" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            type="submit"
            disabled={isSaving}
            style={{ background: 'linear-gradient(135deg, #0d9488 0%, #064e43 100%)', color: 'white', border: 'none' }}
          >
            {isSaving ? 'Saving...' : isCreate ? `Add ${LabelEngine.getEntityName(moduleConfig)}` : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
