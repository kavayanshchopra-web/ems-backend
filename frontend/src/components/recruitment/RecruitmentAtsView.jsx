import React, { useState } from 'react';
import StatCard from '../ui/StatCard';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import SearchInput from '../ui/SearchInput';
import Select from '../ui/Select';
import EmptyState from '../ui/EmptyState';
import Modal from '../ui/Modal';
import { Plus, Edit2, Archive, Eye, FileText, LayoutGrid, List, RotateCcw, Trash2, FilterX, Settings, Briefcase } from 'lucide-react';

/**
 * Defensive string extractor helper
 * Safely handles strings, numbers, nulls, and legacy objects like { name, archived }
 */
const getValString = (val, fallback = '') => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string' || typeof val === 'number') return String(val);
  if (typeof val === 'object') {
    if (typeof val.name === 'string') return val.name;
    if (typeof val.title === 'string') return val.title;
    if (typeof val.label === 'string') return val.label;
    if (typeof val.value === 'string') return val.value;
  }
  return fallback;
};

/**
 * Platform Default ATS Pipeline Stages Configuration
 */
const DEFAULT_PIPELINE_STAGES = [
  { id: 'applied', key: 'APPLIED', name: 'Applied', emoji: '📥', color: '#0d9488', semanticType: 'APPLIED', archived: false, sortOrder: 1 },
  { id: 'interviewing', key: 'INTERVIEWING', name: 'Interviewing', emoji: '🗣️', color: '#2563eb', semanticType: 'INTERVIEW', archived: false, sortOrder: 2 },
  { id: 'offered', key: 'OFFERED', name: 'Offered', emoji: '📋', color: '#d97706', semanticType: 'OFFER', archived: false, sortOrder: 3 },
  { id: 'hired', key: 'HIRED', name: 'Hired', emoji: '✅', color: '#059669', semanticType: 'HIRED', archived: false, sortOrder: 4 }
];

/**
 * Phase ATS-1 — Recruitment ATS Shared Page Shell & Refinement
 * Features: Shared Layout Shell (A->B->C->D), Zero Layout Jump between Views,
 * 50% Reduced Compact KPI Strip, Scalable Horizontally Scrollable Kanban,
 * Clean Candidate Card Hierarchy, System Dropdowns Configuration Engine.
 */
