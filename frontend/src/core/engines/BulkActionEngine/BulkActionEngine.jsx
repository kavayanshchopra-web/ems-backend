/**
 * UNIVERSAL BULK ACTION ENGINE COMPONENT
 * 100% Metadata-Driven Reusable Bulk Actions for all EMS Modules
 */

import React, { useState } from 'react';
import { Archive, Copy, Trash2, RotateCcw, CheckSquare, X, ShieldAlert, Download } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import { LabelEngine } from '../LabelEngine';
import { getNextSequentialId } from '../../../services/atsStorageService';
import FirebaseCloudEngine from '../FirebaseCloudEngine';

export default function BulkActionEngine({
  selectedIds = [],
  setSelectedIds = () => {},
  visibleRecords = [],
  records = [],
  setRecords = () => {},
  moduleConfig = {},
  softDeleteRecord = null,
  handleRestoreBinItem = null,
  showToast = () => {},
  canManage = true,
  isArchivedView = false,
  onOpenExportModal = () => {}
}) {
  const [showDeleteGovernanceModal, setShowDeleteGovernanceModal] = useState(false);

  if (!selectedIds || selectedIds.length === 0) {
    return null; // Hidden when no records are selected
  }

  // Metadata Control Resolution
  const defaultBulkConfig = {
    selectAll: true,
    archive: true,
    restore: true,
    duplicate: true,
    delete: true
  };

  const bulkConfig = {
    ...defaultBulkConfig,
    ...(moduleConfig.bulkActions || {})
  };

  const entityName = LabelEngine.getEntityName(moduleConfig);
  const entityNamePlural = LabelEngine.getEntityNamePlural(moduleConfig);
  const selectedCount = selectedIds.length;

  // 1. SELECT ALL (Visible Records Only)
  const handleSelectAllVisible = () => {
    const visibleIds = visibleRecords.map(r => r.id);
    const combined = Array.from(new Set([...selectedIds, ...visibleIds]));
    setSelectedIds(combined);
    showToast(`Selected ${combined.length} visible ${entityNamePlural.toLowerCase()}`, 'info');
  };

  // 2. DESELECT ALL
  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  // 3. ARCHIVE SELECTED
  const handleBulkArchive = () => {
    const idsSet = new Set(selectedIds);
    const now = new Date().toISOString();

    records.forEach(r => {
      if (idsSet.has(r.id)) {
        const archivedRec = {
          ...r,
          archived: true,
          lifecycleStatus: 'ARCHIVED',
          archivedAt: now
        };
        if (typeof softDeleteRecord === 'function') {
          softDeleteRecord({
            originalId: r.id,
            name: `${entityName}: "${r.name || r.title || r.id}"`,
            category: `${entityName} Record`,
            entityData: { record: archivedRec, candidate: archivedRec },
            moduleTab: moduleConfig.moduleId
          });
        }
        FirebaseCloudEngine.deleteRecord(moduleConfig.moduleId || 'employees', r.id);
      }
    });

    const remaining = records.filter(r => !idsSet.has(r.id));
    setRecords(remaining);
    setSelectedIds([]);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('omnilflow_config_updated', {
        detail: { moduleId: moduleConfig.moduleId || 'recruitment_ats' }
      }));
    }

    showToast(`📦 Archived ${selectedCount} ${selectedCount === 1 ? entityName.toLowerCase() : entityNamePlural.toLowerCase()}`, 'info');
  };

  // 4. RESTORE SELECTED (For Archived View)
  const handleBulkRestore = () => {
    if (typeof handleRestoreBinItem === 'function') {
      selectedIds.forEach(id => {
        const rec = records.find(r => r.id === id || r.recycleBinId === id);
        const restoreId = rec?.recycleBinId || rec?.id || id;
        handleRestoreBinItem(restoreId);
      });
      setSelectedIds([]);
      showToast(`🔄 Restored ${selectedCount} ${selectedCount === 1 ? entityName.toLowerCase() : entityNamePlural.toLowerCase()}`, 'success');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('omnilflow_config_updated', {
          detail: { moduleId: moduleConfig.moduleId }
        }));
      }
    }
  };

  // 5. PERMANENT DELETE SELECTED (For Archived View ONLY)
  const handleBulkPermanentDelete = () => {
    if (!window.confirm(`Permanently delete ${selectedCount} archived records? This action cannot be undone.`)) return;

    const idsSet = new Set(selectedIds);
    selectedIds.forEach(id => {
      const rec = records.find(r => r.id === id || r.recycleBinId === id);
      const purgeId = rec?.recycleBinId || rec?.id || id;
      if (typeof softDeleteRecord === 'function') {
        softDeleteRecord(purgeId);
      }
      FirebaseCloudEngine.deleteRecord('recycle_bin', purgeId);
      FirebaseCloudEngine.deleteRecord(moduleConfig.moduleId || 'employees', purgeId);
    });

    const remaining = records.filter(r => !idsSet.has(r.id) && !idsSet.has(r.recycleBinId));
    setRecords(remaining);
    setSelectedIds([]);

    showToast(`🔥 Permanently deleted ${selectedCount} records`, 'info');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('omnilflow_config_updated', {
        detail: { moduleId: moduleConfig.moduleId }
      }));
    }
  };

  // 6. DUPLICATE SELECTED WITH SMART VERSION NAMING (e.g. John Copy 1, John Copy 2)
  // 6. DUPLICATE SELECTED WITH SMART VERSION NAMING (e.g. John (Copy 1), John (Copy 2)) & NEW SEQUENTIAL IDs
  const handleBulkDuplicate = () => {
    const now = new Date().toISOString();
    const duplicates = [];

    const getDuplicateName = (baseName, existingRecordsList) => {
      if (!baseName) return 'Untitled (Copy 1)';
      const cleanBase = String(baseName).replace(/\s*\(Copy\s*\d*\)\s*/gi, '').replace(/\s*Copy\s*\d*\s*/gi, '').trim();
      const existingNames = new Set(existingRecordsList.map(r => (r.name || r.title || '').trim().toLowerCase()));

      let count = 1;
      let candidate = `${cleanBase} (Copy ${count})`;
      while (existingNames.has(candidate.toLowerCase())) {
        count++;
        candidate = `${cleanBase} (Copy ${count})`;
      }
      return candidate;
    };

    let currentRecordsList = [...records];

    selectedIds.forEach((id, idx) => {
      const orig = currentRecordsList.find(r => r.id === id);
      if (orig) {
        const nextSeqId = getNextSequentialId('default_tenant', moduleConfig.moduleId || 'employees', moduleConfig);
        const dupName = orig.name ? getDuplicateName(orig.name, currentRecordsList) : undefined;
        const dupTitle = orig.title ? getDuplicateName(orig.title, currentRecordsList) : undefined;

        const dupRec = {
          ...orig,
          id: nextSeqId || `${orig.id}_copy_${Date.now()}_${idx}`,
          ...(dupName ? { name: dupName } : {}),
          ...(dupTitle ? { title: dupTitle } : {}),
          isDuplicate: true,
          isCopy: true,
          originalId: orig.id,
          createdAt: now,
          updatedAt: now,
          archived: false,
          lifecycleStatus: 'ACTIVE'
        };
        duplicates.push(dupRec);
        currentRecordsList.unshift(dupRec);
      }
    });

    setRecords([...duplicates, ...records]);
    setSelectedIds([]); // Auto-clear selection after duplicate

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('omnilflow_config_updated', {
        detail: { moduleId: moduleConfig.moduleId || 'recruitment_ats' }
      }));
    }

    showToast(`📋 Duplicated ${duplicates.length} ${duplicates.length === 1 ? entityName.toLowerCase() : entityNamePlural.toLowerCase()}`, 'success');
  };

  return (
    <>
      <div
        className="universal-bulk-action-engine"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 25,
          width: '100%',
          padding: '8px 16px',
          background: 'linear-gradient(135deg, #064e43 0%, #0d9488 100%)',
          backdropFilter: 'blur(8px)',
          color: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #0f766e',
          boxShadow: '0 8px 20px -4px rgba(6, 78, 67, 0.4)',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          marginBottom: '10px',
          boxSizing: 'border-box'
        }}
      >
        {/* LEFT STRIP: SELECTION COUNTER BADGE & SELECT ALL / CLEAR */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: isArchivedView ? '#f59e0b' : '#0d9488',
              color: '#ffffff',
              padding: '3px 8px',
              borderRadius: '5px',
              fontSize: '11px',
              fontWeight: '800',
              letterSpacing: '0.02em'
            }}
          >
            <CheckSquare size={13} />
            <span>☑ {selectedCount} Selected</span>
          </div>

          {bulkConfig.selectAll && visibleRecords.length > selectedCount && (
            <button
              type="button"
              onClick={handleSelectAllVisible}
              style={{ border: 'none', background: 'transparent', color: '#94a3b8', fontSize: '11px', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Select All Visible ({visibleRecords.length})
            </button>
          )}

          <button
            type="button"
            onClick={handleDeselectAll}
            style={{ border: 'none', background: 'transparent', color: '#cbd5e1', fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <X size={12} />
            <span>Clear Selection</span>
          </button>
        </div>

        {/* RIGHT STRIP: METADATA-CONTROLLED ACTION BUTTONS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {/* EXPORT SELECTED BUTTON */}
          <Button
            variant="outline"
            size="sm"
            icon={<Download size={13} />}
            onClick={onOpenExportModal}
            style={{ background: 'rgba(255, 255, 255, 0.15)', color: '#ffffff', borderColor: '#0f766e', fontSize: '11px', padding: '4px 10px', fontWeight: '700' }}
          >
            Export Selected ({selectedCount})
          </Button>

          {/* ARCHIVE BUTTON (ACTIVE VIEW ONLY) */}
          {!isArchivedView && bulkConfig.archive && canManage && (
            <Button
              variant="outline"
              size="sm"
              icon={<Archive size={13} />}
              onClick={handleBulkArchive}
              style={{ background: 'rgba(255, 255, 255, 0.08)', color: '#ffffff', borderColor: '#475569', fontSize: '11px', padding: '4px 10px' }}
            >
              Archive ({selectedCount})
            </Button>
          )}

          {/* RESTORE BUTTON (ARCHIVED VIEW ONLY) */}
          {isArchivedView && canManage && (
            <Button
              variant="primary"
              size="sm"
              icon={<RotateCcw size={13} />}
              onClick={handleBulkRestore}
              style={{ fontSize: '11px', padding: '4px 10px' }}
            >
              Restore ({selectedCount})
            </Button>
          )}

          {/* PERMANENT DELETE BUTTON (ARCHIVED VIEW ONLY) */}
          {isArchivedView && canManage && (
            <Button
              variant="outline"
              size="sm"
              icon={<Trash2 size={13} />}
              onClick={handleBulkPermanentDelete}
              style={{ background: '#fff1f2', color: '#fca5a5', borderColor: '#ef4444', fontSize: '11px', padding: '4px 10px' }}
            >
              Permanent Delete ({selectedCount})
            </Button>
          )}

          {/* DUPLICATE BUTTON (ACTIVE VIEW ONLY) */}
          {!isArchivedView && bulkConfig.duplicate && canManage && (
            <Button
              variant="secondary"
              size="sm"
              icon={<Copy size={13} />}
              onClick={handleBulkDuplicate}
              style={{ fontSize: '11px', padding: '4px 10px' }}
            >
              Duplicate ({selectedCount})
            </Button>
          )}

          {/* DELETE BUTTON (ACTIVE VIEW GOVERNANCE) */}
          {!isArchivedView && bulkConfig.delete && canManage && (
            <Button
              variant="outline"
              size="sm"
              icon={<Trash2 size={13} />}
              onClick={() => setShowDeleteGovernanceModal(true)}
              style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', borderColor: '#ef4444', fontSize: '11px', padding: '4px 10px' }}
            >
              Delete ({selectedCount})
            </Button>
          )}
        </div>
      </div>

      {/* ENTERPRISE DELETE GOVERNANCE MODAL */}
      {showDeleteGovernanceModal && (
        <Modal
          isOpen={showDeleteGovernanceModal}
          onClose={() => setShowDeleteGovernanceModal(false)}
          title="🛡️ Enterprise Data Protection Governance"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '4px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                background: '#fff1f2',
                border: '1px solid #fecdd3',
                padding: '14px',
                borderRadius: '8px',
                color: '#9f1239'
              }}
            >
              <ShieldAlert size={22} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '13px', lineHeight: '1.5' }}>
                <strong style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
                  Permanent Deletion Is Disabled
                </strong>
                Permanent deletion is disabled to protect historical data. Archive the selected records instead.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <Button
                variant="outline"
                size="md"
                onClick={() => setShowDeleteGovernanceModal(false)}
              >
                Cancel
              </Button>

              <Button
                variant="primary"
                size="md"
                icon={<Archive size={14} />}
                onClick={() => {
                  setShowDeleteGovernanceModal(false);
                  handleBulkArchive();
                }}
              >
                Archive Selected
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
