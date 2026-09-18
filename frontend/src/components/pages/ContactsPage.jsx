/**
 * CRM CONTACTS & LEADS MASTER PAGE (GHL 2-WAY SYNC HUB)
 * Fully Dynamic Universal Engine Roster with HighLevel Bidirectional Sync & Strict Deduplication
 */

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useModuleRegistry } from '../../core/registry/useModuleRegistry';
import LayoutEngine from '../../core/engines/LayoutEngine/LayoutEngine';
import FirebaseCloudEngine from '../../core/engines/FirebaseCloudEngine';
import TenantStorage from '../../core/services/TenantStorage';
import { db } from '../../firebase';
import { collection, onSnapshot, doc, deleteDoc, query, where } from 'firebase/firestore';
import { RefreshCw, Zap, Trash2 } from 'lucide-react';
import { normalizePhone10, formatPhoneDisplay, toE164Phone } from '../../core/utils/phoneUtils';
import { SupabaseSandboxService, isSandboxEnvironment } from '../../core/services/supabaseSandboxService';
import GhlOAuthService from '../../core/services/ghlOAuthService';
import GhlSyncBridge from '../../core/services/ghlSyncBridge';

export default function ContactsPage({
  authUser = null,
  contacts: propContacts = [],
  setContacts: setPropContacts = () => {},
  showToast = () => {},
  recycleBinItems = [],
  handleRestoreBinItem = () => {},
  handlePermanentDeleteBinItem = () => {},
  softDeleteRecord = () => {},
  openModuleConfigModal = null,
  systemDropdowns = null,
  activePipelineStages = [],
  onManageStages = () => {},
  onOpenChatWithLead = null
}) {
  const rawCompanyId = authUser?.tenantId || authUser?.companyId || authUser?.tenant_id || '1';
  let numericCompanyId = Number(rawCompanyId);
  if (isNaN(numericCompanyId) || numericCompanyId <= 0) {
    numericCompanyId = 1;
  }
  const companyId = String(numericCompanyId);
  const { config } = useModuleRegistry(companyId, 'contacts');

  const [isSyncingGhl, setIsSyncingGhl] = useState(false);
  const [ghlLocationStatus, setGhlLocationStatus] = useState(null);

  const userRole = String(authUser?.role || 'employee').toLowerCase().trim();
  const userEmpId = String(authUser?.employeeId || authUser?.id || '').toLowerCase().trim();
  const userEmail = String(authUser?.email || '').toLowerCase().trim();
  const userName = String(authUser?.name || authUser?.fullName || '').toLowerCase().trim();
  const isSuperOrAdmin = ['superadmin', 'super_admin', 'owner', 'company_admin', 'admin'].includes(userRole);
  const isManager = userRole === 'manager' || userRole.includes('manager');

  const [companyEmployees, setCompanyEmployees] = useState([]);

  useEffect(() => {
    let isMounted = true;
    const loadEmployees = async () => {
      try {
        const emps = await SupabaseSandboxService.fetchEmployees(numericCompanyId);
        if (isMounted && Array.isArray(emps) && emps.length > 0) {
          setCompanyEmployees(emps);
        }
      } catch (e) {
        console.warn('[ContactsPage] Failed to fetch employees for dropdown:', e);
      }
    };
    loadEmployees();
    return () => { isMounted = false; };
  }, [numericCompanyId]);

  const enhancedSystemDropdowns = useMemo(() => {
    return {
      ...(systemDropdowns || {}),
      employees: (companyEmployees && companyEmployees.length > 0)
        ? companyEmployees
        : (systemDropdowns?.employees || [])
    };
  }, [systemDropdowns, companyEmployees]);

  const isContactVisibleToUser = (r) => {
    if (!r) return false;
    const itemTenant = String(r.tenant_id ?? r.tenantId ?? '');
    if (itemTenant && itemTenant !== companyId) return false;

    // Owners and SuperAdmins have full visibility of all company contacts
    if (isSuperOrAdmin) return true;

    const assignedVal = String(r.assigned_to || r.assignedTo || r.employee || r.agent || '').toLowerCase().trim();

    // Managers see leads assigned to them, or leads with their name/id, or unassigned/manager-defaulted leads
    if (isManager) {
      if (!assignedVal || assignedVal === 'unassigned' || assignedVal === 'manager' || assignedVal.includes('manager')) return true;
      if (userEmpId && (assignedVal === userEmpId || assignedVal.includes(userEmpId))) return true;
      if (userEmail && assignedVal === userEmail) return true;
      if (userName && (assignedVal === userName || assignedVal.includes(userName) || userName.includes(assignedVal))) return true;
      return false;
    }

    // Employees strictly see assigned contacts only (their name, email, or employee ID)
    if (assignedVal) {
      if (userEmpId && (assignedVal === userEmpId || assignedVal.includes(userEmpId))) return true;
      if (userEmail && assignedVal === userEmail) return true;
      if (userName && (assignedVal === userName || assignedVal.includes(userName) || userName.includes(assignedVal))) return true;
    }
    return false;
  };

  // Initialize records strictly scoped to active tenant and Model A role
  const [internalRecords, setInternalRecords] = useState(() => {
    let source = [];
    if (Array.isArray(propContacts) && propContacts.length > 0) {
      source = propContacts;
    } else if (!isSandboxEnvironment()) {
      source = TenantStorage.getItem('contacts', companyId, []) || [];
    }
    return (source || []).filter(isContactVisibleToUser);
  });

  // Sync when propContacts arrives or updates from parent
  useEffect(() => {
    if (Array.isArray(propContacts)) {
      const tenantScoped = propContacts.filter(isContactVisibleToUser);
      setInternalRecords(tenantScoped);
    }
  }, [propContacts, companyId, userRole, userEmpId, userEmail, userName]);

  const isDesktop = typeof window !== 'undefined' && (Boolean(window.electronAPI) || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const API_URL = isDesktop
    ? 'http://localhost:5000/api'
    : 'https://api.employeemanagementsystems.com/api';
  const token = typeof window !== 'undefined' ? (localStorage.getItem('omnilflow_token') || localStorage.getItem('token')) : null;

  // Real-Time Deduplication and Merge Helper
  const processAndMergeRecords = (currentList, newDocs) => {
    if (!Array.isArray(newDocs) || newDocs.length === 0) return currentList;

    const dedupMap = new Map();

    // 1. Add existing valid items into dedupMap
    (currentList || []).forEach(item => {
      if (!item) return;
      let key = item._dedupKey;
      if (!key) {
        const rDigits = String(item.phone || item.phoneNumber || item.id || '').replace(/\D/g, '');
        const rNorm10 = rDigits.length >= 7 ? rDigits.slice(-10) : '';
        const rEmail = String(item.email || '').trim().toLowerCase();
        if (rNorm10) key = `phone_${rNorm10}`;
        else if (rEmail && rEmail.includes('@')) key = `email_${rEmail}`;
        else key = item.id;
      }
      if (key) dedupMap.set(key, { ...item, _dedupKey: key });
    });

    // 2. Process and sanitize each incoming document
    newDocs.forEach(d => {
      if (!d) return;

      const rawId = String(d.id || '');

      // A. FILTER OUT JUNK / SYSTEM CHATS / GROUPS / BROADCASTS / STATUS
      if (
        rawId.endsWith('@g.us') || 
        rawId.endsWith('@broadcast') || 
        rawId.endsWith('@newsletter') || 
        rawId.endsWith('@lid') || 
        rawId === '0@s.whatsapp.net' || 
        rawId === 'status@broadcast' ||
        d.isGroup ||
        d.groupMetadata
      ) {
        return; // Skip group chats and system broadcast IDs
      }

      // Skip dummy deal cards that don't belong in Contacts
      if (d.dealValue !== undefined && !d.phone && !d.email && !d.ghlContactId && !d.contactName) {
        return;
      }

      // B. SANITIZE PHONE NUMBER (Reject internal GHL IDs like ghl_NQ9CVjz... or text strings)
      const rawPhone = String(d.phone || d.phoneNumber || d.customerPhone || (rawId.includes('@s.whatsapp.net') ? rawId.split('@')[0] : '')).trim();
      const isInternalGhlId = rawPhone.toLowerCase().startsWith('ghl_') || /[a-zA-Z]/.test(rawPhone);
      const cleanDigits = isInternalGhlId ? '' : rawPhone.replace(/\D/g, '');

      let normPhone10 = normalizePhone10(rawPhone);
      let formattedPhone = normPhone10 ? formatPhoneDisplay(normPhone10) : ((!isInternalGhlId && cleanDigits.length >= 7) ? `+${cleanDigits}` : '—');

      // C. SANITIZE EMAIL
      const rawEmail = String(d.email || d.customerEmail || '').trim().toLowerCase();
      const cleanEmail = (rawEmail.includes('@') && rawEmail.includes('.')) ? rawEmail : '';

      // D. SANITIZE CONTACT NAME
      let rawName = String(d.name || d.fullName || d.contactName || d.custom_name || d.customName || d.title || '').trim();
      rawName = rawName.replace(/@s\.whatsapp\.net/g, '').replace(/@g\.us/g, '').trim();

      // If name is an internal GHL ID or empty, resolve cleanly
      if (rawName.toLowerCase().startsWith('ghl_') || !rawName) {
        rawName = formattedPhone !== '—' ? formattedPhone : (cleanEmail ? cleanEmail.split('@')[0] : 'Contact');
      }

      // E. STRICT DEDUPLICATION KEY (Phone 10-digit > Email > GHL ID > Unique ID)
      let dedupKey = '';
      if (normPhone10) {
        dedupKey = `phone_${normPhone10}`;
      } else if (cleanEmail) {
        dedupKey = `email_${cleanEmail}`;
      } else if (d.ghlContactId || (rawId.startsWith('ghl_') && !isInternalGhlId)) {
        dedupKey = `ghl_${d.ghlContactId || rawId}`;
      } else if (rawId && !rawId.startsWith('CON-')) {
        dedupKey = `id_${rawId}`;
      } else {
        dedupKey = `rec_${rawName}_${cleanEmail}`;
      }

      // F. BUILD SANITIZED CRM RECORD
      const fallbackNoteGhlId = (d.notes && typeof d.notes === 'string') ? (d.notes.match(/GHL ID:\s*([a-zA-Z0-9_-]+)/i)?.[1] || d.notes.match(/Contact ID:\s*([a-zA-Z0-9_-]+)/i)?.[1]) : null;
      const extractedGhlId = d.ghlContactId || d.ghl_contact_id || d.custom_fields?.ghlContactId || d.customFields?.ghlContactId || (rawId.startsWith('ghl_') ? rawId.replace('ghl_', '') : null) || fallbackNoteGhlId;
      const isFromGhl = Boolean(extractedGhlId || d.custom_fields?.source === 'GoHighLevel' || (d.notes && String(d.notes).includes('GoHighLevel')));
      const resolvedSource = d.source || (isFromGhl ? 'GoHighLevel' : (rawId.includes('@s.whatsapp.net') ? 'WhatsApp Inbound' : (d.simCall ? 'SIM Dialer' : 'Manual Entry')));

      // Clean out synthetic automated GHL import text from notes
      let rawNotes = String(d.notes || d.customFields?.notes || '').trim();
      if (/^Imported from GoHighLevel/i.test(rawNotes)) {
        rawNotes = '';
      }

      // Default assignment: Company Manager first
      const managerEmp = (companyEmployees || []).find(e => {
        const r = String(e.role || '').toLowerCase();
        const d = String(e.designation || '').toLowerCase();
        return r.includes('manager') || d.includes('manager');
      }) || (companyEmployees?.[0]);

      const defaultManagerName = managerEmp ? (managerEmp.name || `${managerEmp.first_name || ''} ${managerEmp.last_name || ''}`.trim()) : (authUser?.name || 'Manager');

      const cleanRec = {
        id: rawId || `CON-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: rawName,
        phone: formattedPhone,
        email: cleanEmail,
        tags: Array.isArray(d.tags) ? d.tags.join(', ') : (d.tags || d.labels ? (Array.isArray(d.labels) ? d.labels.join(', ') : String(d.labels)) : ''),
        status: d.status || d.stage || d.pipelineStage || 'New Leads',
        source: resolvedSource,
        assignedTo: d.assignedTo || d.agentName || defaultManagerName,
        ghlContactId: extractedGhlId,
        notes: rawNotes,
        createdAt: d.createdAt || d._createdAt || d.lastMessageTime || new Date().toISOString(),
        updatedAt: d.updatedAt || new Date().toISOString(),
        _dedupKey: dedupKey
      };

      // G. MERGE WITH EXISTING RECORD IF DUPLICATE
      if (dedupMap.has(dedupKey)) {
        const existing = dedupMap.get(dedupKey);

        // Keep the best human name
        const isExistingGeneric = !existing.name || existing.name === existing.phone || existing.name === 'Contact';
        const isCleanGeneric = !cleanRec.name || cleanRec.name === cleanRec.phone || cleanRec.name === 'Contact';
        const betterName = (!isExistingGeneric) ? existing.name : (!isCleanGeneric ? cleanRec.name : (existing.name || cleanRec.name));

        const betterPhone = (existing.phone && existing.phone !== '—') ? existing.phone : cleanRec.phone;
        const betterEmail = existing.email || cleanRec.email;
        const betterGhlId = existing.ghlContactId || cleanRec.ghlContactId;

        // Clean notes if either contains synthetic automated GHL text
        let existingNotes = String(existing.notes || '').trim();
        if (/^Imported from GoHighLevel/i.test(existingNotes)) existingNotes = '';
        let cleanRecNotes = String(cleanRec.notes || '').trim();
        if (/^Imported from GoHighLevel/i.test(cleanRecNotes)) cleanRecNotes = '';
        const betterNotes = cleanRecNotes || existingNotes || '';

        // Combine tags
        const tagsSet = new Set([
          ...(existing.tags ? existing.tags.split(',').map(t => t.trim()) : []),
          ...(cleanRec.tags ? cleanRec.tags.split(',').map(t => t.trim()) : [])
        ]);

        dedupMap.set(dedupKey, {
          ...existing,
          ...cleanRec,
          name: betterName,
          phone: betterPhone,
          email: betterEmail,
          ghlContactId: betterGhlId,
          notes: betterNotes,
          source: (existing.source === 'GoHighLevel' || cleanRec.source === 'GoHighLevel') ? 'GoHighLevel' : (existing.source || cleanRec.source),
          tags: Array.from(tagsSet).filter(Boolean).join(', '),
          updatedAt: new Date().toISOString()
        });
      } else {
        dedupMap.set(dedupKey, cleanRec);
      }
    });

    // 3. Re-sort deterministically: newest first
    const sorted = Array.from(dedupMap.values()).sort((a, b) => {
      const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime();
      const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime();
      return timeB - timeA;
    });

    // Assign clean, deterministic sequential CON-0001 IDs
    return sorted.map((rec, index) => ({
      ...rec,
      displayId: rec.displayId && /^CON-\d{4}$/i.test(rec.displayId)
        ? rec.displayId.toUpperCase()
        : (rec.id && /^CON-\d{4}$/i.test(rec.id) ? rec.id.toUpperCase() : `CON-${String(index + 1).padStart(4, '0')}`)
    }));
  };

  // Real-Time Firestore & Backend Inbound Listener (contacts collection only)
  useEffect(() => {
    let unsubs = [];

    // A0. Universal Direct Supabase PostgreSQL Fetch (Zero Firebase / Zero SQLite)
    const resolvedTenant = authUser?.tenantId || authUser?.tenant_id || authUser?.companyId || companyId;
    const safeTenant = (resolvedTenant && resolvedTenant !== 'org_unassigned' && resolvedTenant !== 'default_tenant') ? Number(resolvedTenant) : 1;
    
    const fetchUniversalContacts = () => {
      if (!safeTenant) {
        setInternalRecords([]);
        return;
      }
      SupabaseSandboxService.fetchContacts(safeTenant)
        .then(sbContacts => {
          const tenantMatches = (sbContacts || []).filter(r => {
            const itemTenant = String(r.tenant_id ?? r.tenantId ?? '');
            return itemTenant && itemTenant === String(safeTenant);
          });
          TenantStorage.setItem('contacts', tenantMatches, safeTenant);
          const scoped = tenantMatches.filter(isContactVisibleToUser);
          setInternalRecords(processAndMergeRecords([], scoped));
        })
        .catch(e => console.warn('[ContactsPage] Supabase fetch notice:', e));
    };

    fetchUniversalContacts();

    // Auto-refresh when tab gains focus or live inbound contact received
    const handleFocus = () => fetchUniversalContacts();
    window.addEventListener('focus', handleFocus);
    window.addEventListener('ghl_inbound_contact_received', handleFocus);
    unsubs.push(() => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('ghl_inbound_contact_received', handleFocus);
    });

    // C. Check GHL Integration Status strictly for this company
    const checkGhlStatus = async () => {
      try {
        const cleanComp = String(companyId || '');
        if (cleanComp && cleanComp !== 'org_unassigned' && cleanComp !== 'default_tenant') {
          const installed = await GhlOAuthService.getInstalledLocations(cleanComp);
          const activeLoc = (installed || []).find(l => l.accessToken && l.locationId);
          if (activeLoc && String(activeLoc.companyId || activeLoc.tenantId) === cleanComp) {
            setGhlLocationStatus(activeLoc.locationId || 'Connected');
            return;
          }
        }
        setGhlLocationStatus(null);
      } catch (e) {
        setGhlLocationStatus(null);
      }
    };
    checkGhlStatus();

    return () => {
      unsubs.forEach(u => {
        try { u(); } catch (e) {}
      });
    };
  }, [API_URL, token, authUser]);

  // Handle 2-Way GHL Sync Trigger
  const handleTriggerGhl2WaySync = async () => {
    if (isSyncingGhl) return;
    setIsSyncingGhl(true);
    if (showToast) showToast('🔄 Starting GoHighLevel 2-Way Synchronization...', 'info');

    try {
      if (isSandboxEnvironment()) {
        const resolvedTenant = authUser?.tenantId || authUser?.tenant_id || authUser?.companyId || companyId;
        const safeTenant = (resolvedTenant && resolvedTenant !== 'org_unassigned' && resolvedTenant !== 'default_tenant') ? Number(resolvedTenant) : null;
        if (!safeTenant) {
          throw new Error('Please select an active company to sync contacts.');
        }
        const installed = await GhlOAuthService.getInstalledLocations(safeTenant);
        const loc = (installed || []).find(l => (l.accessToken || l.access_token) && (l.locationId || l.location_id));

        if (!loc || !(loc.accessToken || loc.access_token) || !(loc.locationId || loc.location_id)) {
          throw new Error('HighLevel sub-account is not connected for this company. Please connect via Integrations.');
        }

        const activeLocationId = loc.locationId || loc.location_id;
        const activeAccessToken = loc.accessToken || loc.access_token;

        // Direct pull from HighLevel Cloud API with the active token
        const fetched = await GhlOAuthService.fetchContactsDirectly({
          locationId: activeLocationId,
          accessToken: activeAccessToken,
          limit: 100,
          maxTotal: 5000
        });

        const ghlContacts = Array.isArray(fetched) ? fetched : (fetched?.contacts || []);
        if (ghlContacts.length > 0) {
          await SupabaseSandboxService.bulkUpsertContacts(ghlContacts, safeTenant);
        }

        // Push any local contacts that were created in EMS to GHL
        let pushedCount = 0;
        for (const rec of (internalRecords || [])) {
          if (rec && rec.source !== 'GoHighLevel' && !String(rec.id).startsWith('ghl_')) {
            await GhlSyncBridge.pushSingleContactAuto(safeTenant, rec).catch(() => {});
            pushedCount++;
          }
        }

        // Refresh state directly from Supabase Sandbox
        const freshSb = await SupabaseSandboxService.fetchContacts(safeTenant);
        if (freshSb && freshSb.length > 0) {
          setInternalRecords(processAndMergeRecords([], freshSb));
          TenantStorage.setItem('contacts', freshSb, safeTenant);
        }

        if (showToast) {
          showToast(`✅ GHL 2-Way Sync Complete! Synced to GHL: ${pushedCount}, Imported from GHL: ${ghlContacts.length}`, 'success');
        }
        return;
      }

      // Step A: Import from GHL into EMS (Production mode)
      const importRes = await fetch(`${API_URL}/v1/integrations/ghl/contacts/import-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ limit: 100 })
      });
      const importData = await importRes.json();

      // Step B: Push EMS contacts to GHL
      const syncRes = await fetch(`${API_URL}/v1/integrations/ghl/contacts/sync-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ contacts: internalRecords })
      });
      const syncData = await syncRes.json();

      const importedCount = importData?.imported || importData?.total || 0;
      const syncedCount = syncData?.synced || 0;

      if (showToast) {
        showToast(`✅ GHL 2-Way Sync Complete! Synced to GHL: ${syncedCount}, Imported: ${importedCount}`, 'success');
      }

      // Refresh local list from backend
      const refreshRes = await fetch(`${API_URL}/contacts`, {
        headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
      });
      const refreshedData = await refreshRes.json();
      const incoming = Array.isArray(refreshedData?.contacts) ? refreshedData.contacts : (Array.isArray(refreshedData) ? refreshedData : []);
      if (incoming.length > 0) {
        setInternalRecords(prev => processAndMergeRecords(prev, incoming));
      }
    } catch (err) {
      console.error('[GHL 2-Way Sync Error]', err);
      if (showToast) showToast(`❌ GHL Sync Notice: ${err.message || 'Check GHL connection'}`, 'error');
    } finally {
      setIsSyncingGhl(false);
    }
  };

  // Update Records callback from LayoutEngine
  const handleUpdateRecords = (newRecords) => {
    setInternalRecords(newRecords);
    if (typeof setPropContacts === 'function') setPropContacts(newRecords);

    if (Array.isArray(newRecords)) {
      const safeTenant = Number(companyId) || 1;
      newRecords.forEach(rec => {
        if (rec && rec.id) {
          if (isSandboxEnvironment()) {
            SupabaseSandboxService.createContact(rec, safeTenant).catch(e => console.warn('[Sandbox] Contact sync notice:', e));
          } else {
            FirebaseCloudEngine.saveRecord('contacts', rec, companyId);
          }
          if (rec.source !== 'GoHighLevel' && !String(rec.id).startsWith('ghl_')) {
            GhlSyncBridge.pushSingleContactAuto(safeTenant, rec).catch(() => {});
          }
        }
      });
    }
  };

  // Soft Delete / Move to Recycle Bin
  const handleSoftDelete = async (recordOrId) => {
    const targetId = typeof recordOrId === 'object' ? (recordOrId.id || recordOrId.originalId) : recordOrId;
    if (!targetId) return;

    if (isSandboxEnvironment()) {
      const safeTenant = Number(companyId) || 1;
      try {
        await SupabaseSandboxService.deleteContact(targetId, safeTenant);
      } catch (e) {
        console.warn('Sandbox contact delete notice:', e);
      }
    } else {
      try {
        if (db) {
          await deleteDoc(doc(db, 'contacts', String(targetId)));
        }
      } catch (e) {
        console.warn('Firestore contact delete notice:', e);
      }
    }

    const rec = (internalRecords || []).find(r => r.id === targetId) || (typeof recordOrId === 'object' ? recordOrId : { id: targetId });
    if (typeof softDeleteRecord === 'function') {
      softDeleteRecord({
        originalId: targetId,
        id: targetId,
        name: rec.name || rec.phone || 'CRM Contact',
        category: 'Contacts & Leads',
        moduleTab: 'contacts',
        entityData: rec
      });
    }

    setInternalRecords(prev => prev.filter(r => r.id !== targetId));
    if (showToast) showToast('🗑️ Contact moved to Recycle Bin', 'info');
  };

  const contactModuleConfig = useMemo(() => ({
    ...(config || {}),
    name: 'Contacts',
    moduleTitle: 'Contacts',
    description: 'Manage and track all customer contacts, calls, and leads.',
    entityName: 'Contact',
    entityNamePlural: 'Contacts'
  }), [config]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <LayoutEngine
        customHeaderActions={<></>}
        moduleConfig={contactModuleConfig}
        records={internalRecords}
        setRecords={handleUpdateRecords}
        authUser={authUser}
        systemDropdowns={enhancedSystemDropdowns}
        activePipelineStages={activePipelineStages}
        recycleBinItems={recycleBinItems}
        handleRestoreBinItem={handleRestoreBinItem}
        handlePermanentDeleteBinItem={handlePermanentDeleteBinItem}
        softDeleteRecord={handleSoftDelete}
        showToast={showToast}
        onOpenModuleConfig={openModuleConfigModal}
        onManageStages={onManageStages}
        onOpenChatWithLead={onOpenChatWithLead}
      />
    </div>
  );
}