export default function RecruitmentAtsView({
  authUser,
  atsCandidates = [],
  setAtsCandidates = () => {},
  systemDropdowns = null,
  onManageStages = () => {},
  onManagePositions = () => {},
  recycleBinItems = [],
  handleRestoreBinItem = () => {},
  handlePermanentDeleteBinItem = () => {},
  softDeleteRecord = () => {},
  showToast = () => {}
}) {
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'list'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStageFilter, setSelectedStageFilter] = useState('all');
  const [selectedPositionFilter, setSelectedPositionFilter] = useState('all');
  const [sortKey, setSortKey] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showArchivedModal, setShowArchivedModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Derive Central Pipeline Stages from System Dropdowns Configuration
  const configuredStagesRaw = (systemDropdowns && Array.isArray(systemDropdowns.atsStages) && systemDropdowns.atsStages.length > 0)
    ? systemDropdowns.atsStages
    : DEFAULT_PIPELINE_STAGES;

  // Active non-archived stages ordered by sortOrder
  const activePipelineStages = configuredStagesRaw
    .filter(s => typeof s === 'object' && s !== null && !s.archived)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  // Default initial stage for forms
  const defaultInitialStage = activePipelineStages[0]?.name || 'Applied';

  // Form State
  const [candidateForm, setCandidateForm] = useState({
    id: '',
    name: '',
    position: '',
    status: defaultInitialStage,
    email: '',
    phone: '',
    resume: ''
  });
  const [formErrors, setFormErrors] = useState({});

  const canManage = authUser?.role === 'owner' || authUser?.role === 'admin' || authUser?.role === 'manager' || authUser?.role === 'superadmin';

  // Filtered Archived ATS Candidates from global Recycle Bin
  const archivedAtsItems = (recycleBinItems || []).filter(item => {
    const cat = getValString(item.category || item.type).toLowerCase();
    return cat.includes('ats candidate');
  });

  // Derived positions from Central System Dropdowns (Designations) + existing candidates
  const managedDesignations = (systemDropdowns && Array.isArray(systemDropdowns.designations))
    ? systemDropdowns.designations.map(d => getValString(d)).filter(Boolean)
    : [];

  const candidatePositions = atsCandidates.map(c => getValString(c.position)).filter(Boolean);

  const uniquePositions = Array.from(
    new Set([...managedDesignations, ...candidatePositions])
  );

  const positionOptions = [
    { label: 'All Positions', value: 'all' },
    ...uniquePositions.map(pos => ({ label: pos, value: pos }))
  ];

  const stageOptions = [
    { label: 'All Stages', value: 'all' },
    ...activePipelineStages.map(s => ({ label: getValString(s.name), value: getValString(s.name) }))
  ];

  // Active filters check
  const isFilterActive = Boolean(
    searchQuery.trim() || selectedStageFilter !== 'all' || selectedPositionFilter !== 'all'
  );

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedStageFilter('all');
    setSelectedPositionFilter('all');
  };

  // Filtering & Sorting Logic
  const filteredCandidates = atsCandidates.filter(c => {
    const q = searchQuery.toLowerCase().trim();
    const nameStr = getValString(c.name).toLowerCase();
    const posStr = getValString(c.position).toLowerCase();
    const emailStr = getValString(c.email).toLowerCase();
    const phoneStr = getValString(c.phone).toLowerCase();
    const statusStr = getValString(c.status).toLowerCase();

    const matchesSearch = !q || (
      nameStr.includes(q) ||
      posStr.includes(q) ||
      emailStr.includes(q) ||
      phoneStr.includes(q)
    );

    const matchesStage = selectedStageFilter === 'all' || statusStr === selectedStageFilter.toLowerCase();
    const matchesPosition = selectedPositionFilter === 'all' || posStr === selectedPositionFilter.toLowerCase();

    return matchesSearch && matchesStage && matchesPosition;
  });

  const sortedCandidates = [...filteredCandidates].sort((a, b) => {
    let valA = a[sortKey];
    let valB = b[sortKey];

    if (sortKey === 'createdAt') {
      valA = new Date(a.createdAt || 0).getTime();
      valB = new Date(b.createdAt || 0).getTime();
      return sortDir === 'asc' ? valA - valB : valB - valA;
    }

    valA = getValString(valA).toLowerCase();
    valB = getValString(valB).toLowerCase();

    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  // Global Dataset Metrics (Semantic-Type Aware)
  const totalApplicants = atsCandidates.length;

  const interviewingCount = atsCandidates.filter(c => {
    const st = getValString(c.status).toLowerCase();
    return activePipelineStages.some(s =>
      (s.semanticType === 'INTERVIEW' || s.id === 'interviewing') &&
      (st === getValString(s.name).toLowerCase() || st === getValString(s.id).toLowerCase() || st === 'interviewing')
    );
  }).length;

  const offeredCount = atsCandidates.filter(c => {
    const st = getValString(c.status).toLowerCase();
    return activePipelineStages.some(s =>
      (s.semanticType === 'OFFER' || s.id === 'offered') &&
      (st === getValString(s.name).toLowerCase() || st === getValString(s.id).toLowerCase() || st === 'offered')
    );
  }).length;

  const hiredCount = atsCandidates.filter(c => {
    const st = getValString(c.status).toLowerCase();
    return activePipelineStages.some(s =>
      (s.semanticType === 'HIRED' || s.id === 'hired') &&
      (st === getValString(s.name).toLowerCase() || st === getValString(s.id).toLowerCase() || st === 'hired')
    );
  }).length;

  // Validation Handler
  const validateForm = () => {
    const errors = {};
    if (!candidateForm.name.trim()) errors.name = 'Candidate Name is required';
    if (!candidateForm.position.trim()) errors.position = 'Position / Applied For is required';
    if (candidateForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidateForm.email.trim())) {
      errors.email = 'Enter a valid email address';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save Candidate (Add or Edit)
  const handleSaveCandidate = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);
    const now = new Date().toISOString();

    if (candidateForm.id) {
      // Edit Mode
      const updatedList = atsCandidates.map(c => {
        if (c.id === candidateForm.id) {
          return {
            ...c,
            name: candidateForm.name.trim(),
            position: candidateForm.position.trim(),
            status: candidateForm.status,
            email: candidateForm.email.trim(),
            phone: candidateForm.phone.trim(),
            updatedAt: now
          };
        }
        return c;
      });
      setAtsCandidates(updatedList);
      showToast(`Updated candidate profile "${candidateForm.name.trim()}"`, 'success');
      setShowEditModal(false);
    } else {
      // Add Mode
      const newCand = {
        id: 'cand_' + Date.now(),
        name: candidateForm.name.trim(),
        position: candidateForm.position.trim(),
        status: candidateForm.status || defaultInitialStage,
        email: candidateForm.email.trim(),
        phone: candidateForm.phone.trim(),
        resume: candidateForm.resume.trim(),
        createdAt: now,
        updatedAt: now
      };
      setAtsCandidates(prev => [newCand, ...prev]);
      showToast(`Added candidate "${newCand.name}" to ${newCand.status} stage!`, 'success');
      setShowAddModal(false);
    }

    setIsSaving(false);
  };

  // Stage Movement Handler (Forward & Backward)
  const handleMoveStage = (candId, newStage) => {
    const cand = atsCandidates.find(c => c.id === candId);
    if (!cand) return;

    const oldStage = getValString(cand.status, defaultInitialStage);
    if (oldStage.toLowerCase() === newStage.toLowerCase()) return;

    const updatedList = atsCandidates.map(c => {
      if (c.id === candId) {
        return {
          ...c,
          status: newStage,
          updatedAt: new Date().toISOString()
        };
      }
      return c;
    });

    setAtsCandidates(updatedList);
    showToast(`Moved "${getValString(cand.name)}" to ${newStage}`, 'info');

    if (selectedCandidate && selectedCandidate.id === candId) {
      setSelectedCandidate(prev => prev ? { ...prev, status: newStage } : null);
    }
  };

  // Neutral Archive Handler
  const handleArchiveCandidate = (cand) => {
    const candName = getValString(cand.name, 'Candidate');
    if (!window.confirm(`Archive "${candName}"? Candidate will be moved to Archived Candidates.`)) return;

    softDeleteRecord({
      originalId: cand.id,
      name: `ATS Candidate: "${candName}"`,
      category: 'ATS Candidate',
      entityData: { candidate: cand },
      moduleTab: 'recruitment_ats'
    });

    const updatedList = atsCandidates.filter(c => c.id !== cand.id);
    setAtsCandidates(updatedList);
    showToast(`📦 Archived "${candName}". Accessible in Archived Candidates.`, 'info');

    setShowDetailModal(false);
    setShowEditModal(false);
  };

  // Open Edit Modal Helper
  const openEditModalForCandidate = (cand) => {
    setCandidateForm({
      id: cand.id,
      name: getValString(cand.name),
      position: getValString(cand.position),
      status: getValString(cand.status, defaultInitialStage),
      email: getValString(cand.email),
      phone: getValString(cand.phone),
      resume: getValString(cand.resume)
    });
    setFormErrors({});
    setShowEditModal(true);
  };

  // Open Add Modal Helper
  const openAddModal = () => {
    setCandidateForm({
      id: '',
      name: '',
      position: '',
      status: defaultInitialStage,
      email: '',
      phone: '',
      resume: ''
    });
    setFormErrors({});
    setShowAddModal(true);
  };

  // Dynamic Kanban Columns Auto-Generated from Active Central Pipeline Stages
  const autoGeneratedKanbanColumns = activePipelineStages.map(stage => {
    const stageName = getValString(stage.name);
    const stageId = getValString(stage.id);
    const stageKey = getValString(stage.key);

    const stageCandidates = sortedCandidates.filter(c => {
      const candStatus = getValString(c.status).toLowerCase();
      return (
        candStatus === stageName.toLowerCase() ||
        candStatus === stageId.toLowerCase() ||
        candStatus === stageKey.toLowerCase()
      );
    });

    return {
      id: stageId || stageName,
      name: stageName,
      emoji: stage.emoji || '📋',
      color: stage.color || '#0d9488',
      semanticType: stage.semanticType || 'CUSTOM',
      list: stageCandidates
    };
  });

  // Helper Badge Color mapping for stages
  const getStageBadgeVariant = (st) => {
    const lower = getValString(st).toLowerCase();
    if (lower === 'hired') return 'success';
    if (lower === 'offered') return 'warning';
    if (lower === 'interviewing') return 'info';
    return 'neutral';
  };

  return (
    <div className="recruitment-ats-shell" style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>

      {/* Datalist for Position Auto-complete in Add/Edit Modals */}
      <datalist id="ats-designations-list">
        {uniquePositions.map((pos, idx) => (
          <option key={idx} value={pos} />
        ))}
      </datalist>

      {/* A. ATS MAIN TOOLBAR (SHARED & FIXED ACROSS VIEWS) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', background: '#ffffff', padding: '14px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        {/* Title & Candidate Count Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'linear-gradient(135deg, rgba(13,148,136,0.15) 0%, rgba(15,118,110,0.25) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
            🧑‍💼
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>Recruitment ATS</h1>
              <span style={{ fontSize: '11px', fontWeight: '800', padding: '2px 9px', borderRadius: '12px', background: 'rgba(13, 148, 136, 0.1)', color: '#0d9488', border: '1px solid rgba(13, 148, 136, 0.2)' }}>
                {totalApplicants} Candidates
              </span>
            </div>
            <p style={{ margin: '1px 0 0 0', fontSize: '12px', color: '#64748b' }}>
              Candidate Pipeline & Hiring Roster
            </p>
          </div>
        </div>

        {/* Toolbar Controls: Toggle, Archived, Settings Routes, Add Candidate CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Segmented View Mode Toggle */}
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '2px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '700',
                borderRadius: '6px',
                border: 'none',
                background: viewMode === 'kanban' ? '#ffffff' : 'transparent',
                color: viewMode === 'kanban' ? '#0d9488' : '#64748b',
                boxShadow: viewMode === 'kanban' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <LayoutGrid size={14} /> Kanban
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '700',
                borderRadius: '6px',
                border: 'none',
                background: viewMode === 'list' ? '#ffffff' : 'transparent',
                color: viewMode === 'list' ? '#0d9488' : '#64748b',
                boxShadow: viewMode === 'list' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <List size={14} /> List
            </button>
          </div>

          <Button
            variant="secondary"
            size="md"
            icon={<Archive size={14} />}
            onClick={() => setShowArchivedModal(true)}
          >
            Archived ({archivedAtsItems.length})
          </Button>

          {canManage && (
            <Button
              variant="secondary"
              size="md"
              icon={<Settings size={14} />}
              onClick={onManageStages}
            >
              Manage Stages
            </Button>
          )}

          {canManage && (
            <Button
              variant="secondary"
              size="md"
              icon={<Briefcase size={14} />}
              onClick={onManagePositions}
            >
              Manage Positions
            </Button>
          )}

          {canManage && (
            <Button
              variant="primary"
              size="md"
              icon={<Plus size={16} />}
              onClick={openAddModal}
              style={{ background: 'linear-gradient(135deg, #0d9488 0%, #064e43 100%)', color: 'white', border: 'none', boxShadow: '0 2px 8px rgba(13, 148, 136, 0.25)' }}
            >
              Add Candidate
            </Button>
          )}
        </div>
      </div>

      {/* B. COMPACT KPI SUMMARY STRIP (50% REDUCED VERTICAL HEIGHT) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
        <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(13, 148, 136, 0.1)', color: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
            👥
          </div>
          <div>
            <div style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>TOTAL APPLICANTS</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', lineHeight: 1.2 }}>{totalApplicants}</div>
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
            🗣️
          </div>
          <div>
            <div style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>INTERVIEWING</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', lineHeight: 1.2 }}>{interviewingCount}</div>
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
            📋
          </div>
          <div>
            <div style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>OFFERS EXTENDED</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', lineHeight: 1.2 }}>{offeredCount}</div>
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
            ✅
          </div>
          <div>
            <div style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>HIRED</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', lineHeight: 1.2 }}>{hiredCount}</div>
          </div>
        </div>
      </div>

      {/* C. SEARCH / FILTERS / SORT TOOLBAR (SHARED & FIXED POSITION FOR BOTH KANBAN AND LIST) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', background: '#ffffff', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
          <SearchInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery('')}
            placeholder="Search candidates..."
            width="240px"
          />
          <Select
            value={selectedStageFilter}
            onChange={(e) => setSelectedStageFilter(e.target.value)}
            options={stageOptions}
            style={{ width: '150px' }}
          />
          <Select
            value={selectedPositionFilter}
            onChange={(e) => setSelectedPositionFilter(e.target.value)}
            options={positionOptions}
            disabled={uniquePositions.length === 0}
            style={{ width: '160px' }}
          />
          {isFilterActive && (
            <Button
              variant="secondary"
              size="sm"
              icon={<FilterX size={13} />}
              onClick={handleResetFilters}
            >
              Clear filters
            </Button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))}
          >
            Sort: {sortKey === 'createdAt' ? 'Date' : 'Name'} {sortDir === 'asc' ? '↑' : '↓'}
          </Button>
        </div>
      </div>

      {/* FILTERED RESULT COUNTER */}
      {isFilterActive && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '8px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: '700', color: '#475569' }}>
          <span>Showing {sortedCandidates.length} of {totalApplicants} candidates</span>
          <Button variant="secondary" size="sm" icon={<FilterX size={12} />} onClick={handleResetFilters}>
            Clear filters
          </Button>
        </div>
      )}

      {/* D. VIEW CONTENT (KANBAN OR LIST) */}
      {viewMode === 'kanban' ? (
        /* D = SCALABLE KANBAN BOARD CONTAINER */
        <div
          style={{
            width: '100%',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            paddingBottom: '8px'
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.max(1, autoGeneratedKanbanColumns.length)}, minmax(280px, 1fr))`,
              gap: '16px',
              alignItems: 'start',
              minWidth: autoGeneratedKanbanColumns.length > 4 ? `${autoGeneratedKanbanColumns.length * 290}px` : '100%'
            }}
          >
            {autoGeneratedKanbanColumns.map((stage) => (
              /* Stage Column */
              <div
                key={stage.id}
                className="ats-stage-card"
                style={{
                  background: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden'
                }}
              >
                {/* Column Header */}
                <div
                  style={{
                    padding: '12px 16px',
                    background: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px' }}>{stage.emoji}</span>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
                      {stage.name}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: '800',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: 'rgba(13, 148, 136, 0.1)',
                      color: stage.color || '#0d9488'
                    }}
                  >
                    {stage.list.length}
                  </span>
                </div>

                {/* Candidate Cards */}
                <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                  {stage.list.length === 0 ? (
                    <div style={{ padding: '20px 12px', textAlign: 'center' }}>
                      <EmptyState
                        icon="📋"
                        title=""
                        description={isFilterActive ? 'No candidates match filter.' : 'No applicants in this stage.'}
                      />
                    </div>
                  ) : (
                    stage.list.map((cand, idx) => {
                      const candName = getValString(cand.name, 'Applicant');
                      const candPosition = getValString(cand.position, 'Position Pending');
                      const candEmail = getValString(cand.email);
                      const candPhone = getValString(cand.phone);
                      const candResume = getValString(cand.resume);
                      const candStage = getValString(cand.status, defaultInitialStage);

                      return (
                        <div
                          key={cand.id || idx}
                          style={{
                            background: '#f8fafc',
                            padding: '12px 14px',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            transition: 'all 0.15s ease',
                            overflow: 'hidden'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                            <div>
                              <div
                                onClick={() => { setSelectedCandidate(cand); setShowDetailModal(true); }}
                                style={{ fontWeight: '700', color: '#0f172a', fontSize: '13px', wordBreak: 'break-word', cursor: 'pointer' }}
                              >
                                {candName}
                              </div>
                              <div style={{ color: '#0d9488', fontSize: '11px', fontWeight: '600', marginTop: '2px', wordBreak: 'break-word' }}>
                                {candPosition}
                              </div>
                            </div>
                            <button
                              type="button"
                              title="View Profile"
                              onClick={() => { setSelectedCandidate(cand); setShowDetailModal(true); }}
                              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px' }}
                            >
                              <Eye size={14} />
                            </button>
                          </div>

                          {/* Clean Contact Metadata: show Email or Phone without repeating position */}
                          {(candEmail || candPhone) && (
                            <div style={{ marginTop: '6px', fontSize: '10px', color: '#475569' }}>
                              {candEmail && <div>📧 {candEmail}</div>}
                              {candPhone && candPhone !== candPosition && <div>📞 {candPhone}</div>}
                            </div>
                          )}

                          {candResume && (
                            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px', maxWidth: '100%', overflow: 'hidden' }}>
                              <Badge variant="info" style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <FileText size={10} style={{ marginRight: '3px', flexShrink: 0 }} />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{candResume}</span>
                              </Badge>
                            </div>
                          )}

                          {/* Move Stage & Actions */}
                          {canManage && (
                            <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <select
                                value={candStage}
                                onChange={(e) => handleMoveStage(cand.id, e.target.value)}
                                style={{ fontSize: '10px', fontWeight: '700', padding: '3px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0d9488', cursor: 'pointer' }}
                              >
                                {activePipelineStages.map(s => (
                                  <option key={s.id || s.name} value={getValString(s.name)}>
                                    Stage: {getValString(s.name)}
                                  </option>
                                ))}
                              </select>

                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button
                                  type="button"
                                  onClick={() => openEditModalForCandidate(cand)}
                                  style={{ padding: '3px 6px', fontSize: '10px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', cursor: 'pointer' }}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  title="Archive Candidate"
                                  onClick={() => handleArchiveCandidate(cand)}
                                  style={{ padding: '3px 6px', fontSize: '10px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
                                >
                                  <Archive size={10} /> Archive
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* D = CANDIDATE ROSTER TABLE (LIST VIEW) */
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>
              Candidate Roster ({sortedCandidates.length})
              {isFilterActive && <span style={{ color: '#0d9488', marginLeft: '6px' }}>(Filtered from {totalApplicants})</span>}
            </span>
            <span className="mobile-swipe-hint" style={{ fontSize: '11px', color: '#0d9488', fontWeight: '700' }}>
              Swipe horizontally ↔
            </span>
          </div>

          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table className="std-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', position: 'sticky', left: 0, background: '#f8fafc', zIndex: 2 }}>
                    Candidate
                  </th>
                  <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>
                    Position
                  </th>
                  <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>
                    Contact Details
                  </th>
                  <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>
                    Stage / Status
                  </th>
                  <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>
                    Resume
                  </th>
                  <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>
                    Created
                  </th>
                  {canManage && (
                    <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', textAlign: 'right' }}>
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {sortedCandidates.length === 0 ? (
                  <tr>
                    <td colSpan={canManage ? 7 : 6} style={{ padding: '32px', textAlign: 'center' }}>
                      <EmptyState
                        icon="📋"
                        title={totalApplicants === 0 ? 'No candidates in ATS' : 'No candidates match search'}
                        description={totalApplicants === 0 ? 'Click "+ Add Candidate" to register a new talent applicant.' : `No candidate records match "${searchQuery}".`}
                      />
                      {isFilterActive && (
                        <div style={{ marginTop: '12px' }}>
                          <Button variant="secondary" size="sm" icon={<FilterX size={13} />} onClick={handleResetFilters}>
                            Clear filters
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  sortedCandidates.map((cand, idx) => {
                    const candName = getValString(cand.name, 'Applicant');
                    const candPosition = getValString(cand.position, 'Position Pending');
                    const candEmail = getValString(cand.email);
                    const candPhone = getValString(cand.phone);
                    const candResume = getValString(cand.resume);
                    const candStage = getValString(cand.status, defaultInitialStage);
                    const createdDate = cand.createdAt ? new Date(cand.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

                    return (
                      <tr key={cand.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 14px', position: 'sticky', left: 0, background: '#ffffff', zIndex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '200px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #0d9488, #064e43)', color: '#ffffff', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', flexShrink: 0 }}>
                              {(candName[0] || 'C')}
                            </div>
                            <div style={{ overflow: 'hidden' }}>
                              <div
                                onClick={() => { setSelectedCandidate(cand); setShowDetailModal(true); }}
                                style={{ fontWeight: '700', color: '#0f172a', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}
                              >
                                {candName}
                              </div>
                              <div style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: '600', color: '#64748b' }}>ID: {cand.id}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '10px 14px', color: '#334155', fontSize: '12px', fontWeight: '600' }}>
                          {candPosition}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ fontSize: '12px', color: '#0f172a', fontWeight: '600' }}>{candEmail || '—'}</div>
                          <div style={{ fontSize: '10px', color: '#64748b' }}>{candPhone || '—'}</div>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          {canManage ? (
                            <select
                              value={candStage}
                              onChange={(e) => handleMoveStage(cand.id, e.target.value)}
                              style={{ padding: '4px 8px', fontSize: '11px', fontWeight: '700', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0d9488', cursor: 'pointer' }}
                            >
                              {activePipelineStages.map(s => (
                                <option key={s.id || s.name} value={getValString(s.name)}>
                                  {getValString(s.name)}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <Badge variant={getStageBadgeVariant(candStage)}>
                              {candStage}
                            </Badge>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          {candResume ? (
                            <Badge variant="info">
                              <FileText size={10} style={{ marginRight: '3px' }} />
                              {candResume}
                            </Badge>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
                          {createdDate}
                        </td>
                        {canManage && (
                          <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                              <Button
                                variant="outline"
                                size="sm"
                                icon={<Eye size={12} />}
                                onClick={() => { setSelectedCandidate(cand); setShowDetailModal(true); }}
                              >
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                icon={<Edit2 size={12} />}
                                onClick={() => openEditModalForCandidate(cand)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                icon={<Archive size={12} />}
                                onClick={() => handleArchiveCandidate(cand)}
                              >
                                Archive
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ARCHIVED CANDIDATES MODAL */}
      {showArchivedModal && (
        <Modal
          isOpen={showArchivedModal}
          onClose={() => setShowArchivedModal(false)}
          title={`Archived Candidates (${archivedAtsItems.length})`}
          subtitle="View soft-deleted ATS candidate records. Restore candidates back to active pipeline or permanently purge."
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {archivedAtsItems.length === 0 ? (
              <div style={{ padding: '24px 12px', textAlign: 'center' }}>
                <EmptyState
                  icon="📋"
                  title="No Archived Candidates"
                  description="There are currently no archived candidate records in the Recycle Bin."
                />
              </div>
            ) : (
              archivedAtsItems.map((item, idx) => {
                const candData = item.entityData?.candidate || item.payload || {};
                const candName = getValString(item.name || candData.name, 'Archived Candidate').replace('ATS Candidate: ', '').replace(/"/g, '');
                const candPosition = getValString(candData.position, 'Candidate Record');
                const origStage = getValString(candData.status, defaultInitialStage);

                return (
                  <div
                    key={item.id || idx}
                    style={{
                      display: 'flex',
                      justify: 'space-between',
                      alignItems: 'center',
                      padding: '12px 14px',
                      background: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      flexWrap: 'wrap',
                      gap: '8px'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '13px' }}>
                        {candName}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
                        {candPosition} • Original Stage: <Badge variant={getStageBadgeVariant(origStage)}>{origStage}</Badge>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<RotateCcw size={12} />}
                        onClick={() => {
                          handleRestoreBinItem(item);
                          showToast(`🔄 Restored "${candName}" to ${origStage} stage!`, 'success');
                        }}
                      >
                        Restore
                      </Button>
                      {canManage && (
                        <Button
                          variant="danger"
                          size="sm"
                          icon={<Trash2 size={12} />}
                          onClick={() => {
                            if (window.confirm(`PERMANENTLY DELETE "${candName}"? This action cannot be undone.`)) {
                              handlePermanentDeleteBinItem(item.id);
                            }
                          }}
                        >
                          Permanently Delete
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <Button variant="secondary" size="md" onClick={() => setShowArchivedModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ADD CANDIDATE MODAL */}
      {showAddModal && (
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Add New Candidate"
          subtitle="Register candidate into the recruitment ATS pipeline."
        >
          <form onSubmit={handleSaveCandidate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Candidate Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Vikram Sharma"
                value={candidateForm.name}
                onChange={(e) => setCandidateForm({ ...candidateForm, name: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: formErrors.name ? '1.5px solid #ef4444' : '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
              />
              {formErrors.name && <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: '600' }}>{formErrors.name}</span>}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Position / Applied For <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                list="ats-designations-list"
                placeholder="Select or type position (e.g. Software Engineer)"
                value={candidateForm.position}
                onChange={(e) => setCandidateForm({ ...candidateForm, position: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: formErrors.position ? '1.5px solid #ef4444' : '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
              />
              {formErrors.position && <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: '600' }}>{formErrors.position}</span>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. vikram@example.com"
                  value={candidateForm.email}
                  onChange={(e) => setCandidateForm({ ...candidateForm, email: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: formErrors.email ? '1.5px solid #ef4444' : '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                />
                {formErrors.email && <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: '600' }}>{formErrors.email}</span>}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. +91 9876543210"
                  value={candidateForm.phone}
                  onChange={(e) => setCandidateForm({ ...candidateForm, phone: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Initial Pipeline Stage <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={candidateForm.status}
                onChange={(e) => setCandidateForm({ ...candidateForm, status: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#ffffff', outline: 'none' }}
              >
                {activePipelineStages.map(s => (
                  <option key={s.id || s.name} value={getValString(s.name)}>
                    {getValString(s.name)}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
              <Button variant="secondary" size="md" onClick={() => setShowAddModal(false)} type="button">
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                type="submit"
                disabled={isSaving}
                style={{ background: 'linear-gradient(135deg, #0d9488 0%, #064e43 100%)', color: 'white', border: 'none' }}
              >
                {isSaving ? 'Saving...' : 'Add Candidate'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* EDIT CANDIDATE MODAL */}
      {showEditModal && (
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="Edit Candidate Profile"
          subtitle={`Update profile details for ${candidateForm.name || 'Candidate'}.`}
        >
          <form onSubmit={handleSaveCandidate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Candidate Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={candidateForm.name}
                onChange={(e) => setCandidateForm({ ...candidateForm, name: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: formErrors.name ? '1.5px solid #ef4444' : '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
              />
              {formErrors.name && <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: '600' }}>{formErrors.name}</span>}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Position / Applied For <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                list="ats-designations-list"
                placeholder="Select or type position (e.g. Software Engineer)"
                value={candidateForm.position}
                onChange={(e) => setCandidateForm({ ...candidateForm, position: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: formErrors.position ? '1.5px solid #ef4444' : '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
              />
              {formErrors.position && <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: '600' }}>{formErrors.position}</span>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Email Address</label>
                <input
                  type="email"
                  value={candidateForm.email}
                  onChange={(e) => setCandidateForm({ ...candidateForm, email: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: formErrors.email ? '1.5px solid #ef4444' : '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                />
                {formErrors.email && <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: '600' }}>{formErrors.email}</span>}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Phone Number</label>
                <input
                  type="text"
                  value={candidateForm.phone}
                  onChange={(e) => setCandidateForm({ ...candidateForm, phone: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Pipeline Stage</label>
              <select
                value={candidateForm.status}
                onChange={(e) => setCandidateForm({ ...candidateForm, status: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#ffffff', outline: 'none' }}
              >
                {activePipelineStages.map(s => (
                  <option key={s.id || s.name} value={getValString(s.name)}>
                    {getValString(s.name)}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
              <Button variant="secondary" size="md" onClick={() => setShowEditModal(false)} type="button">
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                type="submit"
                disabled={isSaving}
                style={{ background: 'linear-gradient(135deg, #0d9488 0%, #064e43 100%)', color: 'white', border: 'none' }}
              >
                {isSaving ? 'Saving...' : 'Save Profile'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* CANDIDATE DETAIL DRAWER / MODAL */}
      {showDetailModal && selectedCandidate && (
        <Modal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          title="Candidate Profile"
          subtitle={`Detailed ATS application record for ${getValString(selectedCandidate.name)}.`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg, #0d9488, #064e43)', color: '#ffffff', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
                {(getValString(selectedCandidate.name)[0] || 'C')}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                  {getValString(selectedCandidate.name)}
                </h3>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>
                  {getValString(selectedCandidate.position)}
                </div>
              </div>
              <Badge variant={getStageBadgeVariant(selectedCandidate.status)}>
                {getValString(selectedCandidate.status, defaultInitialStage)}
              </Badge>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px' }}>
              <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', display: 'block' }}>Email Address</span>
                <span style={{ fontWeight: '700', color: '#0f172a' }}>{getValString(selectedCandidate.email) || '—'}</span>
              </div>
              <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', display: 'block' }}>Phone Number</span>
                <span style={{ fontWeight: '700', color: '#0f172a' }}>{getValString(selectedCandidate.phone) || '—'}</span>
              </div>
            </div>

            {selectedCandidate.resume && (
              <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Resume Document</span>
                <Badge variant="info">
                  <FileText size={10} style={{ marginRight: '3px' }} />
                  {getValString(selectedCandidate.resume)}
                </Badge>
              </div>
            )}

            {canManage && (
              <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Move Pipeline Stage</span>
                <select
                  value={getValString(selectedCandidate.status, defaultInitialStage)}
                  onChange={(e) => handleMoveStage(selectedCandidate.id, e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', fontSize: '12px', fontWeight: '700', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0d9488', cursor: 'pointer' }}
                >
                  {activePipelineStages.map(s => (
                    <option key={s.id || s.name} value={getValString(s.name)}>
                      Stage: {getValString(s.name)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                ID: {selectedCandidate.id}
              </span>
              {canManage && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setShowDetailModal(false); openEditModalForCandidate(selectedCandidate); }}
                  >
                    Edit Profile
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Archive size={12} />}
                    onClick={() => handleArchiveCandidate(selectedCandidate)}
                  >
                    Archive
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
