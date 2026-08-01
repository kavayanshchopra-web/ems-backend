import React, { useState, useEffect } from 'react';
import StatCard from '../ui/StatCard';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import SearchInput from '../ui/SearchInput';
import EmptyState from '../ui/EmptyState';
import Modal from '../ui/Modal';
import ModuleConfigEditor from '../config/ModuleConfigEditor';
import PositionManagerModal from './PositionManagerModal';
import { moduleConfigService } from '../../services/moduleConfigService';
import { atsStorageService } from '../../services/atsStorageService';
import { Plus, Edit2, Archive, Eye, FileText, LayoutGrid, List, RotateCcw, Trash2, FilterX, Settings, Briefcase, Sliders, X, Filter, ArrowUpDown } from 'lucide-react';

/**
 * Defensive string extractor helper
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
 * Default ATS Pipeline Stages
 */
const DEFAULT_PIPELINE_STAGES = [
  { id: 'applied', key: 'APPLIED', name: 'Applied', emoji: '📥', color: '#0d9488', semanticType: 'APPLIED', archived: false, sortOrder: 1 },
  { id: 'interviewing', key: 'INTERVIEWING', name: 'Interviewing', emoji: '🗣️', color: '#2563eb', semanticType: 'INTERVIEW', archived: false, sortOrder: 2 },
  { id: 'offered', key: 'OFFERED', name: 'Offered', emoji: '📋', color: '#d97706', semanticType: 'OFFER', archived: false, sortOrder: 3 },
  { id: 'hired', key: 'HIRED', name: 'Hired', emoji: '✅', color: '#059669', semanticType: 'HIRED', archived: false, sortOrder: 4 }
];

