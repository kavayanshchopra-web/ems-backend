/**
 * RECRUITMENT ATS VIEW MODULE
 * 100% Schema-Driven Reference Implementation using Global EMS Configuration Engine
 */

import React, { useState } from 'react';
import { useModuleRegistry } from '../../core/registry/useModuleRegistry';
import LayoutEngine from '../../core/engines/LayoutEngine/LayoutEngine';
import PositionManagerView from './PositionManagerView';
import { atsStorageService, formatCandidateId } from '../../services/atsStorageService';

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
  const { config } = useModuleRegistry(companyId, 'recruitment_ats');
  const [positions, setPositions] = useState(() => atsStorageService.getRecruitmentPositions(companyId));

  // Page View Switcher ('candidates' | 'requisitions')
  const [activeSubView, setActiveSubView] = useState('candidates');

  // Persistent Candidate Roster State
  const [candidatesState, setCandidatesState] = useState(() => {
    let baseList = atsStorageService.getCandidates(companyId);
    if (Array.isArray(atsCandidates) && atsCandidates.length > 0) {
      baseList = atsCandidates;
    }
    return baseList.map((c, idx) => ({
      position: c.position || 'Sales Representative',
      email: c.email || 'kavayanshchopra@gmail.com',
      phone: c.phone || '8566883642',
      resume: c.resume || 'Resume.pdf',
      ...c,
      id: formatCandidateId(c.id, idx, config)
    }));
  });

  const handleUpdateCandidates = (newRecords) => {
    const updated = typeof newRecords === 'function' ? newRecords(candidatesState) : newRecords;
    setCandidatesState(updated);
    if (typeof setAtsCandidates === 'function') {
      setAtsCandidates(updated);
    }
    atsStorageService.saveCandidates(companyId, updated);
  };

  // 3. Active Central Pipeline Stages & Positions
  const configuredStagesRaw = (systemDropdowns && Array.isArray(systemDropdowns.atsStages) && systemDropdowns.atsStages.length > 0)
    ? systemDropdowns.atsStages
    : DEFAULT_PIPELINE_STAGES;

  const activePipelineStages = configuredStagesRaw
    .filter(s => typeof s === 'object' && s !== null && !s.archived);

  const allPositions = positions.map(p => typeof p === 'object' ? (p.title || p.name) : p);

  return (
    <div className="recruitment-ats-view-shell" style={{ width: '100%' }}>
      {activeSubView === 'requisitions' ? (
        /* FULL PAGE REQUISITIONS & POSITIONS MANAGEMENT VIEW (NO POPUP MODAL) */
        <PositionManagerView
          positions={positions}
          onSavePositions={(updated) => {
            atsStorageService.saveRecruitmentPositions(companyId, updated);
            setPositions(updated);
          }}
          systemDropdowns={systemDropdowns}
          atsCandidates={candidatesState}
          showToast={showToast}
          onBack={() => setActiveSubView('candidates')}
        />
      ) : (
        /* 100% CONFIGURATION-DRIVEN LAYOUT ENGINE PAGE SHELL */
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
          onOpenModuleConfig={() => {
            if (typeof onOpenModuleConfig === 'function') {
              onOpenModuleConfig('recruitment_ats');
            }
          }}
          onManageStages={onManageStages}
          onOpenPositionModal={() => setActiveSubView('requisitions')}
        />
      )}
    </div>
  );
}
