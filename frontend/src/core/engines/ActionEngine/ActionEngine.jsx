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

      showToast(`Updated ${entityName.toLowerCase()} "${normalizedData.name || selectedRecord.id}"`, 'success');
      setShowEditModal(false);
    } else {
      // CREATE WORKFLOW WITH SEQUENTIAL IDs (e.g. EMP-001, ATS-001)
      const nextSeqId = getNextSequentialId('default_tenant', moduleConfig.moduleId || 'recruitment_ats', moduleConfig);
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

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('omnilflow_config_updated', {
          detail: { moduleId: moduleConfig.moduleId }
        }));
      }

      showToast(`Added ${entityName.toLowerCase()} "${newRec.name || newRec.title || newRec.id}"`, 'success');
      setShowAddModal(false);
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
