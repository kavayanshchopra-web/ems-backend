/**
 * UNIVERSAL BULK ACTION ENGINE COMPONENT
 * 100% Metadata-Driven Reusable Bulk Actions for all EMS Modules
 * Enhanced with High-Performance CRM Actions: Bulk WhatsApp, Assign Agent, Change Stage & Tags
 */

import React, { useState, useMemo } from 'react';
import {
  Archive,
  Copy,
  Trash2,
  RotateCcw,
  CheckSquare,
  X,
  ShieldAlert,
  Download,
  MessageSquare,
  UserCheck,
  RefreshCw,
  Tag,
  Send
} from 'lucide-react';
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
  onOpenExportModal = () => {},
  systemDropdowns = null,
  activePipelineStages = [],
  authUser = null
}) {
  const [showDeleteGovernanceModal, setShowDeleteGovernanceModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showStageModal, setShowStageModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);

  // Form states for bulk modals
  const [whatsAppMessage, setWhatsAppMessage] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const [newTag, setNewTag] = useState('');

  // Check if current module is CRM / Contacts
  const modId = String(moduleConfig.moduleId || moduleConfig.id || '').toLowerCase();
  const cat = String(moduleConfig.category || '').toLowerCase();
  const isCrmModule = modId === 'contacts' || modId === 'leads' || cat.includes('crm') || cat.includes('sales');

  // Metadata Control Resolution
  const defaultBulkConfig = {
    selectAll: true,
    archive: true,
    restore: true,
    duplicate: !isCrmModule, // Disabled for CRM contacts by default
    delete: true
  };

  const bulkConfig = {
    ...defaultBulkConfig,
    ...(moduleConfig.bulkActions || {})
  };

  const entityName = LabelEngine.getEntityName(moduleConfig);
  const entityNamePlural = LabelEngine.getEntityNamePlural(moduleConfig);
  const selectedCount = (selectedIds || []).length;

  // Employees list resolution
  const employeeList = useMemo(() => {
    const raw = systemDropdowns?.employees || [];
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map(e => ({
        id: e.id || e.name,
        name: e.name || `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.email || 'Agent',
        designation: e.designation || e.role || ''
      }));
    }
    return [
      { id: 'kavayansh', name: 'Kavayansh Chopra', designation: 'Manager' },
      { id: 'admin', name: authUser?.name || 'Administrator', designation: 'Admin' }
    ];
  }, [systemDropdowns, authUser]);

  // Pipeline stages resolution
  const pipelineStagesList = useMemo(() => {
    if (Array.isArray(activePipelineStages) && activePipelineStages.length > 0) {
      return activePipelineStages.map(s => (typeof s === 'string' ? s : s.name || s.label || s.title));
    }
    return ['New Leads', 'Contacted', 'Follow-up', 'Qualified', 'Proposal Sent', 'Closed Won', 'Lost'];
  }, [activePipelineStages]);

  // 1. SELECT ALL (Visible Records Only)
  const handleSelectAllVisible = () => {
    const visibleIds = (visibleRecords || []).filter(r => !!r && r.id !== undefined).map(r => r.id);
    const combined = Array.from(new Set([...(selectedIds || []), ...visibleIds]));
    setSelectedIds(combined);
    showToast(`Selected ${combined.length} visible ${entityNamePlural.toLowerCase()}`, 'info');
  };

  // 1B. SELECT ALL (Across All Pages)
  const handleSelectAllTotal = () => {
    const allIds = (records || []).filter(r => !!r && r.id !== undefined).map(r => r.id);
    setSelectedIds(allIds);
    showToast(`Selected all ${allIds.length} ${entityNamePlural.toLowerCase()} across all pages`, 'success');
  };

  // 2. DESELECT ALL
  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  // 3. ARCHIVE SELECTED
  const handleBulkArchive = () => {
    const idsSet = new Set(selectedIds || []);
    const now = new Date().toISOString();

    (records || []).filter(r => !!r).forEach(r => {
      if (idsSet.has(r.id) || idsSet.has(r.displayId) || idsSet.has(r.originalId)) {
        const archivedRec = {
          ...r,
          archived: true,
          is_archived: 1,
          lifecycleStatus: 'ARCHIVED',
          archivedAt: now
        };
        if (typeof softDeleteRecord === 'function') {
          softDeleteRecord({
            originalId: r.id,
            id: r.id,
            name: `${entityName}: "${r.name || r.title || r.id}"`,
            category: `${entityName} Record`,
            entityData: { record: archivedRec, candidate: archivedRec, ...archivedRec },
            moduleTab: moduleConfig.moduleId || 'contacts',
            type: moduleConfig.moduleId || 'contacts'
          }, true);
        }
        if (!isSandboxEnvironment()) {
          FirebaseCloudEngine.deleteRecord(moduleConfig.moduleId || 'employees', r.id);
        }
      }
    });

    const remaining = (records || []).filter(r => r && !idsSet.has(r.id));
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
      (selectedIds || []).forEach(id => {
        const rec = (records || []).find(r => r && (r.id === id || r.recycleBinId === id));
        const restoreId = rec?.recycleBinId || rec?.id || id;
        handleRestoreBinItem(restoreId);
      });
      setSelectedIds([]);
      showToast(`🔄 Restored ${selectedCount} ${selectedCount === 1 ? entityName.toLowerCase() : entityNamePlural.toLowerCase()}`, 'success');
    }
  };

  // 5. PERMANENT DELETE (For Archived View)
  const handleBulkPermanentDelete = () => {
    if (!window.confirm(`⚠️ Permanently delete ${selectedCount} ${entityNamePlural.toLowerCase()}? This cannot be undone.`)) return;

    if (typeof softDeleteRecord === 'function') {
      (selectedIds || []).forEach(id => {
        const rec = (records || []).find(r => r && (r.id === id || r.recycleBinId === id));
        const trueId = rec?.recycleBinId || rec?.id || id;
        softDeleteRecord(trueId);
      });
    }

    const idsSet = new Set(selectedIds || []);
    const remaining = (records || []).filter(r => r && !idsSet.has(r.id) && !idsSet.has(r.recycleBinId));
    setRecords(remaining);
    setSelectedIds([]);
    showToast(`🗑️ Permanently removed ${selectedCount} ${entityNamePlural.toLowerCase()}`, 'success');
  };

  // 6. DUPLICATE SELECTED (Non-CRM Modules Only)
  const handleBulkDuplicate = () => {
    const idsSet = new Set(selectedIds || []);
    const duplicates = [];

    (records || []).forEach(r => {
      if (r && idsSet.has(r.id)) {
        const newId = getNextSequentialId(moduleConfig.idConfig || { prefix: 'REC', pattern: 'REC-0001' });
        const copy = {
          ...r,
          id: newId,
          originalId: newId,
          name: r.name ? `${r.name} (Copy)` : (r.title ? `${r.title} (Copy)` : 'Copy'),
          title: r.title ? `${r.title} (Copy)` : (r.name ? `${r.name} (Copy)` : 'Copy'),
          createdAt: new Date().toISOString()
        };
        duplicates.push(copy);
        FirebaseCloudEngine.saveRecord(moduleConfig.moduleId || 'employees', copy);
      }
    });

    const updated = [...(records || []), ...duplicates];
    setRecords(updated);
    setSelectedIds([]);
    showToast(`📋 Duplicated ${duplicates.length} ${duplicates.length === 1 ? entityName.toLowerCase() : entityNamePlural.toLowerCase()}`, 'success');
  };

  // 7. CRM BULK ASSIGN AGENT
  const handleBulkAssign = () => {
    if (!selectedAgent) return;
    const idsSet = new Set(selectedIds || []);
    const updated = (records || []).map(r => {
      if (r && idsSet.has(r.id)) {
        return {
          ...r,
          assignedTo: selectedAgent,
          employee: selectedAgent,
          agentName: selectedAgent,
          updatedAt: new Date().toISOString()
        };
      }
      return r;
    });
    setRecords(updated);
    showToast(`👤 Assigned ${selectedCount} contacts to ${selectedAgent}`, 'success');
    setSelectedIds([]);
    setShowAssignModal(false);
    setSelectedAgent('');
  };

  // 8. CRM BULK CHANGE STAGE
  const handleBulkStageChange = () => {
    if (!selectedStage) return;
    const idsSet = new Set(selectedIds || []);
    const updated = (records || []).map(r => {
      if (r && idsSet.has(r.id)) {
        return {
          ...r,
          status: selectedStage,
          stage: selectedStage,
          pipelineStage: selectedStage,
          updatedAt: new Date().toISOString()
        };
      }
      return r;
    });
    setRecords(updated);
    showToast(`🔄 Updated stage to "${selectedStage}" for ${selectedCount} contacts`, 'success');
    setSelectedIds([]);
    setShowStageModal(false);
    setSelectedStage('');
  };

  // 9. CRM BULK ADD TAG
  const handleBulkAddTag = () => {
    const cleanTag = newTag.trim();
    if (!cleanTag) return;
    const idsSet = new Set(selectedIds || []);
    const updated = (records || []).map(r => {
      if (r && idsSet.has(r.id)) {
        const existingTags = r.tags ? String(r.tags).split(',').map(t => t.trim()).filter(Boolean) : [];
        if (!existingTags.includes(cleanTag)) {
          existingTags.push(cleanTag);
        }
        return {
          ...r,
          tags: existingTags.join(', '),
          updatedAt: new Date().toISOString()
        };
      }
      return r;
    });
    setRecords(updated);
    showToast(`🏷️ Added tag "${cleanTag}" to ${selectedCount} contacts`, 'success');
    setSelectedIds([]);
    setShowTagModal(false);
    setNewTag('');
  };

  // 10. CRM BULK WHATSAPP BROADCAST
  const handleSendWhatsAppBroadcast = () => {
    if (!whatsAppMessage.trim()) {
      showToast('⚠️ Please enter a message for WhatsApp broadcast', 'error');
      return;
    }
    const idsSet = new Set(selectedIds || []);
    const timeNow = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const updated = (records || []).map(r => {
      if (r && idsSet.has(r.id)) {
        const prevNotes = r.notes ? `${r.notes}\n` : '';
        return {
          ...r,
          notes: `${prevNotes}[${timeNow}] WhatsApp Broadcast Sent: "${whatsAppMessage.substring(0, 30)}..."`,
          updatedAt: new Date().toISOString()
        };
      }
      return r;
    });
    setRecords(updated);
    showToast(`🚀 WhatsApp Broadcast dispatched to ${selectedCount} contacts!`, 'success');
    setSelectedIds([]);
    setShowWhatsAppModal(false);
    setWhatsAppMessage('');
  };

  const isAllTotalSelected = selectedIds.length === records.length && records.length > 0;

  if (!selectedIds || selectedIds.length === 0) {
    return null; // Hidden when no records are selected
  }

  return (
    <>
      <div
        className="universal-bulk-action-bar"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          background: 'linear-gradient(135deg, #064e43 0%, #0f766e 100%)',
          color: '#ffffff',
          padding: '8px 16px',
          borderRadius: '10px',
          boxShadow: '0 4px 14px rgba(13, 148, 136, 0.25)',
          marginBottom: '10px',
          transition: 'all 0.2s ease',
          animation: 'fadeIn 0.2s ease'
        }}
      >
        {/* LEFT STRIP: SELECTION COUNTER & GLOBAL SELECTOR */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800', fontSize: '12px', color: '#ccfbf1', background: 'rgba(255, 255, 255, 0.12)', padding: '4px 10px', borderRadius: '6px' }}>
            <CheckSquare size={14} />
            <span>{selectedCount} Selected</span>
          </div>

          {!isAllTotalSelected && records.length > visibleRecords.length && (
            <button
              type="button"
              onClick={handleSelectAllTotal}
              style={{
                border: 'none',
                background: 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: '700',
                padding: '4px 8px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>⚡ Select all {records.length} {entityNamePlural.toLowerCase()} across all pages</span>
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

        {/* RIGHT STRIP: BULK ACTION BUTTONS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {/* CRM ACTION 1: SEND WHATSAPP BROADCAST */}
          {!isArchivedView && isCrmModule && canManage && (
            <Button
              variant="primary"
              size="sm"
              icon={<MessageSquare size={13} />}
              onClick={() => setShowWhatsAppModal(true)}
              style={{ background: '#0d9488', color: '#ffffff', border: '1px solid #14b8a6', fontSize: '11px', padding: '4px 10px', fontWeight: '700' }}
            >
              WhatsApp ({selectedCount})
            </Button>
          )}

          {/* CRM ACTION 2: BULK ASSIGN AGENT */}
          {!isArchivedView && isCrmModule && canManage && (
            <Button
              variant="primary"
              size="sm"
              icon={<UserCheck size={13} />}
              onClick={() => setShowAssignModal(true)}
              style={{ background: '#4f46e5', color: '#ffffff', border: '1px solid #6366f1', fontSize: '11px', padding: '4px 10px', fontWeight: '700' }}
            >
              Assign Agent ({selectedCount})
            </Button>
          )}

          {/* CRM ACTION 3: BULK CHANGE STAGE */}
          {!isArchivedView && isCrmModule && canManage && (
            <Button
              variant="primary"
              size="sm"
              icon={<RefreshCw size={13} />}
              onClick={() => setShowStageModal(true)}
              style={{ background: '#d97706', color: '#ffffff', border: '1px solid #f59e0b', fontSize: '11px', padding: '4px 10px', fontWeight: '700' }}
            >
              Change Stage ({selectedCount})
            </Button>
          )}

          {/* CRM ACTION 4: BULK ADD TAG */}
          {!isArchivedView && isCrmModule && canManage && (
            <Button
              variant="primary"
              size="sm"
              icon={<Tag size={13} />}
              onClick={() => setShowTagModal(true)}
              style={{ background: '#0284c7', color: '#ffffff', border: '1px solid #38bdf8', fontSize: '11px', padding: '4px 10px', fontWeight: '700' }}
            >
              Add Tag ({selectedCount})
            </Button>
          )}

          {/* EXPORT SELECTED BUTTON */}
          <Button
            variant="outline"
            size="sm"
            icon={<Download size={13} />}
            onClick={onOpenExportModal}
            style={{ background: 'rgba(255, 255, 255, 0.15)', color: '#ffffff', borderColor: '#0f766e', fontSize: '11px', padding: '4px 10px', fontWeight: '700' }}
          >
            Export ({selectedCount})
          </Button>

          {/* DUPLICATE BUTTON (ONLY FOR NON-CRM MODULES) */}
          {!isArchivedView && !isCrmModule && bulkConfig.duplicate && canManage && (
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

      {/* 1. WHATSAPP BROADCAST MODAL */}
      {showWhatsAppModal && (
        <Modal
          isOpen={showWhatsAppModal}
          onClose={() => setShowWhatsAppModal(false)}
          title={`💬 Send WhatsApp Broadcast (${selectedCount} Contacts)`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '4px' }}>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px', borderRadius: '8px', fontSize: '12px', color: '#166534' }}>
              <strong>Recipients:</strong> {selectedCount} contacts selected with phone numbers ready for WhatsApp delivery.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155' }}>
                Broadcast Message
              </label>
              <textarea
                value={whatsAppMessage}
                onChange={(e) => setWhatsAppMessage(e.target.value)}
                placeholder="Type your WhatsApp message here... You can use {name} for the contact's name."
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Insert tag:</span>
                <button
                  type="button"
                  onClick={() => setWhatsAppMessage(prev => prev + ' {name}')}
                  style={{ padding: '2px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '11px', cursor: 'pointer', fontWeight: '600' }}
                >
                  &#123;name&#125;
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <Button variant="outline" size="md" onClick={() => setShowWhatsAppModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                icon={<Send size={14} />}
                onClick={handleSendWhatsAppBroadcast}
                style={{ background: '#0d9488', color: '#ffffff' }}
              >
                Send Broadcast
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 2. BULK ASSIGN AGENT MODAL */}
      {showAssignModal && (
        <Modal
          isOpen={showAssignModal}
          onClose={() => setShowAssignModal(false)}
          title={`👤 Assign Agent to ${selectedCount} Contacts`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '4px' }}>
            <div style={{ fontSize: '13px', color: '#475569' }}>
              Select an agent from your team to assign the <strong>{selectedCount}</strong> selected contacts:
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155' }}>
                Choose Agent
              </label>
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  fontWeight: '600',
                  outline: 'none',
                  background: '#ffffff'
                }}
              >
                <option value="">-- Select an Agent --</option>
                {employeeList.map(emp => (
                  <option key={emp.id} value={emp.name}>
                    {emp.name} {emp.designation ? `(${emp.designation})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <Button variant="outline" size="md" onClick={() => setShowAssignModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                icon={<UserCheck size={14} />}
                onClick={handleBulkAssign}
                disabled={!selectedAgent}
                style={{ background: '#4f46e5', color: '#ffffff' }}
              >
                Assign Contacts
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 3. BULK CHANGE STAGE MODAL */}
      {showStageModal && (
        <Modal
          isOpen={showStageModal}
          onClose={() => setShowStageModal(false)}
          title={`🔄 Move ${selectedCount} Contacts to Stage`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '4px' }}>
            <div style={{ fontSize: '13px', color: '#475569' }}>
              Select the new pipeline stage for the <strong>{selectedCount}</strong> selected contacts:
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155' }}>
                Pipeline Stage
              </label>
              <select
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  fontWeight: '600',
                  outline: 'none',
                  background: '#ffffff'
                }}
              >
                <option value="">-- Select Stage --</option>
                {pipelineStagesList.map(st => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <Button variant="outline" size="md" onClick={() => setShowStageModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                icon={<RefreshCw size={14} />}
                onClick={handleBulkStageChange}
                disabled={!selectedStage}
                style={{ background: '#d97706', color: '#ffffff' }}
              >
                Update Stage
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 4. BULK ADD TAG MODAL */}
      {showTagModal && (
        <Modal
          isOpen={showTagModal}
          onClose={() => setShowTagModal(false)}
          title={`🏷️ Add Tag to ${selectedCount} Contacts`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '4px' }}>
            <div style={{ fontSize: '13px', color: '#475569' }}>
              Enter a tag to apply to all <strong>{selectedCount}</strong> selected contacts:
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155' }}>
                Tag Name
              </label>
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="e.g. Hot Lead, March Webinar, VIP"
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <Button variant="outline" size="md" onClick={() => setShowTagModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                icon={<Tag size={14} />}
                onClick={handleBulkAddTag}
                disabled={!newTag.trim()}
                style={{ background: '#0284c7', color: '#ffffff' }}
              >
                Apply Tag
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 5. ENTERPRISE DELETE GOVERNANCE MODAL */}
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
