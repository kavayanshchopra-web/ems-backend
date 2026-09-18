/**
 * UNIVERSAL LIST ENGINE COMPONENT (SchemaDataTable)
 * Enterprise CRM Scroll Architecture with Sticky <thead>, Sticky Bottom <Pagination>, & Thin Themed Scrollbars
 */

import React, { useState, useRef, useEffect } from 'react';
import { Eye, Edit2, Archive, ArrowUp, ArrowDown, ArrowUpDown, RotateCcw, Trash2, Columns } from 'lucide-react';
import SchemaFieldRenderer from '../FieldEngine/SchemaFieldRenderer';
import { LabelEngine } from '../LabelEngine';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import EmptyState from '../../../components/ui/EmptyState';
import BulkActionEngine from '../BulkActionEngine/BulkActionEngine';
import Pagination from './Pagination';
import ColumnManagerPopover from './ColumnManagerPopover';
import { formatCandidateId } from '../../../services/atsStorageService';

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

const formatDate = (isoStr) => {
  if (!isoStr) return '01 Aug 2026';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '01 Aug 2026';
    const dayStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${dayStr}, ${timeStr}`;
  } catch (e) {
    return '01 Aug 2026';
  }
};

export const formatCallDateTime = (val) => {
  if (!val) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    return {
      dayLabel: dateStr,
      dateStr,
      timeStr: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      isToday: true,
      isYesterday: false
    };
  }

  let dateObj = null;
  if (typeof val === 'number') {
    dateObj = new Date(val < 10000000000 ? val * 1000 : val);
  } else if (typeof val === 'string') {
    const num = Number(val);
    if (!isNaN(num) && num > 1000000000) {
      dateObj = new Date(num < 10000000000 ? num * 1000 : num);
    } else {
      const parsed = new Date(val);
      if (!isNaN(parsed.getTime())) {
        dateObj = parsed;
      }
    }
  } else if (val instanceof Date) {
    dateObj = val;
  }

  if (!dateObj || isNaN(dateObj.getTime())) {
    return {
      dayLabel: String(val),
      dateStr: String(val),
      timeStr: '',
      isToday: false,
      isYesterday: false
    };
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - (24 * 60 * 60 * 1000);
  const dateTime = dateObj.getTime();

  const isToday = dateTime >= startOfToday && dateTime < (startOfToday + 24 * 60 * 60 * 1000);
  const isYesterday = dateTime >= startOfYesterday && dateTime < startOfToday;

  const timeStr = dateObj.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const dateStr = dateObj.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  return {
    dayLabel: dateStr,
    dateStr,
    timeStr,
    fullLabel: `${dateStr}, ${timeStr}`,
    isToday,
    isYesterday,
    rawDate: dateObj
  };
};

const getAvatarGradient = (nameStr = 'R', isArchived = false) => {
  if (isArchived) return 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
  const char = (nameStr[0] || 'R').toUpperCase();
  const charCode = char.charCodeAt(0);
  const gradients = [
    'linear-gradient(135deg, #0d9488 0%, #064e43 100%)', // Teal
    'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)', // Indigo
    'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', // Blue
    'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', // Purple
    'linear-gradient(135deg, #ec4899 0%, #be185d 100%)', // Pink
    'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)', // Amber
    'linear-gradient(135deg, #10b981 0%, #047857 100%)'  // Emerald
  ];
  return gradients[charCode % gradients.length];
};

export default function ListEngine({
  records = [],
  setRecords = () => {},
  moduleConfig = {},
  totalCount = 0,
  isFilterActive = false,
  searchQuery = '',
  sortKey = 'createdAt',
  sortDir = 'desc',
  onSortChange = () => {},
  canManage = true,
  softDeleteRecord = null,
  handleRestoreBinItem = null,
  showToast = () => {},
  isArchivedView = false,
  onViewRecord = () => {},
  onEditRecord = () => {},
  onArchiveRecord = () => {},
  onMoveStage = () => {},
  onResetFilters = () => {},
  systemDropdowns = null,
  activePipelineStages = [],
  onOpenExportModal = () => {},
  hiddenColIds: propHiddenColIds = [],
  setHiddenColIds: propSetHiddenColIds = null,
  currentPage: propCurrentPage = 1,
  pageSize: propPageSize = 25,
  onPageChange: propOnPageChange = null,
  onPageSizeChange: propOnPageSizeChange = null,
  emptyText: propEmptyText = null
}) {
  const [langVersion, setLangVersion] = useState(0);

  React.useEffect(() => {
    const handleLangChange = () => setLangVersion(v => v + 1);
    window.addEventListener('app_language_changed', handleLangChange);
    return () => window.removeEventListener('app_language_changed', handleLangChange);
  }, []);

  const [colWidths, setColWidths] = useState({});
  const [selectedIds, setSelectedIds] = useState([]);
  const [localCurrentPage, setLocalCurrentPage] = useState(1);
  const [localPageSize, setLocalPageSize] = useState(25);
  const [localHiddenColIds, setLocalHiddenColIds] = useState([]);

  const currentPage = propOnPageChange ? propCurrentPage : localCurrentPage;
  const setCurrentPage = propOnPageChange || setLocalCurrentPage;
  const pageSize = propOnPageSizeChange ? propPageSize : localPageSize;
  const setPageSize = propOnPageSizeChange || setLocalPageSize;
  const hiddenColIds = propSetHiddenColIds ? propHiddenColIds : localHiddenColIds;
  const setHiddenColIds = propSetHiddenColIds || setLocalHiddenColIds;

  const emptyStateTextObj = propEmptyText || LabelEngine.getEmptyStateText(moduleConfig, isFilterActive, searchQuery) || {};
  const emptyTitle = emptyStateTextObj.title || 'No records found';
  const emptyDesc = emptyStateTextObj.description || 'No data matches your current criteria.';

  const [showColumnPopover, setShowColumnPopover] = useState(false);
  const scrollRef = useRef(null);

  const allCols = moduleConfig.columns || [];

  // Filter out columns hidden via metadata or user popover toggle (and exclude redundant 'id'/'displayId' since we render a dedicated first ID column)
  const visibleCols = allCols
    .filter(c => c.visible !== false && !hiddenColIds.includes(c.id) && c.id !== 'id' && c.id !== 'displayId' && c.fieldKey !== 'displayId')
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  const fieldsMap = new Map((moduleConfig.fields || []).map(f => [f.id, f]));

  // Dynamic Column Width Resolution Helper
  const getColWidth = (col) => {
    if (!col) return 140;
    if (colWidths[col.id]) return colWidths[col.id];
    if (col.width) {
      const num = parseInt(col.width, 10);
      if (!isNaN(num)) return num;
    }
    if (col.id === 'candidate' || col.id === 'name' || col.id === 'employee') return 210;
    if (col.id === 'phone') return 160;
    if (col.id === 'callTime' || col.fieldKey === 'callTime' || col.id === 'call_time' || col.fieldKey === 'call_time') return 160;
    if (col.id === 'contact' || col.id === 'contact_details' || col.id === 'email') return 190;
    if (col.id === 'source') return 130;
    if (col.id === 'tags') return 130;
    if (col.id === 'assignedTo') return 130;
    if (col.id === 'position' || col.id === 'department' || col.id === 'role') return 130;
    if (col.id === 'salary') return 120;
    if (col.id === 'status' || col.id === 'stage' || col.id === 'disposition') return 140;
    return 140;
  };

  // Interactive Mouse Drag-to-Resize Handler
  const handleResizeMouseDown = (e, colId) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const targetCol = visibleCols.find(c => c.id === colId);
    const startWidth = getColWidth(targetCol);

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(70, startWidth + deltaX);
      setColWidths(prev => ({
        ...prev,
        [colId]: newWidth
      }));
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Mouse Drag-to-Scroll handlers for smooth left/right table panning without visible scrollbar
  const [isDragScrolling, setIsDragScrolling] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragScrollLeft, setDragScrollLeft] = useState(0);

  const handleMouseDown = (e) => {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.closest('input')) return;
    setIsDragScrolling(true);
    setDragStartX(e.pageX - scrollRef.current.offsetLeft);
    setDragScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleMouseLeaveOrUp = () => {
    setIsDragScrolling(false);
  };

  const handleMouseMoveDrag = (e) => {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) return;
    if (!isDragScrolling || !scrollRef.current) return;
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - dragStartX) * 1.5;
    scrollRef.current.scrollLeft = dragScrollLeft - walk;
  };

  const theadRef = useRef(null);

  // HEADER MOUSE WHEEL HANDLER: Non-passive native listener so e.preventDefault() & e.stopPropagation() 100% block vertical list scrolling when mouse is on Table Header
  useEffect(() => {
    const headerEl = theadRef.current;
    if (!headerEl) return;

    const handleNativeHeaderWheel = (e) => {
      if (scrollRef.current && e.deltaY !== 0) {
        e.preventDefault();
        e.stopPropagation();
        scrollRef.current.scrollLeft += (e.deltaY * 1.5);
      }
    };

    headerEl.addEventListener('wheel', handleNativeHeaderWheel, { passive: false });
    return () => {
      headerEl.removeEventListener('wheel', handleNativeHeaderWheel);
    };
  }, []);

  const safeRecords = (records || []).filter(r => !!r);
  const totalPages = Math.ceil(safeRecords.length / pageSize) || 1;
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIdx = (validCurrentPage - 1) * pageSize;
  const paginatedRecords = safeRecords.slice(startIdx, startIdx + pageSize);

  const employeesList = React.useMemo(() => {
    const rawList = Array.isArray(systemDropdowns?.employees) ? systemDropdowns.employees : [];
    const unique = new Map();
    rawList.forEach(e => {
      if (!e) return;
      let name = '';
      let id = e.id || '';
      if (typeof e === 'string') {
        name = e.trim();
        id = name;
      } else {
        name = `${e.first_name || e.firstName || e.name || ''} ${e.last_name || e.lastName || ''}`.trim();
        if (!name && e.email) name = e.email;
      }
      if (name && name.toLowerCase() !== 'undefined' && name.toLowerCase() !== 'null') {
        if (!unique.has(name)) {
          unique.set(name, { id: id || name, name, role: e.role || e.designation || '' });
        }
      }
    });
    return Array.from(unique.values());
  }, [systemDropdowns?.employees]);

  const handleAssignedToChange = (recId, newAssignedVal) => {
    if (typeof setRecords === 'function') {
      setRecords(prev => {
        const list = Array.isArray(prev) ? prev : records;
        return list.map(r => {
          if (String(r.id) === String(recId) || String(r.displayId) === String(recId)) {
            return {
              ...r,
              assignedTo: newAssignedVal,
              assigned_to: newAssignedVal,
              agentName: newAssignedVal,
              updatedAt: new Date().toISOString()
            };
          }
          return r;
        });
      });
      if (typeof showToast === 'function') {
        showToast(`Assigned lead to ${newAssignedVal || 'Unassigned'}`, 'success');
      }
    }
  };

  const isAllPaginatedSelected = paginatedRecords.length > 0 && paginatedRecords.every(r => (selectedIds || []).includes(r.id));

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const pageIds = paginatedRecords.filter(r => !!r && r.id !== undefined).map(r => r.id);
      setSelectedIds(Array.from(new Set([...(selectedIds || []), ...pageIds])));
    } else {
      const pageIdSet = new Set(paginatedRecords.map(r => r.id));
      setSelectedIds((selectedIds || []).filter(id => !pageIdSet.has(id)));
    }
  };

  const handleToggleSelectRow = (recId) => {
    if (recId === undefined || recId === null) return;
    setSelectedIds(prev =>
      (prev || []).includes(recId) ? (prev || []).filter(id => id !== recId) : [...(prev || []), recId]
    );
  };
  const handleSelectRow = handleToggleSelectRow;

  const renderRow = (record, idx) => {
    if (!record) return null;
    const isSelected = (selectedIds || []).includes(record.id);
    let recordName = getValString(
      record.name || record.fullName || record.employeeName || record.candidateName || record.title,
      ''
    );
    if (!recordName || recordName === 'Employee Directory' || recordName === 'Candidate') {
      if (record.email) {
        const parts = getValString(record.email).split('@');
        if (parts[0]) {
          recordName = parts[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        }
      }
    }
    if (!recordName) {
      recordName = LabelEngine.getEntityName(moduleConfig);
    }

    const recordStatus = getValString(record.disposition || record.status || record.stage);
    const displayId = record.displayId || record.tag || formatCandidateId(record.id, idx, moduleConfig);
    const recordSub = getValString(record.department || record.designation || record.position || record.appliedFor, '');
    const avatarGradient = getAvatarGradient(recordName, isArchivedView);

    return (
      <tr
        key={record.id || idx || Math.random()}
        className="ems-row-hover"
        onClick={() => onViewRecord(record)}
        style={{
          background: isSelected ? 'rgba(13, 148, 136, 0.12)' : '#ffffff',
          cursor: 'pointer',
          transition: 'background 0.15s ease-in-out'
        }}
      >
        {/* CHECKBOX CELL WITH COMPACT SPACING */}
        <td style={{ padding: '6px 10px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', width: '38px', minWidth: '38px', maxWidth: '38px' }} onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              handleSelectRow(record.id);
            }}
            style={{ accentColor: isArchivedView ? '#f59e0b' : '#0d9488', cursor: 'pointer', width: '15px', height: '15px' }}
          />
        </td>

        {/* DEDICATED COMPACT ID COLUMN CELL */}
        <td style={{ padding: '6px 12px', borderBottom: '1px solid #e2e8f0', width: '95px', minWidth: '95px', maxWidth: '95px', whiteSpace: 'nowrap' }}>
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'monospace',
              fontWeight: '800',
              padding: '2px 7px',
              borderRadius: '5px',
              background: isArchivedView ? 'rgba(217, 119, 6, 0.1)' : 'rgba(13, 148, 136, 0.08)',
              color: isArchivedView ? '#b45309' : '#0d9488',
              border: `1px solid ${isArchivedView ? 'rgba(217, 119, 6, 0.25)' : 'rgba(13, 148, 136, 0.2)'}`,
              display: 'inline-block'
            }}
          >
            {displayId}
          </span>
        </td>

        {visibleCols.map((col, colIdx) => {
          const fieldDef = fieldsMap.get(col.fieldKey) || fieldsMap.get(col.id);

          {/* ASSET TAG ID COLUMN SPECIFIC OVERRIDE */}
          if (col.id === 'tag' || col.fieldKey === 'tag') {
            const tagVal = getValString(record.tag || record.id || displayId);
            return (
              <td key={col.id} style={{ padding: '6px 12px', borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11.5px', fontFamily: 'monospace', fontWeight: '800', padding: '2px 8px', borderRadius: '5px', background: 'rgba(13, 148, 136, 0.1)', color: '#0d9488', border: '1px solid rgba(13, 148, 136, 0.2)', display: 'inline-block' }}>
                  🏷️ {tagVal}
                </span>
              </td>
            );
          }

          {/* PRIMARY IDENTITY COLUMN (COMPACT AVATAR + NAME ONLY, NO STACKED ID) */}
          if (colIdx === 0 || col.id === 'candidate' || col.id === 'deal' || col.id === 'employee' || col.id === 'name') {
            return (
              <td key={col.id} style={{ padding: '6px 12px', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '240px' }}>
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: isArchivedView ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'linear-gradient(135deg, #0d9488 0%, #064e43 100%)',
                      color: '#ffffff',
                      fontWeight: '800',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      fontSize: '11px',
                      lineHeight: '26px',
                      padding: 0,
                      margin: 0,
                      flexShrink: 0,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      userSelect: 'none'
                    }}
                  >
                    {(recordName[0] || 'R').toUpperCase()}
                  </div>
                  <div style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <div
                      title={recordName}
                      style={{ fontWeight: '700', color: '#0f172a', fontSize: '12.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '175px' }}
                    >
                      {recordName}
                    </div>
                    {/* Call Recording OFF Badge next to lead */}
                    {Boolean(
                      record.recording_status === 'RECORDING_OFF' ||
                      record.recordingStatus === 'RECORDING_OFF' ||
                      record.recording === 'RECORDING_OFF' ||
                      record.recording_url === 'RECORDING_OFF' ||
                      String(record.notes || '').toLowerCase().includes('recording was off') ||
                      String(record.notes || '').toLowerCase().includes('recording may be off') ||
                      String(record.notes || '').toLowerCase().includes('recording off')
                    ) && (
                      <span
                        style={{
                          fontSize: '9px',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          background: '#fef2f2',
                          color: '#dc2626',
                          fontWeight: '800',
                          border: '1px solid #fecaca',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          flexShrink: 0
                        }}
                        title="Telecaller phone Auto-Recording was OFF during this call"
                      >
                        <span style={{ display: 'inline-block', width: '4px', height: '4px', borderRadius: '50%', background: '#dc2626' }} />
                        REC OFF
                      </span>
                    )}
                    {(record.isDuplicate || record.isCopy || String(record.id).includes('_copy_') || recordName.includes('(Copy')) && (
                      <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '4px', background: '#dbeafe', color: '#1d4ed8', fontWeight: '800', border: '1px solid #bfdbfe', textTransform: 'uppercase', letterSpacing: '0.2px', flexShrink: 0 }}>
                        COPY
                      </span>
                    )}
                  </div>
                </div>
              </td>
            );
          }

          {/* COMBINED CONTACT DETAILS COLUMN (ONLY FOR COMBINED TYPE 'contact_details') */}
          if (col.id === 'contact_details') {
            const emailStr = getValString(record.email);
            const phoneStr = getValString(record.phone);
            return (
              <td key={col.id} style={{ padding: '6px 12px', borderBottom: '1px solid #e2e8f0', maxWidth: '240px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11.5px', maxWidth: '220px', overflow: 'hidden' }}>
                  {emailStr && (
                    <div title={`Email: ${emailStr}`} style={{ color: '#0f172a', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>📧 {emailStr}</div>
                  )}
                  {phoneStr && (
                    <div title={`Phone: ${phoneStr}`} style={{ color: '#475569', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>📞 {phoneStr}</span>
                      <button
                        type="button"
                        title="📞 Call via Softphone"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.openGlobalDialer) {
                            window.openGlobalDialer(phoneStr, getValString(record.name || record.title), true);
                          }
                        }}
                        style={{
                          padding: '1px 5px',
                          borderRadius: '4px',
                          background: 'rgba(16, 185, 129, 0.18)',
                          color: '#059669',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          cursor: 'pointer',
                          fontSize: '10px',
                          fontWeight: '700'
                        }}
                      >
                        Call
                      </button>
                    </div>
                  )}
                  {!emailStr && !phoneStr && <span style={{ color: '#94a3b8', fontWeight: '600' }}>—</span>}
                </div>
              </td>
            );
          }

          {/* RESUME / ATTACHMENT COLUMN */}
          if (col.id === 'resume' || col.fieldKey === 'resume') {
            const resumeStr = getValString(record.resume || record.attachment);
            return (
              <td key={col.id} style={{ padding: '6px 12px', fontSize: '12px', borderBottom: '1px solid #e2e8f0' }}>
                {resumeStr ? (
                  <Badge variant="info" style={{ fontSize: '10.5px', padding: '2px 8px' }}>📄 {resumeStr}</Badge>
                ) : (
                  <span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: '600' }}>—</span>
                )}
              </td>
            );
          }

          {/* CALL TIME / DATE & TIME COLUMN (TODAY / YESTERDAY / EXACT DATE + TIME) */}
          if (col.id === 'callTime' || col.fieldKey === 'callTime' || col.id === 'call_time' || col.fieldKey === 'call_time' || col.id === 'callDateTime') {
            const rawTime = record.callTime || record.call_time || record._createdAt || record.created_at || record.createdAt || record.timestamp;
            const formatted = formatCallDateTime(rawTime);
            return (
              <td key={col.id} style={{ padding: '6px 12px', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '1px 6px',
                    borderRadius: '5px',
                    fontSize: '11px',
                    fontWeight: '700',
                    background: formatted.isToday ? 'rgba(13, 148, 136, 0.1)' : (formatted.isYesterday ? 'rgba(217, 119, 6, 0.1)' : '#f1f5f9'),
                    color: formatted.isToday ? '#0d9488' : (formatted.isYesterday ? '#d97706' : '#334155'),
                    border: `1px solid ${formatted.isToday ? 'rgba(13, 148, 136, 0.25)' : (formatted.isYesterday ? 'rgba(217, 119, 6, 0.25)' : '#e2e8f0')}`
                  }}>
                    <span style={{
                      display: 'inline-block',
                      width: '5px',
                      height: '5px',
                      borderRadius: '50%',
                      background: formatted.isToday ? '#0d9488' : (formatted.isYesterday ? '#d97706' : '#64748b')
                    }} />
                    {formatted.isToday ? 'Today' : (formatted.isYesterday ? 'Yesterday' : formatted.dateStr)}
                  </span>
                  <span style={{ fontSize: '10.5px', fontWeight: '600', color: '#64748b' }}>
                    {formatted.timeStr}
                  </span>
                </div>
              </td>
            );
          }

          {/* CREATED AT / APPLIED DATE COLUMN */}
          if (col.id === 'createdAt' || col.fieldKey === 'createdAt' || col.id === 'appliedDate') {
            const dateVal = formatDate(record.createdAt || record.appliedDate);
            return (
              <td key={col.id} style={{ padding: '6px 12px', fontSize: '11.5px', fontWeight: '600', color: '#475569', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                📅 {dateVal}
              </td>
            );
          }

          {/* STATUS / STAGE / DISPOSITION COLUMN WITH STANDARDIZED BADGES */}
          if (col.id === 'stage' || col.fieldKey === 'status' || col.id === 'status' || col.fieldKey === 'stage' || col.id === 'disposition' || col.fieldKey === 'disposition') {
            const normalizedBadgeVariant = isArchivedView ? 'warning' : LabelEngine.getBadgeVariant(recordStatus);
            const stagesList = (Array.isArray(activePipelineStages) && activePipelineStages.length > 0)
              ? activePipelineStages
              : (systemDropdowns?.crmStages || systemDropdowns?.crm_stages || moduleConfig?.stages || []);

            const hasMatchingOption = stagesList.some(s => {
              const valStr = typeof s === 'string' ? s : getValString(s.name || s.title || s.label || s.id || s);
              return valStr === recordStatus;
            });

            return (
              <td key={col.id} style={{ padding: '6px 12px', borderBottom: '1px solid #e2e8f0' }} onClick={(e) => e.stopPropagation()}>
                {!isArchivedView && canManage && stagesList.length > 0 ? (
                  <select
                    value={recordStatus}
                    onChange={(e) => {
                      e.stopPropagation();
                      onMoveStage(record.id, e.target.value);
                    }}
                    style={{ padding: '3px 8px', fontSize: '11px', fontWeight: '700', borderRadius: '5px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0d9488', cursor: 'pointer', height: '26px' }}
                  >
                    {!hasMatchingOption && recordStatus ? (
                      <option value={recordStatus}>{recordStatus}</option>
                    ) : null}
                    {stagesList.map(s => {
                      const valStr = typeof s === 'string' ? s : getValString(s.name || s.title || s.label || s.id || s);
                      const labelStr = typeof s === 'string' ? s : getValString(s.title || s.name || s.label || s.id || s);
                      return (
                        <option key={s.id || valStr} value={valStr}>
                          {labelStr}
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <Badge variant={normalizedBadgeVariant} style={{ fontSize: '10.5px', padding: '2px 8px', borderRadius: '10px', fontWeight: '700' }}>
                    {isArchivedView ? 'ARCHIVED' : (recordStatus ? recordStatus.toUpperCase() : 'ACTIVE')}
                  </Badge>
                )}
              </td>
            );
          }

          {/* AUDIO RECORDING COLUMN SPECIFIC OVERRIDE */}
          if (col.id === 'recording' || col.fieldKey === 'recording') {
            const recUrl = getValString(record.recording || record.recordingUrl || record.audioUrl || record.recording_url).trim();
            const hasValidRec = recUrl && recUrl.startsWith('http') && !recUrl.includes('soundhelix.com');
            const isMissedCall = String(record.type || record.callType || '').toUpperCase() === 'MISSED' || 
                                 String(record.status || record.disposition || '').toUpperCase() === 'MISSED CALL';
            const callTime = Number(record._createdAt || (record.created_at ? new Date(record.created_at).getTime() : 0)) || 0;
            const isRecentCall = callTime > 0 && (Date.now() - callTime < 300000); // within last 5 minutes
            const isRecordingOff = recUrl === 'RECORDING_OFF' || 
                                   String(record.recording_status || record.recordingStatus || '').toUpperCase() === 'RECORDING_OFF' ||
                                   String(record.notes || '').toLowerCase().includes('recording was off') ||
                                   String(record.notes || '').toLowerCase().includes('recording may be off') ||
                                   String(record.notes || '').toLowerCase().includes('recording is off') ||
                                   String(record.notes || '').toLowerCase().includes('recording off');

            if (hasValidRec) {
              return (
                <td key={col.id} style={{ padding: '6px 12px', borderBottom: '1px solid #e2e8f0', minWidth: '220px' }}>
                  <SchemaFieldRenderer
                    field={fieldDef || { id: 'recording', key: 'recording', label: 'Audio Recording', type: 'audio' }}
                    value={recUrl}
                    mode="view"
                    compact={true}
                    moduleConfig={moduleConfig}
                    systemDropdowns={systemDropdowns}
                  />
                </td>
              );
            }

            if (isRecordingOff) {
              return (
                <td key={col.id} style={{ padding: '6px 12px', borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', padding: '3px 8px', borderRadius: '6px', fontWeight: '800' }} title="Native call recording was OFF in telecaller phone dialer settings. No audio file was captured.">
                    <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#dc2626' }} />
                    ⚠️ Recording OFF (No Audio)
                  </span>
                </td>
              );
            }

            const isPendingSync = !isMissedCall && isRecentCall && (String(record.disposition || '').toLowerCase() === 'pending' || !record.disposition);

            if (isPendingSync) {
              return (
                <td key={col.id} style={{ padding: '6px 12px', borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '10.5px', color: '#0d9488', background: 'rgba(13, 148, 136, 0.08)', border: '1px solid rgba(13, 148, 136, 0.25)', padding: '2px 8px', borderRadius: '10px', fontWeight: '700' }}>
                    <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#0d9488' }} />
                    ⏳ Syncing...
                  </span>
                </td>
              );
            }

            if (isMissedCall) {
              return (
                <td key={col.id} style={{ padding: '6px 12px', borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', fontWeight: '600' }}>
                    No Recording (Missed)
                  </span>
                </td>
              );
            }

            return (
              <td key={col.id} style={{ padding: '6px 12px', fontSize: '11.5px', borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10.5px', fontWeight: '700', color: '#dc2626', background: '#fef2f2', padding: '2px 6px', borderRadius: '4px', border: '1px solid #fecaca' }}>
                  ⚠️ No Recording
                </span>
              </td>
            );
          }

          {/* LEAD SOURCE COLUMN WITH SMART GHL HOVER TOOLTIP & 1-CLICK COPY */}
          if (col.id === 'source' || col.fieldKey === 'source') {
            const rawSource = getValString(record.source || record.leadSource || 'Manual Entry').trim();
            const ghlId = record.ghlContactId || record.ghl_contact_id || (String(record.id).startsWith('ghl_') ? String(record.id).replace('ghl_', '') : null);
            const isGhl = rawSource.toLowerCase().includes('gohighlevel') || Boolean(ghlId);

            return (
              <td key={col.id} style={{ padding: '6px 12px', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                {isGhl ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontSize: '10.5px',
                      fontWeight: '700',
                      background: 'rgba(16, 185, 129, 0.12)',
                      color: '#059669',
                      border: '1px solid rgba(16, 185, 129, 0.28)',
                      cursor: ghlId ? 'pointer' : 'default',
                      transition: 'all 0.15s ease'
                    }}
                    title={ghlId ? `⚡ GoHighLevel Synced\nGHL Contact ID: ${ghlId}\n(Click to copy ID)` : '⚡ GoHighLevel Synced'}
                    onClick={(e) => {
                      if (ghlId && navigator?.clipboard?.writeText) {
                        e.stopPropagation();
                        navigator.clipboard.writeText(ghlId);
                        if (typeof showToast === 'function') {
                          showToast(`📋 Copied GHL Contact ID: ${ghlId}`, 'success');
                        }
                      }
                    }}
                  >
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981' }} />
                    GoHighLevel
                    {ghlId && <span style={{ fontSize: '9.5px', opacity: 0.75, marginLeft: '2px' }} title="Click to copy GHL ID">📋</span>}
                  </span>
                ) : (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontSize: '10.5px',
                      fontWeight: '700',
                      background: rawSource.toLowerCase().includes('whatsapp') ? 'rgba(37, 211, 102, 0.12)' : (rawSource.toLowerCase().includes('sim') ? 'rgba(13, 148, 136, 0.12)' : '#f1f5f9'),
                      color: rawSource.toLowerCase().includes('whatsapp') ? '#15803d' : (rawSource.toLowerCase().includes('sim') ? '#0d9488' : '#475569'),
                      border: '1px solid rgba(0,0,0,0.08)'
                    }}
                  >
                    {rawSource.toLowerCase().includes('whatsapp') ? '💬 ' : (rawSource.toLowerCase().includes('sim') ? '📞 ' : '')}
                    {rawSource}
                  </span>
                )}
              </td>
            );
          }

          {/* CONTACT NOTES COLUMN (EXCLUDE SYNTHETIC IMPORTED FROM GOHIGHLEVEL STRINGS) */}
          if (col.id === 'notes' || col.fieldKey === 'notes') {
            let rawNotes = getValString(record.notes || record.customFields?.notes || '').trim();
            if (/^Imported from GoHighLevel/i.test(rawNotes)) {
              rawNotes = '';
            }
            const isEmptyNote = !rawNotes || rawNotes === 'undefined' || rawNotes === 'null';

            return (
              <td key={col.id} style={{ padding: '6px 12px', fontSize: '11.5px', color: '#334155', borderBottom: '1px solid #e2e8f0', maxWidth: '240px' }}>
                {isEmptyNote ? (
                  <span style={{ color: '#94a3b8', fontWeight: '600' }}>—</span>
                ) : (
                  <span
                    title={rawNotes}
                    style={{
                      display: 'block',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      color: '#1e293b',
                      fontWeight: '500'
                    }}
                  >
                    {rawNotes}
                  </span>
                )}
              </td>
            );
          }

          {/* ASSIGNED AGENT / STAFF COLUMN (COMPACT DROPDOWN FOR MANAGERS/OWNERS, CLEAN TEXT FOR STAFF, NO AVATAR BADGE) */}
          if (col.id === 'assignedTo' || col.fieldKey === 'assignedTo' || col.id === 'agentName' || col.fieldKey === 'agentName') {
            const assignedVal = getValString(record.assignedTo || record.assigned_to || record.agentName || record.agent || '').trim();
            const hasMatchingOption = employeesList.some(e => e.name === assignedVal);

            return (
              <td key={col.id} style={{ padding: '6px 12px', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                {!isArchivedView && canManage && employeesList.length > 0 ? (
                  <select
                    value={assignedVal}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleAssignedToChange(record.id, e.target.value);
                    }}
                    style={{
                      padding: '3px 8px',
                      fontSize: '11px',
                      fontWeight: '600',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#0f172a',
                      cursor: 'pointer',
                      height: '26px',
                      maxWidth: '160px'
                    }}
                  >
                    <option value="">Unassigned</option>
                    {!hasMatchingOption && assignedVal ? (
                      <option value={assignedVal}>{assignedVal}</option>
                    ) : null}
                    {employeesList.map(emp => (
                      <option key={emp.id || emp.name} value={emp.name}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span style={{ fontSize: '11.5px', color: assignedVal ? '#334155' : '#94a3b8', fontWeight: '600' }}>
                    {assignedVal || '—'}
                  </span>
                )}
              </td>
            );
          }

          {/* GENERIC COLUMN WITH STRICT "—" EMPTY FALLBACK */}
          const rawCellVal = (col.fieldKey && record[col.fieldKey] !== undefined && record[col.fieldKey] !== null)
            ? record[col.fieldKey]
            : (record[col.id] !== undefined && record[col.id] !== null
                ? record[col.id]
                : (record.customFields?.[col.fieldKey] !== undefined ? record.customFields[col.fieldKey] : record.customFields?.[col.id])
              );

          const cellValStr = getValString(rawCellVal).trim();
          const isEmpty = !cellValStr || cellValStr === 'undefined' || cellValStr === 'null';

          return (
            <td key={col.id} style={{ padding: '6px 12px', fontSize: '11.5px', color: '#334155', borderBottom: '1px solid #e2e8f0' }}>
              {isEmpty ? (
                <span style={{ color: '#94a3b8', fontWeight: '600' }}>—</span>
              ) : (
                <SchemaFieldRenderer
                  field={fieldDef || { id: col.fieldKey || col.id, label: col.label, type: 'text' }}
                  value={rawCellVal}
                  mode="view"
                  compact={true}
                  moduleConfig={moduleConfig}
                  systemDropdowns={systemDropdowns}
                />
              )}
            </td>
          );
        })}

        {isArchivedView && canManage && (
          <td style={{ padding: '6px 12px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', width: '220px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
              <button
                type="button"
                title="Restore Record"
                onClick={(e) => {
                  e.stopPropagation();
                  if (typeof handleRestoreBinItem === 'function') {
                    handleRestoreBinItem(record._vaultRawItem || record);
                  }
                }}
                style={{ padding: '3px 8px', fontSize: '10.5px', borderRadius: '5px', border: '1px solid #cbd5e1', background: '#0d9488', color: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '700' }}
              >
                <RotateCcw size={12} /> Restore
              </button>
              <button
                type="button"
                title="Permanent Delete"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Permanently delete "${recordName}"? This action cannot be undone.`)) {
                    if (typeof softDeleteRecord === 'function') {
                      softDeleteRecord(record.recycleBinId || record.id);
                    }
                  }
                }}
                style={{ padding: '3px 8px', fontSize: '10.5px', borderRadius: '5px', border: '1px solid #fecdd3', background: '#fff1f2', color: '#e11d48', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '700' }}
              >
                <Trash2 size={12} /> Permanent Delete
              </button>
            </div>
          </td>
        )}
      </tr>
    );
  };

  const renderMobileCard = (record, idx) => {
    if (!record) return null;
    const isSelected = (selectedIds || []).includes(record.id);
    let recordName = getValString(
      record.name || record.fullName || record.employeeName || record.candidateName || record.customerName || record.title,
      ''
    );
    if (!recordName || recordName === 'Employee Directory' || recordName === 'Candidate' || recordName === 'Customer') {
      if (record.email) {
        const parts = getValString(record.email).split('@');
        if (parts[0]) {
          recordName = parts[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        }
      } else if (record.phone) {
        recordName = getValString(record.phone);
      }
    }
    if (!recordName) {
      recordName = LabelEngine.getEntityName(moduleConfig) || 'Record';
    }

    const recordStatus = getValString(record.status || record.stage || record.pipeline_stage || record.disposition);
    const displayId = record.displayId || record.tag || formatCandidateId(record.id, idx, moduleConfig);
    const avatarGradient = getAvatarGradient(recordName, isArchivedView);
    const phoneStr = getValString(record.phone || record.phoneNumber || record.customerPhone);
    const emailStr = getValString(record.email);
    const durationStr = getValString(record.duration);
    const callTypeStr = getValString(record.type || record.callType || record.direction);
    const audioSrc = record.recording || record.recordingUrl || record.audio || record.audioUrl;
    const createdAtVal = record._createdAt || record.createdAt || record.timestamp;
    const dateFormatted = createdAtVal ? formatDate(createdAtVal) : '';
    const agentName = getValString(record.agentName || record.assignedTo || record.owner || record.agent);
    const notesStr = getValString(record.notes || record.note || record.description);

    const isIncoming = callTypeStr.toUpperCase().includes('INCOMING');
    const isOutgoing = callTypeStr.toUpperCase().includes('OUTGOING');
    const isMissed = callTypeStr.toUpperCase().includes('MISSED') || callTypeStr.toUpperCase().includes('REJECTED');

    return (
      <div
        key={record.id || idx}
        className="mobile-record-card"
        onClick={() => onViewRecord(record)}
        style={{
          background: isSelected ? '#f0fdf4' : '#ffffff',
          border: isSelected ? '1.5px solid #0d9488' : '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '9px',
          cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}
      >
        {/* Top Header: Checkbox + Avatar + Title + Status / Call Type */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
            <input
              type="checkbox"
              checked={isSelected}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                e.stopPropagation();
                handleSelectRow(record.id);
              }}
              style={{ accentColor: isArchivedView ? '#f59e0b' : '#0d9488', width: '16px', height: '16px', flexShrink: 0, cursor: 'pointer' }}
            />
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: avatarGradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: '800',
                fontSize: '13px',
                flexShrink: 0
              }}
            >
              {(recordName[0] || 'C').toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: '700', fontSize: '13.5px', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {recordName}
              </div>
              <div style={{ fontSize: '10.5px', color: isArchivedView ? '#b45309' : '#0d9488', fontFamily: 'monospace', fontWeight: '700' }}>
                ID: {displayId}
              </div>
            </div>
          </div>

          {/* Status & Call Direction Badges */}
          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
            {callTypeStr ? (
              <span style={{
                padding: '2px 7px',
                borderRadius: '6px',
                fontSize: '10px',
                fontWeight: '700',
                textTransform: 'uppercase',
                background: isIncoming ? 'rgba(16,185,129,0.12)' : (isOutgoing ? 'rgba(59,130,246,0.12)' : 'rgba(239,68,68,0.12)'),
                color: isIncoming ? '#059669' : (isOutgoing ? '#2563eb' : '#dc2626')
              }}>
                {isIncoming ? '↙ In' : (isOutgoing ? '↗ Out' : '✕ Missed')} {durationStr && `• ${durationStr}`}
              </span>
            ) : null}
            {recordStatus && (
              <span style={{
                padding: '2px 7px',
                borderRadius: '6px',
                fontSize: '10.5px',
                fontWeight: '700',
                background: 'rgba(13,148,136,0.1)',
                color: '#0d9488',
                border: '1px solid rgba(13,148,136,0.2)'
              }}>
                {recordStatus}
              </span>
            )}
          </div>
        </div>

        {/* Middle: Phone & Quick Actions Bar OR Email & Source Display */}
        {(() => {
          const cleanPhoneDigits = (phoneStr || '').replace(/\D/g, '');
          const hasValidPhone = cleanPhoneDigits.length >= 7;
          const sourceStr = getValString(record.source || record.lead_source || record.leadSource);

          if (hasValidPhone) {
            return (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#f8fafc',
                padding: '6px 10px',
                borderRadius: '8px',
                border: '1px solid #f1f5f9'
              }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>📞</span> {phoneStr}
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    title="Quick Call Lead"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.openGlobalDialer) {
                        window.openGlobalDialer(phoneStr, recordName, true);
                      }
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      background: '#10b981',
                      color: '#ffffff',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: '700',
                      boxShadow: '0 1px 3px rgba(16,185,129,0.3)'
                    }}
                  >
                    📞 Call
                  </button>
                  <a
                    href={`https://wa.me/${cleanPhoneDigits}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    title="Chat on WhatsApp"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      background: '#25D366',
                      color: '#ffffff',
                      textDecoration: 'none',
                      fontSize: '11px',
                      fontWeight: '700',
                      boxShadow: '0 1px 3px rgba(37,211,102,0.3)'
                    }}
                  >
                    💬 WA
                  </a>
                </div>
              </div>
            );
          }

          // Fallback when no valid phone number: Show email and source badge cleanly without dead Call buttons
          return (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '6px',
              flexWrap: 'wrap',
              background: '#f8fafc',
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid #f1f5f9'
            }}>
              <span style={{ fontSize: '11.5px', color: '#475569', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {emailStr && emailStr !== '—' ? `📧 ${emailStr}` : <span style={{ color: '#94a3b8' }}>No phone number</span>}
              </span>
              {sourceStr && sourceStr !== '—' && (
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '10.5px',
                  fontWeight: '700',
                  background: sourceStr.toLowerCase().includes('whatsapp') ? 'rgba(234,179,8,0.12)' : 'rgba(16,185,129,0.12)',
                  color: sourceStr.toLowerCase().includes('whatsapp') ? '#b45309' : '#059669',
                  border: sourceStr.toLowerCase().includes('whatsapp') ? '1px solid rgba(234,179,8,0.25)' : '1px solid rgba(16,185,129,0.25)'
                }}>
                  {sourceStr}
                </span>
              )}
            </div>
          );
        })()}

        {/* Audio Recording Player on Mobile */}
        {audioSrc && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'rgba(13,148,136,0.06)',
              border: '1px solid rgba(13,148,136,0.2)',
              borderRadius: '8px',
              padding: '6px 8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#0d9488', flexShrink: 0 }}>
              🎙️ Audio
            </span>
            <audio
              controls
              preload="none"
              src={audioSrc}
              style={{ height: '30px', flex: 1, minWidth: 0 }}
            />
            <a
              href={audioSrc}
              download="call_recording.mp4"
              title="Download Audio"
              style={{
                padding: '4px 7px',
                borderRadius: '5px',
                background: '#0d9488',
                color: '#ffffff',
                fontSize: '10px',
                textDecoration: 'none',
                fontWeight: '700',
                flexShrink: 0
              }}
            >
              ⬇️
            </a>
          </div>
        )}

        {/* Bottom Footer: Agent / Notes + Date + Action Buttons */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '10.5px',
          color: '#64748b',
          borderTop: '1px dashed #e2e8f0',
          paddingTop: '6px',
          gap: '8px'
        }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
            {agentName ? `👤 ${agentName}` : (notesStr ? `📝 ${notesStr}` : (dateFormatted || ''))}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            {dateFormatted && !agentName && !notesStr ? null : <span>{dateFormatted}</span>}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onViewRecord(record);
              }}
              style={{
                padding: '2px 6px',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0d9488',
                fontSize: '10.5px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              View
            </button>
            {canManage && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isArchivedView) {
                    if (window.confirm(`Permanently delete "${recordName}"?`)) {
                      if (typeof softDeleteRecord === 'function') softDeleteRecord(record.recycleBinId || record.id);
                    }
                  } else {
                    if (typeof softDeleteRecord === 'function') softDeleteRecord(record);
                  }
                }}
                style={{
                  padding: '2px 6px',
                  borderRadius: '4px',
                  border: '1px solid #fecdd3',
                  background: '#fff1f2',
                  color: '#dc2626',
                  fontSize: '10.5px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                {isArchivedView ? 'Delete' : 'Archive'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
      <style>{`
        .list-table-scroll::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
        .list-table-scroll {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
        .ems-row-hover:hover {
          background: rgba(13, 148, 136, 0.05) !important;
        }
        .th-sort-hover {
          position: relative;
        }
        .th-sort-hover:hover {
          background: #f1f5f9 !important;
        }
        .col-resizer-handle {
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          width: 7px;
          cursor: col-resize;
          user-select: none;
          z-index: 30;
          transition: background 0.15s ease;
        }
        .col-resizer-handle:hover,
        .col-resizer-handle:active {
          background: #0d9488 !important;
        }
      `}</style>

      {/* UNIVERSAL BULK ACTION ENGINE */}
      <BulkActionEngine
        selectedIds={selectedIds}
        setSelectedIds={setSelectedIds}
        visibleRecords={paginatedRecords}
        records={records}
        setRecords={setRecords}
        moduleConfig={moduleConfig}
        softDeleteRecord={softDeleteRecord}
        handleRestoreBinItem={handleRestoreBinItem}
        showToast={showToast}
        canManage={canManage}
        isArchivedView={isArchivedView}
        onOpenExportModal={onOpenExportModal}
      />

      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* TABLE HEADER STRIP (CLEAN ENTERPRISE NOISE-FREE HEADER) */}
        {isArchivedView && (
          <div style={{ padding: '10px 18px', background: '#fffbeb', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <span style={{ fontSize: '11px', color: '#b45309', fontWeight: '600' }}>
              Archived records management center • Permanent delete permitted only here
            </span>
          </div>
        )}

        {/* 1. DESKTOP TABLE VIEW (ACTIVE ON SCREENS > 768px) */}
        <div className="desktop-table-view">
          <div
            className="list-table-scroll"
            ref={scrollRef}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeaveOrUp}
            onMouseUp={handleMouseLeaveOrUp}
            onMouseMove={handleMouseMoveDrag}
            style={{
              overflowX: 'auto',
              overflowY: 'auto',
              maxHeight: 'calc(100vh - 145px)',
              position: 'relative',
              cursor: isDragScrolling ? 'grabbing' : 'grab',
              userSelect: isDragScrolling ? 'none' : 'auto'
            }}
          >
            <table className="std-table" style={{ width: '100%', minWidth: '1100px', borderCollapse: 'collapse', borderSpacing: 0 }}>
              <thead
                ref={theadRef}
                style={{ position: 'sticky', top: 0, zIndex: 20, background: '#f8fafc', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', cursor: 'ew-resize' }}
              >
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                  <th style={{ padding: '8px 10px', width: '38px', minWidth: '38px', maxWidth: '38px', textAlign: 'center', background: '#f8fafc', position: 'sticky', top: 0, zIndex: 20 }}>
                    <input
                      type="checkbox"
                      checked={Boolean(isAllPaginatedSelected)}
                      onChange={handleSelectAll}
                      style={{ accentColor: isArchivedView ? '#f59e0b' : '#0d9488', cursor: 'pointer', width: '15px', height: '15px' }}
                    />
                  </th>
                  {/* DEDICATED COMPACT ID COLUMN HEADER */}
                  <th
                    style={{
                      padding: '8px 12px',
                      width: '95px',
                      minWidth: '95px',
                      maxWidth: '95px',
                      textAlign: 'left',
                      fontSize: '11px',
                      fontWeight: '800',
                      color: '#475569',
                      textTransform: 'uppercase',
                      background: '#f8fafc',
                      position: 'sticky',
                      top: 0,
                      zIndex: 20,
                      userSelect: 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    ID
                  </th>
                  {visibleCols.map((col) => {
                    const resolvedWidth = getColWidth(col);
                    const widthStyle = { width: `${resolvedWidth}px`, minWidth: `${resolvedWidth}px`, maxWidth: `${resolvedWidth}px` };
                    const alignStyle = col.align ? { textAlign: col.align } : {};
                    const targetSortKey = col.fieldKey || col.id;
                    const isSorted = sortKey === targetSortKey;

                    return (
                      <th
                        key={col.id}
                        className="th-sort-hover"
                        onClick={() => {
                          if (isSorted) {
                            onSortChange(targetSortKey, sortDir === 'asc' ? 'desc' : 'asc');
                          } else {
                            onSortChange(targetSortKey, 'asc');
                          }
                        }}
                        style={{
                          padding: '8px 12px',
                          fontSize: '11px',
                          fontWeight: '800',
                          color: isSorted ? '#0d9488' : '#475569',
                          textTransform: 'uppercase',
                          background: isSorted ? 'rgba(13,148,136,0.06)' : '#f8fafc',
                          cursor: 'pointer',
                          userSelect: 'none',
                          position: 'sticky',
                          top: 0,
                          zIndex: 20,
                          transition: 'background 0.15s ease',
                          boxSizing: 'border-box',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          ...widthStyle,
                          ...alignStyle
                        }}
                      >
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', width: '100%', overflow: 'hidden' }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {LabelEngine.translateFieldLabel ? LabelEngine.translateFieldLabel(fieldsMap.get(col.fieldKey)?.label || fieldsMap.get(col.id)?.label || col.label) : (fieldsMap.get(col.fieldKey)?.label || fieldsMap.get(col.id)?.label || col.label)}
                          </span>
                          {isSorted ? (
                            sortDir === 'asc' ? <ArrowUp size={13} color="#0d9488" style={{ flexShrink: 0 }} /> : <ArrowDown size={13} color="#0d9488" style={{ flexShrink: 0 }} />
                          ) : (
                            <ArrowUpDown size={12} style={{ opacity: 0.3, flexShrink: 0 }} />
                          )}
                        </div>

                        {/* INTERACTIVE COLUMN DRAG RESIZER HANDLE */}
                        <div
                          className="col-resizer-handle"
                          onMouseDown={(e) => handleResizeMouseDown(e, col.id)}
                          onClick={(e) => e.stopPropagation()}
                          title="Drag left/right to resize column"
                        />
                      </th>
                    );
                  })}
                  {isArchivedView && canManage && (
                    <th style={{ padding: '8px 12px', fontSize: '11px', fontWeight: '800', color: '#b45309', textTransform: 'uppercase', textAlign: 'right', width: '220px', background: '#fffbeb', position: 'sticky', top: 0, zIndex: 20 }}>
                      Archived Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.filter(r => !!r).length === 0 ? (
                  <tr>
                    <td colSpan={visibleCols.length + 2 + (isArchivedView && canManage ? 1 : 0)} style={{ padding: '32px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>
                      <EmptyState
                        icon="📦"
                        title={emptyTitle}
                        description={emptyDesc}
                      />
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.filter(r => !!r).map((record, idx) => renderRow(record, idx))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. MOBILE CARDS VIEW (ACTIVE ON PHONE SCREENS <= 768px) */}
        <div className="mobile-cards-view">
          {paginatedRecords.filter(r => !!r).length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center' }}>
              <EmptyState
                icon="📦"
                title={emptyTitle}
                description={emptyDesc}
              />
            </div>
          ) : (
            <>
              {paginatedRecords.filter(r => !!r).map((record, idx) => renderMobileCard(record, idx))}

              {/* Mobile Bottom Pagination Controls */}
              {safeRecords.length > pageSize && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  background: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  marginTop: '6px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                }}>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>
                    Page {validCurrentPage} of {totalPages} <span style={{ fontWeight: '500', color: '#94a3b8' }}>({safeRecords.length})</span>
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      disabled={validCurrentPage <= 1}
                      onClick={() => onPageChange(validCurrentPage - 1)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        background: validCurrentPage <= 1 ? '#f8fafc' : '#ffffff',
                        color: validCurrentPage <= 1 ? '#cbd5e1' : '#0d9488',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: validCurrentPage <= 1 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      ← Prev
                    </button>
                    <button
                      type="button"
                      disabled={validCurrentPage >= totalPages}
                      onClick={() => onPageChange(validCurrentPage + 1)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        background: validCurrentPage >= totalPages ? '#f8fafc' : '#ffffff',
                        color: validCurrentPage >= totalPages ? '#cbd5e1' : '#0d9488',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: validCurrentPage >= totalPages ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