/**
 * Phase 3B — Recruitment ATS Frontend Configuration Reference Implementation
 */
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

  // Storage Service Hydration via Master Service
  const [moduleConfig, setModuleConfig] = useState(() => moduleConfigService.getModuleConfig(companyId, 'recruitment_ats'));
  const [recruitmentPositions, setRecruitmentPositions] = useState(() => atsStorageService.getRecruitmentPositions(companyId));

  // Modal / Popover States
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showPositionModal, setShowPositionModal] = useState(false);
  const [showManageDropdown, setShowManageDropdown] = useState(false);
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const [showSortPopover, setShowSortPopover] = useState(false);

  // Live Re-hydration Effect: sync moduleConfig when storage updates or config modal closes
  useEffect(() => {
    const syncConfig = () => {
      const latest = moduleConfigService.getModuleConfig(companyId, 'recruitment_ats');
      setModuleConfig(latest);
    };

    syncConfig();

    if (typeof window !== 'undefined') {
      window.addEventListener('omnilflow_config_updated', syncConfig);
      return () => window.removeEventListener('omnilflow_config_updated', syncConfig);
    }
  }, [companyId, showConfigModal]);

  // View mode state
  const availableViews = moduleConfig.views?.availableViews || ['kanban', 'list'];
  const defaultView = moduleConfig.views?.defaultView || 'kanban';
  const [viewMode, setViewMode] = useState(availableViews.includes(defaultView) ? defaultView : availableViews[0] || 'kanban');

  // Search, Filter & Sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStageFilter, setSelectedStageFilter] = useState('all');
  const [selectedPositionFilter, setSelectedPositionFilter] = useState('all');
  const [customFilterValues, setCustomFilterValues] = useState({});
  const [sortKey, setSortKey] = useState('createdAt'); // 'createdAt' | 'name' | 'stage' | 'position'
  const [sortDir, setSortDir] = useState('desc'); // 'asc' | 'desc'

  // Candidate Action Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showArchivedModal, setShowArchivedModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Active Central Pipeline Stages
  const configuredStagesRaw = (systemDropdowns && Array.isArray(systemDropdowns.atsStages) && systemDropdowns.atsStages.length > 0)
    ? systemDropdowns.atsStages
    : DEFAULT_PIPELINE_STAGES;

  const activePipelineStages = configuredStagesRaw
    .filter(s => typeof s === 'object' && s !== null && !s.archived);

  const defaultInitialStage = activePipelineStages[0]?.name || 'Applied';

  // Candidate Form & Custom Fields State
  const [candidateForm, setCandidateForm] = useState({
    id: '',
    name: '',
    position: '',
    status: defaultInitialStage,
    email: '',
    phone: '',
    resume: ''
  });
  const [customFieldsData, setCustomFieldsData] = useState({});
  const [formErrors, setFormErrors] = useState({});

  const canManage = authUser?.role === 'owner' || authUser?.role === 'admin' || authUser?.role === 'manager' || authUser?.role === 'superadmin';

  // Save Module Config via Service
  const handleSaveModuleConfig = (newConfig) => {
    setModuleConfig(newConfig);
    moduleConfigService.saveModuleConfig(companyId, 'recruitment_ats', newConfig);

    const newViews = newConfig.views?.availableViews || ['kanban', 'list'];
    if (!newViews.includes(viewMode)) {
      setViewMode(newViews[0] || 'kanban');
    }
  };

  // Save Recruitment Positions via Service
  const handleSavePositions = (updatedPositions) => {
    setRecruitmentPositions(updatedPositions);
    atsStorageService.saveRecruitmentPositions(companyId, updatedPositions);
  };

  // Filtered Archived Candidates from global Recycle Bin
  const archivedAtsItems = (recycleBinItems || []).filter(item => {
    const cat = getValString(item.category || item.type).toLowerCase();
    return cat.includes('ats candidate');
  });

  // Active Recruitment Position Titles + Legacy Candidate Positions
  const activePositionTitles = recruitmentPositions.filter(p => p.status === 'Open').map(p => p.title);
  const candidatePositionStrings = atsCandidates.map(c => getValString(c.position)).filter(Boolean);
  const allUniquePositions = Array.from(new Set([...activePositionTitles, ...candidatePositionStrings]));

  // Dynamic Filterable Fields from Schema
  const customFilterableFields = (moduleConfig.fields || []).filter(f => f.filterable && f.id !== 'position' && f.id !== 'status');
  const hasActiveCustomFilters = Object.values(customFilterValues).some(v => Boolean(v && String(v).trim() && v !== 'all'));

  // Active Filters Check
  const isFilterActive = Boolean(
    searchQuery.trim() || selectedStageFilter !== 'all' || selectedPositionFilter !== 'all' || hasActiveCustomFilters
  );

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedStageFilter('all');
    setSelectedPositionFilter('all');
    setCustomFilterValues({});
  };

  // Configurable Search Matching Engine
  const searchableFields = (moduleConfig.fields || []).filter(f => f.searchable);

  const filteredCandidates = atsCandidates.filter(c => {
    const q = searchQuery.toLowerCase().trim();

    const matchesSearch = !q || searchableFields.some(field => {
      let val = '';
      if (field.id === 'name') val = getValString(c.name);
      else if (field.id === 'position') val = getValString(c.position);
      else if (field.id === 'email') val = getValString(c.email);
      else if (field.id === 'phone') val = getValString(c.phone);
      else val = getValString(c.customFields?.[field.id]);

      return val.toLowerCase().includes(q);
    });

    const statusStr = getValString(c.status).toLowerCase();
    const posStr = getValString(c.position).toLowerCase();

    const matchesStage = selectedStageFilter === 'all' || statusStr === selectedStageFilter.toLowerCase();
    const matchesPosition = selectedPositionFilter === 'all' || posStr === selectedPositionFilter.toLowerCase();

    const matchesCustomFilters = customFilterableFields.every(field => {
      const filterVal = customFilterValues[field.id];
      if (!filterVal || filterVal === 'all') return true;
      let candVal = '';
      if (field.id === 'email') candVal = getValString(c.email);
      else if (field.id === 'phone') candVal = getValString(c.phone);
      else candVal = getValString(c.customFields?.[field.id]);
      return candVal.toLowerCase().includes(String(filterVal).toLowerCase().trim());
    });

    return matchesSearch && matchesStage && matchesPosition && matchesCustomFilters;
  });

  // Configurable Sort Engine
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

  // Metric Aggregations
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

  // Form Validation
  const validateForm = () => {
    const errors = {};
    if (!candidateForm.name.trim()) errors.name = 'Candidate Name is required';
    if (!candidateForm.position.trim()) errors.position = 'Position / Applied For is required';
    if (candidateForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidateForm.email.trim())) {
      errors.email = 'Enter a valid email address';
    }

    (moduleConfig.fields || []).forEach(f => {
      if (f.required && !f.systemField) {
        if (!customFieldsData[f.id] || !String(customFieldsData[f.id]).trim()) {
          errors[f.id] = `${f.label} is required`;
        }
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save Candidate
  const handleSaveCandidate = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);
    const now = new Date().toISOString();

    if (candidateForm.id) {
      const updatedList = atsCandidates.map(c => {
        if (c.id === candidateForm.id) {
          return {
            ...c,
            name: candidateForm.name.trim(),
            position: candidateForm.position.trim(),
            status: candidateForm.status,
            email: candidateForm.email.trim(),
            phone: candidateForm.phone.trim(),
            customFields: { ...(c.customFields || {}), ...customFieldsData },
            updatedAt: now
          };
        }
        return c;
      });
      setAtsCandidates(updatedList);
      showToast(`Updated profile "${candidateForm.name.trim()}"`, 'success');
      setShowEditModal(false);
    } else {
      const newCand = {
        id: 'cand_' + Date.now(),
        name: candidateForm.name.trim(),
        position: candidateForm.position.trim(),
        status: candidateForm.status || defaultInitialStage,
        email: candidateForm.email.trim(),
        phone: candidateForm.phone.trim(),
        resume: candidateForm.resume.trim(),
        customFields: { ...customFieldsData },
        createdAt: now,
        updatedAt: now
      };
      setAtsCandidates(prev => [newCand, ...prev]);
      showToast(`Added candidate "${newCand.name}" to ${newCand.status} stage!`, 'success');
      setShowAddModal(false);
    }

    setIsSaving(false);
  };

  // Stage Movement Handler
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

  // Archive Candidate
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

  // Open Edit Modal — STAGE SELECTION PRESERVATION
  const openEditModalForCandidate = (cand) => {
    const freshConfig = moduleConfigService.getModuleConfig(companyId, 'recruitment_ats');
    setModuleConfig(freshConfig);
    const candStatusStr = getValString(cand.status);
    const matchedStageObj = activePipelineStages.find(s => {
      const st = candStatusStr.toLowerCase();
      return (
        st === getValString(s.name).toLowerCase() ||
        st === getValString(s.id).toLowerCase() ||
        st === getValString(s.key).toLowerCase()
      );
    });

    const resolvedStageName = matchedStageObj ? getValString(matchedStageObj.name) : candStatusStr || defaultInitialStage;

    setCandidateForm({
      id: cand.id,
      name: getValString(cand.name),
      position: getValString(cand.position),
      status: resolvedStageName,
      email: getValString(cand.email),
      phone: getValString(cand.phone),
      resume: getValString(cand.resume)
    });
    setCustomFieldsData({ ...(cand.customFields || {}) });
    setFormErrors({});
    setShowEditModal(true);
  };

  // Open Add Modal
  const openAddModal = () => {
    const freshConfig = moduleConfigService.getModuleConfig(companyId, 'recruitment_ats');
    setModuleConfig(freshConfig);
    setCandidateForm({
      id: '',
      name: '',
      position: activePositionTitles[0] || '',
      status: defaultInitialStage,
      email: '',
      phone: '',
      resume: ''
    });
    setCustomFieldsData({});
    setFormErrors({});
    setShowAddModal(true);
  };

  // Dynamic Kanban Columns
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

  const getStageBadgeVariant = (st) => {
    const lower = getValString(st).toLowerCase();
    if (lower === 'hired') return 'success';
    if (lower === 'offered') return 'warning';
    if (lower === 'interviewing') return 'info';
    return 'neutral';
  };

  const kanbanCardsConfig = moduleConfig.kanbanFields || { position: true, email: true, phone: true, resume: true };

  return (
    <div className="recruitment-ats-shell" style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>

      {/* A. ATS MAIN TOOLBAR (COMPACT SINGLE ROW HEADER) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', background: '#ffffff', padding: '14px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        {/* Title & Badge */}
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

        {/* Header Actions: Toggle (if >1 view enabled), Archived, Manage ▾, Add Candidate */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {availableViews.length > 1 && (
            <div style={{ display: 'flex', background: '#f1f5f9', padding: '2px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              {availableViews.includes('kanban') && (
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
              )}
              {availableViews.includes('list') && (
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
              )}
            </div>
          )}

          <Button
            variant="secondary"
            size="md"
            icon={<Archive size={14} />}
            onClick={() => setShowArchivedModal(true)}
          >
            Archived ({archivedAtsItems.length})
          </Button>

          {/* SLEEK MANAGE ▾ DROPDOWN MENU */}
          {canManage && (
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowManageDropdown(prev => !prev)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  fontSize: '12px',
                  fontWeight: '700',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#334155',
                  cursor: 'pointer'
                }}
              >
                <Settings size={14} /> Manage ▾
              </button>

              {showManageDropdown && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '105%',
                    zIndex: 100,
                    background: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                    minWidth: '180px',
                    padding: '4px 0'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => { setShowManageDropdown(false); onManageStages(); }}
                    style={{ width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: '600', color: '#0f172a', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Settings size={13} /> Manage Stages
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowManageDropdown(false); setShowPositionModal(true); }}
                    style={{ width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: '600', color: '#0f172a', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Briefcase size={13} /> Manage Positions
                  </button>
                  <div style={{ borderTop: '1px solid #e2e8f0', margin: '4px 0' }} />
                  <button
                    type="button"
                    onClick={() => {
                      setShowManageDropdown(false);
                      if (onOpenModuleConfig) {
                        onOpenModuleConfig('recruitment_ats');
                      } else {
                        setShowConfigModal(true);
                      }
                    }}
                    style={{ width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: '600', color: '#0d9488', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Sliders size={13} /> Configure Module
                  </button>
                </div>
              )}
            </div>
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

      {/* B. DYNAMIC COMPACT KPI SUMMARY STRIP */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
        {(moduleConfig.summaryWidgets || []).filter(w => w.enabled).map(widget => {
          let countVal = totalApplicants;
          if (widget.metricType === 'SEMANTIC') {
            if (widget.semanticGroup === 'INTERVIEW') countVal = interviewingCount;
            if (widget.semanticGroup === 'OFFER') countVal = offeredCount;
            if (widget.semanticGroup === 'HIRED') countVal = hiredCount;
          } else if (widget.metricType === 'STAGE_COUNT' && widget.stageName) {
            countVal = atsCandidates.filter(c => getValString(c.status).toLowerCase() === widget.stageName.toLowerCase()).length;
          }

          return (
            <div
              key={widget.id}
              style={{
                background: '#ffffff',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: widget.bg || 'rgba(13, 148, 136, 0.1)',
                  color: widget.color || '#0d9488',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  flexShrink: 0
                }}
              >
                {widget.icon || '📊'}
              </div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {widget.label}
                </div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', lineHeight: 1.2 }}>
                  {countVal}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* C. LIGHTWEIGHT SEARCH / FILTERS / SORT TOOLBAR */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', background: '#ffffff', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
          <SearchInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery('')}
            placeholder="Search candidates..."
            width="260px"
          />

          {/* FILTERS POPOVER BUTTON */}
          <div style={{ position: 'relative' }}>
            <Button
              variant={isFilterActive ? 'primary' : 'secondary'}
              size="md"
              icon={<Filter size={14} />}
              onClick={() => setShowFilterPopover(prev => !prev)}
              style={isFilterActive ? { background: '#0d9488', color: 'white', border: 'none' } : {}}
            >
              Filters {isFilterActive ? '•' : ''}
            </Button>

            {showFilterPopover && (
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: '105%',
                  zIndex: 100,
                  background: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
                  minWidth: '240px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a' }}>Filter Candidates</span>
                  <button type="button" onClick={() => setShowFilterPopover(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}>
                    <X size={14} />
                  </button>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>Pipeline Stage</label>
                  <select
                    value={selectedStageFilter}
                    onChange={(e) => setSelectedStageFilter(e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', background: 'white' }}
                  >
                    <option value="all">All Stages</option>
                    {activePipelineStages.map(s => (
                      <option key={s.id || s.name} value={getValString(s.name)}>{getValString(s.name)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>Position / Requisition</label>
                  <select
                    value={selectedPositionFilter}
                    onChange={(e) => setSelectedPositionFilter(e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', background: 'white' }}
                  >
                    <option value="all">All Positions</option>
                    {allUniquePositions.map((pos, i) => (
                      <option key={i} value={pos}>{pos}</option>
                    ))}
                  </select>
                </div>

                {customFilterableFields.map(field => {
                  let opts = field.manualOptions || [];
                  if (field.optionsSource === 'departments') opts = (systemDropdowns?.departments || []).map(getValString);
                  if (field.optionsSource === 'designations') opts = (systemDropdowns?.designations || []).map(getValString);
                  if (field.optionsSource === 'employment_types') opts = ['Full-time', 'Part-time', 'Contract', 'Internship'];

                  return (
                    <div key={field.id}>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>{field.label}</label>
                      {opts.length > 0 ? (
                        <select
                          value={customFilterValues[field.id] || 'all'}
                          onChange={(e) => setCustomFilterValues({ ...customFilterValues, [field.id]: e.target.value })}
                          style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', background: 'white' }}
                        >
                          <option value="all">All {field.label}s</option>
                          {opts.map((opt, i) => (
                            <option key={i} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          placeholder={`Filter by ${field.label}...`}
                          value={customFilterValues[field.id] || ''}
                          onChange={(e) => setCustomFilterValues({ ...customFilterValues, [field.id]: e.target.value })}
                          style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none' }}
                        />
                      )}
                    </div>
                  );
                })}

                {isFilterActive && (
                  <Button variant="secondary" size="sm" icon={<FilterX size={12} />} onClick={handleResetFilters}>
                    Reset All Filters
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* SORT POPOVER BUTTON */}
        <div style={{ position: 'relative' }}>
          <Button
            variant="secondary"
            size="md"
            icon={<ArrowUpDown size={14} />}
            onClick={() => setShowSortPopover(prev => !prev)}
          >
            Sort ▾
          </Button>

          {showSortPopover && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: '105%',
                zIndex: 100,
                background: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                minWidth: '160px',
                padding: '4px 0'
              }}
            >
              {[
                { label: 'Newest First', key: 'createdAt', dir: 'desc' },
                { label: 'Oldest First', key: 'createdAt', dir: 'asc' },
                { label: 'Name A–Z', key: 'name', dir: 'asc' },
                { label: 'Name Z–A', key: 'name', dir: 'desc' },
                { label: 'Stage', key: 'status', dir: 'asc' },
                { label: 'Position', key: 'position', dir: 'asc' }
              ].map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => { setSortKey(item.key); setSortDir(item.dir); setShowSortPopover(false); }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontWeight: sortKey === item.key && sortDir === item.dir ? '800' : '600',
                    color: sortKey === item.key && sortDir === item.dir ? '#0d9488' : '#0f172a',
                    background: sortKey === item.key && sortDir === item.dir ? 'rgba(13,148,136,0.08)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* REMOVABLE ACTIVE FILTER CHIPS */}
      {isFilterActive && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', background: '#f8fafc', padding: '8px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
          <span style={{ fontWeight: '700', color: '#475569' }}>Active Filters ({sortedCandidates.length} of {totalApplicants}):</span>

          {selectedStageFilter !== 'all' && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(13, 148, 136, 0.1)', color: '#0d9488', fontWeight: '700', fontSize: '11px' }}>
              Stage: {selectedStageFilter}
              <button type="button" onClick={() => setSelectedStageFilter('all')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#0d9488', padding: 0 }}>
                <X size={12} />
              </button>
            </span>
          )}

          {selectedPositionFilter !== 'all' && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', fontWeight: '700', fontSize: '11px' }}>
              Position: {selectedPositionFilter}
              <button type="button" onClick={() => setSelectedPositionFilter('all')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#2563eb', padding: 0 }}>
                <X size={12} />
              </button>
            </span>
          )}

          {customFilterableFields.map(field => {
            const val = customFilterValues[field.id];
            if (!val || val === 'all') return null;
            return (
              <span key={field.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(147, 51, 234, 0.1)', color: '#9333ea', fontWeight: '700', fontSize: '11px' }}>
                {field.label}: {val}
                <button type="button" onClick={() => setCustomFilterValues({ ...customFilterValues, [field.id]: 'all' })} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9333ea', padding: 0 }}>
                  <X size={12} />
                </button>
              </span>
            );
          })}

          {searchQuery.trim() && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', color: '#d97706', fontWeight: '700', fontSize: '11px' }}>
              Query: "{searchQuery.trim()}"
              <button type="button" onClick={() => setSearchQuery('')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#d97706', padding: 0 }}>
                <X size={12} />
              </button>
            </span>
          )}

          <Button variant="secondary" size="sm" icon={<FilterX size={12} />} onClick={handleResetFilters}>
            Clear All
          </Button>
        </div>
      )}

      {/* D. VIEW CONTENT (KANBAN OR LIST) */}
      {viewMode === 'kanban' ? (
        /* D = KANBAN BOARD VIEW */
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
                <div
                  style={{
                    padding: '12px 16px',
                    background: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
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
                              {kanbanCardsConfig.position && (
                                <div style={{ color: '#0d9488', fontSize: '11px', fontWeight: '600', marginTop: '2px', wordBreak: 'break-word' }}>
                                  {candPosition}
                                </div>
                              )}
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

                          {(kanbanCardsConfig.email || kanbanCardsConfig.phone) && (candEmail || candPhone) && (
                            <div style={{ marginTop: '6px', fontSize: '10px', color: '#475569' }}>
                              {kanbanCardsConfig.email && candEmail && <div>📧 {candEmail}</div>}
                              {kanbanCardsConfig.phone && candPhone && candPhone !== candPosition && <div>📞 {candPhone}</div>}
                            </div>
                          )}

                          {kanbanCardsConfig.resume && candResume && (
                            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px', maxWidth: '100%', overflow: 'hidden' }}>
                              <Badge variant="info" style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <FileText size={10} style={{ marginRight: '3px', flexShrink: 0 }} />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{candResume}</span>
                              </Badge>
                            </div>
                          )}

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
                  {(moduleConfig.columns || []).filter(c => c.visible).map((col, idx) => (
                    <th key={col.id} style={{ padding: '10px 14px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', position: idx === 0 ? 'sticky' : 'static', left: idx === 0 ? 0 : 'auto', background: '#f8fafc', zIndex: idx === 0 ? 2 : 1 }}>
                      {col.label}
                    </th>
                  ))}
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
                    <td colSpan={(moduleConfig.columns || []).filter(c => c.visible).length + (canManage ? 1 : 0)} style={{ padding: '32px', textAlign: 'center' }}>
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

                    const visibleCols = (moduleConfig.columns || []).filter(c => c.visible);

                    return (
                      <tr key={cand.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        {visibleCols.map((col) => {
                          if (col.id === 'candidate') {
                            return (
                              <td key={col.id} style={{ padding: '10px 14px', position: 'sticky', left: 0, background: '#ffffff', zIndex: 1 }}>
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
                            );
                          }
                          if (col.id === 'position') {
                            return (
                              <td key={col.id} style={{ padding: '10px 14px', color: '#334155', fontSize: '12px', fontWeight: '600' }}>
                                {candPosition}
                              </td>
                            );
                          }
                          if (col.id === 'contact') {
                            return (
                              <td key={col.id} style={{ padding: '10px 14px' }}>
                                <div style={{ fontSize: '12px', color: '#0f172a', fontWeight: '600' }}>{candEmail || '—'}</div>
                                <div style={{ fontSize: '10px', color: '#64748b' }}>{candPhone || '—'}</div>
                              </td>
                            );
                          }
                          if (col.id === 'stage') {
                            return (
                              <td key={col.id} style={{ padding: '10px 14px' }}>
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
                            );
                          }
                          if (col.id === 'resume') {
                            return (
                              <td key={col.id} style={{ padding: '10px 14px' }}>
                                {candResume ? (
                                  <Badge variant="info">
                                    <FileText size={10} style={{ marginRight: '3px' }} />
                                    {candResume}
                                  </Badge>
                                ) : (
                                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>—</span>
                                )}
                              </td>
                            );
                          }
                          if (col.id === 'createdAt') {
                            return (
                              <td key={col.id} style={{ padding: '10px 14px', fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
                                {createdDate}
                              </td>
                            );
                          }
                          return (
                            <td key={col.id} style={{ padding: '10px 14px', fontSize: '12px', color: '#475569' }}>
                              {getValString(cand[col.fieldKey] || cand.customFields?.[col.fieldKey]) || '—'}
                            </td>
                          );
                        })}

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

      {/* ADMIN CONFIGURATION MODAL (FALLBACK MODAL WRAPPER) */}
      {showConfigModal && (
        <Modal
          isOpen={showConfigModal}
          onClose={() => setShowConfigModal(false)}
          title="Configure Recruitment ATS Module"
          subtitle="Master Module Configuration Editor"
        >
          <ModuleConfigEditor
            companyId={companyId}
            moduleDef={moduleConfigService.getModuleDefinition('recruitment_ats')}
            initialConfig={moduleConfig}
            onSaveConfig={handleSaveModuleConfig}
            activePipelineStages={activePipelineStages}
            atsCandidates={atsCandidates}
            systemDropdowns={systemDropdowns}
            onClose={() => setShowConfigModal(false)}
            showToast={showToast}
          />
        </Modal>
      )}

      {/* RECRUITMENT POSITIONS REQUISITION MANAGER MODAL */}
      {showPositionModal && (
        <PositionManagerModal
          isOpen={showPositionModal}
          onClose={() => setShowPositionModal(false)}
          positions={recruitmentPositions}
          onSavePositions={handleSavePositions}
          systemDropdowns={systemDropdowns}
          atsCandidates={atsCandidates}
          showToast={showToast}
        />
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
                const candName = String(getValString(item.name || candData.name, 'Archived Candidate') || '').replace('ATS Candidate: ', '').replace(/"/g, '');
                const candPosition = getValString(candData.position, 'Candidate Record');
                const origStage = getValString(candData.status, defaultInitialStage);

                return (
                  <div
                    key={item.id || idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
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

      {/* ADD CANDIDATE MODAL — ONE SCHEMA DRIVEN ENGINE */}
      {showAddModal && (
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Add New Candidate"
          subtitle="Register candidate into the recruitment ATS pipeline."
        >
          <form onSubmit={handleSaveCandidate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {(moduleConfig.fields || []).filter(f => f.showOnCreate).map(field => {
              if (field.id === 'name') {
                return (
                  <div key={field.id}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                      {field.label} <span style={{ color: '#ef4444' }}>*</span>
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
                );
              }

              if (field.id === 'position') {
                return (
                  <div key={field.id}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                      {field.label} <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <select
                      value={candidateForm.position}
                      onChange={(e) => setCandidateForm({ ...candidateForm, position: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: formErrors.position ? '1.5px solid #ef4444' : '1px solid #cbd5e1', fontSize: '13px', background: '#ffffff', outline: 'none' }}
                    >
                      <option value="">Select Recruitment Position...</option>
                      {allUniquePositions.map((pos, i) => (
                        <option key={i} value={pos}>{pos}</option>
                      ))}
                    </select>
                    {formErrors.position && <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: '600' }}>{formErrors.position}</span>}
                  </div>
                );
              }

              if (field.id === 'email') {
                return (
                  <div key={field.id}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>{field.label}</label>
                    <input
                      type="email"
                      placeholder="e.g. vikram@example.com"
                      value={candidateForm.email}
                      onChange={(e) => setCandidateForm({ ...candidateForm, email: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: formErrors.email ? '1.5px solid #ef4444' : '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                    />
                    {formErrors.email && <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: '600' }}>{formErrors.email}</span>}
                  </div>
                );
              }

              if (field.id === 'phone') {
                return (
                  <div key={field.id}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>{field.label}</label>
                    <input
                      type="text"
                      placeholder="e.g. +91 9876543210"
                      value={candidateForm.phone}
                      onChange={(e) => setCandidateForm({ ...candidateForm, phone: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                    />
                  </div>
                );
              }

              if (field.id === 'status') {
                return (
                  <div key={field.id}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                      {field.label} <span style={{ color: '#ef4444' }}>*</span>
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
                );
              }

              // Custom Dropdown Field
              if (field.type === 'dropdown' || field.type === 'radio') {
                let optionsList = field.manualOptions || [];
                if (field.optionsSource === 'departments') optionsList = (systemDropdowns?.departments || []).map(getValString);
                if (field.optionsSource === 'designations') optionsList = (systemDropdowns?.designations || []).map(getValString);
                if (field.optionsSource === 'ats_stages') optionsList = activePipelineStages.map(s => getValString(s.name));
                if (field.optionsSource === 'employment_types') optionsList = ['Full-time', 'Part-time', 'Contract', 'Internship'];

                return (
                  <div key={field.id}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                      {field.label} {field.required && <span style={{ color: '#ef4444' }}>*</span>}
                    </label>
                    <select
                      value={customFieldsData[field.id] || ''}
                      onChange={(e) => setCustomFieldsData({ ...customFieldsData, [field.id]: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: formErrors[field.id] ? '1.5px solid #ef4444' : '1px solid #cbd5e1', fontSize: '13px', background: '#ffffff', outline: 'none' }}
                    >
                      <option value="">Select {field.label}...</option>
                      {optionsList.map((opt, i) => (
                        <option key={i} value={opt}>{opt}</option>
                      ))}
                    </select>
                    {formErrors[field.id] && <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: '600' }}>{formErrors[field.id]}</span>}
                  </div>
                );
              }

              if (field.type === 'textarea') {
                return (
                  <div key={field.id}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                      {field.label} {field.required && <span style={{ color: '#ef4444' }}>*</span>}
                    </label>
                    <textarea
                      rows={3}
                      value={customFieldsData[field.id] || ''}
                      onChange={(e) => setCustomFieldsData({ ...customFieldsData, [field.id]: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: formErrors[field.id] ? '1.5px solid #ef4444' : '1px solid #cbd5e1', fontSize: '13px', outline: 'none', resize: 'vertical' }}
                    />
                    {formErrors[field.id] && <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: '600' }}>{formErrors[field.id]}</span>}
                  </div>
                );
              }

              if (field.type === 'checkbox') {
                return (
                  <div key={field.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
                    <input
                      type="checkbox"
                      id={field.id}
                      checked={!!customFieldsData[field.id]}
                      onChange={(e) => setCustomFieldsData({ ...customFieldsData, [field.id]: e.target.checked })}
                      style={{ accentColor: '#0d9488', width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <label htmlFor={field.id} style={{ fontSize: '12px', fontWeight: '700', color: '#334155', cursor: 'pointer' }}>
                      {field.label} {field.required && <span style={{ color: '#ef4444' }}>*</span>}
                    </label>
                  </div>
                );
              }

              return (
                <div key={field.id}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    {field.label} {field.required && <span style={{ color: '#ef4444' }}>*</span>}
                  </label>
                  <input
                    type={field.type === 'date' ? 'date' : (field.type || 'text')}
                    value={customFieldsData[field.id] || ''}
                    onChange={(e) => setCustomFieldsData({ ...customFieldsData, [field.id]: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: formErrors[field.id] ? '1.5px solid #ef4444' : '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                  />
                  {formErrors[field.id] && <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: '600' }}>{formErrors[field.id]}</span>}
                </div>
              );
            })}

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

      {/* EDIT CANDIDATE MODAL — ONE SCHEMA DRIVEN ENGINE */}
      {showEditModal && (
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="Edit Candidate Profile"
          subtitle={`Update profile details for ${candidateForm.name || 'Candidate'}.`}
        >
          <form onSubmit={handleSaveCandidate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {(moduleConfig.fields || []).filter(f => f.showOnEdit).map(field => {
              if (field.id === 'name') {
                return (
                  <div key={field.id}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                      {field.label} <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={candidateForm.name}
                      onChange={(e) => setCandidateForm({ ...candidateForm, name: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: formErrors.name ? '1.5px solid #ef4444' : '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                    />
                    {formErrors.name && <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: '600' }}>{formErrors.name}</span>}
                  </div>
                );
              }

              if (field.id === 'position') {
                return (
                  <div key={field.id}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                      {field.label} <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <select
                      value={candidateForm.position}
                      onChange={(e) => setCandidateForm({ ...candidateForm, position: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: formErrors.position ? '1.5px solid #ef4444' : '1px solid #cbd5e1', fontSize: '13px', background: '#ffffff', outline: 'none' }}
                    >
                      <option value="">Select Recruitment Position...</option>
                      {allUniquePositions.map((pos, i) => (
                        <option key={i} value={pos}>{pos}</option>
                      ))}
                    </select>
                    {formErrors.position && <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: '600' }}>{formErrors.position}</span>}
                  </div>
                );
              }

              if (field.id === 'email') {
                return (
                  <div key={field.id}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>{field.label}</label>
                    <input
                      type="email"
                      value={candidateForm.email}
                      onChange={(e) => setCandidateForm({ ...candidateForm, email: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: formErrors.email ? '1.5px solid #ef4444' : '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                    />
                    {formErrors.email && <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: '600' }}>{formErrors.email}</span>}
                  </div>
                );
              }

              if (field.id === 'phone') {
                return (
                  <div key={field.id}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>{field.label}</label>
                    <input
                      type="text"
                      value={candidateForm.phone}
                      onChange={(e) => setCandidateForm({ ...candidateForm, phone: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                    />
                  </div>
                );
              }

              if (field.id === 'status') {
                return (
                  <div key={field.id}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>{field.label}</label>
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
                );
              }

              // Custom Dropdown Field
              if (field.type === 'dropdown' || field.type === 'radio') {
                let optionsList = field.manualOptions || [];
                if (field.optionsSource === 'departments') optionsList = (systemDropdowns?.departments || []).map(getValString);
                if (field.optionsSource === 'designations') optionsList = (systemDropdowns?.designations || []).map(getValString);
                if (field.optionsSource === 'ats_stages') optionsList = activePipelineStages.map(s => getValString(s.name));
                if (field.optionsSource === 'employment_types') optionsList = ['Full-time', 'Part-time', 'Contract', 'Internship'];

                return (
                  <div key={field.id}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                      {field.label} {field.required && <span style={{ color: '#ef4444' }}>*</span>}
                    </label>
                    <select
                      value={customFieldsData[field.id] || ''}
                      onChange={(e) => setCustomFieldsData({ ...customFieldsData, [field.id]: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: formErrors[field.id] ? '1.5px solid #ef4444' : '1px solid #cbd5e1', fontSize: '13px', background: '#ffffff', outline: 'none' }}
                    >
                      <option value="">Select {field.label}...</option>
                      {optionsList.map((opt, i) => (
                        <option key={i} value={opt}>{opt}</option>
                      ))}
                    </select>
                    {formErrors[field.id] && <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: '600' }}>{formErrors[field.id]}</span>}
                  </div>
                );
              }

              if (field.type === 'textarea') {
                return (
                  <div key={field.id}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                      {field.label} {field.required && <span style={{ color: '#ef4444' }}>*</span>}
                    </label>
                    <textarea
                      rows={3}
                      value={customFieldsData[field.id] || ''}
                      onChange={(e) => setCustomFieldsData({ ...customFieldsData, [field.id]: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: formErrors[field.id] ? '1.5px solid #ef4444' : '1px solid #cbd5e1', fontSize: '13px', outline: 'none', resize: 'vertical' }}
                    />
                    {formErrors[field.id] && <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: '600' }}>{formErrors[field.id]}</span>}
                  </div>
                );
              }

              if (field.type === 'checkbox') {
                return (
                  <div key={field.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
                    <input
                      type="checkbox"
                      id={`edit_${field.id}`}
                      checked={!!customFieldsData[field.id]}
                      onChange={(e) => setCustomFieldsData({ ...customFieldsData, [field.id]: e.target.checked })}
                      style={{ accentColor: '#0d9488', width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <label htmlFor={`edit_${field.id}`} style={{ fontSize: '12px', fontWeight: '700', color: '#334155', cursor: 'pointer' }}>
                      {field.label} {field.required && <span style={{ color: '#ef4444' }}>*</span>}
                    </label>
                  </div>
                );
              }

              return (
                <div key={field.id}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    {field.label} {field.required && <span style={{ color: '#ef4444' }}>*</span>}
                  </label>
                  <input
                    type={field.type === 'date' ? 'date' : (field.type || 'text')}
                    value={customFieldsData[field.id] || ''}
                    onChange={(e) => setCustomFieldsData({ ...customFieldsData, [field.id]: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: formErrors[field.id] ? '1.5px solid #ef4444' : '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                  />
                  {formErrors[field.id] && <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: '600' }}>{formErrors[field.id]}</span>}
                </div>
              );
            })}

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

      {/* CANDIDATE DETAIL DRAWER / MODAL — ONE SCHEMA DRIVEN VIEW */}
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

            {/* SCHEMA-DRIVEN VIEW FIELDS */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px' }}>
              {(moduleConfig.fields || []).filter(f => f.showOnView !== false).map(field => {
                let val = '';
                if (field.id === 'name') val = getValString(selectedCandidate.name);
                else if (field.id === 'position') val = getValString(selectedCandidate.position);
                else if (field.id === 'email') val = getValString(selectedCandidate.email);
                else if (field.id === 'phone') val = getValString(selectedCandidate.phone);
                else if (field.id === 'status') val = getValString(selectedCandidate.status);
                else val = getValString(selectedCandidate.customFields?.[field.id]);

                return (
                  <div key={field.id} style={{ background: '#ffffff', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', display: 'block' }}>{field.label}</span>
                    <span style={{ fontWeight: '700', color: '#0f172a' }}>{val || '—'}</span>
                  </div>
                );
              })}
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
