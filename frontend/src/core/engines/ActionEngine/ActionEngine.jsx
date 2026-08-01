/**
 * UNIVERSAL ACTION ENGINE ORCHESTRATOR
 * Core Action Handler Managing Add, Edit, View, Archive & Restore Workflows
 */

import React, { useState } from 'react';
import UniversalModal from './UniversalModal';
import UniversalDrawer from './UniversalDrawer';

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
  selectedRecord = null,
  setSelectedRecord = () => {},
  canManage = true,
  systemDropdowns = null,
  activePipelineStages = [],
  allPositions = [],
  softDeleteRecord = () => {},
  showToast = () => {}
}) {
  const handleSaveRecord = (formData) => {
    const now = new Date().toISOString();
    const entityName = moduleConfig.entityName || 'Record';

    if (selectedRecord && selectedRecord.id) {
      // EDIT WORKFLOW
      const updatedList = records.map(r => {
        if (r.id === selectedRecord.id) {
          return {
            ...r,
            ...formData,
            updatedAt: now
          };
        }
        return r;
      });
      setRecords(updatedList);
      showToast(`Updated ${entityName.toLowerCase()} "${formData.name || formData.title || selectedRecord.id}"`, 'success');
      setShowEditModal(false);
    } else {
      // CREATE WORKFLOW
      const newRec = {
        id: `${moduleConfig.moduleId || 'rec'}_${Date.now()}`,
        ...formData,
        createdAt: now,
        updatedAt: now
      };
      setRecords([newRec, ...records]);
      showToast(`Added ${entityName.toLowerCase()} "${newRec.name || newRec.title || newRec.id}"`, 'success');
      setShowAddModal(false);
    }
  };

  const handleArchiveRecord = (record) => {
    if (!record) return;
    const nameStr = record.name || record.title || 'Record';
    const entityName = moduleConfig.entityName || 'Record';

    if (!window.confirm(`Archive "${nameStr}"? Item will be moved to the Recycle Bin.`)) return;

    softDeleteRecord({
      originalId: record.id,
      name: `${entityName}: "${nameStr}"`,
      category: `${entityName} Record`,
      entityData: { record },
      moduleTab: moduleConfig.moduleId
    });

    const updatedList = records.filter(r => r.id !== record.id);
    setRecords(updatedList);
    showToast(`📦 Archived "${nameStr}". Accessible in Archived Records.`, 'info');

    setShowDetailModal(false);
    setShowEditModal(false);
  };

  const handleMoveStage = (recordId, newStage) => {
    const updatedList = records.map(r => {
      if (r.id === recordId) {
        return { ...r, status: newStage, stage: newStage, updatedAt: new Date().toISOString() };
      }
      return r;
    });
    setRecords(updatedList);
    showToast(`Moved record to ${newStage}`, 'info');

    if (selectedRecord && selectedRecord.id === recordId) {
      setSelectedRecord(prev => prev ? { ...prev, status: newStage, stage: newStage } : null);
    }
  };

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
          onArchiveRecord={handleArchiveRecord}
          onMoveStage={handleMoveStage}
          canManage={canManage}
          systemDropdowns={systemDropdowns}
          activePipelineStages={activePipelineStages}
        />
      )}
    </>
  );
}
