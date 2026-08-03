/**
 * UNIVERSAL LIST ENGINE COMPONENT (SchemaDataTable)
 * Enterprise CRM Scroll Architecture with Sticky <thead>, Sticky Bottom <Pagination>, & Thin Themed Scrollbars
 */

import React, { useState, useRef } from 'react';
import { Eye, Edit2, Archive, ArrowUp, ArrowDown, ArrowUpDown, RotateCcw, Trash2 } from 'lucide-react';
import SchemaFieldRenderer from '../FieldEngine/SchemaFieldRenderer';
import { LabelEngine } from '../LabelEngine';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import EmptyState from '../../../components/ui/EmptyState';
import BulkActionEngine from '../BulkActionEngine/BulkActionEngine';
import Pagination from './Pagination';
import { formatCandidateId } from '../../../services/atsStorageService';
import { GroupEngine, GroupEngineContainer } from '../GroupEngine';

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

export default function ListEngine({
  records = [],
  setRecords = () => {},
  moduleConfig = {},
  totalCount = 0,
  isFilterActive = false,
  searchQuery = '',
  groupByFieldId = '',
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
  activePipelineStages = []
}) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const scrollRef = useRef(null);

  const handleWheelScroll = (e) => {
    if (scrollRef.current && e.deltaY !== 0 && !e.shiftKey) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      if (scrollWidth > clientWidth) {
        scrollRef.current.scrollLeft += e.deltaY;
      }
    }
  };

  // Filter out columns hidden via metadata
  const visibleCols = (moduleConfig.columns || [])
    .filter(c => c.visible !== false)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  const fieldsMap = new Map((moduleConfig.fields || []).map(f => [f.id, f]));

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
    const recordName = getValString(record.name || record.title, LabelEngine.getEntityName(moduleConfig));
    const recordStatus = getValString(record.status || record.stage);
    const displayId = formatCandidateId(record.id, idx, moduleConfig);

    return (
      <tr
        key={record.id || idx}
        className="ems-row-hover"
        onClick={() => onViewRecord(record)}
        style={{
          background: isSelected ? 'rgba(13, 148, 136, 0.08)' : '#ffffff',
          cursor: 'pointer',
          transition: 'background 0.15s ease'
        }}
      >
        <td style={{ padding: '10px 14px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }} onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              handleSelectRow(record.id);
            }}
            style={{ accentColor: isArchivedView ? '#f59e0b' : '#0d9488', cursor: 'pointer' }}
          />
        </td>

        {visibleCols.map((col, colIdx) => {
          const fieldDef = fieldsMap.get(col.fieldKey) || fieldsMap.get(col.id);

          if (colIdx === 0 || col.id === 'candidate' || col.id === 'deal' || col.id === 'employee') {
            return (
              <td key={col.id} style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', maxWidth: '220px' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: isArchivedView ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #0d9488, #064e43)', color: '#ffffff', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0 }}>
                    {(recordName[0] || 'R')}
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <div
                      title={recordName}
                      style={{ fontWeight: '800', color: '#0f172a', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}
                    >
                      {recordName}
                    </div>
                    <div style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: '700', color: isArchivedView ? '#b45309' : '#0d9488' }}>ID: {displayId}</div>
                  </div>
                </div>
              </td>
            );
          }

          // Special Contact Details Column Renderer
          if (col.id === 'contact' || col.id === 'contact_details' || col.fieldKey === 'contact' || col.fieldKey === 'phone') {
            const emailStr = getValString(record.email);
            const phoneStr = getValString(record.phone);
            return (
              <td key={col.id} style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0', maxWidth: '240px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px', maxWidth: '220px', overflow: 'hidden' }}>
                  {emailStr && (
                    <div title={`Email: ${emailStr}`} style={{ color: '#0f172a', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>📧 {emailStr}</div>
                  )}
                  {phoneStr && (
                    <div title={`Phone: ${phoneStr}`} style={{ color: '#475569', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>📞 {phoneStr}</div>
                  )}
                  {!emailStr && !phoneStr && <span style={{ color: '#94a3b8' }}>—</span>}
                </div>
              </td>
            );
          }

          // Special Resume Column Renderer
          if (col.id === 'resume' || col.fieldKey === 'resume') {
            const resumeStr = getValString(record.resume || record.attachment);
            return (
              <td key={col.id} style={{ padding: '10px 14px', fontSize: '12px', borderBottom: '1px solid #e2e8f0' }}>
                {resumeStr ? (
                  <Badge variant="info" style={{ fontSize: '10px' }}>📄 {resumeStr}</Badge>
                ) : (
                  <span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: '600' }}>No Resume</span>
                )}
              </td>
            );
          }

          // Special Applied Date Column Renderer
          if (col.id === 'createdAt' || col.fieldKey === 'createdAt' || col.id === 'appliedDate') {
            const dateVal = formatDate(record.createdAt || record.appliedDate);
            return (
              <td key={col.id} style={{ padding: '10px 14px', fontSize: '11px', fontWeight: '600', color: '#475569', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                📅 {dateVal}
              </td>
            );
          }

          if (col.id === 'stage' || col.fieldKey === 'status') {
            return (
              <td key={col.id} style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0' }} onClick={(e) => e.stopPropagation()}>
                {!isArchivedView && canManage && activePipelineStages.length > 0 ? (
                  <select
                    value={recordStatus}
                    onChange={(e) => {
                      e.stopPropagation();
                      onMoveStage(record.id, e.target.value);
                    }}
                    style={{ padding: '4px 8px', fontSize: '11px', fontWeight: '700', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0d9488', cursor: 'pointer' }}
                  >
                    {activePipelineStages.map(s => (
                      <option key={s.id || s.name} value={getValString(s.name)}>
                        {getValString(s.name)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Badge variant={isArchivedView ? 'warning' : LabelEngine.getBadgeVariant(recordStatus)}>
                    {isArchivedView ? 'ARCHIVED' : (recordStatus || 'Active')}
                  </Badge>
                )}
              </td>
            );
          }

          const cellVal = (col.fieldKey && record[col.fieldKey] !== undefined && record[col.fieldKey] !== null)
            ? record[col.fieldKey]
            : (record[col.id] !== undefined && record[col.id] !== null
                ? record[col.id]
                : (record.customFields?.[col.fieldKey] !== undefined ? record.customFields[col.fieldKey] : record.customFields?.[col.id])
              );

          return (
            <td key={col.id} style={{ padding: '10px 14px', fontSize: '12px', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>
              <SchemaFieldRenderer
                field={fieldDef || { id: col.fieldKey || col.id, label: col.label, type: 'text' }}
                value={cellVal}
                mode="view"
                compact={true}
                moduleConfig={moduleConfig}
                systemDropdowns={systemDropdowns}
              />
            </td>
          );
        })}

        {isArchivedView && canManage && (
          <td style={{ padding: '10px 14px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', width: '220px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
              <button
                type="button"
                title="Restore Record"
                onClick={(e) => {
                  e.stopPropagation();
                  if (typeof handleRestoreBinItem === 'function') {
                    handleRestoreBinItem(record.recycleBinId || record.id);
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
          height: 10px !important;
          width: 8px !important;
          display: block !important;
        }
        .list-table-scroll::-webkit-scrollbar-track {
          background: #e2e8f0 !important;
          border-radius: 5px !important;
        }
        .list-table-scroll::-webkit-scrollbar-thumb {
          background: #0d9488 !important;
          border-radius: 5px !important;
          border: 2px solid #ffffff !important;
        }
        .list-table-scroll::-webkit-scrollbar-thumb:hover {
          background: #064e43 !important;
        }
        .ems-row-hover:hover {
          background: rgba(13, 148, 136, 0.04) !important;
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
      />

      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* TABLE HEADER STRIP */}
        <div style={{ padding: '12px 16px', background: isArchivedView ? '#fffbeb' : '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', flexShrink: 0 }}>
          <span style={{ fontSize: '11px', fontWeight: '800', color: isArchivedView ? '#b45309' : '#475569', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {isArchivedView ? '📦 ARCHIVE VIEW:' : ''} {LabelEngine.getEntityNamePlural(moduleConfig)} Roster ({records.length})
          </span>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
            {isArchivedView ? 'Archived records management center • Permanent delete permitted only here' : 'Click column headers to sort • Click row to view profile'}
          </span>
        </div>

        {/* SCROLLABLE TABLE AREA WITH STICKY HEADER */}
        <div
          className="list-table-scroll"
          ref={scrollRef}
          onWheel={handleWheelScroll}
          style={{
            overflowX: 'auto',
            overflowY: 'auto',
            maxHeight: '620px',
            position: 'relative',
            scrollbarWidth: 'thin',
            scrollbarColor: '#0d9488 #e2e8f0'
          }}
        >
          <table className="std-table" style={{ width: '100%', minWidth: '1100px', borderCollapse: 'collapse', borderSpacing: 0 }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f8fafc', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                <th style={{ padding: '12px 16px', width: '40px', textAlign: 'center', background: '#f8fafc' }}>
                  <input
                    type="checkbox"
                    checked={paginatedRecords.length > 0 && selectedIds.length === paginatedRecords.length}
                    onChange={handleSelectAll}
                    style={{ accentColor: isArchivedView ? '#f59e0b' : '#0d9488', cursor: 'pointer' }}
                  />
                </th>
                {visibleCols.map((col) => {
                  const widthStyle = col.width ? { width: col.width, minWidth: col.width }
                                  : col.id === 'candidate' || col.id === 'name' ? { minWidth: '220px' }
                                  : col.id === 'position' ? { minWidth: '160px' }
                                  : col.id === 'contact' || col.id === 'contact_details' ? { minWidth: '200px' }
                                  : col.id === 'resume' ? { width: '120px', minWidth: '120px' }
                                  : col.id === 'createdAt' || col.id === 'appliedDate' ? { width: '160px', minWidth: '160px' }
                                  : { minWidth: '140px' };
                  const alignStyle = col.align ? { textAlign: col.align } : {};
                  const targetSortKey = col.fieldKey || col.id;
                  const isSorted = sortKey === targetSortKey;

                  return (
                    <th
                      key={col.id}
                      onClick={() => {
                        if (isSorted) {
                          onSortChange(targetSortKey, sortDir === 'asc' ? 'desc' : 'asc');
                        } else {
                          onSortChange(targetSortKey, 'asc');
                        }
                      }}
                      style={{
                        padding: '12px 16px',
                        fontSize: '11px',
                        fontWeight: '800',
                        color: isSorted ? '#0d9488' : '#475569',
                        textTransform: 'uppercase',
                        background: '#f8fafc',
                        cursor: 'pointer',
                        userSelect: 'none',
                        ...widthStyle,
                        ...alignStyle
                      }}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span>{fieldsMap.get(col.fieldKey)?.label || fieldsMap.get(col.id)?.label || col.label}</span>
                        {isSorted ? (
                          sortDir === 'asc' ? <ArrowUp size={12} color="#0d9488" /> : <ArrowDown size={12} color="#0d9488" />
                        ) : (
                          <ArrowUpDown size={11} style={{ opacity: 0.3 }} />
                        )}
                      </div>
                    </th>
                  );
                })}
                {isArchivedView && canManage && (
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '800', color: '#b45309', textTransform: 'uppercase', textAlign: 'right', width: '220px', background: '#fffbeb' }}>
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
                      title={emptyText.title}
                      description={emptyText.description}
                    />
                  </td>
                </tr>
              ) : groupByFieldId ? (
                <GroupEngineContainer
                  groupedData={GroupEngine.groupRecords(paginatedRecords, groupByFieldId, moduleConfig)}
                  groupByFieldId={groupByFieldId}
                  moduleConfig={moduleConfig}
                  renderGroupRows={(groupRecords) => groupRecords.map((record, idx) => renderRow(record, idx))}
                  selectedIds={selectedIds}
                  onSelectGroup={(grpRecordIds, shouldSelect) => {
                    setSelectedIds(prev =>
                      shouldSelect
                        ? Array.from(new Set([...prev, ...grpRecordIds]))
                        : prev.filter(id => !grpRecordIds.includes(id))
                    );
                  }}
                  colSpanCount={visibleCols.length + (isArchivedView && canManage ? 2 : 1)}
                />
              ) : (
                paginatedRecords.map((record, idx) => renderRow(record, idx))
              )}
            </tbody>
          </table>
        </div>

        {/* STICKY BOTTOM PAGINATION */}
        <div style={{ position: 'sticky', bottom: 0, zIndex: 10, background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
          <Pagination
            currentPage={validCurrentPage}
            pageSize={pageSize}
            totalRecords={records.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>
    </div>
  );
}
