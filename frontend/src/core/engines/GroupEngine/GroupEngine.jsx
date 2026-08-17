/**
 * UNIVERSAL METADATA-DRIVEN GROUP ENGINE COMPONENT
 * Renders expandable/collapsible grouped sections with bulk selection & header counters
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Layers } from 'lucide-react';
import Badge from '../../../components/ui/Badge';

export default function GroupEngineContainer({
  groupedData = [],
  groupByFieldId = '',
  moduleConfig = {},
  renderGroupRows = () => null,
  selectedIds = [],
  onSelectGroup = () => {},
  colSpanCount = 1
}) {
  // Collapse / Expand state (Default: All groups expanded)
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const toggleGroup = (groupId) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const expandAll = () => setCollapsedGroups({});
  const collapseAll = () => {
    const allObj = {};
    groupedData.forEach(g => { allObj[g.groupId] = true; });
    setCollapsedGroups(allObj);
  };

  const fieldDef = (moduleConfig.fields || []).find(f => f.id === groupByFieldId || f.key === groupByFieldId);
  const fieldLabel = fieldDef ? fieldDef.label : groupByFieldId;

  return (
    <>
      {/* GROUP MASTER CONTROL BAR */}
      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
        <td colSpan={colSpanCount} style={{ padding: '8px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase' }}>
              <Layers size={14} color="#0d9488" />
              <span>GROUPED BY: {fieldLabel} ({groupedData.length} Groups)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={expandAll}
                style={{ border: 'none', background: 'transparent', color: '#0d9488', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
              >
                Expand All
              </button>
              <span style={{ color: '#cbd5e1' }}>|</span>
              <button
                type="button"
                onClick={collapseAll}
                style={{ border: 'none', background: 'transparent', color: '#64748b', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
              >
                Collapse All
              </button>
            </div>
          </div>
        </td>
      </tr>

      {/* RENDER EACH GROUP SECTION */}
      {groupedData.map(group => {
        const isCollapsed = Boolean(collapsedGroups[group.groupId]);
        const groupRecordIds = group.records.map(r => r.id);
        const isGroupAllSelected = groupRecordIds.length > 0 && groupRecordIds.every(id => selectedIds.includes(id));
        const isGroupSomeSelected = groupRecordIds.some(id => selectedIds.includes(id)) && !isGroupAllSelected;

        return (
          <React.Fragment key={group.groupId}>
            {/* GROUP HEADER ROW */}
            <tr
              style={{
                background: isCollapsed ? '#f8fafc' : 'linear-gradient(135deg, rgba(13,148,136,0.08) 0%, rgba(15,118,110,0.04) 100%)',
                borderTop: '2px solid #e2e8f0',
                borderBottom: '1px solid #e2e8f0',
                userSelect: 'none'
              }}
            >
              <td style={{ padding: '8px 14px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={isGroupAllSelected}
                  ref={el => { if (el) el.indeterminate = isGroupSomeSelected; }}
                  onChange={() => onSelectGroup(groupRecordIds, !isGroupAllSelected)}
                  style={{ accentColor: '#0d9488', cursor: 'pointer' }}
                  title="Select Entire Group"
                />
              </td>
              <td
                colSpan={colSpanCount - 1}
                onClick={() => toggleGroup(group.groupId)}
                style={{ padding: '10px 14px', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#0d9488', display: 'flex', alignItems: 'center' }}>
                    {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                  </span>
                  <span style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a' }}>
                    {group.groupTitle}
                  </span>
                  <Badge variant="teal" style={{ fontSize: '10px', padding: '2px 8px' }}>
                    {group.count} {group.count === 1 ? 'Record' : 'Records'}
                  </Badge>
                </div>
              </td>
            </tr>

            {/* GROUP RECORDS ROWS (WHEN EXPANDED) */}
            {!isCollapsed && renderGroupRows(group.records)}
          </React.Fragment>
        );
      })}
    </>
  );
}
