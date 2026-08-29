/**
 * UNIVERSAL ACTION ENGINE ORCHESTRATOR
 * Core Action Handler Managing Add, Edit, View, Archive & Restore Workflows
 */

import React, { useState } from 'react';
import UniversalModal from './UniversalModal';
import UniversalDrawer from './UniversalDrawer';
import ConfirmationModal from './ConfirmationModal';
import ArchivedModal from './ArchivedModal';
import { LabelEngine } from '../LabelEngine';
import { getNextSequentialId } from '../../../services/atsStorageService';

import FirebaseCloudEngine from '../FirebaseCloudEngine';
import { AuditEngine } from '../AuditEngine/AuditEngine';

export default function ActionEngine({
  moduleConfig = {},
  records = [],
  setRecords = () => {},
  showAddModal = false,
  setShowAddModal = () => {},
  showEditModal = false,
  setShowEditModal = () => {},
  showDetailModal = false,
  setShowDetailModal = () => {},
  showArchiveModal = false,
  setShowArchiveModal = () => {},
  showArchivedModal = false,
  setShowArchivedModal = () => {},
  recordToArchive = null,
  setRecordToArchive = () => {},
  selectedRecord = null,
  setSelectedRecord = () => {},
  canManage = true,
  systemDropdowns = null,
  activePipelineStages = [],
  allPositions = [],
  archivedModuleItems = [],
  handleRestoreBinItem = () => {},
  handlePermanentDeleteBinItem = () => {},
  softDeleteRecord = () => {},
  showToast = () => {}
}) {
  const [internalRecordToArchive, setInternalRecordToArchive] = useState(null);

  const handleSaveRecord = (formData) => {
    const now = new Date().toISOString();
    const entityName = LabelEngine.getEntityName(moduleConfig);

    const normalizedData = {
      ...formData,
      name: formData.name || formData.fullName || formData.employeeName || formData.candidateName || formData.title || ''
    };

    const isCrmModule = moduleConfig.moduleId === 'crm_deals' || moduleConfig.moduleId === 'crm_leads' || moduleConfig.moduleId === 'crm';
    const API_URL = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
      ? 'http://localhost:5000/api'
      : 'https://api.employeemanagementsystems.com/api';
    const token = typeof window !== 'undefined' ? localStorage.getItem('omnilflow_token') : null;

    if (showEditModal && selectedRecord && selectedRecord.id) {
      // EDIT WORKFLOW
      const updatedList = records.map(r => {
        if (r.id === selectedRecord.id) {
          return {
            ...r,
            ...normalizedData,
            updatedAt: now
          };
        }
        return r;
      });
      setRecords(updatedList);

      const editedRec = updatedList.find(r => r.id === selectedRecord.id);
      if (editedRec && moduleConfig.moduleId) {
        FirebaseCloudEngine.saveRecord(moduleConfig.moduleId, editedRec, 'acme_corp');
      }

      // Sync CRM update with SQLite backend & GHL
      if (isCrmModule) {
        const crmEditPayload = {
          customName: normalizedData.contact || normalizedData.name || selectedRecord.customName,
          email: normalizedData.email,
          notes: normalizedData.notes,
          pipelineStage: normalizedData.status || normalizedData.stage,
          dealValue: parseFloat(normalizedData.amount || normalizedData.dealValue || 0)
        };
        fetch(`${API_URL}/contacts/${encodeURIComponent(selectedRecord.id)}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify(crmEditPayload)
        }).then(() => {
          fetch(`${API_URL}/v1/integrations/ghl/contacts/${encodeURIComponent(selectedRecord.id)}/sync`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
          }).catch(() => {});
        }).catch(e => console.warn('[CRM Update Error]', e));
      }

      AuditEngine.logRecordUpdated(
        moduleConfig.moduleId || 'module',
        normalizedData.name || selectedRecord.name || selectedRecord.title || String(selectedRecord.id),
        selectedRecord,
        normalizedData
      );

      showToast(`Updated ${entityName.toLowerCase()} "${normalizedData.name || selectedRecord.id}"`, 'success');
      setShowEditModal(false);
    } else {
      // CREATE WORKFLOW WITH SEQUENTIAL IDs (e.g. EMP-001, ATS-001)
      const cleanPhone = (normalizedData.phone || '').replace(/[^0-9]/g, '');
      const nextSeqId = isCrmModule && cleanPhone 
        ? `${cleanPhone}@s.whatsapp.net` 
        : getNextSequentialId('default_tenant', moduleConfig.moduleId || 'recruitment_ats', moduleConfig, records);

      const newRec = {
        id: nextSeqId,
        ...normalizedData,
        createdAt: now,
        updatedAt: now,
        archived: false,
        lifecycleStatus: 'ACTIVE'
      };
      setRecords([newRec, ...records]);

      if (moduleConfig.moduleId) {
        FirebaseCloudEngine.saveRecord(moduleConfig.moduleId, newRec, 'acme_corp');
      }

      // Sync new CRM Deal to SQLite backend & GHL
      if (isCrmModule) {
        const crmPayload = {
          name: normalizedData.name || normalizedData.deal || normalizedData.title || 'New Deal',
          phone: cleanPhone || normalizedData.phone || '',
          stage: normalizedData.status || normalizedData.stage || 'lead',
          notes: normalizedData.notes || '',
          dealValue: parseFloat(normalizedData.amount || normalizedData.dealValue || 0),
          email: normalizedData.email || '',
          customName: normalizedData.contact || normalizedData.name || ''
        };

        fetch(`${API_URL}/contacts/crm-sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify(crmPayload)
        }).then(res => res.json()).then(data => {
          if (data.contact?.id) {
            fetch(`${API_URL}/v1/integrations/ghl/contacts/${encodeURIComponent(data.contact.id)}/sync`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
              }
            }).catch(() => {});
          }
        }).catch(err => console.warn('[CRM Sync Error]', err));
      }

      AuditEngine.logRecordCreated(
        moduleConfig.moduleId || 'module',
        newRec.name || newRec.title || String(newRec.id),
        newRec
      );

      // Save user credentials for workspace login if password is provided
      if (normalizedData.password) {
        try {
          const userAccountObj = {
            email: (normalizedData.email || '').toLowerCase().trim(),
            password: normalizedData.password,
            name: normalizedData.name || normalizedData.title || 'Staff User',
            role: normalizedData.role || 'staff',
            department: normalizedData.department || 'Operations',
            tenantId: 'acme_corp'
          };
          const savedAccounts = JSON.parse(localStorage.getItem('omniflow_registered_users') || '[]');
          const updatedAccounts = [userAccountObj, ...savedAccounts.filter(a => a.email !== userAccountObj.email)];
          localStorage.setItem('omniflow_registered_users', JSON.stringify(updatedAccounts));
        } catch (e) {}
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('omnilflow_config_updated', {
          detail: { moduleId: moduleConfig.moduleId }
        }));
      }

      showToast(`Added ${entityName.toLowerCase()} "${newRec.name || newRec.title || newRec.id}"`, 'success');
      setShowAddModal(false);
    }

    // Broadcast media vault refresh if any field (system or custom like TEST) contains a file or URL
    if (typeof window !== 'undefined' && normalizedData) {
      const isMediaFileVal = (val) => {
        if (!val || typeof val !== 'string' || val === '—' || val.trim() === '') return false;
        const lower = val.toLowerCase();
        if (lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('data:')) return true;
        const fileExts = ['.png', '.jpg', '.jpeg', '.pdf', '.webp', '.doc', '.docx', '.svg', '.gif', '.xls', '.xlsx'];
        return fileExts.some(ext => lower.endsWith(ext));
      };

      const hasFileVal = Object.values(normalizedData).some(isMediaFileVal);
      if (hasFileVal) {
        window.dispatchEvent(new CustomEvent('media_vault_updated', {
          detail: { moduleId: moduleConfig.moduleId }
        }));
      }
    }
  };

  const handleTriggerArchivePrompt = (record) => {
    if (!record) return;
    if (setRecordToArchive) setRecordToArchive(record);
    setInternalRecordToArchive(record);
    setShowArchiveModal(true);
  };

  const handleConfirmArchive = () => {
    const record = recordToArchive || internalRecordToArchive || selectedRecord;
    if (!record) return;

    const nameStr = record.name || record.title || 'Record';
    const entityName = LabelEngine.getEntityName(moduleConfig);

    const archivedRecordObject = {
      ...record,
      archived: true,
      lifecycleStatus: 'ARCHIVED',
      archivedAt: new Date().toISOString()
    };

    if (moduleConfig.moduleId && record.id) {
      FirebaseCloudEngine.deleteRecord(moduleConfig.moduleId, record.id);
    }

    if (typeof softDeleteRecord === 'function') {
      softDeleteRecord({
        originalId: record.id,
        name: `${entityName}: "${nameStr}"`,
        category: `${entityName} Record`,
        entityData: { record: archivedRecordObject, candidate: archivedRecordObject },
        moduleTab: moduleConfig.moduleId
      });
    }

    const updatedList = records.filter(r => r.id !== record.id);
    setRecords(updatedList);

    // Broadcast config/data update event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('omnilflow_config_updated', {
        detail: { moduleId: moduleConfig.moduleId || 'recruitment_ats' }
      }));
    }

    showToast(`📦 Archived ${entityName.toLowerCase()} "${nameStr}". Accessible in Archived Records.`, 'info');

    setShowArchiveModal(false);
    if (setRecordToArchive) setRecordToArchive(null);
    setInternalRecordToArchive(null);
    setShowDetailModal(false);
    setShowEditModal(false);
  };

  const handleRestoreArchivedRecord = (item) => {
    const payloadRec = item.payload?.record || item.entityData?.record || item.payload?.candidate || item.payload || {};
    const entityName = LabelEngine.getEntityName(moduleConfig);

    const restoredRecord = {
      ...payloadRec,
      id: item.originalId || payloadRec.id || `${moduleConfig.moduleId}_${Date.now()}`,
      archived: false,
      is_archived: 0,
      lifecycleStatus: 'ACTIVE',
      updatedAt: new Date().toISOString()
    };

    setRecords([restoredRecord, ...records.filter(r => r.id !== restoredRecord.id)]);

    if (moduleConfig.moduleId) {
      FirebaseCloudEngine.saveRecord(moduleConfig.moduleId, restoredRecord, 'acme_corp');
    }

    if (typeof handleRestoreBinItem === 'function') {
      handleRestoreBinItem(item);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('omnilflow_config_updated', {
        detail: { moduleId: moduleConfig.moduleId || 'recruitment_ats' }
      }));
    }

    showToast(`🔄 Restored ${entityName.toLowerCase()} "${restoredRecord.name || restoredRecord.title || 'Record'}".`, 'success');
  };

  const handleMoveStage = (recordId, newStage) => {
    let movedRec = null;
    const updatedList = records.map(r => {
      if (String(r.id) === String(recordId)) {
        movedRec = { ...r, status: newStage, stage: newStage, updatedAt: new Date().toISOString() };
        return movedRec;
      }
      return r;
    });
    setRecords(updatedList);

    if (movedRec && moduleConfig.moduleId) {
      FirebaseCloudEngine.saveRecord(moduleConfig.moduleId, movedRec, 'acme_corp');
    }

    showToast(`Moved record to ${newStage}`, 'info');

    if (selectedRecord && String(selectedRecord.id) === String(recordId)) {
      setSelectedRecord(prev => prev ? { ...prev, status: newStage, stage: newStage } : null);
    }
  };

  const archiveRecordTarget = recordToArchive || internalRecordToArchive || selectedRecord;
  const targetName = archiveRecordTarget ? (archiveRecordTarget.name || archiveRecordTarget.title || 'Record') : 'Record';
  const targetEntity = LabelEngine.getEntityName(moduleConfig);

  return (
    <>
      {/* ADD RECORD MODAL */}
      {showAddModal && (
        <UniversalModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleSaveRecord}
          moduleConfig={moduleConfig}
          mode="create"
          systemDropdowns={systemDropdowns}
          activePipelineStages={activePipelineStages}
          allPositions={allPositions}
        />
      )}

      {/* EDIT RECORD MODAL */}
      {showEditModal && selectedRecord && (
        <UniversalModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSubmit={handleSaveRecord}
          moduleConfig={moduleConfig}
          initialRecord={selectedRecord}
          mode="edit"
          systemDropdowns={systemDropdowns}
          activePipelineStages={activePipelineStages}
          allPositions={allPositions}
        />
      )}

      {/* VIEW RECORD DRAWER */}
      {showDetailModal && selectedRecord && (
        <UniversalDrawer
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          record={selectedRecord}
          moduleConfig={moduleConfig}
          onEditRecord={(rec) => { setSelectedRecord(rec); setShowEditModal(true); }}
          onArchiveRecord={handleTriggerArchivePrompt}
          onMoveStage={handleMoveStage}
          canManage={canManage}
          systemDropdowns={systemDropdowns}
          activePipelineStages={activePipelineStages}
        />
      )}

      {/* ARCHIVE CONFIRMATION MODAL */}
      {showArchiveModal && (
        <ConfirmationModal
          isOpen={showArchiveModal}
          onClose={() => {
            setShowArchiveModal(false);
            if (setRecordToArchive) setRecordToArchive(null);
            setInternalRecordToArchive(null);
          }}
          onConfirm={handleConfirmArchive}
          title={`Archive ${targetEntity}`}
          message={`Are you sure you want to archive candidate "${targetName}"? Archived candidates can be restored later.`}
          confirmText="Archive"
          cancelText="Cancel"
        />
      )}
    </>
  );
}
