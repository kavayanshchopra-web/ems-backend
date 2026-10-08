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
  const [archivedContacts, setArchivedContacts] = useState([]);

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
    if (r.is_archived === 1 || r.is_archived === true || r.archived === true) return false;
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
      const resolvedSource = d.source || (isFromGhl ? 'External CRM' : (rawId.includes('@s.whatsapp.net') ? 'WhatsApp Inbound' : (d.simCall ? 'SIM Dialer' : 'Manual Entry')));

      // Clean out synthetic automated GHL import text from notes
      let rawNotes = String(d.notes || d.customFields?.notes || '').trim();
      if (/^Imported from (GoHighLevel|CRM)/i.test(rawNotes)) {
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
        dealValue: d.deal_value || d.dealValue || '',
        deal_value: d.deal_value || d.dealValue || '',
        customFields: d.custom_fields || d.customFields || {},
        custom_fields: d.custom_fields || d.customFields || {},
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
        if (/^Imported from (GoHighLevel|CRM)/i.test(existingNotes)) existingNotes = '';
        let cleanRecNotes = String(cleanRec.notes || '').trim();
        if (/^Imported from (GoHighLevel|CRM)/i.test(cleanRecNotes)) cleanRecNotes = '';
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
          source: (existing.source === 'GoHighLevel' || cleanRec.source === 'GoHighLevel' || existing.source === 'External CRM' || cleanRec.source === 'External CRM') ? 'External CRM' : (existing.source || cleanRec.source),
          tags: Array.from(tagsSet).filter(Boolean).join(', '),
          dealValue: cleanRec.dealValue || existing.dealValue || '',
          deal_value: cleanRec.deal_value || existing.deal_value || '',
          customFields: { ...(existing.customFields || {}), ...(cleanRec.customFields || {}) },
          custom_fields: { ...(existing.custom_fields || {}), ...(cleanRec.custom_fields || {}) },
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
        setArchivedContacts([]);
        return;
      }
      SupabaseSandboxService.fetchContacts(safeTenant)
        .then(sbContacts => {
          const allTenantContacts = (sbContacts || []).filter(r => {
            const itemTenant = String(r.tenant_id ?? r.tenantId ?? '');
            return !itemTenant || itemTenant === String(safeTenant);
          });

          const activeMatches = allTenantContacts.filter(r => 
            r.is_archived !== 1 && r.is_archived !== true && !r.archived && r.status !== 'Archived'
          );

          const archivedMatches = allTenantContacts.filter(r => 
            r.is_archived === 1 || r.is_archived === true || r.archived === true || r.status === 'Archived'
          );

          setArchivedContacts(archivedMatches);
          TenantStorage.setItem('contacts', activeMatches, safeTenant);
          const scoped = activeMatches.filter(isContactVisibleToUser);
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
    if (showToast) showToast('🔄 Starting Central CRM 2-Way Synchronization...', 'info');

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
          throw new Error('External CRM connection is not configured for this company. Please configure via Integrations.');
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
          showToast(`✅ CRM 2-Way Sync Complete! Synced to CRM: ${pushedCount}, Imported from CRM: ${ghlContacts.length}`, 'success');
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
        showToast(`✅ CRM 2-Way Sync Complete! Synced to CRM: ${syncedCount}, Imported: ${importedCount}`, 'success');
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
      if (showToast) showToast(`❌ CRM Sync Notice: ${err.message || 'Check CRM connection'}`, 'error');
    } finally {
      setIsSyncingGhl(false);
    }
  };

  // Active Tab & Segment state
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'leads' | 'customers' | 'segments'
  const [selectedSegment, setSelectedSegment] = useState('all');

  // Classification helpers for Leads vs Customers
  const isCustomerRecord = (r) => {
    if (!r) return false;
    const stage = String(r.status || r.stage || '').toLowerCase().trim();
    const tags = String(r.tags || '').toLowerCase();
    return /won|customer|paid|client|converted/i.test(stage) || /customer|client|paid/i.test(tags);
  };

  const isLeadRecord = (r) => {
    if (!r) return false;
    const stage = String(r.status || r.stage || '').toLowerCase().trim();
    const tags = String(r.tags || '').toLowerCase();
    const isCust = /won|customer|paid|client|converted/i.test(stage) || /customer|client|paid/i.test(tags);
    const isLost = /lost|junk|spam|dead|dropped/i.test(stage);
    return !isCust && !isLost;
  };

  // Dynamic segments derived from sources
  const segmentOptions = useMemo(() => {
    const counts = {};
    (internalRecords || []).forEach(r => {
      const src = r.source || 'Manual Entry';
      counts[src] = (counts[src] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ id: name, label: name, count }));
  }, [internalRecords]);

  // Tab counts
  const tabCounts = useMemo(() => {
    const all = (internalRecords || []).length;
    const leads = (internalRecords || []).filter(isLeadRecord).length;
    const customers = (internalRecords || []).filter(isCustomerRecord).length;
    const segments = segmentOptions.length;
    return { all, leads, customers, segments };
  }, [internalRecords, segmentOptions]);

  // Filtered records based on active tab
  const displayedRecords = useMemo(() => {
    if (activeTab === 'leads') {
      return (internalRecords || []).filter(isLeadRecord);
    }
    if (activeTab === 'customers') {
      return (internalRecords || []).filter(isCustomerRecord);
    }
    if (activeTab === 'segments') {
      if (!selectedSegment || selectedSegment === 'all') {
        return internalRecords || [];
      }
      return (internalRecords || []).filter(r => (r.source || 'Manual Entry') === selectedSegment);
    }
    return internalRecords || [];
  }, [internalRecords, activeTab, selectedSegment]);

  // Update Records callback from LayoutEngine
  const handleUpdateRecords = (newRecords) => {
    if (activeTab === 'all' && (!selectedSegment || selectedSegment === 'all')) {
      setInternalRecords(newRecords);
      if (typeof setPropContacts === 'function') setPropContacts(newRecords);
    } else {
      setInternalRecords(prev => {
        const updateMap = new Map((newRecords || []).map(r => [r.id, r]));
        const merged = prev.map(rec => updateMap.has(rec.id) ? updateMap.get(rec.id) : rec);
        (newRecords || []).forEach(r => {
          if (r && r.id && !prev.some(p => p.id === r.id)) {
            merged.unshift(r);
          }
        });
        if (typeof setPropContacts === 'function') setPropContacts(merged);
        return merged;
      });
    }

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

  // Soft Delete / Move to Archive (Archiving in Supabase PostgreSQL, NOT deleting)
  const handleSoftDelete = async (recordOrId, silent = false) => {
    const rawTargetId = typeof recordOrId === 'object' ? (recordOrId.id || recordOrId.originalId) : recordOrId;
    if (!rawTargetId) return;

    // Find the record from internalRecords
    const rec = (internalRecords || []).find(r => 
      r && (String(r.id) === String(rawTargetId) || String(r.displayId) === String(rawTargetId) || String(r.originalId) === String(rawTargetId))
    ) || (typeof recordOrId === 'object' ? recordOrId : { id: rawTargetId });

    const safeTenant = Number(companyId) || 1;
    const trueId = rec.id || rawTargetId;
    const email = rec.email;
    const phone = rec.phone || rec.rawPhone;

    try {
      await SupabaseSandboxService.archiveContact(trueId, safeTenant, true, phone, email);
      if (rec.ghlContactId) {
        await SupabaseSandboxService.archiveContact(`ghl_${rec.ghlContactId}`, safeTenant, true);
      }
      if (rec.originalId && rec.originalId !== trueId) {
        await SupabaseSandboxService.archiveContact(rec.originalId, safeTenant, true);
      }
    } catch (e) {
      console.warn('Sandbox contact archive notice:', e);
    }

    try {
      if (db) {
        await deleteDoc(doc(db, 'contacts', String(trueId))).catch(() => {});
      }
    } catch (e) {}

    const archivedRec = {
      ...rec,
      id: trueId,
      originalId: trueId,
      archived: true,
      is_archived: 1,
      lifecycleStatus: 'ARCHIVED',
      archivedAt: new Date().toISOString()
    };

    setArchivedContacts(prev => [archivedRec, ...(prev || []).filter(c => String(c.id) !== String(trueId))]);

    if (typeof softDeleteRecord === 'function') {
      softDeleteRecord({
        originalId: trueId,
        id: trueId,
        name: rec.name || rec.phone || 'CRM Contact',
        category: 'Contacts & Leads',
        moduleTab: 'contacts',
        type: 'contacts',
        entityData: { record: archivedRec, ...archivedRec }
      });
    }

    setInternalRecords(prev => (prev || []).filter(r => 
      r && String(r.id) !== String(trueId) && String(r.displayId) !== String(rawTargetId) && (!email || r.email !== email) && (!phone || r.phone !== phone)
    ));
    if (typeof setPropContacts === 'function') {
      setPropContacts(prev => (prev || []).filter(r => 
        r && String(r.id) !== String(trueId) && String(r.displayId) !== String(rawTargetId) && (!email || r.email !== email) && (!phone || r.phone !== phone)
      ));
    }
    TenantStorage.setItem('contacts', (internalRecords || []).filter(r => r.id !== trueId && (!email || r.email !== email)), safeTenant);

    if (!silent && showToast) showToast('📁 Contact moved to Archived Vault', 'info');
  };

  // Restore Contact from Archived View
  const handleRestoreContact = async (itemOrId) => {
    const rawTargetId = typeof itemOrId === 'object' ? (itemOrId.originalId || itemOrId.id || itemOrId.recycleBinId) : itemOrId;
    if (!rawTargetId) return;
    const safeTenant = Number(companyId) || 1;

    await SupabaseSandboxService.archiveContact(rawTargetId, safeTenant, false).catch(() => {});
    if (typeof handleRestoreBinItem === 'function') {
      handleRestoreBinItem(itemOrId);
    }
    setArchivedContacts(prev => (prev || []).filter(c => String(c.id) !== String(rawTargetId) && String(c.originalId) !== String(rawTargetId)));
    if (showToast) showToast('✅ Restored contact to active roster!', 'success');
  };

  // Permanent Delete Contact from Database (PostgreSQL + SQLite + Local Storage)
  const handlePermanentDeleteContact = async (itemOrId) => {
    const rawTargetId = typeof itemOrId === 'object' ? (itemOrId.originalId || itemOrId.id || itemOrId.recycleBinId) : itemOrId;
    if (!rawTargetId) return;

    const rec = (internalRecords || []).find(r => 
      r && (String(r.id) === String(rawTargetId) || String(r.displayId) === String(rawTargetId) || String(r.originalId) === String(rawTargetId))
    ) || (archivedContacts || []).find(r => 
      r && (String(r.id) === String(rawTargetId) || String(r.displayId) === String(rawTargetId) || String(r.originalId) === String(rawTargetId))
    ) || (typeof itemOrId === 'object' ? itemOrId : { id: rawTargetId });

    const confirmed = window.confirm(`⚠️ Are you sure you want to permanently delete "${rec.name || rec.phone || rec.email || 'this contact'}"? This action cannot be undone.`);
    if (!confirmed) return;

    const safeTenant = Number(companyId) || 1;
    const trueId = rec.id || rawTargetId;
    const email = rec.email;
    const phone = rec.phone || rec.rawPhone;

    // 1. Delete from Supabase PostgreSQL across both sandbox and production
    await SupabaseSandboxService.deleteContact(trueId, safeTenant, phone, email);
    if (rec.ghlContactId) {
      await SupabaseSandboxService.deleteContact(`ghl_${rec.ghlContactId}`, safeTenant);
    }
    if (rec.originalId && rec.originalId !== trueId) {
      await SupabaseSandboxService.deleteContact(rec.originalId, safeTenant);
    }

    // 2. Delete from Firestore and SQLite
    try {
      if (db) {
        await deleteDoc(doc(db, 'contacts', String(trueId))).catch(() => {});
      }
      await fetch(`${API_URL}/contacts/${encodeURIComponent(trueId)}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-tenant-id': String(safeTenant)
        }
      }).catch(() => {});
    } catch (e) {}

    // 3. Clear from all local states and caches
    if (typeof handlePermanentDeleteBinItem === 'function') {
      handlePermanentDeleteBinItem(itemOrId);
    }
    setArchivedContacts(prev => (prev || []).filter(c => String(c.id) !== String(trueId) && (!email || c.email !== email) && (!phone || c.phone !== phone)));
    setInternalRecords(prev => (prev || []).filter(r => 
      r && String(r.id) !== String(trueId) && String(r.displayId) !== String(rawTargetId) && (!email || r.email !== email) && (!phone || r.phone !== phone)
    ));
    if (typeof setPropContacts === 'function') {
      setPropContacts(prev => (prev || []).filter(r => 
        r && String(r.id) !== String(trueId) && String(r.displayId) !== String(rawTargetId) && (!email || r.email !== email) && (!phone || r.phone !== phone)
      ));
    }
    TenantStorage.setItem('contacts', (internalRecords || []).filter(r => r.id !== trueId && (!email || r.email !== email)), safeTenant);
    try {
      localStorage.removeItem(`omniflow_cached_contacts_${safeTenant}`);
    } catch (e) {}

    if (showToast) showToast('🗑️ Permanently deleted contact record from database.', 'info');
  };

  // Unified Archived items merging Supabase Archived Contacts + TrashVault
  const mergedRecycleBinItems = useMemo(() => {
    const fromVault = Array.isArray(recycleBinItems) ? recycleBinItems : [];
    const fromSbArchived = (archivedContacts || []).map(c => ({
      id: c.id || `arch_${c.id}`,
      originalId: c.id,
      name: c.name || c.phone || 'Contact',
      title: c.name || c.phone || 'Contact',
      category: 'Contacts & Leads',
      moduleTab: 'contacts',
      type: 'contacts',
      deletedAt: c.updated_at || c.created_at || new Date().toISOString(),
      deletedBy: 'User Action',
      payload: { record: c, ...c },
      entityData: { record: c, ...c }
    }));

    const seenIds = new Set();
    const combined = [];
    [...fromSbArchived, ...fromVault].forEach(item => {
      if (!item) return;
      const key = String(item.originalId || item.id || '');
      if (key && !seenIds.has(key)) {
        seenIds.add(key);
        combined.push(item);
      }
    });
    return combined;
  }, [recycleBinItems, archivedContacts]);

  const contactModuleConfig = useMemo(() => ({
    ...(config || {}),
    moduleId: 'contacts',
    name: 'Contacts',
    moduleTitle: 'Contacts',
    description: 'Manage and track all customer contacts, calls, and leads.',
    entityName: 'Contact',
    entityNamePlural: 'Contacts'
  }), [config]);

  // Clean pill-styled Segmented Navigation Tabs without icons
  const headerTabs = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', maxWidth: '100%', scrollbarWidth: 'none', paddingBottom: '2px' }}>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          background: '#f1f5f9',
          padding: '3px',
          borderRadius: '9px',
          border: '1px solid #e2e8f0',
          gap: '3px',
          flexShrink: 0
        }}
      >
        {/* 1. All Contacts */}
        <button
          type="button"
          onClick={() => { setActiveTab('all'); setSelectedSegment('all'); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            borderRadius: '7px',
            border: 'none',
            background: activeTab === 'all' ? '#0d9488' : 'transparent',
            color: activeTab === 'all' ? '#ffffff' : '#334155',
            fontSize: '12px',
            fontWeight: activeTab === 'all' ? '700' : '600',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: activeTab === 'all' ? '0 2px 6px rgba(13, 148, 136, 0.35)' : 'none'
          }}
        >
          <span>All Contacts</span>
          <span
            style={{
              padding: '1px 6px',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: '700',
              background: activeTab === 'all' ? 'rgba(255, 255, 255, 0.25)' : 'rgba(13, 148, 136, 0.12)',
              color: activeTab === 'all' ? '#ffffff' : '#0d9488'
            }}
          >
            {tabCounts.all}
          </span>
        </button>

        {/* 2. Leads */}
        <button
          type="button"
          onClick={() => { setActiveTab('leads'); setSelectedSegment('all'); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            borderRadius: '7px',
            border: 'none',
            background: activeTab === 'leads' ? '#d97706' : 'transparent',
            color: activeTab === 'leads' ? '#ffffff' : '#334155',
            fontSize: '12px',
            fontWeight: activeTab === 'leads' ? '700' : '600',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: activeTab === 'leads' ? '0 2px 6px rgba(217, 119, 6, 0.35)' : 'none'
          }}
        >
          <span>Leads</span>
          <span
            style={{
              padding: '1px 6px',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: '700',
              background: activeTab === 'leads' ? 'rgba(255, 255, 255, 0.25)' : 'rgba(217, 119, 6, 0.14)',
              color: activeTab === 'leads' ? '#ffffff' : '#d97706'
            }}
          >
            {tabCounts.leads}
          </span>
        </button>

        {/* 3. Customers */}
        <button
          type="button"
          onClick={() => { setActiveTab('customers'); setSelectedSegment('all'); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            borderRadius: '7px',
            border: 'none',
            background: activeTab === 'customers' ? '#059669' : 'transparent',
            color: activeTab === 'customers' ? '#ffffff' : '#334155',
            fontSize: '12px',
            fontWeight: activeTab === 'customers' ? '700' : '600',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: activeTab === 'customers' ? '0 2px 6px rgba(5, 150, 105, 0.35)' : 'none'
          }}
        >
          <span>Customers</span>
          <span
            style={{
              padding: '1px 6px',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: '700',
              background: activeTab === 'customers' ? 'rgba(255, 255, 255, 0.25)' : 'rgba(5, 150, 105, 0.14)',
              color: activeTab === 'customers' ? '#ffffff' : '#059669'
            }}
          >
            {tabCounts.customers}
          </span>
        </button>

        {/* 4. Lists / Segments */}
        <button
          type="button"
          onClick={() => setActiveTab('segments')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            borderRadius: '7px',
            border: 'none',
            background: activeTab === 'segments' ? '#2563eb' : 'transparent',
            color: activeTab === 'segments' ? '#ffffff' : '#334155',
            fontSize: '12px',
            fontWeight: activeTab === 'segments' ? '700' : '600',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: activeTab === 'segments' ? '0 2px 6px rgba(37, 99, 235, 0.35)' : 'none'
          }}
        >
          <span>Lists / Segments</span>
          <span
            style={{
              padding: '1px 6px',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: '700',
              background: activeTab === 'segments' ? 'rgba(255, 255, 255, 0.25)' : 'rgba(37, 99, 235, 0.14)',
              color: activeTab === 'segments' ? '#ffffff' : '#2563eb'
            }}
          >
            {tabCounts.segments}
          </span>
        </button>
      </div>

      {/* When Lists/Segments is selected, show Segment selector dropdown */}
      {activeTab === 'segments' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <select
            value={selectedSegment}
            onChange={(e) => setSelectedSegment(e.target.value)}
            style={{
              padding: '5px 10px',
              borderRadius: '7px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              fontSize: '12px',
              fontWeight: '600',
              color: '#1e293b',
              cursor: 'pointer',
              outline: 'none',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
          >
            <option value="all">All Sources ({tabCounts.all})</option>
            {segmentOptions.map(seg => (
              <option key={seg.id} value={seg.id}>
                {seg.label} ({seg.count})
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <LayoutEngine
        customHeaderActions={<></>}
        customHeaderLeft={headerTabs}
        moduleConfig={contactModuleConfig}
        records={displayedRecords}
        setRecords={handleUpdateRecords}
        authUser={authUser}
        systemDropdowns={enhancedSystemDropdowns}
        activePipelineStages={activePipelineStages}
        recycleBinItems={mergedRecycleBinItems}
        handleRestoreBinItem={handleRestoreContact}
        handlePermanentDeleteBinItem={handlePermanentDeleteContact}
        softDeleteRecord={handlePermanentDeleteContact}
        onArchiveRecord={handleSoftDelete}
        showToast={showToast}
        onOpenModuleConfig={openModuleConfigModal}
        onManageStages={onManageStages}
        onOpenChatWithLead={onOpenChatWithLead}
      />
    </div>
  );
}
