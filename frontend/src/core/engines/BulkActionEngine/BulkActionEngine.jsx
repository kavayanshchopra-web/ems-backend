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
  Send,
  AlertTriangle
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import { LabelEngine } from '../LabelEngine';
import { getNextSequentialId } from '../../../services/atsStorageService';
import FirebaseCloudEngine from '../FirebaseCloudEngine';
import { SupabaseSandboxService, isSandboxEnvironment } from '../../services/supabaseSandboxService';
import frontendWalletService from '../../services/universalWalletService';
import { DEFAULT_WHATSAPP_TEMPLATES } from '../../services/whatsAppTemplateService';
import TrashVaultEngine from '../TrashVaultEngine';

export default function BulkActionEngine({
  selectedIds = [],
  setSelectedIds = () => {},
  visibleRecords = [],
  records = [],
  setRecords = () => {},
  moduleConfig = {},
  softDeleteRecord = null,
  handleRestoreBinItem = null,
  handlePermanentDeleteBinItem = null,
  showToast = () => {},
  canManage = true,
  isArchivedView = false,
  onOpenExportModal = () => {},
  systemDropdowns = null,
  activePipelineStages = [],
  authUser = null
}) {
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showStageModal, setShowStageModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [showRemoveTagModal, setShowRemoveTagModal] = useState(false);
  const [tagToRemove, setTagToRemove] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  // Form states for bulk modals
  const [whatsAppMessage, setWhatsAppMessage] = useState('');
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
  const [broadcastProgressText, setBroadcastProgressText] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const [newTag, setNewTag] = useState('');

  // Collect all unique tags in currently selected contacts for 1-click removal
  const availableTagsInSelection = useMemo(() => {
    const idsSet = new Set(selectedIds || []);
    const tagsSet = new Set();
    (records || []).forEach(r => {
      if (r && idsSet.has(r.id) && r.tags) {
        String(r.tags).split(',').forEach(t => {
          const clean = t.trim();
          if (clean) tagsSet.add(clean);
        });
      }
    });
    return Array.from(tagsSet);
  }, [selectedIds, records]);

  // Check if current module is CRM / Contacts
  const modId = String(moduleConfig.moduleId || moduleConfig.id || '').toLowerCase();
  const cat = String(moduleConfig.category || '').toLowerCase();
  const isCrmModule = modId.includes('contact') || modId.includes('lead') || cat.includes('crm') || cat.includes('sales');

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
  const handleBulkArchive = async () => {
    const idsSet = new Set(selectedIds || []);
    const now = new Date().toISOString();
    const activeTenant = authUser?.companyId || authUser?.tenantId || authUser?.tenant_id || 1;
    const numTenant = Number(activeTenant) || 1;

    const matchedRecords = (records || []).filter(r => 
      r && (idsSet.has(r.id) || idsSet.has(r.displayId) || idsSet.has(r.originalId))
    );

    if (matchedRecords.length === 0) return;

    // A. Direct Supabase Sandbox batch update to is_archived: true
    if (isSandboxEnvironment()) {
      const dbIds = matchedRecords.map(r => r.id || r.originalId).filter(Boolean);
      await SupabaseSandboxService.bulkArchiveContacts(dbIds, numTenant, true).catch(err => 
        console.warn('Sandbox bulkArchive error:', err)
      );
    }

    // B. Call softDeleteRecord for each to sync with vault
    matchedRecords.forEach(r => {
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
    });

    const remaining = (records || []).filter(r => 
      r && !idsSet.has(r.id) && !idsSet.has(r.displayId) && !idsSet.has(r.originalId)
    );
    setRecords(remaining);
    setSelectedIds([]);
    showToast(`Archived ${matchedRecords.length} ${entityNamePlural.toLowerCase()}`, 'success');

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('omnilflow_config_updated', {
        detail: { moduleId: moduleConfig.moduleId || 'contacts' }
      }));
    }

    showToast(`📦 Archived ${selectedCount} ${selectedCount === 1 ? entityName.toLowerCase() : entityNamePlural.toLowerCase()}`, 'info');
  };

  // 3B. PERMANENT DELETE SELECTED (From Active View)
  const handleBulkActiveDelete = async () => {
    setIsBulkDeleting(true);

    const idsSet = new Set(selectedIds || []);
    const activeTenant = authUser?.companyId || authUser?.tenantId || authUser?.tenant_id || 1;
    const numTenant = Number(activeTenant) || 1;

    const matchedRecords = (records || []).filter(r => 
      r && (idsSet.has(r.id) || idsSet.has(r.displayId) || idsSet.has(r.originalId))
    );

    if (matchedRecords.length === 0) return;

    const token = typeof window !== 'undefined' ? localStorage.getItem('omnilflow_token') : null;
    const API_URL = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
      ? 'http://localhost:5000/api'
      : 'https://api.employeemanagementsystems.com/api';

    // 1. Backend SQLite API Call for all matched items
    for (const r of matchedRecords) {
      const cleanId = String(r.id || r.displayId || r.originalId || '');
      if (cleanId) {
        fetch(`${API_URL}/contacts/${encodeURIComponent(cleanId)}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        }).catch(err => console.warn('SQLite purge contact error:', err.message));
      }
    }

    // 2. PostgreSQL / Supabase
    if (isSandboxEnvironment()) {
      const dbIds = matchedRecords.map(r => r.id || r.originalId).filter(Boolean);
      await SupabaseSandboxService.bulkDeleteContacts(dbIds, numTenant).catch(() => {});
      for (const r of matchedRecords) {
        if (r.email || r.phone) {
          await SupabaseSandboxService.deleteContact(r.id, numTenant, r.phone, r.email).catch(() => {});
        }
      }
    }

    // 3. Firebase Cloud Engine
    matchedRecords.forEach(r => {
      const cleanId = r.id || r.displayId || r.originalId;
      if (moduleConfig.moduleId && cleanId) {
        FirebaseCloudEngine.deleteRecord(moduleConfig.moduleId, cleanId);
      }
    });

    // 4. TrashVaultEngine: PURGE completely so it NEVER lands in Archive / Recycle Bin
    matchedRecords.forEach(r => {
      if (r.id) TrashVaultEngine.purgeItem('all', String(r.id));
      if (r.displayId) TrashVaultEngine.purgeItem('all', String(r.displayId));
      if (r.originalId) TrashVaultEngine.purgeItem('all', String(r.originalId));
    });

    // 5. Parent handlePermanentDeleteBinItem callback (if provided)
    if (typeof handlePermanentDeleteBinItem === 'function') {
      matchedRecords.forEach(r => {
        handlePermanentDeleteBinItem(r.id || r.originalId, r.name || r.title, true);
      });
    }

    const remaining = (records || []).filter(r => 
      r && !idsSet.has(r.id) && !idsSet.has(r.displayId) && !idsSet.has(r.originalId)
    );
    setRecords(remaining);
    setSelectedIds([]);
    setIsBulkDeleting(false);
    setShowBulkDeleteModal(false);
    showToast(`Permanently deleted ${matchedRecords.length} ${matchedRecords.length === 1 ? entityName.toLowerCase() : entityNamePlural.toLowerCase()}.`, 'success');
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
    setIsBulkDeleting(true);

    const idsSet = new Set(selectedIds || []);
    (selectedIds || []).forEach(id => {
      const rec = (records || []).find(r => r && (r.id === id || r.recycleBinId === id));
      const trueId = rec?.recycleBinId || rec?.id || id;
      TrashVaultEngine.purgeItem('all', String(trueId));
      if (typeof handlePermanentDeleteBinItem === 'function') {
        handlePermanentDeleteBinItem(trueId);
      } else if (typeof softDeleteRecord === 'function') {
        softDeleteRecord(trueId);
      }
    });

    const remaining = (records || []).filter(r => r && !idsSet.has(r.id) && !idsSet.has(r.recycleBinId));
    setRecords(remaining);
    setSelectedIds([]);
    setIsBulkDeleting(false);
    setShowBulkDeleteModal(false);
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
    const targetAgent = selectedAgent === '__unassign__' ? '' : selectedAgent;
    const idsSet = new Set(selectedIds || []);
    const updated = (records || []).map(r => {
      if (r && idsSet.has(r.id)) {
        return {
          ...r,
          assignedTo: targetAgent,
          employee: targetAgent,
          agentName: targetAgent,
          updatedAt: new Date().toISOString()
        };
      }
      return r;
    });
    setRecords(updated);
    showToast(targetAgent ? `👤 Assigned ${selectedCount} contacts to ${targetAgent}` : `👤 Cleared assigned agent for ${selectedCount} contacts`, 'success');
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

  // 9B. CRM BULK REMOVE TAG
  const handleBulkRemoveTag = () => {
    const cleanTag = tagToRemove.trim().toLowerCase();
    if (!cleanTag) return;
    const idsSet = new Set(selectedIds || []);
    let affectedCount = 0;
    const updated = (records || []).map(r => {
      if (r && idsSet.has(r.id)) {
        const existingTags = r.tags ? String(r.tags).split(',').map(t => t.trim()).filter(Boolean) : [];
        const nextTags = existingTags.filter(t => t.toLowerCase() !== cleanTag);
        if (nextTags.length !== existingTags.length) {
          affectedCount++;
        }
        return {
          ...r,
          tags: nextTags.join(', '),
          updatedAt: new Date().toISOString()
        };
      }
      return r;
    });
    setRecords(updated);
    showToast(`🏷️ Removed tag "${tagToRemove.trim()}" from ${affectedCount} contacts`, 'success');
    setSelectedIds([]);
    setShowRemoveTagModal(false);
    setTagToRemove('');
  };

  // 10. CRM BULK WHATSAPP BROADCAST (REAL-TIME ENGINE WITH WALLET DEDUCTION)
  const handleSendWhatsAppBroadcast = async () => {
    if (!whatsAppMessage.trim()) {
      showToast('⚠️ Please enter a message for WhatsApp broadcast', 'error');
      return;
    }

    const idsSet = new Set(selectedIds || []);
    const targetContacts = (records || []).filter(r => r && idsSet.has(r.id));
    if (targetContacts.length === 0) {
      showToast('⚠️ No contacts selected', 'error');
      return;
    }

    const isDesktop = typeof window !== 'undefined' && (Boolean(window.electronAPI) || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const API_URL = isDesktop ? 'http://localhost:5000/api' : 'https://api.employeemanagementsystems.com/api';
    const token = typeof window !== 'undefined' ? (localStorage.getItem('omnilflow_token') || localStorage.getItem('token')) : null;
    const activeTenant = authUser?.companyId || authUser?.tenantId || localStorage.getItem('activeTenantId') || localStorage.getItem('tenantId') || 1;

    setIsSendingBroadcast(true);

    try {
      // 1. Fetch active connected WhatsApp session
      let activeSession = null;
      try {
        const sRes = await fetch(`${API_URL}/sessions`, {
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            'x-tenant-id': String(activeTenant)
          }
        });
        const sData = await sRes.json();
        const connected = (Array.isArray(sData) ? sData : []).find(s => s.status === 'connected');
        if (connected) activeSession = connected.id;
      } catch (e) {
        console.warn('[BulkActionEngine] Session check notice:', e.message);
      }

      if (!activeSession) {
        showToast('⚠️ No connected WhatsApp session found. Please connect your WhatsApp channel first.', 'error');
        setIsSendingBroadcast(false);
        return;
      }

      // 2. Pre-flight Wallet Check
      const bulkRate = 0.30;
      const totalEstimatedCost = Number((targetContacts.length * bulkRate).toFixed(2));
      try {
        const wallet = await frontendWalletService.getWallet(activeTenant);
        const currentBal = wallet?.balance ?? 0;
        if (currentBal < totalEstimatedCost) {
          showToast(`❌ Insufficient Wallet Balance: Campaign cost is ₹${totalEstimatedCost}, but current balance is ₹${currentBal.toFixed(2)}. Please recharge float.`, 'error');
          setIsSendingBroadcast(false);
          return;
        }
      } catch (wErr) {
        console.warn('[BulkActionEngine] Pre-flight wallet notice:', wErr.message);
      }

      // 3. Send to each recipient with anti-ban delay and real-time wallet deduction
      let sentCount = 0;
      const timeNow = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

      for (let i = 0; i < targetContacts.length; i++) {
        const c = targetContacts[i];
        const rawP = c.phone || c.rawPhone || c.phoneNumber || c.mobile || c.id;
        const cleanDigits = String(rawP).replace(/\D/g, '');
        const norm10 = cleanDigits.length >= 7 ? cleanDigits.slice(-10) : '';
        const intlPhone = norm10 ? `91${norm10}` : cleanDigits;

        if (!intlPhone) continue;

        // Personalized text with {name} replacement
        const personalizedText = whatsAppMessage.replace(/\{name\}/gi, c.name || 'there').trim();

        setBroadcastProgressText(`Sending ${i + 1} of ${targetContacts.length} to ${c.name || intlPhone}...`);

        try {
          const sendRes = await fetch(`${API_URL}/messages/send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
              'x-tenant-id': String(activeTenant)
            },
            body: JSON.stringify({
              sessionId: activeSession,
              recipientJid: `${intlPhone}@s.whatsapp.net`,
              phone: intlPhone,
              text: personalizedText,
              messageType: 'whatsapp_bulk_broadcast',
              isBulk: true,
              tenantId: activeTenant
            })
          });

          if (sendRes.ok) {
            sentCount++;
          }

          // Deduct from wallet with bulk broadcast tier rate
          await frontendWalletService.deductForMessage({
            tenantId: activeTenant,
            messageType: 'whatsapp_bulk_broadcast',
            count: 1,
            recipientPhone: intlPhone,
            description: `Bulk campaign message to ${c.name || intlPhone}`
          }).catch(e => console.warn('[Bulk Deduct Notice]', e.message));

        } catch (sendErr) {
          console.warn(`[Bulk Send Failed for ${intlPhone}]:`, sendErr.message);
        }

        // Anti-ban randomized human spacing between sends (1.5s - 2.5s)
        if (i < targetContacts.length - 1) {
          const delayMs = 1500 + Math.floor(Math.random() * 1000);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }

      // Update contact records with note
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

      // Dispatch global wallet updated event so Billing Dashboard refreshes in real-time
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ems:wallet_updated', { detail: { tenantId: activeTenant } }));
      }

      showToast(`🎉 WhatsApp Broadcast dispatched! ${sentCount} messages delivered & float deducted.`, 'success');
      setSelectedIds([]);
      setShowWhatsAppModal(false);
      setWhatsAppMessage('');
    } catch (err) {
      console.error('[Bulk Broadcast Error]:', err);
      showToast(err.message || 'Error executing WhatsApp broadcast', 'error');
    } finally {
      setIsSendingBroadcast(false);
      setBroadcastProgressText('');
    }
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

          {/* CRM ACTION 4B: BULK REMOVE TAG */}
          {!isArchivedView && isCrmModule && canManage && (
            <Button
              variant="outline"
              size="sm"
              icon={<Tag size={13} />}
              onClick={() => setShowRemoveTagModal(true)}
              style={{ background: 'rgba(225, 29, 72, 0.12)', color: '#f43f5e', border: '1px solid #fda4af', fontSize: '11px', padding: '4px 10px', fontWeight: '700' }}
            >
              Remove Tag ({selectedCount})
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
              onClick={() => setShowBulkDeleteModal(true)}
              style={{ background: '#fff1f2', color: '#fca5a5', borderColor: '#ef4444', fontSize: '11px', padding: '4px 10px' }}
            >
              Permanent Delete ({selectedCount})
            </Button>
          )}

          {/* DELETE BUTTON (ACTIVE VIEW PERMANENT DELETE) */}
          {!isArchivedView && bulkConfig.delete && canManage && (
            <Button
              variant="outline"
              size="sm"
              icon={<Trash2 size={13} />}
              onClick={() => setShowBulkDeleteModal(true)}
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
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px', borderRadius: '8px', fontSize: '12px', color: '#166534', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>Recipients:</strong> {selectedCount} contacts ready for WhatsApp delivery
              </div>
              <div style={{ fontWeight: '700', color: '#0f766e', background: '#ccfbf1', padding: '3px 8px', borderRadius: '5px' }}>
                Est. Cost: ₹{(selectedCount * 0.30).toFixed(2)} (@ ₹0.30/msg)
              </div>
            </div>

            {broadcastProgressText && (
              <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', color: '#065f46', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
                <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                <span>{broadcastProgressText}</span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Choose WhatsApp Template (Optional)</span>
                {selectedTemplateId && (
                  <span
                    style={{ fontSize: '11px', color: '#0d9488', cursor: 'pointer', fontWeight: '600' }}
                    onClick={() => { setSelectedTemplateId(''); setWhatsAppMessage(''); }}
                  >
                    Clear Template
                  </span>
                )}
              </label>
              <select
                value={selectedTemplateId}
                disabled={isSendingBroadcast}
                onChange={(e) => {
                  const tId = e.target.value;
                  setSelectedTemplateId(tId);
                  const found = (DEFAULT_WHATSAPP_TEMPLATES || []).find(t => t.id === tId);
                  if (found) {
                    setWhatsAppMessage(found.content);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '7px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  fontWeight: '600',
                  outline: 'none',
                  background: '#ffffff'
                }}
              >
                <option value="">-- Custom Message (No Template) --</option>
                {(DEFAULT_WHATSAPP_TEMPLATES || []).map(t => (
                  <option key={t.id} value={t.id}>
                    [{t.category}] {t.title}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155' }}>
                Broadcast Message Content
              </label>
              <textarea
                value={whatsAppMessage}
                disabled={isSendingBroadcast}
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
                  boxSizing: 'border-box',
                  opacity: isSendingBroadcast ? 0.7 : 1
                }}
              />
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Insert tag:</span>
                <button
                  type="button"
                  disabled={isSendingBroadcast}
                  onClick={() => setWhatsAppMessage(prev => prev + ' {name}')}
                  style={{ padding: '2px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '11px', cursor: 'pointer', fontWeight: '600' }}
                >
                  &#123;name&#125;
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <Button variant="outline" size="md" disabled={isSendingBroadcast} onClick={() => setShowWhatsAppModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                icon={<Send size={14} />}
                onClick={handleSendWhatsAppBroadcast}
                disabled={isSendingBroadcast || !whatsAppMessage.trim()}
                style={{
                  background: isSendingBroadcast ? '#94a3b8' : '#0d9488',
                  color: '#ffffff',
                  cursor: isSendingBroadcast ? 'not-allowed' : 'pointer'
                }}
              >
                {isSendingBroadcast ? 'Sending Broadcast...' : 'Send Broadcast'}
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
                <option value="__unassign__" style={{ color: '#ef4444', fontWeight: 'bold' }}>❌ Unassign (Clear Agent)</option>
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

      {/* 4B. BULK REMOVE TAG MODAL */}
      {showRemoveTagModal && (
        <Modal
          isOpen={showRemoveTagModal}
          onClose={() => setShowRemoveTagModal(false)}
          title={`🏷️ Remove Tag from ${selectedCount} Contacts`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '4px' }}>
            <div style={{ fontSize: '13px', color: '#475569' }}>
              Select or type a tag to strip from all <strong>{selectedCount}</strong> selected contacts:
            </div>

            {availableTagsInSelection.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569' }}>
                  Tags Detected in Current Selection (Click to Choose):
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '120px', overflowY: 'auto', padding: '4px 0' }}>
                  {availableTagsInSelection.map(t => {
                    const isSelected = tagToRemove.toLowerCase() === t.toLowerCase();
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTagToRemove(t)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          border: '1px solid ' + (isSelected ? '#e11d48' : '#cbd5e1'),
                          background: isSelected ? '#ffe4e6' : '#ffffff',
                          color: isSelected ? '#e11d48' : '#334155',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        🏷️ {t}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155' }}>
                Tag Name to Remove
              </label>
              <input
                type="text"
                value={tagToRemove}
                onChange={(e) => setTagToRemove(e.target.value)}
                placeholder="e.g. PAYMENT_FAILED or HighLevel"
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
              <Button variant="outline" size="md" onClick={() => setShowRemoveTagModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                icon={<Tag size={14} />}
                onClick={handleBulkRemoveTag}
                disabled={!tagToRemove.trim()}
                style={{ background: '#e11d48', color: '#ffffff' }}
              >
                Remove Tag
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 5. THEMED BULK PERMANENT DELETE CONFIRMATION MODAL */}
      {showBulkDeleteModal && (
        <Modal
          isOpen={showBulkDeleteModal}
          onClose={() => !isBulkDeleting && setShowBulkDeleteModal(false)}
          title={`🗑️ Permanently Delete (${selectedCount} ${entityNamePlural})`}
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
              <AlertTriangle size={22} style={{ color: '#dc2626', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '13px', lineHeight: '1.5', color: '#1e293b' }}>
                <strong style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: '#991b1b' }}>
                  Permanently delete {selectedCount} {selectedCount === 1 ? entityName.toLowerCase() : entityNamePlural.toLowerCase()}?
                </strong>
                Are you sure you want to permanently delete {selectedCount > 1 ? `these ${selectedCount} selected ${entityNamePlural.toLowerCase()}` : `this ${entityName.toLowerCase()}`}?
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <Button
                variant="outline"
                size="md"
                onClick={() => setShowBulkDeleteModal(false)}
                disabled={isBulkDeleting}
              >
                Cancel
              </Button>

              <Button
                variant="primary"
                size="md"
                icon={<Trash2 size={14} />}
                onClick={isArchivedView ? handleBulkPermanentDelete : handleBulkActiveDelete}
                disabled={isBulkDeleting}
                style={{ background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)', color: '#ffffff', border: 'none', fontWeight: '700' }}
              >
                {isBulkDeleting ? 'Deleting...' : `Permanent Delete (${selectedCount})`}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
