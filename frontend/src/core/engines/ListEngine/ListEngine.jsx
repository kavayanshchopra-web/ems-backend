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

  // Filter out columns hidden via metadata or user popover toggle
  const visibleCols = allCols
    .filter(c => c.visible !== false && !hiddenColIds.includes(c.id))
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
    if (col.id === 'candidate' || col.id === 'name' || col.id === 'employee') return 240;
    if (col.id === 'contact' || col.id === 'contact_details' || col.id === 'email') return 200;
    if (col.id === 'position' || col.id === 'department' || col.id === 'role') return 140;
    if (col.id === 'salary') return 130;
    if (col.id === 'status') return 130;
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

  const totalPages = Math.ceil(records.length / pageSize) || 1;
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIdx = (validCurrentPage - 1) * pageSize;
  const paginatedRecords = records.slice(startIdx, startIdx + pageSize);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(paginatedRecords.map(r => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelectRow = (recId) => {
    setSelectedIds(prev =>
      prev.includes(recId) ? prev.filter(id => id !== recId) : [...prev, recId]
    );
  };
  const handleSelectRow = handleToggleSelectRow;

  const renderRow = (record, idx) => {
    const isSelected = selectedIds.includes(record.id);
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

    const recordStatus = getValString(record.status || record.stage);
    const displayId = record.tag || formatCandidateId(record.id, idx, moduleConfig);
    const recordSub = getValString(record.department || record.designation || record.position || record.appliedFor, '');
    const avatarGradient = getAvatarGradient(recordName, isArchivedView);

    return (
      <tr
        key={record.id || idx}
        className="ems-row-hover"
        onClick={() => onViewRecord(record)}
        style={{
          background: isSelected ? 'rgba(13, 148, 136, 0.12)' : '#ffffff',
          cursor: 'pointer',
          transition: 'background 0.15s ease-in-out'
        }}
      >
        {/* CHECKBOX CELL WITH ENHANCED SPACING */}
        <td style={{ padding: '12px 18px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }} onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              handleSelectRow(record.id);
            }}
            style={{ accentColor: isArchivedView ? '#f59e0b' : '#0d9488', cursor: 'pointer', width: '16px', height: '16px' }}
          />
        </td>

        {visibleCols.map((col, colIdx) => {
          const fieldDef = fieldsMap.get(col.fieldKey) || fieldsMap.get(col.id);

          {/* ASSET TAG ID COLUMN SPECIFIC OVERRIDE */}
          if (col.id === 'tag' || col.fieldKey === 'tag') {
            const tagVal = getValString(record.tag || record.id || displayId);
            return (
              <td key={col.id} style={{ padding: '12px 18px', borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11.5px', fontFamily: 'monospace', fontWeight: '800', padding: '4px 10px', borderRadius: '6px', background: 'rgba(13, 148, 136, 0.1)', color: '#0d9488', border: '1px solid rgba(13, 148, 136, 0.2)', display: 'inline-block' }}>
                  🏷️ {tagVal}
                </span>
              </td>
            );
          }

          {/* PRIMARY IDENTITY COLUMN (AVATAR + NAME + ID ONLY) */}
          if (colIdx === 0 || col.id === 'candidate' || col.id === 'deal' || col.id === 'employee' || col.id === 'name') {
            return (
              <td key={col.id} style={{ padding: '12px 18px', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', maxWidth: '260px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: isArchivedView ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'linear-gradient(135deg, #0d9488 0%, #064e43 100%)',
                      color: '#ffffff',
                      fontWeight: '800',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      fontSize: '14px',
                      lineHeight: '38px',
                      padding: 0,
                      margin: 0,
                      flexShrink: 0,
                      boxShadow: '0 2px 5px rgba(0,0,0,0.12)',
                      userSelect: 'none'
                    }}
                  >
                    {(recordName[0] || 'R').toUpperCase()}
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                      <div
                        title={recordName}
                        style={{ fontWeight: '800', color: '#0f172a', fontSize: '13.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '170px' }}
                      >
                        {recordName}
                      </div>
                      {(record.isDuplicate || record.isCopy || String(record.id).includes('_copy_') || recordName.includes('(Copy')) && (
                        <span style={{ fontSize: '9.5px', padding: '1px 6px', borderRadius: '4px', background: '#dbeafe', color: '#1d4ed8', fontWeight: '800', border: '1px solid #bfdbfe', textTransform: 'uppercase', letterSpacing: '0.3px', flexShrink: 0 }}>
                          📋 COPY
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: '700', color: isArchivedView ? '#b45309' : '#0d9488', marginTop: '1px' }}>
                      ID: {displayId}
                    </div>
                  </div>
                </div>
              </td>
            );
          }

          {/* CONTACT DETAILS COLUMN */}
          if (col.id === 'contact' || col.id === 'contact_details' || col.fieldKey === 'contact' || col.fieldKey === 'phone') {
            const emailStr = getValString(record.email);
            const phoneStr = getValString(record.phone);
            return (
              <td key={col.id} style={{ padding: '12px 18px', borderBottom: '1px solid #e2e8f0', maxWidth: '240px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11.5px', maxWidth: '220px', overflow: 'hidden' }}>
                  {emailStr && (
                    <div title={`Email: ${emailStr}`} style={{ color: '#0f172a', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>📧 {emailStr}</div>
                  )}
                  {phoneStr && (
                    <div title={`Phone: ${phoneStr}`} style={{ color: '#475569', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>📞 {phoneStr}</div>
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
              <td key={col.id} style={{ padding: '12px 18px', fontSize: '12px', borderBottom: '1px solid #e2e8f0' }}>
                {resumeStr ? (
                  <Badge variant="info" style={{ fontSize: '10.5px', padding: '3px 8px' }}>📄 {resumeStr}</Badge>
                ) : (
                  <span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: '600' }}>—</span>
                )}
              </td>
            );
          }

          {/* CREATED AT / APPLIED DATE COLUMN */}
          if (col.id === 'createdAt' || col.fieldKey === 'createdAt' || col.id === 'appliedDate') {
            const dateVal = formatDate(record.createdAt || record.appliedDate);
            return (
              <td key={col.id} style={{ padding: '12px 18px', fontSize: '11.5px', fontWeight: '600', color: '#475569', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                📅 {dateVal}
              </td>
            );
          }

          {/* STATUS / STAGE COLUMN WITH STANDARDIZED BADGES */}
          if (col.id === 'stage' || col.fieldKey === 'status') {
            const normalizedBadgeVariant = isArchivedView ? 'warning' : LabelEngine.getBadgeVariant(recordStatus);
            return (
              <td key={col.id} style={{ padding: '12px 18px', borderBottom: '1px solid #e2e8f0' }} onClick={(e) => e.stopPropagation()}>
                {!isArchivedView && canManage && activePipelineStages.length > 0 ? (
                  <select
                    value={recordStatus}
                    onChange={(e) => {
                      e.stopPropagation();
                      onMoveStage(record.id, e.target.value);
                    }}
                    style={{ padding: '5px 10px', fontSize: '11.5px', fontWeight: '700', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0d9488', cursor: 'pointer' }}
                  >
                    {activePipelineStages.map(s => (
                      <option key={s.id || s.name} value={getValString(s.name)}>
                        {getValString(s.name)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Badge variant={normalizedBadgeVariant} style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '12px', fontWeight: '700' }}>
                    {isArchivedView ? 'ARCHIVED' : (recordStatus ? recordStatus.toUpperCase() : 'ACTIVE')}
                  </Badge>
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
            <td key={col.id} style={{ padding: '12px 18px', fontSize: '12px', color: '#334155', borderBottom: '1px solid #e2e8f0' }}>
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
          <td style={{ padding: '12px 18px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', width: '220px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
              <button
                type="button"
                title="Restore Record"
                onClick={(e) => {
                  e.stopPropagation();
                  if (typeof handleRestoreBinItem === 'function') {
                    handleRestoreBinItem(record);
                  }
                }}
                style={{ padding: '5px 10px', fontSize: '11px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#0d9488', color: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '700' }}
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
                style={{ padding: '5px 10px', fontSize: '11px', borderRadius: '6px', border: '1px solid #fecdd3', background: '#fff1f2', color: '#e11d48', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '700' }}
              >
                <Trash2 size={12} /> Permanent Delete
              </button>
            </div>
          </td>
        )}
      </tr>
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

        {/* SCROLLABLE TABLE AREA WITH STICKY HEADER */}
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
                <th style={{ padding: '12px 18px', width: '40px', textAlign: 'center', background: '#f8fafc', position: 'sticky', top: 0, zIndex: 20 }}>
                  <input
                    type="checkbox"
                    checked={paginatedRecords.length > 0 && selectedIds.length === paginatedRecords.length}
                    onChange={handleSelectAll}
                    style={{ accentColor: isArchivedView ? '#f59e0b' : '#0d9488', cursor: 'pointer', width: '16px', height: '16px' }}
                  />
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
                        padding: '12px 14px',
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
                  <th style={{ padding: '12px 18px', fontSize: '11px', fontWeight: '800', color: '#b45309', textTransform: 'uppercase', textAlign: 'right', width: '220px', background: '#fffbeb', position: 'sticky', top: 0, zIndex: 20 }}>
                    Archived Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={visibleCols.length + (isArchivedView && canManage ? 2 : 1)} style={{ padding: '32px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>
                    <EmptyState
                      icon="📦"
                      title={emptyTitle}
                      description={emptyDesc}
                    />
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((record, idx) => renderRow(record, idx))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
