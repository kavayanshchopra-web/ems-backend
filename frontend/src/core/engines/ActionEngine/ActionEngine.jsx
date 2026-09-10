/**
 * UNIVERSAL ACTION ENGINE ORCHESTRATOR
 * Core Action Handler Managing Add, Edit, View, Archive & Restore Workflows
 */

import React, { useState } from 'react';
import UniversalModal from './UniversalModal';
import UniversalDrawer from './UniversalDrawer';
import ConfirmationModal from './ConfirmationModal';
import ArchivedModal from './ArchivedModal';
import { LabelEngine } from '../LabelEngine';
import { getNextSequentialId } from '../../../services/atsStorageService';

import FirebaseCloudEngine from '../FirebaseCloudEngine';
import GhlSyncBridge from '../../services/ghlSyncBridge';
import { AuditEngine } from '../AuditEngine/AuditEngine';
import { db, doc, setDoc, createEmployeeAuthAccount } from '../../../firebase.js';
import { isSandboxEnvironment, SupabaseSandboxService } from '../../services/supabaseSandboxService';

export default function ActionEngine({
  moduleConfig = {},
  records = [],
  setRecords = () => {},
  showAddModal = false,
  setShowAddModal = () => {},
  showEditModal = false,
  setShowEditModal = () => {},
  showDetailModal = false,
  setShowDetailModal = () => {},
  showArchiveModal = false,
  setShowArchiveModal = () => {},
  showArchivedModal = false,
  setShowArchivedModal = () => {},
  recordToArchive = null,
  setRecordToArchive = () => {},
  selectedRecord = null,
  setSelectedRecord = () => {},
  canManage = true,
  systemDropdowns = null,
  activePipelineStages = [],
  allPositions = [],
  archivedModuleItems = [],
  handleRestoreBinItem = () => {},
  handlePermanentDeleteBinItem = () => {},
  softDeleteRecord = () => {},
  showToast = () => {},
  authUser = null
}) {
  const [internalRecordToArchive, setInternalRecordToArchive] = useState(null);

  const handleSaveRecord = async (formData) => {
    const now = new Date().toISOString();
    const entityName = LabelEngine.getEntityName(moduleConfig);
    const activeTenantId = authUser?.tenantId || authUser?.companyId || authUser?.tenant_id || FirebaseCloudEngine.getTenantId();

    const normalizedData = {
      ...formData,
      name: formData.name || formData.fullName || formData.employeeName || formData.candidateName || formData.title || '',
      tenantId: activeTenantId
    };

    const isCrmModule = moduleConfig.moduleId === 'crm_deals' || moduleConfig.moduleId === 'crm_leads' || moduleConfig.moduleId === 'crm' || moduleConfig.moduleId === 'contacts';
    const isEmployeesModule = moduleConfig.moduleId === 'employees';
    const API_URL = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
      ? 'http://localhost:5000/api'
      : 'https://api.employeemanagementsystems.com/api';
    const token = typeof window !== 'undefined' ? localStorage.getItem('omnilflow_token') : null;

    // Strict Duplicate Prevention on Phone Number & Gmail ID for Contacts/CRM (Applies to both Sandbox & Production)
    if (isCrmModule) {
      const cleanPhoneDigits = (normalizedData.phone || '').replace(/\D/g, '');
      const normPhone10 = cleanPhoneDigits.length >= 7 ? cleanPhoneDigits.slice(-10) : '';
      const cleanEmail = (normalizedData.email || '').toLowerCase().trim();

      const existingDup = (records || []).find(r => {
        if (!r) return false;
        if (showEditModal && selectedRecord && r.id === selectedRecord.id) return false;

        const rPhoneDigits = String(r.phone || r.phoneNumber || r.id || '').replace(/\D/g, '');
        const rNormPhone10 = rPhoneDigits.length >= 7 ? rPhoneDigits.slice(-10) : '';
        const rEmail = String(r.email || '').toLowerCase().trim();

        const phoneMatch = normPhone10 && rNormPhone10 && normPhone10 === rNormPhone10;
        const emailMatch = cleanEmail && rEmail && cleanEmail === rEmail;
        return phoneMatch || emailMatch;
      });

      if (existingDup && !showEditModal) {
        const dupName = existingDup.name || existingDup.contactName || existingDup.customerName || existingDup.phone || 'Existing Contact';
        if (showToast) {
          showToast(`⚠️ Duplicate Blocked: A contact with this Phone or Email already exists ("${dupName}")`, 'error');
        }
        return; // Prevent duplicate insertion
      }
    }

    // DIRECT SUPABASE POSTGRESQL FOR SANDBOX ENVIRONMENT
    if (isSandboxEnvironment()) {
      const numericTenantId = Number(activeTenantId) || 1;
      if (isEmployeesModule) {
        if (showEditModal && selectedRecord && selectedRecord.id) {
          try {
            const saved = await SupabaseSandboxService.updateEmployee(selectedRecord.id, normalizedData, numericTenantId);
            const updatedList = records.map(r => r.id === selectedRecord.id ? { ...r, ...saved, ...normalizedData } : r);
            setRecords(updatedList);
            showToast(`🎉 Updated employee "${saved.name || normalizedData.name}" directly in Supabase SQL!`, 'success');
            setShowEditModal(false);
            return;
          } catch (sbErr) {
            showToast(sbErr.message || 'Failed to update employee in Supabase SQL', 'error');
            return;
          }
        } else {
          try {
            const saved = await SupabaseSandboxService.createEmployee(normalizedData, numericTenantId);
            const newRec = {
              ...saved,
              ...normalizedData,
              id: saved.id,
              name: saved.name || normalizedData.name,
              createdAt: now,
              updatedAt: now,
              archived: false,
              lifecycleStatus: 'ACTIVE',
              tenantId: numericTenantId
            };
            setRecords([newRec, ...records]);
            showToast(`🎉 Employee "${newRec.name}" saved directly to Supabase SQL!`, 'success');
            setShowAddModal(false);
            return;
          } catch (sbErr) {
            showToast(sbErr.message || 'Failed to save to Supabase SQL', 'error');
            return;
          }
        }
      } else if (moduleConfig.moduleId === 'contacts' || isCrmModule) {
        if (showEditModal && selectedRecord && selectedRecord.id) {
          try {
            const saved = await SupabaseSandboxService.updateContact(selectedRecord.id, normalizedData, numericTenantId);
            const updatedList = records.map(r => r.id === selectedRecord.id ? { ...r, ...saved, ...normalizedData } : r);
            setRecords(updatedList);
            showToast(`🎉 Contact updated directly in Supabase SQL!`, 'success');
            setShowEditModal(false);

            // Trigger real-time GHL outbound update
            GhlSyncBridge.pushSingleContactAuto(numericTenantId, { ...selectedRecord, ...normalizedData }).catch(() => {});
            return;
          } catch (sbErr) {
            showToast(sbErr.message || 'Failed to update contact in Supabase SQL', 'error');
            return;
          }
        } else {
          try {
            const cleanDigits = (normalizedData.phone || '').replace(/\D/g, '');
            const normPhone10 = cleanDigits.length >= 7 ? cleanDigits.slice(-10) : '';
            const formattedPhone = normPhone10 
              ? `+91 ${normPhone10.slice(0, 5)} ${normPhone10.slice(5)}` 
              : (normalizedData.phone || '');

            const saved = await SupabaseSandboxService.createContact({
              ...normalizedData,
              phone: cleanDigits || normalizedData.phone
            }, numericTenantId);

            const newRec = {
              ...saved,
              ...normalizedData,
              phone: formattedPhone,
              rawPhone: cleanDigits,
              _dedupKey: normPhone10 ? `phone_${normPhone10}` : (normalizedData.email ? `email_${normalizedData.email.trim().toLowerCase()}` : `id_${saved.id}`),
              createdAt: now,
              updatedAt: now,
              archived: false,
              lifecycleStatus: 'ACTIVE',
              tenantId: numericTenantId
            };

            // Deduplicate against existing records to ensure single card rendered
            const existingFiltered = (records || []).filter(r => {
              if (!r) return false;
              if (r.id === newRec.id) return false;
              if (newRec._dedupKey && r._dedupKey === newRec._dedupKey) return false;
              const rDigits = String(r.phone || r.phoneNumber || r.id || '').replace(/\D/g, '');
              const r10 = rDigits.length >= 7 ? rDigits.slice(-10) : '';
              if (normPhone10 && r10 && normPhone10 === r10) return false;
              return true;
            });

            setRecords([newRec, ...existingFiltered]);
            showToast(`🎉 Contact "${newRec.name}" saved directly to Supabase SQL!`, 'success');
            setShowAddModal(false);

            // Auto-trigger GHL Outbound push in Sandbox
            GhlSyncBridge.pushSingleContactAuto(numericTenantId, newRec).catch(err => {
              console.warn('[GHL Sandbox Outbound Push]', err);
            });

            return;
          } catch (sbErr) {
            showToast(sbErr.message || 'Failed to save contact to Supabase SQL', 'error');
            return;
          }
        }
      } else {
        // Universal Supabase persistence for all other modules (Expenses, Tasks, Leaves, Holidays, Notices, etc.)
        if (showEditModal && selectedRecord && selectedRecord.id) {
          try {
            const saved = await SupabaseSandboxService.saveUniversalRecord(moduleConfig.moduleId, normalizedData, numericTenantId, selectedRecord.id);
            const updatedList = records.map(r => r.id === selectedRecord.id ? { ...r, ...(typeof saved === 'object' ? saved : {}), ...normalizedData } : r);
            setRecords(updatedList);
            showToast(`🎉 Record updated directly in Supabase SQL!`, 'success');
            setShowEditModal(false);
            return;
          } catch (sbErr) {
            showToast(sbErr.message || 'Failed to update in Supabase SQL', 'error');
            return;
          }
        } else {
          try {
            const saved = await SupabaseSandboxService.saveUniversalRecord(moduleConfig.moduleId, normalizedData, numericTenantId);
            const newRec = {
              ...(typeof saved === 'object' ? saved : {}),
              ...normalizedData,
              id: (saved && saved.id) ? String(saved.id) : (normalizedData.id || `rec_${Date.now()}`),
              createdAt: now,
              updatedAt: now,
              archived: false,
              lifecycleStatus: 'ACTIVE',
              tenantId: numericTenantId
            };
            setRecords([newRec, ...records]);
            showToast(`🎉 Record saved directly to Supabase SQL!`, 'success');
            setShowAddModal(false);
            return;
          } catch (sbErr) {
            showToast(sbErr.message || 'Failed to save to Supabase SQL', 'error');
            return;
          }
        }
      }
    }

    if (showEditModal && selectedRecord && selectedRecord.id) {
      // EDIT WORKFLOW
      const updatedList = records.map(r => {
        if (r.id === selectedRecord.id) {
          return {
            ...r,
            ...normalizedData,
            updatedAt: now
          };
        }
        return r;
      });
      setRecords(updatedList);

      const editedRec = updatedList.find(r => r.id === selectedRecord.id);
      if (editedRec && moduleConfig.moduleId) {
        FirebaseCloudEngine.saveRecord(moduleConfig.moduleId, editedRec, activeTenantId);
      }

      // Sync CRM update with SQLite backend & GHL
      if (isCrmModule) {
        GhlSyncBridge.pushSingleContactAuto(activeTenantId, editedRec).catch(() => {});
        const crmEditPayload = {
          customName: normalizedData.contact || normalizedData.name || selectedRecord.customName,
          email: normalizedData.email,
          notes: normalizedData.notes,
          pipelineStage: normalizedData.status || normalizedData.stage,
          dealValue: parseFloat(normalizedData.amount || normalizedData.dealValue || 0)
        };
        fetch(`${API_URL}/contacts/${encodeURIComponent(selectedRecord.id)}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify(crmEditPayload)
        }).then(() => {
          fetch(`${API_URL}/v1/integrations/ghl/contacts/${encodeURIComponent(selectedRecord.id)}/sync`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
          }).catch(() => {});
        }).catch(e => console.warn('[CRM Update Error]', e));
      }

      AuditEngine.logRecordUpdated(
        moduleConfig.moduleId || 'module',
        normalizedData.name || selectedRecord.name || selectedRecord.title || String(selectedRecord.id),
        selectedRecord,
        normalizedData
      );

      showToast(`Updated ${entityName.toLowerCase()} "${normalizedData.name || selectedRecord.id}"`, 'success');
      setShowEditModal(false);
    } else {
      // CREATE WORKFLOW WITH SEQUENTIAL IDs (e.g. CON-0001, EMP-0001, ATS-001)
      const cleanPhone = (normalizedData.phone || '').replace(/[^0-9]/g, '');
      const nextSeqId = (isCrmModule && moduleConfig.moduleId !== 'contacts' && cleanPhone) 
        ? `${cleanPhone}@s.whatsapp.net` 
        : getNextSequentialId(activeTenantId, moduleConfig.moduleId || 'contacts', moduleConfig, records);

      const newRec = {
        id: nextSeqId,
        ...normalizedData,
        createdAt: now,
        updatedAt: now,
        archived: false,
        lifecycleStatus: 'ACTIVE',
        tenantId: activeTenantId
      };
      setRecords([newRec, ...records]);

      if (moduleConfig.moduleId) {
        FirebaseCloudEngine.saveRecord(moduleConfig.moduleId, newRec, activeTenantId);
      }

      // Sync new CRM Deal to SQLite backend & GHL
      if (isCrmModule) {
        GhlSyncBridge.pushSingleContactAuto(activeTenantId, newRec).catch(() => {});
        const crmPayload = {
          name: normalizedData.name || normalizedData.deal || normalizedData.title || 'New Deal',
          phone: cleanPhone || normalizedData.phone || '',
          stage: normalizedData.status || normalizedData.stage || 'lead',
          notes: normalizedData.notes || '',
          dealValue: parseFloat(normalizedData.amount || normalizedData.dealValue || 0),
          email: normalizedData.email || '',
          customName: normalizedData.contact || normalizedData.name || ''
        };

        fetch(`${API_URL}/contacts/crm-sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify(crmPayload)
        }).then(res => res.json()).then(data => {
          if (data.contact?.id) {
            fetch(`${API_URL}/v1/integrations/ghl/contacts/${encodeURIComponent(data.contact.id)}/sync`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
              }
            }).catch(() => {});
          }
        }).catch(err => console.warn('[CRM Sync Error]', err));
      }

      AuditEngine.logRecordCreated(
        moduleConfig.moduleId || 'module',
        newRec.name || newRec.title || String(newRec.id),
        newRec
      );

      // Save user credentials for workspace login if password is provided
      if (normalizedData.password) {
        const cleanEmpEmail = (normalizedData.email || '').toLowerCase().trim();
        const empFullName = normalizedData.name || normalizedData.title || 'Staff User';
        const empRole = normalizedData.role || 'employee';
        const empDept = normalizedData.department || 'Operations';

        // 1. Create real Firebase Auth Account
        (async () => {
          let createdUid = null;
          try {
            const authUserRes = await createEmployeeAuthAccount(cleanEmpEmail, normalizedData.password);
            if (authUserRes && authUserRes.uid) {
              createdUid = authUserRes.uid;
            }
          } catch (authErr) {
            console.warn('Firebase Auth create note:', authErr.message);
          }

          const targetUid = createdUid || `emp_user_${Date.now()}`;

          // 2. Save profile in Firestore
          if (db) {
            try {
              await setDoc(doc(db, 'user_profiles', targetUid), {
                uid: targetUid,
                email: cleanEmpEmail,
                name: empFullName,
                role: empRole,
                department: empDept,
                tenantId: activeTenantId,
                companyId: activeTenantId,
                createdAt: now
              }, { merge: true });

              await setDoc(doc(db, 'users', targetUid), {
                id: targetUid,
                email: cleanEmpEmail,
                name: empFullName,
                role: empRole,
                department: empDept,
                tenantId: activeTenantId,
                companyId: activeTenantId,
                createdAt: now
              }, { merge: true });
            } catch (dbErr) {
              console.warn('Firestore profile sync error:', dbErr.message);
            }
          }
        })();

        try {
          const userAccountObj = {
            email: cleanEmpEmail,
            password: normalizedData.password,
            name: empFullName,
            role: empRole,
            department: empDept,
            tenantId: activeTenantId
          };
          const savedAccounts = JSON.parse(localStorage.getItem('omniflow_registered_users') || '[]');
          const updatedAccounts = [userAccountObj, ...savedAccounts.filter(a => a.email !== cleanEmpEmail)];
          localStorage.setItem('omniflow_registered_users', JSON.stringify(updatedAccounts));
        } catch (e) {}
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('omnilflow_config_updated', {
          detail: { moduleId: moduleConfig.moduleId }
        }));
      }

      showToast(`Added ${entityName.toLowerCase()} "${newRec.name || newRec.title || newRec.id}"`, 'success');
      setShowAddModal(false);
    }

    // Broadcast media vault refresh if any field (system or custom like TEST) contains a file or URL
    if (typeof window !== 'undefined' && normalizedData) {
      const isMediaFileVal = (val) => {
        if (!val || typeof val !== 'string' || val === '—' || val.trim() === '') return false;
        const lower = val.toLowerCase();
        if (lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('data:')) return true;
        const fileExts = ['.png', '.jpg', '.jpeg', '.pdf', '.webp', '.doc', '.docx', '.svg', '.gif', '.xls', '.xlsx'];
        return fileExts.some(ext => lower.endsWith(ext));
      };

      const hasFileVal = Object.values(normalizedData).some(isMediaFileVal);
      if (hasFileVal) {
        window.dispatchEvent(new CustomEvent('media_vault_updated', {
          detail: { moduleId: moduleConfig.moduleId }
        }));
      }
    }
  };

  const handleTriggerArchivePrompt = (record) => {
    if (!record) return;
    if (setRecordToArchive) setRecordToArchive(record);
    setInternalRecordToArchive(record);
    setShowArchiveModal(true);
  };

  const handleConfirmArchive = () => {
    const record = recordToArchive || internalRecordToArchive || selectedRecord;
    if (!record) return;

    const nameStr = record.name || record.title || 'Record';
    const entityName = LabelEngine.getEntityName(moduleConfig);

    const archivedRecordObject = {
      ...record,
      archived: true,
      lifecycleStatus: 'ARCHIVED',
      archivedAt: new Date().toISOString()
    };

    if (isSandboxEnvironment()) {
      const numericTenantId = Number(authUser?.tenantId || authUser?.companyId || authUser?.tenant_id) || 1;
      SupabaseSandboxService.deleteUniversalRecord(moduleConfig.moduleId, record.id, numericTenantId).catch(console.error);
    } else if (moduleConfig.moduleId && record.id) {
      FirebaseCloudEngine.deleteRecord(moduleConfig.moduleId, record.id);
    }

    if (typeof softDeleteRecord === 'function') {
      softDeleteRecord({
        originalId: record.id,
        name: `${entityName}: "${nameStr}"`,
        category: `${entityName} Record`,
        entityData: { record: archivedRecordObject, candidate: archivedRecordObject },
        moduleTab: moduleConfig.moduleId
      });
    }

    const updatedList = (records || []).filter(r => r && r.id !== record?.id);
    setRecords(updatedList);

    // Broadcast config/data update event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('omnilflow_config_updated', {
        detail: { moduleId: moduleConfig.moduleId || 'recruitment_ats' }
      }));
    }

    showToast(`📦 Archived ${entityName.toLowerCase()} "${nameStr}". Accessible in Archived Records.`, 'info');

    setShowArchiveModal(false);
    if (setRecordToArchive) setRecordToArchive(null);
    setInternalRecordToArchive(null);
    setShowDetailModal(false);
    setShowEditModal(false);
  };

  const handleRestoreArchivedRecord = (item) => {
    if (!item) return;
    const payloadRec = item.payload?.record || item.entityData?.record || item.payload?.candidate || item.payload || {};
    const entityName = LabelEngine.getEntityName(moduleConfig);

    const restoredRecord = {
      ...payloadRec,
      id: item.originalId || payloadRec.id || `${moduleConfig.moduleId}_${Date.now()}`,
      archived: false,
      is_archived: 0,
      lifecycleStatus: 'ACTIVE',
      updatedAt: new Date().toISOString()
    };

    setRecords([restoredRecord, ...(records || []).filter(r => r && r.id !== restoredRecord.id)]);

    if (moduleConfig.moduleId) {
      FirebaseCloudEngine.saveRecord(moduleConfig.moduleId, restoredRecord, 'acme_corp');
    }

    if (typeof handleRestoreBinItem === 'function') {
      handleRestoreBinItem(item);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('omnilflow_config_updated', {
        detail: { moduleId: moduleConfig.moduleId || 'recruitment_ats' }
      }));
    }

    showToast(`🔄 Restored ${entityName.toLowerCase()} "${restoredRecord.name || restoredRecord.title || 'Record'}".`, 'success');
  };

  const handleMoveStage = (recordId, newStage) => {
    let movedRec = null;
    const updatedList = records.map(r => {
      if (String(r.id) === String(recordId)) {
        movedRec = { ...r, status: newStage, stage: newStage, updatedAt: new Date().toISOString() };
        return movedRec;
      }
      return r;
    });
    setRecords(updatedList);

    if (movedRec && moduleConfig.moduleId) {
      FirebaseCloudEngine.saveRecord(moduleConfig.moduleId, movedRec, 'acme_corp');
    }

    showToast(`Moved record to ${newStage}`, 'info');

    if (selectedRecord && String(selectedRecord.id) === String(recordId)) {
      setSelectedRecord(prev => prev ? { ...prev, status: newStage, stage: newStage } : null);
    }
  };

  const archiveRecordTarget = recordToArchive || internalRecordToArchive || selectedRecord;
  const targetName = archiveRecordTarget ? (archiveRecordTarget.name || archiveRecordTarget.title || 'Record') : 'Record';
  const targetEntity = LabelEngine.getEntityName(moduleConfig);

  return (
    <>
      {/* ADD RECORD MODAL */}
      {showAddModal && (
        <UniversalModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleSaveRecord}
          moduleConfig={moduleConfig}
          mode="create"
          systemDropdowns={systemDropdowns}
          activePipelineStages={activePipelineStages}
          allPositions={allPositions}
        />
      )}

      {/* EDIT RECORD MODAL */}
      {showEditModal && selectedRecord && (
        <UniversalModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSubmit={handleSaveRecord}
          moduleConfig={moduleConfig}
          initialRecord={selectedRecord}
          mode="edit"
          systemDropdowns={systemDropdowns}
          activePipelineStages={activePipelineStages}
          allPositions={allPositions}
        />
      )}

      {/* VIEW RECORD DRAWER */}
      {showDetailModal && selectedRecord && (
        <UniversalDrawer
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          record={selectedRecord}
          moduleConfig={moduleConfig}
          onEditRecord={(rec) => { setSelectedRecord(rec); setShowEditModal(true); }}
          onArchiveRecord={handleTriggerArchivePrompt}
          onMoveStage={handleMoveStage}
          canManage={canManage}
          systemDropdowns={systemDropdowns}
          activePipelineStages={activePipelineStages}
        />
      )}

      {/* ARCHIVE CONFIRMATION MODAL */}
      {showArchiveModal && (
        <ConfirmationModal
          isOpen={showArchiveModal}
          onClose={() => {
            setShowArchiveModal(false);
            if (setRecordToArchive) setRecordToArchive(null);
            setInternalRecordToArchive(null);
          }}
          onConfirm={handleConfirmArchive}
          title={`Archive ${targetEntity}`}
          message={`Are you sure you want to archive candidate "${targetName}"? Archived candidates can be restored later.`}
          confirmText="Archive"
          cancelText="Cancel"
        />
      )}
    </>
  );
}
