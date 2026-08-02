/**
 * UNIVERSAL LIST ENGINE COMPONENT (SchemaDataTable)
 * Enterprise CRM Scroll Architecture with Sticky <thead>, Sticky Bottom <Pagination>, & Thin Themed Scrollbars
 */

import React, { useState } from 'react';
import { Eye, Edit2, Archive } from 'lucide-react';
import SchemaFieldRenderer from '../FieldEngine/SchemaFieldRenderer';
import { LabelEngine } from '../LabelEngine';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import EmptyState from '../../../components/ui/EmptyState';
import BulkActionBar from './BulkActionBar';
import Pagination from './Pagination';
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

export default function ListEngine({
  records = [],
  moduleConfig = {},
  totalCount = 0,
  isFilterActive = false,
  searchQuery = '',
  canManage = true,
  onViewRecord = () => {},
  onEditRecord = () => {},
  onArchiveRecord = () => {},
  onMoveStage = () => {},
  onResetFilters = () => {}
}) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const fieldsMap = new Map((moduleConfig.fields || []).map(f => [f.id, f]));
  const visibleCols = (moduleConfig.columns || [])
    .filter(col => col.visible !== false)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  const totalPages = Math.ceil(records.length / pageSize) || 1;
  const paginatedRecords = records.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(paginatedRecords.map(r => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const emptyText = isFilterActive
    ? { title: 'No matching records', description: 'Try clearing your active filters or adjusting your search query.' }
    : { title: `No ${LabelEngine.getEntityNamePlural(moduleConfig)} found`, description: `Click "+ Add ${LabelEngine.getEntityName(moduleConfig)}" to create your first record.` };

  return (
    <div className="list-engine-container" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <style>{`
        .list-table-scroll::-webkit-scrollbar {
          width: 6px !important;
          height: 6px !important;
          display: block !important;
        }
        .list-table-scroll::-webkit-scrollbar-track {
          background: #f1f5f9 !important;
          border-radius: 4px !important;
        }
        .list-table-scroll::-webkit-scrollbar-thumb {
          background: #0d9488 !important;
          border-radius: 4px !important;
        }
        .list-table-scroll::-webkit-scrollbar-thumb:hover {
          background: #064e43 !important;
        }
      `}</style>

      {/* BULK ACTION BAR */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        onClearSelection={() => setSelectedIds([])}
        onBulkArchive={() => {
          if (confirm(`Archive ${selectedIds.length} selected records?`)) {
            selectedIds.forEach(id => {
              const rec = records.find(r => r.id === id);
              if (rec) onArchiveRecord(rec);
            });
            setSelectedIds([]);
          }
        }}
        canManage={canManage}
      />

      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* TABLE HEADER STRIP */}
        <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', flexShrink: 0 }}>
          <span style={{ fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>
            {LabelEngine.getEntityNamePlural(moduleConfig)} Roster ({records.length})
            {isFilterActive && <span style={{ color: '#0d9488', marginLeft: '6px' }}>(Filtered from {totalCount})</span>}
          </span>
          <span className="mobile-swipe-hint" style={{ fontSize: '11px', color: '#0d9488', fontWeight: '700' }}>
            Swipe horizontally ↔
          </span>
        </div>

        {/* ENTERPRISE SCROLL CONTAINER WITH STICKY <thead> AND MAX HEIGHT */}
        <div
          className="list-table-scroll"
          style={{
            overflowX: 'auto',
            overflowY: 'auto',
            maxHeight: 'calc(100vh - 330px)',
            width: '100%',
            position: 'relative'
          }}
        >
          <table className="std-table" style={{ width: '100%', borderCollapse: 'collapse', borderSpacing: 0 }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f8fafc', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                <th style={{ padding: '12px 16px', width: '40px', textAlign: 'center', background: '#f8fafc' }}>
                  <input
                    type="checkbox"
                    checked={paginatedRecords.length > 0 && selectedIds.length === paginatedRecords.length}
                    onChange={handleSelectAll}
                    style={{ accentColor: '#0d9488', cursor: 'pointer' }}
                  />
                </th>
                {visibleCols.map((col, idx) => {
                  const widthStyle = col.id === 'candidate' || col.id === 'name' ? { minWidth: '220px' }
                                  : col.id === 'position' ? { minWidth: '160px' }
                                  : col.id === 'contact' || col.id === 'contact_details' ? { minWidth: '200px' }
                                  : col.id === 'resume' ? { width: '120px', minWidth: '120px' }
                                  : col.id === 'createdAt' || col.id === 'appliedDate' ? { width: '160px', minWidth: '160px' }
                                  : {};
                  return (
                    <th key={col.id} style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', background: '#f8fafc', ...widthStyle }}>
                      {col.label}
                    </th>
                  );
                })}
                {canManage && (
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', textAlign: 'right', width: '160px', background: '#f8fafc' }}>
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={visibleCols.length + (canManage ? 2 : 1)} style={{ padding: '32px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>
                    <EmptyState
                      icon="📋"
                      title={emptyText.title}
                      description={emptyText.description}
                    />
                    {isFilterActive && (
                      <div style={{ marginTop: '12px' }}>
                        <Button variant="secondary" size="sm" onClick={onResetFilters}>
                          Clear filters
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((record, idx) => {
                  const isSelected = selectedIds.includes(record.id);
                  const recordName = getValString(record.name || record.title, LabelEngine.getEntityName(moduleConfig));
                  const recordStatus = getValString(record.status || record.stage);
                  const displayId = formatCandidateId(record.id, idx, moduleConfig);

                  return (
                    <tr key={record.id || idx} style={{ background: isSelected ? 'rgba(13,148,136,0.04)' : '#ffffff' }}>
                      <td style={{ padding: '10px 14px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(record.id)}
                          style={{ accentColor: '#0d9488', cursor: 'pointer' }}
                        />
                      </td>

                      {visibleCols.map((col, colIdx) => {
                        const fieldDef = fieldsMap.get(col.fieldKey) || fieldsMap.get(col.id);

                        if (colIdx === 0 || col.id === 'candidate' || col.id === 'deal' || col.id === 'employee') {
                          return (
                            <td key={col.id} style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', maxWidth: '220px' }}>
                                <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg, #0d9488, #064e43)', color: '#ffffff', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0 }}>
                                  {(recordName[0] || 'R')}
                                </div>
                                <div style={{ overflow: 'hidden' }}>
                                  <div
                                    title={recordName}
                                    onClick={() => onViewRecord(record)}
                                    style={{ fontWeight: '800', color: '#0f172a', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer', maxWidth: '180px' }}
                                  >
                                    {recordName}
                                  </div>
                                  <div style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: '700', color: '#0d9488' }}>ID: {displayId}</div>
                                </div>
                              </div>
                            </td>
                          );
                        }

                        // Special Contact Details Column Renderer (Email & Phone with single-line ellipsis & tooltips)
                        if (col.id === 'contact' || col.id === 'contact_details' || col.fieldKey === 'contact' || col.fieldKey === 'phone') {
                          const emailStr = getValString(record.email);
                          const phoneStr = getValString(record.phone);
                          return (
                            <td key={col.id} style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0', maxWidth: '240px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px', maxWidth: '220px', overflow: 'hidden' }}>
                                {emailStr && (
                                  <div
                                    title={`Email: ${emailStr}`}
                                    style={{ color: '#0f172a', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                                  >
                                    📧 {emailStr}
                                  </div>
                                )}
                                {phoneStr && (
                                  <div
                                    title={`Phone: ${phoneStr}`}
                                    style={{ color: '#475569', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                                  >
                                    📞 {phoneStr}
                                  </div>
                                )}
                                {!emailStr && !phoneStr && <span style={{ color: '#94a3b8' }}>—</span>}
                              </div>
                            </td>
                          );
                        }

                        // Special Resume Column Renderer (Shows "No Resume" in muted gray when missing)
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

                        // Special Applied Date Column Renderer (Formats raw ISO string to '01 Aug 2026, 08:20 PM')
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
                            <td key={col.id} style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0' }}>
                              {canManage && activePipelineStages.length > 0 ? (
                                <select
                                  value={recordStatus}
                                  onChange={(e) => onMoveStage(record.id, e.target.value)}
                                  style={{ padding: '4px 8px', fontSize: '11px', fontWeight: '700', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0d9488', cursor: 'pointer' }}
                                >
                                  {activePipelineStages.map(s => (
                                    <option key={s.id || s.name} value={getValString(s.name)}>
                                      {getValString(s.name)}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <Badge variant={LabelEngine.getBadgeVariant(recordStatus)}>
                                  {recordStatus || 'Active'}
                                </Badge>
                              )}
                            </td>
                          );
                        }

                        return (
                          <td key={col.id} style={{ padding: '10px 14px', fontSize: '12px', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>
                            <SchemaFieldRenderer
                              field={fieldDef || { id: col.fieldKey || col.id, label: col.label, type: 'text' }}
                              value={record[col.fieldKey] || record.customFields?.[col.fieldKey]}
                              mode="view"
                              compact={true}
                              systemDropdowns={systemDropdowns}
                            />
                          </td>
                        );
                      })}

                      {canManage && (
                        <td style={{ padding: '10px 14px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', width: '160px' }}>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', alignItems: 'center' }}>
                            <button
                              type="button"
                              title="View Profile"
                              onClick={() => onViewRecord(record)}
                              style={{ padding: '5px 8px', fontSize: '11px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0d9488', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: '700' }}
                            >
                              <Eye size={12} /> View
                            </button>
                            <button
                              type="button"
                              title="Edit Candidate"
                              onClick={() => onEditRecord(record)}
                              style={{ padding: '5px 8px', fontSize: '11px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: '700' }}
                            >
                              <Edit2 size={12} /> Edit
                            </button>
                            <button
                              type="button"
                              title="Archive Candidate"
                              onClick={() => onArchiveRecord(record)}
                              style={{ padding: '5px 8px', fontSize: '11px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: '700' }}
                            >
                              <Archive size={12} /> Archive
                            </button>
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

        {/* STICKY BOTTOM ENTERPRISE PAGINATION TOOLBAR */}
        <div style={{ position: 'sticky', bottom: 0, zIndex: 10, background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
          <Pagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalRecords={records.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </div>
    </div>
  );
}
