/**
 * UNIVERSAL KANBAN ENGINE COMPONENT
 * Multi-Input Horizontal Board Scrolling (Mouse Wheel, Trackpad, Scrollbar, Background Drag)
 * Fixed 320px Non-Shrinking Stage Columns
 */

import React, { useRef, useState } from 'react';
import KanbanColumn from './KanbanColumn';

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

export default function KanbanEngine({
  records = [],
  moduleConfig = {},
  activeCurrency = 'INR',
  activePipelineStages = [],
  systemDropdowns = null,
  isFilterActive = false,
  onViewRecord = () => {},
  onEditRecord = () => {},
  onArchiveRecord = () => {},
  onMoveStage = () => {},
  onOpenChatWithLead = null,
  canManage = true
}) {
  const scrollContainerRef = useRef(null);

  // Background Click-and-Drag Scroll State
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);

  // Multi-input wheel scroll handler (Supports Mouse Wheel & Trackpad)
  const handleWheel = (e) => {
    if (scrollContainerRef.current) {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        scrollContainerRef.current.scrollLeft += e.deltaY;
      }
    }
  };

  // Background Click-and-Drag on Kanban Background ONLY (Ignores cards, buttons, selects)
  const handleMouseDown = (e) => {
    if (
      e.target.closest('.enterprise-kanban-card') ||
      e.target.closest('button') ||
      e.target.closest('select') ||
      e.target.closest('input') ||
      e.target.closest('a')
    ) {
      return;
    }

    setIsMouseDown(true);
    setStartX(e.pageX - (scrollContainerRef.current?.offsetLeft || 0));
    setScrollLeftState(scrollContainerRef.current?.scrollLeft || 0);
  };

  const handleMouseLeave = () => {
    setIsMouseDown(false);
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);
  };

  const handleMouseMove = (e) => {
    if (!isMouseDown || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollContainerRef.current.scrollLeft = scrollLeftState - walk;
  };

  // Metadata-driven Grouping Field Resolution
  const groupByFieldId = moduleConfig.kanbanConfig?.groupByField || moduleConfig.kanbanGroupBy || 'status';
  const groupFieldDef = (moduleConfig.fields || []).find(f => f.id === groupByFieldId || f.key === groupByFieldId);

  // Column Headers List Resolution
  let stageColumns = [];
  let stagesToUse = [];

  const isModuleSpecificStages = Array.isArray(moduleConfig?.stages) && moduleConfig.stages.length > 0;

  if (isModuleSpecificStages) {
    stagesToUse = moduleConfig.stages;
  } else if (Array.isArray(activePipelineStages) && activePipelineStages.length > 0 && (!moduleConfig?.moduleId || moduleConfig.moduleId === 'crm' || moduleConfig.moduleId === 'crm_deals')) {
    stagesToUse = activePipelineStages;
  } else if (systemDropdowns?.crmStages && Array.isArray(systemDropdowns.crmStages) && systemDropdowns.crmStages.length > 0) {
    stagesToUse = systemDropdowns.crmStages;
  } else if (systemDropdowns?.crm_stages && Array.isArray(systemDropdowns.crm_stages) && systemDropdowns.crm_stages.length > 0) {
    stagesToUse = systemDropdowns.crm_stages;
  } else if (Array.isArray(moduleConfig?.stages) && moduleConfig.stages.length > 0) {
    stagesToUse = moduleConfig.stages;
  }

  if (stagesToUse.length > 0 && (isModuleSpecificStages || groupByFieldId === 'status' || groupByFieldId === 'stage' || groupByFieldId === 'pipeline_stage' || groupByFieldId === 'type')) {
    stageColumns = stagesToUse.map(s => {
      const stageName = typeof s === 'string' ? s : getValString(s.name || s.title || s.label || s.id || '');
      const stageId = typeof s === 'string' ? s : String(s.id || s.key || stageName);
      return {
        id: stageId,
        name: stageName || stageId,
        emoji: (typeof s === 'object' && s.emoji) ? s.emoji : '📋',
        color: (typeof s === 'object' && s.color) ? s.color : '#0d9488'
      };
    });
  } else {
    // Resolve from Lookup Data or System Dropdowns
    const lookupKey = groupFieldDef?.optionsSource || groupFieldDef?.key || groupFieldDef?.id || groupByFieldId;
    let rawOptions = [];

    if (moduleConfig?.lookupData) {
      if (Array.isArray(moduleConfig.lookupData[lookupKey]) && moduleConfig.lookupData[lookupKey].length > 0) {
        rawOptions = moduleConfig.lookupData[lookupKey];
      } else if (Array.isArray(moduleConfig.lookupData[lookupKey + 's']) && moduleConfig.lookupData[lookupKey + 's'].length > 0) {
        rawOptions = moduleConfig.lookupData[lookupKey + 's'];
      } else if (typeof lookupKey === 'string' && lookupKey.endsWith('s') && Array.isArray(moduleConfig.lookupData[lookupKey.slice(0, -1)]) && moduleConfig.lookupData[lookupKey.slice(0, -1)].length > 0) {
        rawOptions = moduleConfig.lookupData[lookupKey.slice(0, -1)];
      }
    }

    if (rawOptions.length === 0) {
      if (Array.isArray(groupFieldDef?.options) && groupFieldDef.options.length > 0) {
        rawOptions = groupFieldDef.options;
      } else if (Array.isArray(groupFieldDef?.manualOptions) && groupFieldDef.manualOptions.length > 0) {
        rawOptions = groupFieldDef.manualOptions;
      }
    }

    if (rawOptions.length === 0 && systemDropdowns) {
      if (Array.isArray(systemDropdowns[lookupKey])) rawOptions = systemDropdowns[lookupKey];
      else if (Array.isArray(systemDropdowns[lookupKey + 's'])) rawOptions = systemDropdowns[lookupKey + 's'];
      else if (Array.isArray(systemDropdowns['crmStages'])) rawOptions = systemDropdowns['crmStages'];
      else if (Array.isArray(systemDropdowns['crm_stages'])) rawOptions = systemDropdowns['crm_stages'];
    }

    if (rawOptions.length === 0) {
      const recordVals = Array.from(new Set(records.map(r => getValString(r[groupByFieldId] || r.status || r.stage || r.pipeline_stage || r.department)).filter(Boolean)));
      if (recordVals.length > 0) rawOptions = recordVals;
      else rawOptions = ['New Lead', 'Contacted', 'Qualified', 'Proposal Sent', 'Won', 'Lost'];
    }

    stageColumns = rawOptions.map(opt => {
      const nameStr = getValString(opt);
      return {
        id: typeof opt === 'object' ? (opt.id || opt.key || nameStr) : nameStr,
        name: nameStr,
        emoji: (typeof opt === 'object' && opt.emoji) ? opt.emoji : '📌',
        color: (typeof opt === 'object' && opt.color) ? opt.color : '#0d9488'
      };
    });
  }

  // Dynamically map records to stage columns
  const autoGeneratedColumns = stageColumns.map(stage => {
    const stageName = stage.name;
    const stageId = String(stage.id);

    const stageRecords = records.filter(r => {
      if (!r) return false;
      const recVal = getValString(
        r[groupByFieldId] !== undefined ? r[groupByFieldId] : (r.type || r.status || r.stage || r.pipeline_stage || r.department || r.role)
      );
      const rLower = recVal.toLowerCase();
      const sNameLower = stageName.toLowerCase();
      const sIdLower = stageId.toLowerCase();

      return (
        rLower === sNameLower ||
        rLower === sIdLower ||
        (sNameLower.includes('gazetted') && rLower.includes('gazetted')) ||
        (sNameLower.includes('restricted') && rLower.includes('restricted'))
      );
    });

    return {
      id: stageId || stageName,
      name: stageName,
      emoji: stage.emoji || '📋',
      color: stage.color || '#0d9488',
      list: stageRecords
    };
  });

  return (
    <div className="kanban-engine-outer-wrapper" style={{ width: '100%', overflow: 'visible' }}>
      <style>{`
        .kanban-scroll-container::-webkit-scrollbar {
          height: 12px !important;
          display: block !important;
        }
        .kanban-scroll-container::-webkit-scrollbar-track {
          background: #e2e8f0 !important;
          border-radius: 6px !important;
        }
        .kanban-scroll-container::-webkit-scrollbar-thumb {
          background: #0d9488 !important;
          border-radius: 6px !important;
        }
        .kanban-scroll-container::-webkit-scrollbar-thumb:hover {
          background: #0f766e !important;
        }
      `}</style>
      <div
        ref={scrollContainerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        className="kanban-scroll-container"
        style={{
          width: '100%',
          overflowX: 'auto',
          overflowY: 'hidden',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: '16px',
          boxSizing: 'border-box',
          cursor: isMouseDown ? 'grabbing' : 'default',
          userSelect: isMouseDown ? 'none' : 'auto'
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '14px',
            alignItems: 'flex-start',
            width: 'max-content',
            paddingRight: '40px',
            paddingBottom: '4px'
          }}
        >
          {autoGeneratedColumns.map((col) => (
            <div
              key={col.id}
              style={{
                width: '320px',
                minWidth: '320px',
                maxWidth: '320px',
                flexShrink: 0,
                flexGrow: 0
              }}
            >
              <KanbanColumn
                stage={col}
                records={col.list}
                moduleConfig={{ ...moduleConfig, activeCurrency }}
                activeCurrency={activeCurrency}
                activePipelineStages={activePipelineStages}
                isFilterActive={isFilterActive}
                onViewRecord={onViewRecord}
                onEditRecord={onEditRecord}
                onArchiveRecord={onArchiveRecord}
                onMoveStage={onMoveStage}
                onOpenChatWithLead={onOpenChatWithLead}
                canManage={canManage}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
