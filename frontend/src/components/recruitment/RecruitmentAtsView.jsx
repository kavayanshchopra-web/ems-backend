/**
 * RECRUITMENT ATS VIEW MODULE
 * 100% Schema-Driven Reference Implementation using Global EMS Configuration Engine
 */

import React, { useState, useEffect } from 'react';
import { useModuleRegistry } from '../../core/registry/useModuleRegistry';
import LayoutEngine from '../../core/engines/LayoutEngine/LayoutEngine';
import AtsConfigModal from './AtsConfigModal';
import PositionManagerModal from './PositionManagerModal';
import { atsStorageService } from '../../services/atsStorageService';

const DEFAULT_PIPELINE_STAGES = [
  { id: 'applied', key: 'APPLIED', name: 'Applied', emoji: '📥', color: '#0d9488', semanticType: 'APPLIED', sortOrder: 1 },
  { id: 'interviewing', key: 'INTERVIEWING', name: 'Interviewing', emoji: '🗣️', color: '#2563eb', semanticType: 'INTERVIEW', sortOrder: 2 },
  { id: 'offered', key: 'OFFERED', name: 'Offered', emoji: '📋', color: '#d97706', semanticType: 'OFFER', sortOrder: 3 },
  { id: 'hired', key: 'HIRED', name: 'Hired', emoji: '✅', color: '#059669', semanticType: 'HIRED', sortOrder: 4 }
];

export default function RecruitmentAtsView({
  authUser,
  atsCandidates = [],
  setAtsCandidates = () => {},
  systemDropdowns = null,
  onManageStages = () => {},
  onOpenModuleConfig = null,
  recycleBinItems = [],
  handleRestoreBinItem = () => {},
  handlePermanentDeleteBinItem = () => {},
  softDeleteRecord = () => {},
  showToast = () => {}
}) {
  const companyId = authUser?.companyId || authUser?.tenantId || 'default_tenant';

  // 1. Consume Master Module Registry Configuration
  const { config, refreshConfig } = useModuleRegistry(companyId, 'recruitment_ats');
  const [positions, setPositions] = useState(() => atsStorageService.getRecruitmentPositions(companyId));

  // Persistent Candidate Roster State
  const [candidatesState, setCandidatesState] = useState(() => {
    if (Array.isArray(atsCandidates) && atsCandidates.length > 0) {
      return atsCandidates;
    }
    return atsStorageService.getCandidates(companyId);
  });

  const handleUpdateCandidates = (newRecords) => {
    const updated = typeof newRecords === 'function' ? newRecords(candidatesState) : newRecords;
    setCandidatesState(updated);
    if (typeof setAtsCandidates === 'function') {
      setAtsCandidates(updated);
    }
    atsStorageService.saveCandidates(companyId, updated);
  };

  // 2. Modal Popover States
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showPositionModal, setShowPositionModal] = useState(false);

  // 3. Active Central Pipeline Stages & Positions
  const configuredStagesRaw = (systemDropdowns && Array.isArray(systemDropdowns.atsStages) && systemDropdowns.atsStages.length > 0)
    ? systemDropdowns.atsStages
    : DEFAULT_PIPELINE_STAGES;

  const activePipelineStages = configuredStagesRaw
    .filter(s => typeof s === 'object' && s !== null && !s.archived);

  const allPositions = positions.map(p => typeof p === 'object' ? (p.title || p.name) : p);

  return (
    <div className="recruitment-ats-view-shell" style={{ width: '100%' }}>
      {/* 100% CONFIGURATION-DRIVEN LAYOUT ENGINE PAGE SHELL */}
      <LayoutEngine
        moduleConfig={config}
        records={candidatesState}
        setRecords={handleUpdateCandidates}
        authUser={authUser}
        systemDropdowns={systemDropdowns}
        activePipelineStages={activePipelineStages}
        allPositions={allPositions}
        recycleBinItems={recycleBinItems}
        handleRestoreBinItem={handleRestoreBinItem}
        handlePermanentDeleteBinItem={handlePermanentDeleteBinItem}
        softDeleteRecord={softDeleteRecord}
        showToast={showToast}
        onOpenModuleConfig={() => setShowConfigModal(true)}
        onManageStages={onManageStages}
        onOpenPositionModal={() => setShowPositionModal(true)}
      />

      {/* MODULE CONFIGURATION ENGINE MODAL */}
      {showConfigModal && (
        <AtsConfigModal
          isOpen={showConfigModal}
          onClose={() => { setShowConfigModal(false); refreshConfig(); }}
          moduleConfig={config}
          systemDropdowns={systemDropdowns}
          companyId={companyId}
          showToast={showToast}
        />
      )}

      {/* REQUISITION MANAGER MODAL */}
      {showPositionModal && (
        <PositionManagerModal
          isOpen={showPositionModal}
          onClose={() => {
            setShowPositionModal(false);
            setPositions(atsStorageService.getRecruitmentPositions(companyId));
          }}
          positions={positions}
          onSavePositions={(updated) => {
            atsStorageService.saveRecruitmentPositions(companyId, updated);
            setPositions(updated);
            showToast('Updated job requisitions list.', 'success');
          }}
        />
      )}
    </div>
  );
}
