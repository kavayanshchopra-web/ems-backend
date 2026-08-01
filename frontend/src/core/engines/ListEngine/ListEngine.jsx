/**
 * UNIVERSAL LIST ENGINE COMPONENT (SchemaDataTable)
 * 100% Schema-Driven Enterprise Data Table for Any EMS Module
 */

import React, { useState } from 'react';
import { Eye, Edit2, Archive, FileText } from 'lucide-react';
import SchemaFieldRenderer from '../FieldEngine/SchemaFieldRenderer';
import { LabelEngine } from '../LabelEngine';
import Button from '../../ui/Button';
import Badge from '../../ui/Badge';
import EmptyState from '../../ui/EmptyState';
import BulkActionBar from './BulkActionBar';
import Pagination from './Pagination';

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
  onResetFilters = () => {},
  systemDropdowns = null,
  activePipelineStages = []
}) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const visibleCols = (moduleConfig.columns || []).filter(c => c.visible);
  const fieldsMap = new Map((moduleConfig.fields || []).map(f => [f.id, f]));

  // Pagination Slice
  const startIdx = (currentPage - 1) * pageSize;
  const paginatedRecords = records.slice(startIdx, startIdx + pageSize);

  // Row Selection Handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(paginatedRecords.map(r => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const emptyText = LabelEngine.getEmptyStateText(moduleConfig, isFilterActive, searchQuery);

  return (
    <div className="list-engine-shell" style={{ width: '100%' }}>
      {/* BULK ACTION BAR */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        onClearSelection={() => setSelectedIds([])}
        onBulkArchive={() => {
          if (window.confirm(`Archive ${selectedIds.length} selected items?`)) {
            selectedIds.forEach(id => {
              const rec = records.find(r => r.id === id);
              if (rec) onArchiveRecord(rec);
            });
            setSelectedIds([]);
          }
        }}
        canManage={canManage}
      />

      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {/* TABLE HEADER STRIP */}
        <div style={{ padding: '10px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>
            {LabelEngine.getEntityNamePlural(moduleConfig)} Roster ({records.length})
            {isFilterActive && <span style={{ color: '#0d9488', marginLeft: '6px' }}>(Filtered from {totalCount})</span>}
          </span>
          <span className="mobile-swipe-hint" style={{ fontSize: '11px', color: '#0d9488', fontWeight: '700' }}>
            Swipe horizontally ↔
          </span>
        </div>

        {/* RESPONSIVE TABLE CONTAINER */}
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table className="std-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '10px 14px', width: '40px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={paginatedRecords.length > 0 && selectedIds.length === paginatedRecords.length}
                    onChange={handleSelectAll}
                    style={{ accentColor: '#0d9488', cursor: 'pointer' }}
                  />
                </th>
                {visibleCols.map((col, idx) => (
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
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={visibleCols.length + (canManage ? 2 : 1)} style={{ padding: '32px', textAlign: 'center' }}>
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

                  return (
                    <tr key={record.id || idx} style={{ borderBottom: '1px solid #f1f5f9', background: isSelected ? 'rgba(13,148,136,0.04)' : '#ffffff' }}>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
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
                            <td key={col.id} style={{ padding: '10px 14px', position: 'sticky', left: 0, background: isSelected ? '#f0fdfa' : '#ffffff', zIndex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '200px' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #0d9488, #064e43)', color: '#ffffff', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', flexShrink: 0 }}>
                                  {(recordName[0] || 'R')}
                                </div>
                                <div style={{ overflow: 'hidden' }}>
                                  <div
                                    onClick={() => onViewRecord(record)}
                                    style={{ fontWeight: '700', color: '#0f172a', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}
                                  >
                                    {recordName}
                                  </div>
                                  <div style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: '600', color: '#64748b' }}>ID: {record.id}</div>
                                </div>
                              </div>
                            </td>
                          );
                        }

                        if (col.id === 'stage' || col.fieldKey === 'status') {
                          return (
                            <td key={col.id} style={{ padding: '10px 14px' }}>
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
                          <td key={col.id} style={{ padding: '10px 14px', fontSize: '12px', color: '#475569' }}>
                            <SchemaFieldRenderer
                              field={fieldDef || { id: col.fieldKey || col.id, label: col.label, type: 'text' }}
                              value={record[col.fieldKey] || record.customFields?.[col.fieldKey]}
                              mode="view"
                              systemDropdowns={systemDropdowns}
                            />
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
                              onClick={() => onViewRecord(record)}
                            >
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              icon={<Edit2 size={12} />}
                              onClick={() => onEditRecord(record)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              icon={<Archive size={12} />}
                              onClick={() => onArchiveRecord(record)}
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

        {/* PAGINATION TOOLBAR */}
        <Pagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalRecords={records.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  );
}
