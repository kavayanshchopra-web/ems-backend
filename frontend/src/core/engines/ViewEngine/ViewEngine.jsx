/**
 * UNIVERSAL VIEW ENGINE CONTAINER
 * Dynamic Container Switching between List, Kanban, Calendar, Timeline, Gallery, Tree/Org, Gantt, and Map Views
 */

import React from 'react';
import { Calendar as CalendarIcon, Clock, Image as GalleryIcon, GitFork, BarChartHorizontal, MapPin, Eye, Edit3, Trash2, Mail, Phone, User, Briefcase, ChevronRight, Layers, CheckCircle2 } from 'lucide-react';
import KanbanEngine from '../KanbanEngine/KanbanEngine';
import ListEngine from '../ListEngine/ListEngine';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import { LabelEngine } from '../LabelEngine';

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

const formatDateStr = (val) => {
  if (!val) return 'Today';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (e) {
    return String(val);
  }
};

export default function ViewEngine({
  records = [],
  setRecords = () => {},
  moduleConfig = {},
  viewMode = 'list',
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
  hiddenColIds = [],
  setHiddenColIds = () => {},
  currentPage = 1,
  pageSize = 25,
  onPageChange = () => {},
  onPageSizeChange = () => {}
}) {
  // Resolve enabled views from moduleConfig
  let enabledViewsList = [];
  if (Array.isArray(moduleConfig?.views?.availableViews) && moduleConfig.views.availableViews.length > 0) {
    enabledViewsList = moduleConfig.views.availableViews;
  } else if (Array.isArray(moduleConfig?.availableViews) && moduleConfig.availableViews.length > 0) {
    enabledViewsList = moduleConfig.availableViews;
  } else if (moduleConfig?.views && typeof moduleConfig.views === 'object') {
    enabledViewsList = Object.keys(moduleConfig.views).filter(k => moduleConfig.views[k] === true);
  }
  if (enabledViewsList.length === 0) enabledViewsList = ['list'];

  let activeView = viewMode;
  if (activeView !== 'archived' && !enabledViewsList.includes(activeView)) {
    activeView = moduleConfig?.views?.defaultView || moduleConfig?.defaultView || enabledViewsList[0] || 'list';
  }

  const entityName = LabelEngine.getEntityName(moduleConfig);

  // A. KANBAN BOARD VIEW
  if (activeView === 'kanban') {
    return (
      <KanbanEngine
        records={records}
        moduleConfig={moduleConfig}
        activePipelineStages={activePipelineStages}
        systemDropdowns={systemDropdowns}
        isFilterActive={isFilterActive}
        onViewRecord={onViewRecord}
        onEditRecord={onEditRecord}
        onArchiveRecord={onArchiveRecord}
        onMoveStage={onMoveStage}
        canManage={canManage}
      />
    );
  }

  // B. CALENDAR VIEW ENGINE
  if (activeView === 'calendar') {
    return (
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarIcon size={20} color="#0d9488" />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
              {moduleConfig.moduleTitle || entityName} Calendar Schedule ({records.length} Events)
            </h3>
          </div>
          <Badge variant="info" style={{ fontSize: '11px', padding: '4px 10px' }}>
            Live Event Stream
          </Badge>
        </div>

        {records.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
            No records found for calendar schedule display.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
            {records.map((rec) => {
              const nameStr = getValString(rec.name || rec.title || rec.id, 'Record');
              const roleStr = getValString(rec.role || rec.designation || rec.type || 'Staff');
              const deptStr = getValString(rec.department || rec.category || 'General');
              const dateStr = formatDateStr(rec.createdAt || rec.joiningDate || rec.appliedDate);

              return (
                <div
                  key={rec.id}
                  onClick={() => onViewRecord(rec)}
                  style={{
                    background: '#f8fafc',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    padding: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#0d9488'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.transform = 'none'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#0d9488', background: 'rgba(13,148,136,0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                      📅 {dateStr}
                    </span>
                    <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: '700', color: '#64748b' }}>
                      {rec.id}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #0d9488 0%, #064e43 100%)', color: '#fff', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                      {(nameStr[0] || 'R').toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: '800', color: '#0f172a' }}>{nameStr}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>{roleStr} • {deptStr}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // C. TIMELINE VIEW ENGINE
  if (activeView === 'timeline') {
    return (
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
          <Clock size={20} color="#0d9488" />
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
            {moduleConfig.moduleTitle || entityName} Chronological Event Timeline ({records.length})
          </h3>
        </div>

        {records.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
            No records to display on timeline.
          </div>
        ) : (
          <div style={{ position: 'relative', paddingLeft: '28px', borderLeft: '2px solid #0d9488' }}>
            {records.map((rec) => {
              const nameStr = getValString(rec.name || rec.title || rec.id, 'Record');
              const roleStr = getValString(rec.role || rec.designation || rec.type || 'Staff');
              const deptStr = getValString(rec.department || rec.category || 'General');
              const dateStr = formatDateStr(rec.createdAt || rec.joiningDate || rec.appliedDate);

              return (
                <div key={rec.id} style={{ position: 'relative', marginBottom: '20px' }}>
                  <div style={{ position: 'absolute', left: '-36px', top: '4px', width: '14px', height: '14px', borderRadius: '50%', background: '#0d9488', border: '3px solid #ffffff', boxShadow: '0 0 0 2px #0d9488' }} />
                  <div
                    onClick={() => onViewRecord(rec)}
                    style={{
                      background: '#f8fafc',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      padding: '14px 18px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #0d9488 0%, #064e43 100%)', color: '#fff', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {(nameStr[0] || 'R').toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>{nameStr}</div>
                        <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '600' }}>{roleStr} • {deptStr}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#0d9488' }}>⏱️ {dateStr}</span>
                      <Badge variant="info" style={{ fontSize: '10.5px' }}>{getValString(rec.status || rec.stage || 'Active')}</Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // D. GALLERY VIEW ENGINE
  if (activeView === 'gallery') {
    return (
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
          <GalleryIcon size={20} color="#0d9488" />
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
            {moduleConfig.moduleTitle || entityName} Gallery Directory ({records.length})
          </h3>
        </div>

        {records.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
            No records found for gallery layout.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
            {records.map((rec) => {
              const nameStr = getValString(rec.name || rec.title || rec.id, 'Record');
              const roleStr = getValString(rec.role || rec.designation || rec.type || 'Staff');
              const deptStr = getValString(rec.department || rec.category || 'General');
              const emailStr = getValString(rec.email);
              const phoneStr = getValString(rec.phone);

              return (
                <div
                  key={rec.id}
                  style={{
                    background: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    overflow: 'hidden',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <div style={{ background: 'linear-gradient(135deg, #0d9488 0%, #064e43 100%)', height: '60px', position: 'relative' }} />
                  <div style={{ padding: '0 16px 16px 16px', marginTop: '-28px', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#ffffff', border: '3px solid #ffffff', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '800', color: '#0d9488' }}>
                        {(nameStr[0] || 'R').toUpperCase()}
                      </div>
                      <Badge variant="info" style={{ fontSize: '10px', padding: '2px 8px' }}>
                        {getValString(rec.status || 'Active')}
                      </Badge>
                    </div>

                    <div>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{nameStr}</div>
                      <div style={{ fontSize: '12px', color: '#0d9488', fontWeight: '700' }}>{roleStr}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>🏢 {deptStr}</div>
                    </div>

                    {(emailStr || phoneStr) && (
                      <div style={{ fontSize: '11px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '2px', background: '#f8fafc', padding: '8px', borderRadius: '6px' }}>
                        {emailStr && <div>📧 {emailStr}</div>}
                        {phoneStr && <div>📞 {phoneStr}</div>}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '6px', marginTop: 'auto', paddingTop: '8px' }}>
                      <Button variant="secondary" size="xs" onClick={() => onViewRecord(rec)} style={{ flex: 1 }}>
                        <Eye size={12} /> View
                      </Button>
                      {canManage && (
                        <Button variant="secondary" size="xs" onClick={() => onEditRecord(rec)} style={{ flex: 1 }}>
                          <Edit3 size={12} /> Edit
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // E. TREE / ORG VIEW ENGINE
  if (activeView === 'tree' || activeView === 'org') {
    const groupedDepts = {};
    records.forEach(r => {
      const dept = getValString(r.department || r.category || 'General Workspace');
      if (!groupedDepts[dept]) groupedDepts[dept] = [];
      groupedDepts[dept].push(r);
    });

    return (
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
          <GitFork size={20} color="#0d9488" />
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
            {moduleConfig.moduleTitle || entityName} Department Hierarchy Org Tree ({Object.keys(groupedDepts).length} Departments)
          </h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {Object.keys(groupedDepts).map(dept => (
            <div key={dept} style={{ border: '1px solid #cbd5e1', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ background: '#f8fafc', padding: '12px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🏢 {dept}
                </div>
                <Badge variant="info" style={{ fontSize: '11px' }}>{groupedDepts[dept].length} Staff</Badge>
              </div>

              <div style={{ padding: '14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
                {groupedDepts[dept].map(rec => (
                  <div
                    key={rec.id}
                    onClick={() => onViewRecord(rec)}
                    style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
                  >
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#0d9488', color: '#fff', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>
                      {(getValString(rec.name)[0] || 'R').toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>{getValString(rec.name || rec.title)}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{getValString(rec.role || rec.designation || 'Staff')}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // F. GANTT CHART ENGINE
  if (activeView === 'gantt') {
    return (
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
          <BarChartHorizontal size={20} color="#0d9488" />
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
            {moduleConfig.moduleTitle || entityName} Gantt Progress Timeline ({records.length})
          </h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {records.map((rec, idx) => {
            const nameStr = getValString(rec.name || rec.title || rec.id, 'Record');
            const roleStr = getValString(rec.role || rec.designation || 'Staff');
            const progressPct = Math.min(100, Math.max(30, (idx + 1) * 25 % 100));

            return (
              <div key={rec.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ width: '180px', flexShrink: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nameStr}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{roleStr}</div>
                </div>
                <div style={{ flexGrow: 1, background: '#e2e8f0', borderRadius: '6px', height: '24px', overflow: 'hidden', position: 'relative' }}>
                  <div style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg, #0d9488 0%, #14b8a6 100%)', height: '100%', borderRadius: '6px', display: 'flex', alignItems: 'center', paddingLeft: '8px', color: '#fff', fontSize: '10.5px', fontWeight: '800' }}>
                    Active • {progressPct}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // G. MAP VIEW ENGINE
  if (activeView === 'map') {
    return (
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
          <MapPin size={20} color="#0d9488" />
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
            {moduleConfig.moduleTitle || entityName} Location & City Pins Directory ({records.length})
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
          {records.map(rec => (
            <div key={rec.id} style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#0d9488', fontWeight: '800' }}>
                <MapPin size={14} /> {getValString(rec.location || rec.city || rec.department || 'HQ Office')}
              </div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>{getValString(rec.name || rec.title)}</div>
              <div style={{ fontSize: '11.5px', color: '#64748b' }}>{getValString(rec.role || rec.email)}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default to List View Engine
  return (
    <ListEngine
      records={records}
      setRecords={setRecords}
      moduleConfig={moduleConfig}
      totalCount={totalCount}
      isFilterActive={isFilterActive}
      searchQuery={searchQuery}
      sortKey={sortKey}
      sortDir={sortDir}
      onSortChange={onSortChange}
      canManage={canManage}
      softDeleteRecord={softDeleteRecord}
      handleRestoreBinItem={handleRestoreBinItem}
      showToast={showToast}
      isArchivedView={isArchivedView}
      onViewRecord={onViewRecord}
      onEditRecord={onEditRecord}
      onArchiveRecord={onArchiveRecord}
      onMoveStage={onMoveStage}
      onResetFilters={onResetFilters}
      systemDropdowns={systemDropdowns}
      activePipelineStages={activePipelineStages}
      onOpenExportModal={onOpenExportModal}
      hiddenColIds={hiddenColIds}
      setHiddenColIds={setHiddenColIds}
      currentPage={currentPage}
      pageSize={pageSize}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
    />
  );
}
